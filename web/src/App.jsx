import React, { useEffect, useState } from "react";
import { apiDelete, apiGet, apiPatch, apiPost } from "./api.js";
import Login from "./components/Login.jsx";
import TaskTree from "./components/TaskTree.jsx";
import Wiki from "./components/Wiki.jsx";
import "./App.css";

export default function App() {
  const [auth, setAuth] = useState(null); // null | true | false
  const [tree, setTree] = useState([]);
  const [newTitle, setNewTitle] = useState("");
  const [tab, setTab] = useState("tasks");

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
    await apiPost("/api/tasks", { title, parent_id: null });
    setNewTitle("");
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

  async function logout() {
    await apiPost("/api/logout", {});
    setAuth(false);
  }

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
            className={`tab ${tab === "wiki" ? "tabActive" : ""}`}
            onClick={() => setTab("wiki")}
          >
            Wiki
          </button>
        </div>
        <button className="logout" onClick={logout}>Выйти</button>
      </div>

      {tab === "tasks" ? (
        <>
          <form onSubmit={addRoot} className="addRow">
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Новая задача…"
              className="input"
            />
            <button className="addBtn" type="submit">Добавить</button>
          </form>

          <div className="panel">
            <TaskTree
              tree={tree}
              onToggleDone={onToggleDone}
              onRename={onRename}
              onAddChild={onAddChild}
              onDelete={onDelete}
            />
          </div>

          <div className="footer">
            Подсказка: двойной клик по задаче — переименование.
          </div>
        </>
      ) : (
        <Wiki />
      )}
    </div>
  );
}
