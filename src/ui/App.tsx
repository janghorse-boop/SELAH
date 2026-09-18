import { useState } from "react";
import { StartScreen } from "./screens/StartScreen";
import { RehearsalScreen } from "./screens/RehearsalScreen";
import { WorshipScreen } from "./screens/WorshipScreen";
import { GuideScreen } from "./screens/GuideScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { HistoryScreen } from "./screens/HistoryScreen";
import { AboutScreen } from "./screens/AboutScreen";
import { loadSettings } from "../storage/settings";

type Route = "start" | "rehearsal" | "worship" | "guide" | "settings" | "history" | "about";

export default function App() {
  const [route, setRoute] = useState<Route>("start");
  const [settings, setSettings] = useState(() => loadSettings());
  const [highlight, setHighlight] = useState<[number, number] | null>(null);

  const home = () => {
    setHighlight(null);
    setRoute("start");
  };

  switch (route) {
    case "rehearsal":
      return <RehearsalScreen settings={settings} onExit={home} highlightRange={highlight} />;
    case "worship":
      return <WorshipScreen settings={settings} onExit={home} />;
    case "guide":
      return (
        <GuideScreen
          onExit={home}
          onOpenRta={(range) => {
            setHighlight(range);
            setRoute("rehearsal");
          }}
        />
      );
    case "settings":
      return <SettingsScreen settings={settings} onChange={setSettings} onExit={home} />;
    case "history":
      return <HistoryScreen onExit={home} />;
    case "about":
      return <AboutScreen onExit={home} />;
    default:
      return <StartScreen go={setRoute} />;
  }
}
