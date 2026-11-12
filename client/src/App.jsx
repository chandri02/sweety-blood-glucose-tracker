import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/layout/Navbar';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import './styles/reports.css';

function MainContent() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="fullpage-loader">
        <div className="spinner"></div>
        <p>Connecting to Sweety Healthcare System...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="app-layout">
      <Navbar />
      <DashboardPage />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  );
}
