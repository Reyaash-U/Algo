import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/authContext.jsx';
import { useToast } from '../../components/shared/Toast.jsx';

export function AuthPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { push } = useToast();
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('password');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email, password);
      push('Welcome back to AlgoVault!', { type: 'success' });
      navigate('/vault');
    } catch (err) {
      setError(err.message ?? 'Login failed');
      push('Login failed: ' + (err.message ?? 'Invalid credentials'), { type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="av-auth-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(80vh - 80px)' }}>
      <div className="av-card" style={{ width: '100%', maxWidth: '420px', padding: '36px' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div className="av-navbar__brand-icon" style={{ width: '48px', height: '48px', fontSize: '22px', margin: '0 auto 16px', borderRadius: '12px' }}>
            AV
          </div>
          <h1 style={{ margin: '0 0 6px', fontSize: '1.6rem', color: '#fff' }}>Sign in to AlgoVault</h1>
          <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            Your problem-linked DSA prep workspace
          </p>
        </div>

        <form onSubmit={handleSubmit} className="av-auth-form" style={{ maxWidth: '100%' }}>
          <label>
            Email Address
            <input
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          {error && <p className="av-form-error" style={{ fontSize: '0.85rem', margin: 0 }}>⚠️ {error}</p>}

          <button type="submit" className="av-btn av-btn--primary" disabled={submitting} style={{ marginTop: '8px', padding: '12px' }}>
            {submitting ? 'Signing in…' : 'Sign In →'}
          </button>
        </form>
      </div>
    </div>
  );
}
