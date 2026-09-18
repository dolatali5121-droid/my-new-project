/* ==========================================================================
   app.js — UI helpers (toasts, confirm), routing, theme, global wiring
   ========================================================================== */
'use strict';

/* ── shared UI helpers used by every module ───────────────────────────── */
const UI = (() => {
  const { $, el, icon } = Utils;

  function toast(message, { undo = null, timeout = 4000 } = {}) {
    const stack = $('#toasts');
    if (!stack) return;

    const node = el('div', { class: 'toast', role: 'status' }, [
      icon('check'),
      el('span', { text: message })
    ]);

    if (undo) {
      node.append(el('button', {
        class: 'toast__undo', type: 'button', text: 'Undo',
        onclick: () => { undo(); dismiss(); }
      }));
    }

    function dismiss() {
      node.classList.add('is-out');
      setTimeout(() => node.remove(), 220);
    }

    stack.append(node);
    setTimeout(dismiss, timeout);
    while (stack.children.length > 3) stack.firstElementChild.remove();
  }

  /** Promise-free confirm dialog — pass an onConfirm callback. */
  function confirm({ title = 'Are you sure?', text = '', confirmText = 'Delete', onConfirm }) {
    const dialog = $('#confirmDialog');
    $('#confirmTitle').textContent = title;
    $('#confirmText').textContent = text;

    const ok = $('#confirmOk');
    ok.textContent = confirmText;

    const handler = () => {
      dialog.close();
      if (typeof onConfirm === 'function') onConfirm();
    };
    ok.addEventListener('click', handler, { once: true });
    dialog.addEventListener('close', () => ok.removeEventListener('click', handler), { once: true });

    dialog.showModal();
    setTimeout(() => ok.focus(), 30);
  }

  return { toast, confirm };
})();

/* ── the application ──────────────────────────────────────────────────── */
const App = (() => {
  const { $, $$ } = Utils;

  const ROUTES = ['dashboard', 'tasks', 'schedule', 'subjects', 'timer', 'settings'];
  let current = 'dashboard';

  /* ── theme ────────────────────────────────────────────────────────── */
  function applyTheme(theme) {
    const next = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    document.querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', next === 'dark' ? '#0d1512' : '#157f58');
    Store.settings.theme = next;
  }

  function toggleTheme() {
    applyTheme(Store.settings.theme === 'dark' ? 'light' : 'dark');
    Store.commit();
  }

  /* ── routing ──────────────────────────────────────────────────────── */
  function navigate(route, { replace = false } = {}) {
    if (!ROUTES.includes(route)) route = 'dashboard';
    current = route;

    $$('.view').forEach((view) => view.classList.toggle('is-active', view.dataset.view === route));
    $$('.nav__item').forEach((item) => item.classList.toggle('is-active', item.dataset.route === route));

    const hash = '#/' + route;
    if (location.hash !== hash) {
      replace ? history.replaceState(null, '', hash) : history.pushState(null, '', hash);
    }

    closeSidebar();
    if (route === 'settings') Settings.render();
    if (route === 'timer') Timer.render();

    const view = $('#view-' + route);
    if (view) view.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const routeFromHash = () => (location.hash || '').replace(/^#\/?/, '') || 'dashboard';

  /* ── sidebar (mobile drawer) ──────────────────────────────────────── */
  function openSidebar() {
    $('#sidebar').classList.add('is-open');
    $('#scrim').hidden = false;
    $('#menuBtn').setAttribute('aria-expanded', 'true');
  }

  function closeSidebar() {
    $('#sidebar').classList.remove('is-open');
    $('#scrim').hidden = true;
    $('#menuBtn').setAttribute('aria-expanded', 'false');
  }

  /* ── render everything that depends on state ──────────────────────── */
  function renderAll() {
    Dashboard.render();
    Tasks.render();
    Schedule.render();
    Subjects.render();
    Timer.render();
    if (current === 'settings') Settings.render();
  }

  /* ── global event wiring ──────────────────────────────────────────── */
  function wire() {
    /* navigation: sidebar items and any [data-route] shortcut in a card */
    document.addEventListener('click', (e) => {
      const routeBtn = e.target.closest('[data-route]');
      if (routeBtn) {
        navigate(routeBtn.dataset.route);
        return;
      }

      const action = e.target.closest('[data-action]');
      if (action) {
        if (action.dataset.action === 'new-task') Tasks.openDialog();
        if (action.dataset.action === 'new-subject') Subjects.openDialog();
        if (action.dataset.action === 'new-block') Schedule.openDialog();
        return;
      }

      if (e.target.closest('[data-close]')) {
        e.target.closest('dialog')?.close();
      }
    });

    $('#newTaskBtn').addEventListener('click', () => Tasks.openDialog());
    $('#dashAddBtn').addEventListener('click', () => Tasks.openDialog());
    $('#themeBtn').addEventListener('click', toggleTheme);

    $('#menuBtn').addEventListener('click', openSidebar);
    $('#sidebarClose').addEventListener('click', closeSidebar);
    $('#scrim').addEventListener('click', closeSidebar);

    /* search filters the task list and jumps to it */
    const search = $('#searchInput');
    search.addEventListener('input', Utils.debounce((e) => {
      const value = e.target.value;
      Tasks.setQuery(value);
      if (value.trim() && current !== 'tasks') navigate('tasks');
    }, 180));

    window.addEventListener('popstate', () => navigate(routeFromHash(), { replace: true }));

    /* keyboard shortcuts */
    document.addEventListener('keydown', (e) => {
      const typing = /^(input|textarea|select)$/i.test(e.target.tagName);

      if (e.key === 'Escape') {
        closeSidebar();
        return;
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === 'n') { e.preventDefault(); Tasks.openDialog(); }
      if (e.key === '/') { e.preventDefault(); search.focus(); }
      if (e.key === 'g') {
        const once = (ev) => {
          const map = { d: 'dashboard', t: 'tasks', s: 'schedule', c: 'subjects', f: 'timer' };
          if (map[ev.key]) navigate(map[ev.key]);
          document.removeEventListener('keydown', once, true);
        };
        document.addEventListener('keydown', once, true);
      }
    });

    /* keep "today", overdue badges and the live agenda honest over time */
    setInterval(() => {
      if (current === 'dashboard') Dashboard.render();
      if (current === 'tasks') Tasks.render();
    }, 60000);
  }

  /* ── boot ─────────────────────────────────────────────────────────── */
  function init() {
    Store.init();
    applyTheme(Store.settings.theme);

    Tasks.init();
    Subjects.init();
    Schedule.init();
    Settings.init();
    Timer.init();
    wire();

    Store.subscribe(renderAll);
    renderAll();
    navigate(routeFromHash(), { replace: true });
  }

  return { init, navigate, applyTheme, toggleTheme, get route() { return current; } };
})();

document.addEventListener('DOMContentLoaded', App.init);
