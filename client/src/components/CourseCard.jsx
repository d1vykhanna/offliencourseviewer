import { Link } from "react-router-dom";
import { courseProgress } from "../utils";

export default function CourseCard({ course, progress }) {
  const { total, percent } = courseProgress(course, progress);

  return (
    <Link to={`/course/${course.id}`} className="course-card">
      <div className="course-thumb">{total} lessons</div>
      <div className="course-card-body">
        <div className="course-card-title" title={course.title}>
          {course.title}
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${percent}%` }} />
        </div>
        <div className="course-card-percent">{percent}% complete</div>
      </div>
    </Link>
  );
}
