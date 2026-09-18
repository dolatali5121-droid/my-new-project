/* utils.js — tiny helpers shared by every module (no dependencies). */
const Utils = (() => {
  'use strict';

  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /** Create an element with attributes/children in one call. */
  function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (value === null || value === undefined || value === false) continue;
      if (key === 'class') node.className = value;
      else if (key === 'html') node.innerHTML = value;
      else if (key === 'text') node.textContent = value;
      else if (key === 'style') node.setAttribute('style', value);
      else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2), value);
      else node.setAttribute(key, value === true ? '' : value);
    }
    children.flat().forEach(child => {
      if (child === null || child === undefined || child === false) return;
      node.append(child.nodeType ? child : document.createTextNode(String(child)));
    });
    return node;
  }

  const uid = () => 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);

  const escapeHtml = str => String(str).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- dates (all stored as local "YYYY-MM-DD" strings) ---------- */

  function toISO(date) {
    const d = new Date(date);
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  const todayISO = () => toISO(new Date());

  /** Parse "YYYY-MM-DD" into a local Date at midnight (avoids UTC drift). */
  function fromISO(iso) {
    if (!iso) return null;
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function addDays(iso, days) {
    const d = fromISO(iso) || new Date();
    d.setDate(d.getDate() + days);
    return toISO(d);
  }

  /** Whole days between two ISO dates (b - a). */
  function daysBetween(a, b) {
    const MS = 86400000;
    return Math.round((fromISO(b) - fromISO(a)) / MS);
  }

  /** Monday of the week containing `iso`. */
  function startOfWeek(iso) {
    const d = fromISO(iso) || new Date();
    const shift = (d.getDay() + 6) % 7; // Monday = 0
    d.setDate(d.getDate() - shift);
    return toISO(d);
  }

  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const DAYS   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

  /** "Today", "Tomorrow", "Mon 14 Oct" — friendly, short, unambiguous. */
  function formatDue(iso) {
    if (!iso) return 'No date';
    const diff = daysBetween(todayISO(), iso);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    if (diff === -1) return 'Yesterday';
    const d = fromISO(iso);
    const label = `${DAYS[d.getDay()].slice(0, 3)} ${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;
    return diff < -1 ? `${label} (${Math.abs(diff)}d late)` : label;
  }

  function formatLongDate(iso) {
    const d = fromISO(iso);
    return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  }

  function formatRange(startISO, endISO) {
    const a = fromISO(startISO), b = fromISO(endISO);
    const sameMonth = a.getMonth() === b.getMonth();
    const left = `${a.getDate()} ${sameMonth ? '' : MONTHS[a.getMonth()].slice(0, 3)}`.trim();
    return `${left} – ${b.getDate()} ${MONTHS[b.getMonth()].slice(0, 3)} ${b.getFullYear()}`;
  }

  const clockTime = ts => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  /** 95 → "1h 35m" */
  function humanMinutes(min) {
    const m = Math.max(0, Math.round(min));
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    const rest = m % 60;
    return rest ? `${h}h ${rest}m` : `${h}h`;
  }

  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

  function debounce(fn, wait = 200) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
  }

  return { $, $$, el, uid, escapeHtml, toISO, todayISO, fromISO, addDays, daysBetween,
           startOfWeek, formatDue, formatLongDate, formatRange, clockTime, humanMinutes,
           clamp, debounce, MONTHS, DAYS };
})();
