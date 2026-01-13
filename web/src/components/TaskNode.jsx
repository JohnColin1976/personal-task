import React, { useEffect, useRef, useState } from "react";

export default function TaskNode({
  node,
  level,
  openById,
  showMeta,
  onToggleMeta,
  cardVisibility,
  onToggleCard,
  onToggleOpen,
  onToggleDone,
  onRename,
  onAddChild,
  onDelete,
  onUpdateMeta,
  onOpenGantt
}) {
  const [edit, setEdit] = useState(false);
  const [title, setTitle] = useState(node.title);
  const [assignee, setAssignee] = useState(node.assignee ?? "");
  const [deadline, setDeadline] = useState(node.deadline ?? "");
  const [assigneeStatus, setAssigneeStatus] = useState("idle");
  const [deadlineStatus, setDeadlineStatus] = useState("idle");
  const assigneeDirtyRef = useRef(false);
  const deadlineDirtyRef = useRef(false);

  const hasKids = node.children?.length > 0;
  const storedOpen = openById?.[node.id];
  const open = typeof storedOpen === "boolean" ? storedOpen : true;
  const isCardVisible = !!cardVisibility?.[node.id];

  useEffect(() => {
    setAssignee(node.assignee ?? "");
    setAssigneeStatus(assigneeDirtyRef.current ? "saved" : "idle");
    assigneeDirtyRef.current = false;
  }, [node.assignee]);

  useEffect(() => {
    setDeadline(node.deadline ?? "");
    setDeadlineStatus(deadlineDirtyRef.current ? "saved" : "idle");
    deadlineDirtyRef.current = false;
  }, [node.deadline]);

  const commitAssignee = async () => {
    if (!onUpdateMeta) return;
    const normalized = assignee.trim();
    const current = (node.assignee ?? "");
    if (normalized === current) {
      setAssigneeStatus("idle");
      assigneeDirtyRef.current = false;
      return;
    }
    setAssigneeStatus("saving");
    await onUpdateMeta(node.id, { assignee: normalized || null });
  };

  const commitDeadline = async () => {
    if (!onUpdateMeta) return;
    const normalized = deadline.trim();
    const current = (node.deadline ?? "");
    if (normalized === current) {
      setDeadlineStatus("idle");
      deadlineDirtyRef.current = false;
      return;
    }
    setDeadlineStatus("saving");
    await onUpdateMeta(node.id, { deadline: normalized || null });
  };

  const saveButtonStyle = (status) => ({
    ...styles.metaSaveButton,
    background:
      status === "dirty" ? "#ffd65c" : status === "saved" ? "#b7f7b0" : "white",
    cursor: status === "dirty" ? "pointer" : "not-allowed",
    opacity: status === "dirty" ? 1 : 0.7
  });

  const saveButtonLabel = (status) => {
    if (status === "dirty") return "!";
    if (status === "saved") return "✓";
    return "";
  };

  const statusCard = (
    <div style={styles.statusCard}>
      <span>Состояние</span>
      <span
        style={{
          ...styles.statusBadge,
          ...(node.done ? styles.statusBadgeDone : {})
        }}
      >
        {node.done ? "Готово" : "В работе"}
      </span>
    </div>
  );

  return (
    <div
      id={`task-node-${node.id}`}
      style={{ marginLeft: level * 14, padding: "4px 0" }}
    >
      <div style={styles.row}>
        <button
          style={styles.disclosure}
          onClick={() => onToggleOpen?.(node.id, !open)}
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

        {level === 0 ? (
          <button
            style={styles.ganttBtn}
            onClick={() => onOpenGantt?.(node)}
            title="Открыть диаграмму Ганта"
          >
            G
          </button>
        ) : null}
        {level === 0 ? (
          <button
            type="button"
            style={styles.metaToggleBtn}
            onClick={onToggleMeta}
            title={showMeta ? "Скрыть исполнителей и сроки" : "Показать исполнителей и сроки"}
          >
            U
          </button>
        ) : null}
        <button
          type="button"
          style={styles.cardToggleBtn(isCardVisible)}
          onClick={() => onToggleCard?.(node.id, { source: "list" })}
          title={isCardVisible ? "Перейти к карточке задачи" : "Показать карточку задачи"}
        >
          C
        </button>

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

      {showMeta ? (
        <>
          <div style={styles.metaRow}>
            <input
              value={assignee}
              onChange={(e) => {
                setAssignee(e.target.value);
                setAssigneeStatus("dirty");
                assigneeDirtyRef.current = true;
              }}
              onBlur={commitAssignee}
              placeholder="Исполнитель"
              style={styles.metaInput}
            />
            <button
              type="button"
              onClick={commitAssignee}
              style={saveButtonStyle(assigneeStatus)}
              disabled={assigneeStatus !== "dirty"}
            >
              {saveButtonLabel(assigneeStatus)}
            </button>
            <input
              type="date"
              value={deadline}
              onChange={(e) => {
                setDeadline(e.target.value);
                setDeadlineStatus("dirty");
                deadlineDirtyRef.current = true;
              }}
              onBlur={commitDeadline}
              style={styles.metaInput}
            />
            <button
              type="button"
              onClick={commitDeadline}
              style={saveButtonStyle(deadlineStatus)}
              disabled={deadlineStatus !== "dirty"}
            >
              {saveButtonLabel(deadlineStatus)}
            </button>
          </div>
          {statusCard}
        </>
      ) : (
        statusCard
      )}

      {open && hasKids ? (
        <div>
          {node.children.map((c) => (
            <TaskNode
              key={c.id}
              node={c}
              level={level + 1}
              openById={openById}
              showMeta={showMeta}
              onToggleMeta={onToggleMeta}
              cardVisibility={cardVisibility}
              onToggleCard={onToggleCard}
              onToggleOpen={onToggleOpen}
              onToggleDone={onToggleDone}
              onRename={onRename}
              onAddChild={onAddChild}
              onDelete={onDelete}
              onUpdateMeta={onUpdateMeta}
              onOpenGantt={onOpenGantt}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

const styles = {
  row: { display: "flex", alignItems: "center", gap: 8 },
  metaRow: {
    display: "flex",
    gap: 8,
    paddingLeft: 30,
    marginTop: 6
  },
  metaInput: {
    borderRadius: 10,
    border: "1px solid #e5e5e5",
    padding: "6px 8px",
    fontSize: 12,
    minWidth: 140
  },
  metaSaveButton: {
    borderRadius: 10,
    border: "1px solid #e5e5e5",
    padding: "6px 10px",
    fontSize: 12,
    cursor: "pointer"
  },
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
  },
  metaToggleBtn: {
    width: 28,
    height: 28,
    borderRadius: 10,
    border: "1px solid #e5e5e5",
    background: "white",
    cursor: "pointer",
    fontWeight: 600
  },
  cardToggleBtn: (active) => ({
    width: 28,
    height: 28,
    borderRadius: 10,
    border: `1px solid ${active ? "#4f7cff" : "#e5e5e5"}`,
    background: active ? "#f3f6ff" : "white",
    cursor: "pointer",
    fontWeight: 600,
    color: active ? "#2b3f7c" : "#111"
  }),
  statusCard: {
    marginTop: 6,
    padding: "8px 12px",
    marginLeft: 30,
    borderRadius: 12,
    border: "1px solid #e5e5e5",
    background: "white",
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 12,
    color: "#444"
  },
  statusBadge: {
    padding: "2px 8px",
    borderRadius: 999,
    background: "#f1f1f1",
    fontWeight: 600,
    color: "#444"
  },
  statusBadgeDone: {
    background: "#daf5d9",
    color: "#1f7a32"
  },
  ganttBtn: {
    width: 28,
    height: 28,
    borderRadius: 10,
    border: "1px solid #4f7cff",
    background: "#f3f6ff",
    cursor: "pointer",
    fontWeight: 600,
    color: "#2b3f7c"
  }
};
