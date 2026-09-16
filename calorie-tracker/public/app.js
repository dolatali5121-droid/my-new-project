(() => {
  const GOAL_KEY = 'caloriesnap_goal';
  const LOG_KEY = 'caloriesnap_log';
  const DEFAULT_GOAL = 2000;

  const $ = (id) => document.getElementById(id);

  const els = {
    goalInput: $('goal-input'),
    goalSave: $('goal-save'),
    progressFill: $('progress-fill'),
    consumedTotal: $('consumed-total'),
    goalTotal: $('goal-total'),
    remainingTotal: $('remaining-total'),
    tabBtns: document.querySelectorAll('.tab-btn'),
    tabPanels: document.querySelectorAll('.tab-panel'),
    fileInput: $('file-input'),
    dropZone: $('drop-zone'),
    dropZoneText: $('drop-zone-text'),
    previewImg: $('preview-img'),
    analyzeBtn: $('analyze-btn'),
    analyzeStatus: $('analyze-status'),
    results: $('results'),
    resultsNotes: $('results-notes'),
    resultsList: $('results-list'),
    resultsTotal: $('results-total'),
    addLogBtn: $('add-log-btn'),
    manualForm: $('manual-form'),
    manualName: $('manual-name'),
    manualQuantity: $('manual-quantity'),
    manualCalories: $('manual-calories'),
    logDateLabel: $('log-date-label'),
    datePicker: $('date-picker'),
    logList: $('log-list'),
    logEmpty: $('log-empty'),
  };

  let selectedFile = null;
  let lastAnalysis = null;
  let selectedDate = todayStr();

  function todayStr() {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - offset * 60000);
    return local.toISOString().slice(0, 10);
  }

  function loadGoal() {
    const raw = localStorage.getItem(GOAL_KEY);
    return raw ? Number(raw) : DEFAULT_GOAL;
  }

  function saveGoal(value) {
    localStorage.setItem(GOAL_KEY, String(value));
  }

  function loadLog() {
    try {
      return JSON.parse(localStorage.getItem(LOG_KEY) || '{}');
    } catch {
      return {};
    }
  }

  function saveLog(log) {
    localStorage.setItem(LOG_KEY, JSON.stringify(log));
  }

  function addEntryToDate(date, entry) {
    const log = loadLog();
    if (!log[date]) log[date] = [];
    log[date].push(entry);
    saveLog(log);
  }

  function removeEntry(date, id) {
    const log = loadLog();
    if (!log[date]) return;
    log[date] = log[date].filter((e) => e.id !== id);
    saveLog(log);
  }

  function dateTotal(date) {
    const log = loadLog();
    const entries = log[date] || [];
    return entries.reduce((sum, e) => sum + Number(e.calories || 0), 0);
  }

  function renderGoal() {
    const goal = loadGoal();
    els.goalInput.value = goal;
    renderProgress();
  }

  function renderProgress() {
    const goal = loadGoal();
    const consumed = dateTotal(todayStr());
    els.consumedTotal.textContent = consumed;
    els.goalTotal.textContent = goal;
    const remaining = goal - consumed;
    els.remainingTotal.textContent = remaining >= 0 ? remaining : 0;
    const pct = goal > 0 ? Math.min(100, (consumed / goal) * 100) : 0;
    els.progressFill.style.width = `${pct}%`;
    els.progressFill.classList.toggle('over', consumed > goal);
  }

  function renderLog() {
    els.logDateLabel.textContent = selectedDate === todayStr() ? 'Today' : selectedDate;
    els.datePicker.value = selectedDate;
    const log = loadLog();
    const entries = (log[selectedDate] || []).slice().sort((a, b) => a.time.localeCompare(b.time));
    els.logList.innerHTML = '';
    els.logEmpty.hidden = entries.length > 0;

    entries.forEach((entry) => {
      const li = document.createElement('li');
      const left = document.createElement('div');
      left.innerHTML = `
        <div class="log-item-name">${escapeHtml(entry.name)}</div>
        <div class="log-item-meta">${escapeHtml(entry.quantity || '')}${entry.source === 'photo' ? ' · from photo' : ''}</div>
      `;
      const right = document.createElement('div');
      right.className = 'log-item-right';
      right.innerHTML = `
        <span class="log-item-cal">${entry.calories} kcal</span>
        <button class="delete-btn" title="Remove" aria-label="Remove">&times;</button>
      `;
      right.querySelector('.delete-btn').addEventListener('click', () => {
        removeEntry(selectedDate, entry.id);
        renderLog();
        renderProgress();
      });
      li.appendChild(left);
      li.appendChild(right);
      els.logList.appendChild(li);
    });

    renderProgress();
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
  }

  // Goal handling
  els.goalSave.addEventListener('click', () => {
    const value = Math.max(0, Number(els.goalInput.value) || 0);
    saveGoal(value);
    renderProgress();
  });

  // Tabs
  els.tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      els.tabBtns.forEach((b) => b.classList.remove('active'));
      els.tabPanels.forEach((p) => p.classList.remove('active'));
      btn.classList.add('active');
      $(`tab-${btn.dataset.tab}`).classList.add('active');
    });
  });

  // Photo selection
  els.dropZone.addEventListener('click', () => els.fileInput.click());
  els.fileInput.addEventListener('change', () => {
    const file = els.fileInput.files[0];
    if (!file) return;
    selectedFile = file;
    lastAnalysis = null;
    els.results.hidden = true;
    els.analyzeStatus.textContent = '';
    els.analyzeStatus.classList.remove('error');
    els.analyzeBtn.disabled = false;

    const reader = new FileReader();
    reader.onload = (e) => {
      els.previewImg.src = e.target.result;
      els.previewImg.hidden = false;
      els.dropZoneText.hidden = true;
    };
    reader.readAsDataURL(file);
  });

  els.analyzeBtn.addEventListener('click', async () => {
    if (!selectedFile) return;
    els.analyzeBtn.disabled = true;
    els.analyzeStatus.textContent = 'Analyzing photo…';
    els.analyzeStatus.classList.remove('error');
    els.results.hidden = true;

    const formData = new FormData();
    formData.append('image', selectedFile);

    try {
      const res = await fetch('/api/analyze-food', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Analysis failed');
      }
      lastAnalysis = data;
      renderResults(data);
      els.analyzeStatus.textContent = '';
    } catch (err) {
      els.analyzeStatus.textContent = err.message || 'Something went wrong. Try again or add the meal manually.';
      els.analyzeStatus.classList.add('error');
    } finally {
      els.analyzeBtn.disabled = false;
    }
  });

  function renderResults(data) {
    els.resultsList.innerHTML = '';
    const items = data.items || [];
    if (items.length === 0) {
      els.resultsNotes.textContent = data.notes || 'No food items were detected in this photo.';
      els.resultsTotal.textContent = '0';
      els.results.hidden = false;
      els.addLogBtn.disabled = true;
      return;
    }
    els.addLogBtn.disabled = false;
    els.resultsNotes.textContent = data.notes
      ? `${data.notes} (confidence: ${data.confidence || 'unknown'})`
      : `Confidence: ${data.confidence || 'unknown'}`;

    items.forEach((item) => {
      const li = document.createElement('li');
      li.innerHTML = `
        <div>
          <div>${escapeHtml(item.name)}</div>
          <div class="item-meta">${escapeHtml(item.quantity || '')}</div>
        </div>
        <div class="item-cal">${item.calories} kcal</div>
      `;
      els.resultsList.appendChild(li);
    });

    const total = data.totalCalories ?? items.reduce((s, i) => s + Number(i.calories || 0), 0);
    els.resultsTotal.textContent = total;
    els.results.hidden = false;
  }

  els.addLogBtn.addEventListener('click', () => {
    if (!lastAnalysis || !lastAnalysis.items || lastAnalysis.items.length === 0) return;
    const now = new Date().toISOString();
    const mealLabel = lastAnalysis.items.map((i) => i.name).join(', ');
    const total = lastAnalysis.totalCalories ?? lastAnalysis.items.reduce((s, i) => s + Number(i.calories || 0), 0);

    addEntryToDate(selectedDate, {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: mealLabel,
      quantity: lastAnalysis.items.map((i) => `${i.name} (${i.quantity || ''})`).join('; '),
      calories: total,
      source: 'photo',
      time: now,
    });

    resetPhotoTab();
    renderLog();
    switchToLogView();
  });

  function resetPhotoTab() {
    selectedFile = null;
    lastAnalysis = null;
    els.fileInput.value = '';
    els.previewImg.hidden = true;
    els.dropZoneText.hidden = false;
    els.results.hidden = true;
    els.analyzeBtn.disabled = true;
    els.analyzeStatus.textContent = 'Added to today\'s log!';
  }

  function switchToLogView() {
    document.querySelector('.log-card').scrollIntoView({ behavior: 'smooth' });
  }

  // Manual entry
  els.manualForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = els.manualName.value.trim();
    const quantity = els.manualQuantity.value.trim();
    const calories = Math.max(0, Number(els.manualCalories.value) || 0);
    if (!name || calories <= 0) return;

    addEntryToDate(selectedDate, {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      quantity,
      calories,
      source: 'manual',
      time: new Date().toISOString(),
    });

    els.manualForm.reset();
    renderLog();
    switchToLogView();
  });

  // Date picker
  els.datePicker.addEventListener('change', () => {
    selectedDate = els.datePicker.value || todayStr();
    renderLog();
  });

  // Init
  els.datePicker.value = selectedDate;
  els.datePicker.max = todayStr();
  renderGoal();
  renderLog();
})();
