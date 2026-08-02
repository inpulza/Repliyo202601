// Test CodeRabbit - Aplicación principal de Repliyo
import { Switch, Route, useLocation } from "wouter";
import NotFound from "@/pages/not-found";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { useEffect, lazy, Suspense, type ComponentType, type ReactNode } from "react";

import { Loader2 } from "lucide-react";

// Wraps React.lazy with retry + one-time reload so a transient failure to fetch
// a dynamically imported chunk (Vite dev restarts, network blips, a momentarily
// frozen tab) recovers automatically instead of white-screening the whole app.
function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) {
  const STORAGE_KEY = "lazy-import-force-refreshed";
  return lazy(async () => {
    try {
      const component = await factory();
      window.sessionStorage.removeItem(STORAGE_KEY);
      return component;
    } catch (error) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
        try {
          const component = await factory();
          window.sessionStorage.removeItem(STORAGE_KEY);
          return component;
        } catch {
          // keep retrying
        }
      }
      const alreadyRefreshed = window.sessionStorage.getItem(STORAGE_KEY) === "true";
      if (!alreadyRefreshed) {
        window.sessionStorage.setItem(STORAGE_KEY, "true");
        window.location.reload();
        return await new Promise<never>(() => {});
      }
      throw error;
    }
  });
}

function lazyDashboardRoute(
  factory: () => Promise<{ default: ComponentType }>
) {
  return lazyWithRetry(async () => {
    const [{ DashboardLayout }, pageModule] = await Promise.all([
      import("@/components/DashboardLayout"),
      factory(),
    ]);
    const Page = pageModule.default;

    return {
      default: function DashboardRoute() {
        return (
          <DashboardLayout>
            <Page />
          </DashboardLayout>
        );
      },
    };
  });
}

const Inbox = lazyDashboardRoute(() => import("@/components/Inbox").then(m => ({ default: m.Inbox })));
const Overview = lazyDashboardRoute(() => import("@/pages/Overview").then(m => ({ default: m.Overview })));
const AIAgentConfig = lazyDashboardRoute(() => import("@/components/AIAgentConfig").then(m => ({ default: m.AIAgentConfig })));
const AiMetrics = lazyDashboardRoute(() => import("@/pages/AiMetrics").then(m => ({ default: m.AiMetrics })));
const Connections = lazyDashboardRoute(() => import("@/pages/Connections").then(m => ({ default: m.Connections })));
const IntegrationsPage = lazyDashboardRoute(() => import("@/pages/Integrations").then(m => ({ default: m.IntegrationsPage })));
const ProfileSettings = lazyDashboardRoute(() => import("@/pages/ProfileSettings").then(m => ({ default: m.ProfileSettings })));
const CRM = lazyDashboardRoute(() => import("@/pages/CRM").then(m => ({ default: m.CRM })));
const CrisisAlerts = lazyDashboardRoute(() => import("@/pages/CrisisAlerts").then(m => ({ default: m.CrisisAlerts })));
const UserManagement = lazyDashboardRoute(() => import("@/pages/UserManagement").then(m => ({ default: m.UserManagement })));
const Login = lazyWithRetry(() => import("@/pages/Login").then(m => ({ default: m.Login })));
const LandingPage = lazyWithRetry(() => import("@/components/landing/LandingPage").then(m => ({ default: m.LandingPage })));
const GetStarted = lazyWithRetry(() => import("@/pages/GetStarted").then(m => ({ default: m.GetStarted })));
const PrivacyPolicy = lazyWithRetry(() => import("@/pages/PrivacyPolicy"));
const PublicContacts = lazyWithRetry(() => import("@/pages/PublicContacts").then(m => ({ default: m.PublicContacts })));
const ApplicationProviders = lazyWithRetry(() =>
  import("@/components/ApplicationProviders").then((m) => ({
    default: m.ApplicationProviders,
  })),
);

function PageLoader() {
  return (
    <div
      className="flex h-screen w-full items-center justify-center bg-gray-50"
      role="status"
      aria-label="Loading Repliyo"
    >
      <Loader2 className="h-8 w-8 animate-spin text-indigo-500 motion-reduce:animate-none" />
    </div>
  );
}

function LandingPageLoader() {
  return (
    <div
      className="initial-app-loader"
      role="status"
      aria-label="Loading Repliyo"
    >
      <div className="initial-app-loader__content" aria-hidden="true">
        <div className="initial-app-loader__mark">R</div>
        <div className="initial-app-loader__bar" />
      </div>
    </div>
  );
}

function DashboardAuthGate({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation('/login');
    }
  }, [isLoading, isAuthenticated, setLocation]);

  if (isLoading) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

