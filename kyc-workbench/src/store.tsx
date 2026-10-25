import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { buildSeed } from './data/seed';
import { DEFAULT_SETTINGS } from './data/settings';
import { seedAudit } from './data/seedAudit';
import { DEFAULT_USER, USERS } from './data/users';
import { ActionError, log, type Ctx, type Data } from './lib/actions';
import type { HistoryAlertMonth, HistoryScenario, HistoryWeek, Role, User } from './types';

/**
 * Zustand der Demo im Browser (localStorage). Für eine Datenbank-Anbindung
 * würden `load`/`persist` durch API-Aufrufe ersetzt; die Aktionen bleiben gleich.
 */
const STORAGE_KEY = 'kyc-workbench-demo-v2';

export interface State extends Data {
  userId: string;
  history: { weeks: HistoryWeek[]; months: HistoryAlertMonth[]; scenarios: HistoryScenario[]; reviewsDoneYear: number };
}

function initialState(): State {
  const settings = structuredClone(DEFAULT_SETTINGS);
  const seed = buildSeed(settings);
  const s: State = { ...seed, settings, audit: [], userId: DEFAULT_USER.kb };
  seedAudit(s);
  log(s, { userId: 'system', role: 'kb' }, { userId: 'system', role: 'system', action: 'Testdaten geladen (fiktiv)', objectType: 'System', objectId: 'seed', objectLabel: 'Demo', newValue: `${seed.customers.length} Kunden, ${seed.cases.length} Fälle, ${seed.alerts.length} Alarme, ${seed.reviews.length} Überprüfungen` });
  return s;
}

function load(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const s = JSON.parse(raw) as State;
      if (Array.isArray(s.audit) && Array.isArray(s.customers)) return s;
    }
  } catch {
    /* Demo: bei Fehlern mit Testdaten beginnen */
  }
  return initialState();
}

interface Toast {
  id: number;
  kind: 'ok' | 'error' | 'info';
  text: string;
}

interface Store {
  state: State;
  user: User;
  role: Role;
  /** Führt eine fachliche Aktion aus; Fehler erscheinen als Hinweis. Gibt das Ergebnis oder undefined zurück. */
  act: <A extends unknown[], R>(fn: (d: Data, ctx: Ctx, ...args: A) => R, ...args: A) => R | undefined;
  /** Wie `act`, gibt aber zurück, ob die Aktion erfolgreich war (für Aktionen ohne Rückgabewert) */
  actOk: <A extends unknown[]>(fn: (d: Data, ctx: Ctx, ...args: A) => unknown, ...args: A) => boolean;
  setRole: (role: Role) => void;
  toast: (text: string, kind?: Toast['kind']) => void;
  toasts: Toast[];
  reset: () => void;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(load);
  const stateRef = useRef(state);
  stateRef.current = state;
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Zustand, der aus einem anderen Tab übernommen wurde, nicht zurückschreiben (sonst Ping-Pong)
  const fromOtherTab = useRef(false);

  useEffect(() => {
    if (fromOtherTab.current) {
      fromOtherTab.current = false;
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* Speicher voll oder gesperrt: Demo läuft ohne Persistenz weiter */
    }
  }, [state]);

  // Kundensicht läuft in einem eigenen Tab: neuere Stände von dort sofort übernehmen.
  // Der Audit-Trail wächst mit jeder Aktion und dient als Versionszähler.
  useEffect(() => {
    const on = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return;
      try {
        const next = JSON.parse(e.newValue) as State;
        const cur = stateRef.current;
        const reset = next.audit.length < cur.audit.length && next.audit[0]?.hash !== cur.audit[0]?.hash;
        if (next.audit.length <= cur.audit.length && !reset) return;
        const merged = { ...next, userId: cur.userId }; // Rolle bleibt pro Tab erhalten
        fromOtherTab.current = true;
        stateRef.current = merged;
        setState(merged);
      } catch {
        /* ignorieren */
      }
    };
    window.addEventListener('storage', on);
    return () => window.removeEventListener('storage', on);
  }, []);

  const toast = useCallback((text: string, kind: Toast['kind'] = 'ok') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'error' ? 6000 : 3500);
  }, []);

  const user = USERS.find((u) => u.id === state.userId) ?? USERS[0];

  const exec = useCallback(
    <A extends unknown[], R>(fn: (d: Data, ctx: Ctx, ...args: A) => R, args: A): { ok: true; value: R } | { ok: false } => {
      const cur = stateRef.current;
      const u = USERS.find((x) => x.id === cur.userId) ?? USERS[0];
      // Transaktionen sind unveränderlich und werden nicht kopiert
      const { transactions, history, ...rest } = cur;
      const draft = { ...structuredClone(rest), transactions, history } as State;
      try {
        const value = fn(draft, { userId: u.id, role: u.role }, ...args);
        stateRef.current = draft;
        setState(draft);
        return { ok: true, value };
      } catch (e) {
        if (e instanceof ActionError) toast(e.message, 'error');
        else {
          console.error(e);
          toast('Unerwarteter Fehler – Details in der Konsole.', 'error');
        }
        return { ok: false };
      }
    },
    [toast],
  );

  const act = useCallback(
    <A extends unknown[], R>(fn: (d: Data, ctx: Ctx, ...args: A) => R, ...args: A): R | undefined => {
      const r = exec(fn, args);
      return r.ok ? r.value : undefined;
    },
    [exec],
  );

  const actOk = useCallback(<A extends unknown[]>(fn: (d: Data, ctx: Ctx, ...args: A) => unknown, ...args: A): boolean => exec(fn, args).ok, [exec]);

  const setRole = useCallback((role: Role) => setState((s) => ({ ...s, userId: DEFAULT_USER[role] })), []);

  const reset = useCallback(() => {
    const s = initialState();
    stateRef.current = s;
    setState(s);
  }, []);

  const value = useMemo<Store>(() => ({ state, user, role: user.role, act, actOk, setRole, toast, toasts, reset }), [state, user, act, actOk, setRole, toast, toasts, reset]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const s = useContext(StoreContext);
  if (!s) throw new Error('StoreProvider fehlt');
  return s;
}
