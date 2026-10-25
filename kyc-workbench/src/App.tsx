import { Layout, Toasts } from './components/Layout';
import { useHashRoute } from './router';
import { Dashboard } from './views/Dashboard';
import { CaseList } from './views/onboarding/CaseList';
import { NewCase } from './views/onboarding/NewCase';
import { CaseDetail } from './views/onboarding/CaseDetail';
import { KycProfile } from './views/onboarding/KycProfile';
import { AlertsPage } from './views/alerts/AlertsPage';
import { AlertDetail } from './views/alerts/AlertDetail';
import { ReviewsPage } from './views/reviews/ReviewsPage';
import { ReviewDetail } from './views/reviews/ReviewDetail';
import { OnboardingPortal } from './views/portal/OnboardingPortal';
import { ReviewPortal } from './views/portal/ReviewPortal';
import { AuditTrail } from './views/AuditTrail';
import { SettingsPage } from './views/SettingsPage';

export function App() {
  const [a, b, c] = useHashRoute();

  // Kundensicht ohne Navigation der Bank
  if (a === 'portal') {
    return (
      <>
        {b === 'onboarding' && c ? <OnboardingPortal caseId={c} /> : b === 'kyc' && c ? <ReviewPortal reviewId={c} /> : null}
        <Toasts />
      </>
    );
  }

  let section = 'dashboard';
  let page = <Dashboard />;
  if (a === 'onboarding') {
    section = 'onboarding';
    page = !b ? <CaseList /> : b === 'neu' ? <NewCase /> : c === 'profil' ? <KycProfile caseId={b} /> : <CaseDetail caseId={b} />;
  } else if (a === 'alarme') {
    section = 'alarme';
    page = b && b !== 'auswertung' ? <AlertDetail alertId={b} /> : <AlertsPage tab={b === 'auswertung' ? 'auswertung' : 'queue'} />;
  } else if (a === 'kyc') {
    section = 'kyc';
    page = b && !['bestand', 'ereignisse'].includes(b) ? <ReviewDetail reviewId={b} /> : <ReviewsPage tab={(b as 'bestand' | 'ereignisse') ?? 'reviews'} />;
  } else if (a === 'audit') {
    section = 'audit';
    page = <AuditTrail />;
  } else if (a === 'einstellungen') {
    section = 'einstellungen';
    page = <SettingsPage />;
  }

  return (
    <>
      <Layout section={section}>{page}</Layout>
      <Toasts />
    </>
  );
}
