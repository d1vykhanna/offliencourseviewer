import { useEffect, useRef, useState, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { useLibrary } from "../LibraryContext";
import Sidebar from "../components/Sidebar";
import { api } from "../api";
import {
  findLessonInCourse,
  findNextLesson,
  findTopLevelModuleForLesson,
} from "../utils";

const SPEEDS = [0.5, 1, 1.25, 1.5, 2];
const COMPLETE_THRESHOLD = 0.95;

export default function PlayerPage() {
  const { courseId, lessonId } = useParams();
  const { library, progress, loading, updateLessonProgress } = useLibrary();
  const videoRef = useRef(null);
  const hasResumedRef = useRef(false);
  const [speed, setSpeed] = useState(1);

  const course = library.find((c) => c.id === courseId);
  const lesson = course ? findLessonInCourse(course, lessonId) : null;
  const resourceModule = course ? findTopLevelModuleForLesson(course, lessonId) : null;
  const nextLesson = course ? findNextLesson(course, lessonId) : null;
  const savedProgress = progress[lessonId];

  // resume playback position once metadata is loaded
  useEffect(() => {
    hasResumedRef.current = false;
  }, [lessonId]);

  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (!video || hasResumedRef.current) return;
    if (savedProgress && !savedProgress.watched && savedProgress.lastTime > 3) {
      video.currentTime = savedProgress.lastTime;
    }
    hasResumedRef.current = true;
  }, [savedProgress]);

  // periodically persist progress while playing
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !lesson) return;

    const interval = setInterval(() => {
      if (video.paused || !video.duration) return;
      const percent = Math.round((video.currentTime / video.duration) * 100);
      const watched = video.currentTime / video.duration >= COMPLETE_THRESHOLD;
      updateLessonProgress(lesson.id, {
        lastTime: video.currentTime,
        percent,
        durationSeconds: video.duration,
        watched,
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [lesson, updateLessonProgress]);

  // save progress on pause / unmount too, so short sessions aren't lost
  const handlePauseOrEnd = useCallback(() => {
    const video = videoRef.current;
    if (!video || !lesson || !video.duration) return;
    const percent = Math.round((video.currentTime / video.duration) * 100);
    const watched = video.currentTime / video.duration >= COMPLETE_THRESHOLD || video.ended;
    updateLessonProgress(lesson.id, {
      lastTime: video.currentTime,
      percent,
      durationSeconds: video.duration,
      watched,
    });
  }, [lesson, updateLessonProgress]);

  function handleSpeedChange(e) {
    const value = parseFloat(e.target.value);
    setSpeed(value);
    if (videoRef.current) videoRef.current.playbackRate = value;
  }

  function handlePiP() {
    if (videoRef.current && document.pictureInPictureEnabled) {
      videoRef.current.requestPictureInPicture().catch(() => {});
    }
  }

  function seekTo(time) {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      videoRef.current.play().catch(() => {});
    }
  }

  // keyboard shortcuts: space = play/pause, arrows = seek
  useEffect(() => {
    function onKeyDown(e) {
      if (["INPUT", "TEXTAREA"].includes(e.target.tagName)) return;
      const video = videoRef.current;
      if (!video) return;
      if (e.code === "Space") {
        e.preventDefault();
        video.paused ? video.play() : video.pause();
      } else if (e.code === "ArrowRight") {
        video.currentTime += 5;
      } else if (e.code === "ArrowLeft") {
        video.currentTime -= 5;
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  if (loading && library.length === 0) {
    return <div className="loading-state">Loading…</div>;
  }

  if (!course || !lesson) {
    return (
      <div className="empty-state">
        <p>Lesson not found. It may have moved — try refreshing the library.</p>
        <Link to="/" className="btn btn-sm" style={{ marginTop: 12, display: "inline-flex" }}>
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link to={`/course/${course.id}`} className="breadcrumb-link">
        ← {course.title}
      </Link>

      <div className="player-layout" style={{ marginTop: 14 }}>
        <div className="player-main">
          <div className="video-wrap">
            <video
              ref={videoRef}
              src={api.streamUrl(lesson.path)}
              controls
              onLoadedMetadata={handleLoadedMetadata}
              onPause={handlePauseOrEnd}
              onEnded={handlePauseOrEnd}
              key={lessonId}
            />
          </div>

          <div className="player-controls-row">
            <select className="speed-select" value={speed} onChange={handleSpeedChange}>
              {SPEEDS.map((s) => (
                <option key={s} value={s}>
                  {s}x
                </option>
              ))}
            </select>
            <button className="btn btn-sm" onClick={handlePiP}>
              ⧉ Picture-in-Picture
            </button>
          </div>

          <h1 className="lesson-heading">{lesson.title}</h1>
          <div className="lesson-breadcrumb">
            {lesson.moduleTitle} · {savedProgress?.watched ? "✔ Completed" : `${savedProgress?.percent || 0}% watched`}
          </div>
        </div>

        <Sidebar
          lessonId={lesson.id}
          resourceModule={resourceModule}
          getCurrentTime={() => videoRef.current?.currentTime || 0}
          onSeek={seekTo}
          nextLesson={nextLesson}
          courseId={course.id}
        />
      </div>
    </div>
  );
}
