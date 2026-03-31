// Test CodeRabbit - Aplicación principal de Repliyo
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { NexusProvider } from "@/context/NexusContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useEffect, lazy, Suspense } from "react";

import { Login } from "@/pages/Login";
import { Loader2 } from "lucide-react";

const Inbox = lazy(() => import("@/components/Inbox").then(m => ({ default: m.Inbox })));
const Overview = lazy(() => import("@/pages/Overview").then(m => ({ default: m.Overview })));
const AIAgentConfig = lazy(() => import("@/components/AIAgentConfig").then(m => ({ default: m.AIAgentConfig })));
const AiMetrics = lazy(() => import("@/pages/AiMetrics").then(m => ({ default: m.AiMetrics })));
const Connections = lazy(() => import("@/pages/Connections").then(m => ({ default: m.Connections })));
const IntegrationsPage = lazy(() => import("@/pages/Integrations").then(m => ({ default: m.IntegrationsPage })));
const ProfileSettings = lazy(() => import("@/pages/ProfileSettings").then(m => ({ default: m.ProfileSettings })));
const CRM = lazy(() => import("@/pages/CRM").then(m => ({ default: m.CRM })));
const CrisisAlerts = lazy(() => import("@/pages/CrisisAlerts").then(m => ({ default: m.CrisisAlerts })));
const LandingPage = lazy(() => import("@/components/landing/LandingPage").then(m => ({ default: m.LandingPage })));
const GetStarted = lazy(() => import("@/pages/GetStarted").then(m => ({ default: m.GetStarted })));
const PrivacyPolicy = lazy(() => import("@/pages/PrivacyPolicy"));
const PublicContacts = lazy(() => import("@/pages/PublicContacts").then(m => ({ default: m.PublicContacts })));

function PageLoader() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-gray-50">
      <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
    </div>
  );
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
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      setLocation('/app/inbox');
    }
  }, [isLoading, isAuthenticated, setLocation]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#050505]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  return (
    <Suspense fallback={<PageLoader />}>
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
      <Route path="/login" component={Login} />
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
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}><Connections /></Suspense>
          </DashboardLayout>
        )}
      </Route>
      <Route path="/app/integrations">
        {() => (
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}><IntegrationsPage /></Suspense>
          </DashboardLayout>
        )}
      </Route>
      <Route path="/app/overview">
        {() => (
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}><Overview /></Suspense>
          </DashboardLayout>
        )}
      </Route>
      <Route path="/app/settings">
        {() => (
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}><AIAgentConfig /></Suspense>
          </DashboardLayout>
        )}
      </Route>
      <Route path="/app/ai-metrics">
        {() => (
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}><AiMetrics /></Suspense>
          </DashboardLayout>
        )}
      </Route>
      <Route path="/app/profile">
        {() => (
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}><ProfileSettings /></Suspense>
          </DashboardLayout>
        )}
      </Route>
      <Route path="/app/crm">
        {() => (
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}><CRM /></Suspense>
          </DashboardLayout>
        )}
      </Route>
      <Route path="/app/crisis-alerts">
        {() => (
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}><CrisisAlerts /></Suspense>
          </DashboardLayout>
        )}
      </Route>
      <Route path="/app/inbox">
        {() => (
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}><Inbox /></Suspense>
          </DashboardLayout>
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
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NexusProvider>
          <LanguageProvider>
            <TooltipProvider>
              <Router />
              <Toaster />
            </TooltipProvider>
          </LanguageProvider>
        </NexusProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
