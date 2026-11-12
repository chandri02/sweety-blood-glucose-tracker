import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function LoginPage() {
  const { login, register } = useAuth();
  const { toast } = useToast();

  const [mode, setMode] = useState('login'); // 'login' | 'register'

  // Login form state
  const [loginEmail, setLoginEmail] = useState('demo@sweetyapp.local');
  const [loginPassword, setLoginPassword] = useState('DemoPassword123!');

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  function switchMode(newMode) {
    setErrorMsg('');
    if (newMode === 'login' && regEmail) {
      setLoginEmail(regEmail);
    } else if (newMode === 'register' && loginEmail && loginEmail !== 'demo@sweetyapp.local') {
      setRegEmail(loginEmail);
    }
    setMode(newMode);
  }

  async function handleLoginSubmit(e) {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      await login(loginEmail, loginPassword);
      toast.success('Signed in successfully.');
    } catch (err) {
      setErrorMsg(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegisterSubmit(e) {
    e.preventDefault();
    setErrorMsg('');

    // Client-side validations
    if (!regName.trim() || regName.trim().length < 2) {
      setErrorMsg('Full name must be at least 2 characters long.');
      return;
    }

    if (!regEmail.trim() || !regEmail.includes('@')) {
      setErrorMsg('A valid email address is required.');
      return;
    }

    if (regPassword.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }

    if (!/[A-Z]/.test(regPassword)) {
      setErrorMsg('Password must contain at least one uppercase letter (A-Z).');
      return;
    }

    if (!/[a-z]/.test(regPassword)) {
      setErrorMsg('Password must contain at least one lowercase letter (a-z).');
      return;
    }

    if (!/[0-9]/.test(regPassword)) {
      setErrorMsg('Password must contain at least one number (0-9).');
      return;
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(regPassword)) {
      setErrorMsg('Password must contain at least one special character.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setErrorMsg('Password and Confirm Password do not match.');
      return;
    }

    setLoading(true);
    try {
      await register({
        name: regName.trim(),
        email: regEmail.trim(),
        password: regPassword,
        confirmPassword: regConfirmPassword,
      });
      toast.success('Account created successfully! Welcome to Sweety.');
    } catch (err) {
      setErrorMsg(err.message || 'Registration failed. Please check your details.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page-container">
      <div className="login-card">
        <div className="login-header">
          <span className="brand-icon-lg" aria-hidden="true">🩸</span>
          <h2 className="login-title">
            {mode === 'login' ? 'Sign in to Sweety' : 'Create your Sweety Account'}
          </h2>
          <p className="login-subtitle">
            {mode === 'login'
              ? 'Secure, personalized blood glucose tracking and clinical analytics.'
              : 'Join Sweety for private, personalized blood glucose monitoring.'}
          </p>
        </div>

        {errorMsg && (
          <div className="alert alert-error" role="alert" style={{ marginBottom: '1rem' }}>
            <div>{errorMsg}</div>
            {mode === 'register' && errorMsg.includes('already exists') && (
              <div style={{ marginTop: '0.4rem' }}>
                <button
                  type="button"
                  className="btn-auth-switch"
                  onClick={() => switchMode('login')}
                  style={{ color: '#0369a1', fontWeight: 600 }}
                >
                  Sign in with this email instead →
                </button>
              </div>
            )}
          </div>
        )}

        {mode === 'login' ? (
          <>
            <form onSubmit={handleLoginSubmit} className="login-form">
              <div className="form-group">
                <label htmlFor="login-email">Email Address</label>
                <input
                  id="login-email"
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
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
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
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

            <div className="auth-toggle-box">
              <p className="auth-toggle-text">New patient or want a private account?</p>
              <button
                type="button"
                className="btn btn-secondary btn-block"
                onClick={() => switchMode('register')}
                disabled={loading}
              >
                Create an Account
              </button>
            </div>

            <div className="demo-credentials-callout">
              <span className="demo-badge">Demo Account</span>
              <p>Email: <code>demo@sweetyapp.local</code></p>
              <p>Password: <code>DemoPassword123!</code></p>
            </div>
          </>
        ) : (
          <>
            <form onSubmit={handleRegisterSubmit} className="login-form">
              <div className="form-group">
                <label htmlFor="reg-name">Full Name</label>
                <input
                  id="reg-name"
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="form-input"
                  placeholder="e.g. Jane Doe"
                  minLength={2}
                  maxLength={100}
                />
              </div>

              <div className="form-group">
                <label htmlFor="reg-email">Email Address</label>
                <input
                  id="reg-email"
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="form-input"
                  placeholder="jane@example.com"
                />
              </div>

              <div className="form-group">
                <label htmlFor="reg-password">Password</label>
                <input
                  id="reg-password"
                  type="password"
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="form-input"
                  placeholder="••••••••••••"
                />
                <span className="password-requirement-hint">
                  Must be at least 8 characters, with uppercase, lowercase, number & special character.
                </span>
              </div>

              <div className="form-group">
                <label htmlFor="reg-confirm-password">Confirm Password</label>
                <input
                  id="reg-confirm-password"
                  type="password"
                  required
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  className="form-input"
                  placeholder="••••••••••••"
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-block"
                disabled={loading}
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>

            <div className="auth-toggle-box">
              <p className="auth-toggle-text">Already have an account?</p>
              <button
                type="button"
                className="btn-auth-switch"
                onClick={() => switchMode('login')}
                disabled={loading}
              >
                Return to Sign In
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
