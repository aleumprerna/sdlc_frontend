import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api/backend/auth';
import './login.css';

function Login() {
  const navigate = useNavigate();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    if (isSigningIn) return;
    setIsSigningIn(true);
    setError('');

    try {
      await login();
      navigate('/home', { replace: true });
    } catch (loginError) {
      setError(loginError.message || 'Unable to sign in. Please try again.');
    } finally {
      setIsSigningIn(false);
    }
  }

  return (
    <main className="login-page">
      <div className="login-shell workspace-container">
        <div className="login-intro">
          <svg className="login-brand" viewBox="0 0 36 36" aria-hidden="true" focusable="false">
            <rect x="1" y="1" width="34" height="34" rx="8" fill="currentColor" />
            <path d="M27 10H10v16h17" fill="none" stroke="var(--accent-ink)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <h1>AI for SDLC</h1>
          <p className="login-subtitle">Manage project discovery and documents in one workspace.</p>
        </div>

        <section className="login-card" aria-labelledby="sign-in-title">
          <h2 id="sign-in-title">Sign in</h2>
          <button
            className="microsoft-sign-in button-primary"
            type="button"
            aria-describedby="login-demo-note"
            onClick={handleLogin}
            disabled={isSigningIn}
            aria-busy={isSigningIn}
          >
            <svg className="microsoft-icon" viewBox="0 0 28 28" aria-hidden="true" focusable="false">
              <path fill="currentColor" d="M0 0h12v12H0zM16 0h12v12H16zM0 16h12v12H0zM16 16h12v12H16z" />
            </svg>
            <span>{isSigningIn ? 'Signing in...' : 'Sign in with Microsoft'}</span>
          </button>
          <p id="login-demo-note" className="login-demo-note">This demo uses a temporary account.</p>
          {error && <p className="login-status" role="alert">{error}</p>}
        </section>
      </div>
    </main>
  );
}

export default Login;
