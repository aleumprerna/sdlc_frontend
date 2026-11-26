import { useEffect, useId, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getCurrentUser, logout } from '../api/backend/auth';
import './Header.css';

function AccountMenu() {
  const navigate = useNavigate();
  const menuId = useId();
  const menu = useRef(null);
  const trigger = useRef(null);
  const [user, setUser] = useState(null);
  const [profileError, setProfileError] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    getCurrentUser({ signal: controller.signal })
      .then((profile) => {
        if (!controller.signal.aborted) setUser(profile);
      })
      .catch(() => {
        if (!controller.signal.aborted) setProfileError(true);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    function dismissOutside(event) {
      if (!menu.current?.contains(event.target)) setIsOpen(false);
    }

    document.addEventListener('pointerdown', dismissOutside);
    return () => document.removeEventListener('pointerdown', dismissOutside);
  }, [isOpen]);

  function handleLogout() {
    logout().catch(() => {
      // The browser session is cleared even if the backend is unreachable.
    });
    navigate('/login', { replace: true });
  }

  const name = user?.name?.trim() || '';
  const email = user?.email || '';
  const parts = (name || email.split('@')[0]).split(/\s+/).filter(Boolean);
  const initials = parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : parts[0]?.[0];

  return (
    <div className="header-account" ref={menu} onKeyDown={(event) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        trigger.current?.focus();
      }
    }}>
      <button className="header-avatar" ref={trigger} type="button" aria-label="Account menu"
        aria-expanded={isOpen} aria-controls={menuId} onClick={() => setIsOpen((open) => !open)}>
        {initials?.toUpperCase() || (profileError ? '?' : '…')}
      </button>
      <div id={menuId} className="header-account-panel" hidden={!isOpen}>
        <div className="header-account-profile">
          {name && <p className="header-account-name">{name}</p>}
          {email && <p className="header-account-email">{email}</p>}
          {!user && <p className="header-account-email" role="status">{profileError ? 'Account details unavailable.' : 'Loading account…'}</p>}
        </div>
        <button className="header-account-logout" type="button" onClick={handleLogout}>Log out</button>
      </div>
    </div>
  );
}

function Header() {
  return (
    <header className="app-header">
      <div className="app-header-inner workspace-container">
        <Link className="app-brand" to="/home" aria-label="AI for SDLC home">
          <svg viewBox="0 0 36 36" aria-hidden="true" focusable="false">
            <rect x="1" y="1" width="34" height="34" rx="8" fill="currentColor" />
            <path d="M27 10H10v16h17" fill="none" stroke="var(--accent-ink)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>AI for SDLC</span>
        </Link>

        <div className="app-header-actions">
          <details className="header-usage">
            <summary>Usage</summary>
            <p className="header-usage-message">Usage information will appear here when reporting is connected.</p>
          </details>
          <AccountMenu />
        </div>
      </div>
    </header>
  );
}

export default Header;