function AppRedirect() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      setLocation('/app/inbox');
    } else if (!isLoading && !isAuthenticated) {
      setLocation('/login');
    }
  }, [isLoading, isAuthenticated, setLocation]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#050505]">
      <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
    </div>
  );
}

function HomeRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      window.location.assign('/app/inbox');
    }
  }, [isLoading, isAuthenticated]);

  if (!isLoading && isAuthenticated) {
    return <LandingPageLoader />;
  }

  return (
    <Suspense fallback={<LandingPageLoader />}>
      <LandingPage />
    </Suspense>
  );
}

function LegacyRedirect({ newPath }: { newPath: string }) {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation(newPath);
  }, [setLocation, newPath]);
  return null;
}

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/" component={HomeRoute} />
      <Route path="/login">{() => <Suspense fallback={<PageLoader />}><Login /></Suspense>}</Route>
      <Route path="/privacy">{() => <Suspense fallback={<PageLoader />}><PrivacyPolicy /></Suspense>}</Route>
      <Route path="/get-started">{() => <Suspense fallback={<PageLoader />}><GetStarted /></Suspense>}</Route>
      <Route path="/public/contacts/:token">{() => <Suspense fallback={<PageLoader />}><PublicContacts /></Suspense>}</Route>
      <Route path="/register">{() => <LegacyRedirect newPath="/login" />}</Route>
      
      {/* Legacy URL redirects (for old bookmarks) */}
      <Route path="/inbox">{() => <LegacyRedirect newPath="/app/inbox" />}</Route>
      <Route path="/crm">{() => <LegacyRedirect newPath="/app/crm" />}</Route>
      <Route path="/overview">{() => <LegacyRedirect newPath="/app/overview" />}</Route>
      <Route path="/connections">{() => <LegacyRedirect newPath="/app/connections" />}</Route>
      <Route path="/integrations">{() => <LegacyRedirect newPath="/app/integrations" />}</Route>
      <Route path="/settings">{() => <LegacyRedirect newPath="/app/settings" />}</Route>
      <Route path="/ai-metrics">{() => <LegacyRedirect newPath="/app/ai-metrics" />}</Route>
      <Route path="/profile">{() => <LegacyRedirect newPath="/app/profile" />}</Route>
      
      {/* Authenticated routes under /app */}
      <Route path="/app/connections">
        {() => (
          <DashboardAuthGate>
            <Suspense fallback={<PageLoader />}><Connections /></Suspense>
          </DashboardAuthGate>
        )}
      </Route>
      <Route path="/app/integrations">
        {() => (
          <DashboardAuthGate>
            <Suspense fallback={<PageLoader />}><IntegrationsPage /></Suspense>
          </DashboardAuthGate>
        )}
      </Route>
      <Route path="/app/overview">
        {() => (
          <DashboardAuthGate>
            <Suspense fallback={<PageLoader />}><Overview /></Suspense>
          </DashboardAuthGate>
        )}
      </Route>
      <Route path="/app/settings">
        {() => (
          <DashboardAuthGate>
            <Suspense fallback={<PageLoader />}><AIAgentConfig /></Suspense>
          </DashboardAuthGate>
        )}
      </Route>
      <Route path="/app/ai-metrics">
        {() => (
          <DashboardAuthGate>
            <Suspense fallback={<PageLoader />}><AiMetrics /></Suspense>
          </DashboardAuthGate>
        )}
      </Route>
      <Route path="/app/profile">
        {() => (
          <DashboardAuthGate>
            <Suspense fallback={<PageLoader />}><ProfileSettings /></Suspense>
          </DashboardAuthGate>
        )}
      </Route>
      <Route path="/app/crm">
        {() => (
          <DashboardAuthGate>
            <Suspense fallback={<PageLoader />}><CRM /></Suspense>
          </DashboardAuthGate>
        )}
      </Route>
      <Route path="/app/crisis-alerts">
        {() => (
          <DashboardAuthGate>
            <Suspense fallback={<PageLoader />}><CrisisAlerts /></Suspense>
          </DashboardAuthGate>
        )}
      </Route>
      <Route path="/app/inbox">
        {() => (
          <DashboardAuthGate>
            <Suspense fallback={<PageLoader />}><Inbox /></Suspense>
          </DashboardAuthGate>
        )}
      </Route>
      <Route path="/app/users">
        {() => (
          <DashboardAuthGate>
            <Suspense fallback={<PageLoader />}><UserManagement /></Suspense>
          </DashboardAuthGate>
        )}
      </Route>
      <Route path="/app">
        {() => <AppRedirect />}
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  if (window.location.pathname === "/") {
    return (
      <AuthProvider>
        <LanguageProvider>
          <Router />
        </LanguageProvider>
      </AuthProvider>
    );
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <ApplicationProviders>
        <Router />
      </ApplicationProviders>
    </Suspense>
  );
}

export default App;
