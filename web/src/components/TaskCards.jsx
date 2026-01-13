import React, { useEffect, useMemo, useRef, useState } from "react";

const flattenTree = (tree) => {
  const items = [];
  const walk = (node, level) => {
    items.push({ ...node, level });
    (node.children || []).forEach((child) => walk(child, level + 1));
  };
  (tree || []).forEach((node) => walk(node, 0));
  return items;
};

const saveButtonStyle = (status) => ({
  background: status === "dirty" ? "#ffd65c" : status === "saved" ? "#b7f7b0" : "white",
  cursor: status === "dirty" ? "pointer" : "not-allowed",
  opacity: status === "dirty" ? 1 : 0.7
});

const saveButtonLabel = (status) => {
  if (status === "dirty") return "!";
  if (status === "saved") return "✓";
  return "";
};

function TaskCard({ node, selected, onUpdateMeta }) {
  const [title, setTitle] = useState(node.title);
  const [assignee, setAssignee] = useState(node.assignee ?? "");
  const [deadline, setDeadline] = useState(node.deadline ?? "");
  const [description, setDescription] = useState(node.description ?? "");
  const [titleStatus, setTitleStatus] = useState("idle");
  const [assigneeStatus, setAssigneeStatus] = useState("idle");
  const [deadlineStatus, setDeadlineStatus] = useState("idle");
  const [descriptionStatus, setDescriptionStatus] = useState("idle");
  const titleDirtyRef = useRef(false);
  const assigneeDirtyRef = useRef(false);
  const deadlineDirtyRef = useRef(false);
  const descriptionDirtyRef = useRef(false);

  useEffect(() => {
    setTitle(node.title);
    setTitleStatus(titleDirtyRef.current ? "saved" : "idle");
    titleDirtyRef.current = false;
  }, [node.title]);

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

  useEffect(() => {
    setDescription(node.description ?? "");
    setDescriptionStatus(descriptionDirtyRef.current ? "saved" : "idle");
    descriptionDirtyRef.current = false;
  }, [node.description]);

  const commitTitle = async () => {
    if (!onUpdateMeta) return;
    const normalized = title.trim();
    const current = node.title ?? "";
    if (!normalized || normalized === current) {
      setTitleStatus("idle");
      titleDirtyRef.current = false;
      setTitle(current);
      return;
    }
    setTitleStatus("saving");
    await onUpdateMeta(node.id, { title: normalized });
  };

  const commitAssignee = async () => {
    if (!onUpdateMeta) return;
    const normalized = assignee.trim();
    const current = node.assignee ?? "";
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
    const current = node.deadline ?? "";
    if (normalized === current) {
      setDeadlineStatus("idle");
      deadlineDirtyRef.current = false;
      return;
    }
    setDeadlineStatus("saving");
    await onUpdateMeta(node.id, { deadline: normalized || null });
  };

  const commitDescription = async () => {
    if (!onUpdateMeta) return;
    const normalized = description.trim();
    const current = node.description ?? "";
    if (normalized === current) {
      setDescriptionStatus("idle");
      descriptionDirtyRef.current = false;
      return;
    }
    setDescriptionStatus("saving");
    await onUpdateMeta(node.id, { description: normalized || null });
  };

  return (
    <div
      id={`task-card-${node.id}`}
      className={`taskCard ${selected ? "taskCardHighlight" : ""}`}
    >
      <div className="taskCardHeader">
        <div>
          <div className="taskCardTitle">Карточка задачи</div>
          <div className="taskCardSubtitle">
            {node.level > 0 ? `Подзадача • уровень ${node.level}` : "Главная задача"}
          </div>
        </div>
        <span className={`taskCardStatus ${node.done ? "taskCardStatusDone" : ""}`}>
          {node.done ? "Готово" : "В работе"}
        </span>
      </div>

      <div className="taskCardFields">
        <label className="taskCardField">
          <span className="taskCardLabel">Название</span>
          <div className="taskCardInputRow">
            <input
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                setTitleStatus("dirty");
                titleDirtyRef.current = true;
              }}
              onBlur={commitTitle}
              className="taskCardInput"
            />
            <button
              type="button"
              onClick={commitTitle}
              className="taskCardSaveButton"
              style={saveButtonStyle(titleStatus)}
              disabled={titleStatus !== "dirty"}
            >
              {saveButtonLabel(titleStatus)}
            </button>
          </div>
        </label>

        <label className="taskCardField">
          <span className="taskCardLabel">Исполнитель</span>
          <div className="taskCardInputRow">
            <input
              value={assignee}
              onChange={(event) => {
                setAssignee(event.target.value);
                setAssigneeStatus("dirty");
                assigneeDirtyRef.current = true;
              }}
              onBlur={commitAssignee}
              placeholder="Исполнитель"
              className="taskCardInput"
            />
            <button
              type="button"
              onClick={commitAssignee}
              className="taskCardSaveButton"
              style={saveButtonStyle(assigneeStatus)}
              disabled={assigneeStatus !== "dirty"}
            >
              {saveButtonLabel(assigneeStatus)}
            </button>
          </div>
        </label>

        <label className="taskCardField">
          <span className="taskCardLabel">Срок</span>
          <div className="taskCardInputRow">
            <input
              type="date"
              value={deadline}
              onChange={(event) => {
                setDeadline(event.target.value);
                setDeadlineStatus("dirty");
                deadlineDirtyRef.current = true;
              }}
              onBlur={commitDeadline}
              className="taskCardInput"
            />
            <button
              type="button"
              onClick={commitDeadline}
              className="taskCardSaveButton"
              style={saveButtonStyle(deadlineStatus)}
              disabled={deadlineStatus !== "dirty"}
            >
              {saveButtonLabel(deadlineStatus)}
            </button>
          </div>
        </label>

        <label className="taskCardField">
          <span className="taskCardLabel">Описание</span>
          <div className="taskCardInputRow">
            <textarea
              value={description}
              onChange={(event) => {
                setDescription(event.target.value);
                setDescriptionStatus("dirty");
                descriptionDirtyRef.current = true;
              }}
              onBlur={commitDescription}
              placeholder="Добавьте описание задачи"
              className="taskCardTextarea"
              rows={3}
            />
            <button
              type="button"
              onClick={commitDescription}
              className="taskCardSaveButton"
              style={saveButtonStyle(descriptionStatus)}
              disabled={descriptionStatus !== "dirty"}
            >
              {saveButtonLabel(descriptionStatus)}
            </button>
          </div>
        </label>
      </div>
    </div>
  );
}

export default function TaskCards({ tree, selectedTaskId, visibleCardIds, onUpdateMeta }) {
  const cards = useMemo(() => {
    const flattened = flattenTree(tree);
    if (!visibleCardIds || typeof visibleCardIds !== "object") return [];
    return flattened.filter((node) => visibleCardIds[node.id]);
  }, [tree, visibleCardIds]);

  useEffect(() => {
    if (!selectedTaskId) return;
    const element = document.getElementById(`task-card-${selectedTaskId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [selectedTaskId]);

  if (!cards.length) {
    return <div className="taskCardsEmpty">Нет задач для карточек.</div>;
  }

  return (
    <div className="taskCards">
      {cards.map((node) => (
        <TaskCard
          key={node.id}
          node={node}
          selected={node.id === selectedTaskId}
          onUpdateMeta={onUpdateMeta}
        />
      ))}
    </div>
  );
}
