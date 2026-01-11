import React from "react";
import TaskNode from "./TaskNode.jsx";

export default function TaskTree({ tree, ...handlers }) {
  if (!tree?.length) {
    return <div style={{ color: "#666", padding: 12 }}>Пока нет задач. Добавь первую.</div>;
  }

  return (
    <div style={{ padding: 6 }}>
      {tree.map((n) => (
        <TaskNode key={n.id} node={n} level={0} {...handlers} />
      ))}
    </div>
  );
}
