import { useEffect, useState } from "react";
import ScoreboardPage from "./pages/ScoreboardPage";
import AdminPage from "./pages/AdminPage";

type Route = "scoreboard" | "admin";

/**
 * Resolve the current route. The remote control lives at `<site>/admin`.
 * A hash form (`<site>/#/admin`) is also accepted for static hosts that
 * cannot rewrite unknown paths to index.html.
 */
function resolveRoute(): Route {
  const path = window.location.pathname.replace(/\/+$/, "").toLowerCase();
  const hash = window.location.hash.replace(/^#\/?/, "").replace(/\/+$/, "").toLowerCase();
  if (path.endsWith("/admin") || hash === "admin") return "admin";
  return "scoreboard";
}

export default function App() {
  const [route, setRoute] = useState<Route>(resolveRoute);

  useEffect(() => {
    const update = () => setRoute(resolveRoute());
    window.addEventListener("popstate", update);
    window.addEventListener("hashchange", update);
    return () => {
      window.removeEventListener("popstate", update);
      window.removeEventListener("hashchange", update);
    };
  }, []);

  useEffect(() => {
    document.title = route === "admin" ? "Remote Control · Hockey Scoreboard" : "Ice Hockey Scoreboard";
  }, [route]);

  return route === "admin" ? <AdminPage /> : <ScoreboardPage />;
}
