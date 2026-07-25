/**
 * scanner.js
 * ----------
 * Scans a root "Courses" directory. Each top-level subfolder is treated as
 * one course. Within a course, folders can nest to any depth (modules
 * containing sub-modules containing lessons, or flat modules with lessons
 * directly inside) — see project notes for why this had to be recursive.
 *
 * Each lesson/module/course gets a stable `id` derived from its path
 * relative to the Courses root, so progress data keyed by id survives
 * refreshes as long as files aren't renamed or moved.
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const VIDEO_EXTENSIONS = new Set([".mp4", ".mkv", ".mov", ".avi", ".webm"]);
const DOC_EXTENSIONS = new Set([".pdf", ".docx", ".doc", ".txt", ".pptx"]);
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

function makeId(relativePath) {
  return crypto.createHash("md5").update(relativePath).digest("hex");
}

function extractLeadingNumber(name) {
  const match = name.match(/^(\d+)[\.\-\s]+/);
  return match ? parseInt(match[1], 10) : null;
}

function stripLeadingNumber(name) {
  return name.replace(/^(\d+)[\.\-\s]+/, "").trim();
}

function cleanLessonTitle(filename) {
  const ext = path.extname(filename);
  let base = filename.slice(0, -ext.length);
  base = stripLeadingNumber(base);
  const dashIndex = base.indexOf(" - ");
  if (dashIndex !== -1) base = base.slice(0, dashIndex);
  return base.trim();
}

function cleanFolderTitle(name) {
  return stripLeadingNumber(name);
}

function normalizeForMatch(name) {
  return stripLeadingNumber(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function fuzzyMatch(a, b) {
  const na = normalizeForMatch(a);
  const nb = normalizeForMatch(b);
  if (!na || !nb) return false;
  const [shorter, longer] = na.length <= nb.length ? [na, nb] : [nb, na];
  if (longer.includes(shorter)) return true;
  const shortWords = new Set(shorter.split(" ").filter((w) => w.length > 2));
  const longWords = new Set(longer.split(" ").filter((w) => w.length > 2));
  if (shortWords.size === 0) return false;
  let overlap = 0;
  for (const w of shortWords) if (longWords.has(w)) overlap++;
  return overlap / shortWords.size >= 0.6;
}

function sortNodes(nodes) {
  return nodes.sort((a, b) => {
    if (a.order !== null && b.order !== null) return a.order - b.order;
    if (a.order !== null) return -1;
    if (b.order !== null) return 1;
    return a.title.localeCompare(b.title);
  });
}

function scanNode(nodePath, nodeName, relativeToRoot) {
  const entries = fs.readdirSync(nodePath, { withFileTypes: true });

  const lessons = [];
  const looseDocs = [];
  const children = [];

  for (const entry of entries) {
    const fullPath = path.join(nodePath, entry.name);
    const relPath = path.join(relativeToRoot, entry.name);

    if (entry.isDirectory()) {
      if (entry.name.toLowerCase() === "assets" && relativeToRoot.split(path.sep).length <= 1) {
        // handled separately at course level, skip here only at course root
        continue;
      }
      children.push(scanNode(fullPath, entry.name, relPath));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      const leadingNumber = extractLeadingNumber(entry.name);
      const id = makeId(relPath);

      if (VIDEO_EXTENSIONS.has(ext)) {
        lessons.push({
          id,
          order: leadingNumber,
          title: cleanLessonTitle(entry.name),
          filename: entry.name,
          path: fullPath,
          relPath,
        });
      } else if (DOC_EXTENSIONS.has(ext)) {
        looseDocs.push({
          id,
          order: leadingNumber,
          title: cleanLessonTitle(entry.name),
          filename: entry.name,
          path: fullPath,
          relPath,
        });
      }
    }
  }

  sortNodes(lessons);
  sortNodes(looseDocs);
  sortNodes(children);

  return {
    id: makeId(relativeToRoot),
    order: extractLeadingNumber(nodeName),
    title: cleanFolderTitle(nodeName),
    folderName: nodeName,
    path: nodePath,
    relPath: relativeToRoot,
    lessons,
    looseDocs,
    children,
    resources: [],
  };
}

function scanAssetsFolder(assetsDirPath, courseRelPath) {
  if (!assetsDirPath || !fs.existsSync(assetsDirPath)) return [];

  const entries = fs.readdirSync(assetsDirPath, { withFileTypes: true });
  const groups = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const fullPath = path.join(assetsDirPath, entry.name);
    let categories = [];
    try {
      categories = fs
        .readdirSync(fullPath, { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => e.name);
    } catch (e) {
      // unreadable, skip
    }
    groups.push({
      folderName: entry.name,
      path: fullPath,
      categories,
    });
  }
  return groups;
}

function countLessonsDeep(node) {
  let count = node.lessons.length;
  for (const child of node.children) count += countLessonsDeep(child);
  return count;
}

/** Scan a single course folder (top-level folder inside the Courses root) */
function scanCourse(courseDirPath, courseFolderName) {
  const entries = fs.readdirSync(courseDirPath, { withFileTypes: true });

  const modules = [];
  let assetsDirPath = null;

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    if (entry.name.toLowerCase() === "assets") {
      assetsDirPath = path.join(courseDirPath, entry.name);
      continue;
    }

    const fullPath = path.join(courseDirPath, entry.name);
    modules.push(scanNode(fullPath, entry.name, entry.name));
  }

  sortNodes(modules);

  const assetGroups = scanAssetsFolder(assetsDirPath, courseFolderName);
  for (const group of assetGroups) {
    const match = modules.find((m) => fuzzyMatch(m.title, group.folderName));
    if (match) match.resources.push(group);
  }

  const totalLessons = modules.reduce((sum, m) => sum + countLessonsDeep(m), 0);

  return {
    id: makeId(courseFolderName),
    title: cleanFolderTitle(courseFolderName),
    folderName: courseFolderName,
    path: courseDirPath,
    modules,
    totalLessons,
  };
}

/** Scan the whole Courses root directory: every subfolder = one course */
function scanLibrary(coursesRootPath) {
  if (!fs.existsSync(coursesRootPath)) {
    throw new Error(`Courses directory does not exist: ${coursesRootPath}`);
  }

  const entries = fs.readdirSync(coursesRootPath, { withFileTypes: true });
  const courses = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const fullPath = path.join(coursesRootPath, entry.name);
    try {
      courses.push(scanCourse(fullPath, entry.name));
    } catch (err) {
      console.error(`Failed to scan course "${entry.name}":`, err.message);
    }
  }

  return courses;
}

/** Flatten every lesson in a course into a single list, useful for search / stats */
function flattenLessons(course) {
  const out = [];
  function walk(node, modulePath) {
    for (const lesson of node.lessons) {
      out.push({ ...lesson, courseId: course.id, courseTitle: course.title, modulePath });
    }
    for (const child of node.children) {
      walk(child, [...modulePath, child.title]);
    }
  }
  for (const m of course.modules) {
    walk(m, [m.title]);
  }
  return out;
}

module.exports = {
  scanLibrary,
  scanCourse,
  flattenLessons,
  countLessonsDeep,
  makeId,
};
