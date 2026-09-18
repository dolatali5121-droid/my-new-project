/* ==========================================================================
   settings.js — preferences form, JSON export / import and data reset
   ========================================================================== */
'use strict';

const Settings = (() => {
  const { $, el } = Utils;

  function render() {
    const s = Store.settings;
    $('#setName').value = s.name || '';
    $('#setWeeklyGoal').value = s.weeklyGoalHours;
    $('#setFocus').value = s.focusMin;
    $('#setShort').value = s.shortMin;
    $('#setLong').value = s.longMin;
    $('#setSound').checked = !!s.sound;
    renderDataStats();
  }

  function renderDataStats() {
    const wrap = $('#dataStats');
    if (!wrap) return;
    const { tasks, subjects, blocks, sessions } = Store.state;
    const totalMinutes = sessions.reduce((sum, x) => sum + x.minutes, 0);

    const rows = [
      ['Tasks', tasks.length],
      ['Subjects', subjects.length],
      ['Timetable blocks', blocks.length],
      ['Focus logged', Utils.formatDuration(totalMinutes)]
    ];

    wrap.replaceChildren(...rows.map(([label, value]) =>
      el('div', {}, [
        el('dt', { text: label }),
        el('dd', { text: String(value) })
      ])
    ));
  }

  function save(event) {
    event.preventDefault();
    const num = (sel, fallback, min, max) => {
      const v = parseInt($(sel).value, 10);
      return Number.isFinite(v) ? Utils.clamp(v, min, max) : fallback;
    };

    Object.assign(Store.settings, {
      name: $('#setName').value.trim().slice(0, 40),
      weeklyGoalHours: num('#setWeeklyGoal', 12, 1, 80),
      focusMin: num('#setFocus', 25, 5, 120),
      shortMin: num('#setShort', 5, 1, 30),
      longMin: num('#setLong', 15, 5, 60),
      sound: $('#setSound').checked
    });

    Store.commit();
    UI.toast('Preferences saved');
  }

  /* ── export / import ──────────────────────────────────────────────── */
  function exportJSON() {
    const payload = JSON.stringify(Store.state, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = el('a', {
      href: url,
      download: `studyflow-backup-${Utils.toISODate(new Date())}.json`
    });
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    UI.toast('Backup downloaded');
  }

  function importJSON(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (!data || typeof data !== 'object' || !Array.isArray(data.tasks)) {
          throw new Error('Unrecognised file');
        }
        UI.confirm({
          title: 'Replace your planner?',
          text: `This will import ${data.tasks.length} task(s) and overwrite everything currently stored in this browser.`,
          confirmText: 'Import',
          onConfirm: () => {
            Store.replaceAll(data);
            App.applyTheme(Store.settings.theme);
            UI.toast('Planner imported');
          }
        });
      } catch (err) {
        UI.toast('That file could not be read as a StudyFlow backup');
      }
    };
    reader.onerror = () => UI.toast('Could not read that file');
    reader.readAsText(file);
  }

  function resetAll() {
    UI.confirm({
      title: 'Reset everything?',
      text: 'All tasks, subjects, timetable blocks and focus sessions in this browser will be replaced with the sample planner.',
      confirmText: 'Reset',
      onConfirm: () => {
        Store.reset();
        App.applyTheme(Store.settings.theme);
        UI.toast('Planner reset to the sample data');
      }
    });
  }

  function init() {
    $('#settingsForm').addEventListener('submit', save);
    $('#exportBtn').addEventListener('click', exportJSON);
    $('#importBtn').addEventListener('click', () => $('#importFile').click());
    $('#importFile').addEventListener('change', (e) => {
      importJSON(e.target.files[0]);
      e.target.value = '';
    });
    $('#resetBtn').addEventListener('click', resetAll);
  }

  return { init, render };
})();
