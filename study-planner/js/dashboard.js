/* dashboard.js — the landing view: greeting, headline numbers, the two
   short task lists and per-subject progress. Also drives the sidebar goal. */
const Dashboard = (() => {
  'use strict';

  const { $, el } = Utils;

  const STAT_ICONS = {
    due:    'M7 2v2h10V2h2v2h1a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1V2h2Zm13 8H4v9h16v-9Z',
    done:   'M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2Z',
    focus:  'M12 4a8 8 0 1 1 0 16 8 8 0 0 1 0-16Zm1 3h-2v6l4.5 2.7 1-1.7-3.5-2.1V7Z',
    streak: 'M12 2s6 5 6 10a6 6 0 0 1-12 0c0-2 1-3.6 2-5 .2 1.4 1 2.5 2 2.5 1.6 0 2-3.4 2-7.5Z'
  };

  function greeting() {
    const h = new Date().getHours();
    if (h < 5)  return 'Still up? Keep it short 🌙';
    if (h < 12) return 'Good morning ☀️';
    if (h < 17) return 'Good afternoon 📚';
    if (h < 22) return 'Good evening 🌆';
    return 'Late-night study 🌙';
  }

  function statCard({ key, value, label, hint }) {
    return el('article', { class: 'stat' },
      el('div', { class: 'stat__icon', html: UI.icon(STAT_ICONS[key]) }),
      el('p', { class: 'stat__value' }, value),
      el('p', { class: 'stat__label' }, label),
      hint ? el('p', { class: 'stat__hint' }, hint) : null
    );
  }

  function renderStats() {
    const today = Utils.todayISO();
    const open = Store.tasks.filter(t => !t.done);
    const dueToday = open.filter(t => t.due === today).length;
    const overdue = open.filter(t => t.due && t.due < today).length;
    const weekStart = Utils.startOfWeek(today);
    const doneThisWeek = Store.tasks.filter(t =>
      t.done && t.completedAt && Utils.toISO(t.completedAt) >= weekStart).length;
    const minutes = Store.minutesOn(today);
    const days = Store.streak();

    const wrap = $('#statCards');
    wrap.innerHTML = '';
    [
      { key: 'due',    value: String(dueToday), label: 'Due today',
        hint: overdue ? `${overdue} overdue` : 'Nothing overdue' },
      { key: 'done',   value: String(doneThisWeek), label: 'Completed this week',
        hint: `${open.length} still open` },
      { key: 'focus',  value: Utils.humanMinutes(minutes), label: 'Focus time today',
        hint: `Goal ${Utils.humanMinutes(Store.settings.dailyGoal)}` },
      { key: 'streak', value: `${days} ${days === 1 ? 'day' : 'days'}`, label: 'Study streak',
        hint: days ? 'Keep it alive!' : 'Start one today' }
    ].forEach(stat => wrap.append(statCard(stat)));
  }

  function renderLists() {
    const today = Utils.todayISO();
    const open = Store.tasks.filter(t => !t.done);

    const dueToday = open
      .filter(t => t.due && t.due <= today)
      .sort((a, b) => a.due.localeCompare(b.due));
    const upcoming = open
      .filter(t => t.due && t.due > today)
      .sort((a, b) => a.due.localeCompare(b.due))
      .slice(0, 5);

    const todayList = $('#todayList');
    todayList.innerHTML = '';
    if (!dueToday.length) {
      todayList.append(UI.empty('Nothing due today', 'Enjoy the breathing room, or pull work forward.'));
    } else {
      dueToday.forEach(t => todayList.append(UI.taskItem(t, { compact: true })));
    }

    const upcomingList = $('#upcomingList');
    upcomingList.innerHTML = '';
    if (!upcoming.length) {
      upcomingList.append(UI.empty('No upcoming deadlines', 'Add one so future-you is not surprised.'));
    } else {
      upcoming.forEach(t => upcomingList.append(UI.taskItem(t, { compact: true })));
    }
  }

  function renderSubjectProgress() {
    const wrap = $('#subjectProgress');
    wrap.innerHTML = '';

    if (!Store.subjects.length) {
      wrap.append(el('div', { class: 'empty' },
        el('strong', {}, 'No subjects yet'),
        el('span', {}, 'Add subjects to track progress per course.')));
      return;
    }

    Store.subjects.forEach(subject => {
      const tasks = Store.tasks.filter(t => t.subjectId === subject.id);
      const done = tasks.filter(t => t.done).length;
      const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

      wrap.append(el('div', { class: 'sp', style: `--sp-color:${subject.color}` },
        el('div', { class: 'sp__top' },
          el('span', { class: 'sp__name' },
            el('i', { class: 'dot', style: `background:${subject.color}` }), subject.name),
          el('span', { class: 'sp__pct' }, `${pct}%`)
        ),
        el('div', { class: 'bar' }, el('i', { style: `width:${pct}%;background:${subject.color}` })),
        el('small', {}, tasks.length ? `${done} of ${tasks.length} tasks done` : 'No tasks yet')
      ));
    });
  }

  function renderHeader() {
    const today = Utils.todayISO();
    const open = Store.tasks.filter(t => !t.done);
    const dueToday = open.filter(t => t.due === today).length;
    const overdue = open.filter(t => t.due && t.due < today).length;

    $('#heroDate').textContent = Utils.formatLongDate(today);
    $('#heroGreeting').textContent = greeting();

    let summary;
    if (!Store.tasks.length) summary = 'Your planner is empty — add your first task to get started.';
    else if (overdue) summary = `${dueToday} task${dueToday === 1 ? '' : 's'} due today and ${overdue} overdue. Let's clear the backlog first.`;
    else if (dueToday) summary = `${dueToday} task${dueToday === 1 ? '' : 's'} due today. One focus block at a time.`;
    else summary = 'Nothing due today — a perfect window to work ahead.';
    $('#heroSummary').textContent = summary;
  }

  function renderGoal() {
    const minutes = Store.minutesOn(Utils.todayISO());
    const goal = Store.settings.dailyGoal || 120;
    const pct = Utils.clamp(Math.round((minutes / goal) * 100), 0, 100);
    $('#goalBar').style.width = `${pct}%`;
    $('#goalPercent').textContent = `${pct}%`;
    $('#goalCaption').textContent = `${minutes} of ${goal} min`;
  }

  function render() {
    renderHeader();
    renderStats();
    renderLists();
    renderSubjectProgress();
    renderGoal();
  }

  function init() {
    $('#heroStartFocus').addEventListener('click', () => {
      App.go('timer');
      Timer.start();
    });
    render();
    Store.on(render);
  }

  return { init, render };
})();
