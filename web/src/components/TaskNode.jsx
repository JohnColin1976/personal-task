import React, { useState } from "react";

export default function TaskNode({
  node,
  level,
  onToggleDone,
  onRename,
  onAddChild,
  onDelete
}) {
  const [open, setOpen] = useState(true);
  const [edit, setEdit] = useState(false);
  const [title, setTitle] = useState(node.title);

  const hasKids = node.children?.length > 0;

  return (
    <div style={{ marginLeft: level * 14, padding: "4px 0" }}>
      <div style={styles.row}>
        <button
          style={styles.disclosure}
          onClick={() => setOpen(!open)}
          disabled={!hasKids}
          title={hasKids ? (open ? "Свернуть" : "Развернуть") : ""}
        >
          {hasKids ? (open ? "▾" : "▸") : " "}
        </button>

        <input
          type="checkbox"
          checked={!!node.done}
          onChange={(e) => onToggleDone(node.id, e.target.checked)}
        />

        {edit ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onRename(node.id, title);
              setEdit(false);
            }}
            style={{ flex: 1 }}
          >
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={styles.edit}
              autoFocus
              onBlur={() => { onRename(node.id, title); setEdit(false); }}
            />
          </form>
        ) : (
          <div
            style={{
              ...styles.title,
              textDecoration: node.done ? "line-through" : "none",
              color: node.done ? "#777" : "#111"
            }}
            onDoubleClick={() => setEdit(true)}
            title="Двойной клик — переименовать"
          >
            {node.title}
          </div>
        )}

        <button style={styles.iconBtn} onClick={() => onAddChild(node.id)} title="Добавить подзадачу">＋</button>
        <button style={styles.iconBtn} onClick={() => onDelete(node.id)} title="Удалить (поддерево)">✕</button>
      </div>

      {open && hasKids ? (
        <div>
          {node.children.map((c) => (
            <TaskNode
              key={c.id}
              node={c}
              level={level + 1}
              onToggleDone={onToggleDone}
              onRename={onRename}
              onAddChild={onAddChild}
              onDelete={onDelete}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

const styles = {
  row: { display: "flex", alignItems: "center", gap: 8 },
  disclosure: {
    width: 22,
    height: 22,
    border: "none",
    background: "transparent",
    cursor: "pointer",
    color: "#111"
  },
  title: {
    flex: 1,
    padding: "6px 8px",
    borderRadius: 10,
    cursor: "default"
  },
  edit: {
    width: "100%",
    padding: "6px 8px",
    borderRadius: 10,
    border: "1px solid #ddd",
    outline: "none"
  },
  iconBtn: {
    width: 28,
    height: 28,
    borderRadius: 10,
    border: "1px solid #e5e5e5",
    background: "white",
    cursor: "pointer"
  }
};
