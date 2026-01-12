import jwt from "jsonwebtoken"
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import bcrypt from "bcryptjs";
import path from "path";
import fs from "fs";

import { initDb, buildTree } from "./db.js";
import { authMiddleware, signToken } from "./auth.js";

dotenv.config();

const PORT = Number(process.env.PORT || 3050);
const DB_PATH = process.env.DB_PATH || "./data/tasks.db";
const JWT_SECRET = process.env.JWT_SECRET || "change_me";
const PASSWORD_HASH = process.env.PASSWORD_HASH || "";

if (!PASSWORD_HASH) {
  console.error("ERROR: PASSWORD_HASH is empty. Set it in .env");
  process.exit(1);
}

const app = express();
app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());

// Если фронт на том же домене — CORS не нужен.
// Но для dev-режима с Vite оставим безопасно:
app.use(cors({
  origin: true,
  credentials: true
}));

const db = initDb(DB_PATH);

// ---------- AUTH ----------
app.post("/api/login", async (req, res) => {
  const { password } = req.body || {};
  if (typeof password !== "string") return res.status(400).json({ error: "bad_request" });

  const ok = await bcrypt.compare(password, PASSWORD_HASH);
  if (!ok) return res.status(401).json({ error: "invalid_password" });

  const token = signToken(JWT_SECRET);

  res.cookie("auth", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false, // если будет HTTPS — можно поставить true
    maxAge: 30 * 24 * 60 * 60 * 1000
  });

  res.json({ ok: true });
});

app.post("/api/logout", (req, res) => {
  res.clearCookie("auth");
  res.json({ ok: true });
});

app.get("/api/me", (req, res) => {
  const token = req.cookies?.auth;
  if (!token) return res.json({ authenticated: false });

  try {
    jwt.verify(token, JWT_SECRET);
    return res.json({ authenticated: true });
  } catch {
    return res.json({ authenticated: false });
  }
});


// ---------- TASKS ----------
const requireAuth = authMiddleware(JWT_SECRET);

app.get("/api/tasks", requireAuth, (req, res) => {
  const rows = db.prepare("SELECT * FROM tasks").all()
    .map(r => ({
      ...r,
      done: !!r.done
    }));
  res.json({ tree: buildTree(rows) });
});

app.post("/api/tasks", requireAuth, (req, res) => {
  const { title, parent_id = null, assignee, deadline } = req.body || {};
  if (typeof title !== "string" || !title.trim()) return res.status(400).json({ error: "title_required" });

  const now = Date.now();
  const assigneeValue = typeof assignee === "string" && assignee.trim() ? assignee.trim() : null;
  const deadlineValue = typeof deadline === "string" && deadline.trim() ? deadline.trim() : null;
  const stmt = db.prepare(`
    INSERT INTO tasks (parent_id, title, assignee, deadline, done, created_at, updated_at)
    VALUES (@parent_id, @title, @assignee, @deadline, 0, @created_at, @updated_at)
  `);

  const info = stmt.run({
    parent_id: parent_id === null ? null : Number(parent_id),
    title: title.trim(),
    assignee: assigneeValue,
    deadline: deadlineValue,
    created_at: now,
    updated_at: now
  });

  res.json({ ok: true, id: info.lastInsertRowid });
});

app.patch("/api/tasks/:id", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const { title, done } = req.body || {};
  const now = Date.now();

  const existing = db.prepare("SELECT id FROM tasks WHERE id = ?").get(id);
  if (!existing) return res.status(404).json({ error: "not_found" });

  const fields = [];
  const params = { id, updated_at: now };

  if (typeof title === "string") {
    fields.push("title = @title");
    params.title = title.trim();
  }
  if (Object.prototype.hasOwnProperty.call(req.body || {}, "assignee")) {
    const assigneeValue =
      typeof req.body.assignee === "string" && req.body.assignee.trim()
        ? req.body.assignee.trim()
        : null;
    fields.push("assignee = @assignee");
    params.assignee = assigneeValue;
  }
  if (Object.prototype.hasOwnProperty.call(req.body || {}, "deadline")) {
    const deadlineValue =
      typeof req.body.deadline === "string" && req.body.deadline.trim()
        ? req.body.deadline.trim()
        : null;
    fields.push("deadline = @deadline");
    params.deadline = deadlineValue;
  }
  if (typeof done === "boolean") {
    fields.push("done = @done");
    params.done = done ? 1 : 0;
  }
  fields.push("updated_at = @updated_at");

  db.prepare(`UPDATE tasks SET ${fields.join(", ")} WHERE id = @id`).run(params);
  res.json({ ok: true });
});

