import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../Auth.jsx';

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const to = location.state?.from?.pathname || '/admin';
  if (user) navigate(to, { replace: true });

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email, password);
      navigate(to, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="adm-login">
      <form className="adm-login-card" onSubmit={submit}>
        <img src="/assets/media/brand/phcco-logo.webp" alt="PHCCO" className="adm-login-logo" />
        <h1>Content manager</h1>
        <p className="adm-muted">Sign in to manage the PHCCO website.</p>

        <label htmlFor="login-email">Email address</label>
        <input id="login-email" type="email" autoComplete="username" required autoFocus
               value={email} onChange={(e) => setEmail(e.target.value)} />

        <label htmlFor="login-password">Password</label>
        <input id="login-password" type="password" autoComplete="current-password" required
               value={password} onChange={(e) => setPassword(e.target.value)} />

        {error && <p className="adm-error" role="alert">{error}</p>}

        <button className="adm-btn primary" type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>

        <Link className="adm-back adm-muted" to="/">← Back to the website</Link>
      </form>
    </div>
  );
}
