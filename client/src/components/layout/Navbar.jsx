import React from 'react';
import { useAuth } from '../../context/AuthContext';

export default function Navbar({ activeTab, onTabChange }) {
  const { user, logout } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'reports', label: 'Reports', icon: '📋' },
    { id: 'readings', label: 'Glucose Readings', icon: '🩸' },
  ];

  return (
    <header className="navbar">
      <div className="navbar-container">
        {/* Brand */}
        <div className="navbar-brand">
          <span className="brand-icon" aria-hidden="true">🩸</span>
          <div>
            <h1 className="brand-title">Sweety</h1>
            <span className="brand-subtitle">Blood Glucose Tracker</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        {user && (
          <nav className="navbar-nav" aria-label="Main Navigation">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`nav-tab-btn ${isActive ? 'nav-tab-active' : ''}`}
                  onClick={() => onTabChange(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span className="nav-icon" aria-hidden="true">{item.icon}</span>
                  <span className="nav-text">{item.label}</span>
                </button>
              );
            })}
          </nav>
        )}

        {/* User profile & sign out */}
        {user && (
          <div className="navbar-user">
            <div className="user-info">
              <span className="user-name">{user.name}</span>
              <span className="user-email">{user.email}</span>
            </div>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={logout}
              title="Sign out of Sweety"
            >
              Sign Out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
