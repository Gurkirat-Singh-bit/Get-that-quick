import { useState, useEffect } from "react";
import { Dashboard } from "@/pages/dashboard";
import { Onboarding } from "@/pages/onboarding";
import { applyAccent, getAccent } from "@/lib/accent";

function App() {
  const [onboarded, setOnboarded] = useState(() => {
    return localStorage.getItem("gtq_onboarded") === "true";
  });

  useEffect(() => {
    applyAccent(getAccent());
  }, []);

  const handleComplete = () => {
    localStorage.setItem("gtq_onboarded", "true");
    setOnboarded(true);
  };

  if (!onboarded) {
    return <Onboarding onComplete={handleComplete} />;
  }

  return <Dashboard />;
}

export default App;
