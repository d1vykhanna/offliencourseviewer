import { useState } from "react";
import { Link } from "react-router-dom";
import { flattenLessons } from "../utils";
import DocViewerModal from "./DocViewerModal";

export default function ModuleTree({ node, courseId, progress, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const [viewingDoc, setViewingDoc] = useState(null);

  const allLessons = flattenLessons(node);
  const total = allLessons.length;
  const watched = allLessons.filter((l) => progress[l.id]?.watched).length;
  const isDone = total > 0 && watched === total;

  function handleOpenDoc(doc) {
    setViewingDoc(doc);
  }

  return (
    <div className="module-node">
      <div className="module-header" onClick={() => setOpen((o) => !o)}>
        <div className="module-title-row">
          <span className={`module-check ${isDone ? "done" : "pending"}`}>{isDone ? "✔" : "○"}</span>
          <span className="module-title">{node.title}</span>
        </div>
        <span className="module-progress-text">
          {total > 0 ? `${watched}/${total}` : ""} {open ? "▲" : "▼"}
        </span>
      </div>

      {open && (
        <div className="module-children">
          {node.lessons.map((lesson) => {
            const p = progress[lesson.id];
            return (
              <Link key={lesson.id} to={`/course/${courseId}/lesson/${lesson.id}`} className="lesson-row">
                <span className="lesson-check">{p?.watched ? "✔" : ""}</span>
                <span className="lesson-title">{lesson.title}</span>
                <span className="lesson-progress-mini">
                  {p?.watched ? "done" : p?.percent ? `${p.percent}%` : ""}
                </span>
              </Link>
            );
          })}

          {node.looseDocs.map((doc) => (
            <div key={doc.id} className="doc-row" onClick={() => handleOpenDoc(doc)} style={{ cursor: "pointer" }}>
              📄 {doc.title}
            </div>
          ))}

          {node.children.map((child) => (
            <ModuleTree key={child.id} node={child} courseId={courseId} progress={progress} />
          ))}
        </div>
      )}

      {viewingDoc && <DocViewerModal doc={viewingDoc} onClose={() => setViewingDoc(null)} />}
    </div>
  );
}
