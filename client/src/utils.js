/** Recursively walk a module/section node, returning every lesson in order. */
export function flattenLessons(node) {
  let out = [...node.lessons.map((l) => ({ ...l, moduleTitle: node.title }))];
  for (const child of node.children) {
    out = out.concat(flattenLessons(child));
  }
  return out;
}

export function flattenCourseLessons(course) {
  let out = [];
  for (const module of course.modules) {
    out = out.concat(flattenLessons(module));
  }
  return out;
}

export function courseProgress(course, progressMap) {
  const lessons = flattenCourseLessons(course);
  const total = lessons.length;
  const watched = lessons.filter((l) => progressMap[l.id]?.watched).length;
  const percent = total === 0 ? 0 : Math.round((watched / total) * 100);
  return { total, watched, percent };
}

export function libraryStats(library, progressMap) {
  let totalVideos = 0;
  let watchedVideos = 0;
  let totalSeconds = 0;
  let watchedSeconds = 0;
  let completedCourses = 0;

  for (const course of library) {
    const lessons = flattenCourseLessons(course);
    totalVideos += lessons.length;
    let courseWatched = 0;
    for (const lesson of lessons) {
      const p = progressMap[lesson.id];
      const duration = p?.durationSeconds || 0;
      totalSeconds += duration;
      if (p?.watched) {
        watchedVideos++;
        courseWatched++;
        watchedSeconds += duration;
      } else if (p?.lastTime) {
        watchedSeconds += p.lastTime;
      }
    }
    if (lessons.length > 0 && courseWatched === lessons.length) completedCourses++;
  }

  return {
    totalCourses: library.length,
    completedCourses,
    totalVideos,
    watchedVideos,
    remainingVideos: totalVideos - watchedVideos,
    hoursWatched: watchedSeconds / 3600,
    hoursRemaining: Math.max(0, (totalSeconds - watchedSeconds) / 3600),
    overallPercent: totalVideos === 0 ? 0 : Math.round((watchedVideos / totalVideos) * 100),
  };
}

/** Find the most recently updated in-progress lesson across the whole library */
export function findContinueWatching(library, progressMap) {
  let best = null;
  for (const course of library) {
    const lessons = flattenCourseLessons(course);
    for (const lesson of lessons) {
      const p = progressMap[lesson.id];
      if (!p || p.watched) continue;
      if (!p.updatedAt) continue;
      if (!best || p.updatedAt > best.progress.updatedAt) {
        best = { course, lesson, progress: p };
      }
    }
  }
  return best;
}

export function findNextLesson(course, currentLessonId) {
  const lessons = flattenCourseLessons(course);
  const idx = lessons.findIndex((l) => l.id === currentLessonId);
  if (idx === -1 || idx === lessons.length - 1) return null;
  return lessons[idx + 1];
}

export function formatTime(seconds) {
  if (!seconds || Number.isNaN(seconds)) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Find a lesson by id anywhere in a course's module tree */
export function findLessonInCourse(course, lessonId) {
  return flattenCourseLessons(course).find((l) => l.id === lessonId) || null;
}

/** Given a lesson id, find which TOP-LEVEL module (course.modules entry) contains it — used for resource matching */
export function findTopLevelModuleForLesson(course, lessonId) {
  for (const module of course.modules) {
    const lessons = flattenLessons(module);
    if (lessons.some((l) => l.id === lessonId)) return module;
  }
  return null;
}

export function findModuleById(course, moduleId) {
  function search(nodes) {
    for (const node of nodes) {
      if (node.id === moduleId) return node;
      const found = search(node.children);
      if (found) return found;
    }
    return null;
  }
  return search(course.modules);
}
