import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { Wifi, WifiOff } from "lucide-react";

export function OnlineStatusBadge() {
  const isOnline = useOnlineStatus();
  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
      isOnline 
        ? "bg-success/10 text-success" 
        : "bg-destructive/10 text-destructive"
    }`}>
      {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
      {isOnline ? "Online" : "Offline"}
    </div>
  );
}
