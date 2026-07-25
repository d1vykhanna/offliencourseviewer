import { useState } from "react";
import { useLibrary } from "../LibraryContext";

export default function Setup() {
  const { setCoursesRoot } = useLibrary();
  const [path, setPath] = useState("");
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!path.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await setCoursesRoot(path.trim());
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="setup-screen">
      <div className="ambient-glow ambient-glow-a" aria-hidden="true" />
      <div className="ambient-glow ambient-glow-b" aria-hidden="true" />
      <div className="setup-card">
        <h1>Point this at your courses folder</h1>
        <p>
          Give the full path to the folder that contains your course subfolders — e.g.{" "}
          <code>D:\Courses</code>. Each subfolder inside it will be treated as one course.
        </p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="D:\Courses"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            autoFocus
          />
          {error && <div className="setup-error">{error}</div>}
          <button type="submit" className="btn btn-accent" disabled={saving} style={{ width: "100%", justifyContent: "center" }}>
            {saving ? "Scanning…" : "Save & Scan"}
          </button>
        </form>
      </div>
    </div>
  );
}
