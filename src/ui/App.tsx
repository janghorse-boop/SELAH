import { GuideScreen } from "./screens/GuideScreen";

export default function App() {
  return <GuideScreen onOpenRta={(r) => alert(`RTA 로 ${r[0]}~${r[1]}Hz`)} onExit={() => {}} />;
}
