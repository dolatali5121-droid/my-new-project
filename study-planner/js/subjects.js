/* ==========================================================================
   subjects.js — subject cards, colour picker and the subject dialog
   ========================================================================== */
'use strict';

const Subjects = (() => {
  const { $, el, icon } = Utils;

  let pickedColor = Store.PALETTE[0];

  function render() {
    const grid = $('#subjectGrid');
    if (!grid) return;

    const subjects = Store.state.subjects;
    grid.replaceChildren();

    if (!subjects.length) {
      grid.append(el('div', { class: 'card empty' }, [
        el('span', { class: 'empty__icon' }, [icon('book')]),
        el('p', { class: 'empty__title', text: 'No subjects yet' }),
        el('p', { class: 'empty__text', text: 'Create a subject to colour-code tasks and track weekly study goals.' })
      ]));
      return;
    }

    subjects.forEach((subject) => grid.append(card(subject)));
  }

  function card(subject) {
    const s = Store.subjectStats(subject.id);

    return el('article', { class: 'subject-card', style: { '--subject-color': subject.color } }, [
      el('span', { class: 'subject-card__bar' }),
      el('header', { class: 'subject-card__head' }, [
        el('div', {}, [
          el('h3', { class: 'subject-card__name', text: subject.name }),
          subject.teacher ? el('p', { class: 'subject-card__teacher', text: subject.teacher }) : null
        ]),
        el('div', { class: 'subject-card__actions' }, [
          el('button', {
            class: 'icon-btn', type: 'button', 'aria-label': 'Edit subject: ' + subject.name,
            onclick: () => openDialog(subject.id)
          }, [icon('edit')]),
          el('button', {
            class: 'icon-btn', type: 'button', 'aria-label': 'Delete subject: ' + subject.name,
            onclick: () => remove(subject.id)
          }, [icon('trash')])
        ])
      ]),
      el('div', { class: 'subject-card__stats' }, [
        el('div', {}, [
          el('p', { class: 'subject-card__stat-value', text: String(s.open) }),
          el('p', { class: 'subject-card__stat-label', text: 'Open' })
        ]),
        el('div', {}, [
          el('p', { class: 'subject-card__stat-value', text: String(s.done) }),
          el('p', { class: 'subject-card__stat-label', text: 'Done' })
        ]),
        el('div', {}, [
          el('p', { class: 'subject-card__stat-value', text: Utils.formatDuration(s.minutes) }),
          el('p', { class: 'subject-card__stat-label', text: 'This week' })
        ])
      ]),
      el('div', {}, [
        el('div', { class: 'progress' }, [
          el('div', { class: 'progress__fill', style: { width: s.percent + '%' } })
        ]),
        el('p', { class: 'muted', style: { marginTop: '6px', fontSize: '.78rem' },
          text: `${s.percent}% of a ${subject.goalHours || 0}h weekly goal` })
      ]),
      el('button', {
        class: 'link-btn', type: 'button', style: { alignSelf: 'flex-start' },
        'aria-label': 'Add a task to ' + subject.name,
        onclick: () => Tasks.openDialog(null, { subjectId: subject.id })
      }, ['+ Add task'])
    ]);
  }

  /* ── dialog ───────────────────────────────────────────────────────── */
  function renderSwatches() {
    const wrap = $('#subjectColors');
    wrap.replaceChildren(...Store.PALETTE.map((color) =>
      el('button', {
        class: 'swatch' + (color === pickedColor ? ' is-active' : ''),
        type: 'button',
        style: { background: color },
        'aria-label': 'Choose colour ' + color,
        'aria-pressed': String(color === pickedColor),
        onclick: () => { pickedColor = color; renderSwatches(); }
      })
    ));
  }

  function openDialog(subjectId = null) {
    const subject = subjectId ? Store.subjectById(subjectId) : null;

    $('#subjectDialogTitle').textContent = subject ? 'Edit subject' : 'New subject';
    $('#subjectId').value = subject ? subject.id : '';
    $('#subjectName').value = subject ? subject.name : '';
    $('#subjectTeacher').value = subject ? subject.teacher : '';
    $('#subjectGoal').value = subject ? (subject.goalHours ?? 4) : 4;
    $('#subjectDelete').hidden = !subject;

    pickedColor = subject
      ? subject.color
      : Store.PALETTE[Store.state.subjects.length % Store.PALETTE.length];
    renderSwatches();

    $('#subjectDialog').showModal();
    setTimeout(() => $('#subjectName').focus(), 30);
  }

  function submit(event) {
    event.preventDefault();
    const id = $('#subjectId').value;
    const goal = parseFloat($('#subjectGoal').value);
    const data = {
      name: $('#subjectName').value.trim(),
      teacher: $('#subjectTeacher').value.trim(),
      goalHours: Number.isFinite(goal) && goal >= 0 ? goal : 0,
      color: pickedColor
    };
    if (!data.name) return;

    if (id) {
      Store.updateSubject(id, data);
      UI.toast('Subject updated');
    } else {
      Store.addSubject(data);
      UI.toast('Subject added');
    }
    $('#subjectDialog').close();
  }

  function remove(id) {
    const subject = Store.subjectById(id);
    if (!subject) return;
    const linked = Store.state.tasks.filter((t) => t.subjectId === id).length;
    UI.confirm({
      title: 'Delete this subject?',
      text: linked
        ? `“${subject.name}” will be removed. ${linked} task${linked === 1 ? '' : 's'} will keep existing without a subject.`
        : `“${subject.name}” will be removed from your planner.`,
      onConfirm: () => {
        Store.deleteSubject(id);
        UI.toast('Subject deleted');
      }
    });
  }

  function init() {
    $('#subjectForm').addEventListener('submit', submit);
    $('#subjectDelete').addEventListener('click', () => {
      const id = $('#subjectId').value;
      $('#subjectDialog').close();
      remove(id);
    });
  }

  return { init, render, openDialog };
})();
