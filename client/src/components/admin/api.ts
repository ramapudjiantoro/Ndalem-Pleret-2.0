// ─── API helper ───────────────────────────────────────────────────────────────
// Semua endpoint /api/admin/* butuh header x-admin-token. Body (jika ada) dikirim sebagai JSON.
export function adminFetch(token: string, url: string, method = "GET", body?: unknown) {
  return fetch(url, {
    method,
    headers: body === undefined
      ? { "x-admin-token": token }
      : { "Content-Type": "application/json", "x-admin-token": token },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
