import React, { useEffect, useState } from "react";
import { apiDelete, apiGet, apiPatch, apiPost } from "./api.js";
import Login from "./components/Login.jsx";
import TaskTree from "./components/TaskTree.jsx";
import TaskCards from "./components/TaskCards.jsx";
import Wiki from "./components/Wiki.jsx";
import Calendar from "./components/Calendar.jsx";
import "./App.css";

export default function App() {
  const [auth, setAuth] = useState(null); // null | true | false
  const [tree, setTree] = useState([]);
  const [newTitle, setNewTitle] = useState("");
  const [newAssignee, setNewAssignee] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const [tab, setTab] = useState("tasks");
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [showCards, setShowCards] = useState(true);

  const isOperationalTree = (node) => {
    const firstWord = (node?.title || "").trim().split(/\s+/)[0] || "";
    return firstWord === "ОПЕРАТИВНЫЕ";
  };

  const visibleTree = tree.filter((node) => {
    if (tab === "operational") return isOperationalTree(node);
    if (tab === "tasks") return !isOperationalTree(node);
    return true;
  });

  const findRootForTask = (nodes, id) => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children?.length) {
        const found = findRootForTask(node.children, id);
        if (found) return node;
      }
    }
    return null;
  };

  async function refresh() {
    const res = await apiGet("/api/tasks");
    if (res?.tree) setTree(res.tree);
  }

  async function checkAuth() {
    const me = await apiGet("/api/me");
    setAuth(!!me?.authenticated);
    if (me?.authenticated) await refresh();
  }

  useEffect(() => { checkAuth(); }, []);

  if (auth === null) return <div style={{ padding: 16 }}>Loading…</div>;
  if (!auth) return <Login onSuccess={() => { setAuth(true); refresh(); }} />;

  async function addRoot(e) {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) return;
    await apiPost("/api/tasks", {
      title,
      parent_id: null,
      assignee: newAssignee.trim() || null,
      deadline: newDeadline || null
    });
    setNewTitle("");
    setNewAssignee("");
    setNewDeadline("");
    await refresh();
  }

  async function onAddChild(parentId) {
    const title = prompt("Подзадача:");
    if (!title?.trim()) return;
    await apiPost("/api/tasks", { title: title.trim(), parent_id: parentId });
    await refresh();
  }

  async function onToggleDone(id, done) {
    await apiPatch(`/api/tasks/${id}`, { done });
    await refresh();
  }

  async function onRename(id, title) {
    const t = (title ?? "").trim();
    if (!t) return;
    await apiPatch(`/api/tasks/${id}`, { title: t });
    await refresh();
  }

  async function onDelete(id) {
    if (!confirm("Удалить задачу и все подзадачи?")) return;
    await apiDelete(`/api/tasks/${id}`);
    await refresh();
  }

  async function onUpdateMeta(id, updates) {
    await apiPatch(`/api/tasks/${id}`, updates);
    await refresh();
  }

  const handleSelectTask = (id) => {
    const root = findRootForTask(tree, id);
    if (root && isOperationalTree(root)) {
      setTab("operational");
    } else {
      setTab("tasks");
    }
    setSelectedTaskId(id);
  };

  function openGantt(node) {
    if (!node) return;
    const tasks = [];
    const toDate = (value) => {
      if (!value) return null;
      if (typeof value === "number") return new Date(value);
      if (typeof value === "string") return new Date(`${value}T00:00:00`);
      return null;
    };

    const walk = (current, depth = 0) => {
      const startDate = toDate(current.created_at) ?? new Date();
      const endDate = toDate(current.deadline) ?? startDate;
      const start = startDate.getTime();
      const end = Math.max(endDate.getTime(), start);
      tasks.push({
        id: current.id,
        title: current.title,
        assignee: current.assignee ?? "",
        depth,
        start,
        end
      });
      (current.children || []).forEach((child) => walk(child, depth + 1));
    };

    walk(node);

    const minStart = Math.min(...tasks.map((t) => t.start));
    let maxEnd = Math.max(...tasks.map((t) => t.end));
    if (minStart === maxEnd) maxEnd = minStart + 24 * 60 * 60 * 1000;

    const dayMs = 24 * 60 * 60 * 1000;
    const rangeDays = Math.max(1, Math.ceil((maxEnd - minStart) / dayMs));

    const formatDate = (ts) => new Date(ts).toLocaleDateString("ru-RU");

    const ganttWindow = window.open("", "_blank");
    if (!ganttWindow || !ganttWindow.document) return;

    const rowsHtml = tasks
      .map((task) => {
        const offsetDays = Math.floor((task.start - minStart) / dayMs);
        const durationDays = Math.max(1, Math.ceil((task.end - task.start) / dayMs) || 1);
        const left = (offsetDays / rangeDays) * 100;
        const width = (durationDays / rangeDays) * 100;
        const label = `${formatDate(task.start)} — ${formatDate(task.end)}`;
        const assigneeLabel = task.assignee ? ` • ${task.assignee}` : "";
        return `
          <div class="gantt-row">
            <div class="gantt-title" style="padding-left:${task.depth * 16}px">
              ${task.title}${assigneeLabel}
              <div class="gantt-dates">${label}</div>
            </div>
            <div class="gantt-track">
              <div class="gantt-bar" style="left:${left}%;width:${width}%"></div>
            </div>
          </div>
        `;
      })
      .join("");

    ganttWindow.document.open();
    ganttWindow.document.write(`
      <!DOCTYPE html>
      <html lang="ru">
        <head>
          <meta charset="utf-8" />
          <title>Диаграмма Ганта — ${node.title}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; margin: 24px; color: #111; }
            h1 { font-size: 20px; margin-bottom: 16px; }
            .gantt-header { display: flex; font-size: 12px; color: #666; margin-bottom: 8px; }
            .gantt-header .gantt-title { flex: 0 0 280px; }
            .gantt-header .gantt-track { flex: 1; }
            .gantt-row { display: flex; align-items: center; margin-bottom: 10px; }
            .gantt-title { flex: 0 0 280px; font-size: 13px; line-height: 1.2; }
            .gantt-dates { font-size: 11px; color: #888; margin-top: 4px; }
            .gantt-track { position: relative; flex: 1; height: 16px; background: #f3f3f3; border-radius: 8px; }
            .gantt-bar { position: absolute; top: 0; height: 100%; background: #4f7cff; border-radius: 8px; }
          </style>
        </head>
        <body>
          <h1>${node.title}</h1>
          <div class="gantt-header">
            <div class="gantt-title">Задачи</div>
            <div class="gantt-track">${formatDate(minStart)} — ${formatDate(maxEnd)}</div>
          </div>
          ${rowsHtml || "<div>Нет данных для диаграммы.</div>"}
        </body>
      </html>
    `);
    ganttWindow.document.close();
  }

  async function logout() {
    await apiPost("/api/logout", {});
    setAuth(false);
  }

  const isTaskTab = tab === "tasks" || tab === "operational";
  const isWikiTab = tab === "wiki";
  const isCalendarTab = tab === "calendar";

  return (
    <div className="page">
      <div className="header">
        <div className="brand">Задачи</div>
        <div className="tabs">
          <button
            className={`tab ${tab === "tasks" ? "tabActive" : ""}`}
            onClick={() => setTab("tasks")}
          >
            Список
          </button>
          <button
            className={`tab ${tab === "operational" ? "tabActive" : ""}`}
            onClick={() => setTab("operational")}
          >
            ОПЕРАТИВНЫЕ
          </button>
          <button
            className={`tab ${tab === "wiki" ? "tabActive" : ""}`}
            onClick={() => setTab("wiki")}
          >
            Wiki
          </button>
          <button
            className={`tab ${tab === "calendar" ? "tabActive" : ""}`}
            onClick={() => setTab("calendar")}
          >
            Календарь
          </button>
        </div>
        <button className="logout" onClick={logout}>Выйти</button>
      </div>

      {isTaskTab ? (
        <>
          <form onSubmit={addRoot} className="addRow">
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Новая задача…"
              className="input"
            />
            <input
              value={newAssignee}
              onChange={(e) => setNewAssignee(e.target.value)}
              placeholder="Исполнитель"
              className="input inputSmall"
            />
            <input
              type="date"
              value={newDeadline}
              onChange={(e) => setNewDeadline(e.target.value)}
              className="input inputSmall"
            />
            <button className="addBtn" type="submit">Добавить</button>
          </form>

          <div className="panel">
            <TaskTree
              tree={visibleTree}
              onToggleDone={onToggleDone}
              onRename={onRename}
              onAddChild={onAddChild}
              onDelete={onDelete}
              onUpdateMeta={onUpdateMeta}
              onOpenGantt={openGantt}
              showCards={showCards}
              onToggleCards={() => setShowCards((prev) => !prev)}
            />
          </div>

          {showCards ? (
            <div className="panel taskCardsPanel">
              <div className="taskCardsHeader">
                Карточки задач
                <span className="taskCardsHint">Нажмите на событие в календаре, чтобы открыть карточку.</span>
              </div>
              <TaskCards
                tree={visibleTree}
                selectedTaskId={selectedTaskId}
                onUpdateMeta={onUpdateMeta}
              />
            </div>
          ) : null}

          <div className="footer">
            Подсказка: двойной клик по задаче — переименование.
          </div>
        </>
      ) : isWikiTab ? (
        <Wiki />
      ) : isCalendarTab ? (
        <Calendar tree={tree} onSelectTask={handleSelectTask} />
      ) : (
        <div className="panel">Выберите раздел в меню.</div>
      )}
    </div>
  );
}
