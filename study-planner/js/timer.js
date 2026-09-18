/* ==========================================================================
   timer.js — Pomodoro focus timer, session logging and the end-of-session
   chime (generated with the Web Audio API, so no audio files are needed).
   ========================================================================== */
'use strict';

const Timer = (() => {
  const { $, el, icon } = Utils;
  const CIRCUMFERENCE = 2 * Math.PI * 96;   // matches r="96" on .dial__progress

  const MODES = {
    focus: { label: 'Focus session', setting: 'focusMin' },
    short: { label: 'Short break',   setting: 'shortMin' },
    long:  { label: 'Long break',    setting: 'longMin' }
  };

  let mode = 'focus';
  let totalSeconds = 25 * 60;
  let remaining = totalSeconds;
  let endsAt = null;        // timestamp while running
  let ticker = null;
  let completedFocus = 0;   // focus sessions finished since the page opened

  const isRunning = () => ticker !== null;
  const durationFor = (m) => Math.max(1, Number(Store.settings[MODES[m].setting]) || 25) * 60;

  /* ── display ──────────────────────────────────────────────────────── */
  function paint() {
    const fraction = totalSeconds ? Utils.clamp(remaining / totalSeconds, 0, 1) : 0;
    $('#dialTime').textContent = Utils.formatClock(remaining);
    $('#dialLabel').textContent = MODES[mode].label;
    $('#dialProgress').style.strokeDasharray = CIRCUMFERENCE;
    $('#dialProgress').style.strokeDashoffset = CIRCUMFERENCE * (1 - fraction);
    $('#dial').classList.toggle('is-break', mode !== 'focus');

    const toggle = $('#timerToggle');
    toggle.replaceChildren(
      icon(isRunning() ? 'pause' : 'play'),
      el('span', { text: isRunning() ? 'Pause' : (remaining < totalSeconds ? 'Resume' : 'Start') })
    );

    document.title = isRunning()
      ? `${Utils.formatClock(remaining)} · ${MODES[mode].label}`
      : 'Smart Study Planner & Task Manager';
  }

  function setMode(next, { keepRunning = false } = {}) {
    mode = next;
    totalSeconds = durationFor(mode);
    remaining = totalSeconds;
    if (!keepRunning) stop();

    Utils.$$('#modeSwitch .mode-switch__btn').forEach((btn) => {
      const active = btn.dataset.mode === mode;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-selected', String(active));
    });
    paint();
  }

  /* ── running ──────────────────────────────────────────────────────── */
  function tick() {
    remaining = Math.max(0, Math.round((endsAt - Date.now()) / 1000));
    if (remaining <= 0) {
      complete();
      return;
    }
    paint();
  }

  function start() {
    if (isRunning()) return;
    endsAt = Date.now() + remaining * 1000;
    ticker = setInterval(tick, 250);
    paint();
  }

  function stop() {
    if (ticker) clearInterval(ticker);
    ticker = null;
    endsAt = null;
    paint();
  }

  function toggle() {
    isRunning() ? stop() : start();
  }

  function reset() {
    stop();
    remaining = totalSeconds;
    paint();
  }

  function complete() {
    stop();
    const minutes = Math.round(totalSeconds / 60);

    if (mode === 'focus') {
      const taskId = $('#timerTask').value || null;
      const task = taskId ? Store.state.tasks.find((t) => t.id === taskId) : null;
      Store.addSession({ taskId, subjectId: task ? task.subjectId : null, minutes });
      completedFocus += 1;
      UI.toast(`Logged ${Utils.formatDuration(minutes)} of focus`);
    } else {
      UI.toast('Break finished — back to it');
    }

    chime();

    const every = Math.max(2, Number(Store.settings.longEvery) || 4);
    const next = mode === 'focus' ? (completedFocus % every === 0 ? 'long' : 'short') : 'focus';
    setMode(next);
  }

  /* ── chime ────────────────────────────────────────────────────────── */
  function chime() {
    if (!Store.settings.sound) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const now = ctx.currentTime;
      [880, 1174.7].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, now + i * 0.18);
        gain.gain.exponentialRampToValueAtTime(0.18, now + i * 0.18 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.18 + 0.45);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now + i * 0.18);
        osc.stop(now + i * 0.18 + 0.5);
      });
      setTimeout(() => ctx.close(), 1200);
    } catch (err) {
      /* audio is a nicety — never let it break the timer */
    }
  }

  /* ── session log + task picker ────────────────────────────────────── */
  function renderSessions() {
    const list = $('#sessionList');
    if (!list) return;

    const sessions = Store.state.sessions.slice(0, 20);
    $('#sessionCount').textContent =
      `${Store.state.sessions.length} session${Store.state.sessions.length === 1 ? '' : 's'}`;

    list.replaceChildren();
    if (!sessions.length) {
      list.append(el('li', { class: 'empty' }, [
        el('span', { class: 'empty__icon' }, [icon('timer')]),
        el('p', { class: 'empty__title', text: 'No sessions logged' }),
        el('p', { class: 'empty__text', text: 'Finish a focus block and it will appear here.' })
      ]));
      return;
    }

    sessions.forEach((session) => {
      const task = session.taskId ? Store.state.tasks.find((t) => t.id === session.taskId) : null;
      const subject = Store.subjectById(session.subjectId);
      const when = new Date(session.endedAt);

      list.append(el('li', { class: 'session' }, [
        el('span', { class: 'session__icon' }, [icon('timer')]),
        el('div', { style: { minWidth: '0' } }, [
          el('p', { class: 'session__title', text: task ? task.title : (subject ? subject.name : 'Focus session') }),
          el('p', { class: 'session__meta', text: `${Utils.friendlyDate(when)} · ${Utils.formatTime(when)}` })
        ]),
        el('span', { class: 'session__len', text: Utils.formatDuration(session.minutes) })
      ]));
    });
  }

  function renderTaskPicker() {
    const select = $('#timerTask');
    if (!select) return;
    const current = select.value;
    select.replaceChildren(el('option', { value: '', text: 'No specific task' }));
    Store.state.tasks.filter((t) => !t.done).forEach((task) => {
      const subject = Store.subjectById(task.subjectId);
      select.append(el('option', {
        value: task.id,
        text: subject ? `${task.title} — ${subject.name}` : task.title
      }));
    });
    if (current && select.querySelector(`option[value="${current}"]`)) select.value = current;
  }

  function render() {
    renderSessions();
    renderTaskPicker();
    if (!isRunning() && remaining === totalSeconds) {
      totalSeconds = durationFor(mode);
      remaining = totalSeconds;
    }
    paint();
  }

  function init() {
    setMode('focus');

    $('#timerToggle').addEventListener('click', toggle);
    $('#timerReset').addEventListener('click', reset);

    $('#modeSwitch').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-mode]');
      if (btn) setMode(btn.dataset.mode);
    });

    /* keep the countdown honest when the tab was backgrounded */
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && isRunning()) tick();
    });

    window.addEventListener('beforeunload', (e) => {
      if (!isRunning()) return;
      e.preventDefault();
      e.returnValue = '';
    });

    render();
  }

  return { init, render, isRunning };
})();
