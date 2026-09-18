/* store.js — single source of truth. State lives in localStorage; modules
   subscribe to 'change' and re-render. No network, no cookies. */
const Store = (() => {
  'use strict';

  const KEY = 'studyflow.v1';

  const PALETTE = ['#16a34a', '#0891b2', '#7c3aed', '#db2777', '#ea580c',
                   '#ca8a04', '#0f766e', '#4f46e5', '#b91c1c', '#4d7c0f'];

  const defaultState = () => ({
    version: 1,
    subjects: [
      { id: Utils.uid(), name: 'Mathematics', teacher: '', color: '#16a34a', createdAt: Date.now() },
      { id: Utils.uid(), name: 'Physics',     teacher: '', color: '#0891b2', createdAt: Date.now() },
      { id: Utils.uid(), name: 'History',     teacher: '', color: '#7c3aed', createdAt: Date.now() }
    ],
    tasks: [],
    sessions: [],
    settings: {
      focus: 25, short: 5, long: 15, cycle: 4,
      dailyGoal: 120, sound: true, theme: 'light'
    }
  });

  let state = defaultState();
  const listeners = new Set();

  /* ---------- persistence ---------- */

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) { seedExamples(); save(); return; }
      const parsed = JSON.parse(raw);
      state = {
        ...defaultState(),
        ...parsed,
        settings: { ...defaultState().settings, ...(parsed.settings || {}) }
      };
      state.subjects = Array.isArray(state.subjects) ? state.subjects : [];
      state.tasks    = Array.isArray(state.tasks) ? state.tasks : [];
      state.sessions = Array.isArray(state.sessions) ? state.sessions : [];
    } catch (err) {
      console.warn('StudyFlow: could not read saved data, starting fresh.', err);
      state = defaultState();
      seedExamples();
    }
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (err) {
      console.warn('StudyFlow: saving failed (storage full or blocked).', err);
      return false;
    }
    return true;
  }

  /** First-run sample data so the dashboard is never an empty shell. */
  function seedExamples() {
    const [maths, physics, history] = state.subjects;
    const t = Utils.todayISO();
    state.tasks = [
      { id: Utils.uid(), title: 'Revise integration by parts', subjectId: maths.id, due: t,
        priority: 'high', estimate: 60, notes: 'Exercises 4.1 – 4.3', done: false, createdAt: Date.now(), completedAt: null },
      { id: Utils.uid(), title: 'Lab report: pendulum experiment', subjectId: physics.id, due: Utils.addDays(t, 2),
        priority: 'medium', estimate: 90, notes: 'Include error analysis', done: false, createdAt: Date.now(), completedAt: null },
      { id: Utils.uid(), title: 'Read chapter 7 — Industrial Revolution', subjectId: history.id, due: Utils.addDays(t, 4),
        priority: 'low', estimate: 45, notes: '', done: false, createdAt: Date.now(), completedAt: null },
      { id: Utils.uid(), title: 'Practice past paper 2021', subjectId: maths.id, due: Utils.addDays(t, -1),
        priority: 'medium', estimate: 120, notes: 'Timed attempt', done: true, createdAt: Date.now() - 86400000, completedAt: Date.now() }
    ];
  }

  /* ---------- subscriptions ---------- */

  const on = fn => { listeners.add(fn); return () => listeners.delete(fn); };
  function emit() { save(); listeners.forEach(fn => fn(state)); }

  /* ---------- tasks ---------- */

  function addTask(data) {
    const task = {
      id: Utils.uid(),
      title: String(data.title || '').trim(),
      subjectId: data.subjectId || '',
      due: data.due || '',
      priority: data.priority || 'medium',
      estimate: Number(data.estimate) || 0,
      notes: String(data.notes || '').trim(),
      done: false,
      createdAt: Date.now(),
      completedAt: null
    };
    if (!task.title) return null;
    state.tasks.push(task);
    emit();
    return task;
  }

  function updateTask(id, patch) {
    const task = state.tasks.find(t => t.id === id);
    if (!task) return null;
    Object.assign(task, patch);
    emit();
    return task;
  }

  function toggleTask(id) {
    const task = state.tasks.find(t => t.id === id);
    if (!task) return null;
    task.done = !task.done;
    task.completedAt = task.done ? Date.now() : null;
    emit();
    return task;
  }

  function deleteTask(id) {
    const index = state.tasks.findIndex(t => t.id === id);
    if (index < 0) return null;
    const [removed] = state.tasks.splice(index, 1);
    emit();
    return removed;
  }

  function restoreTask(task, index) {
    state.tasks.splice(Math.min(index ?? state.tasks.length, state.tasks.length), 0, task);
    emit();
  }

  const getTask = id => state.tasks.find(t => t.id === id) || null;

  /* ---------- subjects ---------- */

  function addSubject({ name, teacher = '', color }) {
    const clean = String(name || '').trim();
    if (!clean) return null;
    const subject = {
      id: Utils.uid(),
      name: clean,
      teacher: String(teacher).trim(),
      color: color || PALETTE[state.subjects.length % PALETTE.length],
      createdAt: Date.now()
    };
    state.subjects.push(subject);
    emit();
    return subject;
  }

  /** Removing a subject keeps its tasks — they simply become unassigned. */
  function deleteSubject(id) {
    const index = state.subjects.findIndex(s => s.id === id);
    if (index < 0) return null;
    const [removed] = state.subjects.splice(index, 1);
    state.tasks.forEach(t => { if (t.subjectId === id) t.subjectId = ''; });
    state.sessions.forEach(s => { if (s.subjectId === id) s.subjectId = ''; });
    emit();
    return removed;
  }

  const getSubject = id => state.subjects.find(s => s.id === id) || null;

  /* ---------- focus sessions ---------- */

  function addSession({ minutes, subjectId = '', mode = 'focus' }) {
    const session = {
      id: Utils.uid(),
      minutes: Math.round(minutes),
      subjectId,
      mode,
      date: Utils.todayISO(),
      at: Date.now()
    };
    state.sessions.push(session);
    emit();
    return session;
  }

  const sessionsOn = iso => state.sessions.filter(s => s.date === iso && s.mode === 'focus');
  const minutesOn  = iso => sessionsOn(iso).reduce((sum, s) => sum + s.minutes, 0);

  /** Consecutive days (ending today or yesterday) with at least one session. */
  function streak() {
    const days = new Set(state.sessions.filter(s => s.mode === 'focus' && s.minutes > 0).map(s => s.date));
    let cursor = Utils.todayISO();
    if (!days.has(cursor)) {
      cursor = Utils.addDays(cursor, -1);
      if (!days.has(cursor)) return 0;
    }
    let count = 0;
    while (days.has(cursor)) { count++; cursor = Utils.addDays(cursor, -1); }
    return count;
  }

  /* ---------- settings & data management ---------- */

  function setSetting(key, value) {
    state.settings[key] = value;
    emit();
  }

  function replaceAll(next) {
    state = {
      ...defaultState(),
      ...next,
      settings: { ...defaultState().settings, ...(next.settings || {}) }
    };
    emit();
  }

  function clearAll() {
    state = defaultState();
    state.tasks = [];
    emit();
  }

  return {
    PALETTE,
    get state() { return state; },
    get tasks() { return state.tasks; },
    get subjects() { return state.subjects; },
    get sessions() { return state.sessions; },
    get settings() { return state.settings; },
    load, save, on, emit,
    addTask, updateTask, toggleTask, deleteTask, restoreTask, getTask,
    addSubject, deleteSubject, getSubject,
    addSession, sessionsOn, minutesOn, streak,
    setSetting, replaceAll, clearAll
  };
})();
