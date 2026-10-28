import { useEffect, useRef } from 'react';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GSI_SRC = 'https://accounts.google.com/gsi/client';

let gsiPromise;
function loadGsi() {
  if (window.google?.accounts?.id) return Promise.resolve();
  gsiPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GSI_SRC;
    script.async = true;
    script.onload = resolve;
    script.onerror = () => {
      gsiPromise = undefined;
      reject(new Error('Could not load Google sign-in'));
    };
    document.head.appendChild(script);
  });
  return gsiPromise;
}

const GoogleLogo = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
  </svg>
);

// Renders Google's official sign-in button when VITE_GOOGLE_CLIENT_ID is set,
// otherwise a placeholder that explains Google sign-in isn't configured.
// `onCredential(idToken)` receives the Google ID token to send to POST /auth/google.
export function GoogleSignInButton({ onCredential, onError, title = 'Sign in with Google' }) {
  const containerRef = useRef(null);
  const handlers = useRef({ onCredential, onError });
  handlers.current = { onCredential, onError };

  useEffect(() => {
    if (!CLIENT_ID) return undefined;
    let cancelled = false;
    loadGsi()
      .then(() => {
        if (cancelled || !containerRef.current) return;
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (response) => handlers.current.onCredential?.(response.credential),
        });
        window.google.accounts.id.renderButton(containerRef.current, {
          type: 'icon',
          shape: 'circle',
          theme: 'outline',
          size: 'large',
        });
      })
      .catch((err) => handlers.current.onError?.(err));
    return () => {
      cancelled = true;
    };
  }, []);

  if (!CLIENT_ID) {
    return (
      <a
        href="#google"
        onClick={(e) => {
          e.preventDefault();
          handlers.current.onError?.(new Error('Google sign-in is not configured yet'));
        }}
        className="social av-social-link"
        title={title}
      >
        <GoogleLogo />
      </a>
    );
  }

  return <div ref={containerRef} title={title} style={{ display: 'inline-flex', margin: '0 5px' }} />;
}
