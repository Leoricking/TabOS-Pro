from __future__ import annotations

import html
import json
from pathlib import Path
from typing import Any


def build_worklog_html(items: list[dict[str, Any]], title: str = "TabOS Worklog Manager") -> str:
    safe_json = json.dumps(items, ensure_ascii=False).replace("</script", "<\\/script")

    return f"""<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>{html.escape(title)}</title>

<style>
* {{
  box-sizing: border-box;
}}

body {{
  margin: 0;
  background: #0f1115;
  color: #e8e8e8;
  font-family: Arial, "Microsoft JhengHei", sans-serif;
}}

.wrap {{
  max-width: 1280px;
  margin: 0 auto;
  padding: 24px;
}}

h1 {{
  margin: 0 0 8px;
  font-size: 38px;
  font-weight: 900;
}}

.sub {{
  color: #a9b1bd;
  margin-bottom: 22px;
  line-height: 1.7;
  font-size: 15px;
}}

.toolbar {{
  display: grid;
  gap: 12px;
  margin-bottom: 20px;
}}

.row {{
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  background: #171a21;
  border: 1px solid #252b36;
  border-radius: 16px;
  padding: 14px;
  align-items: center;
}}

input,
select,
textarea {{
  background: #0f1115;
  color: white;
  border: 1px solid #353d4c;
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 14px;
}}

#search {{
  flex: 1;
  min-width: 320px;
}}

button {{
  border: none;
  border-radius: 10px;
  padding: 11px 16px;
  cursor: pointer;
  background: #2b3342;
  color: white;
  font-weight: 800;
  font-size: 14px;
}}

button:hover {{
  opacity: 0.92;
}}

.primary {{ background: #4c7dff; }}
.success {{ background: #2f9d62; }}
.warn {{ background: #c78a21; }}
.danger {{ background: #d84d4d; }}

.stats {{
  color: #b7c0cd;
  font-size: 15px;
  line-height: 1.8;
}}

.stats strong {{
  color: #d7e7ff;
}}

.card {{
  background: #171a21;
  border: 1px solid #252b36;
  border-radius: 18px;
  padding: 18px;
  margin-bottom: 18px;
}}

.date-title {{
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  margin-bottom: 14px;
}}

.date-title h2 {{
  color: #ffb86c;
  margin: 0;
  font-size: 26px;
  font-weight: 900;
}}

.item {{
  display: grid;
  grid-template-columns: minmax(360px, 1fr) auto;
  gap: 12px;
  align-items: center;
  background: #101319;
  border: 1px solid #212736;
  border-radius: 14px;
  padding: 14px;
  margin-bottom: 10px;
  line-height: 1.6;
}}

.item.command {{
  background: #070a0f;
}}

.text {{
  word-break: break-word;
  white-space: pre-wrap;
}}

.command .text {{
  font-family: Consolas, "Courier New", monospace;
  color: #d7ffb8;
}}

.meta {{
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}}

.tag {{
  display: inline-flex;
  padding: 4px 9px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
  background: #2a3a58;
  color: #9fc2ff;
}}

.tag.todo {{ background: #6b1f1f; color: #ffd0d0; }}
.tag.ip {{ background: #5b461f; color: #ffe4a3; }}
.tag.cmd {{ background: #294534; color: #9ae6b1; }}
.tag.edited {{ background: #4b2f63; color: #e9d5ff; }}

.hl-ip {{
  color: #ffe4a3;
  font-weight: 900;
}}

.actions {{
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}}

.actions button {{
  min-width: 72px;
}}

.empty {{
  padding: 48px;
  text-align: center;
  border-radius: 16px;
  border: 1px dashed #394153;
  color: #98a4b6;
}}

.modal-mask {{
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.65);
  display: none;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}}

.modal {{
  width: min(900px, 92vw);
  background: #171a21;
  border: 1px solid #394153;
  border-radius: 18px;
  padding: 18px;
  box-shadow: 0 20px 80px rgba(0,0,0,.4);
}}

.modal h2 {{
  margin: 0 0 14px;
}}

.modal textarea {{
  width: 100%;
  min-height: 160px;
  resize: vertical;
  line-height: 1.6;
}}

.modal-grid {{
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 12px;
}}

.modal-actions {{
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 14px;
}}

@media (max-width: 900px) {{
  .item {{
    grid-template-columns: 1fr;
  }}

  .actions {{
    flex-wrap: wrap;
    justify-content: flex-start;
    white-space: normal;
  }}

  .modal-grid {{
    grid-template-columns: 1fr;
  }}
}}
</style>
</head>

<body>
<div class="wrap">
  <h1>{html.escape(title)}</h1>
  <div class="sub">
    工作日誌 / 指令庫轉成可搜尋、可分類、可閱讀、可修改的知識庫。
  </div>

  <div class="toolbar">
    <div class="row">
      <input id="search" placeholder="搜尋日期、內容、IP、分類、指令..." />

      <select id="category">
        <option value="">全部分類</option>
      </select>

      <select id="dateSort">
        <option value="desc">日期：新到舊</option>
        <option value="asc">日期：舊到新</option>
      </select>

      <label>
        <input type="checkbox" id="cmdOnly" />
        只看指令
      </label>

      <label>
        <input type="checkbox" id="todoOnly" />
        只看 TODO
      </label>

      <button id="expandAll">展開全部</button>
      <button id="collapseAll">收合全部</button>
      <button id="exportBtn" class="success">匯出修改後 HTML</button>
      <button id="resetBtn" class="danger">還原原始資料</button>
    </div>

    <div class="row stats" id="stats"></div>
  </div>

  <div id="app"></div>
</div>

<div class="modal-mask" id="editModal">
  <div class="modal">
    <h2>修改工作日誌</h2>

    <textarea id="editText"></textarea>

    <div class="modal-grid">
      <div>
        <label>日期</label>
        <input id="editDate" style="width:100%;" />
      </div>

      <div>
        <label>分類</label>
        <input id="editCategory" style="width:100%;" />
      </div>

      <div>
        <label>
          <input type="checkbox" id="editCommand" />
          指令
        </label>
      </div>

      <div>
        <label>
          <input type="checkbox" id="editTodo" />
          TODO
        </label>
      </div>
    </div>

    <div class="modal-actions">
      <button id="cancelEdit">取消</button>
      <button id="saveEdit" class="success">儲存修改</button>
    </div>
  </div>
</div>

<script>
const STORAGE_KEY = "tabos_worklog_data_v2";
const COLLAPSE_KEY = "tabos_worklog_collapse_v2";
const INITIAL_DATA = {safe_json};

let data = [];
let collapsed = {{}};
let editingId = null;

function makeId() {{
  return "log_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}}

function ensureIds(items) {{
  return items.map(item => ({{
    id: item.id || makeId(),
    date: item.date || "未分類日期",
    text: item.text || "",
    category: item.category || "General",
    ips: Array.isArray(item.ips) ? item.ips : [],
    is_command: !!item.is_command,
    is_todo: !!item.is_todo,
    edited: !!item.edited
  }}));
}}

function save() {{
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  localStorage.setItem(COLLAPSE_KEY, JSON.stringify(collapsed));
}}

function load() {{
  const raw = localStorage.getItem(STORAGE_KEY);
  const rawCollapse = localStorage.getItem(COLLAPSE_KEY);

  data = raw ? ensureIds(JSON.parse(raw)) : ensureIds(INITIAL_DATA);
  collapsed = rawCollapse ? JSON.parse(rawCollapse) : {{}};
}}

function esc(str) {{
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}}

function extractIps(text) {{
  const matches = String(text || "").match(/\\b(?:\\d{{1,3}}\\.){{3}}\\d{{1,3}}\\b/g);
  return matches || [];
}}

function highlightIps(text, ips) {{
  let out = esc(text);
  for (const ip of ips || []) {{
    out = out.replaceAll(ip, '<span class="hl-ip">' + esc(ip) + '</span>');
  }}
  return out;
}}

function normalizeDateForSort(date) {{
  const d = String(date || "").replaceAll("-", "/");
  const parts = d.split("/").map(x => x.padStart(2, "0"));

  if (parts.length === 3) return parts[0].padStart(4, "0") + parts[1] + parts[2];
  if (parts.length === 2) return parts[0].padStart(4, "0") + parts[1] + "00";

  return d;
}}

function getFilteredData() {{
  const q = document.getElementById("search").value.trim().toLowerCase();
  const category = document.getElementById("category").value;
  const cmdOnly = document.getElementById("cmdOnly").checked;
  const todoOnly = document.getElementById("todoOnly").checked;

  return data.filter(item => {{
    if (category && item.category !== category) return false;
    if (cmdOnly && !item.is_command) return false;
    if (todoOnly && !item.is_todo) return false;

    const hay = [
      item.date,
      item.text,
      item.category,
      ...(item.ips || [])
    ].join(" ").toLowerCase();

    return !q || hay.includes(q);
  }});
}}

function groupByDate(items) {{
  const map = new Map();

  for (const item of items) {{
    const date = item.date || "未分類日期";
    if (!map.has(date)) map.set(date, []);
    map.get(date).push(item);
  }}

  const groups = Array.from(map.entries()).map(([date, rows]) => ({{
    date,
    rows
  }}));

  const sortMode = document.getElementById("dateSort").value;

  groups.sort((a, b) => {{
    const av = normalizeDateForSort(a.date);
    const bv = normalizeDateForSort(b.date);

    if (sortMode === "asc") return av.localeCompare(bv);
    return bv.localeCompare(av);
  }});

  return groups;
}}

function initCategory() {{
  const select = document.getElementById("category");
  const current = select.value;
  const cats = Array.from(new Set(data.map(x => x.category || "General"))).sort();

  select.innerHTML =
    '<option value="">全部分類</option>' +
    cats.map(c => '<option value="' + esc(c) + '">' + esc(c) + '</option>').join("");

  select.value = current;
}}

function updateStats(filtered) {{
  const total = data.length;
  const visible = filtered.length;
  const cmds = filtered.filter(x => x.is_command).length;
  const todos = filtered.filter(x => x.is_todo).length;
  const ips = new Set(filtered.flatMap(x => x.ips || [])).size;
  const edited = filtered.filter(x => x.edited).length;

  document.getElementById("stats").innerHTML =
    '<div>全部筆數：<strong>' + total + '</strong></div>' +
    '<div>目前顯示：<strong>' + visible + '</strong></div>' +
    '<div>指令：<strong>' + cmds + '</strong></div>' +
    '<div>TODO：<strong>' + todos + '</strong></div>' +
    '<div>IP：<strong>' + ips + '</strong></div>' +
    '<div>已修改：<strong>' + edited + '</strong></div>';
}}

function openEdit(id) {{
  const item = data.find(x => x.id === id);
  if (!item) return;

  editingId = id;

  document.getElementById("editText").value = item.text || "";
  document.getElementById("editDate").value = item.date || "";
  document.getElementById("editCategory").value = item.category || "General";
  document.getElementById("editCommand").checked = !!item.is_command;
  document.getElementById("editTodo").checked = !!item.is_todo;

  document.getElementById("editModal").style.display = "flex";
}}

function closeEdit() {{
  editingId = null;
  document.getElementById("editModal").style.display = "none";
}}

function saveEdit() {{
  const item = data.find(x => x.id === editingId);
  if (!item) return;

  item.text = document.getElementById("editText").value.trim();
  item.date = document.getElementById("editDate").value.trim() || "未分類日期";
  item.category = document.getElementById("editCategory").value.trim() || "General";
  item.is_command = document.getElementById("editCommand").checked;
  item.is_todo = document.getElementById("editTodo").checked;
  item.ips = extractIps(item.text);
  item.edited = true;

  save();
  closeEdit();
  render();
}}

function removeItem(id) {{
  data = data.filter(x => x.id !== id);
  save();
  render();
}}

function toggleCommand(id) {{
  const item = data.find(x => x.id === id);
  if (!item) return;
  item.is_command = !item.is_command;
  item.edited = true;
  save();
  render();
}}

function toggleTodo(id) {{
  const item = data.find(x => x.id === id);
  if (!item) return;
  item.is_todo = !item.is_todo;
  item.edited = true;
  save();
  render();
}}

function resetData() {{
  if (!confirm("確定要還原原始資料？目前修改會消失。")) return;

  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(COLLAPSE_KEY);

  load();
  render();
}}

function exportHtml() {{
  save();

  const html = document.documentElement.outerHTML;
  const blob = new Blob([html], {{ type: "text/html;charset=utf-8" }});
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  const now = new Date();
  const pad = n => String(n).padStart(2, "0");

  a.href = url;
  a.download =
    "tabos_worklog_export_" +
    now.getFullYear() + "-" + pad(now.getMonth() + 1) + "-" + pad(now.getDate()) + "_" +
    pad(now.getHours()) + "-" + pad(now.getMinutes()) + "-" + pad(now.getSeconds()) +
    ".html";

  a.click();
  URL.revokeObjectURL(url);
}}

function render() {{
  initCategory();

  const filtered = getFilteredData();
  updateStats(filtered);

  const groups = groupByDate(filtered);
  const app = document.getElementById("app");

  if (!groups.length) {{
    app.innerHTML = '<div class="empty">沒有符合條件的工作日誌。</div>';
    return;
  }}

  app.innerHTML = groups.map(group => {{
    const isCollapsed = !!collapsed[group.date];

    return '<div class="card">' +
      '<div class="date-title">' +
        '<h2>' + esc(group.date) + '</h2>' +
        '<button onclick="collapsed[\\'' + esc(group.date) + '\\']=!collapsed[\\'' + esc(group.date) + '\\']; save(); render();">' +
          (isCollapsed ? "展開" : "收合") +
        '</button>' +
      '</div>' +

      (isCollapsed ? "" : group.rows.map(item => {{
        const classes = "item" + (item.is_command ? " command" : "");
        const ipTags = (item.ips || []).map(ip => '<span class="tag ip">' + esc(ip) + '</span>').join("");

        return '<div class="' + classes + '">' +
          '<div>' +
            '<div class="text">' + highlightIps(item.text, item.ips) + '</div>' +
            '<div class="meta">' +
              '<span class="tag">' + esc(item.category) + '</span>' +
              (item.is_command ? '<span class="tag cmd">command</span>' : '') +
              (item.is_todo ? '<span class="tag todo">TODO</span>' : '') +
              (item.edited ? '<span class="tag edited">edited</span>' : '') +
              ipTags +
            '</div>' +
          '</div>' +

          '<div class="actions">' +
            '<button onclick="openEdit(\\'' + item.id + '\\')" class="primary">修改</button>' +
            '<button onclick="toggleCommand(\\'' + item.id + '\\')">指令</button>' +
            '<button onclick="toggleTodo(\\'' + item.id + '\\')" class="warn">TODO</button>' +
            '<button onclick="removeItem(\\'' + item.id + '\\')" class="danger">移除</button>' +
          '</div>' +
        '</div>';
      }}).join("")) +
    '</div>';
  }}).join("");
}}

document.getElementById("search").addEventListener("input", render);
document.getElementById("category").addEventListener("change", render);
document.getElementById("dateSort").addEventListener("change", render);
document.getElementById("cmdOnly").addEventListener("change", render);
document.getElementById("todoOnly").addEventListener("change", render);

document.getElementById("expandAll").addEventListener("click", () => {{
  collapsed = {{}};
  save();
  render();
}});

document.getElementById("collapseAll").addEventListener("click", () => {{
  for (const item of data) {{
    collapsed[item.date || "未分類日期"] = true;
  }}
  save();
  render();
}});

document.getElementById("exportBtn").addEventListener("click", exportHtml);
document.getElementById("resetBtn").addEventListener("click", resetData);
document.getElementById("cancelEdit").addEventListener("click", closeEdit);
document.getElementById("saveEdit").addEventListener("click", saveEdit);

load();
render();
</script>
</body>
</html>
"""


def write_html(items: list[dict[str, Any]], output_path: str | Path) -> None:
    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(build_worklog_html(items), encoding="utf-8")