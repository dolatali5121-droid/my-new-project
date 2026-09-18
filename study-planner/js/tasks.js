/* ==========================================================================
   tasks.js — task list rendering, filtering, sorting and the task dialog
   ========================================================================== */
'use strict';

const Tasks = (() => {
  const { $, el, icon } = Utils;

  const view = {
    filter: 'all',        // all | today | week | overdue | done
    subject: 'all',
    sort: 'due',
    query: ''
  };

  const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };
  const PRIORITY_LABEL = { high: 'High', medium: 'Medium', low: 'Low' };

  /* ── filtering / sorting ──────────────────────────────────────────── */
  function matchesFilter(task) {
    if (view.filter === 'done') return task.done;
    if (view.filter === 'all') return true;          // completed tasks sink to the bottom
    if (task.done) return false;                     // the date filters are about work still to do

    const due = Store.taskDate(task);
    switch (view.filter) {
      case 'today':   return !!due && Utils.daysFromToday(due) === 0;
      case 'week':    return !!due && Utils.daysFromToday(due) >= 0 && Utils.daysFromToday(due) <= 7;
      case 'overdue': return Store.isOverdue(task);
      default:        return true;
    }
  }

  function matchesQuery(task) {
    const q = view.query.trim().toLowerCase();
    if (!q) return true;
    const subject = Store.subjectById(task.subjectId);
    return [task.title, task.notes, subject && subject.name]
      .filter(Boolean)
      .some((text) => text.toLowerCase().includes(q));
  }

  function visibleTasks() {
    const list = Store.state.tasks.filter(
      (t) => matchesFilter(t) && matchesQuery(t) &&
             (view.subject === 'all' || t.subjectId === view.subject)
    );
    return sortTasks(list, view.sort);
  }

  function sortTasks(list, mode) {
    const byDue = (a, b) => {
      const da = Store.taskDate(a);
      const db = Store.taskDate(b);
      if (!da && !db) return b.createdAt - a.createdAt;
      if (!da) return 1;
      if (!db) return -1;
      return da - db;
    };
    const within = {
      priority: (a, b) => (PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]) || byDue(a, b),
      created:  (a, b) => b.createdAt - a.createdAt,
      title:    (a, b) => a.title.localeCompare(b.title),
      due:      byDue
    }[mode] || byDue;

    // completed tasks always sink below open ones, whatever the sort mode
    return list.slice().sort((a, b) => Number(a.done) - Number(b.done) || within(a, b));
  }

  /** Tasks for the dashboard "Up next" card. */
  function upcoming(limit = 5) {
    return sortTasks(Store.state.tasks.filter((t) => !t.done), 'due').slice(0, limit);
  }

  /* ── rendering ────────────────────────────────────────────────────── */
  function dueBadge(task) {
    const due = Store.taskDate(task);
    if (!due) return el('span', { class: 'pill pill--muted', text: 'No date' });

    const days = Utils.daysFromToday(due);
    const overdue = Store.isOverdue(task);
    let cls = 'pill pill--muted';
    if (overdue) cls = 'pill pill--red';
    else if (days === 0) cls = 'pill pill--amber';
    else if (days === 1) cls = 'pill pill--blue';

    const label = Utils.friendlyDate(due) + (task.time ? ` · ${Utils.formatTime(due)}` : '');
    return el('span', { class: cls }, [
      overdue ? icon('alert') : null,
      el('span', { text: overdue ? `Overdue · ${label}` : label })
    ]);
  }

  function taskItem(task, compact = false) {
    const subject = Store.subjectById(task.subjectId);
    const classes = ['task'];
    if (compact) classes.push('task--compact');
    if (task.done) classes.push('is-done');
    if (Store.isOverdue(task)) classes.push('is-overdue');

    const check = el('button', {
      class: 'task__check',
      type: 'button',
      role: 'checkbox',
      'aria-checked': String(task.done),
      'aria-label': (task.done ? 'Mark as not done: ' : 'Mark as done: ') + task.title,
      onclick: () => {
        Store.toggleTask(task.id);
        UI.toast(task.done ? 'Task reopened' : 'Task completed');
      }
    }, [icon('check')]);

    const meta = el('div', { class: 'task__meta' }, [
      subject ? el('span', { class: 'task__subject', style: { color: subject.color } }, [
        el('span', { class: 'task__dot', style: { background: subject.color } }),
        el('span', { text: subject.name })
      ]) : null,
      dueBadge(task),
      el('span', { class: `prio prio--${task.priority}` }, [
        el('span', { class: 'prio__bar' }),
        el('span', { text: PRIORITY_LABEL[task.priority] || 'Medium' })
      ]),
      task.estimate ? el('span', { text: `~${Utils.formatDuration(task.estimate)}` }) : null
    ]);

    const body = el('div', { class: 'task__body' }, [
      el('p', { class: 'task__title', text: task.title }),
      meta,
      !compact && task.notes ? el('p', { class: 'task__notes', text: task.notes }) : null
    ]);

    const actions = el('div', { class: 'task__actions' }, [
      el('button', {
        class: 'icon-btn', type: 'button', 'aria-label': 'Edit task: ' + task.title,
        onclick: () => openDialog(task.id)
      }, [icon('edit')]),
      el('button', {
        class: 'icon-btn', type: 'button', 'aria-label': 'Delete task: ' + task.title,
        onclick: () => remove(task.id)
      }, [icon('trash')])
    ]);

    const node = el('li', { class: classes.join(' '), dataset: { id: task.id } }, [check, body, actions]);
    return node;
  }

  function emptyState(title, text) {
    return el('li', { class: 'empty' }, [
      el('span', { class: 'empty__icon' }, [icon('inbox')]),
      el('p', { class: 'empty__title', text: title }),
      el('p', { class: 'empty__text', text })
    ]);
  }

  function render() {
    const list = $('#taskList');
    if (!list) return;

    const items = visibleTasks();
    list.replaceChildren();

    if (!items.length) {
      const messages = {
        all:     ['No tasks yet', 'Add your first assignment and it will show up here.'],
        today:   ['Nothing due today', 'Enjoy the breathing room — or pull work forward from this week.'],
        week:    ['Clear week ahead', 'No deadlines in the next seven days.'],
        overdue: ['Nothing overdue', 'You are on top of every deadline. Nice work.'],
        done:    ['No completed tasks yet', 'Tick a task off and it will be archived here.']
      };
      const [title, text] = view.query
        ? ['No matches', `Nothing matches “${view.query}”.`]
        : (messages[view.filter] || messages.all);
      list.append(emptyState(title, text));
    } else {
      items.forEach((task, i) => {
        const node = taskItem(task);
        node.style.animationDelay = Math.min(i * 28, 280) + 'ms';
        list.append(node);
      });
    }

    updateSummary(items.length);
    syncSubjectFilter();
  }

  function updateSummary(shown) {
    const open = Store.state.tasks.filter((t) => !t.done);
    const overdue = open.filter(Store.isOverdue).length;
    const summary = $('#taskSummary');
    if (summary) {
      summary.textContent = open.length
        ? `${shown} shown · ${open.length} open task${open.length === 1 ? '' : 's'}` +
          (overdue ? ` · ${overdue} overdue` : '')
        : 'All caught up — nothing open right now.';
    }
    const badge = $('#navTaskCount');
    if (badge) badge.textContent = String(open.length);
  }

  /** Keep the subject <select> filters in sync with the subject list. */
  function syncSubjectFilter() {
    const select = $('#taskSubjectFilter');
    if (!select) return;
    const current = view.subject;
    select.replaceChildren(el('option', { value: 'all', text: 'All subjects' }));
    Store.state.subjects.forEach((s) =>
      select.append(el('option', { value: s.id, text: s.name })));
    select.value = Store.subjectById(current) ? current : 'all';
    view.subject = select.value;
  }

  /* ── dialog ───────────────────────────────────────────────────────── */
  function fillSubjectOptions(select, selected) {
    select.replaceChildren(el('option', { value: '', text: 'No subject' }));
    Store.state.subjects.forEach((s) =>
      select.append(el('option', { value: s.id, text: s.name })));
    select.value = selected || '';
  }

  function openDialog(taskId = null, presets = {}) {
    const dialog = $('#taskDialog');
    const task = taskId ? Store.state.tasks.find((t) => t.id === taskId) : null;

    $('#taskDialogTitle').textContent = task ? 'Edit task' : 'New task';
    $('#taskSubmit').textContent = task ? 'Save changes' : 'Add task';
    $('#taskId').value = task ? task.id : '';
    $('#taskTitle').value = task ? task.title : '';
    $('#taskDue').value = task ? task.due : (presets.due || Utils.toISODate(new Date()));
    $('#taskTime').value = task ? task.time : '';
    $('#taskPriority').value = task ? task.priority : 'medium';
    $('#taskEstimate').value = task && task.estimate ? task.estimate : '';
    $('#taskNotes').value = task ? task.notes : '';
    fillSubjectOptions($('#taskSubject'), task ? task.subjectId : (presets.subjectId || ''));

    const del = $('#taskDelete');
    del.hidden = !task;

    dialog.showModal();
    setTimeout(() => $('#taskTitle').focus(), 30);
  }

  function submit(event) {
    event.preventDefault();
    const id = $('#taskId').value;
    const estimate = parseInt($('#taskEstimate').value, 10);
    const data = {
      title: $('#taskTitle').value.trim(),
      subjectId: $('#taskSubject').value || null,
      due: $('#taskDue').value,
      time: $('#taskTime').value,
      priority: $('#taskPriority').value,
      estimate: Number.isFinite(estimate) && estimate > 0 ? estimate : null,
      notes: $('#taskNotes').value.trim()
    };
    if (!data.title) return;

    if (id) {
      Store.updateTask(id, data);
      UI.toast('Task updated');
    } else {
      Store.addTask(data);
      UI.toast('Task added');
    }
    $('#taskDialog').close();
  }

  function remove(id) {
    const task = Store.state.tasks.find((t) => t.id === id);
    if (!task) return;
    const index = Store.state.tasks.indexOf(task);
    UI.confirm({
      title: 'Delete this task?',
      text: `“${task.title}” will be removed from your planner.`,
      onConfirm: () => {
        Store.deleteTask(id);
        UI.toast('Task deleted', { undo: () => Store.restoreTask(task, index) });
      }
    });
  }

  /* ── wiring ───────────────────────────────────────────────────────── */
  function init() {
    $('#taskForm').addEventListener('submit', submit);

    $('#taskDelete').addEventListener('click', () => {
      const id = $('#taskId').value;
      $('#taskDialog').close();
      remove(id);
    });

    $('#taskFilters').addEventListener('click', (e) => {
      const chip = e.target.closest('[data-filter]');
      if (!chip) return;
      view.filter = chip.dataset.filter;
      Utils.$$('#taskFilters .chip').forEach((c) => {
        const active = c === chip;
        c.classList.toggle('is-active', active);
        c.setAttribute('aria-selected', String(active));
      });
      render();
    });

    $('#taskSubjectFilter').addEventListener('change', (e) => {
      view.subject = e.target.value;
      render();
    });

    $('#taskSort').addEventListener('change', (e) => {
      view.sort = e.target.value;
      render();
    });
  }

  const setQuery = (q) => { view.query = q; render(); };
  const setFilter = (f) => {
    const chip = Utils.$$('#taskFilters .chip').find((c) => c.dataset.filter === f);
    if (chip) chip.click();
  };

  return { init, render, openDialog, taskItem, upcoming, visibleTasks, setQuery, setFilter, view };
})();
