import { useState, useMemo, useRef, useEffect } from 'react';
import { useTheme } from '../../../lib/themeContext.jsx';
import { Info, ChevronDown } from 'lucide-react';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Formats a Date object as local YYYY-MM-DD string.
 */
function toLocalDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Computes intensity level (0..4).
 */
function calculateIntensity(count) {
  if (!count || count <= 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 9) return 3;
  return 4;
}

export function CodeforcesActivityHeatmap({ dailyActivity = {} }) {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [range, setRange] = useState('1y'); // '3m' | '6m' | '1y' | 'all'
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [hoveredDay, setHoveredDay] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // LeetCode green rank colors
  const getColor = (intensity) => {
    if (isLight) {
      switch (intensity) {
        case 0: return '#ebedf0';
        case 1: return '#9be9a8';
        case 2: return '#40c463';
        case 3: return '#30a14e';
        case 4: default: return '#216e39';
      }
    } else {
      switch (intensity) {
        case 0: return '#282828';
        case 1: return '#0e4429';
        case 2: return '#006d32';
        case 3: return '#26a641';
        case 4: default: return '#5ee289';
      }
    }
  };

  // Build the strictly date-aware month clusters
  const { monthClusters, totalSubmissions, activeDays, maxStreak, rangeLabel } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = toLocalDateString(today);

    // Determine months count and start date based on range
    let monthsCount = 12;
    let label = 'past one year';

    if (range === '3m') {
      monthsCount = 3;
      label = 'past 3 months';
    } else if (range === '6m') {
      monthsCount = 6;
      label = 'past 6 months';
    } else if (range === 'all') {
      // Find earliest submission date in dailyActivity
      const allDates = Object.keys(dailyActivity).filter((d) => d <= todayStr).sort();
      if (allDates.length > 0) {
        const [earliestY, earliestM] = allDates[0].split('-').map(Number);
        const diffMonths = (today.getFullYear() - earliestY) * 12 + (today.getMonth() - (earliestM - 1)) + 1;
        monthsCount = Math.max(3, Math.min(diffMonths, 36)); // Cap at 36 months for display
        label = 'all time';
      } else {
        monthsCount = 12;
        label = 'all time';
      }
    }

    // Determine start date of the period
    const startMonthDate = new Date(today.getFullYear(), today.getMonth() - (monthsCount - 1), 1);

    // Collect all valid elapsed dates: startDate <= date <= todayStr
    let total = 0;
    let active = 0;
    let maxS = 0;
    let currentS = 0;
    let maxVal = 0;

    const scanDate = new Date(startMonthDate);
    while (scanDate <= today) {
      const dateStr = toLocalDateString(scanDate);
      const count = dailyActivity[dateStr] || 0;

      if (count > maxVal) maxVal = count;
      total += count;

      if (count > 0) {
        active += 1;
        currentS += 1;
        if (currentS > maxS) maxS = currentS;
      } else {
        currentS = 0;
      }

      scanDate.setDate(scanDate.getDate() + 1);
    }

    // Build month clusters from oldest to current month
    const clusters = [];

    for (let i = monthsCount - 1; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      const monthName = MONTH_NAMES[month];
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      const monthDays = [];
      for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
        const dayDate = new Date(year, month, dayNum);
        const dayOfWeek = dayDate.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;

        // STRICT DATE-AWARENESS:
        // If date is in the future (> today), it must NOT be rendered.
        const isFuture = dateStr > todayStr;
        const count = isFuture ? 0 : (dailyActivity[dateStr] || 0);

        monthDays.push({
          date: dateStr,
          dayNum,
          dayOfWeek,
          count,
          isFuture,
          intensity: calculateIntensity(count, maxVal),
          dateObj: dayDate,
        });
      }

      // Group into 7-row columns (Sunday = row 0, Saturday = row 6)
      const cols = [];
      let currentCol = [];

      // Pad first column before day 1 with null
      const firstDayOfWeek = monthDays[0].dayOfWeek;
      for (let p = 0; p < firstDayOfWeek; p++) {
        currentCol.push(null);
      }

      for (const day of monthDays) {
        // If day is future, pass null to keep it hidden/blank
        currentCol.push(day.isFuture ? null : day);
        if (currentCol.length === 7) {
          cols.push(currentCol);
          currentCol = [];
        }
      }

      // Pad remainder of the last column with null
      if (currentCol.length > 0) {
        while (currentCol.length < 7) {
          currentCol.push(null);
        }
        cols.push(currentCol);
      }

      clusters.push({
        year,
        month,
        monthName,
        cols,
      });
    }

    return {
      monthClusters: clusters,
      totalSubmissions: total,
      activeDays: active,
      maxStreak: maxS,
      rangeLabel: label,
    };
  }, [dailyActivity, range]);

  const handleCellMouseEnter = (day, e) => {
    if (!day || day.isFuture) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
    });
    setHoveredDay(day);
  };

  const handleCellMouseLeave = () => {
    setHoveredDay(null);
  };

  const formatTooltipDate = (dateStr) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // If no submissions exist across history, hide section per requirements
  const totalAllTime = Object.values(dailyActivity).reduce((acc, v) => acc + (v || 0), 0);
  if (totalAllTime === 0) {
    return null;
  }

  const rangeDisplayNames = {
    '1y': 'Current',
    '6m': 'Last 6 months',
    '3m': 'Last 3 months',
    'all': 'All time',
  };

  return (
    <div
      className="mono-card"
      style={{
        background: isLight ? '#ffffff' : '#18181b',
        padding: '24px 28px',
        borderRadius: '12px',
        border: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        position: 'relative',
      }}
    >
      {/* Top Header matching user picture: Total submissions + Active days + Max streak + Dropdown */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        {/* Left: 447 submissions in the past one year ⓘ */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '1.45rem', fontWeight: 850, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            {totalSubmissions}
          </span>
          <span style={{ fontSize: '0.92rem', color: 'var(--text-secondary)' }}>
            submissions in the {rangeLabel}
          </span>
          <span
            title="Codeforces submissions recorded across contests and practice problems up to today."
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              color: 'var(--text-secondary)',
              cursor: 'help',
              opacity: 0.75,
            }}
          >
            <Info size={15} />
          </span>
        </div>

        {/* Right: Total active days, Max streak, and Range Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '22px', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Total active days: <strong style={{ color: 'var(--text-primary)', fontWeight: 800 }}>{activeDays}</strong>
          </div>

          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Max streak: <strong style={{ color: 'var(--text-primary)', fontWeight: 800 }}>{maxStreak}</strong>
          </div>

          {/* Range Dropdown Pill */}
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: isLight ? '#f4f4f5' : '#27272a',
                color: 'var(--text-primary)',
                fontSize: '0.82rem',
                fontWeight: 650,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <span>{rangeDisplayNames[range] || 'Current'}</span>
              <ChevronDown size={14} style={{ opacity: 0.7 }} />
            </button>

            {isDropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 'calc(100% + 4px)',
                  background: isLight ? '#ffffff' : '#1f1f23',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                  zIndex: 50,
                  minWidth: '140px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {[
                  { id: '1y', label: 'Current (1 Year)' },
                  { id: '6m', label: 'Last 6 months' },
                  { id: '3m', label: 'Last 3 months' },
                  { id: 'all', label: 'All time' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setRange(opt.id);
                      setIsDropdownOpen(false);
                    }}
                    style={{
                      padding: '8px 14px',
                      textAlign: 'left',
                      background: range === opt.id ? (isLight ? '#f4f4f5' : '#2a2a30') : 'transparent',
                      border: 'none',
                      color: 'var(--text-primary)',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Heatmap Grid Split by Months (LeetCode / Picture Style, strictly date-aware) */}
      <div style={{ overflowX: 'auto', paddingBottom: '6px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '14px',
            minWidth: 'max-content',
            padding: '4px 0',
          }}
        >
          {monthClusters.map((cluster) => (
            <div
              key={`${cluster.year}-${cluster.month}`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {/* Columns of 7 rows (Sunday to Saturday) */}
              <div style={{ display: 'flex', gap: '3px' }}>
                {cluster.cols.map((col, cIdx) => (
                  <div key={cIdx} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    {col.map((day, rIdx) => {
                      if (!day || day.isFuture) {
                        return (
                          <div
                            key={rIdx}
                            style={{
                              width: '11px',
                              height: '11px',
                              visibility: 'hidden',
                              pointerEvents: 'none',
                            }}
                          />
                        );
                      }

                      const bg = getColor(day.intensity);
                      const isHovered = hoveredDay?.date === day.date;

                      return (
                        <div
                          key={day.date}
                          onMouseEnter={(e) => handleCellMouseEnter(day, e)}
                          onMouseLeave={handleCellMouseLeave}
                          style={{
                            width: '11px',
                            height: '11px',
                            borderRadius: '2.5px',
                            backgroundColor: bg,
                            cursor: 'pointer',
                            transition: 'transform 0.1s ease, box-shadow 0.1s ease',
                            transform: isHovered ? 'scale(1.35)' : 'scale(1)',
                            zIndex: isHovered ? 10 : 1,
                            outline: isHovered ? '1px solid var(--text-primary)' : 'none',
                          }}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Month label centered below each cluster */}
              <span
                style={{
                  fontSize: '0.78rem',
                  color: 'var(--text-secondary)',
                  fontWeight: 500,
                  userSelect: 'none',
                }}
              >
                {cluster.monthName}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Floating Hover Tooltip: September 25, 2026 \n 3 submissions (or No submissions) */}
      {hoveredDay && !hoveredDay.isFuture && (
        <div
          style={{
            position: 'fixed',
            left: `${tooltipPos.x}px`,
            top: `${tooltipPos.y}px`,
            transform: 'translate(-50%, -100%)',
            background: isLight ? '#1f2937' : '#0f172a',
            color: '#f9fafb',
            padding: '7px 12px',
            borderRadius: '6px',
            fontSize: '0.75rem',
            pointerEvents: 'none',
            zIndex: 9999,
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            border: '1px solid rgba(255,255,255,0.15)',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            lineHeight: 1.35,
          }}
        >
          <div style={{ color: '#9ca3af', fontSize: '0.72rem' }}>
            {formatTooltipDate(hoveredDay.date)}
          </div>
          <div style={{ fontWeight: 750, fontSize: '0.8rem' }}>
            {hoveredDay.count === 0 ? 'No submissions' : `${hoveredDay.count} ${hoveredDay.count === 1 ? 'submission' : 'submissions'}`}
          </div>
        </div>
      )}
    </div>
  );
}
