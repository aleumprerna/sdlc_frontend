import { useState } from 'react';
import './login.css';

function Login() {
  const [signInMessage, setSignInMessage] = useState('');

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <svg
          className="login-brand"
          viewBox="0 0 76 76"
          aria-hidden="true"
          focusable="false"
        >
          <rect width="76" height="76" rx="20" fill="currentColor" />
          <path
            d="M62 20H20v45h42"
            fill="none"
            stroke="#0e161c"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        <h1 id="login-title">AI for SDLC</h1>
        <p className="login-subtitle">
          Discovery workspace for the delivery team
        </p>

        <button
          className="microsoft-sign-in"
          type="button"
          aria-describedby="login-demo-note"
          onClick={() =>
            setSignInMessage('Microsoft sign-in is not configured yet.')
          }
        >
          <svg
            className="microsoft-icon"
            viewBox="0 0 28 28"
            aria-hidden="true"
            focusable="false"
          >
            <path
              fill="currentColor"
              d="M0 0h12v12H0zM16 0h12v12H16zM0 16h12v12H0zM16 16h12v12H16z"
            />
          </svg>
          <span>Sign in with Microsoft</span>
        </button>

        <p id="login-demo-note" className="login-demo-note">
          For this demo, Microsoft sign-in uses the temporary account.
        </p>
        <p className="login-status" role="status">{signInMessage}</p>
      </section>
    </main>
  );
}

export default Login;
