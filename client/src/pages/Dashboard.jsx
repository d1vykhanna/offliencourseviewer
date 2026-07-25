import { Link } from "react-router-dom";
import { useLibrary } from "../LibraryContext";
import CourseCard from "../components/CourseCard";
import { libraryStats, findContinueWatching, formatTime } from "../utils";

export default function Dashboard() {
  const { library, progress, loading, error } = useLibrary();

  if (loading && library.length === 0) {
    return <div className="loading-state">Scanning your courses folder…</div>;
  }

  if (error) {
    return <div className="loading-state" style={{ color: "var(--danger)" }}>{error}</div>;
  }

  if (library.length === 0) {
    return (
      <div className="empty-state">
        <p>No courses found yet. Add a course folder and hit Refresh Library.</p>
      </div>
    );
  }

  const stats = libraryStats(library, progress);
  const continueWatching = findContinueWatching(library, progress);

  return (
    <div>
      {continueWatching && (
        <Link
          to={`/course/${continueWatching.course.id}/lesson/${continueWatching.lesson.id}`}
          style={{ display: "block" }}
        >
          <div className="continue-card">
            <div className="continue-thumb">▶</div>
            <div className="continue-info">
              <div className="continue-course">Continue Learning · {continueWatching.course.title}</div>
              <div className="continue-lesson">{continueWatching.lesson.title}</div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${continueWatching.progress.percent || 0}%` }} />
              </div>
              <div className="continue-percent">
                {formatTime(continueWatching.progress.lastTime)} · {continueWatching.progress.percent || 0}% complete
              </div>
            </div>
          </div>
        </Link>
      )}

      <h2 className="section-title">Overall Progress</h2>
      <div className="stats-grid">
        <StatCard value={stats.totalCourses} label="Total Courses" />
        <StatCard value={stats.completedCourses} label="Completed Courses" />
        <StatCard value={stats.watchedVideos} label="Videos Watched" />
        <StatCard value={stats.remainingVideos} label="Videos Remaining" />
        <StatCard value={stats.hoursWatched.toFixed(1)} label="Hours Watched" />
        <StatCard value={`${stats.overallPercent}%`} label="Overall Complete" />
      </div>

      <h2 className="section-title">Course Library</h2>
      <div className="course-grid">
        {library.map((course) => (
          <CourseCard key={course.id} course={course} progress={progress} />
        ))}
      </div>
    </div>
  );
}

function StatCard({ value, label }) {
  return (
    <div className="stat-card">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
