/**
 * @fileoverview Application root.
 *
 * Checks server settings for onboarding status and renders either
 * the onboarding wizard or the main dashboard. Applies the
 * persisted accent color on mount.
 *
 * @module App
 */

import { useState, useEffect } from "react";
import { Dashboard } from "@/pages/dashboard";
import { Onboarding } from "@/pages/onboarding";
import { applyAccent, getAccent } from "@/lib/accent";
import * as api from "@/api/client";

/**
 * Root component — switches between onboarding and dashboard.
 * Visit /onboarding to force-show the onboarding wizard.
 */
function App() {
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const [forceOnboarding, setForceOnboarding] = useState(false);

  useEffect(() => {
    applyAccent(getAccent());

    // Apply saved font on mount
    const savedFont = localStorage.getItem("gtq_font") || "Inter";
    const family = savedFont === "System UI" ? "system-ui, -apple-system, sans-serif" : `"${savedFont}", system-ui, sans-serif`;
    document.documentElement.style.setProperty("--font-display", family);
    document.body.style.fontFamily = family;

    // Allow /onboarding path to force-show wizard
    if (window.location.pathname === "/onboarding") {
      setForceOnboarding(true);
      setOnboarded(true); // skip the null/loading state
      return;
    }

    // Check server for onboarding status, fall back to localStorage
    api.getSettings()
      .then((s) => {
        const done = s.onboarding?.completed ?? false;
        setOnboarded(done || localStorage.getItem("gtq_onboarded") === "true");
      })
      .catch(() => {
        // Server unreachable — use localStorage fallback
        setOnboarded(localStorage.getItem("gtq_onboarded") === "true");
      });
  }, []);

  /** Mark onboarding as complete on both server and localStorage. */
  const handleComplete = async () => {
    localStorage.setItem("gtq_onboarded", "true");
    setOnboarded(true);
    setForceOnboarding(false);
    // Navigate back to root
    window.history.replaceState(null, "", "/");
    try {
      await api.updateSettings({ onboarding: { completed: true } });
    } catch {
      // Best-effort — server may not be reachable
    }
  };

  // Loading state while checking onboarding
  if (onboarded === null) {
    return (
      <div className="h-screen w-screen bg-background-dark flex flex-col items-center justify-center gap-4">
        <img
          src="/icon-white.png"
          alt="GetThatQuick"
          className="w-14 h-14 animate-pulse"
        />
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <svg className="w-4 h-4 animate-spin text-primary" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-20" />
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
          Loading…
        </div>
      </div>
    );
  }

  if (forceOnboarding || !onboarded) {
    return <Onboarding onComplete={handleComplete} />;
  }

  return <Dashboard />;
}

export default App;
