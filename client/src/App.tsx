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
import { AgentSettings } from "@/components/AgentSettings";

import { Connections } from "@/pages/Connections";
import { IntegrationsPage } from "@/pages/Integrations";
import { Login } from "@/pages/Login";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/">
        {() => (
          <DashboardLayout>
            <Switch>
              <Route path="/" component={Inbox} />
              <Route path="/overview" component={Overview} />
              <Route path="/connections" component={Connections} />
              <Route path="/integrations" component={IntegrationsPage} />
              <Route path="/settings" component={AgentSettings} />
              <Route component={NotFound} />
            </Switch>
          </DashboardLayout>
        )}
      </Route>
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
