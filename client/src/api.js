const BASE_URL = "http://localhost:4000";

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  getConfig: () => request("/api/config"),
  setConfig: (coursesRoot) =>
    request("/api/config", { method: "POST", body: JSON.stringify({ coursesRoot }) }),

  getLibrary: () => request("/api/library"),
  refreshLibrary: () => request("/api/library/refresh", { method: "POST" }),
  search: (q) => request(`/api/search?q=${encodeURIComponent(q)}`),

  getProgress: () => request("/api/progress"),
  updateProgress: (lessonId, data) =>
    request(`/api/progress/${lessonId}`, { method: "POST", body: JSON.stringify(data) }),

  getNotes: (lessonId) => request(`/api/notes/${lessonId}`),
  saveNotes: (lessonId, text) =>
    request(`/api/notes/${lessonId}`, { method: "POST", body: JSON.stringify({ text }) }),

  getBookmarks: (lessonId) => request(`/api/bookmarks/${lessonId}`),
  addBookmark: (lessonId, time, label) =>
    request(`/api/bookmarks/${lessonId}`, { method: "POST", body: JSON.stringify({ time, label }) }),
  deleteBookmark: (lessonId, bookmarkId) =>
    request(`/api/bookmarks/${lessonId}/${bookmarkId}`, { method: "DELETE" }),

  openFolder: (path) => request("/api/open-folder", { method: "POST", body: JSON.stringify({ path }) }),
  openFile: (path) => request("/api/open-file", { method: "POST", body: JSON.stringify({ path }) }),
  listFolder: (path) => request(`/api/list-folder?path=${encodeURIComponent(path)}`),

  streamUrl: (filePath) => `${BASE_URL}/api/stream?path=${encodeURIComponent(filePath)}`,

  getDocxHtml: (filePath) => request(`/api/doc-view/docx?path=${encodeURIComponent(filePath)}`),
  rawPreviewUrl: (filePath) => `${BASE_URL}/api/doc-view/raw?path=${encodeURIComponent(filePath)}`,
};