// Удаление поддерева: рекурсивно (простая реализация)
app.delete("/api/tasks/:id", requireAuth, (req, res) => {
  const id = Number(req.params.id);

  // соберем все id в поддереве
  const all = db.prepare("SELECT id, parent_id FROM tasks").all();
  const childrenMap = new Map();
  for (const r of all) {
    if (!childrenMap.has(r.parent_id)) childrenMap.set(r.parent_id, []);
    childrenMap.get(r.parent_id).push(r.id);
  }

  const toDelete = [];
  const stack = [id];
  while (stack.length) {
    const cur = stack.pop();
    toDelete.push(cur);
    const kids = childrenMap.get(cur) || [];
    for (const k of kids) stack.push(k);
  }

  const del = db.prepare("DELETE FROM tasks WHERE id = ?");
  const tx = db.transaction(() => {
    for (const tid of toDelete) del.run(tid);
  });
  tx();

  res.json({ ok: true, deleted: toDelete.length });
});

// ---------- WIKI ----------
app.get("/api/wiki", requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT id, title, created_at, updated_at
    FROM wiki_pages
    ORDER BY updated_at DESC
  `).all();
  res.json({ pages: rows });
});

app.get("/api/wiki/:id", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const page = db.prepare("SELECT * FROM wiki_pages WHERE id = ?").get(id);
  if (!page) return res.status(404).json({ error: "not_found" });
  res.json({ page });
});

app.post("/api/wiki", requireAuth, (req, res) => {
  const { title, content = "" } = req.body || {};
  if (typeof title !== "string" || !title.trim()) {
    return res.status(400).json({ error: "title_required" });
  }
  if (typeof content !== "string") {
    return res.status(400).json({ error: "content_required" });
  }

  const now = Date.now();
  const stmt = db.prepare(`
    INSERT INTO wiki_pages (title, content, created_at, updated_at)
    VALUES (@title, @content, @created_at, @updated_at)
  `);
  const info = stmt.run({
    title: title.trim(),
    content,
    created_at: now,
    updated_at: now
  });

  res.json({ ok: true, id: info.lastInsertRowid });
});

app.patch("/api/wiki/:id", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const { title, content } = req.body || {};
  const now = Date.now();

  const existing = db.prepare("SELECT id FROM wiki_pages WHERE id = ?").get(id);
  if (!existing) return res.status(404).json({ error: "not_found" });

  const fields = [];
  const params = { id, updated_at: now };

  if (typeof title === "string") {
    const trimmed = title.trim();
    if (!trimmed) return res.status(400).json({ error: "title_required" });
    fields.push("title = @title");
    params.title = trimmed;
  }
  if (typeof content === "string") {
    fields.push("content = @content");
    params.content = content;
  }
  fields.push("updated_at = @updated_at");

  db.prepare(`UPDATE wiki_pages SET ${fields.join(", ")} WHERE id = @id`).run(params);
  res.json({ ok: true });
});

app.delete("/api/wiki/:id", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const info = db.prepare("DELETE FROM wiki_pages WHERE id = ?").run(id);
  if (!info.changes) return res.status(404).json({ error: "not_found" });
  res.json({ ok: true });
});

// ---------- STATIC FRONTEND (prod) ----------
const webDist = path.resolve("../web/dist");
if (fs.existsSync(webDist)) {
  app.use(express.static(webDist));
  app.get("*", (req, res) => res.sendFile(path.join(webDist, "index.html")));
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server listening on http://0.0.0.0:${PORT}`);
});
