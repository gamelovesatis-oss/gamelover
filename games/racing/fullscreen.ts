"use client";

type FsEl = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };
type Orient = ScreenOrientation & { lock?: (o: string) => Promise<void>; unlock?: () => void };

/** Tam ekrana geçer ve (destekleyen telefonlarda) ekranı yataya kilitler. Kullanıcı dokunuşu içinde çağrılmalı. */
export function enterFullscreenLandscape() {
  const lock = () => (screen.orientation as Orient | undefined)?.lock?.("landscape").catch(() => {});
  try {
    const el = document.documentElement as FsEl;
    if (document.fullscreenElement) return void lock();
    if (el.requestFullscreen) el.requestFullscreen({ navigationUI: "hide" }).then(lock).catch(() => {});
    else el.webkitRequestFullscreen?.();
  } catch {}
}

export function exitFullscreen() {
  try {
    (screen.orientation as Orient | undefined)?.unlock?.();
    if (document.fullscreenElement) void document.exitFullscreen();
  } catch {}
}
