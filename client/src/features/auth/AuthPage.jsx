import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/authContext.jsx';
import { useToast } from '../../components/shared/Toast.jsx';
import { useTheme } from '../../lib/themeContext.jsx';
import { AlertTriangle } from 'lucide-react';

export function AuthPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { push } = useToast();
  const { theme } = useTheme();
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
      navigate('/dashboard');
    } catch (err) {
      setError(err.message ?? 'Login failed');
      push('Login failed: ' + (err.message ?? 'Invalid credentials'), { type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="av-auth-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(80vh - 80px)' }}>
      <div className="mono-card" style={{ width: '100%', maxWidth: '420px', padding: '36px' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div className="av-navbar__brand-icon" style={{ width: '48px', height: '48px', fontSize: '22px', margin: '0 auto 16px', borderRadius: '12px' }}>
            AV
          </div>
          <h1 className="text-mono-title" style={{ margin: '0 0 6px', fontSize: '1.6rem' }}>Sign in to AlgoVault</h1>
          <p className="text-mono-desc" style={{ margin: 0, fontSize: '0.88rem' }}>
            Your problem-linked DSA prep workspace
          </p>
        </div>

        <form onSubmit={handleSubmit} className="av-auth-form" style={{ maxWidth: '100%' }}>
          <label style={{ color: 'var(--text-secondary)' }}>
            Email Address
            <input
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                background: theme === 'light' ? '#ffffff' : '#050505',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                padding: '12px 16px',
                borderRadius: '8px',
                outline: 'none',
                marginTop: '6px'
              }}
            />
          </label>
          <label style={{ color: 'var(--text-secondary)', marginTop: '16px' }}>
            Password
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                background: theme === 'light' ? '#ffffff' : '#050505',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                padding: '12px 16px',
                borderRadius: '8px',
                outline: 'none',
                marginTop: '6px'
              }}
            />
          </label>

          {error && <p className="av-form-error" style={{ fontSize: '0.85rem', margin: '16px 0 0', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', gap: '6px' }}><AlertTriangle size={16} /> {error}</p>}

          <button type="submit" className="btn-mono-primary" disabled={submitting} style={{ marginTop: '24px', padding: '12px', width: '100%', justifyContent: 'center' }}>
            {submitting ? 'Signing in…' : 'Sign In →'}
          </button>
        </form>
      </div>
    </div>
  );
}
