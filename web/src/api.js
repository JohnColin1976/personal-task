export async function apiGet(path) {
  const r = await fetch(path, { credentials: "include" });
  return r.json();
}

export async function apiPost(path, body) {
  const r = await fetch(path, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  return r.json();
}

export async function apiPatch(path, body) {
  const r = await fetch(path, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  return r.json();
}

export async function apiDelete(path) {
  const r = await fetch(path, {
    method: "DELETE",
    credentials: "include"
  });
  return r.json();
}
