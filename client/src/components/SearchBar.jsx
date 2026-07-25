import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function onClickOutside(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        const r = await api.search(query.trim());
        setResults(r);
        setOpen(true);
      } catch (e) {
        // ignore search errors silently
      }
    }, 200);
    return () => clearTimeout(timeout);
  }, [query]);

  function goToLesson(lesson) {
    setOpen(false);
    setQuery("");
    navigate(`/course/${lesson.courseId}/lesson/${lesson.id}`);
  }

  return (
    <div className="search-box" ref={boxRef}>
      <input
        placeholder="Search all courses…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => query && setOpen(true)}
      />
      {open && results.length > 0 && (
        <div className="search-results">
          {results.map((r) => (
            <div key={r.id} className="search-result-item" onClick={() => goToLesson(r)}>
              <div className="search-result-title">{r.title}</div>
              <div className="search-result-meta">
                {r.courseTitle} · {r.modulePath.join(" / ")}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
