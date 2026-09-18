/* ==========================================================================
   store.js — application state, localStorage persistence and selectors
   The whole planner is one plain object; every mutation saves + notifies.
   ========================================================================== */
'use strict';

const Store = (() => {
  const KEY = 'studyflow.v1';

  const PALETTE = [
    '#1d9a6c', '#2f7fc4', '#d08a1e', '#8b5cf6',
    '#e05a4f', '#0f9b9b', '#d9689f', '#6f8b36'
  ];

  const prefersDark = () =>
    !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const DEFAULT_SETTINGS = {
    name: '',
    theme: prefersDark() ? 'dark' : 'light',
    focusMin: 25,
    shortMin: 5,
    longMin: 15,
    longEvery: 4,
    weeklyGoalHours: 12,
    sound: true
  };

  const listeners = new Set();
  let state = null;

  /* ── seed data ────────────────────────────────────────────────────── */
  function seed() {
    const { uid, toISODate, addDays, startOfWeek } = Utils;
    const today = new Date();
    const iso = (offset) => toISODate(addDays(today, offset));

    const subjects = [
      { id: uid('sub'), name: 'Mathematics',     teacher: 'Dr. Alvarez · Room 204', color: PALETTE[0], goalHours: 5 },
      { id: uid('sub'), name: 'Computer Science', teacher: 'Ms. Okafor · Lab B',     color: PALETTE[1], goalHours: 6 },
      { id: uid('sub'), name: 'Biology',          teacher: 'Mr. Hayes · Room 118',   color: PALETTE[2], goalHours: 4 },
      { id: uid('sub'), name: 'History',          teacher: 'Prof. Lin · Hall 3',     color: PALETTE[3], goalHours: 3 }
    ];
    const [math, cs, bio, hist] = subjects;

    const tasks = [
      { title: 'Finish calculus problem set 7', subjectId: math.id, due: iso(0),  time: '18:00', priority: 'high',   estimate: 90,  notes: 'Chapter 7.3 — integration by parts.', done: false },
      { title: 'Read chapter 4: cell division',  subjectId: bio.id,  due: iso(1),  time: '',      priority: 'medium', estimate: 45,  notes: '', done: false },
      { title: 'Build the sorting-algorithm demo', subjectId: cs.id, due: iso(2),  time: '23:59', priority: 'high',   estimate: 120, notes: 'Merge sort + quick sort visualiser.', done: false },
      { title: 'History essay outline',          subjectId: hist.id, due: iso(-1), time: '12:00', priority: 'medium', estimate: 60,  notes: 'Industrial revolution, 800 words.', done: false },
      { title: 'Revise vocabulary flashcards',   subjectId: null,    due: iso(4),  time: '',      priority: 'low',    estimate: 25,  notes: '', done: false },
      { title: 'Submit lab safety form',         subjectId: bio.id,  due: iso(-2), time: '',      priority: 'low',    estimate: 10,  notes: '', done: true }
    ].map((t, i) => ({
      id: Utils.uid('task'),
      ...t,
      createdAt: Date.now() - (i + 1) * 3600000,
      completedAt: t.done ? Date.now() - 86400000 : null
    }));

    const blocks = [
      { day: 0, start: '09:00', end: '10:30', title: 'Maths lecture',     subjectId: math.id, location: 'Room 204' },
      { day: 0, start: '13:00', end: '14:30', title: 'CS lab',            subjectId: cs.id,   location: 'Lab B' },
      { day: 1, start: '10:00', end: '11:00', title: 'Biology seminar',   subjectId: bio.id,  location: 'Room 118' },
      { day: 1, start: '15:00', end: '17:00', title: 'Study block',       subjectId: math.id, location: 'Library' },
      { day: 2, start: '09:00', end: '10:30', title: 'History lecture',   subjectId: hist.id, location: 'Hall 3' },
      { day: 3, start: '11:00', end: '12:30', title: 'CS tutorial',       subjectId: cs.id,   location: 'Lab B' },
      { day: 4, start: '14:00', end: '16:00', title: 'Group revision',    subjectId: null,    location: 'Library' }
    ].map((b) => ({ id: Utils.uid('blk'), ...b }));

    const weekStart = startOfWeek(today);
    const sessions = [];
    [50, 75, 25, 100, 45].forEach((mins, i) => {
      const day = Utils.addDays(weekStart, i);
      if (day > today) return;
      day.setHours(16, 30, 0, 0);
      sessions.push({
        id: Utils.uid('ses'),
        taskId: null,
        subjectId: subjects[i % subjects.length].id,
        minutes: mins,
        endedAt: day.getTime()
      });
    });

    return { version: 1, subjects, tasks, blocks, sessions, settings: { ...DEFAULT_SETTINGS } };
  }

  /* ── persistence ──────────────────────────────────────────────────── */
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return seed();
      const parsed = JSON.parse(raw);
      return normalise(parsed);
    } catch (err) {
      console.warn('StudyFlow: could not read saved data, starting fresh.', err);
      return seed();
    }
  }

  /** Guarantee every key exists, whatever the saved payload looked like. */
  function normalise(data) {
    const base = { version: 1, subjects: [], tasks: [], blocks: [], sessions: [], settings: {} };
    const out = { ...base, ...(data || {}) };
    ['subjects', 'tasks', 'blocks', 'sessions'].forEach((k) => {
      if (!Array.isArray(out[k])) out[k] = [];
    });
    out.settings = { ...DEFAULT_SETTINGS, ...(out.settings || {}) };
    return out;
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (err) {
      console.warn('StudyFlow: saving failed (storage full or blocked).', err);
    }
  }

  function emit() {
    listeners.forEach((fn) => fn(state));
  }

  /** Persist + re-render everything that listens. */
  function commit() {
    save();
    emit();
  }

  const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

  /* ── tasks ────────────────────────────────────────────────────────── */
  function addTask(data) {
    const task = {
      id: Utils.uid('task'),
      title: '',
      subjectId: null,
      due: '',
      time: '',
      priority: 'medium',
      estimate: null,
      notes: '',
      done: false,
      completedAt: null,
      createdAt: Date.now(),
      ...data
    };
    state.tasks.push(task);
    commit();
    return task;
  }

  function updateTask(id, patch) {
    const task = state.tasks.find((t) => t.id === id);
    if (!task) return null;
    Object.assign(task, patch);
    commit();
    return task;
  }

  function toggleTask(id) {
    const task = state.tasks.find((t) => t.id === id);
    if (!task) return null;
    task.done = !task.done;
    task.completedAt = task.done ? Date.now() : null;
    commit();
    return task;
  }

  function deleteTask(id) {
    const index = state.tasks.findIndex((t) => t.id === id);
    if (index < 0) return null;
    const [removed] = state.tasks.splice(index, 1);
    commit();
    return removed;
  }

  /** Re-insert a deleted task at its old position (undo support). */
  function restoreTask(task, index) {
    state.tasks.splice(Math.max(0, Math.min(index, state.tasks.length)), 0, task);
    commit();
  }

  const taskDate = (task) => Utils.parseDate(task.due, task.time || '23:59');

  const isOverdue = (task) => {
    if (task.done || !task.due) return false;
    const due = taskDate(task);
    return !!due && due.getTime() < Date.now();
  };

  /* ── subjects ─────────────────────────────────────────────────────── */
  function addSubject(data) {
    const subject = {
      id: Utils.uid('sub'),
      name: 'New subject',
      teacher: '',
      color: PALETTE[state.subjects.length % PALETTE.length],
      goalHours: 4,
      ...data
    };
    state.subjects.push(subject);
    commit();
    return subject;
  }

  function updateSubject(id, patch) {
    const subject = state.subjects.find((s) => s.id === id);
    if (!subject) return null;
    Object.assign(subject, patch);
    commit();
    return subject;
  }

  /** Removing a subject detaches it from its tasks and blocks rather than deleting them. */
  function deleteSubject(id) {
    state.subjects = state.subjects.filter((s) => s.id !== id);
    state.tasks.forEach((t) => { if (t.subjectId === id) t.subjectId = null; });
    state.blocks.forEach((b) => { if (b.subjectId === id) b.subjectId = null; });
    state.sessions.forEach((s) => { if (s.subjectId === id) s.subjectId = null; });
    commit();
  }

  const subjectById = (id) => state.subjects.find((s) => s.id === id) || null;

  /* ── timetable blocks ─────────────────────────────────────────────── */
  function addBlock(data) {
    const block = {
      id: Utils.uid('blk'),
      title: 'New block',
      subjectId: null,
      day: 0,
      start: '09:00',
      end: '10:00',
      location: '',
      ...data
    };
    state.blocks.push(block);
    commit();
    return block;
  }

  function updateBlock(id, patch) {
    const block = state.blocks.find((b) => b.id === id);
    if (!block) return null;
    Object.assign(block, patch);
    commit();
    return block;
  }

  function deleteBlock(id) {
    state.blocks = state.blocks.filter((b) => b.id !== id);
    commit();
  }

  const blocksForDay = (day) =>
    state.blocks
      .filter((b) => Number(b.day) === Number(day))
      .sort((a, b) => Utils.timeToMinutes(a.start) - Utils.timeToMinutes(b.start));

  /* ── focus sessions ───────────────────────────────────────────────── */
  function addSession(data) {
    const session = {
      id: Utils.uid('ses'),
      taskId: null,
      subjectId: null,
      minutes: 0,
      endedAt: Date.now(),
      ...data
    };
    state.sessions.unshift(session);
    if (state.sessions.length > 200) state.sessions.length = 200;
    commit();
    return session;
  }

  /** Minutes focused per weekday for the current week — index 0 = Monday. */
  function focusByWeekday() {
    const start = Utils.startOfWeek().getTime();
    const week = new Array(7).fill(0);
    state.sessions.forEach((s) => {
      const offset = Math.floor((s.endedAt - start) / Utils.DAY_MS);
      if (offset >= 0 && offset < 7) week[offset] += s.minutes;
    });
    return week;
  }

  const weekFocusMinutes = () => focusByWeekday().reduce((a, b) => a + b, 0);

  /** Focus minutes logged against one subject this week. */
  function subjectFocusMinutes(subjectId) {
    const start = Utils.startOfWeek().getTime();
    return state.sessions
      .filter((s) => s.subjectId === subjectId && s.endedAt >= start)
      .reduce((total, s) => total + s.minutes, 0);
  }

  function subjectStats(subjectId) {
    const tasks = state.tasks.filter((t) => t.subjectId === subjectId);
    const done = tasks.filter((t) => t.done).length;
    const minutes = subjectFocusMinutes(subjectId);
    const subject = subjectById(subjectId);
    const goal = Math.max(0, Number(subject && subject.goalHours) || 0) * 60;
    return {
      total: tasks.length,
      done,
      open: tasks.length - done,
      minutes,
      goalMinutes: goal,
      percent: goal ? Utils.clamp(Math.round((minutes / goal) * 100), 0, 100) : 0
    };
  }

  /* ── whole-planner operations ─────────────────────────────────────── */
  function replaceAll(data) {
    state = normalise(data);
    commit();
  }

  function reset() {
    state = seed();
    commit();
  }

  function init() {
    state = load();
    return state;
  }

  return {
    PALETTE, DEFAULT_SETTINGS, KEY,
    init, subscribe, commit, save,
    get state() { return state; },
    get settings() { return state.settings; },
    addTask, updateTask, toggleTask, deleteTask, restoreTask, taskDate, isOverdue,
    addSubject, updateSubject, deleteSubject, subjectById,
    addBlock, updateBlock, deleteBlock, blocksForDay,
    addSession, focusByWeekday, weekFocusMinutes, subjectFocusMinutes, subjectStats,
    replaceAll, reset
  };
})();
