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
 */
function App() {
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    applyAccent(getAccent());

    // Apply saved font on mount
    const savedFont = localStorage.getItem("gtq_font") || "Inter";
    const family = savedFont === "System UI" ? "system-ui, -apple-system, sans-serif" : `"${savedFont}", system-ui, sans-serif`;
    document.documentElement.style.setProperty("--font-display", family);
    document.body.style.fontFamily = family;

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
    try {
      await api.updateSettings({ onboarding: { completed: true } });
    } catch {
      // Best-effort — server may not be reachable
    }
  };

  // Loading state while checking onboarding
  if (onboarded === null) {
    return (
      <div className="h-screen w-screen bg-background-dark flex items-center justify-center">
        <div className="text-sm text-slate-500">Loading…</div>
      </div>
    );
  }

  if (!onboarded) {
    return <Onboarding onComplete={handleComplete} />;
  }

  return <Dashboard />;
}

export default App;
