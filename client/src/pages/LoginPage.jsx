import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('demo@sweetyapp.local');
  const [password, setPassword] = useState('DemoPassword123!');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setErrorMsg(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page-container">
      <div className="login-card">
        <div className="login-header">
          <span className="brand-icon-lg" aria-hidden="true">🩸</span>
          <h2 className="login-title">Sign in to Sweety</h2>
          <p className="login-subtitle">
            Secure, personalized blood glucose tracking and clinical analytics.
          </p>
        </div>

        {errorMsg && (
          <div className="alert alert-error" role="alert">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="login-email">Email Address</label>
            <input
              id="login-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
              placeholder="patient@example.com"
            />
          </div>

          <div className="form-group">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              placeholder="••••••••••••"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="demo-credentials-callout">
          <span className="demo-badge">Demo Account</span>
          <p>Email: <code>demo@sweetyapp.local</code></p>
          <p>Password: <code>DemoPassword123!</code></p>
        </div>
      </div>
    </div>
  );
}
