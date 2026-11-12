import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ToastContainer from './components/common/ToastContainer';
import ErrorBoundary from './components/common/ErrorBoundary';
import Navbar from './components/layout/Navbar';
import DashboardPage from './pages/DashboardPage';
import ReportsPage from './pages/ReportsPage';
import ReadingsPage from './pages/ReadingsPage';
import LoginPage from './pages/LoginPage';
import './styles/reports.css';

function MainContent() {
  const { isAuthenticated, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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

  function handleDataMutated() {
    setRefreshTrigger((prev) => prev + 1);
  }

  return (
    <div className="app-layout">
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="app-main-content">
        <ErrorBoundary onReset={() => setRefreshTrigger((prev) => prev + 1)}>
          {activeTab === 'dashboard' && (
            <DashboardPage
              onNavigateToReadings={() => setActiveTab('readings')}
              refreshTrigger={refreshTrigger}
            />
          )}
          {activeTab === 'reports' && <ReportsPage />}
          {activeTab === 'readings' && (
            <ReadingsPage onDataMutated={handleDataMutated} />
          )}
        </ErrorBoundary>
      </main>
      <ToastContainer />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <MainContent />
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
