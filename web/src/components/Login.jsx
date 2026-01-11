import React, { useState } from "react";
import { apiPost } from "../api.js";

export default function Login({ onSuccess }) {
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  async function submit(e) {
    e.preventDefault();
    setErr("");
    const res = await apiPost("/api/login", { password });
    if (res?.ok) onSuccess();
    else setErr("Неверный пароль");
  }

  return (
    <div style={styles.wrap}>
      <form onSubmit={submit} style={styles.card}>
        <div style={styles.title}>Вход</div>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Пароль"
          style={styles.input}
          autoFocus
        />
        {err ? <div style={styles.err}>{err}</div> : null}
        <button style={styles.btn} type="submit">Войти</button>
        <div style={styles.hint}>
          Минималистичный режим. Дальше легко расширять (теги, сроки, поиск, drag&drop).
        </div>
      </form>
    </div>
  );
}

const styles = {
  wrap: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial"
  },
  card: {
    width: 360,
    padding: 20,
    border: "1px solid #e5e5e5",
    borderRadius: 12
  },
  title: { fontSize: 18, marginBottom: 12 },
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #ddd",
    outline: "none"
  },
  btn: {
    marginTop: 12,
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #111",
    background: "#111",
    color: "#fff",
    cursor: "pointer"
  },
  err: { marginTop: 8, color: "#b00020", fontSize: 13 },
  hint: { marginTop: 12, color: "#666", fontSize: 12, lineHeight: 1.4 }
};
