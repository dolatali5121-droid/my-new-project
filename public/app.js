const todayStr = () => new Date().toISOString().slice(0, 10);

const el = {
  uploadZone: document.getElementById("uploadZone"),
  imageInput: document.getElementById("imageInput"),
  uploadPrompt: document.getElementById("uploadPrompt"),
  previewImg: document.getElementById("previewImg"),
  analyzeStatus: document.getElementById("analyzeStatus"),
  draftResult: document.getElementById("draftResult"),
  draftItems: document.getElementById("draftItems"),
  addItemBtn: document.getElementById("addItemBtn"),
  draftTotal: document.getElementById("draftTotal"),
  confidenceNote: document.getElementById("confidenceNote"),
  mealDate: document.getElementById("mealDate"),
  saveMealBtn: document.getElementById("saveMealBtn"),
  discardBtn: document.getElementById("discardBtn"),
  logDate: document.getElementById("logDate"),
  goalInput: document.getElementById("goalInput"),
  progressFill: document.getElementById("progressFill"),
  progressLabel: document.getElementById("progressLabel"),
  mealsList: document.getElementById("mealsList"),
  historyChart: document.getElementById("historyChart"),
};

let draftItems = [];
let draftImageUrl = null;

// ---------- Upload + analyze ----------

el.uploadZone.addEventListener("click", () => el.imageInput.click());

