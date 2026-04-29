const STORAGE_KEY = "tabs_manager_pro_planner_v2";

let currentDate = todayString();
let calendarYear = Number(currentDate.slice(0, 4));
let calendarMonth = Number(currentDate.slice(5, 7));
let planner = loadPlanner();
let modalMode = null;
let editingId = null;

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function makeId(prefix) {
  return prefix + "_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function makeDateString(year, month, day) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function loadPlanner() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function savePlanner() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(planner));
}

function dayData(date = currentDate) {
  if (!planner[date]) {
    planner[date] = {
      focus: [],
      schedules: [],
      tasks: [],
      tabs: [],
      worklogs: [],
      notes: ""
    };
  }
  return planner[date];
}

function hasDayData(date) {
  const d = planner[date];
  if (!d) return false;

  return (
    (d.focus || []).length > 0 ||
    (d.schedules || []).length > 0 ||
    (d.tasks || []).length > 0 ||
    (d.tabs || []).length > 0 ||
    (d.worklogs || []).length > 0 ||
    String(d.notes || "").trim().length > 0
  );
}

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function normalizeUrl(rawUrl) {
  if (!rawUrl) return "";

  try {
    const url = new URL(rawUrl.trim());
    const removable = ["fbclid", "gclid", "igshid", "igsh", "si", "mc_cid", "mc_eid", "_gl"];

    for (const key of [...url.searchParams.keys()]) {
      const lower = key.toLowerCase();
      if (lower.startsWith("utm_") || removable.includes(lower)) {
        url.searchParams.delete(key);
      }
    }

    url.hash = "";
    return url.toString();
  } catch {
    return rawUrl.trim();
  }
}

function syncCalendarFromDate(date) {
  calendarYear = Number(date.slice(0, 4));
  calendarMonth = Number(date.slice(5, 7));
}

function setDate(date) {
  if (!date) return;

  currentDate = date;
  syncCalendarFromDate(date);

  const dateInput = document.getElementById("dateInput");
  if (dateInput) dateInput.value = currentDate;

  render();
}

function shiftDate(days) {
  const d = new Date(currentDate + "T00:00:00");
  d.setDate(d.getDate() + days);
  setDate(d.toISOString().slice(0, 10));
}

function shiftMonth(delta) {
  calendarMonth += delta;

  if (calendarMonth < 1) {
    calendarMonth = 12;
    calendarYear -= 1;
  }

  if (calendarMonth > 12) {
    calendarMonth = 1;
    calendarYear += 1;
  }

  renderCalendarOnly();
}

function shiftYear(delta) {
  calendarYear += delta;
  renderCalendarOnly();
}

function initYearSelect() {
  const select = document.getElementById("yearSelect");
  if (!select || select.options.length > 0) return;

  const nowYear = new Date().getFullYear();
  const minYear = nowYear - 10;
  const maxYear = nowYear + 10;

  for (let y = minYear; y <= maxYear; y++) {
    const option = document.createElement("option");
    option.value = String(y);
    option.textContent = `${y} 年`;
    select.appendChild(option);
  }
}

function renderCalendarOnly() {
  renderCalendar();
}

function renderCalendar() {
  initYearSelect();

  const yearSelect = document.getElementById("yearSelect");
  const monthSelect = document.getElementById("monthSelect");
  const grid = document.getElementById("calendarGrid");

  if (!yearSelect || !monthSelect || !grid) return;

  yearSelect.value = String(calendarYear);
  monthSelect.value = String(calendarMonth);

  const first = new Date(calendarYear, calendarMonth - 1, 1);
  const startDay = first.getDay();
  const days = new Date(calendarYear, calendarMonth, 0).getDate();
  const today = todayString();

  let html = "";

  for (let i = 0; i < startDay; i++) {
    html += `<button class="day-cell" disabled></button>`;
  }

  for (let day = 1; day <= days; day++) {
    const date = makeDateString(calendarYear, calendarMonth, day);

    const classes = [
      "day-cell",
      date === today ? "today" : "",
      date === currentDate ? "active" : "",
      hasDayData(date) ? "has-data" : ""
    ].filter(Boolean).join(" ");

    html += `<button class="${classes}" data-action="set-date" data-date="${date}">${day}</button>`;
  }

  grid.innerHTML = html;
}

