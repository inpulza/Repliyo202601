import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { NexusProvider } from "@/context/NexusContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Inbox } from "@/components/Inbox";
import { Overview } from "@/pages/Overview";
import { AIAgentConfig } from "@/components/AIAgentConfig";
import { AiMetrics } from "@/pages/AiMetrics";
import { useEffect } from "react";

import { Connections } from "@/pages/Connections";
import { IntegrationsPage } from "@/pages/Integrations";
import { Login } from "@/pages/Login";
import { ProfileSettings } from "@/pages/ProfileSettings";
import { CRM } from "@/pages/CRM";
import { LandingPage } from "@/components/landing/LandingPage";
import { Loader2 } from "lucide-react";

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

  return <LandingPage />;
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
            <Connections />
          </DashboardLayout>
        )}
      </Route>
      <Route path="/app/integrations">
        {() => (
          <DashboardLayout>
            <IntegrationsPage />
          </DashboardLayout>
        )}
      </Route>
      <Route path="/app/overview">
        {() => (
          <DashboardLayout>
            <Overview />
          </DashboardLayout>
        )}
      </Route>
      <Route path="/app/settings">
        {() => (
          <DashboardLayout>
            <AIAgentConfig />
          </DashboardLayout>
        )}
      </Route>
      <Route path="/app/ai-metrics">
        {() => (
          <DashboardLayout>
            <AiMetrics />
          </DashboardLayout>
        )}
      </Route>
      <Route path="/app/profile">
        {() => (
          <DashboardLayout>
            <ProfileSettings />
          </DashboardLayout>
        )}
      </Route>
      <Route path="/app/crm">
        {() => (
          <DashboardLayout>
            <CRM />
          </DashboardLayout>
        )}
      </Route>
      <Route path="/app/inbox">
        {() => (
          <DashboardLayout>
            <Inbox />
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
          <TooltipProvider>
            <Router />
            <Toaster />
          </TooltipProvider>
        </NexusProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
