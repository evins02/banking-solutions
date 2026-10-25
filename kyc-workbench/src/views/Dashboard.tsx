import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlarmClock, ArrowRight, Bell, CalendarClock, FileWarning, FolderOpen, Timer } from 'lucide-react';
import { useStore } from '../store';
import { dashboardStats, myTasks } from '../lib/selectors';
import { fmtDate, fmtNumber, MONTHS } from '../lib/format';
import { ROLE_LABEL } from '../lib/catalog';
import { go, href } from '../router';
import { Badge, Card, Empty, PageHeader, Stat } from '../components/ui';

/** Feste Zuordnung Ergebnis → Farbe (validierte kategoriale Palette) */
export const OUTCOME_COLORS = { falsch_positiv: '#2a78d6', plausibilisiert: '#1baf7a', eskaliert: '#eb6834' };

const axis = { fontSize: 12, fill: '#64748b' };

export function Dashboard() {
  const { state, role, user } = useStore();
  const st = dashboardStats(state);
  const tasks = myTasks(state, role, user.id);

  const weeks = state.history.weeks.map((w) => ({ name: w.week, Tage: w.avgDays }));
  const months = [...state.history.months];
  const now = new Date();
  const closedThisMonth = state.alerts.filter((a) => a.closedAt && new Date(a.closedAt).getMonth() === now.getMonth() && new Date(a.closedAt).getFullYear() === now.getFullYear());
  months.push({
    month: `${MONTHS[now.getMonth()]} ${String(now.getFullYear()).slice(2)}`,
    falsch_positiv: closedThisMonth.filter((a) => a.outcome === 'falsch_positiv').length,
    plausibilisiert: closedThisMonth.filter((a) => a.outcome === 'plausibilisiert').length,
    eskaliert: closedThisMonth.filter((a) => a.outcome === 'eskaliert' || a.outcome === 'mros').length,
  });

  return (
    <>
      <PageHeader title="Dashboard" subtitle={`Übersicht für ${ROLE_LABEL[role]} · Stand ${fmtDate(new Date().toISOString())}`} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat icon={<FolderOpen className="size-4" />} label="Offene Onboarding-Fälle" value={st.openCases} onClick={() => go('/onboarding')} />
        <Stat icon={<Timer className="size-4" />} label="Ø Durchlaufzeit" value={`${fmtNumber(st.avgDays, 1)} T`} hint="Anlage bis Eröffnung, letzte 4 Wochen" />
        <Stat icon={<FileWarning className="size-4" />} label="Fälle mit fehlenden Unterlagen" value={st.missingDocs} tone={st.missingDocs ? 'amber' : 'neutral'} onClick={() => go('/onboarding')} />
        <Stat icon={<Bell className="size-4" />} label="Offene Alarme" value={st.openAlerts} onClick={() => go('/alarme')} />
        <Stat icon={<AlarmClock className="size-4" />} label="Alarme über Frist" value={st.overdueAlerts} tone={st.overdueAlerts ? 'red' : 'neutral'} onClick={() => go('/alarme')} />
        <Stat icon={<CalendarClock className="size-4" />} label="KYC fällig in 30 Tagen" value={st.reviewsDue30} hint={st.reviewsOverdue ? `davon ${st.reviewsOverdue} überfällig` : undefined} tone={st.reviewsOverdue ? 'amber' : 'neutral'} onClick={() => go('/kyc/bestand')} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-5">
        <Card title="Meine Aufgaben" subtitle={`${tasks.length} offen für ${ROLE_LABEL[role]}`} className="xl:col-span-2" padded={false}>
          {tasks.length === 0 ? (
            <div className="p-4">
              <Empty>Keine offenen Aufgaben für diese Rolle.</Empty>
            </div>
          ) : (
            <ul className="max-h-[560px] divide-y divide-slate-100 overflow-y-auto">
              {tasks.map((t) => (
                <li key={t.id}>
                  <a href={href(t.to)} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50">
                    <Badge tone={t.urgent ? 'red' : 'neutral'}>{t.kind}</Badge>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-800">{t.title}</span>
                      <span className="block truncate text-xs text-slate-500">{t.detail}</span>
                    </span>
                    <ArrowRight className="size-4 shrink-0 text-slate-400" />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="grid gap-5 xl:col-span-3">
          <Card title="Durchlaufzeit Onboarding" subtitle="Ø Tage von der Anlage bis zur Eröffnung, letzte 12 Wochen">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeks} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
                  <CartesianGrid stroke="#eef1f5" vertical={false} />
                  <XAxis dataKey="name" tick={axis} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} interval={1} />
                  <YAxis tick={axis} tickLine={false} axisLine={false} domain={[0, 'auto']} unit=" T" />
                  <Tooltip formatter={(v) => [`${fmtNumber(Number(v), 1)} Tage`, 'Ø Durchlaufzeit']} contentStyle={{ fontSize: 13, borderRadius: 6, borderColor: '#e2e8f0' }} />
                  <Line type="monotone" dataKey="Tage" stroke="#1f3466" strokeWidth={2} dot={{ r: 4, strokeWidth: 2, stroke: '#fff', fill: '#1f3466' }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card title="Alarme nach Ergebnis" subtitle="Abgeschlossene Alarme je Monat (laufender Monat aus der Warteschlange)">
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={months} margin={{ top: 8, right: 12, bottom: 0, left: -12 }} barCategoryGap="28%">
                  <CartesianGrid stroke="#eef1f5" vertical={false} />
                  <XAxis dataKey="month" tick={axis} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
                  <YAxis tick={axis} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ fontSize: 13, borderRadius: 6, borderColor: '#e2e8f0' }} />
                  <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 12, color: '#475569' }} />
                  <Bar dataKey="falsch_positiv" name="Falsch positiv" stackId="a" fill={OUTCOME_COLORS.falsch_positiv} stroke="#fff" strokeWidth={1} />
                  <Bar dataKey="plausibilisiert" name="Plausibilisiert" stackId="a" fill={OUTCOME_COLORS.plausibilisiert} stroke="#fff" strokeWidth={1} />
                  <Bar dataKey="eskaliert" name="Eskaliert" stackId="a" fill={OUTCOME_COLORS.eskaliert} stroke="#fff" strokeWidth={1} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
