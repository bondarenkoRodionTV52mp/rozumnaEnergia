import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import type { Tone } from "../lib/labels";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

const TONE_BADGE: Record<Tone, string> = {
  green: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  red: "bg-rose-100 text-rose-800 ring-rose-200",
  amber: "bg-amber-100 text-amber-900 ring-amber-200",
  blue: "bg-sky-100 text-sky-800 ring-sky-200",
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
  violet: "bg-violet-100 text-violet-800 ring-violet-200",
};

const TONE_ALERT: Record<Tone, string> = {
  green: "border-emerald-200 bg-emerald-50 text-emerald-900",
  red: "border-rose-200 bg-rose-50 text-rose-900",
  amber: "border-amber-200 bg-amber-50 text-amber-900",
  blue: "border-sky-200 bg-sky-50 text-sky-900",
  slate: "border-slate-200 bg-slate-50 text-slate-800",
  violet: "border-violet-200 bg-violet-50 text-violet-900",
};

export function Badge({ tone = "slate", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={cx("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", TONE_BADGE[tone])}>
      {children}
    </span>
  );
}

export function Alert({ tone = "slate", children }: { tone?: Tone; children: ReactNode }) {
  return <div className={cx("rounded-lg border px-3 py-2 text-sm", TONE_ALERT[tone])}>{children}</div>;
}

export function Card({
  title,
  icon,
  actions,
  children,
  className,
}: {
  title?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cx("rounded-xl border border-slate-200 bg-white shadow-sm", className)}>
      {title && (
        <header className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            {icon}
            {title}
          </h3>
          {actions}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

type Variant = "primary" | "secondary" | "danger" | "ghost";
const VARIANT: Record<Variant, string> = {
  primary: "bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-300",
  secondary: "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 disabled:text-slate-400",
  danger: "bg-rose-600 text-white hover:bg-rose-700 disabled:bg-rose-300",
  ghost: "text-slate-600 hover:bg-slate-100",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md" }) {
  return (
    <button
      {...rest}
      className={cx(
        "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition disabled:cursor-not-allowed",
        size === "sm" ? "px-2.5 py-1 text-xs" : "px-4 py-2 text-sm",
        VARIANT[variant],
        className,
      )}
    />
  );
}

export function Field({
  label,
  hint,
  ...input
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <input
        {...input}
        className={cx(
          "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition",
          "focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100",
          input.className,
        )}
      />
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-6 text-sm text-slate-500">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" />
      {label}
    </div>
  );
}

export function Progress({ value, max, done }: { value: number; max: number; done?: boolean }) {
  const pct = Math.min((value / Math.max(max, 1)) * 100, 100);
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div className={cx("h-full rounded-full transition-all", done ? "bg-emerald-500" : "bg-indigo-500")} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Modal({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h3 className="font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="rounded p-1 text-slate-500 hover:bg-slate-100" aria-label="Закрити">
            ✕
          </button>
        </header>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

export function AuthCard({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-md">
      <Card title={title} icon={icon}>
        {children}
      </Card>
    </div>
  );
}

export function errorText(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}