function openModal(mode, id = null) {
  modalMode = mode;
  editingId = id;

  document.getElementById("taskEditor").classList.remove("active");
  document.getElementById("scheduleEditor").classList.remove("active");
  document.getElementById("focusEditor").classList.remove("active");

  if (mode === "task") {
    document.getElementById("modalTitle").textContent = id ? "編輯任務" : "新增任務";
    document.getElementById("taskEditor").classList.add("active");

    const task = id ? dayData().tasks.find(x => x.id === id) : null;

    document.getElementById("taskTitleInput").value = task?.title || "";
    document.getElementById("taskStatusInput").value = task?.status || "todo";
    document.getElementById("taskPriorityInput").value = task?.priority || "P3";
    document.getElementById("taskCategoryInput").value = task?.category || "";
    document.getElementById("taskTagsInput").value = (task?.tags || []).join(", ");
    document.getElementById("taskUrlInput").value = task?.url || "";
    document.getElementById("taskNoteInput").value = task?.note || "";
  }

  if (mode === "schedule") {
    document.getElementById("modalTitle").textContent = id ? "編輯行程" : "新增行程";
    document.getElementById("scheduleEditor").classList.add("active");

    const schedule = id ? dayData().schedules.find(x => x.id === id) : null;

    document.getElementById("scheduleStartInput").value = schedule?.start || "";
    document.getElementById("scheduleEndInput").value = schedule?.end || "";
    document.getElementById("scheduleTitleInput").value = schedule?.title || "";
    document.getElementById("scheduleCategoryInput").value = schedule?.category || "";
  }

  if (mode === "focus") {
    document.getElementById("modalTitle").textContent = id ? "編輯今日重點" : "新增今日重點";
    document.getElementById("focusEditor").classList.add("active");

    const focus = id ? dayData().focus.find(x => x.id === id) : null;
    document.getElementById("focusInput").value = focus?.text || "";
  }

  document.getElementById("modalMask").style.display = "flex";
}

function closeModal() {
  modalMode = null;
  editingId = null;
  document.getElementById("modalMask").style.display = "none";
}

function saveModal() {
  const d = dayData();

  if (modalMode === "task") {
    const item = {
      id: editingId || makeId("task"),
      title: document.getElementById("taskTitleInput").value.trim(),
      status: document.getElementById("taskStatusInput").value,
      priority: document.getElementById("taskPriorityInput").value,
      category: document.getElementById("taskCategoryInput").value.trim(),
      tags: document.getElementById("taskTagsInput").value.split(",").map(x => x.trim()).filter(Boolean),
      url: normalizeUrl(document.getElementById("taskUrlInput").value.trim()),
      note: document.getElementById("taskNoteInput").value.trim()
    };

    if (!item.title) return;

    if (editingId) {
      d.tasks = d.tasks.map(x => x.id === editingId ? item : x);
    } else {
      d.tasks.push(item);
    }
  }

  if (modalMode === "schedule") {
    const item = {
      id: editingId || makeId("schedule"),
      start: document.getElementById("scheduleStartInput").value,
      end: document.getElementById("scheduleEndInput").value,
      title: document.getElementById("scheduleTitleInput").value.trim(),
      category: document.getElementById("scheduleCategoryInput").value.trim()
    };

    if (!item.title) return;

    if (editingId) {
      d.schedules = d.schedules.map(x => x.id === editingId ? item : x);
    } else {
      d.schedules.push(item);
    }

    d.schedules.sort((a, b) => (a.start || "").localeCompare(b.start || ""));
  }

  if (modalMode === "focus") {
    const item = {
      id: editingId || makeId("focus"),
      text: document.getElementById("focusInput").value.trim()
    };

    if (!item.text) return;

    if (editingId) {
      d.focus = d.focus.map(x => x.id === editingId ? item : x);
    } else {
      d.focus.push(item);
    }
  }

  savePlanner();
  closeModal();
  render();
}

function deleteItem(type, id) {
  const d = dayData();

  if (type === "task") d.tasks = d.tasks.filter(x => x.id !== id);
  if (type === "schedule") d.schedules = d.schedules.filter(x => x.id !== id);
  if (type === "focus") d.focus = d.focus.filter(x => x.id !== id);
  if (type === "tab") d.tabs = d.tabs.filter(x => x.id !== id);
  if (type === "worklog") d.worklogs = d.worklogs.filter(x => x.id !== id);

  savePlanner();
  render();
}

