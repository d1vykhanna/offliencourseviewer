import { useEffect, useState } from "react";
import { api } from "../api";

const IFRAME_PREVIEWABLE = new Set([".pdf", ".txt"]);
const IMAGE_PREVIEWABLE = new Set([".png", ".jpg", ".jpeg", ".webp"]);

function getExt(filename) {
  const i = filename.lastIndexOf(".");
  return i === -1 ? "" : filename.slice(i).toLowerCase();
}

export default function DocViewerModal({ doc, onClose }) {
  const ext = getExt(doc.filename);
  const isDocx = ext === ".docx";
  const isRawPreviewable = IFRAME_PREVIEWABLE.has(ext);
  const isImage = IMAGE_PREVIEWABLE.has(ext);

  const [state, setState] = useState({ loading: isDocx, error: null, html: null });

  useEffect(() => {
    if (!isDocx) return;
    let cancelled = false;
    setState({ loading: true, error: null, html: null });
    api
      .getDocxHtml(doc.path)
      .then((r) => {
        if (!cancelled) setState({ loading: false, error: null, html: r.html });
      })
      .catch((e) => {
        if (!cancelled) setState({ loading: false, error: e.message || "Failed to load document.", html: null });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.path]);

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="doc-modal-overlay" onClick={onClose}>
      <div className="doc-modal" onClick={(e) => e.stopPropagation()}>
        <div className="doc-modal-header">
          <span className="doc-modal-title">📄 {doc.title}</span>
          <div className="doc-modal-actions">
            <button className="btn btn-sm" onClick={() => api.openFile(doc.path).catch(() => {})}>
              Open in default app
            </button>
            <button className="doc-modal-close" onClick={onClose} aria-label="Close">
              ✕
            </button>
          </div>
        </div>

        <div className="doc-modal-body">
          {isDocx && state.loading && <div className="doc-modal-status">Loading document…</div>}

          {isDocx && state.error && (
            <div className="doc-modal-status doc-modal-error">
              {state.error} Try "Open in default app" instead.
            </div>
          )}

          {isDocx && !state.loading && !state.error && (
            <div className="docx-content" dangerouslySetInnerHTML={{ __html: state.html }} />
          )}

          {isRawPreviewable && (
            <iframe className="doc-modal-iframe" src={api.rawPreviewUrl(doc.path)} title={doc.title} />
          )}

          {isImage && (
            <img className="doc-modal-image" src={api.rawPreviewUrl(doc.path)} alt={doc.title} />
          )}

          {!isDocx && !isRawPreviewable && !isImage && (
            <div className="doc-modal-status">
              This file type ({ext || "unknown"}) can't be previewed in the browser — it needs the app it was made
              for (e.g. a project file, audio, or archive). Use "Open in default app" above.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
