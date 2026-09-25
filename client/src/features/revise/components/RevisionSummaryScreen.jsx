import React from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Clock, Target, BookOpen, Percent, RotateCcw, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import { useTheme } from '../../../lib/themeContext.jsx';

export function formatTimeSpent(totalSeconds) {
  if (!totalSeconds || totalSeconds < 0) return '0s';
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  if (mins === 0) return `${secs}s`;
  if (secs === 0) return `${mins}m`;
  return `${mins}m ${secs}s`;
}

export function RevisionSummaryScreen({
  totalSeconds = 0,
  problemsRevisedCount = 0,
  notesReviewedCount = 0,
  completionPercentage = 100,
  ratingBreakdown = { 0: 0, 1: 0, 2: 0, 3: 0 },
  reviewedItems = [],
  onStartAnotherSession,
}) {
  const { theme } = useTheme();

  const ratingLabels = [
    { val: 0, label: 'Again', count: ratingBreakdown[0] || 0, color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.12)' },
    { val: 1, label: 'Hard', count: ratingBreakdown[1] || 0, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' },
    { val: 2, label: 'Good', count: ratingBreakdown[2] || 0, color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.12)' },
    { val: 3, label: 'Easy', count: ratingBreakdown[3] || 0, color: '#22c55e', bg: 'rgba(34, 197, 94, 0.12)' },
  ];

  return (
    <div
      className="av-revision-summary mono-card"
      style={{
        maxWidth: '680px',
        margin: '0 auto',
        padding: '36px 32px',
        display: 'flex',
        flexDirection: 'column',
        gap: '28px',
        animation: 'fadeIn 0.3s ease-in-out',
      }}
    >
      {/* Celebration Header */}
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
        <div
          style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.18), rgba(236, 72, 153, 0.18))',
            border: '1.5px solid rgba(234, 179, 8, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#eab308',
            boxShadow: '0 0 24px rgba(234, 179, 8, 0.25)',
          }}
        >
          <Trophy size={38} strokeWidth={2.2} />
        </div>

        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '0.76rem',
              fontWeight: 700,
              background: 'rgba(34, 197, 94, 0.12)',
              color: '#22c55e',
              border: '1px solid rgba(34, 197, 94, 0.25)',
              marginBottom: '10px',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            <Sparkles size={13} /> Session Complete
          </div>
          <h2
            className="text-mono-title"
            style={{ margin: '0 0 6px', fontSize: '1.85rem', fontWeight: 850, letterSpacing: '-0.02em' }}
          >
            Revision Workout Summary
          </h2>
          <p className="text-mono-desc" style={{ margin: 0, fontSize: '0.92rem', maxWidth: '480px' }}>
            Excellent consistency! Spaced repetition actively solidifies algorithmic recall into your long-term memory.
          </p>
        </div>
      </div>

      {/* 4 Core Stat Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '12px',
        }}
      >
        {/* Total Time Spent */}
        <div
          style={{
            background: theme === 'light' ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 600 }}>
            <Clock size={16} style={{ color: '#38bdf8' }} /> Time Spent
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 850, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {formatTimeSpent(totalSeconds)}
          </div>
        </div>

        {/* Problems Revised */}
        <div
          style={{
            background: theme === 'light' ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 600 }}>
            <Target size={16} style={{ color: '#a855f7' }} /> Problems
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 850, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {problemsRevisedCount}
          </div>
        </div>

        {/* Notes Reviewed */}
        <div
          style={{
            background: theme === 'light' ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 600 }}>
            <BookOpen size={16} style={{ color: '#22c55e' }} /> Notes
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 850, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {notesReviewedCount}
          </div>
        </div>

        {/* Completion Percentage */}
        <div
          style={{
            background: theme === 'light' ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 600 }}>
            <Percent size={16} style={{ color: '#f59e0b' }} /> Completion
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 850, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {completionPercentage !== null && completionPercentage !== undefined ? `${completionPercentage}%` : '100%'}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {completionPercentage !== null && completionPercentage !== undefined && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            <span>Queue Goal Progress</span>
            <span style={{ color: 'var(--text-primary)' }}>{completionPercentage}% complete</span>
          </div>
          <div
            style={{
              width: '100%',
              height: '8px',
              borderRadius: '999px',
              background: theme === 'light' ? '#e2e8f0' : '#1e293b',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${Math.min(100, Math.max(0, completionPercentage))}%`,
                height: '100%',
                borderRadius: '999px',
                background: 'linear-gradient(90deg, #38bdf8, #22c55e)',
                transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            />
          </div>
        </div>
      )}

      {/* Rating Breakdown Pill Bar */}
      <div
        style={{
          background: theme === 'light' ? 'rgba(0,0,0,0.015)' : 'rgba(255,255,255,0.015)',
          border: '1px solid var(--border-color)',
          borderRadius: '10px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          Recall Confidence Distribution
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
          {ratingLabels.map((r) => (
            <div
              key={r.val}
              style={{
                padding: '10px 8px',
                borderRadius: '8px',
                background: r.bg,
                border: `1px solid ${r.color}33`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px',
              }}
            >
              <span style={{ fontSize: '1.15rem', fontWeight: 850, color: r.color, fontFamily: 'var(--font-mono)' }}>
                {r.count}
              </span>
              <span style={{ fontSize: '0.72rem', fontWeight: 650, color: 'var(--text-secondary)' }}>
                {r.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Reviewed Items List (if any) */}
      {reviewedItems.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Reviewed in this session ({reviewedItems.length})
          </div>
          <div
            style={{
              maxHeight: '160px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              paddingRight: '4px',
            }}
          >
            {reviewedItems.map((item, idx) => {
              const ratingMap = ['Again', 'Hard', 'Good', 'Easy'];
              const ratingColorMap = ['#f43f5e', '#f59e0b', '#38bdf8', '#22c55e'];
              const rLabel = ratingMap[item.rating] || 'Good';
              const rColor = ratingColorMap[item.rating] || '#22c55e';

              return (
                <div
                  key={`${item.id}-${idx}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: theme === 'light' ? '#f8fafc' : '#0a0a0a',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.84rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                    <CheckCircle2 size={14} style={{ color: '#22c55e', flexShrink: 0 }} />
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.noteTitle || 'Untitled Note'}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: rColor,
                      padding: '2px 8px',
                      borderRadius: '12px',
                      background: `${rColor}1a`,
                      border: `1px solid ${rColor}40`,
                      flexShrink: 0,
                    }}
                  >
                    {rLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
        <button
          className="btn-mono-primary"
          onClick={onStartAnotherSession}
          style={{
            padding: '12px 24px',
            fontSize: '0.95rem',
            fontWeight: 750,
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            cursor: 'pointer',
          }}
        >
          <RotateCcw size={16} /> Start Another Revision Session
        </button>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Link
            to="/dashboard"
            className="btn-mono-secondary"
            style={{
              flex: 1,
              textDecoration: 'none',
              padding: '10px 16px',
              fontSize: '0.85rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            Dashboard <ArrowRight size={14} />
          </Link>
          <Link
            to="/vault"
            className="btn-mono-secondary"
            style={{
              flex: 1,
              textDecoration: 'none',
              padding: '10px 16px',
              fontSize: '0.85rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <BookOpen size={14} /> Browse Vault
          </Link>
        </div>
      </div>
    </div>
  );
}
