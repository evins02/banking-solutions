import type { ReactNode } from 'react';
import { Bell, ClipboardCheck, FileSearch, LayoutDashboard, RefreshCcw, ScrollText, Settings, UserRound } from 'lucide-react';
import { useStore } from '../store';
import { ROLE_LABEL } from '../lib/catalog';
import type { Role } from '../types';
import { href } from '../router';
import { cx, DemoTag } from './ui';

export function Logo({ compact }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid size-8 shrink-0 place-items-center rounded-md bg-white/10 ring-1 ring-white/20" aria-hidden>
        <svg viewBox="0 0 32 32" className="size-5">
          <path d="M9 22V10h7.5a3.5 3.5 0 0 1 0 7H9m7.5 0a3 3 0 0 1 0 5H9" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinejoin="round" />
        </svg>
      </span>
      {!compact && (
        <span className="leading-tight">
          <span className="block text-[13px] font-semibold tracking-wide text-white">Banking Solutions</span>
          <span className="block text-[11px] text-brand-200">KYC & Compliance Workbench</span>
        </span>
      )}
    </div>
  );
}

export function Layout({ section, children }: { section: string; children: ReactNode }) {
  const { state, user, role, setRole } = useStore();
  const openCases = state.cases.filter((c) => c.status !== 'eroeffnet').length;
  const openAlerts = state.alerts.filter((a) => a.status !== 'abgeschlossen').length;
  const openReviews = state.reviews.filter((r) => r.status !== 'abgeschlossen').length;
  const nav = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, to: '/' },
    { id: 'onboarding', label: 'Onboarding', icon: FileSearch, to: '/onboarding', count: openCases },
    { id: 'alarme', label: 'Alarme', icon: Bell, to: '/alarme', count: openAlerts },
    { id: 'kyc', label: 'KYC-Überprüfungen', icon: RefreshCcw, to: '/kyc', count: openReviews },
    { id: 'audit', label: 'Audit-Trail', icon: ScrollText, to: '/audit' },
    { id: 'einstellungen', label: 'Einstellungen', icon: Settings, to: '/einstellungen' },
  ];
  return (
    <div className="flex h-full">
      <aside className="no-print flex w-16 shrink-0 flex-col bg-brand-900 text-white lg:w-60">
        <a href={href('/')} className="flex h-14 items-center px-4">
          <span className="lg:hidden">
            <Logo compact />
          </span>
          <span className="hidden lg:block">
            <Logo />
          </span>
        </a>
        <nav className="mt-3 flex-1 space-y-0.5 px-2">
          {nav.map((n) => (
            <a
              key={n.id}
              href={href(n.to)}
              title={n.label}
              className={cx('flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors', section === n.id ? 'bg-white/12 font-medium text-white' : 'text-brand-200 hover:bg-white/6 hover:text-white')}
            >
              <n.icon className="size-4.5 shrink-0" aria-hidden />
              <span className="hidden flex-1 lg:inline">{n.label}</span>
              {n.count !== undefined && n.count > 0 && <span className="hidden rounded-full bg-white/12 px-1.5 text-[11px] tabular lg:inline">{n.count}</span>}
            </a>
          ))}
        </nav>
        <div className="hidden px-4 py-4 text-[11px] leading-relaxed text-brand-200 lg:block">
          <ClipboardCheck className="mb-1 size-4" aria-hidden />
          Prototyp mit ausschliesslich fiktiven Daten. Die App unterstützt Entscheide – sie trifft sie nicht.
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print flex h-14 shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 lg:px-6">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <DemoTag>Demo · fiktive Daten</DemoTag>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-right text-[13px] leading-tight sm:block">
              <span className="block font-medium text-slate-800">{user.name}</span>
              <span className="block text-slate-500">angemeldet als Demo-Benutzer</span>
            </span>
            <label className="flex items-center gap-2 rounded-md border border-slate-300 bg-slate-50 py-1 pl-2 pr-1 text-sm">
              <UserRound className="size-4 text-slate-500" aria-hidden />
              <span className="sr-only">Rolle wechseln</span>
              <select value={role} onChange={(e) => setRole(e.target.value as Role)} className="bg-transparent pr-1 text-sm font-medium text-slate-800 focus:outline-none">
                {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1440px] px-4 py-6 lg:px-6">{children}</div>
        </main>
      </div>
    </div>
  );
}

export function Toasts() {
  const { toasts } = useStore();
  return (
    <div className="no-print pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(420px,calc(100vw-2rem))] flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={cx('pointer-events-auto rounded-md border px-3.5 py-2.5 text-sm shadow-lg', t.kind === 'error' ? 'border-red-200 bg-red-50 text-red-900' : t.kind === 'info' ? 'border-brand-200 bg-white text-slate-800' : 'border-emerald-200 bg-emerald-50 text-emerald-900')}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}
