import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../api/apiClient.js';
import { queryKeys } from '../../lib/queryClient.js';
import { EmptyState } from '../../components/shared/EmptyState.jsx';
import { SkeletonCard } from '../../components/shared/Skeleton.jsx';
import { useToast } from '../../components/shared/Toast.jsx';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Filter,
  Tag,
  ShieldAlert,
  FileText,
  Layers,
  RotateCcw,
  Plus,
  Trash2,
  X,
} from 'lucide-react';

export function AdminPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState('reports'); // 'reports' | 'tags'
  const [newTagInput, setNewTagInput] = useState('');
  const [tagToDelete, setTagToDelete] = useState(null);

  // Extract pagination, filters, and sort parameters from searchParams
  const pageParam = parseInt(searchParams.get('page') || '1', 10);
  const page = Number.isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;

  const limitParam = parseInt(searchParams.get('limit') || '10', 10);
  const limit = Number.isNaN(limitParam) || limitParam < 1 ? 10 : limitParam;

  const status = searchParams.get('status') || 'open';
  const targetType = searchParams.get('targetType') || 'all';
  const sort = searchParams.get('sort') || 'desc';

  // Navigation / filter update helpers
  const handlePageChange = (newPage) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('page', String(newPage));
      return next;
    });
  };

  const handleStatusChange = (newStatus) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (newStatus === 'open') {
        next.delete('status');
      } else {
        next.set('status', newStatus);
      }
      next.set('page', '1'); // Reset page when filter changes
      return next;
    });
  };

  const handleTypeChange = (newType) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (newType === 'all') {
        next.delete('targetType');
      } else {
        next.set('targetType', newType);
      }
      next.set('page', '1'); // Reset page when filter changes
      return next;
    });
  };

  const handleSortChange = (newSort) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (newSort === 'desc') {
        next.delete('sort');
      } else {
        next.set('sort', newSort);
      }
      next.set('page', '1'); // Reset page when sort changes
      return next;
    });
  };

  const handleLimitChange = (newLimit) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (newLimit === 10) {
        next.delete('limit');
      } else {
        next.set('limit', String(newLimit));
      }
      next.set('page', '1');
      return next;
    });
  };

  const handleResetFilters = () => {
    setSearchParams({});
  };

  const hasNonDefaultFilters = status !== 'open' || targetType !== 'all' || sort !== 'desc' || limit !== 10 || page !== 1;

  // Query: Paginated reports
  const {
    data: reportsData,
    isLoading: isLoadingReports,
    isFetching: isFetchingReports,
    isError: isReportsError,
    error: reportsError,
  } = useQuery({
    queryKey: queryKeys.adminReports({
      page,
      limit,
      status,
      targetType,
      sort,
    }),
    queryFn: () =>
      api.admin.reports({
        page,
        limit,
        status: status !== 'all' ? status : 'all',
        targetType: targetType !== 'all' ? targetType : undefined,
        sort,
      }),
  });

  // Query: Tag Taxonomy
  const {
    data: tagsData,
    isLoading: isLoadingTags,
    isError: isTagsError,
    error: tagsError,
  } = useQuery({
    queryKey: queryKeys.adminTags,
    queryFn: () => api.admin.listTags(),
  });

  // Mutation: Resolve or dismiss report
  const resolveMutation = useMutation({
    mutationFn: ({ id, nextStatus }) => api.admin.resolveReport(id, nextStatus),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] });
      toast.push(`Report marked as ${variables.nextStatus}`, { type: 'success' });
    },
    onError: (err) => {
      toast.push(err.message || 'Failed to update report', { type: 'error' });
    },
  });

  // Mutation: Create Tag
  const createTagMutation = useMutation({
    mutationFn: (tag) => api.admin.createTag(tag),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminTags });
      setNewTagInput('');
      toast.push(`Tag "${data?.tag || 'new'}" created`, { type: 'success' });
    },
    onError: (err) => {
      toast.push(err.message || 'Failed to create tag', { type: 'error' });
    },
  });

  // Query: Tag usage for selected tag to delete
  const { data: usageData, isLoading: isLoadingUsage } = useQuery({
    queryKey: ['admin', 'tagUsage', tagToDelete],
    queryFn: () => api.admin.tagUsage(tagToDelete),
    enabled: Boolean(tagToDelete),
  });

  const affectedNotes = usageData?.noteCount ?? (tagToDelete ? (tagsData?.tagCounts?.[tagToDelete] ?? 0) : 0);

  // Close dialog on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && tagToDelete) {
        setTagToDelete(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tagToDelete]);

  // Mutation: Delete Tag
  const deleteTagMutation = useMutation({
    mutationFn: (tag) => api.admin.deleteTag(tag),
    onSuccess: (_, deletedTag) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminTags });
      toast.push(`Tag "${deletedTag}" deleted`, { type: 'success' });
      setTagToDelete(null);
    },
    onError: (err) => {
      toast.push(err.message || 'Failed to delete tag', { type: 'error' });
    },
  });

  const reports = useMemo(() => reportsData?.reports ?? [], [reportsData?.reports]);
  const totalReports = reportsData?.total ?? 0;
  const totalPages = reportsData?.totalPages ?? 1;

  const handleCreateTag = (e) => {
    e.preventDefault();
    const trimmed = newTagInput.trim();
    if (!trimmed) return;
    createTagMutation.mutate(trimmed);
  };

  // Build page numbers array with intelligent ellipsis
  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages = [1];
    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);

    if (start > 2) pages.push('ellipsis-1');
    for (let p = start; p <= end; p++) {
      pages.push(p);
    }
    if (end < totalPages - 1) pages.push('ellipsis-2');
    pages.push(totalPages);
    return pages;
  }, [page, totalPages]);

  return (
    <div className="av-admin-page" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1
            className="text-mono-title"
            style={{ margin: 0, fontSize: '2rem', fontWeight: 850, letterSpacing: '-0.03em', display: 'flex', alignItems: 'center', gap: '12px' }}
          >
            <ShieldAlert size={32} style={{ color: 'var(--color-accent-purple, #8b5cf6)' }} /> Admin Console
          </h1>
          <p className="text-mono-desc" style={{ margin: '6px 0 0', fontSize: '0.95rem' }}>
            Review user-reported notes and sheets, manage moderation queue, and maintain platform tag taxonomy.
          </p>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: 'inline-flex',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            padding: '4px',
            gap: '4px',
          }}
        >
          <button
            type="button"
            id="tabReportsQueue"
            onClick={() => setActiveTab('reports')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '0.88rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              background: activeTab === 'reports' ? 'var(--color-accent-purple, #8b5cf6)' : 'transparent',
              color: activeTab === 'reports' ? '#ffffff' : 'var(--text-secondary)',
              transition: 'all 0.15s ease',
            }}
          >
            <ShieldAlert size={16} />
            <span>Reports Queue</span>
            {totalReports > 0 && activeTab === 'reports' && (
              <span
                style={{
                  background: 'rgba(255, 255, 255, 0.25)',
                  fontSize: '0.75rem',
                  padding: '1px 6px',
                  borderRadius: '10px',
                }}
              >
                {totalReports}
              </span>
            )}
          </button>
          <button
            type="button"
            id="tabTagTaxonomy"
            onClick={() => setActiveTab('tags')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '0.88rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              background: activeTab === 'tags' ? 'var(--color-accent-purple, #8b5cf6)' : 'transparent',
              color: activeTab === 'tags' ? '#ffffff' : 'var(--text-secondary)',
              transition: 'all 0.15s ease',
            }}
          >
            <Tag size={16} />
            <span>Tag Taxonomy</span>
          </button>
        </div>
      </div>

      {activeTab === 'reports' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Controls Bar: Filters and Sorting */}
          <div
            className="mono-card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              padding: '20px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              {/* Status Filter Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Status:
                </span>
                {[
                  { key: 'open', label: 'Open' },
                  { key: 'resolved', label: 'Resolved' },
                  { key: 'dismissed', label: 'Dismissed' },
                  { key: 'all', label: 'All Statuses' },
                ].map((s) => {
                  const isActive = status === s.key;
                  return (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => handleStatusChange(s.key)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '6px',
                        fontSize: '0.85rem',
                        fontWeight: isActive ? 700 : 500,
                        cursor: 'pointer',
                        border: '1px solid',
                        borderColor: isActive ? 'var(--color-accent-purple, #8b5cf6)' : 'var(--border-color)',
                        background: isActive ? 'rgba(139, 92, 246, 0.15)' : 'var(--bg-secondary)',
                        color: isActive ? 'var(--color-accent-purple, #8b5cf6)' : 'var(--text-primary)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>

              {/* Reset Filters */}
              {hasNonDefaultFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.82rem',
                    color: 'var(--text-secondary)',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px 8px',
                  }}
                >
                  <RotateCcw size={14} />
                  <span>Reset Filters</span>
                </button>
              )}
            </div>

            <div style={{ height: '1px', background: 'var(--border-color)' }} />

            {/* Target Type, Sort, and Per-Page Dropdowns */}
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              {/* Target Type Select */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Filter size={15} style={{ color: 'var(--text-secondary)' }} />
                <label htmlFor="filterTargetType" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Type:
                </label>
                <select
                  id="filterTargetType"
                  value={targetType}
                  onChange={(e) => handleTypeChange(e.target.value)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  <option value="all">All Content</option>
                  <option value="note">Notes Only</option>
                  <option value="sheet">Sheets Only</option>
                </select>
              </div>

              {/* Sort Order Select */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label htmlFor="filterSort" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Sort:
                </label>
                <select
                  id="filterSort"
                  value={sort}
                  onChange={(e) => handleSortChange(e.target.value)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  <option value="desc">Newest First</option>
                  <option value="asc">Oldest First</option>
                </select>
              </div>

              {/* Items Per Page Select */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label htmlFor="filterLimit" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Per page:
                </label>
                <select
                  id="filterLimit"
                  value={limit}
                  onChange={(e) => handleLimitChange(Number(e.target.value))}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  <option value={5}>5 per page</option>
                  <option value={10}>10 per page</option>
                  <option value={25}>25 per page</option>
                  <option value={50}>50 per page</option>
                </select>
              </div>
            </div>
          </div>


          {/* Reports Content Area */}
          {isLoadingReports ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : isReportsError ? (
            <p className="av-form-error">Failed to load reports: {reportsError?.message || 'Unknown error'}</p>
          ) : reports.length === 0 ? (
            <EmptyState
              title="No reports match this criteria"
              description="No reports found for the selected status and filters. Check back later or reset your filters."
              action={
                hasNonDefaultFilters ? (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="av-btn av-btn--secondary"
                    style={{ fontSize: '0.85rem' }}
                  >
                    Reset Filters
                  </button>
                ) : null
              }
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {reports.map((report) => {
                const isNote = report.targetType === 'note';
                const targetLink = isNote ? `/note/${report.targetId}` : `/sheets/${report.targetId}`;
                const isOpen = report.status === 'open';

                let statusBadgeColor = {
                  bg: 'rgba(245, 158, 11, 0.12)',
                  color: '#f59e0b',
                  border: 'rgba(245, 158, 11, 0.25)',
                  icon: <AlertTriangle size={13} />,
                  label: 'Open',
                };
                if (report.status === 'resolved') {
                  statusBadgeColor = {
                    bg: 'rgba(16, 185, 129, 0.12)',
                    color: '#10b981',
                    border: 'rgba(16, 185, 129, 0.25)',
                    icon: <CheckCircle2 size={13} />,
                    label: 'Resolved',
                  };
                } else if (report.status === 'dismissed') {
                  statusBadgeColor = {
                    bg: 'rgba(113, 113, 122, 0.15)',
                    color: '#a1a1aa',
                    border: 'rgba(113, 113, 122, 0.3)',
                    icon: <XCircle size={13} />,
                    label: 'Dismissed',
                  };
                }

                return (
                  <div
                    key={report.id}
                    className="mono-card"
                    style={{
                      padding: '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px',
                      borderRadius: '10px',
                    }}
                  >
                    {/* Top Row: Badges, Target Title Link, Date */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        {/* Status Badge */}
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            padding: '3px 10px',
                            borderRadius: '20px',
                            background: statusBadgeColor.bg,
                            color: statusBadgeColor.color,
                            border: `1px solid ${statusBadgeColor.border}`,
                          }}
                        >
                          {statusBadgeColor.icon}
                          <span>{statusBadgeColor.label}</span>
                        </span>

                        {/* Target Type Badge */}
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: isNote ? 'rgba(139, 92, 246, 0.12)' : 'rgba(6, 182, 212, 0.12)',
                            color: isNote ? 'var(--color-accent-purple, #8b5cf6)' : 'var(--color-accent-cyan, #06b6d4)',
                            border: `1px solid ${isNote ? 'rgba(139, 92, 246, 0.25)' : 'rgba(6, 182, 212, 0.25)'}`,
                          }}
                        >
                          {isNote ? <FileText size={13} /> : <Layers size={13} />}
                          <span style={{ textTransform: 'uppercase' }}>{report.targetType}</span>
                        </span>

                        {/* Target Item Title and Link */}
                        <Link
                          to={targetLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '1.05rem',
                            fontWeight: 700,
                            color: 'var(--text-primary)',
                            textDecoration: 'none',
                          }}
                          className="hover:underline"
                        >
                          <span>{report.targetDetails?.title || `Target ID: ${report.targetId}`}</span>
                          <ExternalLink size={14} style={{ color: 'var(--text-secondary)' }} />
                        </Link>
                      </div>

                      {/* Timestamp */}
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {new Date(report.createdAt).toLocaleString(undefined, {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </span>
                    </div>

                    {/* Middle Row: Report Reason & Reporter Info */}
                    <div
                      style={{
                        background: 'var(--bg-secondary)',
                        borderRadius: '8px',
                        padding: '12px 16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        border: '1px solid var(--border-color)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                          Reason:
                        </span>
                        <span style={{ fontSize: '0.92rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                          {report.reason}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <span>Reported by:</span>
                        <strong style={{ color: 'var(--text-primary)' }}>
                          {report.reporter?.displayName || report.reporter?.email || 'Anonymous'}
                        </strong>
                        {report.reporter?.email && report.reporter?.displayName && (
                          <span>({report.reporter.email})</span>
                        )}
                      </div>
                    </div>

                    {/* Bottom Row: Actions */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px' }}>
                      {isOpen ? (
                        <>
                          <button
                            type="button"
                            disabled={resolveMutation.isPending}
                            onClick={() => resolveMutation.mutate({ id: report.id, nextStatus: 'dismissed' })}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '6px 14px',
                              borderRadius: '6px',
                              fontSize: '0.82rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              background: 'transparent',
                              border: '1px solid var(--border-color)',
                              color: 'var(--text-secondary)',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <XCircle size={14} />
                            <span>Dismiss</span>
                          </button>
                          <button
                            type="button"
                            disabled={resolveMutation.isPending}
                            onClick={() => resolveMutation.mutate({ id: report.id, nextStatus: 'resolved' })}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '6px 14px',
                              borderRadius: '6px',
                              fontSize: '0.82rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              background: 'rgba(16, 185, 129, 0.15)',
                              border: '1px solid rgba(16, 185, 129, 0.3)',
                              color: '#10b981',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <CheckCircle2 size={14} />
                            <span>Mark Resolved</span>
                          </button>
                        </>
                      ) : (
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          Status: <strong style={{ textTransform: 'capitalize' }}>{report.status}</strong>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          <div
            className="mono-card"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px',
              padding: '16px 20px',
              marginTop: '4px',
            }}
          >
            {/* Left: Summary text */}
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Showing {totalReports === 0 ? 0 : (page - 1) * limit + 1} to {Math.min(page * limit, totalReports)} of {totalReports} reports
            </div>

            {/* Center: Previous / Page Numbers / Next */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* Previous Button */}
              <button
                type="button"
                id="adminPrevPageBtn"
                disabled={page <= 1 || isFetchingReports}
                onClick={() => handlePageChange(page - 1)}
                aria-label="Previous page"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: page <= 1 || isFetchingReports ? 'not-allowed' : 'pointer',
                  opacity: page <= 1 || isFetchingReports ? 0.45 : 1,
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  transition: 'all 0.15s ease',
                }}
              >
                <ChevronLeft size={16} />
                <span>Previous</span>
              </button>

              {/* Page Number Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {pageNumbers.map((p, idx) => {
                  if (typeof p === 'string') {
                    return (
                      <span key={`ellipsis-${idx}`} style={{ padding: '0 6px', color: 'var(--text-secondary)' }}>
                        …
                      </span>
                    );
                  }
                  const isCurrent = p === page;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handlePageChange(p)}
                      disabled={isFetchingReports}
                      aria-current={isCurrent ? 'page' : undefined}
                      style={{
                        minWidth: '34px',
                        height: '34px',
                        borderRadius: '6px',
                        fontSize: '0.85rem',
                        fontWeight: isCurrent ? 700 : 500,
                        cursor: 'pointer',
                        border: '1px solid',
                        borderColor: isCurrent ? 'var(--color-accent-purple, #8b5cf6)' : 'var(--border-color)',
                        background: isCurrent ? 'var(--color-accent-purple, #8b5cf6)' : 'var(--bg-secondary)',
                        color: isCurrent ? '#ffffff' : 'var(--text-primary)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>

              {/* Next Button */}
              <button
                type="button"
                id="adminNextPageBtn"
                disabled={page >= totalPages || isFetchingReports || totalReports === 0}
                onClick={() => handlePageChange(page + 1)}
                aria-label="Next page"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: page >= totalPages || isFetchingReports || totalReports === 0 ? 'not-allowed' : 'pointer',
                  opacity: page >= totalPages || isFetchingReports || totalReports === 0 ? 0.45 : 1,
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>Next</span>
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Right: Page indicator */}
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Page <span style={{ color: 'var(--text-primary)' }}>{page}</span> of <span style={{ color: 'var(--text-primary)' }}>{totalPages}</span>
            </div>
          </div>
        </div>
      ) : (
        /* Tag Taxonomy Tab */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Add Tag Form */}
          <form
            onSubmit={handleCreateTag}
            className="mono-card"
            style={{
              padding: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <Tag size={18} style={{ color: 'var(--color-accent-purple, #8b5cf6)' }} />
            <input
              type="text"
              placeholder="Add new tag (e.g. dynamic-programming)..."
              value={newTagInput}
              onChange={(e) => setNewTagInput(e.target.value)}
              style={{
                flex: 1,
                minWidth: '240px',
                padding: '8px 14px',
                borderRadius: '6px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                outline: 'none',
                fontSize: '0.9rem',
              }}
            />
            <button
              type="submit"
              disabled={createTagMutation.isPending || !newTagInput.trim()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 18px',
                borderRadius: '6px',
                background: 'var(--color-accent-purple, #8b5cf6)',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: createTagMutation.isPending || !newTagInput.trim() ? 'not-allowed' : 'pointer',
                opacity: createTagMutation.isPending || !newTagInput.trim() ? 0.6 : 1,
              }}
            >
              <Plus size={16} />
              <span>Create Tag</span>
            </button>
          </form>

          {/* Tags List */}
          <div className="mono-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '24px' }}>
            <h2 className="text-mono-title" style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
              Tag Taxonomy ({tagsData?.tags?.length ?? 0})
            </h2>

            {isLoadingTags ? (
              <p className="text-mono-desc">Loading tags…</p>
            ) : isTagsError ? (
              <p className="av-form-error">Failed to load tags: {tagsError?.message}</p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {tagsData?.tags?.map((t) => {
                  const noteCount = tagsData?.tagCounts?.[t] ?? 0;
                  return (
                    <div
                      key={t}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        fontSize: '0.88rem',
                        fontWeight: 500,
                        color: 'var(--text-primary)',
                      }}
                    >
                      <span>{t}</span>
                      <span
                        style={{
                          fontSize: '0.74rem',
                          fontWeight: 600,
                          padding: '1px 6px',
                          borderRadius: '10px',
                          background: noteCount > 0 ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                          color: noteCount > 0 ? 'var(--color-accent-purple, #8b5cf6)' : 'var(--text-secondary)',
                        }}
                        title={`${noteCount} note${noteCount === 1 ? '' : 's'} using this tag`}
                      >
                        {noteCount} {noteCount === 1 ? 'note' : 'notes'}
                      </span>
                      <button
                        type="button"
                        title={`Delete tag ${t}`}
                        onClick={() => setTagToDelete(t)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                          padding: '2px',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <Trash2 size={13} className="hover:text-red-500" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Tag Confirmation Dialog */}
      {tagToDelete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="deleteTagDialogTitle"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
          onClick={() => {
            if (!deleteTagMutation.isPending) setTagToDelete(null);
          }}
        >
          <div
            className="mono-card"
            style={{
              maxWidth: '460px',
              width: '100%',
              padding: '24px',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-primary, #111827)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: affectedNotes > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: affectedNotes > 0 ? '#ef4444' : '#f59e0b',
                    flexShrink: 0,
                  }}
                >
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3
                    id="deleteTagDialogTitle"
                    className="text-mono-title"
                    style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}
                  >
                    Delete Tag: "{tagToDelete}"
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Confirm taxonomy modification
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setTagToDelete(null)}
                disabled={deleteTagMutation.isPending}
                aria-label="Close dialog"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body: Warning & Affected Notes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {isLoadingUsage ? (
                <div style={{ padding: '14px', background: 'var(--bg-secondary)', borderRadius: '8px', fontSize: '0.88rem' }}>
                  Checking tag usage across notes…
                </div>
              ) : affectedNotes > 0 ? (
                <div
                  style={{
                    padding: '14px',
                    borderRadius: '8px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', fontWeight: 700, fontSize: '0.9rem' }}>
                    <AlertTriangle size={16} />
                    <span>Warning: Tag is in use!</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                    This tag is currently used by{' '}
                    <strong style={{ color: '#ef4444', fontWeight: 800 }}>
                      {affectedNotes} note{affectedNotes === 1 ? '' : 's'}
                    </strong>
                    .
                  </p>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    Deleting this tag will remove it from the curated taxonomy. Notes tagged with "{tagToDelete}" will lose this tag reference.
                  </p>
                </div>
              ) : (
                <div
                  style={{
                    padding: '14px',
                    borderRadius: '8px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.88rem',
                    color: 'var(--text-primary)',
                    lineHeight: 1.5,
                  }}
                >
                  This tag is currently <strong>not used by any notes</strong>. Are you sure you want to remove it from the taxonomy?
                </div>
              )}

              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                To prevent accidental data loss, please confirm or cancel this action.
              </p>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                id="cancelDeleteTagBtn"
                onClick={() => setTagToDelete(null)}
                disabled={deleteTagMutation.isPending}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  cursor: deleteTagMutation.isPending ? 'not-allowed' : 'pointer',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  transition: 'all 0.15s ease',
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                id="confirmDeleteTagBtn"
                onClick={() => deleteTagMutation.mutate(tagToDelete)}
                disabled={deleteTagMutation.isPending}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 18px',
                  borderRadius: '6px',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  cursor: deleteTagMutation.isPending ? 'not-allowed' : 'pointer',
                  opacity: deleteTagMutation.isPending ? 0.6 : 1,
                  background: '#ef4444',
                  border: '1px solid #dc2626',
                  color: '#ffffff',
                  boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
                  transition: 'all 0.15s ease',
                }}
              >
                <Trash2 size={15} />
                <span>{deleteTagMutation.isPending ? 'Deleting…' : 'Delete Tag'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
