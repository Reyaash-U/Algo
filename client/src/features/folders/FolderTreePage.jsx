import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/apiClient.js';
import { queryKeys } from '../../lib/queryClient.js';
import { useTheme } from '../../lib/themeContext.jsx';
import { useToast } from '../../components/shared/Toast.jsx';
import { EmptyState } from '../../components/shared/EmptyState.jsx';
import { SkeletonCard } from '../../components/shared/Skeleton.jsx';
import {
  FolderPlus,
  FilePlus,
  ChevronRight,
  ChevronDown,
  Folder,
  FileCode,
  Trash2,
  Pencil,
  Check,
  X,
  Save,
  MoreVertical,
  FolderOpen,
} from 'lucide-react';

// ─── Status Config ────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  pending:     { label: 'Pending',     color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  in_progress: { label: 'In Progress', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  solved:      { label: 'Solved',      color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  completed:   { label: 'Completed',   color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
};

const STATUS_ORDER = ['pending', 'in_progress', 'solved', 'completed'];

const LANGUAGES = [
  'javascript', 'typescript', 'python', 'java', 'cpp', 'c', 'go', 'rust', 'ruby', 'php', 'swift', 'kotlin', 'csharp', 'sql', 'html', 'css', 'markdown', 'plaintext',
];

// ─── Inline Editable Name ────────────────────────────────────────────────
function InlineEdit({ value, onSave, onCancel, theme }) {
  const [text, setText] = useState(value);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }} onClick={e => e.stopPropagation()}>
      <input
        autoFocus
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && text.trim()) onSave(text.trim());
          if (e.key === 'Escape') onCancel();
        }}
        style={{
          background: 'transparent',
          border: `1px solid ${theme === 'light' ? '#d4d4d8' : '#3f3f46'}`,
          borderRadius: 6,
          padding: '2px 8px',
          fontSize: '0.85rem',
          color: 'inherit',
          outline: 'none',
          width: Math.max(100, text.length * 8),
        }}
      />
      <button onClick={() => text.trim() && onSave(text.trim())} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#10b981', padding: 2 }}><Check size={14} /></button>
      <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 2 }}><X size={14} /></button>
    </span>
  );
}

// ─── Status Pill ─────────────────────────────────────────────────────────
function StatusPill({ status, onCycle, theme }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <button
      onClick={e => { e.stopPropagation(); onCycle(); }}
      title={`Status: ${cfg.label} (click to cycle)`}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '2px 10px', borderRadius: 999,
        fontSize: '0.7rem', fontWeight: 700, letterSpacing: 0.3,
        color: cfg.color, background: cfg.bg,
        border: `1px solid ${cfg.color}33`,
        cursor: 'pointer', transition: 'all 0.2s',
        textTransform: 'uppercase', whiteSpace: 'nowrap',
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color }} />
      {cfg.label}
    </button>
  );
}

