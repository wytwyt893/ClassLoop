import { Authenticated, Unauthenticated } from "convex/react";
import { SignInForm } from "./SignInForm";
import { Dashboard } from "./components/Dashboard";
import { ParticipantView } from "./components/ParticipantView";
import { ResultsView } from "./components/ResultsView";
import { TimerView } from "./components/TimerView";
import { Footer } from "./components/Footer";
import { PrivacyPolicy } from "./components/PrivacyPolicy";
import { TermsOfUse } from "./components/TermsOfUse";
import { Toaster } from "sonner";

function App() {
  const path = window.location.pathname;
  
  // Handle different routes
  if (path === "/input") {
    return (
      <>
        <ParticipantView />
        <Toaster />
      </>
    );
  }
  
  if (path === "/output") {
    return (
      <>
        <ResultsView />
        <Toaster />
      </>
    );
  }

  if (path === "/timer") {
    return (
      <>
        <TimerView />
        <Toaster />
      </>
    );
  }

  if (path === "/privacy") {
    return (
      <>
        <PrivacyPolicy />
        <Footer />
        <Toaster />
      </>
    );
  }

  if (path === "/terms") {
    return (
      <>
        <TermsOfUse />
        <Footer />
        <Toaster />
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <main className="flex-1 py-8">
          <div className="container max-w-6xl mx-auto px-4">
            <h1 className="text-4xl font-extrabold text-center text-gray-900 mb-8">
              PollUp
            </h1>
            <Authenticated>
              <Dashboard />
            </Authenticated>
            <Unauthenticated>
              <div className="max-w-md mx-auto">
                <SignInForm />
              </div>
            </Unauthenticated>
          </div>
        </main>
        <Footer />
      </div>
      <Toaster />
    </>
  );
}

export default App;
