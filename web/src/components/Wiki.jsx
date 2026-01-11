import React, { useEffect, useMemo, useState } from "react";
import { apiDelete, apiGet, apiPatch, apiPost } from "../api.js";

export default function Wiki() {
  const [pages, setPages] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState("");
  const [showSource, setShowSource] = useState(true);

  async function loadList(selectId = activeId) {
    const res = await apiGet("/api/wiki");
    const list = res?.pages || [];
    setPages(list);
    if (!list.length) {
      setActiveId(null);
      setTitle("");
      setContent("");
      return;
    }
    const nextId = selectId ?? list[0].id;
    if (nextId) await loadPage(nextId, list);
  }

  async function loadPage(id, list = pages) {
    const res = await apiGet(`/api/wiki/${id}`);
    if (res?.page) {
      setActiveId(id);
      setTitle(res.page.title || "");
      setContent(res.page.content || "");
      if (!list.find((p) => p.id === id)) {
        await loadList(id);
      }
    }
  }

  useEffect(() => {
    loadList();
  }, []);

  async function createPage() {
    const name = prompt("Название страницы:");
    const trimmed = (name || "").trim();
    if (!trimmed) return;
    const draft = `# ${trimmed}\n\n`;
    const res = await apiPost("/api/wiki", { title: trimmed, content: draft });
    if (res?.id) {
      await loadList(res.id);
      setStatus("Страница создана.");
    }
  }

  async function savePage() {
    if (!activeId) return;
    const trimmed = title.trim();
    if (!trimmed) {
      setStatus("Название не может быть пустым.");
      return;
    }
    await apiPatch(`/api/wiki/${activeId}`, { title: trimmed, content });
    await loadList(activeId);
    setStatus("Сохранено.");
  }

  async function deletePage() {
    if (!activeId) return;
    if (!confirm("Удалить страницу?")) return;
    await apiDelete(`/api/wiki/${activeId}`);
    setStatus("Страница удалена.");
    await loadList(null);
  }

  const preview = useMemo(() => {
    return renderMarkdown(content || "");
  }, [content]);

  return (
    <div style={styles.wrapper}>
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <div style={styles.sidebarTitle}>Wiki</div>
          <button style={styles.actionBtn} onClick={createPage}>Новая</button>
        </div>
        <div style={styles.list}>
          {pages.map((page) => (
            <button
              key={page.id}
              style={{
                ...styles.listItem,
                ...(page.id === activeId ? styles.listItemActive : {})
              }}
              onClick={() => loadPage(page.id)}
            >
              <div style={styles.listTitle}>{page.title}</div>
              <div style={styles.listMeta}>
                {new Date(page.updated_at).toLocaleString()}
              </div>
            </button>
          ))}
          {!pages.length && (
            <div style={styles.empty}>Пока нет страниц. Создайте первую.</div>
          )}
        </div>
      </div>
      <div style={styles.editor}>
        <div style={styles.toolbar}>
          <input
            style={styles.titleInput}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Название страницы"
          />
          <div style={styles.toolbarActions}>
            <button
              style={styles.secondaryBtn}
              onClick={() => setShowSource((prev) => !prev)}
            >
              {showSource ? "Скрыть разметку" : "Показать разметку"}
            </button>
            <button style={styles.secondaryBtn} onClick={deletePage} disabled={!activeId}>
              Удалить
            </button>
            <button style={styles.primaryBtn} onClick={savePage} disabled={!activeId}>
              Сохранить
            </button>
          </div>
        </div>
        <div
          style={{
            ...styles.contentRow,
            gridTemplateColumns: showSource ? "1fr 1fr" : "1fr"
          }}
        >
          {showSource && (
            <textarea
              style={styles.textarea}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Markdown контент..."
            />
          )}
          <div style={styles.preview}>
            <div
              style={styles.previewContent}
              dangerouslySetInnerHTML={{ __html: preview }}
            />
          </div>
        </div>
        {status && <div style={styles.status}>{status}</div>}
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    display: "grid",
    gridTemplateColumns: "260px 1fr",
    gap: 16,
    minHeight: 420
  },
  sidebar: {
    border: "1px solid #e5e5e5",
    borderRadius: 12,
    padding: 12,
    background: "#fafafa",
    display: "flex",
    flexDirection: "column"
  },
  sidebarHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10
  },
  sidebarTitle: { fontWeight: 600 },
  actionBtn: {
    borderRadius: 8,
    border: "1px solid #111",
    background: "#111",
    color: "white",
    padding: "6px 10px",
    cursor: "pointer"
  },
  list: { display: "flex", flexDirection: "column", gap: 8 },
  listItem: {
    textAlign: "left",
    border: "1px solid transparent",
    background: "white",
    padding: "8px 10px",
    borderRadius: 10,
    cursor: "pointer"
  },
  listItemActive: { borderColor: "#111" },
  listTitle: { fontWeight: 600, marginBottom: 4 },
  listMeta: { fontSize: 11, color: "#777" },
  empty: { fontSize: 12, color: "#666", padding: 8 },
  editor: {
    border: "1px solid #e5e5e5",
    borderRadius: 12,
    padding: 12,
    background: "white"
  },
  toolbar: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 12
  },
  titleInput: {
    flex: 1,
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #ddd",
    outline: "none"
  },
  toolbarActions: { display: "flex", gap: 8 },
  primaryBtn: {
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #111",
    background: "#111",
    color: "white",
    cursor: "pointer"
  },
  secondaryBtn: {
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #ddd",
    background: "white",
    cursor: "pointer"
  },
  contentRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  textarea: {
    width: "100%",
    minHeight: 320,
    resize: "vertical",
    borderRadius: 10,
    border: "1px solid #ddd",
    padding: 12,
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    fontSize: 13
  },
  preview: {
    border: "1px solid #eee",
    borderRadius: 10,
    padding: 12,
    background: "#fcfcfc",
    overflow: "auto",
    minHeight: 320
  },
  previewContent: {
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
    lineHeight: 1.5
  },
  status: { marginTop: 10, fontSize: 12, color: "#555" }
};

