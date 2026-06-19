"use client";

import { useEffect, useState } from "react";
import { GlassContainer } from "./GlassContainer";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { pushSupported, getNotificationStatus, isSubscribed, enablePush, disablePush } from "../lib/push";

export function NotificationsCard() {
  const [supported, setSupported] = useState(true);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!pushSupported()) { setSupported(false); setEnabled(false); return; }
      const status = await getNotificationStatus();
      setBlocked(status === "denied");
      setEnabled(status === "granted" && (await isSubscribed()));
    })();
  }, []);

  const toggle = async () => {
    setError(null);
    setBusy(true);
    try {
      if (enabled) {
        await disablePush();
        setEnabled(false);
      } else {
        const ok = await enablePush();
        if (!ok) { setBlocked(true); setError("Permission denied. Enable notifications in your browser settings."); }
        setEnabled(ok);
      }
    } catch (e: any) {
      setError(e.message || "Could not change notifications");
    } finally {
      setBusy(false);
    }
  };

  return (
    <GlassContainer className="p-8 sm:p-10 flex flex-col gap-5" intensity="medium">
      <div className="flex items-start gap-4">
        <div className="w-11 h-11 rounded-full bg-rose-500/10 border border-rose-400/20 flex items-center justify-center flex-shrink-0">
          {enabled ? <Bell className="w-5 h-5 text-rose-300/70" /> : <BellOff className="w-5 h-5 text-white/40" />}
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-serif text-white/90">Message notifications</h2>
          <p className="text-xs text-white/55 leading-relaxed">
            Get notified when your partner sends a message — even when this tab is closed.
            For privacy, alerts are generic (no message text is ever sent to the notification).
          </p>
        </div>
      </div>

      {error && <p className="text-rose-400 text-xs">{error}</p>}

      {!supported ? (
        <p className="text-[11px] text-white/55 italic">
          This browser doesn't support web notifications. On iPhone, add this site to your Home Screen first.
        </p>
      ) : blocked && !enabled ? (
        <p className="text-[11px] text-amber-300/70">
          Notifications are blocked. Allow them for this site in your browser's site settings, then reload.
        </p>
      ) : (
        <button
          onClick={toggle}
          disabled={busy || enabled === null}
          className="self-start px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white/70 text-[10px] uppercase tracking-[0.2em] font-bold hover:bg-white/10 transition-all disabled:opacity-50 flex items-center gap-2"
        >
          {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {enabled ? "Turn off notifications" : "Enable notifications"}
        </button>
      )}
    </GlassContainer>
  );
}
