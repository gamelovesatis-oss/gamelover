"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Copy, ExternalLink, Eye, EyeOff, ImagePlus, Loader2, Pencil, Plus, Search, Share2, Star, Trash2, X } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { deleteItem, saveItem, toggleField } from "@/app/admin/actions";
import { SmartImage } from "@/components/ui";
import { TABLES, type Field } from "@/lib/adminConfig";
import { SITE_URL } from "@/lib/env";
import { cn } from "@/lib/utils";

type Row = Record<string, unknown> & { id: string };

/** ISO tarihini datetime-local için Türkiye saatine çevirir. */
function toLocalInput(v: unknown) {
  if (!v) return "";
  const d = new Date(String(v));
  const p = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(d);
  return p.replace(" ", "T");
}

export function ContentManager({ tableKey, rows }: { tableKey: string; rows: Row[] }) {
  const cfg = TABLES[tableKey];
  const [editing, setEditing] = useState<Row | "new" | null>(null);
  const [q, setQ] = useState("");
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const show = (ok: boolean, text: string) => {
    setToast({ ok, text });
    setTimeout(() => setToast(null), 3500);
  };

  const list = useMemo(() => {
    const t = q.toLocaleLowerCase("tr");
    return rows.filter((r) => !t || String(r[cfg.titleField]).toLocaleLowerCase("tr").includes(t));
  }, [rows, q, cfg.titleField]);

  const hasFeatured = cfg.fields.some((f) => f.name === "featured");

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">{cfg.title}</h1>
          <p className="text-sm text-slate-400">{rows.length} kayıt</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ara…" className="input w-48 py-2.5 pl-9" />
          </div>
          <button onClick={() => setEditing("new")} className="btn-primary">
            <Plus className="h-4 w-4" /> Yeni {cfg.singular}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {list.map((r) => (
          <motion.div layout key={r.id} className={cn("glass flex items-center gap-4 rounded-2xl p-3 pr-4", !r.active && "opacity-50")}>
            <SmartImage src={r.image_url as string} alt="" className="h-16 w-16 shrink-0 rounded-xl sm:h-20 sm:w-28" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="truncate font-semibold text-white">{String(r[cfg.titleField])}</h3>
                {Boolean(r.featured) && <Star className="h-4 w-4 shrink-0 fill-neon-amber text-neon-amber" />}
              </div>
              <p className="truncate text-sm text-slate-400">{cfg.subtitle?.(r)}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {hasFeatured && (
                <IconBtn title={r.featured ? "Vitrinden kaldır" : "Vitrine ekle"} onClick={() => start(async () => void (await toggleField(tableKey, r.id, "featured", !r.featured)))}>
                  <Star className={cn("h-4 w-4", r.featured ? "fill-neon-amber text-neon-amber" : "")} />
                </IconBtn>
              )}
              <IconBtn title={r.active ? "Yayından kaldır" : "Yayınla"} onClick={() => start(async () => void (await toggleField(tableKey, r.id, "active", !r.active)))}>
                {r.active ? <Eye className="h-4 w-4 text-neon-lime" /> : <EyeOff className="h-4 w-4" />}
              </IconBtn>
              <ShareMenu url={SITE_URL + cfg.publicPath(r)} text={String(r[cfg.titleField])} onCopied={() => show(true, "Paylaşım metni kopyalandı — Instagram'a yapıştırabilirsin.")} description={String(r.description ?? r.subtitle ?? "")} />
              <IconBtn title="Düzenle" onClick={() => setEditing(r)}>
                <Pencil className="h-4 w-4" />
              </IconBtn>
              <IconBtn
                title="Sil"
                danger
                onClick={() => {
                  if (!confirm(`"${r[cfg.titleField]}" silinsin mi? Bu işlem geri alınamaz.`)) return;
                  start(async () => {
                    const res = await deleteItem(tableKey, r.id);
                    show(res.ok, res.ok ? "Silindi." : res.error!);
                  });
                }}
              >
                <Trash2 className="h-4 w-4" />
              </IconBtn>
            </div>
          </motion.div>
        ))}
        {list.length === 0 && <div className="glass rounded-2xl p-10 text-center text-slate-400">Henüz kayıt yok.</div>}
      </div>

      <AnimatePresence>
        {editing && (
          <EditModal
            tableKey={tableKey}
            row={editing === "new" ? null : editing}
            onClose={() => setEditing(null)}
            onSaved={(m) => {
              setEditing(null);
              show(true, m);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(toast || pending) && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className={cn(
              "fixed bottom-6 right-6 z-[80] flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium shadow-2xl",
              pending ? "bg-ink-700 text-white" : toast?.ok ? "bg-neon-lime text-ink-950" : "bg-red-500 text-white",
            )}
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {pending ? "Kaydediliyor…" : toast?.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function IconBtn({ children, title, onClick, danger }: { children: React.ReactNode; title: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={cn("grid h-9 w-9 place-items-center rounded-lg text-slate-400 transition", danger ? "hover:bg-red-500/20 hover:text-red-300" : "hover:bg-white/10 hover:text-white")}
    >
      {children}
    </button>
  );
}

function ShareMenu({ url, text, description, onCopied }: { url: string; text: string; description: string; onCopied: () => void }) {
  const [open, setOpen] = useState(false);
  const e = encodeURIComponent;
  const caption = `${text}\n\n${description}\n\n👉 ${url}\n\n#GameLover #Çorum #oyun #playstation #gaming`;
  return (
    <div className="relative">
      <IconBtn title="Sosyal medyada paylaş" onClick={() => setOpen((o) => !o)}>
        <Share2 className="h-4 w-4" />
      </IconBtn>
      {open && (
        <div className="absolute right-0 top-10 z-30 w-56 rounded-xl border border-white/10 bg-ink-800 p-1.5 shadow-2xl" onMouseLeave={() => setOpen(false)}>
          {[
            ["Facebook", `https://www.facebook.com/sharer/sharer.php?u=${e(url)}`],
            ["X (Twitter)", `https://twitter.com/intent/tweet?text=${e(text)}&url=${e(url)}`],
            ["WhatsApp", `https://wa.me/?text=${e(`${text} ${url}`)}`],
            ["Telegram", `https://t.me/share/url?url=${e(url)}&text=${e(text)}`],
          ].map(([l, h]) => (
            <a key={l} href={h} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/10 hover:text-white">
              {l} <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ))}
          <button
            onClick={async () => {
              await navigator.clipboard.writeText(caption);
              setOpen(false);
              onCopied();
            }}
            className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/10 hover:text-white"
          >
            Instagram / TikTok metni <Copy className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

function EditModal({ tableKey, row, onClose, onSaved }: { tableKey: string; row: Row | null; onClose: () => void; onSaved: (m: string) => void }) {
  const cfg = TABLES[tableKey];
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    if (row) fd.set("id", row.id);
    const res = await saveItem(tableKey, fd);
    setSaving(false);
    if (res.ok) onSaved(res.message ?? "Kaydedildi.");
    else setError(res.error ?? "Hata");
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] overflow-y-auto bg-ink-950/80 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <motion.form
        onSubmit={submit}
        onMouseDown={(e) => e.stopPropagation()}
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="mx-auto my-8 max-w-2xl rounded-3xl border border-white/10 bg-ink-900 p-6 shadow-2xl"
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-white">{row ? `${cfg.singular} düzenle` : `Yeni ${cfg.singular}`}</h2>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-white/10" aria-label="Kapat">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {cfg.fields.map((f) => (
            <FieldInput key={f.name} f={f} value={row ? row[f.name] : undefined} />
          ))}
        </div>
        {cfg.share && (
          <label className="mt-5 flex items-start gap-3 rounded-xl border border-neon-violet/30 bg-neon-violet/10 p-4 text-sm text-slate-200">
            <input type="checkbox" name="__share" defaultChecked={!row} className="mt-0.5 accent-neon-violet" />
            <span>
              <b>Sosyal medyada otomatik paylaş</b>
              <br />
              <span className="text-slate-400">Ayarlar&apos;daki webhook üzerinden bağlı hesaplarına (Instagram, Facebook, X…) gönderilir.</span>
            </span>
          </label>
        )}
        {error && <p className="mt-4 rounded-xl bg-red-500/10 px-4 py-2 text-sm text-red-300">{error}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost">
            Vazgeç
          </button>
          <button className="btn-primary" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Kaydet"}
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}

function FieldInput({ f, value }: { f: Field; value: unknown }) {
  const [preview, setPreview] = useState<string | null>((value as string) ?? null);
  const wrap = cn(f.full && "sm:col-span-2");
  const v = value == null ? "" : String(value);

  if (f.type === "checkbox")
    return (
      <label className={cn("flex items-center gap-3 rounded-xl border border-white/10 px-4 py-3 text-sm text-slate-200", wrap)}>
        <input type="checkbox" name={f.name} defaultChecked={value === undefined ? f.name === "active" : Boolean(value)} className="h-4 w-4 accent-neon-cyan" />
        {f.label}
      </label>
    );

  if (f.type === "image")
    return (
      <div className={wrap}>
        <label className="label">{f.label}</label>
        <div className="flex gap-4">
          <label className="group relative grid h-28 w-40 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-xl border-2 border-dashed border-white/15 hover:border-neon-cyan/60">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="" className="absolute inset-0 h-full w-full object-cover" />
            ) : null}
            <div className={cn("relative flex flex-col items-center gap-1 text-xs text-slate-300", preview && "opacity-0 group-hover:opacity-100")}>
              <ImagePlus className="h-6 w-6" /> Fotoğraf seç
            </div>
            <input
              type="file"
              name={`${f.name}__file`}
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setPreview(URL.createObjectURL(file));
              }}
            />
          </label>
          <div className="flex-1">
            <input name={f.name} defaultValue={v} className="input" placeholder="…veya görsel URL'si yapıştır" onChange={(e) => setPreview(e.target.value || null)} />
            <p className="mt-2 text-xs text-slate-500">Yüklenen fotoğraflar Supabase Storage&apos;a kaydedilir. Kare veya 4:3 oranı en iyi sonucu verir.</p>
          </div>
        </div>
      </div>
    );

  const common = { name: f.name, required: f.required, placeholder: f.placeholder, className: "input" };
  return (
    <div className={wrap}>
      <label className="label">
        {f.label}
        {f.required && " *"}
      </label>
      {f.type === "textarea" ? (
        <textarea {...common} rows={4} defaultValue={v} />
      ) : f.type === "select" ? (
        <select {...common} defaultValue={v || Object.keys(f.options!)[0]}>
          {Object.entries(f.options!).map(([k, l]) => (
            <option key={k} value={k} className="bg-ink-900">
              {l}
            </option>
          ))}
        </select>
      ) : f.type === "datetime" ? (
        <input {...common} type="datetime-local" defaultValue={toLocalInput(value)} />
      ) : (
        <input {...common} type={f.type === "money" || f.type === "number" ? "number" : f.type === "url" ? "url" : "text"} step={f.type === "money" ? "0.01" : "1"} defaultValue={v} />
      )}
      {f.help && <p className="mt-1 text-xs text-slate-500">{f.help}</p>}
    </div>
  );
}
