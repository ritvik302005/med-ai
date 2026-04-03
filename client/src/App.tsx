import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Philosophy from './components/Philosophy';
import Comparison from './components/Comparison';
import Footer from './components/Footer';
import SearchPage from './components/SearchPage';
import Chatbot from './components/Chatbot';

import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import AuthPages from './components/AuthPages';
import AdminDashboard from './components/AdminDashboard';
import UserDashboard from './components/UserDashboard';
import AIChatPage from './components/AIChatPage';
import OrderMedicinePage from './components/OrderMedicinePage';
import PharmacyMapPage from './components/PharmacyMapPage';
import { Navigate } from 'react-router-dom';

function DashboardSwitcher() {
  const { user } = useAuth();
  
  if (user?.role === 'admin') {
    return <AdminDashboard />;
  }
  
  return <UserDashboard />;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) return null;
  if (!user) return <Navigate to="/signin" />;
  
  return <>{children}</>;
}

function HomePage() {
  return (
    <>
      <Hero />
      <Philosophy />
      <Comparison />
      <Footer />
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <Router>
            <div className="min-h-screen transition-colors duration-500">
              <Navbar />
              <main>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/search" element={<SearchPage />} />
                  <Route path="/signin" element={<AuthPages type="signin" />} />
                  <Route path="/signup" element={<AuthPages type="signup" />} />
                  <Route 
                    path="/dashboard" 
                    element={
                      <ProtectedRoute>
                        <DashboardSwitcher />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/ai-chat" 
                    element={
                      <ProtectedRoute>
                        <AIChatPage />
                      </ProtectedRoute>
                    } 
                  />
                  <Route
                    path="/order-medicines"
                    element={
                      <ProtectedRoute>
                        <OrderMedicinePage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/order"
                    element={
                      <ProtectedRoute>
                        <OrderMedicinePage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/pharmacy-map"
                    element={
                      <ProtectedRoute>
                        <PharmacyMapPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/pharmacies"
                    element={
                      <ProtectedRoute>
                        <PharmacyMapPage />
                      </ProtectedRoute>
                    }
                  />
                </Routes>
              </main>
            </div>
          </Router>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
