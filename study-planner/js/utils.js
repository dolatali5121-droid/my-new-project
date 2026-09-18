/* ==========================================================================
   utils.js — tiny DOM + date + formatting helpers shared by every module
   ========================================================================== */
'use strict';

const Utils = (() => {

  /* ── DOM ──────────────────────────────────────────────────────────── */
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /** Create an element with attributes and children in one call. */
  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (value === null || value === undefined || value === false) continue;
      if (key === 'class') node.className = value;
      else if (key === 'text') node.textContent = value;
      else if (key === 'html') node.innerHTML = value;
      else if (key === 'dataset') Object.assign(node.dataset, value);
      else if (key === 'style' && typeof value === 'object') setStyle(node, value);
      else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2), value);
      else node.setAttribute(key, value === true ? '' : value);
    }
    for (const child of [].concat(children)) {
      if (child === null || child === undefined || child === false) continue;
      node.append(child.nodeType ? child : document.createTextNode(child));
    }
    return node;
  }

  /** Apply a style object — custom properties need setProperty(), not assignment. */
  function setStyle(node, styles) {
    for (const [prop, value] of Object.entries(styles)) {
      if (prop.startsWith('--')) node.style.setProperty(prop, value);
      else node.style[prop] = value;
    }
  }

  /** <svg class="icon"><use href="#id"></use></svg> */
  function icon(name, cls = 'icon') {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', cls);
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', '#i-' + name);
    svg.append(use);
    return svg;
  }

  const uid = (prefix = 'id') =>
    prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

  function debounce(fn, wait = 200) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
  }

  /* ── dates ────────────────────────────────────────────────────────── */
  const DAY_MS = 86400000;
  const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  /** Monday = 0 … Sunday = 6 (matches the timetable columns). */
  const weekIndex = (date) => (date.getDay() + 6) % 7;

  const startOfDay = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const startOfWeek = (date = new Date()) => {
    const d = startOfDay(date);
    d.setDate(d.getDate() - weekIndex(d));
    return d;
  };

  const addDays = (date, n) => {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    return d;
  };

  /** "2026-09-18" for a Date, in local time (never UTC-shifted). */
  function toISODate(date) {
    const d = new Date(date);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  /** Parse "2026-09-18" (+ optional "14:30") as a local Date. */
  function parseDate(isoDate, time) {
    if (!isoDate) return null;
    const [y, m, d] = isoDate.split('-').map(Number);
    if (!y || !m || !d) return null;
    const [hh, mm] = (time || '00:00').split(':').map(Number);
    return new Date(y, m - 1, d, hh || 0, mm || 0, 0, 0);
  }

  const isSameDay = (a, b) =>
    a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  /** Whole days from today: -1 yesterday, 0 today, 1 tomorrow. */
  const daysFromToday = (date) =>
    Math.round((startOfDay(date) - startOfDay(new Date())) / DAY_MS);

  /** "Today", "Tomorrow", "Fri 3 Oct", "3 days ago" … */
  function friendlyDate(date) {
    if (!date) return 'No due date';
    const diff = daysFromToday(date);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    if (diff === -1) return 'Yesterday';
    if (diff > 1 && diff < 7) return date.toLocaleDateString(undefined, { weekday: 'long' });
    if (diff < -1 && diff > -14) return `${Math.abs(diff)} days ago`;
    return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  }

  const formatTime = (date) =>
    date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

  /** "09:00" → minutes past midnight. */
  function timeToMinutes(hhmm) {
    const [h, m] = String(hhmm || '0:0').split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  }

  function minutesToTime(mins) {
    const h = Math.floor(mins / 60) % 24;
    const m = Math.round(mins % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  /** 95 → "1h 35m", 40 → "40m", 0 → "0m" */
  function formatDuration(minutes) {
    const total = Math.max(0, Math.round(minutes || 0));
    const h = Math.floor(total / 60);
    const m = total % 60;
    if (!h) return `${m}m`;
    return m ? `${h}h ${m}m` : `${h}h`;
  }

  const formatClock = (seconds) => {
    const s = Math.max(0, Math.round(seconds));
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  };

  return {
    $, $$, el, icon, setStyle, uid, clamp, debounce,
    DAY_MS, DAY_NAMES, DAY_SHORT,
    weekIndex, startOfDay, startOfWeek, addDays, toISODate, parseDate,
    isSameDay, daysFromToday, friendlyDate, formatTime,
    timeToMinutes, minutesToTime, formatDuration, formatClock
  };
})();
