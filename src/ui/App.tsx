import { WorshipScreen } from "./screens/WorshipScreen";
import { DEFAULT_SETTINGS } from "../storage/settings";

export default function App() {
  return <WorshipScreen settings={DEFAULT_SETTINGS} onExit={() => {}} />;
}