function setTaskStatus(id, status) {
  const task = dayData().tasks.find(x => x.id === id);
  if (!task) return;

  task.status = status;
  savePlanner();
  render();
}

function createTaskFromTab(id) {
  const d = dayData();
  const tab = d.tabs.find(x => x.id === id);
  if (!tab) return;

  d.tasks.push({
    id: makeId("task"),
    title: tab.title || tab.url,
    status: "todo",
    priority: tab.priority || "P3",
    category: tab.category || "Tabs",
    tags: ["tab"],
    url: tab.url,
    note: "由 Tabs 匯入"
  });

  savePlanner();
  render();
}

function createTaskFromWorklog(id) {
  const d = dayData();
  const log = d.worklogs.find(x => x.id === id);
  if (!log) return;

  d.tasks.push({
    id: makeId("task"),
    title: log.text.slice(0, 80),
    status: "todo",
    priority: log.is_todo ? "P1" : "P3",
    category: log.category || "Worklog",
    tags: ["worklog"],
    url: "",
    note: log.text
  });

  savePlanner();
  render();
}

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = () => reject(new Error("讀取檔案失敗"));
    reader.readAsText(file, "utf-8");
  });
}

function parseTabsHtml(htmlText) {
  const result = [];
  const dataMatch = htmlText.match(/const\s+INITIAL_DATA\s*=\s*(\[.*?\]);/s);

  if (dataMatch) {
    try {
      const groups = JSON.parse(dataMatch[1]);
      for (const group of groups) {
        for (const item of group.items || []) {
          result.push({
            id: makeId("tab"),
            title: item.title || item.url,
            url: normalizeUrl(item.url),
            category: group.category || item.category || "Tabs",
            priority: item.priority || "P3",
            status: item.status || "待看"
          });
        }
      }
    } catch {}
  }

  if (!result.length) {
    const doc = new DOMParser().parseFromString(htmlText, "text/html");
    for (const a of Array.from(doc.querySelectorAll("a"))) {
      const href = a.getAttribute("href");
      if (/^https?:/i.test(href || "")) {
        result.push({
          id: makeId("tab"),
          title: a.textContent.trim() || href,
          url: normalizeUrl(href),
          category: "Tabs",
          priority: "P3",
          status: "待看"
        });
      }
    }
  }

  const seen = new Set();
  return result.filter(x => {
    if (!x.url || seen.has(x.url)) return false;
    seen.add(x.url);
    return true;
  });
}

function parseWorklogHtml(htmlText) {
  const result = [];
  const dataMatch = htmlText.match(/const\s+INITIAL_DATA\s*=\s*(\[.*?\]);/s);

  if (dataMatch) {
    try {
      const rows = JSON.parse(dataMatch[1]);
      for (const item of rows) {
        const itemDate = String(item.date || "").replaceAll("/", "-");
        if (itemDate === currentDate) {
          result.push({
            id: makeId("worklog"),
            text: item.text || "",
            category: item.category || "General",
            is_todo: !!item.is_todo,
            is_command: !!item.is_command,
            ips: item.ips || []
          });
        }
      }
    } catch {}
  }

  return result;
}

async function importTabsHtml(file) {
  const htmlText = await readFile(file);
  const tabs = parseTabsHtml(htmlText);
  const d = dayData();

  const seen = new Set(d.tabs.map(x => x.url));
  for (const tab of tabs) {
    if (!seen.has(tab.url)) {
      d.tabs.push(tab);
      seen.add(tab.url);
    }
  }

  savePlanner();
  render();
}

async function importWorklogHtml(file) {
  const htmlText = await readFile(file);
  const rows = parseWorklogHtml(htmlText);
  const d = dayData();

  d.worklogs.push(...rows);
  savePlanner();
  render();
}

function exportPlannerHtml() {
  savePlanner();

  const html = document.documentElement.outerHTML;
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "tabs_manager_pro_planner_" + currentDate + ".html";
  a.click();

  URL.revokeObjectURL(url);
}

