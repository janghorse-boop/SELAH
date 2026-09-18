import { RehearsalScreen } from "./screens/RehearsalScreen";
import { DEFAULT_SETTINGS } from "../storage/settings";

export default function App() {
  return <RehearsalScreen settings={DEFAULT_SETTINGS} onExit={() => {}} />;
}
