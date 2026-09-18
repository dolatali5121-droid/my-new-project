/* ui.js — shared presentational pieces: toasts, the task dialog and the
   task row markup reused by the dashboard, task list and search. */
const UI = (() => {
  'use strict';

  const { $, el } = Utils;

  const ICONS = {
    edit:  'M4 16.5V20h3.5l9.8-9.8-3.5-3.5L4 16.5Zm15.7-9.3a1 1 0 0 0 0-1.4l-2.5-2.5a1 1 0 0 0-1.4 0l-1.8 1.8 3.9 3.9 1.8-1.8Z',
    trash: 'M9 3h6l1 2h4v2H4V5h4l1-2ZM6 9h12l-1 11a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 9Z',
    clock: 'M12 4a8 8 0 1 1 0 16 8 8 0 0 1 0-16Zm1 3h-2v6l4.5 2.7 1-1.7-3.5-2.1V7Z'
  };

  const icon = path => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"/></svg>`;

  /* ---------- toasts ---------- */
  function toast(message, type = 'success', action) {
    const node = el('div', { class: `toast toast--${type}` }, message);
    if (action) {
      node.append(el('button', {
        class: 'link-btn',
        onclick: () => { action.onClick(); node.remove(); }
      }, action.label));
    }
    $('#toasts').append(node);
    setTimeout(() => {
      node.style.transition = 'opacity .3s, transform .3s';
      node.style.opacity = '0';
      node.style.transform = 'translateX(20px)';
      setTimeout(() => node.remove(), 300);
    }, action ? 6000 : 3200);
  }

  /* ---------- task row ---------- */

  /** Semi-transparent version of a subject colour, for pills and tints. */
  const tint = (hex, alpha = '22') => (hex && hex.startsWith('#') && hex.length === 7) ? hex + alpha : 'var(--green-100)';

  function dueTag(task) {
    if (!task.due) return null;
    const diff = Utils.daysBetween(Utils.todayISO(), task.due);
    let cls = 'tag--due';
    if (!task.done && diff < 0) cls = 'tag--overdue';
    else if (!task.done && diff === 0) cls = 'tag--today';
    return el('span', { class: `tag ${cls}` }, Utils.formatDue(task.due));
  }

  function taskItem(task, options = {}) {
    const subject = Store.getSubject(task.subjectId);
    const color = subject ? subject.color : 'var(--green-400)';

    const meta = el('div', { class: 'task__meta' });
    if (subject) {
      meta.append(el('span', {
        class: 'tag tag--subject',
        style: `--subject-color:${subject.color};--subject-tint:${tint(subject.color)}`
      }, el('i', { class: 'dot' }), subject.name));
    }
    const due = dueTag(task);
    if (due) meta.append(due);
    meta.append(el('span', { class: `tag tag--${task.priority}` }, `${task.priority[0].toUpperCase()}${task.priority.slice(1)}`));
    if (task.estimate) {
      meta.append(el('span', { class: 'tag', html: `${icon(ICONS.clock)}${Utils.humanMinutes(task.estimate)}` }));
    }

    const body = el('div', { class: 'task__body' },
      el('p', { class: 'task__title' }, task.title),
      task.notes && !options.compact ? el('p', { class: 'task__notes' }, task.notes) : null,
      meta
    );

    const actions = el('div', { class: 'task__actions' },
      el('button', { type: 'button', title: 'Edit task', 'aria-label': `Edit ${task.title}`, html: icon(ICONS.edit),
        onclick: () => openTaskModal(task) }),
      el('button', { type: 'button', class: 'is-danger', title: 'Delete task', 'aria-label': `Delete ${task.title}`, html: icon(ICONS.trash),
        onclick: () => removeTask(task) })
    );

    const checkbox = el('input', {
      type: 'checkbox', class: 'task__check', 'aria-label': `Mark "${task.title}" complete`,
      onchange: () => {
        Store.toggleTask(task.id);
        if (!task.done) toast('Nice work — task completed 🎉');
      }
    });
    checkbox.checked = task.done;

    return el('li', {
      class: `task${task.done ? ' is-done' : ''}`,
      style: `--subject-color:${color}`
    }, checkbox, body, actions);
  }

  function removeTask(task) {
    const index = Store.tasks.findIndex(t => t.id === task.id);
    const removed = Store.deleteTask(task.id);
    if (!removed) return;
    toast('Task deleted', 'warn', { label: 'Undo', onClick: () => Store.restoreTask(removed, index) });
  }

  function empty(title, hint) {
    return el('li', { class: 'empty' }, el('strong', {}, title), hint ? el('span', {}, hint) : null);
  }

  /* ---------- task dialog ---------- */

  const modal = () => $('#taskModal');

  function fillSubjectOptions(select, { includeAll = false, selected = '' } = {}) {
    select.innerHTML = '';
    if (includeAll) select.append(el('option', { value: 'all' }, 'All subjects'));
    select.append(el('option', { value: '' }, includeAll ? 'No subject' : 'General study'));
    Store.subjects.forEach(s => select.append(el('option', { value: s.id }, s.name)));
    select.value = selected;
    if (!select.value) select.value = includeAll ? 'all' : '';
  }

  function openTaskModal(task = null, presets = {}) {
    const isEdit = Boolean(task && task.id);
    $('#modalTitle').textContent = isEdit ? 'Edit task' : 'New task';
    $('#taskSubmit').textContent = isEdit ? 'Save changes' : 'Add task';
    $('#taskId').value = isEdit ? task.id : '';
    $('#taskTitle').value = isEdit ? task.title : '';
    $('#taskDue').value = isEdit ? task.due : (presets.due || Utils.todayISO());
    $('#taskPriority').value = isEdit ? task.priority : 'medium';
    $('#taskEstimate').value = isEdit && task.estimate ? task.estimate : '';
    $('#taskNotes').value = isEdit ? task.notes : '';
    fillSubjectOptions($('#taskSubject'), { selected: isEdit ? task.subjectId : (presets.subjectId || '') });

    modal().hidden = false;
    document.body.style.overflow = 'hidden';
    setTimeout(() => $('#taskTitle').focus(), 40);
  }

  function closeTaskModal() {
    modal().hidden = true;
    document.body.style.overflow = '';
  }

  function initModal() {
    modal().addEventListener('click', e => {
      if (e.target.closest('[data-close]')) closeTaskModal();
    });

    $('#taskForm').addEventListener('submit', e => {
      e.preventDefault();
      const payload = {
        title: $('#taskTitle').value,
        subjectId: $('#taskSubject').value,
        due: $('#taskDue').value,
        priority: $('#taskPriority').value,
        estimate: $('#taskEstimate').value,
        notes: $('#taskNotes').value
      };
      const id = $('#taskId').value;
      if (id) {
        Store.updateTask(id, { ...payload, estimate: Number(payload.estimate) || 0 });
        toast('Task updated');
      } else {
        if (!Store.addTask(payload)) return;
        toast('Task added to your plan');
      }
      closeTaskModal();
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !modal().hidden) closeTaskModal();
    });
  }

  return { toast, taskItem, empty, icon, ICONS, tint, fillSubjectOptions, openTaskModal, closeTaskModal, initModal };
})();
