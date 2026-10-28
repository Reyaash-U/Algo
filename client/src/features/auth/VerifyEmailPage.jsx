import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { api } from '../../api/apiClient.js';

// Landing page for the link in the verification email: /verify-email?token=...
export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const queryClient = useQueryClient();
  const [state, setState] = useState(token ? 'loading' : 'error');
  const [message, setMessage] = useState(token ? '' : 'This verification link is missing its token.');

  useEffect(() => {
    if (!token) return undefined;
    let cancelled = false;
    api.auth
      .verifyEmail(token)
      .then(() => {
        if (cancelled) return;
        setState('success');
        queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      })
      .catch((err) => {
        if (cancelled) return;
        setState('error');
        setMessage(err.message || 'Verification failed.');
      });
    return () => {
      cancelled = true;
    };
  }, [token, queryClient]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(80vh - 80px)' }}>
      <div className="mono-card" style={{ maxWidth: '420px', width: '100%', padding: '36px', textAlign: 'center' }}>
        {state === 'loading' && (
          <>
            <Loader2 size={36} className="animate-spin" style={{ margin: '0 auto 12px' }} />
            <h1 className="text-mono-title" style={{ fontSize: '1.4rem', margin: 0 }}>Verifying your email…</h1>
          </>
        )}
        {state === 'success' && (
          <>
            <CheckCircle2 size={40} style={{ color: '#22c55e', margin: '0 auto 12px' }} />
            <h1 className="text-mono-title" style={{ fontSize: '1.4rem', margin: '0 0 8px' }}>Email verified</h1>
            <p className="text-mono-desc" style={{ margin: '0 0 20px' }}>
              You&apos;ll now receive daily revision reminders. You can change the time or turn them off in Settings.
            </p>
            <Link to="/dashboard" className="btn-mono-primary" style={{ textDecoration: 'none', padding: '10px 20px' }}>
              Go to dashboard
            </Link>
          </>
        )}
        {state === 'error' && (
          <>
            <AlertTriangle size={40} style={{ color: '#ef4444', margin: '0 auto 12px' }} />
            <h1 className="text-mono-title" style={{ fontSize: '1.4rem', margin: '0 0 8px' }}>Couldn&apos;t verify</h1>
            <p className="text-mono-desc" style={{ margin: '0 0 20px' }}>{message}</p>
            <Link to="/settings" className="btn-mono-secondary" style={{ textDecoration: 'none', padding: '10px 20px' }}>
              Request a new link in Settings
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
