import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { formatTime } from "../utils";
import ResourceBrowser from "./ResourceBrowser";

export default function Sidebar({ lessonId, resourceModule, getCurrentTime, onSeek, nextLesson, courseId }) {
  const [notes, setNotes] = useState("");
  const [notesStatus, setNotesStatus] = useState("");
  const [bookmarks, setBookmarks] = useState([]);
  const [bookmarkLabel, setBookmarkLabel] = useState("");
  const saveTimeout = useRef(null);

  useEffect(() => {
    api.getNotes(lessonId).then((r) => setNotes(r.text));
    api.getBookmarks(lessonId).then(setBookmarks);
    setNotesStatus("");
  }, [lessonId]);

  function handleNotesChange(e) {
    const text = e.target.value;
    setNotes(text);
    setNotesStatus("Saving…");
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      await api.saveNotes(lessonId, text);
      setNotesStatus("Saved");
    }, 600);
  }

  async function handleAddBookmark() {
    const time = getCurrentTime ? getCurrentTime() : 0;
    const updated = await api.addBookmark(lessonId, time, bookmarkLabel);
    setBookmarks(updated);
    setBookmarkLabel("");
  }

  async function handleDeleteBookmark(id) {
    const updated = await api.deleteBookmark(lessonId, id);
    setBookmarks(updated);
  }

  const resourceGroups = resourceModule?.resources || [];

  return (
    <div className="sidebar">
      {resourceGroups.length > 0 && (
        <div className="sidebar-card">
          <h3>Practice Files</h3>
          {resourceGroups.map((group) => (
            <div key={group.path} className="resource-group">
              <div className="resource-group-name">{group.folderName}</div>
              {group.categories.length > 0 ? (
                group.categories.map((cat) => (
                  <ResourceBrowser key={cat} path={`${group.path}/${cat}`} label={cat} />
                ))
              ) : (
                <ResourceBrowser path={group.path} label="Files" />
              )}
            </div>
          ))}
        </div>
      )}

      <div className="sidebar-card">
        <h3>Notes</h3>
        <textarea className="notes-area" value={notes} onChange={handleNotesChange} placeholder="Notes for this lesson… saved automatically" />
        <div className="notes-status">{notesStatus}</div>
      </div>

      <div className="sidebar-card">
        <h3>Bookmarks</h3>
        {bookmarks.length === 0 && <div style={{ fontSize: 12, color: "var(--text-muted)" }}>No bookmarks yet.</div>}
        {bookmarks.map((b) => (
          <div key={b.id} className="bookmark-row">
            <span className="bookmark-time" onClick={() => onSeek && onSeek(b.time)}>
              {formatTime(b.time)}
            </span>
            <span style={{ flex: 1, marginLeft: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {b.label}
            </span>
            <button className="bookmark-delete" onClick={() => handleDeleteBookmark(b.id)}>
              ✕
            </button>
          </div>
        ))}
        <div className="add-bookmark-row">
          <input
            placeholder="Label (optional)"
            value={bookmarkLabel}
            onChange={(e) => setBookmarkLabel(e.target.value)}
          />
          <button className="btn btn-sm" onClick={handleAddBookmark}>
            + at current time
          </button>
        </div>
      </div>

      {nextLesson && (
        <Link to={`/course/${courseId}/lesson/${nextLesson.id}`} className="btn btn-accent" style={{ justifyContent: "center" }}>
          Next Lesson: {nextLesson.title} →
        </Link>
      )}
    </div>
  );
}
