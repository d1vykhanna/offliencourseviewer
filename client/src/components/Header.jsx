import { Link } from "react-router-dom";
import SearchBar from "./SearchBar";
import { useLibrary } from "../LibraryContext";

export default function Header() {
  const { refresh, loading } = useLibrary();

  return (
    <div className="topbar">
      <div className="topbar-left">
        <Link to="/" className="brand">
          <span className="brand-mark" />
          Offline Academy
        </Link>
        <SearchBar />
      </div>
      <button className="btn btn-sm" onClick={refresh} disabled={loading}>
        {loading ? "Scanning…" : "↻ Refresh Library"}
      </button>
    </div>
  );
}
