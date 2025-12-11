import { useState, useEffect, type ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { ThemeProvider } from "./hooks/useTheme";
import Layout from "./components/Layout/Layout";
import Dashboard from "./pages/Dashboard";
import Budget from "./pages/Budget";
import Income from "./pages/Income";
import Expenses from "./pages/Expenses";
import Goals from "./pages/Goals";
import Sage from "./pages/Sage";
import Subscriptions from "./pages/Subscriptions";
import Auth from "./pages/Auth";
import Account from "./pages/Account";
import NotFound from "./pages/NotFound";
import ResetPassword from "./pages/ResetPassword";
import Landing from "./pages/Landing";
import SplashScreen from "./components/UI/SplashScreen";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return null; // Splash screen handles loading state
  }
  
  return user ? <>{children}</> : <Navigate to="/landing" />;
};

const PublicRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return null; // Splash screen handles loading state
  }
  
  return user ? <Navigate to="/" /> : <>{children}</>;
};

const AppContent = () => {
  const [showSplash, setShowSplash] = useState(true);
  const { loading } = useAuth();

  useEffect(() => {
    // Hide splash after minimum display time and auth is loaded
    const timer = setTimeout(() => {
      if (!loading) {
        setShowSplash(false);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [loading]);

  useEffect(() => {
    // Also hide splash when loading completes (after minimum time)
    if (!loading && showSplash) {
      const timer = setTimeout(() => setShowSplash(false), 500);
      return () => clearTimeout(timer);
    }
  }, [loading, showSplash]);

  return (
    <>
      <AnimatePresence mode="wait">
        {showSplash && <SplashScreen key="splash" />}
      </AnimatePresence>
      
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/landing" element={
            <PublicRoute>
              <Landing />
            </PublicRoute>
          } />
          <Route path="/auth" element={<Auth />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="budget" element={<Budget />} />
            <Route path="income" element={<Income />} />
            <Route path="expenses" element={<Expenses />} />
            <Route path="goals" element={<Goals />} />
            <Route path="sage" element={<Sage />} />
            <Route path="subscriptions" element={<Subscriptions />} />
            <Route path="account" element={<Account />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <AppContent />
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
