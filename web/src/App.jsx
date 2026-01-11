import React, { useEffect, useState } from "react";
import { apiDelete, apiGet, apiPatch, apiPost } from "./api.js";
import Login from "./components/Login.jsx";
import TaskTree from "./components/TaskTree.jsx";
import Wiki from "./components/Wiki.jsx";

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
    <div style={styles.page}>
      <div style={styles.header}>
        <div style={styles.brand}>Задачи</div>
        <div style={styles.tabs}>
          <button
            style={{ ...styles.tab, ...(tab === "tasks" ? styles.tabActive : {}) }}
            onClick={() => setTab("tasks")}
          >
            Список
          </button>
          <button
            style={{ ...styles.tab, ...(tab === "wiki" ? styles.tabActive : {}) }}
            onClick={() => setTab("wiki")}
          >
            Wiki
          </button>
        </div>
        <button style={styles.logout} onClick={logout}>Выйти</button>
      </div>

      {tab === "tasks" ? (
        <>
          <form onSubmit={addRoot} style={styles.addRow}>
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Новая задача…"
              style={styles.input}
            />
            <button style={styles.addBtn} type="submit">Добавить</button>
          </form>

          <div style={styles.panel}>
            <TaskTree
              tree={tree}
              onToggleDone={onToggleDone}
              onRename={onRename}
              onAddChild={onAddChild}
              onDelete={onDelete}
            />
          </div>

          <div style={styles.footer}>
            Подсказка: двойной клик по задаче — переименование.
          </div>
        </>
      ) : (
        <Wiki />
      )}
    </div>
  );
}

const styles = {
  page: {
    maxWidth: 860,
    margin: "0 auto",
    padding: 16,
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial"
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12
  },
  brand: { fontSize: 20, fontWeight: 600 },
  tabs: { display: "flex", gap: 8 },
  tab: {
    border: "1px solid #ddd",
    background: "white",
    borderRadius: 999,
    padding: "6px 12px",
    cursor: "pointer"
  },
  tabActive: {
    borderColor: "#111",
    background: "#111",
    color: "white"
  },
  logout: {
    border: "1px solid #e5e5e5",
    background: "white",
    borderRadius: 10,
    padding: "8px 10px",
    cursor: "pointer"
  },
  addRow: { display: "flex", gap: 10, marginBottom: 12 },
  input: {
    flex: 1,
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #ddd",
    outline: "none"
  },
  addBtn: {
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #111",
    background: "#111",
    color: "white",
    cursor: "pointer"
  },
  panel: {
    border: "1px solid #e5e5e5",
    borderRadius: 12,
    padding: 8,
    minHeight: 240
  },
  footer: { marginTop: 10, color: "#666", fontSize: 12 }
};
