import { Link, useParams } from "react-router-dom";
import { useLibrary } from "../LibraryContext";
import ModuleTree from "../components/ModuleTree";
import { courseProgress } from "../utils";

export default function CoursePage() {
  const { courseId } = useParams();
  const { library, progress, loading } = useLibrary();

  if (loading && library.length === 0) {
    return <div className="loading-state">Loading…</div>;
  }

  const course = library.find((c) => c.id === courseId);
  if (!course) {
    return (
      <div className="empty-state">
        <p>Course not found. It may have been removed — try refreshing the library.</p>
        <Link to="/" className="btn btn-sm" style={{ marginTop: 12, display: "inline-flex" }}>
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const { percent, watched, total } = courseProgress(course, progress);

  return (
    <div>
      <Link to="/" className="breadcrumb-link">
        ← Dashboard
      </Link>
      <h1 style={{ fontSize: 24, margin: "10px 0 6px 0" }}>{course.title}</h1>
      <div style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 20, fontFamily: "var(--mono)" }}>
        {watched}/{total} lessons · {percent}% complete
      </div>
      <div className="progress-track" style={{ marginBottom: 28, maxWidth: 400 }}>
        <div className="progress-fill" style={{ width: `${percent}%` }} />
      </div>

      <div className="module-tree">
        {course.modules.map((module, i) => (
          <ModuleTree key={module.id} node={module} courseId={course.id} progress={progress} defaultOpen={i === 0} />
        ))}
      </div>
    </div>
  );
}
