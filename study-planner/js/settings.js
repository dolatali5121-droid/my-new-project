/* settings.js — preferences, night mode and local backup/restore.
   Everything here touches localStorage only; nothing leaves the browser. */
const Settings = (() => {
  'use strict';

  const { $ } = Utils;

  const NUMBER_FIELDS = [
    ['#setFocus', 'focus', 5, 120],
    ['#setShort', 'short', 1, 30],
    ['#setLong',  'long',  5, 60],
    ['#setCycle', 'cycle', 2, 8],
    ['#setGoal',  'dailyGoal', 15, 600]
  ];

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
  }

  function render() {
    NUMBER_FIELDS.forEach(([sel, key]) => { $(sel).value = Store.settings[key]; });
    $('#setSound').checked = Boolean(Store.settings.sound);
    $('#setTheme').checked = Store.settings.theme === 'dark';
    applyTheme(Store.settings.theme);

    const bytes = new Blob([JSON.stringify(Store.state)]).size;
    $('#storageInfo').textContent =
      `${Store.tasks.length} tasks · ${Store.subjects.length} subjects · ${Store.sessions.length} sessions — about ${(bytes / 1024).toFixed(1)} KB saved locally.`;
  }

  function download() {
    const blob = new Blob([JSON.stringify(Store.state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `studyflow-backup-${Utils.todayISO()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    UI.toast('Backup downloaded');
  }

  function importFrom(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data || typeof data !== 'object' || !Array.isArray(data.tasks)) {
          throw new Error('Unrecognised file');
        }
        Store.replaceAll(data);
        UI.toast('Backup restored');
      } catch (err) {
        console.warn('StudyFlow: import failed.', err);
        UI.toast('That file is not a StudyFlow backup', 'danger');
      }
    };
    reader.onerror = () => UI.toast('Could not read that file', 'danger');
    reader.readAsText(file);
  }

  function init() {
    NUMBER_FIELDS.forEach(([sel, key, min, max]) => {
      $(sel).addEventListener('change', e => {
        const value = Utils.clamp(Number(e.target.value) || min, min, max);
        e.target.value = value;
        Store.setSetting(key, value);
        Timer.refreshDurations();
      });
    });

    $('#setSound').addEventListener('change', e => Store.setSetting('sound', e.target.checked));

    $('#setTheme').addEventListener('change', e => {
      const theme = e.target.checked ? 'dark' : 'light';
      applyTheme(theme);
      Store.setSetting('theme', theme);
    });

    $('#exportBtn').addEventListener('click', download);
    $('#importBtn').addEventListener('click', () => $('#importFile').click());
    $('#importFile').addEventListener('change', e => {
      const file = e.target.files[0];
      if (file) importFrom(file);
      e.target.value = '';
    });

    $('#resetBtn').addEventListener('click', () => {
      if (!confirm('Erase every task, subject and session stored in this browser? This cannot be undone.')) return;
      Store.clearAll();
      UI.toast('All data erased', 'warn');
    });

    render();
    Store.on(render);
  }

  return { init, render, applyTheme };
})();
