/* ==========================================================================
   schedule.js — weekly timetable grid and the block dialog
   ========================================================================== */
'use strict';

const Schedule = (() => {
  const { $, el, icon } = Utils;

  const START_HOUR = 7;     // first row shown
  const END_HOUR = 22;      // last row shown
  const ROW_H = 56;         // px per hour — must match .tt__hour height in CSS

  function render() {
    const grid = $('#timetable');
    if (!grid) return;

    const today = Utils.weekIndex(new Date());
    const weekStart = Utils.startOfWeek();
    const nodes = [el('div', { class: 'tt__corner', text: 'Time' })];

    /* day headers */
    Utils.DAY_SHORT.forEach((day, i) => {
      const date = Utils.addDays(weekStart, i);
      nodes.push(el('div', { class: 'tt__day' + (i === today ? ' is-today' : '') }, [
        el('span', { text: day, style: { display: 'block' } }),
        el('span', { text: date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) })
      ]));
    });

    /* hour gutter */
    const hours = [];
    for (let h = START_HOUR; h <= END_HOUR; h++) {
      hours.push(el('div', { class: 'tt__hour', text: Utils.minutesToTime(h * 60) }));
    }
    nodes.push(el('div', { class: 'tt__hours' }, hours));

    /* day columns + blocks */
    for (let day = 0; day < 7; day++) {
      const col = el('div', {
        class: 'tt__col' + (day === today ? ' is-today' : ''),
        dataset: { day: String(day) },
        style: { height: (END_HOUR - START_HOUR + 1) * ROW_H + 'px' }
      });

      col.addEventListener('dblclick', (e) => {
        if (e.target !== col) return;
        const offsetY = e.clientY - col.getBoundingClientRect().top;
        const startMin = Math.round((offsetY / ROW_H) * 60 / 30) * 30 + START_HOUR * 60;
        openDialog(null, { day, start: Utils.minutesToTime(startMin), end: Utils.minutesToTime(startMin + 60) });
      });

      Store.blocksForDay(day).forEach((block) => col.append(blockNode(block)));
      nodes.push(col);
    }

    grid.replaceChildren(...nodes);
  }

  function blockNode(block) {
    const subject = Store.subjectById(block.subjectId);
    const color = subject ? subject.color : 'var(--accent)';
    const start = Utils.timeToMinutes(block.start);
    const end = Math.max(start + 20, Utils.timeToMinutes(block.end));
    const top = ((start - START_HOUR * 60) / 60) * ROW_H;
    const height = ((end - start) / 60) * ROW_H;

    return el('button', {
      class: 'tt__block',
      type: 'button',
      title: `${block.title} · ${block.start}–${block.end}`,
      style: {
        top: Math.max(0, top) + 'px',
        height: Math.max(26, height - 4) + 'px',
        '--block-color': color
      },
      onclick: () => openDialog(block.id)
    }, [
      el('strong', { text: block.title }),
      el('span', { text: `${block.start}–${block.end}${block.location ? ' · ' + block.location : ''}` })
    ]);
  }

  /* ── dialog ───────────────────────────────────────────────────────── */
  function fillSelects(block, presets) {
    const subjectSelect = $('#blockSubject');
    subjectSelect.replaceChildren(el('option', { value: '', text: 'No subject' }));
    Store.state.subjects.forEach((s) =>
      subjectSelect.append(el('option', { value: s.id, text: s.name })));
    subjectSelect.value = block ? (block.subjectId || '') : '';

    const daySelect = $('#blockDay');
    daySelect.replaceChildren(...Utils.DAY_NAMES.map((name, i) =>
      el('option', { value: String(i), text: name })));
    daySelect.value = String(block ? block.day : (presets.day ?? Utils.weekIndex(new Date())));
  }

  function openDialog(blockId = null, presets = {}) {
    const block = blockId ? Store.state.blocks.find((b) => b.id === blockId) : null;

    $('#blockDialogTitle').textContent = block ? 'Edit block' : 'Add timetable block';
    $('#blockId').value = block ? block.id : '';
    $('#blockTitle').value = block ? block.title : '';
    $('#blockStart').value = block ? block.start : (presets.start || '09:00');
    $('#blockEnd').value = block ? block.end : (presets.end || '10:00');
    $('#blockLocation').value = block ? block.location : '';
    $('#blockDelete').hidden = !block;
    fillSelects(block, presets);

    $('#blockDialog').showModal();
    setTimeout(() => $('#blockTitle').focus(), 30);
  }

  function submit(event) {
    event.preventDefault();
    const id = $('#blockId').value;
    const start = $('#blockStart').value || '09:00';
    let end = $('#blockEnd').value || '10:00';

    if (Utils.timeToMinutes(end) <= Utils.timeToMinutes(start)) {
      end = Utils.minutesToTime(Utils.timeToMinutes(start) + 60);
    }

    const data = {
      title: $('#blockTitle').value.trim() || 'Study block',
      subjectId: $('#blockSubject').value || null,
      day: Number($('#blockDay').value),
      start,
      end,
      location: $('#blockLocation').value.trim()
    };

    if (id) {
      Store.updateBlock(id, data);
      UI.toast('Timetable updated');
    } else {
      Store.addBlock(data);
      UI.toast('Block added');
    }
    $('#blockDialog').close();
  }

  function remove(id) {
    const block = Store.state.blocks.find((b) => b.id === id);
    if (!block) return;
    UI.confirm({
      title: 'Remove this block?',
      text: `“${block.title}” will be deleted from your timetable.`,
      onConfirm: () => {
        Store.deleteBlock(id);
        UI.toast('Block removed');
      }
    });
  }

  function init() {
    $('#blockForm').addEventListener('submit', submit);
    $('#blockDelete').addEventListener('click', () => {
      const id = $('#blockId').value;
      $('#blockDialog').close();
      remove(id);
    });
  }

  return { init, render, openDialog };
})();
