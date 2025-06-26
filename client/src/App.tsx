import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import Exercise from "@/pages/exercise";
import Profile from "@/pages/profile";
import AdminExercises from "@/pages/admin/exercises";
import AdminProgress from "@/pages/admin/progress";
import AdminLayout from "@/components/admin-layout";
import { useUser } from "@/hooks/use-user";
import { Loader2 } from "lucide-react";
import LandingPage from "@/pages/landing-page";
import AboutPage from "@/pages/about"; // Added
import HowToUsePage from "@/pages/how-to-use"; // Added
import ExercisesPage from "@/pages/exercises"; // Added
import ResourcesPage from "@/pages/advocacy-resources"; // Added
import FeedbackPage from "@/pages/feedback"; // Added
import ContactUsPage from "@/pages/contact-us"; // Added
import TermsAndConditionsPage from "@/pages/terms-and-conditions"; // Added
import ToolsPage from "./pages/tools"; // Added
import AdminToolsPage from "./pages/admin/tools"; // Added

function AdminRoute({
  component: Component,
}: {
  component: React.ComponentType;
}) {
  return (
    <AdminLayout>
      <Component />
    </AdminLayout>
  );
}

function Router() {
  const { isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/exercise/:id" component={Exercise} />
      <Route path="/profile" component={Profile} />
      <Route path="/about" component={AboutPage} />
      <Route path="/how-to-use" component={HowToUsePage} />
      <Route path="/exercises" component={ExercisesPage} />
      <Route path="/resources" component={ResourcesPage} />
      <Route path="/feedback" component={FeedbackPage} />
      <Route path="/contact-us" component={ContactUsPage} />
      <Route path="/terms-and-conditions" component={TermsAndConditionsPage} />
      <Route path="/admin/exercises">
        {() => <AdminRoute component={AdminExercises} />}
      </Route>
      <Route path="/admin/tools">
        {() => <AdminRoute component={AdminToolsPage} />}
      </Route>
      <Route path="/admin/progress">
        {() => <AdminRoute component={AdminProgress} />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;