function renderMarkdown(markdown) {
  const escaped = escapeHtml(markdown);
  const codeBlocks = [];
  const withBlocks = escaped.replace(/```([\s\S]*?)```/g, (_, code) => {
    const token = `{{CODEBLOCK_${codeBlocks.length}}}`;
    codeBlocks.push(`<pre><code>${code}</code></pre>`);
    return token;
  });
  const lines = withBlocks.split("\n");
  const html = [];
  let inList = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^{{CODEBLOCK_\d+}}$/.test(trimmed)) {
      if (inList) {
        html.push("</ul>");
        inList = false;
      }
      html.push(trimmed);
      continue;
    }
    if (/^\s*-\s+/.test(line)) {
      if (!inList) {
        html.push("<ul>");
        inList = true;
      }
      const item = line.replace(/^\s*-\s+/, "");
      html.push(`<li>${renderInline(item)}</li>`);
      continue;
    }
    if (inList) {
      html.push("</ul>");
      inList = false;
    }
    if (/^###\s+/.test(line)) {
      html.push(`<h3>${renderInline(line.replace(/^###\s+/, ""))}</h3>`);
    } else if (/^##\s+/.test(line)) {
      html.push(`<h2>${renderInline(line.replace(/^##\s+/, ""))}</h2>`);
    } else if (/^#\s+/.test(line)) {
      html.push(`<h1>${renderInline(line.replace(/^#\s+/, ""))}</h1>`);
    } else if (!line.trim()) {
      html.push("<br />");
    } else {
      html.push(`<p>${renderInline(line)}</p>`);
    }
  }

  if (inList) html.push("</ul>");
  return html.join("\n").replace(/{{CODEBLOCK_(\d+)}}/g, (_, index) => {
    return codeBlocks[Number(index)] || "";
  });
}

function renderInline(text) {
  return text
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
