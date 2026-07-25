import { Routes, Route } from "react-router-dom";
import { LibraryProvider, useLibrary } from "./LibraryContext";
import Header from "./components/Header";
import Setup from "./pages/Setup";
import Dashboard from "./pages/Dashboard";
import CoursePage from "./pages/CoursePage";
import PlayerPage from "./pages/PlayerPage";

function Shell() {
  const { configured } = useLibrary();

  if (configured === null) {
    return <div className="loading-state">Starting up…</div>;
  }

  if (configured === false) {
    return <Setup />;
  }

  return (
    <div className="app-shell">
      <div className="ambient-glow ambient-glow-a" aria-hidden="true" />
      <div className="ambient-glow ambient-glow-b" aria-hidden="true" />
      <div className="ambient-glow ambient-glow-c" aria-hidden="true" />
      <Header />
      <div className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/course/:courseId" element={<CoursePage />} />
          <Route path="/course/:courseId/lesson/:lessonId" element={<PlayerPage />} />
          <Route path="/setup" element={<Setup />} />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <LibraryProvider>
      <Shell />
    </LibraryProvider>
  );
}
