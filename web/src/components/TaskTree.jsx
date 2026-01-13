import React, { useEffect, useState } from "react";
import TaskNode from "./TaskNode.jsx";

export default function TaskTree({ tree, cardVisibility, onToggleCard, ...handlers }) {
  const [openById, setOpenById] = useState({});
  const [showMeta, setShowMeta] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("taskTreeOpenState");
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === "object") {
        setOpenById(parsed);
      }
    } catch {
      setOpenById({});
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("taskTreeOpenState", JSON.stringify(openById));
  }, [openById]);

  const handleToggleOpen = (id, nextOpen) => {
    setOpenById((prev) => ({ ...prev, [id]: nextOpen }));
  };

  const handleToggleMeta = () => {
    setShowMeta((prev) => !prev);
  };

  if (!tree?.length) {
    return <div style={{ color: "#666", padding: 12 }}>Пока нет задач. Добавь первую.</div>;
  }

  return (
    <div style={{ padding: 6 }}>
      {tree.map((n) => (
        <TaskNode
          key={n.id}
          node={n}
          level={0}
          openById={openById}
          onToggleOpen={handleToggleOpen}
          showMeta={showMeta}
          onToggleMeta={handleToggleMeta}
          cardVisibility={cardVisibility}
          onToggleCard={onToggleCard}
          {...handlers}
        />
      ))}
    </div>
  );
}
