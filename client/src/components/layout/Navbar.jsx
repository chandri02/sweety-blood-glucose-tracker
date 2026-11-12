import React from 'react';
import { useAuth } from '../../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <span className="brand-icon" aria-hidden="true">🩸</span>
          <div>
            <h1 className="brand-title">Sweety</h1>
            <span className="brand-subtitle">Blood Glucose Tracker</span>
          </div>
        </div>

        {user && (
          <div className="navbar-user">
            <div className="user-info">
              <span className="user-name">{user.name}</span>
              <span className="user-email">{user.email}</span>
            </div>
            <button className="btn btn-outline" onClick={logout} title="Sign out of Sweety">
              Sign Out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
