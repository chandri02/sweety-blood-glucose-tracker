import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function Navbar({ activeTab, onTabChange }) {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'reports', label: 'Reports', icon: '📋' },
    { id: 'readings', label: 'Glucose Readings', icon: '🩸' },
  ];

  function handleTabSelect(id) {
    onTabChange(id);
    setMobileMenuOpen(false);
  }

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

        {/* Mobile Hamburger Toggle */}
        {user && (
          <button
            type="button"
            className="navbar-mobile-toggle"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation menu"
          >
            <span className="hamburger-icon">{mobileMenuOpen ? '✕' : '☰'}</span>
          </button>
        )}

        {/* Desktop Navigation Tabs */}
        {user && (
          <nav className="navbar-nav desktop-only" aria-label="Main Navigation">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`nav-tab-btn ${isActive ? 'nav-tab-active' : ''}`}
                  onClick={() => handleTabSelect(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span className="nav-icon" aria-hidden="true">{item.icon}</span>
                  <span className="nav-text">{item.label}</span>
                </button>
              );
            })}
          </nav>
        )}

        {/* Desktop User profile & sign out */}
        {user && (
          <div className="navbar-user desktop-only">
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

      {/* Mobile Dropdown / Drawer */}
      {user && mobileMenuOpen && (
        <div className="navbar-mobile-menu" role="menu">
          <div className="mobile-menu-user">
            <span className="user-avatar" aria-hidden="true">👤</span>
            <div className="user-info">
              <span className="user-name">{user.name}</span>
              <span className="user-email">{user.email}</span>
            </div>
          </div>

          <div className="mobile-menu-nav">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`mobile-nav-item ${isActive ? 'mobile-nav-active' : ''}`}
                  onClick={() => handleTabSelect(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span className="nav-icon" aria-hidden="true">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="mobile-menu-footer">
            <button
              type="button"
              className="btn btn-outline btn-block"
              onClick={() => {
                setMobileMenuOpen(false);
                logout();
              }}
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
