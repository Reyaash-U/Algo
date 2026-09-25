import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/apiClient.js';
import { useAuth } from '../../lib/authContext.jsx';
import { useToast } from '../../components/shared/Toast.jsx';
import { useTheme } from '../../lib/themeContext.jsx';
import {
  User,
  Camera,
  Sparkles,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Mail,
  Calendar,
  Shield,
  ExternalLink,
} from 'lucide-react';

const PRESET_AVATARS = [
  'https://api.dicebear.com/7.x/bottts/svg?seed=AlgoNinja&backgroundColor=b6e3f4,c0aede,d1d4f9',
  'https://api.dicebear.com/7.x/bottts/svg?seed=CodeMaster&backgroundColor=ffd5dc,ffdfbf',
  'https://api.dicebear.com/7.x/bottts/svg?seed=BinarySearch&backgroundColor=c0aede,b6e3f4',
  'https://api.dicebear.com/7.x/bottts/svg?seed=GraphTheory&backgroundColor=d1d4f9,ffd5dc',
  'https://api.dicebear.com/7.x/identicon/svg?seed=DynamicProgramming',
  'https://api.dicebear.com/7.x/identicon/svg?seed=SegmentTree',
  'https://api.dicebear.com/7.x/identicon/svg?seed=TrieNode',
  'https://api.dicebear.com/7.x/bottts/svg?seed=BitMask&backgroundColor=ffdfbf,ffd5dc',
];

