import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AuthProvider } from "@/context/AuthContext";
import { NexusProvider } from "@/context/NexusContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Inbox } from "@/components/Inbox";
import { Overview } from "@/pages/Overview";
import { AIAgentConfig } from "@/components/AIAgentConfig";
import { AiMetrics } from "@/pages/AiMetrics";

import { Connections } from "@/pages/Connections";
import { IntegrationsPage } from "@/pages/Integrations";
import { Login } from "@/pages/Login";
import { ProfileSettings } from "@/pages/ProfileSettings";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/connections">
        {() => (
          <DashboardLayout>
            <Connections />
          </DashboardLayout>
        )}
      </Route>
      <Route path="/integrations">
        {() => (
          <DashboardLayout>
            <IntegrationsPage />
          </DashboardLayout>
        )}
      </Route>
      <Route path="/overview">
        {() => (
          <DashboardLayout>
            <Overview />
          </DashboardLayout>
        )}
      </Route>
      <Route path="/settings">
        {() => (
          <DashboardLayout>
            <AIAgentConfig />
          </DashboardLayout>
        )}
      </Route>
      <Route path="/ai-metrics">
        {() => (
          <DashboardLayout>
            <AiMetrics />
          </DashboardLayout>
        )}
      </Route>
      <Route path="/profile">
        {() => (
          <DashboardLayout>
            <ProfileSettings />
          </DashboardLayout>
        )}
      </Route>
      <Route path="/">
        {() => (
          <DashboardLayout>
            <Inbox />
          </DashboardLayout>
        )}
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
