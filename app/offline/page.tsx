import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
      <WifiOff className="size-8 text-muted-foreground" />
      <h1 className="text-xl font-semibold">You&apos;re offline</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        BUDGY needs a connection to load your data. If you already had the app open, quick-add
        still works — entries are queued and sync automatically once you&apos;re back online.
      </p>
    </div>
  );
}