export function SettingsPage() {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { theme } = useTheme();

  // Load existing user profile values
  const { data: meData, isLoading: isLoadingUser } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => api.auth.me(),
    initialData: user ? { user } : undefined,
  });

  const currentUser = meData?.user || user;

  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bio, setBio] = useState('');
  const [customAvatarInput, setCustomAvatarInput] = useState('');
  const [errors, setErrors] = useState({});
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync state when currentUser is loaded
  useEffect(() => {
    if (currentUser) {
      setDisplayName(currentUser.displayName || '');
      setAvatarUrl(currentUser.avatarUrl || '');
      setBio(currentUser.bio || '');
      setCustomAvatarInput(currentUser.avatarUrl || '');
    }
  }, [currentUser]);

  // Validation
  const validate = () => {
    const newErrors = {};
    const trimmedName = displayName.trim();
    if (!trimmedName) {
      newErrors.displayName = 'Display name is required.';
    } else if (trimmedName.length < 2) {
      newErrors.displayName = 'Display name must be at least 2 characters.';
    } else if (trimmedName.length > 50) {
      newErrors.displayName = 'Display name cannot exceed 50 characters.';
    }

    if (avatarUrl && avatarUrl.trim()) {
      const url = avatarUrl.trim();
      const isHttp = url.startsWith('http://') || url.startsWith('https://');
      const isData = url.startsWith('data:image/');
      if (!isHttp && !isData) {
        newErrors.avatarUrl = 'Avatar URL must start with http://, https://, or data:image/';
      }
    }

    if (bio && bio.length > 500) {
      newErrors.bio = 'Bio cannot exceed 500 characters.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const updateMutation = useMutation({
    mutationFn: (payload) => api.auth.updateProfile(payload),
    onSuccess: (data) => {
      const updatedUser = data?.user || { ...currentUser, displayName, avatarUrl, bio };
      updateUser(updatedUser);
      queryClient.setQueryData(['auth', 'me'], { user: updatedUser });
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      setSaveSuccess(true);
      toast.push('Profile updated successfully!', { type: 'success' });
      setTimeout(() => setSaveSuccess(false), 4000);
    },
    onError: (err) => {
      const msg = err.message || 'Failed to update profile';
      toast.push(msg, { type: 'error' });
      setErrors((prev) => ({ ...prev, form: msg }));
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setSaveSuccess(false);
    if (!validate()) return;

    updateMutation.mutate({
      displayName: displayName.trim(),
      avatarUrl: avatarUrl ? avatarUrl.trim() : null,
      bio: bio ? bio.trim() : '',
    });
  };

  const handleReset = () => {
    if (currentUser) {
      setDisplayName(currentUser.displayName || '');
      setAvatarUrl(currentUser.avatarUrl || '');
      setBio(currentUser.bio || '');
      setCustomAvatarInput(currentUser.avatarUrl || '');
    }
    setErrors({});
    setSaveSuccess(false);
  };

  const handleSelectPresetAvatar = (url) => {
    setAvatarUrl(url);
    setCustomAvatarInput(url);
    if (errors.avatarUrl) {
      setErrors((prev) => ({ ...prev, avatarUrl: null }));
    }
  };

  const handleCustomAvatarBlur = () => {
    const val = customAvatarInput.trim();
    setAvatarUrl(val);
    if (errors.avatarUrl) {
      setErrors((prev) => ({ ...prev, avatarUrl: null }));
    }
  };

  const formattedJoinDate = currentUser?.createdAt
    ? new Date(currentUser.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      })
    : 'Recently';

  return (
    <div
      className="av-settings-page"
      style={{
        maxWidth: '760px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        padding: '8px 0 40px',
      }}
    >
      {/* Header */}
      <div>
        <h1
          className="text-mono-title"
          style={{
            margin: 0,
            fontSize: '2rem',
            fontWeight: 850,
            letterSpacing: '-0.03em',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <User size={30} strokeWidth={2.5} style={{ color: '#38bdf8' }} /> Account & Profile Settings
        </h1>
        <p className="text-mono-desc" style={{ margin: '6px 0 0', fontSize: '0.95rem' }}>
          Manage your public identity, display name, avatar, and personal developer profile.
        </p>
      </div>

      {/* Success Notification Banner */}
      {saveSuccess && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: '8px',
            background: 'rgba(34, 197, 94, 0.12)',
            border: '1px solid rgba(34, 197, 94, 0.35)',
            color: '#22c55e',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.88rem',
            fontWeight: 650,
          }}
        >
          <CheckCircle2 size={18} />
          Changes saved successfully to your database!
        </div>
      )}

      {/* Main Settings Form Card */}
      <form onSubmit={handleSubmit} className="mono-card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
        {/* Section 1: Profile Avatar & Preview */}
        <div>
          <h2
            style={{
              margin: '0 0 16px',
              fontSize: '1.1rem',
              fontWeight: 800,
              color: 'var(--text-primary)',
              letterSpacing: '-0.01em',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Camera size={18} style={{ color: '#ec4899' }} /> Profile Picture / Avatar
          </h2>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '24px',
              flexWrap: 'wrap',
              background: theme === 'light' ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)',
              padding: '20px',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
            }}
          >
            {/* Live Avatar Preview */}
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  width: '84px',
                  height: '84px',
                  borderRadius: '50%',
                  border: '2px solid #38bdf8',
                  boxShadow: '0 0 16px rgba(56, 189, 248, 0.25)',
                  overflow: 'hidden',
                  background: theme === 'light' ? '#f1f5f9' : '#18181b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName || 'User Avatar'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                        displayName || 'AV'
                      )}`;
                    }}
                  />
                ) : (
                  <span
                    style={{
                      fontSize: '1.8rem',
                      fontWeight: 850,
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {(displayName || 'A').slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
            </div>

            {/* Avatar URL input & presets */}
            <div style={{ flex: 1, minWidth: '240px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label
                  htmlFor="avatarUrlInput"
                  style={{ fontSize: '0.8rem', fontWeight: 650, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}
                >
                  Custom Avatar Image URL
                </label>
                <input
                  id="avatarUrlInput"
                  type="text"
                  className="av-input"
                  placeholder="https://example.com/avatar.png or data:image/..."
                  value={customAvatarInput}
                  onChange={(e) => setCustomAvatarInput(e.target.value)}
                  onBlur={handleCustomAvatarBlur}
                  style={{ width: '100%', padding: '9px 12px', fontSize: '0.86rem' }}
                />
                {errors.avatarUrl && (
                  <span style={{ fontSize: '0.78rem', color: '#f43f5e', marginTop: '4px', display: 'block' }}>
                    {errors.avatarUrl}
                  </span>
                )}
              </div>

              {/* Quick Preset Selector */}
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Or pick a curated avatar:
                </span>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {PRESET_AVATARS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectPresetAvatar(preset)}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        border: avatarUrl === preset ? '2px solid #38bdf8' : '1px solid var(--border-color)',
                        padding: 0,
                        background: 'transparent',
                        cursor: 'pointer',
                        overflow: 'hidden',
                        transform: avatarUrl === preset ? 'scale(1.15)' : 'scale(1)',
                        transition: 'all 0.15s ease',
                      }}
                      title={`Preset Avatar #${idx + 1}`}
                    >
                      <img src={preset} alt={`Avatar option ${idx + 1}`} style={{ width: '100%', height: '100%' }} />
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      const seed = Math.random().toString(36).substring(7);
                      handleSelectPresetAvatar(`https://api.dicebear.com/7.x/bottts/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,ffd5dc`);
                    }}
                    className="btn-mono-secondary"
                    style={{ padding: '3px 8px', fontSize: '0.72rem', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    title="Generate a random algorithmic avatar"
                  >
                    <Sparkles size={11} /> Randomize
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Display Name */}
        <div>
          <label
            htmlFor="displayNameInput"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.92rem',
              fontWeight: 750,
              color: 'var(--text-primary)',
              marginBottom: '6px',
            }}
          >
            <span>
              Display Name <span style={{ color: '#f43f5e' }}>*</span>
            </span>
            <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
              {displayName.length}/50 characters
            </span>
          </label>
          <input
            id="displayNameInput"
            type="text"
            className="av-input"
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value);
              if (errors.displayName) {
                setErrors((prev) => ({ ...prev, displayName: null }));
              }
            }}
            placeholder="e.g. Alex Chen"
            maxLength={50}
            style={{
              width: '100%',
              padding: '10px 14px',
              fontSize: '0.92rem',
              border: errors.displayName ? '1px solid #f43f5e' : undefined,
            }}
          />
          {errors.displayName ? (
            <p style={{ margin: '6px 0 0', fontSize: '0.8rem', color: '#f43f5e', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <AlertCircle size={14} /> {errors.displayName}
            </p>
          ) : (
            <p className="text-mono-desc" style={{ margin: '6px 0 0', fontSize: '0.8rem' }}>
              Your display name is visible on published notes, explore feed, and public sheets.
            </p>
          )}
        </div>

        {/* Section 3: Bio / About Me */}
        <div>
          <label
            htmlFor="bioInput"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.92rem',
              fontWeight: 750,
              color: 'var(--text-primary)',
              marginBottom: '6px',
            }}
          >
            <span>Bio / About Me</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
              {bio.length}/500 characters
            </span>
          </label>
          <textarea
            id="bioInput"
            className="av-input"
            value={bio}
            onChange={(e) => {
              setBio(e.target.value);
              if (errors.bio) {
                setErrors((prev) => ({ ...prev, bio: null }));
              }
            }}
            placeholder="Write a brief intro, your CP goals, target interview companies, or favorite data structures..."
            rows={4}
            maxLength={500}
            style={{
              width: '100%',
              padding: '10px 14px',
              fontSize: '0.9rem',
              lineHeight: 1.5,
              resize: 'vertical',
              border: errors.bio ? '1px solid #f43f5e' : undefined,
            }}
          />
          {errors.bio ? (
            <p style={{ margin: '6px 0 0', fontSize: '0.8rem', color: '#f43f5e', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <AlertCircle size={14} /> {errors.bio}
            </p>
          ) : (
            <p className="text-mono-desc" style={{ margin: '6px 0 0', fontSize: '0.8rem' }}>
              Optional bio shown on your author card when sharing notes.
            </p>
          )}
        </div>

        {/* Section 4: Read-Only Account Details */}
        <div
          style={{
            borderTop: '1px solid var(--border-color)',
            paddingTop: '20px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
          }}
        >
          <div>
            <span style={{ fontSize: '0.78rem', fontWeight: 650, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Mail size={14} /> Account Email
            </span>
            <div style={{ marginTop: '4px', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {currentUser?.email || '—'}
              <span
                style={{
                  fontSize: '0.68rem',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  background: 'rgba(34, 197, 94, 0.12)',
                  color: '#22c55e',
                  border: '1px solid rgba(34, 197, 94, 0.25)',
                }}
              >
                Verified
              </span>
            </div>
          </div>



          <div>
            <span style={{ fontSize: '0.78rem', fontWeight: 650, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={14} /> Member Since
            </span>
            <div style={{ marginTop: '4px', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {formattedJoinDate}
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.78rem', fontWeight: 650, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Shield size={14} /> Account Role
            </span>
            <div style={{ marginTop: '4px', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
              {currentUser?.role || 'User'}
            </div>
          </div>
        </div>

        {/* Global form error if any */}
        {errors.form && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '6px',
              background: 'rgba(244, 63, 94, 0.1)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              color: '#f43f5e',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertCircle size={16} /> {errors.form}
          </div>
        )}

        {/* Form Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'flex-end', paddingTop: '8px' }}>
          <button
            type="button"
            className="btn-mono-secondary"
            onClick={handleReset}
            disabled={updateMutation.isPending}
            style={{ padding: '10px 18px', fontSize: '0.88rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RotateCcw size={14} /> Reset
          </button>
          <button
            type="submit"
            className="btn-mono-primary"
            disabled={updateMutation.isPending}
            style={{
              padding: '10px 22px',
              fontSize: '0.88rem',
              fontWeight: 750,
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: updateMutation.isPending ? 'not-allowed' : 'pointer',
            }}
          >
            <Save size={16} />
            {updateMutation.isPending ? 'Saving Changes...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
