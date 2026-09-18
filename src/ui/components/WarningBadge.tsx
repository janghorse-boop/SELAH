export function WarningBadge({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
      ⚠ {text}
    </div>
  );
}
