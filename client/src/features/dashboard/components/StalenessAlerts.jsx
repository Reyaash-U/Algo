import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';

export function StalenessAlerts({ alerts, theme }) {
  if (!alerts || alerts.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={20} strokeWidth={2.5} style={{ color: '#eab308' }} /> Staleness Alerts
        </h3>
        <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic', padding: '16px', border: '1px dashed var(--border-color)', borderRadius: '8px' }}>
          All topics are fresh! You're actively practicing across all your patterns.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
      <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
        <AlertTriangle size={20} strokeWidth={2.5} style={{ color: '#eab308' }} /> Staleness Alerts
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {alerts.map(alert => (
          <div 
            key={alert.tag}
            style={{
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-secondary)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <div>
              <div style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.85rem' }}>
                {alert.tag.replace(/-/g, ' ')}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Not practiced in <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{alert.daysSinceLastPracticed} days</span>
              </div>
            </div>
            <Link 
              to={`/vault?tag=${alert.tag}`}
              className="btn-mono-secondary"
              style={{ padding: '6px 12px', fontSize: '0.8rem', textDecoration: 'none' }}
            >
              Review →
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
