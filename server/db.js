import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

export function initDb(dbPath) {
  const dir = path.dirname(dbPath);
  fs.mkdirSync(dir, { recursive: true });

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_id INTEGER NULL,
      title TEXT NOT NULL,
      assignee TEXT NULL,
      deadline TEXT NULL,
      description TEXT NULL,
      done INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (parent_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_id);

    CREATE TABLE IF NOT EXISTS wiki_pages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_wiki_pages_updated ON wiki_pages(updated_at);
  `);

  const taskColumns = new Set(
    db.prepare("PRAGMA table_info(tasks)").all().map((col) => col.name)
  );
  if (!taskColumns.has("assignee")) {
    db.prepare("ALTER TABLE tasks ADD COLUMN assignee TEXT NULL").run();
  }
  if (!taskColumns.has("deadline")) {
    db.prepare("ALTER TABLE tasks ADD COLUMN deadline TEXT NULL").run();
  }
  if (!taskColumns.has("description")) {
    db.prepare("ALTER TABLE tasks ADD COLUMN description TEXT NULL").run();
  }

  return db;
}

export function buildTree(rows) {
  const byId = new Map();
  const roots = [];

  for (const r of rows) byId.set(r.id, { ...r, children: [] });

  for (const node of byId.values()) {
    if (node.parent_id == null) roots.push(node);
    else {
      const p = byId.get(node.parent_id);
      if (p) p.children.push(node);
      else roots.push(node); // если родителя нет — считаем корнем
    }
  }

  // сортировка: сначала не выполненные, затем по времени создания
  function sortRec(list) {
    list.sort((a, b) => (a.done - b.done) || (a.created_at - b.created_at));
    for (const n of list) sortRec(n.children);
  }
  sortRec(roots);

  return roots;
}
