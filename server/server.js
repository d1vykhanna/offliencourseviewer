const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const mammoth = require("mammoth");

const { scanLibrary, flattenLessons } = require("./scanner");

const app = express();
app.use(cors());
app.use(express.json());

const DATA_DIR = path.join(__dirname, "data");
const CONFIG_FILE = path.join(DATA_DIR, "config.json");
const PROGRESS_FILE = path.join(DATA_DIR, "progress.json");
const NOTES_FILE = path.join(DATA_DIR, "notes.json");
const BOOKMARKS_FILE = path.join(DATA_DIR, "bookmarks.json");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ---------- tiny JSON persistence helpers ----------

function readJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch (e) {
    console.error(`Failed to read ${file}:`, e.message);
    return fallback;
  }
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
}

// ---------- in-memory cache of the scanned library ----------

let libraryCache = null;

function getCoursesRoot() {
  const config = readJson(CONFIG_FILE, {});
  return config.coursesRoot || null;
}

function rescan() {
  const coursesRoot = getCoursesRoot();
  if (!coursesRoot) {
    libraryCache = [];
    return libraryCache;
  }
  libraryCache = scanLibrary(coursesRoot);
  return libraryCache;
}

/** Ensure a filesystem path the client sent is actually inside the configured Courses root */
function isPathSafe(targetPath) {
  const coursesRoot = getCoursesRoot();
  if (!coursesRoot) return false;
  const resolvedRoot = path.resolve(coursesRoot);
  const resolvedTarget = path.resolve(targetPath);
  return resolvedTarget.startsWith(resolvedRoot);
}

// ---------- config ----------

app.get("/api/config", (req, res) => {
  res.json(readJson(CONFIG_FILE, {}));
});

app.post("/api/config", (req, res) => {
  const { coursesRoot } = req.body;
  if (!coursesRoot || !fs.existsSync(coursesRoot)) {
    return res.status(400).json({ error: "That folder path doesn't exist on this machine." });
  }
  writeJson(CONFIG_FILE, { coursesRoot });
  rescan();
  res.json({ coursesRoot });
});

// ---------- library ----------

app.get("/api/library", (req, res) => {
  if (!getCoursesRoot()) return res.status(400).json({ error: "No courses folder configured yet." });
  if (!libraryCache) rescan();
  res.json(libraryCache);
});

