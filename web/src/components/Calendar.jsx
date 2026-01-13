import React, { useEffect, useMemo, useState } from "react";

const weekDays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

const toISODate = (date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDate = (value) => {
  if (!value) return null;
  if (typeof value === "number") return new Date(value);
  if (typeof value === "string") return new Date(`${value}T00:00:00`);
  return null;
};

const flattenTasks = (tree) => {
  const items = [];
  const walk = (node) => {
    items.push(node);
    (node.children || []).forEach(walk);
  };
  (tree || []).forEach(walk);
  return items;
};

const buildCalendarDays = (monthDate) => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const first = new Date(year, month, 1);
  const startDay = (first.getDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days = [];
  for (let i = 0; i < startDay; i += 1) {
    days.push(null);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push(new Date(year, month, day));
  }
  while (days.length % 7 !== 0) {
    days.push(null);
  }
  return days;
};

const startOfWeek = (date) => {
  const dayIndex = (date.getDay() + 6) % 7;
  const start = new Date(date);
  start.setDate(date.getDate() - dayIndex);
  return new Date(start.getFullYear(), start.getMonth(), start.getDate());
};

const addDays = (date, offset) => {
  const next = new Date(date);
  next.setDate(date.getDate() + offset);
  return new Date(next.getFullYear(), next.getMonth(), next.getDate());
};

export default function Calendar({ tree, onSelectTask }) {
  const [monthDate, setMonthDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [view, setView] = useState("month");

  const tasks = useMemo(() => flattenTasks(tree), [tree]);

  const eventsByDate = useMemo(() => {
    const map = new Map();
    tasks.forEach((task) => {
      const date = parseDate(task.deadline);
      if (!date) return;
      const key = toISODate(date);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(task);
    });
    map.forEach((items) => items.sort((a, b) => a.title.localeCompare(b.title, "ru")));
    return map;
  }, [tasks]);

  const days = useMemo(() => buildCalendarDays(monthDate), [monthDate]);
  const weekDates = useMemo(() => {
    const start = startOfWeek(selectedDate);
    return Array.from({ length: 7 }, (_, index) => addDays(start, index));
  }, [selectedDate]);

  const monthLabel = monthDate.toLocaleDateString("ru-RU", {
    month: "long",
    year: "numeric"
  });
  const weekLabel = `${weekDates[0].toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long"
  })} — ${weekDates[6].toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric"
  })}`;
  const dayLabel = selectedDate.toLocaleDateString("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });
  const headerLabel = view === "month" ? monthLabel : view === "week" ? weekLabel : dayLabel;

  const selectedKey = toISODate(selectedDate);
  const selectedEvents = eventsByDate.get(selectedKey) || [];

  const changeMonth = (offset) => {
    setMonthDate((prev) => {
      const next = new Date(prev.getFullYear(), prev.getMonth() + offset, 1);
      setSelectedDate(new Date(next.getFullYear(), next.getMonth(), 1));
      return next;
    });
  };

  const handleNavigate = (offset) => {
    if (view === "month") {
      changeMonth(offset);
      return;
    }
    const step = view === "week" ? 7 : 1;
    setSelectedDate((prev) => addDays(prev, offset * step));
  };

  const goToday = () => {
    const today = new Date();
    setMonthDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(today);
  };

  const handleViewChange = (nextView) => {
    setView(nextView);
    if (nextView === "month") {
      setMonthDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
    }
  };

  useEffect(() => {
    if (view !== "month") {
      setMonthDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
    }
  }, [selectedDate, view]);

  return (
    <div className="calendar">
      <div className="calendarTop">
        <div className="calendarTitle">Календарь</div>
        <div className="calendarControls">
          <button type="button" onClick={() => handleNavigate(-1)} className="calendarButton">
            ◀
          </button>
          <button type="button" onClick={goToday} className="calendarButton calendarButtonPrimary">
            Сегодня
          </button>
          <button type="button" onClick={() => handleNavigate(1)} className="calendarButton">
            ▶
          </button>
        </div>
        <div className="calendarViewToggle">
          {[
            { id: "month", label: "Месяц" },
            { id: "week", label: "Неделя" },
            { id: "day", label: "День" }
          ].map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => handleViewChange(option.id)}
              className={`calendarViewButton ${view === option.id ? "calendarViewButtonActive" : ""}`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="calendarMonth">{headerLabel}</div>
      </div>

      <div className="calendarLayout">
        <div className="calendarMain">
          {(view === "month" || view === "week") && (
            <div className="calendarGrid">
              {weekDays.map((day) => (
                <div key={day} className="calendarWeekDay">
                  {day}
                </div>
              ))}
              {(view === "month" ? days : weekDates).map((day, index) => {
                const key = day ? toISODate(day) : `empty-${index}`;
                const events = day ? eventsByDate.get(toISODate(day)) || [] : [];
                const isToday = day && toISODate(day) === toISODate(new Date());
                const isSelected = day && toISODate(day) === selectedKey;
                return (
                  <button
                    key={key}
                    type="button"
                    className={`calendarDay ${view === "week" ? "calendarDayCompact" : ""} ${
                      day ? "" : "calendarDayEmpty"
                    } ${isToday ? "calendarDayToday" : ""} ${
                      isSelected ? "calendarDaySelected" : ""
                    }`}
                    onClick={() => day && setSelectedDate(day)}
                    disabled={!day}
                  >
                    {day && (
                      <>
                        <div className="calendarDayNumber">{day.getDate()}</div>
                        <div className="calendarEvents">
                          {events.slice(0, view === "week" ? 2 : 3).map((task) => (
                            <span
                              key={task.id}
                              className="calendarEvent calendarEventLink"
                              onClick={(event) => {
                                event.stopPropagation();
                                onSelectTask?.(task.id);
                              }}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  onSelectTask?.(task.id);
                                }
                              }}
                            >
                              {task.title}
                            </span>
                          ))}
                          {events.length > (view === "week" ? 2 : 3) && (
                            <span className="calendarEventMore">
                              +{events.length - (view === "week" ? 2 : 3)} ещё
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          )}
          {view === "day" && (
            <div className="calendarDayView">
              <div className="calendarDayViewHeader">{dayLabel}</div>
              {selectedEvents.length === 0 ? (
                <div className="calendarEmpty">Нет задач со сроком на этот день.</div>
              ) : (
                <ul className="calendarList">
                  {selectedEvents.map((task) => (
                    <li key={task.id} className="calendarListItem">
                      <span className={`calendarListDot ${task.done ? "calendarListDone" : ""}`} />
                      <button
                        type="button"
                        className="calendarTaskLink"
                        onClick={() => onSelectTask?.(task.id)}
                      >
                        <div className="calendarListTitle">{task.title}</div>
                        {task.assignee && (
                          <div className="calendarListMeta">{task.assignee}</div>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <aside className="calendarSidebar">
          <div className="calendarSidebarHeader">
            {selectedDate.toLocaleDateString("ru-RU", {
              weekday: "long",
              day: "numeric",
              month: "long"
            })}
          </div>
          <div className="calendarSidebarBody">
            {selectedEvents.length === 0 ? (
              <div className="calendarEmpty">Нет задач со сроком на этот день.</div>
            ) : (
              <ul className="calendarList">
                {selectedEvents.map((task) => (
                  <li key={task.id} className="calendarListItem">
                    <span className={`calendarListDot ${task.done ? "calendarListDone" : ""}`} />
                    <button
                      type="button"
                      className="calendarTaskLink"
                      onClick={() => onSelectTask?.(task.id)}
                    >
                      <div className="calendarListTitle">{task.title}</div>
                      {task.assignee && (
                        <div className="calendarListMeta">{task.assignee}</div>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
