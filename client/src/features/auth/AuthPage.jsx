import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../lib/authContext.jsx';
import { useToast } from '../../components/shared/Toast.jsx';
import { useTheme } from '../../lib/themeContext.jsx';
import {
  AlertTriangle,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
  Code2,
} from 'lucide-react';
import './auth-slider.css';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export function AuthPage({ defaultMode }) {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { push } = useToast();
  const { theme } = useTheme();

  // Mode is controlled by route or prop
  const isInitialSignup = defaultMode === 'signup' || location.pathname === '/signup';
  const [rightPanelActive, setRightPanelActive] = useState(isInitialSignup);

  // Sign In Form States
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [signInTouched, setSignInTouched] = useState({});
  const [signInErrors, setSignInErrors] = useState({});
  const [signInServerError, setSignInServerError] = useState(null);
  const [signInSubmitting, setSignInSubmitting] = useState(false);

  // Sign Up Form States
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [showSignUpConfirmPassword, setShowSignUpConfirmPassword] = useState(false);
  const [signUpTouched, setSignUpTouched] = useState({});
  const [signUpErrors, setSignUpErrors] = useState({});
  const [signUpServerError, setSignUpServerError] = useState(null);
  const [signUpSubmitting, setSignUpSubmitting] = useState(false);

  // Refs for focusing
  const signInEmailRef = useRef(null);
  const signUpNameRef = useRef(null);

  // Keep slider synced if URL changes
  useEffect(() => {
    if (location.pathname === '/signup') {
      setRightPanelActive(true);
    } else if (location.pathname === '/login' || location.pathname === '/auth') {
      setRightPanelActive(false);
    }
  }, [location.pathname]);

  const handleActivateSignUp = () => {
    setRightPanelActive(true);
    navigate('/signup', { replace: true });
    setSignInServerError(null);
    setSignUpServerError(null);
  };

  const handleActivateSignIn = () => {
    setRightPanelActive(false);
    navigate('/login', { replace: true });
    setSignInServerError(null);
    setSignUpServerError(null);
  };

  // ── Validation: Sign In ──────────────────────────────────────────────────
  const validateSignInField = (field, value) => {
    if (field === 'email') {
      if (!value || !value.trim()) return 'Email address is required';
      if (!EMAIL_REGEX.test(value.trim())) return 'Please enter a valid email address';
      return null;
    }
    if (field === 'password') {
      if (!value) return 'Password is required';
      return null;
    }
    return null;
  };

  const handleSignInChange = (field, val) => {
    setSignInServerError(null);
    if (field === 'email') {
      setSignInEmail(val);
      if (signInTouched.email) {
        setSignInErrors((prev) => ({ ...prev, email: validateSignInField('email', val) }));
      }
    } else if (field === 'password') {
      setSignInPassword(val);
      if (signInTouched.password) {
        setSignInErrors((prev) => ({ ...prev, password: validateSignInField('password', val) }));
      }
    }
  };

  const handleSignInBlur = (field) => {
    setSignInTouched((prev) => ({ ...prev, [field]: true }));
    const val = field === 'email' ? signInEmail : signInPassword;
    setSignInErrors((prev) => ({ ...prev, [field]: validateSignInField(field, val) }));
  };

  const handleSignInSubmit = async (e) => {
    e.preventDefault();
    setSignInServerError(null);

    const emailErr = validateSignInField('email', signInEmail);
    const passErr = validateSignInField('password', signInPassword);

    if (emailErr || passErr) {
      setSignInErrors({ email: emailErr, password: passErr });
      setSignInTouched({ email: true, password: true });
      if (emailErr && signInEmailRef.current) signInEmailRef.current.focus();
      return; // Prevent submission when validation fails
    }

    setSignInSubmitting(true);
    try {
      await login(signInEmail.trim(), signInPassword);
      push('Welcome back to AlgoVault!', { type: 'success' });
      const target = location.state?.from?.pathname || '/dashboard';
      navigate(target, { replace: true });
    } catch (err) {
      const msg = err.message || 'Invalid email or password';
      setSignInServerError(msg);
      push('Login failed: ' + msg, { type: 'error' });
    } finally {
      setSignInSubmitting(false);
    }
  };

  // ── Validation: Sign Up ──────────────────────────────────────────────────
  const validateSignUpField = (field, value, allVals = {}) => {
    if (field === 'name') {
      if (!value || !value.trim()) return 'Full name is required';
      if (value.trim().length < 2) return 'Name must be at least 2 characters';
      if (value.trim().length > 60) return 'Name cannot exceed 60 characters';
      return null;
    }
    if (field === 'email') {
      if (!value || !value.trim()) return 'Email address is required';
      if (!EMAIL_REGEX.test(value.trim())) return 'Please enter a valid email address';
      return null;
    }
    if (field === 'password') {
      if (!value) return 'Password is required';
      if (value.length < 8) return 'Password must be at least 8 characters';
      return null;
    }
    if (field === 'confirmPassword') {
      if (!value) return 'Please confirm your password';
      const targetPass = allVals.password !== undefined ? allVals.password : signUpPassword;
      if (value !== targetPass) return 'Passwords do not match';
      return null;
    }
    return null;
  };

  const handleSignUpChange = (field, val) => {
    setSignUpServerError(null);
    if (field === 'name') {
      setSignUpName(val);
      if (signUpTouched.name) {
        setSignUpErrors((prev) => ({ ...prev, name: validateSignUpField('name', val) }));
      }
    } else if (field === 'email') {
      setSignUpEmail(val);
      if (signUpTouched.email) {
        setSignUpErrors((prev) => ({ ...prev, email: validateSignUpField('email', val) }));
      }
    } else if (field === 'password') {
      setSignUpPassword(val);
      if (signUpTouched.password) {
        setSignUpErrors((prev) => ({ ...prev, password: validateSignUpField('password', val) }));
      }
      if (signUpTouched.confirmPassword) {
        setSignUpErrors((prev) => ({
          ...prev,
          confirmPassword: validateSignUpField('confirmPassword', signUpConfirmPassword, { password: val }),
        }));
      }
    } else if (field === 'confirmPassword') {
      setSignUpConfirmPassword(val);
      if (signUpTouched.confirmPassword) {
        setSignUpErrors((prev) => ({
          ...prev,
          confirmPassword: validateSignUpField('confirmPassword', val, { password: signUpPassword }),
        }));
      }
    }
  };

  const handleSignUpBlur = (field) => {
    setSignUpTouched((prev) => ({ ...prev, [field]: true }));
    let val = '';
    if (field === 'name') val = signUpName;
    if (field === 'email') val = signUpEmail;
    if (field === 'password') val = signUpPassword;
    if (field === 'confirmPassword') val = signUpConfirmPassword;

    setSignUpErrors((prev) => ({
      ...prev,
      [field]: validateSignUpField(field, val, { password: signUpPassword }),
    }));
  };

  const handleSignUpSubmit = async (e) => {
    e.preventDefault();
    setSignUpServerError(null);

    const nameErr = validateSignUpField('name', signUpName);
    const emailErr = validateSignUpField('email', signUpEmail);
    const passErr = validateSignUpField('password', signUpPassword);
    const confErr = validateSignUpField('confirmPassword', signUpConfirmPassword, { password: signUpPassword });

    if (nameErr || emailErr || passErr || confErr) {
      setSignUpErrors({
        name: nameErr,
        email: emailErr,
        password: passErr,
        confirmPassword: confErr,
      });
      setSignUpTouched({
        name: true,
        email: true,
        password: true,
        confirmPassword: true,
      });
      if (nameErr && signUpNameRef.current) signUpNameRef.current.focus();
      return; // Prevent submission when validation fails
    }

    setSignUpSubmitting(true);
    try {
      await register(signUpEmail.trim(), signUpPassword, signUpName.trim());
      push('Account created! Welcome to AlgoVault.', { type: 'success' });
      const target = location.state?.from?.pathname || '/dashboard';
      navigate(target, { replace: true });
    } catch (err) {
      const msg = err.message || 'Registration failed';
      setSignUpServerError(msg);
      push('Signup failed: ' + msg, { type: 'error' });
    } finally {
      setSignUpSubmitting(false);
    }
  };

  const hasMinLength = signUpPassword.length >= 8;
  const passwordsMatch = signUpConfirmPassword.length > 0 && signUpPassword === signUpConfirmPassword;

  return (
    <div className="av-slider-auth-wrapper">
      <div
        className={`container av-slider-container ${rightPanelActive ? 'right-panel-active' : ''}`}
        id="container"
      >
        {/* ── Sign Up Form Container ────────────────────────────────────── */}
        <div className="form-container sign-up-container av-form-container av-sign-up-container">
          <form className="av-slider-form" onSubmit={handleSignUpSubmit} noValidate>
            <h1 className="av-slider-title">Create Account</h1>

            <div className="social-container av-social-container">
              <a
                href="#google"
                onClick={(e) => { e.preventDefault(); push('Google sign-in available soon', { type: 'info' }); }}
                className="social av-social-link"
                title="Sign up with Google"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                </svg>
              </a>
              <a
                href="#github"
                onClick={(e) => { e.preventDefault(); push('GitHub sign-in available soon', { type: 'info' }); }}
                className="social av-social-link"
                title="Sign up with GitHub"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                </svg>
              </a>
              <a
                href="#codeforces"
                onClick={(e) => { e.preventDefault(); push('Codeforces sync available inside settings', { type: 'info' }); }}
                className="social av-social-link"
                title="Competitive programming link"
              >
                <Code2 size={16} />
              </a>
            </div>

            <span className="av-slider-subtitle">or use your email for registration</span>

            {/* Server Error Alert */}
            {signUpServerError && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#ef4444',
                  fontSize: '0.78rem',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(239, 68, 68, 0.12)',
                  marginBottom: '8px',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              >
                <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                <span>{signUpServerError}</span>
              </div>
            )}

            {/* Name Input */}
            <div className="av-input-group">
              <input
                ref={signUpNameRef}
                type="text"
                placeholder="Name"
                value={signUpName}
                onChange={(e) => handleSignUpChange('name', e.target.value)}
                onBlur={() => handleSignUpBlur('name')}
                className={`av-slider-input ${signUpTouched.name && signUpErrors.name ? 'input-error' : ''}`}
              />
              {signUpTouched.name && signUpErrors.name && (
                <div className="av-field-error">
                  <AlertCircle size={12} /> {signUpErrors.name}
                </div>
              )}
            </div>

            {/* Email Input */}
            <div className="av-input-group">
              <input
                type="email"
                placeholder="Email"
                value={signUpEmail}
                onChange={(e) => handleSignUpChange('email', e.target.value)}
                onBlur={() => handleSignUpBlur('email')}
                className={`av-slider-input ${signUpTouched.email && signUpErrors.email ? 'input-error' : ''}`}
              />
              {signUpTouched.email && signUpErrors.email && (
                <div className="av-field-error">
                  <AlertCircle size={12} /> {signUpErrors.email}
                </div>
              )}
            </div>

            {/* Password Input */}
            <div className="av-input-group">
              <div style={{ position: 'relative' }}>
                <input
                  type={showSignUpPassword ? 'text' : 'password'}
                  placeholder="Password (min 8 chars)"
                  value={signUpPassword}
                  onChange={(e) => handleSignUpChange('password', e.target.value)}
                  onBlur={() => handleSignUpBlur('password')}
                  className={`av-slider-input ${signUpTouched.password && signUpErrors.password ? 'input-error' : ''}`}
                  style={{ paddingRight: '36px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    display: 'flex',
                  }}
                  aria-label="Toggle password visibility"
                >
                  {showSignUpPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {signUpTouched.password && signUpErrors.password && (
                <div className="av-field-error">
                  <AlertCircle size={12} /> {signUpErrors.password}
                </div>
              )}
            </div>

            {/* Confirm Password Input */}
            <div className="av-input-group">
              <div style={{ position: 'relative' }}>
                <input
                  type={showSignUpConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm Password"
                  value={signUpConfirmPassword}
                  onChange={(e) => handleSignUpChange('confirmPassword', e.target.value)}
                  onBlur={() => handleSignUpBlur('confirmPassword')}
                  className={`av-slider-input ${signUpTouched.confirmPassword && signUpErrors.confirmPassword ? 'input-error' : ''}`}
                  style={{ paddingRight: '36px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowSignUpConfirmPassword(!showSignUpConfirmPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    display: 'flex',
                  }}
                  aria-label="Toggle confirm password visibility"
                >
                  {showSignUpConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {signUpTouched.confirmPassword && signUpErrors.confirmPassword && (
                <div className="av-field-error">
                  <AlertCircle size={12} /> {signUpErrors.confirmPassword}
                </div>
              )}
            </div>

            {/* Visual requirement indicators */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '6px', fontSize: '0.72rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: hasMinLength ? '#10b981' : 'var(--text-secondary)' }}>
                <CheckCircle2 size={12} style={{ color: hasMinLength ? '#10b981' : '#71717a' }} />
                8+ characters
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: passwordsMatch ? '#10b981' : 'var(--text-secondary)' }}>
                <CheckCircle2 size={12} style={{ color: passwordsMatch ? '#10b981' : '#71717a' }} />
                Passwords match
              </span>
            </div>

            <button type="submit" className="av-slider-btn" disabled={signUpSubmitting}>
              {signUpSubmitting ? 'Signing Up…' : 'Sign Up'}
            </button>

            {/* Mobile Switch Link */}
            <p className="av-mobile-toggle-btn" style={{ display: 'none', margin: '14px 0 0', fontSize: '0.8rem' }}>
              Already have an account?{' '}
              <a
                href="#signin"
                onClick={(e) => { e.preventDefault(); handleActivateSignIn(); }}
                style={{ color: '#ff4f12', fontWeight: 600 }}
              >
                Sign In
              </a>
            </p>
          </form>
        </div>

        {/* ── Sign In Form Container ────────────────────────────────────── */}
        <div className="form-container sign-in-container av-form-container av-sign-in-container">
          <form className="av-slider-form" onSubmit={handleSignInSubmit} noValidate>
            <h1 className="av-slider-title">Sign in</h1>

            <div className="social-container av-social-container">
              <a
                href="#google"
                onClick={(e) => { e.preventDefault(); push('Google sign-in available soon', { type: 'info' }); }}
                className="social av-social-link"
                title="Sign in with Google"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                </svg>
              </a>
              <a
                href="#github"
                onClick={(e) => { e.preventDefault(); push('GitHub sign-in available soon', { type: 'info' }); }}
                className="social av-social-link"
                title="Sign in with GitHub"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                </svg>
              </a>
              <a
                href="#codeforces"
                onClick={(e) => { e.preventDefault(); push('Codeforces sync available inside settings', { type: 'info' }); }}
                className="social av-social-link"
                title="Competitive programming link"
              >
                <Code2 size={16} />
              </a>
            </div>

            <span className="av-slider-subtitle">or use your account</span>

            {/* Server Error Alert */}
            {signInServerError && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#ef4444',
                  fontSize: '0.78rem',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(239, 68, 68, 0.12)',
                  marginBottom: '8px',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              >
                <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                <span>{signInServerError}</span>
              </div>
            )}

            {/* Email Input */}
            <div className="av-input-group">
              <input
                ref={signInEmailRef}
                type="email"
                placeholder="Email"
                value={signInEmail}
                onChange={(e) => handleSignInChange('email', e.target.value)}
                onBlur={() => handleSignInBlur('email')}
                className={`av-slider-input ${signInTouched.email && signInErrors.email ? 'input-error' : ''}`}
              />
              {signInTouched.email && signInErrors.email && (
                <div className="av-field-error">
                  <AlertCircle size={12} /> {signInErrors.email}
                </div>
              )}
            </div>

            {/* Password Input */}
            <div className="av-input-group">
              <div style={{ position: 'relative' }}>
                <input
                  type={showSignInPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={signInPassword}
                  onChange={(e) => handleSignInChange('password', e.target.value)}
                  onBlur={() => handleSignInBlur('password')}
                  className={`av-slider-input ${signInTouched.password && signInErrors.password ? 'input-error' : ''}`}
                  style={{ paddingRight: '36px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowSignInPassword(!showSignInPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    display: 'flex',
                  }}
                  aria-label="Toggle password visibility"
                >
                  {showSignInPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {signInTouched.password && signInErrors.password && (
                <div className="av-field-error">
                  <AlertCircle size={12} /> {signInErrors.password}
                </div>
              )}
            </div>

            <a
              href="#forgot"
              onClick={(e) => {
                e.preventDefault();
                push('Password reset link will be sent to your email', { type: 'info' });
              }}
              className="av-forgot-link"
            >
              Forgot your password?
            </a>

            <button type="submit" className="av-slider-btn" disabled={signInSubmitting}>
              {signInSubmitting ? 'Signing In…' : 'Sign In'}
            </button>

            {/* Mobile Switch Link */}
            <p className="av-mobile-toggle-btn" style={{ display: 'none', margin: '14px 0 0', fontSize: '0.8rem' }}>
              Don't have an account?{' '}
              <a
                href="#signup"
                onClick={(e) => { e.preventDefault(); handleActivateSignUp(); }}
                style={{ color: '#ff4f12', fontWeight: 600 }}
              >
                Sign Up
              </a>
            </p>
          </form>
        </div>

        {/* ── Overlay Container ─────────────────────────────────────────── */}
        <div className="overlay-container av-overlay-container">
          <div className="overlay av-overlay">
            {/* Left Panel (shown when right-panel-active / Sign Up) */}
            <div className="overlay-panel overlay-left av-overlay-panel av-overlay-left">
              <h1 style={{ fontWeight: 800, fontSize: '1.85rem', margin: 0 }}>Welcome Back!</h1>
              <p style={{ margin: '16px 0 24px', fontSize: '0.9rem', lineHeight: 1.5, opacity: 0.95 }}>
                To keep connected with us please login with your personal info
              </p>
              <button
                className="ghost av-slider-btn"
                id="signIn"
                type="button"
                onClick={handleActivateSignIn}
              >
                Sign In
              </button>
            </div>

            {/* Right Panel (shown in default state / Sign In) */}
            <div className="overlay-panel overlay-right av-overlay-panel av-overlay-right">
              <h1 style={{ fontWeight: 800, fontSize: '1.85rem', margin: 0 }}>Hello, Friend!</h1>
              <p style={{ margin: '16px 0 24px', fontSize: '0.9rem', lineHeight: 1.5, opacity: 0.95 }}>
                Enter your personal details and start journey with us
              </p>
              <button
                className="ghost av-slider-btn"
                id="signUp"
                type="button"
                onClick={handleActivateSignUp}
              >
                Sign Up
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
