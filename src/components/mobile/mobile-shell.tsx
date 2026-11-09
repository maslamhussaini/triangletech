"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { tools } from "@/lib/tools";
import {
  getFavorites,
  getRecent,
  isNativeApp,
  recordRecent,
  toggleFavorite,
} from "@/lib/mobile/capacitor";

/**
 * Mobile app shell — renders ONLY inside the Capacitor native shell.
 *
 * On the web (`window.Capacitor` absent) this component renders nothing and
 * registers no listeners, so the production website is behaviourally
 * unchanged. Inside the app it provides:
 * - Android back button: close the open panel first, else go back in the
 *   WebView history, else exit the app (Capacitor App plugin).
 * - Offline banner: calculators work offline; chat / live exchange rates /
 *   demo requests need internet (navigator.onLine).
 * - Bottom tab bar: Tools (dashboard), Favourites, Recent — with search.
 * - Favourites + recently-used, persisted via Capacitor Preferences
 *   (localStorage fallback). Visiting a tool records it as recently used.
 * - Safe-area handling is CSS (`env(safe-area-inset-*)`, see
 *   mobile-shell.css); StatusBar is style-only (on Android 16 overlay /
 *   background-colour calls are no-ops — edge-to-edge is enforced).
 * - The chat launcher is hidden in-app via CSS: /api/chat has no server
 *   in the bundle, so the button would only ever show an error. The panel
 *   says so explicitly instead of offering a dead button.
 */
type Panel = "none" | "favorites" | "recent";

const LIVE_TOOLS = tools.filter((t) => t.status === "live");

export default function MobileShell() {
  const [active, setActive] = useState(false);
  const [online, setOnline] = useState(true);
  const [panel, setPanel] = useState<Panel>("none");
  const [query, setQuery] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const panelRef = useRef(panel);
  panelRef.current = panel;

  useEffect(() => {
    if (!isNativeApp()) return;
    setActive(true);
    setOnline(navigator.onLine);
    void getFavorites().then(setFavorites);
    void getRecent().then(setRecent);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    document.body.classList.add("capacitor-app");

    // Record the tool being viewed as recently used.
    const match = window.location.pathname.match(/^\/tools\/([^/]+)\/?$/);
    if (match) void recordRecent(match[1]).then(() => getRecent().then(setRecent));

    let removeBack: (() => void) | undefined;
    let removeState: (() => void) | undefined;
    void (async () => {
      try {
        const { App } = await import("@capacitor/app");
        const back = await App.addListener("backButton", ({ canGoBack }) => {
          if (panelRef.current !== "none") {
            setPanel("none");
            return;
          }
          if (canGoBack) window.history.back();
          else void App.exitApp();
        });
        removeBack = () => void back.remove();
        const state = await App.addListener("appStateChange", ({ isActive }) => {
          // Resume: the WebView state is preserved by the OS; nothing to
          // reload. Re-check connectivity, which may have changed while
          // the app was backgrounded.
          if (isActive) setOnline(navigator.onLine);
        });
        removeState = () => void state.remove();
      } catch {
        /* App plugin unavailable (e.g. web preview): back button stays default */
      }
      try {
        const { StatusBar, Style } = await import("@capacitor/status-bar");
        await StatusBar.setStyle({ style: Style.Light });
      } catch {
        /* Android 16: style is best-effort; overlay/background calls are not attempted */
      }
      try {
        const { Keyboard, KeyboardResize } = await import("@capacitor/keyboard");
        await Keyboard.setResizeMode({ mode: KeyboardResize.Body });
      } catch {
        /* keyboard stays at OS default */
      }
    })();
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      document.body.classList.remove("capacitor-app");
      removeBack?.();
      removeState?.();
    };
  }, []);

  const onToggleFavorite = useCallback(async (slug: string) => {
    setFavorites(await toggleFavorite(slug));
  }, []);

  if (!active) return null;

  const q = query.trim().toLowerCase();
  const filtered = LIVE_TOOLS.filter(
    (t) => !q || t.name.toLowerCase().includes(q) || t.shortDescription.toLowerCase().includes(q),
  );
  const panelTools =
    panel === "favorites"
      ? filtered.filter((t) => favorites.includes(t.slug))
      : panel === "recent"
        ? filtered.filter((t) => recent.includes(t.slug))
        : filtered;
  const panelTitle = panel === "favorites" ? "Favourites" : panel === "recent" ? "Recently used" : "All tools";

  return (
    <>
      {!online && (
        <div className="mobile-offline-banner" role="status">
          You’re offline — calculators work offline. Chat, live exchange rates and demo requests need internet.
        </div>
      )}
      {panel !== "none" && (
        <div className="mobile-panel" role="dialog" aria-label={panelTitle}>
          <div className="mobile-panel-head">
            <strong>{panelTitle}</strong>
            <button type="button" className="mobile-panel-close" onClick={() => setPanel("none")} aria-label="Close panel">
              ✕
            </button>
          </div>
          <input
            className="mobile-panel-search"
            type="search"
            inputMode="search"
            placeholder="Search tools…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search tools"
          />
          {panelTools.length === 0 ? (
            <p className="mobile-panel-empty">
              {panel === "favorites"
                ? "No favourites yet — tap ☆ on a tool to pin it here."
                : panel === "recent"
                  ? "No tools used yet in this app."
                  : "No tools match that search."}
            </p>
          ) : (
            <ul className="mobile-panel-list">
              {panelTools.map((t) => (
                <li key={t.slug} className="mobile-panel-item">
                  <a href={`/tools/${t.slug}`} onClick={() => setPanel("none")}>
                    <span className="mobile-panel-name">{t.name}</span>
                    <span className="mobile-panel-desc">{t.shortDescription}</span>
                  </a>
                  <button
                    type="button"
                    className="mobile-fav-btn"
                    aria-label={favorites.includes(t.slug) ? `Remove ${t.name} from favourites` : `Add ${t.name} to favourites`}
                    aria-pressed={favorites.includes(t.slug)}
                    onClick={() => void onToggleFavorite(t.slug)}
                  >
                    {favorites.includes(t.slug) ? "★" : "☆"}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="mobile-panel-note">
            Chat and demo requests aren’t available in the app — they need the TriangleTech website.
            Your calculations never leave this device.
          </p>
        </div>
      )}
      <nav className="mobile-tabbar" aria-label="App navigation">
        <a href="/tools" onClick={() => setPanel("none")}>Tools</a>
        <button type="button" onClick={() => setPanel(panel === "favorites" ? "none" : "favorites")} aria-expanded={panel === "favorites"}>
          Favourites{ favorites.length > 0 ? ` (${favorites.length})` : ""}
        </button>
        <button type="button" onClick={() => setPanel(panel === "recent" ? "none" : "recent")} aria-expanded={panel === "recent"}>
          Recent
        </button>
      </nav>
    </>
  );
}
