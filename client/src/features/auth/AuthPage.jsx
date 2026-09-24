import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/authContext.jsx';
import { useToast } from '../../components/shared/Toast.jsx';
import { useTheme } from '../../lib/themeContext.jsx';
import { AlertTriangle } from 'lucide-react';

export function AuthPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const { push } = useToast();
  const { theme } = useTheme();
  const [isRegistering, setIsRegistering] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (isRegistering) {
        await register(email, password, displayName);
        push('Your AlgoVault account is ready!', { type: 'success' });
      } else {
        await login(email, password);
        push('Welcome back to AlgoVault!', { type: 'success' });
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.message ?? (isRegistering ? 'Sign up failed' : 'Login failed'));
      push(`${isRegistering ? 'Sign up' : 'Login'} failed: ${err.message ?? 'Please try again'}`, { type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const switchMode = () => {
    setIsRegistering((value) => !value);
    setError(null);
  };

  const inputStyle = {
    background: theme === 'light' ? '#ffffff' : '#050505',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    padding: '12px 16px',
    borderRadius: '8px',
    outline: 'none',
    marginTop: '6px',
  };

  return (
    <div className="av-auth-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(80vh - 80px)' }}>
      <div className="mono-card" style={{ width: '100%', maxWidth: '420px', padding: '36px' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div className="av-navbar__brand-icon" style={{ width: '48px', height: '48px', fontSize: '22px', margin: '0 auto 16px', borderRadius: '12px' }}>
            AV
          </div>
          <h1 className="text-mono-title" style={{ margin: '0 0 6px', fontSize: '1.6rem' }}>
            {isRegistering ? 'Create your AlgoVault account' : 'Sign in to AlgoVault'}
          </h1>
          <p className="text-mono-desc" style={{ margin: 0, fontSize: '0.88rem' }}>
            {isRegistering ? 'Use your email to receive revision reminders' : 'Your problem-linked DSA prep workspace'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="av-auth-form" style={{ maxWidth: '100%' }}>
          {isRegistering && (
            <label style={{ color: 'var(--text-secondary)' }}>
              Display Name
              <input
                type="text"
                placeholder="Your name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                minLength={2}
                maxLength={60}
                required
                style={inputStyle}
              />
            </label>
          )}
          <label style={{ color: 'var(--text-secondary)', marginTop: isRegistering ? '16px' : 0 }}>
            Email Address
            <input
              type="email"
              placeholder="you@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={inputStyle}
            />
          </label>
          <label style={{ color: 'var(--text-secondary)', marginTop: '16px' }}>
            AlgoVault Password
            <input
              type="password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={isRegistering ? 8 : undefined}
              required
              style={inputStyle}
            />
          </label>

          {error && <p className="av-form-error" style={{ fontSize: '0.85rem', margin: '16px 0 0', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', gap: '6px' }}><AlertTriangle size={16} /> {error}</p>}

          <button type="submit" className="btn-mono-primary" disabled={submitting} style={{ marginTop: '24px', padding: '12px', width: '100%', justifyContent: 'center' }}>
            {submitting ? (isRegistering ? 'Creating account...' : 'Signing in...') : (isRegistering ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '20px 0 0' }}>
          {isRegistering ? 'Already have an account?' : 'New to AlgoVault?'}{' '}
          <button type="button" onClick={switchMode} style={{ background: 'none', border: 0, color: 'var(--accent-color)', cursor: 'pointer', padding: 0, font: 'inherit' }}>
            {isRegistering ? 'Sign in' : 'Create an account'}
          </button>
        </p>
      </div>
    </div>
  );
}
