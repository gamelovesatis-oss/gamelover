"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Resmi YouTube yüklemelerini gömülü oynatıcıyla çalar (YouTube'un izin verdiği yöntem).
 * Oynatıcı görünür kalmalıdır (YouTube kuralı: en az 200×200 px).
 */
export const YT_PLAYLIST = [
  { id: "pS5d77DQHOI", title: "Teriyaki Boyz – Tokyo Drift" }, // Teriyaki Boyz - Topic (Universal Music)
  { id: "tYQ1Okyi3g4", title: "2 Chainz, Wiz Khalifa – We Own It" }, // 2ChainzVEVO
];

type YTPlayer = {
  playVideo: () => void;
  pauseVideo: () => void;
  mute: () => void;
  unMute: () => void;
  setVolume: (v: number) => void;
  destroy: () => void;
};
type YTNamespace = {
  Player: new (el: HTMLElement, opts: Record<string, unknown>) => YTPlayer;
};

let apiPromise: Promise<YTNamespace> | null = null;
function loadApi(): Promise<YTNamespace> {
  const w = window as unknown as { YT?: YTNamespace & { loaded?: number }; onYouTubeIframeAPIReady?: () => void };
  if (w.YT?.Player) return Promise.resolve(w.YT);
  if (!apiPromise)
    apiPromise = new Promise((resolve) => {
      const prev = w.onYouTubeIframeAPIReady;
      w.onYouTubeIframeAPIReady = () => {
        prev?.();
        resolve(w.YT!);
      };
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(s);
    });
  return apiPromise;
}

export function YouTubeDock({ muted, className, onError }: { muted: boolean; className?: string; onError?: (msg: string) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);
  const [status, setStatus] = useState("Yükleniyor…");

  useEffect(() => {
    let alive = true;
    loadApi().then((YT) => {
      if (!alive || !host.current) return;
      const el = document.createElement("div");
      host.current.appendChild(el);
      player.current = new YT.Player(el, {
        width: "200",
        height: "200",
        videoId: YT_PLAYLIST[0].id,
        playerVars: {
          autoplay: 1,
          playsinline: 1,
          loop: 1,
          playlist: YT_PLAYLIST.map((v) => v.id).join(","),
          modestbranding: 1,
          rel: 0,
        },
        events: {
          onReady: (e: { target: YTPlayer }) => {
            e.target.setVolume(60);
            if (muted) e.target.mute();
            e.target.playVideo();
            setStatus("");
          },
          onError: (e: { data: number }) => {
            const msg = e.data === 101 || e.data === 150 ? "Bu video başka sitelerde oynatılamıyor." : "Video oynatılamadı.";
            setStatus(msg);
            onError?.(msg);
          },
        },
      });
    });
    return () => {
      alive = false;
      player.current?.destroy();
      player.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!player.current) return;
    if (muted) player.current.mute();
    else player.current.unMute();
  }, [muted]);

  return (
    <div className={cn("z-30 overflow-hidden rounded-xl border border-white/20 bg-black shadow-2xl", className)} style={{ width: 200, height: 200 }}>
      <div className="relative h-full w-full">
        <div ref={host} className="h-full w-full" />
        {status && <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-black/70 px-2 py-1 text-[10px] text-white">{status}</div>}
      </div>
    </div>
  );
}