el.imageInput.addEventListener("change", async () => {
  const file = el.imageInput.files[0];
  if (!file) return;

  el.previewImg.src = URL.createObjectURL(file);
  el.previewImg.hidden = false;
  el.uploadPrompt.hidden = true;

  setStatus("Analyzing photo…", false);
  el.draftResult.hidden = true;

  const formData = new FormData();
  formData.append("image", file);

  try {
    const res = await fetch("/api/analyze", { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Analysis failed");

    draftItems = data.items.map((i) => ({ ...i }));
    draftImageUrl = data.imageUrl;
    el.mealDate.value = todayStr();

    renderDraftItems();
    el.confidenceNote.textContent = `Confidence: ${data.confidence}${data.notes ? " — " + data.notes : ""}`;
    el.draftResult.hidden = false;
    setStatus("", false, true);
  } catch (err) {
    setStatus(err.message, true);
  }
});

function setStatus(text, isError, hide) {
  el.analyzeStatus.hidden = !!hide || !text;
  el.analyzeStatus.textContent = text;
  el.analyzeStatus.classList.toggle("error", !!isError);
}

function renderDraftItems() {
  el.draftItems.innerHTML = "";
  draftItems.forEach((item, idx) => {
    const row = document.createElement("div");
    row.className = "item-row";
    row.innerHTML = `
      <input type="text" value="${escapeAttr(item.name)}" data-field="name" />
      <input type="text" value="${escapeAttr(item.portion)}" data-field="portion" />
      <input type="number" value="${item.calories}" min="0" step="1" data-field="calories" />
      <button type="button" class="remove-btn" title="Remove">✕</button>
    `;
    row.querySelectorAll("input").forEach((input) => {
      input.addEventListener("input", () => {
        const field = input.dataset.field;
        draftItems[idx][field] = field === "calories" ? Number(input.value) || 0 : input.value;
        updateDraftTotal();
      });
    });
    row.querySelector(".remove-btn").addEventListener("click", () => {
      draftItems.splice(idx, 1);
      renderDraftItems();
    });
    el.draftItems.appendChild(row);
  });
  updateDraftTotal();
}

function updateDraftTotal() {
  const total = draftItems.reduce((sum, i) => sum + (Number(i.calories) || 0), 0);
  el.draftTotal.textContent = Math.round(total);
}

el.addItemBtn.addEventListener("click", () => {
  draftItems.push({ name: "", portion: "", calories: 0 });
  renderDraftItems();
});

el.discardBtn.addEventListener("click", resetUpload);

function resetUpload() {
  draftItems = [];
  draftImageUrl = null;
  el.imageInput.value = "";
  el.previewImg.hidden = true;
  el.uploadPrompt.hidden = false;
  el.draftResult.hidden = true;
  setStatus("", false, true);
}

el.saveMealBtn.addEventListener("click", async () => {
  if (draftItems.length === 0) return;
  const total = draftItems.reduce((sum, i) => sum + (Number(i.calories) || 0), 0);

  try {
    const res = await fetch("/api/meals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: el.mealDate.value || todayStr(),
        items: draftItems,
        totalCalories: total,
        imageUrl: draftImageUrl,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to save meal");

    resetUpload();
    el.logDate.value = data.date;
    await loadLog(data.date);
    await loadHistory();
  } catch (err) {
    setStatus(err.message, true, false);
  }
});

// ---------- Daily log ----------

function loadGoal() {
  const stored = localStorage.getItem("calorieGoal");
  return stored ? Number(stored) : 2000;
}

el.goalInput.addEventListener("input", () => {
  const goal = Number(el.goalInput.value) || 0;
  try {
    localStorage.setItem("calorieGoal", String(goal));
  } catch (_) {}
  renderProgress(currentTotal, goal);
});

let currentTotal = 0;

async function loadLog(date) {
  const res = await fetch(`/api/meals?date=${encodeURIComponent(date)}`);
  const data = await res.json();
  if (!res.ok) return;

  currentTotal = data.totalCalories;
  const goal = loadGoal();
  el.goalInput.value = goal;
  renderProgress(currentTotal, goal);
  renderMeals(data.meals);
}

function renderProgress(total, goal) {
  const pct = goal > 0 ? Math.min(100, (total / goal) * 100) : 0;
  el.progressFill.style.width = `${pct}%`;
  el.progressLabel.textContent = goal > 0 ? `${Math.round(total)} / ${goal} kcal` : `${Math.round(total)} kcal`;
}

function renderMeals(meals) {
  el.mealsList.innerHTML = "";
  if (meals.length === 0) {
    el.mealsList.innerHTML = `<div class="empty-state">No meals logged for this day yet.</div>`;
    return;
  }
  meals.forEach((meal) => {
    const row = document.createElement("div");
    row.className = "meal-entry";
    row.innerHTML = `
      ${meal.imageUrl ? `<img src="${meal.imageUrl}" alt="" />` : ""}
      <div class="meal-info">
        <div class="meal-name">${escapeHtml(meal.mealName)}</div>
        <div class="meal-items">${meal.items.map((i) => `${escapeHtml(i.name)} (${escapeHtml(i.portion)})`).join(", ")}</div>
      </div>
      <div class="meal-cal">${Math.round(meal.totalCalories)} kcal</div>
      <button type="button" class="remove-btn" title="Delete">✕</button>
    `;
    row.querySelector(".remove-btn").addEventListener("click", async () => {
      await fetch(`/api/meals/${meal.id}`, { method: "DELETE" });
      await loadLog(el.logDate.value);
      await loadHistory();
    });
    el.mealsList.appendChild(row);
  });
}

el.logDate.addEventListener("change", () => loadLog(el.logDate.value));

// ---------- History ----------

async function loadHistory() {
  const res = await fetch("/api/summary?days=7");
  const data = await res.json();
  if (!res.ok) return;

  const max = Math.max(...data.days.map((d) => d.totalCalories), 1);
  el.historyChart.innerHTML = "";
  data.days.forEach((d) => {
    const heightPct = Math.max(2, (d.totalCalories / max) * 100);
    const label = new Date(d.date + "T00:00:00").toLocaleDateString(undefined, { weekday: "short" });
    const col = document.createElement("div");
    col.className = "history-bar";
    col.innerHTML = `
      <div class="bar-value">${d.totalCalories || ""}</div>
      <div class="bar" style="height: ${heightPct}%"></div>
      <div class="bar-label">${label}</div>
    `;
    el.historyChart.appendChild(col);
  });
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function escapeAttr(str) {
  return escapeHtml(str);
}

// ---------- Init ----------

(function init() {
  const today = todayStr();
  el.logDate.value = today;
  loadLog(today);
  loadHistory();
})();