app.post("/api/library/refresh", (req, res) => {
  if (!getCoursesRoot()) return res.status(400).json({ error: "No courses folder configured yet." });
  try {
    rescan();
    res.json(libraryCache);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/search", (req, res) => {
  const q = (req.query.q || "").toLowerCase().trim();
  if (!q) return res.json([]);
  if (!libraryCache) rescan();

  const results = [];
  for (const course of libraryCache) {
    const flat = flattenLessons(course);
    for (const lesson of flat) {
      if (lesson.title.toLowerCase().includes(q)) {
        results.push(lesson);
      }
    }
  }
  res.json(results.slice(0, 50));
});

// ---------- video streaming (supports range requests for seeking) ----------

app.get("/api/stream", (req, res) => {
  const filePath = req.query.path;
  if (!filePath || !isPathSafe(filePath) || !fs.existsSync(filePath)) {
    return res.status(404).send("File not found");
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (!range) {
    res.writeHead(200, {
      "Content-Length": fileSize,
      "Content-Type": "video/mp4",
    });
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  const parts = range.replace(/bytes=/, "").split("-");
  const start = parseInt(parts[0], 10);
  const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
  const chunkSize = end - start + 1;

  res.writeHead(206, {
    "Content-Range": `bytes ${start}-${end}/${fileSize}`,
    "Accept-Ranges": "bytes",
    "Content-Length": chunkSize,
    "Content-Type": "video/mp4",
  });
  fs.createReadStream(filePath, { start, end }).pipe(res);
});

// ---------- progress ----------

app.get("/api/progress", (req, res) => {
  res.json(readJson(PROGRESS_FILE, {}));
});

app.post("/api/progress/:lessonId", (req, res) => {
  const progress = readJson(PROGRESS_FILE, {});
  const { lastTime, percent, watched, durationSeconds } = req.body;

  progress[req.params.lessonId] = {
    ...progress[req.params.lessonId],
    lastTime: lastTime ?? progress[req.params.lessonId]?.lastTime ?? 0,
    percent: percent ?? progress[req.params.lessonId]?.percent ?? 0,
    durationSeconds: durationSeconds ?? progress[req.params.lessonId]?.durationSeconds ?? 0,
    watched: watched ?? progress[req.params.lessonId]?.watched ?? false,
    updatedAt: Date.now(),
  };

  writeJson(PROGRESS_FILE, progress);
  res.json(progress[req.params.lessonId]);
});

// ---------- notes ----------

app.get("/api/notes/:lessonId", (req, res) => {
  const notes = readJson(NOTES_FILE, {});
  res.json({ text: notes[req.params.lessonId] || "" });
});

app.post("/api/notes/:lessonId", (req, res) => {
  const notes = readJson(NOTES_FILE, {});
  notes[req.params.lessonId] = req.body.text || "";
  writeJson(NOTES_FILE, notes);
  res.json({ text: notes[req.params.lessonId] });
});

// ---------- bookmarks ----------

app.get("/api/bookmarks/:lessonId", (req, res) => {
  const bookmarks = readJson(BOOKMARKS_FILE, {});
  res.json(bookmarks[req.params.lessonId] || []);
});

app.post("/api/bookmarks/:lessonId", (req, res) => {
  const bookmarks = readJson(BOOKMARKS_FILE, {});
  const list = bookmarks[req.params.lessonId] || [];
  const newBookmark = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    time: req.body.time,
    label: req.body.label || "",
  };
  list.push(newBookmark);
  list.sort((a, b) => a.time - b.time);
  bookmarks[req.params.lessonId] = list;
  writeJson(BOOKMARKS_FILE, bookmarks);
  res.json(list);
});

app.delete("/api/bookmarks/:lessonId/:bookmarkId", (req, res) => {
  const bookmarks = readJson(BOOKMARKS_FILE, {});
  const list = (bookmarks[req.params.lessonId] || []).filter((b) => b.id !== req.params.bookmarkId);
  bookmarks[req.params.lessonId] = list;
  writeJson(BOOKMARKS_FILE, bookmarks);
  res.json(list);
});

// ---------- in-browser document preview ----------

const RAW_PREVIEW_CONTENT_TYPES = {
  ".pdf": "application/pdf",
  ".txt": "text/plain; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

// Converts a .docx file to HTML so it can be shown inline in the browser
// instead of shelling out to open it in Word.
app.get("/api/doc-view/docx", async (req, res) => {
  const filePath = req.query.path;
  if (!filePath || !isPathSafe(filePath) || !fs.existsSync(filePath)) {
    return res.status(404).json({ error: "File not found" });
  }
  if (path.extname(filePath).toLowerCase() !== ".docx") {
    return res.status(400).json({ error: "Only .docx files are supported for preview." });
  }

  try {
    const result = await mammoth.convertToHtml({ path: filePath });
    res.json({ html: result.value, warnings: result.messages.map((m) => m.message) });
  } catch (e) {
    console.error("Failed to convert docx:", e.message);
    res.status(500).json({ error: "Couldn't read this document. It may be corrupted or password-protected." });
  }
});

// Serves a raw file with a real content-type — used for in-browser PDF/text/image
// preview (the browser's own PDF viewer handles the rest via an <iframe>/<embed>).
app.get("/api/doc-view/raw", (req, res) => {
  const filePath = req.query.path;
  if (!filePath || !isPathSafe(filePath) || !fs.existsSync(filePath)) {
    return res.status(404).send("File not found");
  }
  const ext = path.extname(filePath).toLowerCase();
  const contentType = RAW_PREVIEW_CONTENT_TYPES[ext];
  if (!contentType) {
    return res.status(400).send("Unsupported file type for raw preview");
  }
  res.setHeader("Content-Type", contentType);
  fs.createReadStream(filePath).pipe(res);
});

// ---------- browsing a folder's contents (for in-browser Practice Files) ----------

app.get("/api/list-folder", (req, res) => {
  const dirPath = req.query.path;
  if (!dirPath || !isPathSafe(dirPath) || !fs.existsSync(dirPath)) {
    return res.status(404).json({ error: "Folder not found" });
  }

  let stat;
  try {
    stat = fs.statSync(dirPath);
  } catch (e) {
    return res.status(404).json({ error: "Folder not found" });
  }
  if (!stat.isDirectory()) {
    return res.status(400).json({ error: "That path isn't a folder." });
  }

  try {
    const entries = fs
      .readdirSync(dirPath, { withFileTypes: true })
      .filter((e) => !e.name.startsWith("."))
      .map((e) => ({
        name: e.name,
        path: path.join(dirPath, e.name),
        isDir: e.isDirectory(),
        ext: e.isDirectory() ? null : path.extname(e.name).toLowerCase(),
      }))
      .sort((a, b) => {
        if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
        return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
      });
    res.json(entries);
  } catch (e) {
    console.error("Failed to list folder:", e.message);
    res.status(500).json({ error: "Couldn't read this folder." });
  }
});

// ---------- opening files / folders in the OS ----------

function openInOS(targetPath, res) {
  if (!isPathSafe(targetPath) || !fs.existsSync(targetPath)) {
    return res.status(404).json({ error: "Path not found" });
  }

  let cmd;
  if (process.platform === "win32") {
    cmd = `start "" "${targetPath}"`;
  } else if (process.platform === "darwin") {
    cmd = `open "${targetPath}"`;
  } else {
    cmd = `xdg-open "${targetPath}"`;
  }

  exec(cmd, { shell: process.platform === "win32" ? "cmd.exe" : undefined }, (err) => {
    if (err) {
      console.error("Failed to open path:", err.message);
      return res.status(500).json({ error: "Failed to open path on this system." });
    }
    res.json({ ok: true });
  });
}

app.post("/api/open-folder", (req, res) => {
  openInOS(req.body.path, res);
});

app.post("/api/open-file", (req, res) => {
  openInOS(req.body.path, res);
});

// ---------- start ----------

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Course platform backend running at http://localhost:${PORT}`);
  if (getCoursesRoot()) {
    console.log(`Watching courses folder: ${getCoursesRoot()}`);
    rescan();
  } else {
    console.log("No courses folder configured yet — set it from the app's setup screen.");
  }
});
