import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/authContext.jsx';
import { useToast } from '../../components/shared/Toast.jsx';

// Minimal working login form. Register mode + validation is Frontend Dev's
// to build out (see README.md in this folder) — this establishes the pattern:
// call useAuth(), not api.auth directly, and surface err.code from ApiError.
export function AuthPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { push } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email, password);
      navigate('/vault');
    } catch (err) {
      setError(err.message ?? 'Login failed');
      push('Login failed', { type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="av-auth-page">
      <h1>Sign in to AlgoVault</h1>
      <form onSubmit={handleSubmit} className="av-auth-form">
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && <p className="av-form-error">{error}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      {/* TODO(Frontend Dev): register form toggle */}
    </div>
  );
}
