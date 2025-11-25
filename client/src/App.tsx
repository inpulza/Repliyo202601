import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { NexusProvider } from "@/context/NexusContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Inbox } from "@/components/Inbox";
import { AgentSettings } from "@/components/AgentSettings";

import { Connections } from "@/pages/Connections";
import { IntegrationsPage } from "@/pages/Integrations";

function Router() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/" component={Inbox} />
        <Route path="/connections" component={Connections} />
        <Route path="/integrations" component={IntegrationsPage} />
        <Route path="/settings" component={AgentSettings} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <NexusProvider>
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </NexusProvider>
    </QueryClientProvider>
  );
}

export default App;
