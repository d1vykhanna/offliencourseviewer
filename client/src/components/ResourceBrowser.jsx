import { useState } from "react";
import { api } from "../api";
import DocViewerModal from "./DocViewerModal";

const PREVIEWABLE = new Set([".docx", ".pdf", ".txt", ".png", ".jpg", ".jpeg", ".webp"]);

function getExt(name) {
  const i = name.lastIndexOf(".");
  return i === -1 ? "" : name.slice(i).toLowerCase();
}

function folderLabel(folderPath) {
  const parts = folderPath.split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] || folderPath;
}

/**
 * Expandable folder row for the Practice Files sidebar. Lists a folder's
 * contents in-app (fetched on first expand) instead of only offering
 * "open this folder on your computer". Previewable files (docx/pdf/txt/
 * images) open inline via DocViewerModal; anything else (project files,
 * audio, archives, etc.) falls back to opening in the OS default app,
 * since the browser genuinely can't render those.
 */
export default function ResourceBrowser({ path, label, depth = 0 }) {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [viewingDoc, setViewingDoc] = useState(null);

  async function handleToggle() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (entries) return;
    setLoading(true);
    setError(null);
    try {
      setEntries(await api.listFolder(path));
    } catch (e) {
      setError(e.message || "Couldn't read this folder.");
    } finally {
      setLoading(false);
    }
  }

  function handleFileClick(entry) {
    const ext = getExt(entry.name);
    if (PREVIEWABLE.has(ext)) {
      setViewingDoc({ title: entry.name.slice(0, entry.name.length - ext.length), filename: entry.name, path: entry.path });
    } else {
      api.openFile(entry.path).catch(() => {});
    }
  }

  return (
    <div className="resource-browser" style={{ marginLeft: depth ? 14 : 0 }}>
      <div className="resource-category" onClick={handleToggle} style={{ cursor: "pointer" }}>
        <span>{label ?? folderLabel(path)}</span>
        <span className="resource-actions">
          <span
            className="resource-action-icon"
            title="Open this folder on your computer"
            onClick={(e) => {
              e.stopPropagation();
              api.openFolder(path).catch(() => {});
            }}
          >
            ↗
          </span>
          <span>{open ? "▲" : "▼"}</span>
        </span>
      </div>

      {open && (
        <div className="resource-browser-body">
          {loading && <div className="resource-status">Loading…</div>}
          {error && <div className="resource-status resource-error">{error}</div>}
          {entries && entries.length === 0 && <div className="resource-status">Empty folder.</div>}

          {entries &&
            entries.map((entry) =>
              entry.isDir ? (
                <ResourceBrowser key={entry.path} path={entry.path} label={entry.name} depth={depth + 1} />
              ) : (
                <div
                  key={entry.path}
                  className="doc-row"
                  style={{ marginLeft: depth ? 14 : 0, cursor: "pointer" }}
                  onClick={() => handleFileClick(entry)}
                >
                  {PREVIEWABLE.has(getExt(entry.name)) ? "📄" : "📎"} {entry.name}
                </div>
              )
            )}
        </div>
      )}

      {viewingDoc && <DocViewerModal doc={viewingDoc} onClose={() => setViewingDoc(null)} />}
    </div>
  );
}
