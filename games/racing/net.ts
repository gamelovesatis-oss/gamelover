"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/env";
import { publicClient } from "@/lib/supabase/public";
import type { CarType, Team } from "@/games/racing/engine";

export type Player = { id: string; name: string; team: Team; type: CarType; joinedAt: number; ready?: boolean };

type Handler = (payload: any) => void; // eslint-disable-line @typescript-eslint/no-explicit-any

/**
 * Supabase Realtime kanalı üzerinden oda. Her istemci kendi aracının
 * otoritesidir; oda sahibi (host) botları yönetir ve yarışı başlatır.
 */
export class RaceNet {
  online = isSupabaseConfigured;
  players: Player[] = [];
  private ch: RealtimeChannel | null = null;
  private handlers = new Map<string, Handler[]>();
  private onPlayers: (p: Player[]) => void = () => {};

  constructor(
    public room: string,
    public me: Player,
  ) {}

  on(event: string, h: Handler) {
    const list = this.handlers.get(event) ?? [];
    list.push(h);
    this.handlers.set(event, list);
  }

  onPresence(fn: (p: Player[]) => void) {
    this.onPlayers = fn;
  }

  private emitLocal(event: string, payload: unknown) {
    this.handlers.get(event)?.forEach((h) => h(payload));
  }

  async join(): Promise<boolean> {
    if (!this.online) {
      this.players = [this.me];
      this.onPlayers(this.players);
      return true;
    }
    const sb = publicClient();
    const ch = sb.channel(`gl-yaris-${this.room}`, {
      config: { broadcast: { self: false, ack: false }, presence: { key: this.me.id } },
    });
    this.ch = ch;
    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState<Player>();
      const list: Player[] = [];
      for (const key of Object.keys(state)) {
        const metas = state[key];
        if (metas?.length) list.push(metas[metas.length - 1] as unknown as Player);
      }
      list.sort((a, b) => a.joinedAt - b.joinedAt || a.id.localeCompare(b.id));
      this.players = list;
      this.onPlayers(list);
    });
    ch.on("broadcast", { event: "*" }, ({ event, payload }) => this.emitLocal(event, payload));

    return new Promise((resolve) => {
      let done = false;
      const finish = (ok: boolean) => {
        if (!done) {
          done = true;
          if (!ok) {
            // Bağlanamazsa çevrimdışı oyna.
            this.online = false;
            this.players = [this.me];
            this.onPlayers(this.players);
          }
          resolve(ok);
        }
      };
      ch.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await ch.track(this.me);
          finish(true);
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") finish(false);
      });
      setTimeout(() => finish(false), 8000);
    });
  }

  async update(me: Partial<Player>) {
    this.me = { ...this.me, ...me };
    if (this.ch && this.online) await this.ch.track(this.me);
    else {
      this.players = [this.me];
      this.onPlayers(this.players);
    }
  }

  get hostId() {
    return this.players[0]?.id ?? this.me.id;
  }

  get isHost() {
    return !this.online || this.hostId === this.me.id;
  }

  send(event: string, payload: unknown) {
    if (this.ch && this.online) void this.ch.send({ type: "broadcast", event, payload });
  }

  /** Hem odaya gönderir hem de yerelde işler. */
  sendAll(event: string, payload: unknown) {
    this.send(event, payload);
    this.emitLocal(event, payload);
  }

  leave() {
    if (this.ch) {
      void this.ch.untrack();
      void this.ch.unsubscribe();
      this.ch = null;
    }
  }
}
