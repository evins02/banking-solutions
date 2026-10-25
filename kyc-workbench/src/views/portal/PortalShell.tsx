import type { ReactNode } from 'react';
import { Lock } from 'lucide-react';
import { DemoTag } from '../../components/ui';

/** Rahmen der Kundensicht – bewusst schlicht und ohne Bank-Navigation */
export function PortalShell({ children, title }: { children: ReactNode; title: string }) {
  return (
    <div className="min-h-full bg-slate-50">
      <div className="bg-amber-50 px-4 py-1.5 text-center text-xs text-amber-900">
        <DemoTag>Demo · Kundensicht</DemoTag> <span className="ml-1">So sieht der Kunde das Portal. Hochgeladene Dateien erscheinen sofort im Fall der Bank.</span>
      </div>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-md bg-brand-900" aria-hidden>
              <svg viewBox="0 0 32 32" className="size-5">
                <path d="M9 22V10h7.5a3.5 3.5 0 0 1 0 7H9m7.5 0a3 3 0 0 1 0 5H9" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="text-sm font-semibold text-slate-900">Banking Solutions · Kundenportal</span>
          </div>
          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
            <Lock className="size-3.5" /> Sichere Verbindung (Demo)
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        {children}
      </main>
    </div>
  );
}
