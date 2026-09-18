/* planner.js — week-at-a-glance board. Click a day to add a task already
   dated for it; click a task pill to edit it. */
const Planner = (() => {
  'use strict';

  const { $, el } = Utils;
  let weekStart = Utils.startOfWeek(Utils.todayISO());

  function tasksFor(iso) {
    return Store.tasks
      .filter(t => t.due === iso)
      .sort((a, b) => Number(a.done) - Number(b.done) || a.title.localeCompare(b.title));
  }

  function render() {
    const grid = $('#weekGrid');
    const today = Utils.todayISO();
    grid.innerHTML = '';

    for (let i = 0; i < 7; i++) {
      const iso = Utils.addDays(weekStart, i);
      const date = Utils.fromISO(iso);
      const isToday = iso === today;

      const items = el('div', { class: 'day__items' });
      const dayTasks = tasksFor(iso);

      if (!dayTasks.length) {
        items.append(el('p', { class: 'muted', style: 'font-size:12px' }, 'Free day'));
      } else {
        dayTasks.forEach(task => {
          const subject = Store.getSubject(task.subjectId);
          items.append(el('button', {
            class: `pill${task.done ? ' is-done' : ''}`,
            style: `--subject-color:${subject ? subject.color : 'var(--primary)'}`,
            title: `${task.title}${subject ? ' · ' + subject.name : ''}`,
            onclick: () => UI.openTaskModal(task)
          }, task.title));
        });
      }

      grid.append(el('div', {
        class: `day${isToday ? ' is-today' : ''}${iso < today ? ' is-past' : ''}`
      },
        el('div', { class: 'day__head' },
          el('span', { class: 'day__name' }, Utils.DAYS[date.getDay()].slice(0, 3)),
          el('span', { class: 'day__num' }, String(date.getDate()))
        ),
        items,
        el('button', {
          class: 'day__add',
          onclick: () => UI.openTaskModal(null, { due: iso })
        }, '+ Add')
      ));
    }

    const weekEnd = Utils.addDays(weekStart, 6);
    const offset = Utils.daysBetween(Utils.startOfWeek(today), weekStart) / 7;
    const label = { '0': 'This week', '1': 'Next week', '-1': 'Last week' }[String(offset)];
    const range = Utils.formatRange(weekStart, weekEnd);
    $('#weekLabel').textContent = label ? `${label} · ${range}` : range;
  }

  function shift(weeks) {
    weekStart = Utils.addDays(weekStart, weeks * 7);
    render();
  }

  function init() {
    $('#prevWeek').addEventListener('click', () => shift(-1));
    $('#nextWeek').addEventListener('click', () => shift(1));
    $('#todayWeek').addEventListener('click', () => {
      weekStart = Utils.startOfWeek(Utils.todayISO());
      render();
    });
    render();
    Store.on(render);
  }

  return { init, render };
})();
