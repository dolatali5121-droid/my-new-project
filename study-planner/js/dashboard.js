/* ==========================================================================
   dashboard.js — greeting, stat cards, up-next list, focus chart, rings
   ========================================================================== */
'use strict';

const Dashboard = (() => {
  const { $, el, icon } = Utils;

  function greetingText() {
    const hour = new Date().getHours();
    const name = (Store.settings.name || '').trim();
    const part = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    return name ? `${part}, ${name}` : part;
  }

  /* ── stat cards ───────────────────────────────────────────────────── */
  function stats() {
    const tasks = Store.state.tasks;
    const open = tasks.filter((t) => !t.done);

    const dueToday = open.filter((t) => {
      const due = Store.taskDate(t);
      return due && Utils.daysFromToday(due) === 0;
    }).length;

    const overdue = open.filter(Store.isOverdue).length;

    const weekStart = Utils.startOfWeek().getTime();
    const doneThisWeek = tasks.filter((t) => t.done && t.completedAt && t.completedAt >= weekStart).length;

    const focus = Store.weekFocusMinutes();
    const goal = Math.max(1, Number(Store.settings.weeklyGoalHours) || 1) * 60;

    return [
      {
        label: 'Due today', value: dueToday, icon: 'calendar', color: 'var(--accent)',
        hint: dueToday ? 'Stay on track' : 'Nothing due — plan ahead'
      },
      {
        label: 'Overdue', value: overdue, icon: 'alert', color: overdue ? 'var(--red)' : 'var(--text-muted)',
        hint: overdue ? 'Needs attention first' : 'All deadlines met'
      },
      {
        label: 'Done this week', value: doneThisWeek, icon: 'check', color: 'var(--green-500)',
        hint: `${open.length} still open`
      },
      {
        label: 'Focus time', value: Utils.formatDuration(focus), icon: 'timer', color: 'var(--blue)',
        hint: `${Utils.clamp(Math.round((focus / goal) * 100), 0, 999)}% of weekly goal`
      }
    ];
  }

  function renderStats() {
    const grid = $('#statGrid');
    if (!grid) return;
    grid.replaceChildren(...stats().map((s) =>
      el('article', { class: 'stat', style: { '--stat-color': s.color } }, [
        el('div', { class: 'stat__top' }, [icon(s.icon), el('span', { class: 'stat__label', text: s.label })]),
        el('p', { class: 'stat__value', text: String(s.value) }),
        el('p', { class: 'stat__hint', text: s.hint })
      ])
    ));
  }

  /* ── up next ──────────────────────────────────────────────────────── */
  function renderUpNext() {
    const list = $('#upNextList');
    if (!list) return;
    const items = Tasks.upcoming(5);
    list.replaceChildren();
    if (!items.length) {
      list.append(el('li', { class: 'empty' }, [
        el('span', { class: 'empty__icon' }, [icon('check')]),
        el('p', { class: 'empty__title', text: 'Inbox zero' }),
        el('p', { class: 'empty__text', text: 'No open tasks. Add one to get started.' })
      ]));
      return;
    }
    items.forEach((task) => list.append(Tasks.taskItem(task, true)));
  }

  /* ── today's agenda ───────────────────────────────────────────────── */
  function renderAgenda() {
    const list = $('#todayAgenda');
    if (!list) return;

    const today = Utils.weekIndex(new Date());
    const blocks = Store.blocksForDay(today);
    const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();

    list.replaceChildren();
    if (!blocks.length) {
      list.append(el('li', { class: 'empty' }, [
        el('span', { class: 'empty__icon' }, [icon('calendar')]),
        el('p', { class: 'empty__title', text: 'No classes today' }),
        el('p', { class: 'empty__text', text: 'Add lectures and study blocks in the timetable.' })
      ]));
      return;
    }

    blocks.forEach((block) => {
      const subject = Store.subjectById(block.subjectId);
      const color = subject ? subject.color : 'var(--accent)';
      const start = Utils.timeToMinutes(block.start);
      const end = Utils.timeToMinutes(block.end);
      const isNow = nowMinutes >= start && nowMinutes < end;

      list.append(el('li', {
        class: 'agenda__item' + (isNow ? ' is-now' : ''),
        style: { '--block-color': color }
      }, [
        el('span', { class: 'agenda__time num', text: block.start }),
        el('div', {}, [
          el('p', { class: 'agenda__title', text: block.title }),
          el('p', {
            class: 'agenda__sub',
            text: [subject && subject.name, block.location, `${block.start}–${block.end}`]
              .filter(Boolean).join(' · ')
          })
        ])
      ]));
    });
  }

  /* ── focus chart (last 7 days, Monday first) ──────────────────────── */
  function renderChart() {
    const chart = $('#focusChart');
    if (!chart) return;

    const week = Store.focusByWeekday();
    const max = Math.max(60, ...week);
    const todayIndex = Utils.weekIndex(new Date());

    chart.replaceChildren(...week.map((minutes, i) => {
      const pct = Math.round((minutes / max) * 100);
      return el('div', { class: 'chart__col' + (i === todayIndex ? ' is-today' : '') }, [
        el('span', { class: 'chart__value', text: minutes ? Utils.formatDuration(minutes) : '—' }),
        el('div', { class: 'chart__bar-wrap' }, [
          el('div', {
            class: 'chart__bar' + (minutes ? '' : ' chart__bar--empty'),
            style: { height: Math.max(pct, minutes ? 6 : 3) + '%' },
            title: `${Utils.DAY_NAMES[i]}: ${Utils.formatDuration(minutes)}`
          })
        ]),
        el('span', { class: 'chart__label', text: Utils.DAY_SHORT[i] })
      ]);
    }));
  }

  /* ── subject rings ────────────────────────────────────────────────── */
  function renderRings() {
    const grid = $('#subjectRings');
    if (!grid) return;

    const subjects = Store.state.subjects;
    grid.replaceChildren();
    if (!subjects.length) {
      grid.append(el('div', { class: 'empty' }, [
        el('span', { class: 'empty__icon' }, [icon('book')]),
        el('p', { class: 'empty__title', text: 'No subjects yet' }),
        el('p', { class: 'empty__text', text: 'Add subjects to track weekly study goals.' })
      ]));
      return;
    }

    subjects.forEach((subject) => {
      const s = Store.subjectStats(subject.id);
      grid.append(el('div', { class: 'ring-item' }, [
        el('div', {
          class: 'ring',
          style: { '--pct': s.percent, '--ring-color': subject.color },
          role: 'img',
          'aria-label': `${subject.name}: ${s.percent}% of weekly goal`
        }, [
          el('span', { class: 'ring__hole', text: s.percent + '%' })
        ]),
        el('p', { class: 'ring-item__name', text: subject.name }),
        el('p', {
          class: 'ring-item__hint',
          text: `${Utils.formatDuration(s.minutes)} / ${subject.goalHours || 0}h`
        })
      ]));
    });
  }

  /* ── header + sidebar summary ─────────────────────────────────────── */
  function renderHeader() {
    const today = new Date();
    $('#todayLabel').textContent = today.toLocaleDateString(undefined, {
      weekday: 'long', day: 'numeric', month: 'long'
    });
    $('#greeting').textContent = greetingText();

    const open = Store.state.tasks.filter((t) => !t.done);
    const overdue = open.filter(Store.isOverdue).length;
    const dueToday = open.filter((t) => {
      const due = Store.taskDate(t);
      return due && Utils.daysFromToday(due) === 0;
    }).length;

    let summary;
    if (!open.length) summary = 'Your task list is clear. Good time to plan the week ahead.';
    else if (overdue) summary = `${overdue} task${overdue === 1 ? '' : 's'} overdue and ${dueToday} due today — start with the red ones.`;
    else if (dueToday) summary = `${dueToday} task${dueToday === 1 ? '' : 's'} due today, ${open.length} open in total.`;
    else summary = `Nothing due today. ${open.length} task${open.length === 1 ? '' : 's'} on the horizon.`;
    $('#dashSummary').textContent = summary;
  }

  function renderSidebar() {
    const minutes = Store.weekFocusMinutes();
    const goal = Math.max(1, Number(Store.settings.weeklyGoalHours) || 1) * 60;
    const pct = Utils.clamp(Math.round((minutes / goal) * 100), 0, 100);

    $('#sidebarFocus').textContent = Utils.formatDuration(minutes);
    $('#sidebarFocusBar').style.width = pct + '%';
    $('#sidebarGoalHint').textContent =
      minutes >= goal
        ? `Weekly goal of ${Store.settings.weeklyGoalHours}h reached 🎉`
        : `${pct}% of your ${Store.settings.weeklyGoalHours}h weekly goal`;
  }

  function render() {
    renderHeader();
    renderStats();
    renderUpNext();
    renderAgenda();
    renderChart();
    renderRings();
    renderSidebar();
  }

  return { render };
})();
