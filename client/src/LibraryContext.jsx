import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "./api";

const LibraryContext = createContext(null);

export function LibraryProvider({ children }) {
  const [configured, setConfigured] = useState(null); // null = loading, false = not set, string = path
  const [library, setLibrary] = useState([]);
  const [progress, setProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const config = await api.getConfig();
      if (!config.coursesRoot) {
        setConfigured(false);
        setLoading(false);
        return;
      }
      setConfigured(config.coursesRoot);
      const [lib, prog] = await Promise.all([api.getLibrary(), api.getProgress()]);
      setLibrary(lib);
      setProgress(prog);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const lib = await api.refreshLibrary();
      setLibrary(lib);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const setCoursesRoot = useCallback(
    async (path) => {
      const result = await api.setConfig(path);
      setConfigured(result.coursesRoot);
      await loadAll();
    },
    [loadAll]
  );

  const updateLessonProgress = useCallback(async (lessonId, data) => {
    const saved = await api.updateProgress(lessonId, data);
    setProgress((prev) => ({ ...prev, [lessonId]: saved }));
  }, []);

  return (
    <LibraryContext.Provider
      value={{
        configured,
        library,
        progress,
        loading,
        error,
        refresh,
        setCoursesRoot,
        updateLessonProgress,
      }}
    >
      {children}
    </LibraryContext.Provider>
  );
}

export function useLibrary() {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error("useLibrary must be used inside LibraryProvider");
  return ctx;
}
