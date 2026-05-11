import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Profile from "@/pages/profile";
import Social from "@/pages/social";
import Rooms from "@/pages/rooms";
import Tournaments from "@/pages/tournaments";
import Battle from "@/pages/battle";
import Layout from "@/components/layout";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/profile">
        <Layout><Profile /></Layout>
      </Route>
      <Route path="/social">
        <Layout><Social /></Layout>
      </Route>
      <Route path="/rooms">
        <Layout><Rooms /></Layout>
      </Route>
      <Route path="/tournaments">
        <Layout><Tournaments /></Layout>
      </Route>
      <Route path="/battle">
        <Battle />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;