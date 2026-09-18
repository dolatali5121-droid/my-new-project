/* timer.js — Pomodoro-style focus timer. Counts down against wall-clock
   timestamps so it stays accurate even if the tab is throttled. */
const Timer = (() => {
  'use strict';

  const { $, $$, el } = Utils;
  const CIRCUMFERENCE = 2 * Math.PI * 96; // matches r="96" in index.html

  const LABELS = {
    focus: { idle: 'Ready to focus', running: 'Focusing…', done: 'Focus session complete' },
    short: { idle: 'Short break',    running: 'Taking a short break', done: 'Break over' },
    long:  { idle: 'Long break',     running: 'Taking a long break',  done: 'Break over' }
  };

  let mode = 'focus';
  let running = false;
  let endAt = 0;            // timestamp the current run finishes at
  let remaining = 0;        // ms left when paused
  let ticker = null;
  let completedFocus = 0;   // focus sessions in the current cycle

  const durationMs = m => (Store.settings[m] || 25) * 60000;

  /* ---------- painting ---------- */

  function paint() {
    const total = durationMs(mode);
    const left = running ? Math.max(0, endAt - Date.now()) : remaining;
    const minutes = Math.floor(left / 60000);
    const seconds = Math.floor((left % 60000) / 1000);
    const text = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    $('#timerDisplay').textContent = text;
    $('#timerLabel').textContent = running ? LABELS[mode].running : LABELS[mode].idle;
    $('#timerToggle').textContent = running ? 'Pause' : (left < total ? 'Resume' : 'Start');

    const progress = total ? 1 - left / total : 0;
    const dial = $('#dialValue');
    dial.style.strokeDasharray = CIRCUMFERENCE;
    dial.style.strokeDashoffset = CIRCUMFERENCE * (1 - progress);
    $('.dial').classList.toggle('is-break', mode !== 'focus');

    document.title = running ? `${text} · ${mode === 'focus' ? 'Focus' : 'Break'} — StudyFlow`
                             : 'Smart Study Planner & Task Manager';

    $$('#timerModes .chip').forEach(chip => chip.classList.toggle('is-active', chip.dataset.mode === mode));
  }

  /* ---------- session log ---------- */

  function renderSessions() {
    const list = $('#sessionList');
    const today = Utils.todayISO();
    const sessions = Store.sessionsOn(today).slice().reverse();
    list.innerHTML = '';

    if (!sessions.length) {
      list.append(el('li', { class: 'empty' },
        el('strong', {}, 'No sessions logged today'),
        el('span', {}, 'Start the timer — finished focus blocks land here.')));
    } else {
      sessions.forEach(session => {
        const subject = Store.getSubject(session.subjectId);
        list.append(el('li', { class: 'session' },
          el('i', { class: 'dot', style: `background:${subject ? subject.color : 'var(--primary)'}` }),
          el('span', {}, subject ? subject.name : 'General study'),
          el('small', { class: 'muted' }, Utils.clockTime(session.at)),
          el('span', { class: 'session__time' }, Utils.humanMinutes(session.minutes))
        ));
      });
    }
    $('#sessionTotal').textContent = Utils.humanMinutes(Store.minutesOn(today));
  }

  /* ---------- controls ---------- */

  function setMode(next, { keepRunning = false } = {}) {
    mode = next;
    stopTicker();
    running = keepRunning;
    remaining = durationMs(mode);
    if (keepRunning) { endAt = Date.now() + remaining; startTicker(); }
    paint();
  }

  function startTicker() {
    stopTicker();
    ticker = setInterval(() => {
      if (Date.now() >= endAt) finish();
      else paint();
    }, 250);
  }

  function stopTicker() { clearInterval(ticker); ticker = null; }

  function toggle() {
    if (running) {
      remaining = Math.max(0, endAt - Date.now());
      running = false;
      stopTicker();
    } else {
      if (remaining <= 0) remaining = durationMs(mode);
      endAt = Date.now() + remaining;
      running = true;
      startTicker();
    }
    paint();
  }

  function reset() {
    stopTicker();
    running = false;
    remaining = durationMs(mode);
    paint();
  }

  /** Called when the countdown reaches zero. */
  function finish() {
    stopTicker();
    running = false;
    remaining = 0;
    paint();
    chime();

    if (mode === 'focus') {
      const minutes = Math.round(durationMs('focus') / 60000);
      Store.addSession({ minutes, subjectId: $('#timerSubject').value, mode: 'focus' });
      completedFocus++;
      const goLong = completedFocus % (Store.settings.cycle || 4) === 0;
      UI.toast(`${minutes} minutes logged. Time for a ${goLong ? 'long' : 'short'} break ☕`);
      setMode(goLong ? 'long' : 'short');
    } else {
      UI.toast('Break finished — back to it 💪');
      setMode('focus');
    }
  }

  /** Skip ahead; a part-finished focus block still counts what was done. */
  function skip() {
    if (mode === 'focus') {
      const elapsed = Math.round((durationMs('focus') - (running ? endAt - Date.now() : remaining)) / 60000);
      if (elapsed >= 1) {
        Store.addSession({ minutes: elapsed, subjectId: $('#timerSubject').value, mode: 'focus' });
        UI.toast(`${elapsed} min of focus saved`);
      }
      completedFocus++;
      setMode(completedFocus % (Store.settings.cycle || 4) === 0 ? 'long' : 'short');
    } else {
      setMode('focus');
    }
  }

  /** Two short sine blips — no audio files, no libraries. */
  function chime() {
    if (!Store.settings.sound) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      [0, 0.22].forEach((delay, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = i === 0 ? 660 : 880;
        gain.gain.setValueAtTime(0.0001, ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + delay + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + 0.2);
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.22);
      });
      setTimeout(() => ctx.close(), 900);
    } catch (err) {
      console.warn('StudyFlow: audio unavailable.', err);
    }
  }

  /** Called by Settings when a duration changes while the timer is idle. */
  function refreshDurations() {
    if (!running) { remaining = durationMs(mode); paint(); }
  }

  function init() {
    $('#timerToggle').addEventListener('click', toggle);
    $('#timerReset').addEventListener('click', reset);
    $('#timerSkip').addEventListener('click', skip);
    $('#timerModes').addEventListener('click', e => {
      const chip = e.target.closest('.chip');
      if (chip) setMode(chip.dataset.mode);
    });

    window.addEventListener('beforeunload', e => {
      if (!running) return;
      e.preventDefault();
      e.returnValue = '';
    });

    remaining = durationMs(mode);
    paint();
    renderSessions();
    Store.on(renderSessions);
  }

  return { init, refreshDurations, start: () => { if (!running) toggle(); }, isRunning: () => running };
})();
