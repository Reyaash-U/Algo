import { useState } from 'react';
import { X, Sparkles, AlertCircle } from 'lucide-react';
import { useTheme } from '../../../lib/themeContext.jsx';

export function CodeforcesConnectModal({ isOpen, onClose, onConnect, initialHandle = '', isLoading = false, error = null }) {
  const [handle, setHandle] = useState(initialHandle);
  const { theme } = useTheme();
  const isLight = theme === 'light';

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!handle.trim()) return;
    onConnect(handle.trim());
  };

  const sampleHandles = ['tourist', 'Benq', 'Petr', 'ecnerwala'];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        className="mono-card"
        style={{
          width: '100%',
          maxWidth: '460px',
          padding: '28px',
          background: isLight ? '#ffffff' : '#0c0c0e',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} style={{ color: '#3b82f6' }} />
            <h3 className="text-mono-title" style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
              Connect Codeforces
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
            }}
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-mono-desc" style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.45 }}>
          Enter your Codeforces handle to sync rating history, contest rankings, and problem statistics.
        </p>

        {error && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              color: '#ef4444',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label
              style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '0.82rem',
                fontWeight: 700,
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Codeforces Handle
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="e.g. tourist"
                autoFocus
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: isLight ? '#f9fafb' : '#141416',
                  color: 'var(--text-primary)',
                  fontSize: '1rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Quick suggestion tags */}
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Try a sample handle:
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
              {sampleHandles.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setHandle(s)}
                  style={{
                    background: isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    borderRadius: '16px',
                    padding: '3px 10px',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn-mono-secondary"
              style={{ padding: '8px 16px', fontSize: '0.88rem' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !handle.trim()}
              className="btn-mono-primary"
              style={{
                padding: '8px 20px',
                fontSize: '0.88rem',
                opacity: isLoading || !handle.trim() ? 0.6 : 1,
                cursor: isLoading || !handle.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              {isLoading ? 'Connecting...' : 'Connect'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