function exportJson() {
  const blob = new Blob([JSON.stringify(planner, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "tabs_manager_pro_planner_backup.json";
  a.click();

  URL.revokeObjectURL(url);
}

async function importJson(file) {
  const text = await readFile(file);
  planner = JSON.parse(text);
  savePlanner();
  render();
}

function clearDay() {
  if (!confirm("確定清空本日 Planner？")) return;

  delete planner[currentDate];
  savePlanner();
  render();
}

function renderCalendar() {
  initYearSelect();

  const yearSelect = document.getElementById("yearSelect");
  const monthSelect = document.getElementById("monthSelect");
  const grid = document.getElementById("calendarGrid");

  if (!yearSelect || !monthSelect || !grid) return;

  yearSelect.value = String(calendarYear);
  monthSelect.value = String(calendarMonth);

  const first = new Date(calendarYear, calendarMonth - 1, 1);
  const startDay = first.getDay();
  const days = new Date(calendarYear, calendarMonth, 0).getDate();
  const today = todayString();

  let html = "";

  for (let i = 0; i < startDay; i++) {
    html += `<button class="day-cell" disabled></button>`;
  }

  for (let day = 1; day <= days; day++) {
    const date = makeDateString(calendarYear, calendarMonth, day);

    const classes = [
      "day-cell",
      date === today ? "today" : "",
      date === currentDate ? "active" : "",
      hasDayData(date) ? "has-data" : ""
    ].filter(Boolean).join(" ");

    html += `<button class="${classes}" data-action="set-date" data-date="${date}">${day}</button>`;
  }

  grid.innerHTML = html;
}

function renderStats() {
  const d = dayData();
  const done = d.tasks.filter(x => x.status === "done").length;
  const doing = d.tasks.filter(x => x.status === "doing").length;
  const todo = d.tasks.filter(x => x.status === "todo").length;
  const p1 = d.tasks.filter(x => x.priority === "P1").length;

  document.getElementById("stats").innerHTML = `
    <div class="stats-grid">
      <div class="stat"><strong>${d.tasks.length}</strong><span>總任務</span></div>
      <div class="stat"><strong>${done}</strong><span>已完成</span></div>
      <div class="stat"><strong>${doing}</strong><span>進行中</span></div>
      <div class="stat"><strong>${todo}</strong><span>待辦</span></div>
      <div class="stat"><strong>${p1}</strong><span>P1</span></div>
      <div class="stat"><strong>${d.tabs.length}</strong><span>關聯 Tabs</span></div>
      <div class="stat"><strong>${d.worklogs.length}</strong><span>Worklog</span></div>
      <div class="stat"><strong>${d.focus.length}</strong><span>今日重點</span></div>
      <div class="stat"><strong>${d.schedules.length}</strong><span>行程</span></div>
    </div>
  `;
}

function renderFocus() {
  const d = dayData();
  const el = document.getElementById("focusList");

  if (!d.focus.length) {
    el.innerHTML = `<div class="empty">尚無今日重點</div>`;
    return;
  }

  el.innerHTML = d.focus.map(x => `
    <div class="item">
      <div class="item-row">
        <div class="item-title">${escapeHtml(x.text)}</div>
        <div class="actions">
          <button data-action="edit-focus" data-id="${x.id}">修改</button>
          <button class="danger" data-action="delete-focus" data-id="${x.id}">刪除</button>
        </div>
      </div>
    </div>
  `).join("");
}

function renderSchedules() {
  const d = dayData();
  const el = document.getElementById("scheduleList");

  if (!d.schedules.length) {
    el.innerHTML = `<div class="empty">尚無今日行程</div>`;
    return;
  }

  el.innerHTML = d.schedules.map(x => `
    <div class="item">
      <div class="item-row">
        <div>
          <div class="item-title">${escapeHtml(x.start || "--:--")} - ${escapeHtml(x.end || "--:--")}｜${escapeHtml(x.title)}</div>
          <div class="meta">
            <span class="tag">${escapeHtml(x.category || "未分類")}</span>
          </div>
        </div>
        <div class="actions">
          <button data-action="edit-schedule" data-id="${x.id}">修改</button>
          <button class="danger" data-action="delete-schedule" data-id="${x.id}">刪除</button>
        </div>
      </div>
    </div>
  `).join("");
}

function renderTasks() {
  const d = dayData();
  const q = document.getElementById("searchInput").value.trim().toLowerCase();
  const status = document.getElementById("statusFilter").value;
  const priority = document.getElementById("priorityFilter").value;

  const tasks = d.tasks.filter(x => {
    if (status && x.status !== status) return false;
    if (priority && x.priority !== priority) return false;

    const hay = [
      x.title,
      x.status,
      x.priority,
      x.category,
      x.url,
      x.note,
      ...(x.tags || [])
    ].join(" ").toLowerCase();

    return !q || hay.includes(q);
  });

  const el = document.getElementById("taskList");

  if (!tasks.length) {
    el.innerHTML = `<div class="empty">沒有符合條件的任務</div>`;
    return;
  }

  el.innerHTML = tasks.map(x => `
    <div class="item">
      <div class="item-row">
        <div>
          <div class="item-title ${x.status === "done" ? "done" : ""}">${escapeHtml(x.title)}</div>
          ${x.url ? `<div class="item-sub"><a class="link" href="${escapeHtml(x.url)}" target="_blank">${escapeHtml(x.url)}</a></div>` : ""}
          ${x.note ? `<div class="item-sub">${escapeHtml(x.note)}</div>` : ""}
          <div class="meta">
            <span class="tag ${x.status}">${statusText(x.status)}</span>
            <span class="tag ${x.priority.toLowerCase()}">${escapeHtml(x.priority)}</span>
            <span class="tag">${escapeHtml(x.category || "未分類")}</span>
            ${(x.tags || []).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join("")}
          </div>
        </div>
        <div class="actions">
          <button data-action="task-todo" data-id="${x.id}">待辦</button>
          <button class="warn" data-action="task-doing" data-id="${x.id}">進行</button>
          <button class="success" data-action="task-done" data-id="${x.id}">完成</button>
          <button data-action="edit-task" data-id="${x.id}">修改</button>
          <button class="danger" data-action="delete-task" data-id="${x.id}">刪除</button>
        </div>
      </div>
    </div>
  `).join("");
}

function statusText(status) {
  if (status === "done") return "已完成";
  if (status === "doing") return "進行中";
  return "待辦";
}

function renderTabs() {
  const d = dayData();
  const el = document.getElementById("tabsList");

  if (!d.tabs.length) {
    el.innerHTML = `<div class="empty">尚未匯入 Tabs HTML</div>`;
    return;
  }

  el.innerHTML = d.tabs.slice(0, 80).map(x => `
    <div class="item">
      <div class="item-row">
        <div>
          <div class="item-title">
            <a class="link" href="${escapeHtml(x.url)}" target="_blank">${escapeHtml(x.title || x.url)}</a>
          </div>
          <div class="item-sub">${escapeHtml(x.url)}</div>
          <div class="meta">
            <span class="tag">${escapeHtml(x.category || "Tabs")}</span>
            <span class="tag ${String(x.priority || "P3").toLowerCase()}">${escapeHtml(x.priority || "P3")}</span>
            <span class="tag">${escapeHtml(x.status || "待看")}</span>
          </div>
        </div>
        <div class="actions">
          <button class="primary" data-action="tab-to-task" data-id="${x.id}">轉任務</button>
          <button class="danger" data-action="delete-tab" data-id="${x.id}">移除</button>
        </div>
      </div>
    </div>
  `).join("");
}

function renderWorklog() {
  const d = dayData();
  const el = document.getElementById("worklogList");

  if (!d.worklogs.length) {
    el.innerHTML = `<div class="empty">尚未匯入 Worklog HTML</div>`;
    return;
  }

  el.innerHTML = d.worklogs.map(x => `
    <div class="item">
      <div class="item-row">
        <div>
          <div class="item-title">${escapeHtml(x.text)}</div>
          <div class="meta">
            <span class="tag">${escapeHtml(x.category || "General")}</span>
            ${x.is_todo ? `<span class="tag p1">TODO</span>` : ""}
            ${x.is_command ? `<span class="tag done">command</span>` : ""}
            ${(x.ips || []).map(ip => `<span class="tag">${escapeHtml(ip)}</span>`).join("")}
          </div>
        </div>
        <div class="actions">
          <button class="primary" data-action="worklog-to-task" data-id="${x.id}">轉任務</button>
          <button class="danger" data-action="delete-worklog" data-id="${x.id}">移除</button>
        </div>
      </div>
    </div>
  `).join("");
}

function renderNotes() {
  const d = dayData();
  document.getElementById("dailyNotes").value = d.notes || "";
}

function render() {
  document.getElementById("dateInput").value = currentDate;

  renderCalendar();
  renderStats();
  renderFocus();
  renderSchedules();
  renderTasks();
  renderTabs();
  renderWorklog();
  renderNotes();
}

document.addEventListener("click", event => {
  const btn = event.target.closest("[data-action]");
  if (!btn) return;

  const action = btn.dataset.action;
  const id = btn.dataset.id;
  const date = btn.dataset.date;

  if (action === "set-date") setDate(date);

  if (action === "edit-task") openModal("task", id);
  if (action === "delete-task") deleteItem("task", id);
  if (action === "task-todo") setTaskStatus(id, "todo");
  if (action === "task-doing") setTaskStatus(id, "doing");
  if (action === "task-done") setTaskStatus(id, "done");

  if (action === "edit-schedule") openModal("schedule", id);
  if (action === "delete-schedule") deleteItem("schedule", id);

  if (action === "edit-focus") openModal("focus", id);
  if (action === "delete-focus") deleteItem("focus", id);

  if (action === "tab-to-task") createTaskFromTab(id);
  if (action === "delete-tab") deleteItem("tab", id);

  if (action === "worklog-to-task") createTaskFromWorklog(id);
  if (action === "delete-worklog") deleteItem("worklog", id);
});

document.getElementById("prevDayBtn").addEventListener("click", () => shiftDate(-1));
document.getElementById("nextDayBtn").addEventListener("click", () => shiftDate(1));
document.getElementById("todayBtn").addEventListener("click", () => setDate(todayString()));
document.getElementById("dateInput").addEventListener("change", e => setDate(e.target.value));

document.getElementById("prevMonthBtn").addEventListener("click", () => shiftMonth(-1));
document.getElementById("nextMonthBtn").addEventListener("click", () => shiftMonth(1));
document.getElementById("prevYearBtn").addEventListener("click", () => shiftYear(-1));
document.getElementById("nextYearBtn").addEventListener("click", () => shiftYear(1));

document.getElementById("yearSelect").addEventListener("change", e => {
  calendarYear = Number(e.target.value);
  renderCalendarOnly();
});

document.getElementById("monthSelect").addEventListener("change", e => {
  calendarMonth = Number(e.target.value);
  renderCalendarOnly();
});

document.getElementById("addFocusBtn").addEventListener("click", () => openModal("focus"));
document.getElementById("addTaskBtn").addEventListener("click", () => openModal("task"));
document.getElementById("addScheduleBtn").addEventListener("click", () => openModal("schedule"));

document.getElementById("cancelModalBtn").addEventListener("click", closeModal);
document.getElementById("saveModalBtn").addEventListener("click", saveModal);

document.getElementById("searchInput").addEventListener("input", renderTasks);
document.getElementById("statusFilter").addEventListener("change", renderTasks);
document.getElementById("priorityFilter").addEventListener("change", renderTasks);

document.getElementById("dailyNotes").addEventListener("input", e => {
  dayData().notes = e.target.value;
  savePlanner();
  renderCalendarOnly();
});

document.getElementById("exportBtn").addEventListener("click", exportPlannerHtml);
document.getElementById("backupJsonBtn").addEventListener("click", exportJson);

document.getElementById("importJsonInput").addEventListener("change", e => {
  if (e.target.files[0]) importJson(e.target.files[0]);
});

document.getElementById("clearDayBtn").addEventListener("click", clearDay);

document.getElementById("importTabsBtn").addEventListener("click", () => {
  document.getElementById("tabsHtmlInput").click();
});

document.getElementById("tabsHtmlInput").addEventListener("change", e => {
  if (e.target.files[0]) importTabsHtml(e.target.files[0]);
});

document.getElementById("importWorklogBtn").addEventListener("click", () => {
  document.getElementById("worklogHtmlInput").click();
});

document.getElementById("worklogHtmlInput").addEventListener("change", e => {
  if (e.target.files[0]) importWorklogHtml(e.target.files[0]);
});

render();