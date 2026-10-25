import { useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { AlertTriangle, Check, Database, Loader2, X } from 'lucide-react';
import type { Ampel } from '../lib/format';
import type { Check as CheckItem } from '../lib/domain';

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

/* Buttons ------------------------------------------------------------ */

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';

const VARIANT: Record<Variant, string> = {
  primary: 'bg-brand-800 text-white hover:bg-brand-700 disabled:bg-slate-300',
  secondary: 'bg-white text-slate-800 border border-slate-300 hover:bg-slate-50 disabled:text-slate-400',
  ghost: 'text-brand-700 hover:bg-brand-50 disabled:text-slate-400',
  danger: 'bg-white text-red-700 border border-red-300 hover:bg-red-50 disabled:text-slate-400 disabled:border-slate-200',
  success: 'bg-emerald-700 text-white hover:bg-emerald-800 disabled:bg-slate-300',
};

export function Button({ variant = 'primary', size = 'md', icon, loading, className, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md'; icon?: ReactNode; loading?: boolean }) {
  return (
    <button
      {...rest}
      disabled={rest.disabled || loading}
      className={cx(
        'inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors disabled:cursor-not-allowed',
        size === 'sm' ? 'h-8 px-2.5 text-[13px]' : 'h-9 px-3.5 text-sm',
        VARIANT[variant],
        className,
      )}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : icon}
      {children}
    </button>
  );
}

/* Badges ------------------------------------------------------------- */

export type Tone = 'neutral' | 'blue' | 'green' | 'amber' | 'red' | 'violet';

const TONE: Record<Tone, string> = {
  neutral: 'bg-slate-100 text-slate-700 ring-slate-200',
  blue: 'bg-brand-50 text-brand-700 ring-brand-200',
  green: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  red: 'bg-red-50 text-red-700 ring-red-200',
  violet: 'bg-violet-50 text-violet-800 ring-violet-200',
};

export function Badge({ tone = 'neutral', children, className, title }: { tone?: Tone; children: ReactNode; className?: string; title?: string }) {
  return (
    <span title={title} className={cx('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset', TONE[tone], className)}>
      {children}
    </span>
  );
}

export function RiskBadge({ level, score }: { level?: 'normal' | 'gmer'; score?: number }) {
  if (!level) return <Badge>offen</Badge>;
  return level === 'gmer' ? (
    <Badge tone="red" title="Geschäftsbeziehung mit erhöhten Risiken">
      GmeR{score !== undefined ? ` · ${score}` : ''}
    </Badge>
  ) : (
    <Badge tone="neutral">Normal{score !== undefined ? ` · ${score}` : ''}</Badge>
  );
}

const AMPEL: Record<Ampel, { dot: string; label: string }> = {
  gruen: { dot: 'bg-emerald-500', label: 'im Plan' },
  gelb: { dot: 'bg-amber-400', label: 'knapp' },
  rot: { dot: 'bg-red-600', label: 'überfällig' },
};

export function AmpelDot({ value, text }: { value: Ampel; text?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[13px]" title={AMPEL[value].label}>
      <span className={cx('size-2.5 rounded-full ring-2 ring-white', AMPEL[value].dot)} aria-hidden />
      <span className={value === 'rot' ? 'font-medium text-red-700' : 'text-slate-700'}>{text ?? AMPEL[value].label}</span>
    </span>
  );
}

export function DemoTag({ children = 'Demo' }: { children?: ReactNode }) {
  return <span className="inline-flex items-center rounded border border-dashed border-amber-400 bg-amber-50 px-1.5 py-px text-[11px] font-semibold uppercase tracking-wide text-amber-800">{children}</span>;
}

export function FromRegister({ label = 'aus Handelsregister' }: { label?: string }) {
  return (
    <span title={label} className="inline-flex items-center gap-1 rounded bg-brand-50 px-1.5 py-px text-[11px] font-medium text-brand-700">
      <Database className="size-3" aria-hidden />
      {label}
    </span>
  );
}

/* Layout ------------------------------------------------------------- */

export function Card({ title, actions, children, className, padded = true, subtitle }: { title?: ReactNode; subtitle?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; padded?: boolean }) {
  return (
    <section className={cx('rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]', className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
          <div>
            {title && <h2 className="text-[15px] font-semibold text-slate-900">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-[13px] text-slate-500">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={padded ? 'p-4' : ''}>{children}</div>
    </section>
  );
}

export function PageHeader({ title, subtitle, actions, back }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; back?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        {back && <div className="mb-1 text-[13px]">{back}</div>}
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <div className="mt-1 text-sm text-slate-500">{subtitle}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Stat({ label, value, hint, tone = 'neutral', onClick, icon }: { label: string; value: ReactNode; hint?: ReactNode; tone?: 'neutral' | 'red' | 'amber'; onClick?: () => void; icon?: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx('flex flex-col rounded-lg border bg-white p-4 text-left shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-colors', onClick ? 'hover:border-brand-200 hover:bg-brand-50/40' : 'cursor-default', 'border-slate-200')}
    >
      <span className="flex items-center gap-1.5 text-[13px] text-slate-500">
        {icon}
        {label}
      </span>
      <span className={cx('mt-1 text-2xl font-semibold tabular', tone === 'red' ? 'text-red-700' : tone === 'amber' ? 'text-amber-700' : 'text-slate-900')}>{value}</span>
      {hint && <span className="mt-0.5 text-xs text-slate-500">{hint}</span>}
    </button>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: ReactNode }[]; value: T; onChange: (t: T) => void }) {
  return (
    <div className="no-print mb-4 flex gap-1 overflow-x-auto border-b border-slate-200">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={cx('-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors', value === t.id ? 'border-brand-700 text-brand-800' : 'border-transparent text-slate-500 hover:text-slate-800')}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-md border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">{children}</div>;
}

export function Spinner({ text }: { text?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-slate-500">
      <Loader2 className="size-4 animate-spin" />
      {text}
    </span>
  );
}

export function InfoBox({ tone = 'blue', title, children, icon }: { tone?: 'blue' | 'red' | 'amber' | 'green'; title?: ReactNode; children?: ReactNode; icon?: ReactNode }) {
  const t = {
    blue: 'border-brand-200 bg-brand-50 text-brand-900',
    red: 'border-red-200 bg-red-50 text-red-900',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  }[tone];
  return (
    <div className={cx('flex gap-2.5 rounded-md border px-3 py-2.5 text-sm', t)}>
      {icon ?? (tone === 'red' || tone === 'amber' ? <AlertTriangle className="mt-0.5 size-4 shrink-0" /> : null)}
      <div>
        {title && <div className="font-medium">{title}</div>}
        {children && <div className={title ? 'mt-0.5 opacity-90' : ''}>{children}</div>}
      </div>
    </div>
  );
}

export function Checks({ items }: { items: CheckItem[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((c) => (
        <li key={c.label} className="flex items-start gap-2 text-sm">
          {c.ok ? <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" /> : <X className="mt-0.5 size-4 shrink-0 text-red-600" />}
          <span>
            <span className={c.ok ? 'text-slate-700' : 'font-medium text-slate-900'}>{c.label}</span>
            {!c.ok && c.hint && <span className="block text-xs text-slate-500">{c.hint}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

/* Formular ----------------------------------------------------------- */

const inputBase = 'w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:bg-slate-50 disabled:text-slate-500';

export function Field({ label, hint, children, marker, error, className }: { label: ReactNode; hint?: ReactNode; children: ReactNode; marker?: ReactNode; error?: ReactNode; className?: string }) {
  return (
    <label className={cx('block', className)}>
      <span className="mb-1 flex items-center gap-2 text-[13px] font-medium text-slate-700">
        {label}
        {marker}
      </span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs font-medium text-red-700">{error}</span>}
    </label>
  );
}

export const Input = (p: InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={cx(inputBase, 'h-9', p.className)} />;
export const Textarea = (p: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...p} className={cx(inputBase, 'min-h-[84px]', p.className)} />;
export const Select = ({ children, ...p }: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select {...p} className={cx(inputBase, 'h-9', p.className)}>
    {children}
  </select>
);

/* Modal -------------------------------------------------------------- */

export function Modal({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const on = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 pt-[6vh]" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal className={cx('w-full rounded-lg bg-white shadow-xl', wide ? 'max-w-5xl' : 'max-w-lg')}>
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <button type="button" onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Schliessen">
            <X className="size-4" />
          </button>
        </header>
        <div className="px-5 py-4">{children}</div>
        {footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-5 py-3">{footer}</footer>}
      </div>
    </div>
  );
}

/* Tabelle ------------------------------------------------------------ */

export const th = 'px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500 whitespace-nowrap';
export const td = 'px-3 py-2.5 text-sm text-slate-700 align-middle';

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-100">{children}</table>
    </div>
  );
}
