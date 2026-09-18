/* tasks.js — the Tasks view: filtering, sorting, searching and the
   subject manager that feeds every subject dropdown in the app. */
const Tasks = (() => {
  'use strict';

  const { $, $$, el } = Utils;

  const view = { filter: 'all', subject: 'all', sort: 'due', query: '' };
  const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };
  let pendingColor = Store.PALETTE[0];

  /* ---------- filtering & sorting ---------- */

  function matchesFilter(task) {
    const today = Utils.todayISO();
    switch (view.filter) {
      case 'today':    return !task.done && task.due === today;
      case 'upcoming': return !task.done && task.due && task.due > today;
      case 'overdue':  return !task.done && task.due && task.due < today;
      case 'done':     return task.done;
      default:         return true;
    }
  }

  function matchesQuery(task) {
    if (!view.query) return true;
    const subject = Store.getSubject(task.subjectId);
    const haystack = `${task.title} ${task.notes} ${subject ? subject.name : ''}`.toLowerCase();
    return haystack.includes(view.query);
  }

  function sortTasks(list) {
    const byDue = (a, b) => {
      if (!a.due && !b.due) return 0;
      if (!a.due) return 1;
      if (!b.due) return -1;
      return a.due.localeCompare(b.due);
    };
    const sorted = [...list];
    switch (view.sort) {
      case 'priority': sorted.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || byDue(a, b)); break;
      case 'created':  sorted.sort((a, b) => b.createdAt - a.createdAt); break;
      case 'title':    sorted.sort((a, b) => a.title.localeCompare(b.title)); break;
      default:         sorted.sort((a, b) => byDue(a, b) || PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
    }
    // Completed tasks always sink to the bottom of a mixed list.
    return sorted.sort((a, b) => Number(a.done) - Number(b.done));
  }

  function visibleTasks() {
    return sortTasks(Store.tasks.filter(t =>
      matchesFilter(t) &&
      matchesQuery(t) &&
      (view.subject === 'all' || t.subjectId === view.subject)
    ));
  }

  /* ---------- rendering ---------- */

  function renderList() {
    const list = $('#taskList');
    const items = visibleTasks();
    list.innerHTML = '';

    if (!items.length) {
      const hints = {
        all: 'Add your first task to start planning.',
        today: 'Nothing due today — a good moment to get ahead.',
        upcoming: 'No future deadlines on the board yet.',
        overdue: 'You are fully caught up.',
        done: 'Completed tasks will be collected here.'
      };
      list.append(UI.empty(view.query ? `No tasks match “${view.query}”` : 'No tasks here', hints[view.filter]));
      return;
    }
    items.forEach(task => list.append(UI.taskItem(task)));
  }

  function renderSubjectGrid() {
    const grid = $('#subjectGrid');
    grid.innerHTML = '';

    if (!Store.subjects.length) {
      grid.append(el('div', { class: 'empty' },
        el('strong', {}, 'No subjects yet'),
        el('span', {}, 'Add the courses you are taking to colour-code your tasks.')));
      return;
    }

    Store.subjects.forEach(subject => {
      const tasks = Store.tasks.filter(t => t.subjectId === subject.id);
      const done = tasks.filter(t => t.done).length;
      const minutes = Store.sessions
        .filter(s => s.subjectId === subject.id && s.mode === 'focus')
        .reduce((sum, s) => sum + s.minutes, 0);
      const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

      grid.append(el('article', { class: 'subject-card', style: `--subject-color:${subject.color}` },
        el('button', {
          class: 'subject-card__del', title: `Delete ${subject.name}`, 'aria-label': `Delete ${subject.name}`,
          html: UI.icon(UI.ICONS.trash),
          onclick: () => {
            if (!confirm(`Delete “${subject.name}”? Its tasks stay, but lose the subject tag.`)) return;
            Store.deleteSubject(subject.id);
            UI.toast('Subject removed', 'warn');
          }
        }),
        el('h4', {}, el('i', { class: 'dot', style: `background:${subject.color}` }), subject.name),
        el('p', {}, subject.teacher || 'No course code'),
        el('div', { class: 'subject-card__stats' },
          el('div', {}, el('span', {}, 'Tasks'), el('strong', {}, String(tasks.length))),
          el('div', {}, el('span', {}, 'Done'), el('strong', {}, String(done))),
          el('div', {}, el('span', {}, 'Focus'), el('strong', {}, Utils.humanMinutes(minutes)))
        ),
        el('div', { class: 'bar', style: `--sp-color:${subject.color}` },
          el('i', { style: `width:${pct}%;background:${subject.color}` })),
        el('small', { class: 'muted' }, `${pct}% complete`)
      ));
    });
  }

  function renderSwatches() {
    const wrap = $('#subjectColors');
    wrap.innerHTML = '';
    Store.PALETTE.forEach(color => {
      wrap.append(el('button', {
        type: 'button',
        class: `swatch${color === pendingColor ? ' is-active' : ''}`,
        style: `background:${color}`,
        'aria-label': `Use colour ${color}`,
        onclick: () => { pendingColor = color; renderSwatches(); }
      }));
    });
  }

  function refreshSubjectSelects() {
    UI.fillSubjectOptions($('#subjectFilter'), { includeAll: true, selected: view.subject });
    const timerSelect = $('#timerSubject');
    UI.fillSubjectOptions(timerSelect, { selected: timerSelect.value || '' });
  }

  function render() {
    renderList();
    renderSubjectGrid();
    refreshSubjectSelects();
    $('#navTaskCount').textContent = String(Store.tasks.filter(t => !t.done).length);
  }

  /* ---------- wiring ---------- */

  function setFilter(filter) {
    view.filter = filter;
    $$('#taskFilters .chip').forEach(chip => chip.classList.toggle('is-active', chip.dataset.filter === filter));
    renderList();
  }

  function init() {
    $('#taskFilters').addEventListener('click', e => {
      const chip = e.target.closest('.chip');
      if (chip) setFilter(chip.dataset.filter);
    });

    $('#subjectFilter').addEventListener('change', e => { view.subject = e.target.value; renderList(); });
    $('#sortBy').addEventListener('change', e => { view.sort = e.target.value; renderList(); });

    $('#globalSearch').addEventListener('input', Utils.debounce(e => {
      view.query = e.target.value.trim().toLowerCase();
      if (view.query) App.go('tasks');
      renderList();
    }, 180));

    $('#subjectForm').addEventListener('submit', e => {
      e.preventDefault();
      const name = $('#subjectName').value;
      if (!Store.addSubject({ name, teacher: $('#subjectTeacher').value, color: pendingColor })) return;
      e.target.reset();
      pendingColor = Store.PALETTE[Store.subjects.length % Store.PALETTE.length];
      renderSwatches();
      UI.toast(`“${name.trim()}” added`);
    });

    renderSwatches();
    render();
    Store.on(render);
  }

  return { init, setFilter, render };
})();