// ─── Context Menu (3-dot) ────────────────────────────────────────────────
function ContextMenu({ items, theme }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={e => { e.stopPropagation(); setOpen(!open); }}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: theme === 'light' ? '#71717a' : '#a1a1aa',
          padding: 2, borderRadius: 4, display: 'flex', alignItems: 'center',
        }}
      >
        <MoreVertical size={14} />
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'absolute', right: 0, top: '100%', zIndex: 100,
            minWidth: 140, borderRadius: 8, overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            background: theme === 'light' ? '#fff' : '#27272a',
            border: `1px solid ${theme === 'light' ? '#e4e4e7' : '#3f3f46'}`,
          }}>
            {items.map((item, i) => (
              <button
                key={i}
                onClick={e => { e.stopPropagation(); item.onClick(); setOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', padding: '8px 14px', border: 'none',
                  background: 'transparent', cursor: 'pointer',
                  fontSize: '0.82rem', color: item.danger ? '#ef4444' : (theme === 'light' ? '#18181b' : '#fafafa'),
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.target.style.background = theme === 'light' ? '#f4f4f5' : '#3f3f46'}
                onMouseLeave={e => e.target.style.background = 'transparent'}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── File Tree Node (File) ──────────────────────────────────────────────
function FileNode({ file, isSelected, onSelect, onRename, onDelete, onStatusChange, theme }) {
  const [editing, setEditing] = useState(false);

  const handleCycleStatus = useCallback(() => {
    const idx = STATUS_ORDER.indexOf(file.status || 'pending');
    const nextStatus = STATUS_ORDER[(idx + 1) % STATUS_ORDER.length];
    onStatusChange(file.id, nextStatus);
  }, [file.id, file.status, onStatusChange]);

  return (
    <div
      onClick={() => onSelect(file)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 10px', borderRadius: 8, cursor: 'pointer',
        transition: 'all 0.15s',
        background: isSelected
          ? (theme === 'light' ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.18)')
          : 'transparent',
        borderLeft: isSelected ? '3px solid #6366f1' : '3px solid transparent',
      }}
      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = theme === 'light' ? '#f4f4f5' : '#27272a'; }}
      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
    >
      <FileCode size={15} style={{ color: '#6366f1', flexShrink: 0 }} />
      <span style={{ flex: 1, fontSize: '0.84rem', fontWeight: isSelected ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {editing ? (
          <InlineEdit value={file.name} onSave={name => { onRename(file.id, name); setEditing(false); }} onCancel={() => setEditing(false)} theme={theme} />
        ) : (
          <span title={file.displayName || file.name}>
            <span style={{ color: theme === 'light' ? '#a1a1aa' : '#71717a', fontWeight: 500, marginRight: 4, fontSize: '0.78rem' }}>
              {file.computedNumber ? `${file.computedNumber}.` : ''}
            </span>
            {file.name}
          </span>
        )}
      </span>
      <StatusPill status={file.status || 'pending'} onCycle={handleCycleStatus} theme={theme} />
      <ContextMenu
        theme={theme}
        items={[
          { label: 'Rename', icon: <Pencil size={13} />, onClick: () => setEditing(true) },
          { label: 'Delete', icon: <Trash2 size={13} />, onClick: () => onDelete(file.id), danger: true },
        ]}
      />
    </div>
  );
}

// ─── Folder Tree Node ────────────────────────────────────────────────────
function FolderNode({ folder, selectedFileId, onSelectFile, onRenameFile, onDeleteFile, onStatusChange, onRenameFolder, onDeleteFolder, onCreateFile, onCreateFolder, theme, depth = 0 }) {
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);

  return (
    <div style={{ marginLeft: depth > 0 ? 12 : 0 }}>
      {/* Folder header */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '5px 8px', borderRadius: 8, cursor: 'pointer',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = theme === 'light' ? '#f4f4f5' : '#27272a'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        {expanded ? <ChevronDown size={14} style={{ color: '#a1a1aa', flexShrink: 0 }} /> : <ChevronRight size={14} style={{ color: '#a1a1aa', flexShrink: 0 }} />}
        {expanded ? <FolderOpen size={15} style={{ color: '#f59e0b', flexShrink: 0 }} /> : <Folder size={15} style={{ color: '#f59e0b', flexShrink: 0 }} />}
        <span style={{ flex: 1, fontSize: '0.85rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {editing ? (
            <InlineEdit value={folder.name} onSave={name => { onRenameFolder(folder.id, name); setEditing(false); }} onCancel={() => setEditing(false)} theme={theme} />
          ) : (
            folder.name
          )}
        </span>
        {/* No status controls on folders — per requirement #12 */}
        <ContextMenu
          theme={theme}
          items={[
            { label: 'New File', icon: <FilePlus size={13} />, onClick: () => onCreateFile(folder.id) },
            { label: 'New Subfolder', icon: <FolderPlus size={13} />, onClick: () => onCreateFolder(folder.id) },
            { label: 'Rename', icon: <Pencil size={13} />, onClick: () => setEditing(true) },
            { label: 'Delete', icon: <Trash2 size={13} />, onClick: () => onDeleteFolder(folder.id), danger: true },
          ]}
        />
      </div>

      {/* Children */}
      {expanded && (
        <div style={{ borderLeft: `1px solid ${theme === 'light' ? '#e4e4e7' : '#3f3f46'}`, marginLeft: 14, paddingLeft: 6 }}>
          {/* Files first */}
          {(folder.files || []).map(file => (
            <FileNode
              key={file.id}
              file={file}
              isSelected={selectedFileId === file.id}
              onSelect={onSelectFile}
              onRename={onRenameFile}
              onDelete={onDeleteFile}
              onStatusChange={onStatusChange}
              theme={theme}
            />
          ))}
          {/* Subfolders next */}
          {(folder.folders || []).map(sub => (
            <FolderNode
              key={sub.id}
              folder={sub}
              selectedFileId={selectedFileId}
              onSelectFile={onSelectFile}
              onRenameFile={onRenameFile}
              onDeleteFile={onDeleteFile}
              onStatusChange={onStatusChange}
              onRenameFolder={onRenameFolder}
              onDeleteFolder={onDeleteFolder}
              onCreateFile={onCreateFile}
              onCreateFolder={onCreateFolder}
              theme={theme}
              depth={depth + 1}
            />
          ))}
          {(folder.files || []).length === 0 && (folder.folders || []).length === 0 && (
            <div style={{ padding: '6px 12px', fontSize: '0.78rem', color: '#a1a1aa', fontStyle: 'italic' }}>Empty folder</div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── File Editor Panel ──────────────────────────────────────────────────
function FileEditor({ file, onSave, onClose, theme }) {
  const [code, setCode] = useState(file.code || '');
  const [contentMarkdown, setContentMarkdown] = useState(file.contentMarkdown || '');
  const [language, setLanguage] = useState(file.language || 'javascript');
  const [activeTab, setActiveTab] = useState('code');
  const [dirty, setDirty] = useState(false);

  const handleSave = () => {
    onSave(file.id, { code, contentMarkdown, language });
    setDirty(false);
  };

  const statusCfg = STATUS_CONFIG[file.status || 'pending'] || STATUS_CONFIG.pending;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
        borderBottom: `1px solid ${theme === 'light' ? '#e4e4e7' : '#3f3f46'}`,
        background: theme === 'light' ? '#fafafa' : '#1c1c1e',
      }}>
        <FileCode size={18} style={{ color: '#6366f1' }} />
        <div style={{ flex: 1 }}>
          <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
            <span style={{ color: '#a1a1aa', marginRight: 4, fontSize: '0.85rem' }}>
              {file.computedNumber ? `${file.computedNumber}.` : ''}
            </span>
            {file.name}
          </span>
          <span style={{
            marginLeft: 10, padding: '2px 8px', borderRadius: 999,
            fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase',
            color: statusCfg.color, background: statusCfg.bg,
          }}>
            {statusCfg.label}
          </span>
        </div>
        {dirty && (
          <button
            onClick={handleSave}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 16px', borderRadius: 8, border: 'none',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff', fontWeight: 600, fontSize: '0.82rem',
              cursor: 'pointer', transition: 'transform 0.15s',
            }}
            onMouseEnter={e => e.target.style.transform = 'scale(1.03)'}
            onMouseLeave={e => e.target.style.transform = 'scale(1)'}
          >
            <Save size={14} /> Save
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 0, borderBottom: `1px solid ${theme === 'light' ? '#e4e4e7' : '#3f3f46'}`,
      }}>
        {['code', 'notes'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 20px', border: 'none', cursor: 'pointer',
              fontWeight: activeTab === tab ? 700 : 400,
              fontSize: '0.82rem', textTransform: 'capitalize',
              color: activeTab === tab ? '#6366f1' : (theme === 'light' ? '#71717a' : '#a1a1aa'),
              background: 'transparent',
              borderBottom: activeTab === tab ? '2px solid #6366f1' : '2px solid transparent',
              transition: 'all 0.15s',
            }}
          >
            {tab === 'code' ? 'Code' : 'Notes / Markdown'}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        {activeTab === 'code' && (
          <select
            value={language}
            onChange={e => { setLanguage(e.target.value); setDirty(true); }}
            style={{
              margin: '4px 12px', padding: '4px 8px', borderRadius: 6,
              fontSize: '0.78rem', border: `1px solid ${theme === 'light' ? '#d4d4d8' : '#3f3f46'}`,
              background: theme === 'light' ? '#fff' : '#27272a',
              color: 'inherit', outline: 'none',
            }}
          >
            {LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}
          </select>
        )}
      </div>

      {/* Editor area */}
      <div style={{ flex: 1, overflow: 'auto', padding: 0 }}>
        {activeTab === 'code' ? (
          <textarea
            value={code}
            onChange={e => { setCode(e.target.value); setDirty(true); }}
            placeholder="// Write your code here..."
            spellCheck={false}
            style={{
              width: '100%', height: '100%', border: 'none', outline: 'none', resize: 'none',
              padding: 16, fontFamily: '"Fira Code", "Cascadia Code", "JetBrains Mono", monospace',
              fontSize: '0.88rem', lineHeight: 1.6, tabSize: 2,
              background: theme === 'light' ? '#fafafa' : '#18181b',
              color: theme === 'light' ? '#18181b' : '#fafafa',
            }}
          />
        ) : (
          <textarea
            value={contentMarkdown}
            onChange={e => { setContentMarkdown(e.target.value); setDirty(true); }}
            placeholder="# Notes&#10;&#10;Write your notes here in Markdown..."
            style={{
              width: '100%', height: '100%', border: 'none', outline: 'none', resize: 'none',
              padding: 16, fontFamily: '"Inter", system-ui, sans-serif',
              fontSize: '0.88rem', lineHeight: 1.7,
              background: theme === 'light' ? '#fafafa' : '#18181b',
              color: theme === 'light' ? '#18181b' : '#fafafa',
            }}
          />
        )}
      </div>
    </div>
  );
}

// ─── Main FolderTreePage ─────────────────────────────────────────────────
export function FolderTreePage() {
  const { theme } = useTheme();
  const toast = useToast();
  const qc = useQueryClient();
  const [selectedFile, setSelectedFile] = useState(null);

  // Fetch tree
  const { data: treeData, isLoading, isError } = useQuery({
    queryKey: queryKeys.folderTree,
    queryFn: () => api.folders.tree(),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.folderTree });

  // ── Mutations ──
  const createFolderMut = useMutation({
    mutationFn: (body) => api.folders.create(body),
    onSuccess: () => { invalidate(); toast.success('Folder created'); },
    onError: (e) => toast.error(e.message || 'Failed to create folder'),
  });

  const renameFolderMut = useMutation({
    mutationFn: ({ id, name }) => api.folders.update(id, { name }),
    onSuccess: () => { invalidate(); toast.success('Folder renamed'); },
    onError: (e) => toast.error(e.message || 'Failed to rename folder'),
  });

  const deleteFolderMut = useMutation({
    mutationFn: (id) => api.folders.remove(id),
    onSuccess: () => { invalidate(); toast.success('Folder deleted'); },
    onError: (e) => toast.error(e.message || 'Failed to delete folder'),
  });

  const createFileMut = useMutation({
    mutationFn: (body) => api.files.create(body),
    onSuccess: (file) => { invalidate(); toast.success('File created'); },
    onError: (e) => toast.error(e.message || 'Failed to create file'),
  });

  const renameFileMut = useMutation({
    mutationFn: ({ id, name }) => api.files.update(id, { name }),
    onSuccess: () => invalidate(),
    onError: (e) => toast.error(e.message || 'Failed to rename file'),
  });

  const updateFileMut = useMutation({
    mutationFn: ({ id, data }) => api.files.update(id, data),
    onSuccess: () => { invalidate(); toast.success('Saved'); },
    onError: (e) => toast.error(e.message || 'Failed to save'),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }) => api.files.updateStatus(id, status),
    onSuccess: () => invalidate(),
    onError: (e) => toast.error(e.message || 'Failed to update status'),
  });

  const deleteFileMut = useMutation({
    mutationFn: (id) => api.files.remove(id),
    onSuccess: (_, id) => {
      if (selectedFile?.id === id) setSelectedFile(null);
      invalidate();
      toast.success('File deleted');
    },
    onError: (e) => toast.error(e.message || 'Failed to delete file'),
  });

  // ── Handlers ──
  const handleCreateRootFolder = () => {
    const name = prompt('New folder name:');
    if (name?.trim()) createFolderMut.mutate({ name: name.trim(), parentId: null });
  };

  const handleCreateRootFile = () => {
    const name = prompt('New file name:');
    if (name?.trim()) createFileMut.mutate({ name: name.trim(), folderId: null });
  };

  const handleCreateFile = (folderId) => {
    const name = prompt('New file name:');
    if (name?.trim()) createFileMut.mutate({ name: name.trim(), folderId });
  };

  const handleCreateFolder = (parentId) => {
    const name = prompt('New subfolder name:');
    if (name?.trim()) createFolderMut.mutate({ name: name.trim(), parentId });
  };

  const handleSelectFile = useCallback((file) => {
    setSelectedFile(file);
  }, []);

  const handleFileSave = (id, data) => {
    updateFileMut.mutate({ id, data });
  };

  const handleStatusChange = useCallback((id, status) => {
    statusMut.mutate({ id, status });
  }, []);

  const handleRenameFile = useCallback((id, name) => {
    renameFileMut.mutate({ id, name });
  }, []);

  const handleDeleteFile = useCallback((id) => {
    if (confirm('Delete this file?')) deleteFileMut.mutate(id);
  }, []);

  const handleRenameFolder = useCallback((id, name) => {
    renameFolderMut.mutate({ id, name });
  }, []);

  const handleDeleteFolder = useCallback((id) => {
    if (confirm('Delete this folder and all its contents?')) deleteFolderMut.mutate(id);
  }, []);

  // When tree updates, sync selectedFile with fresh data
  const freshSelectedFile = selectedFile && treeData
    ? findFileInTree(treeData, selectedFile.id)
    : null;

  // ── Render ──
  const isLight = theme === 'light';

  if (isLoading) {
    return (
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  const hasContent = treeData && ((treeData.folders?.length || 0) + (treeData.rootFiles?.length || 0)) > 0;

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 24px 48px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            <span style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Folder Tree
            </span>
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: isLight ? '#71717a' : '#a1a1aa' }}>
            Organize your coding files in a dynamic hierarchy
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleCreateRootFolder}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 10, border: `1px solid ${isLight ? '#e4e4e7' : '#3f3f46'}`,
              background: isLight ? '#fff' : '#27272a',
              color: 'inherit', fontWeight: 600, fontSize: '0.82rem',
              cursor: 'pointer', transition: 'all 0.2s',
            }}
            onMouseEnter={e => e.target.style.borderColor = '#6366f1'}
            onMouseLeave={e => e.target.style.borderColor = isLight ? '#e4e4e7' : '#3f3f46'}
          >
            <FolderPlus size={15} /> New Folder
          </button>
          <button
            onClick={handleCreateRootFile}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 10, border: 'none',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff', fontWeight: 600, fontSize: '0.82rem',
              cursor: 'pointer', transition: 'transform 0.15s',
            }}
            onMouseEnter={e => e.target.style.transform = 'scale(1.03)'}
            onMouseLeave={e => e.target.style.transform = 'scale(1)'}
          >
            <FilePlus size={15} /> New File
          </button>
        </div>
      </div>

      {!hasContent ? (
        <EmptyState
          title="No folders or files yet"
          description="Create your first folder or file to start organizing your coding work. Use the buttons above to get started."
        />
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: freshSelectedFile ? '340px 1fr' : '1fr',
          gap: 16,
          minHeight: 500,
        }}>
          {/* Sidebar: Folder tree */}
          <div style={{
            borderRadius: 14,
            border: `1px solid ${isLight ? '#e4e4e7' : '#3f3f46'}`,
            background: isLight ? '#fff' : '#1c1c1e',
            overflow: 'auto',
            maxHeight: 'calc(100vh - 180px)',
            padding: '12px 8px',
          }}>
            {/* Root files */}
            {(treeData.rootFiles || []).map(file => (
              <FileNode
                key={file.id}
                file={file}
                isSelected={freshSelectedFile?.id === file.id}
                onSelect={handleSelectFile}
                onRename={handleRenameFile}
                onDelete={handleDeleteFile}
                onStatusChange={handleStatusChange}
                theme={theme}
              />
            ))}
            {/* Folders */}
            {(treeData.folders || []).map(folder => (
              <FolderNode
                key={folder.id}
                folder={folder}
                selectedFileId={freshSelectedFile?.id}
                onSelectFile={handleSelectFile}
                onRenameFile={handleRenameFile}
                onDeleteFile={handleDeleteFile}
                onStatusChange={handleStatusChange}
                onRenameFolder={handleRenameFolder}
                onDeleteFolder={handleDeleteFolder}
                onCreateFile={handleCreateFile}
                onCreateFolder={handleCreateFolder}
                theme={theme}
              />
            ))}
          </div>

          {/* Main: File editor */}
          {freshSelectedFile && (
            <div style={{
              borderRadius: 14,
              border: `1px solid ${isLight ? '#e4e4e7' : '#3f3f46'}`,
              background: isLight ? '#fff' : '#1c1c1e',
              overflow: 'hidden',
              maxHeight: 'calc(100vh - 180px)',
              display: 'flex', flexDirection: 'column',
            }}>
              <FileEditor
                key={freshSelectedFile.id}
                file={freshSelectedFile}
                onSave={handleFileSave}
                onClose={() => setSelectedFile(null)}
                theme={theme}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Utility: find file recursively in tree ─────────────────────────────
function findFileInTree(treeData, fileId) {
  // Check root files
  for (const f of (treeData.rootFiles || [])) {
    if (f.id === fileId) return f;
  }
  // Check folders recursively
  function searchFolders(folders) {
    for (const folder of folders) {
      for (const f of (folder.files || [])) {
        if (f.id === fileId) return f;
      }
      const found = searchFolders(folder.folders || []);
      if (found) return found;
    }
    return null;
  }
  return searchFolders(treeData.folders || []);
}
