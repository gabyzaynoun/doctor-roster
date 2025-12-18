import { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { AuditLog } from '../types';
import { History, Filter, RefreshCw, ChevronLeft, ChevronRight, Clock, User, FileText } from 'lucide-react';

const ACTION_LABELS: Record<string, string> = {
  create: 'Created',
  update: 'Updated',
  delete: 'Deleted',
  login: 'Logged in',
  logout: 'Logged out',
  publish: 'Published',
  unpublish: 'Unpublished',
  archive: 'Archived',
  unarchive: 'Unarchived',
  auto_build: 'Auto-built',
  export: 'Exported',
};

const ENTITY_LABELS: Record<string, string> = {
  user: 'User',
  doctor: 'Doctor',
  schedule: 'Schedule',
  assignment: 'Assignment',
  leave: 'Leave',
  center: 'Center',
  shift: 'Shift',
};

export function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [entityType, setEntityType] = useState<string>('');
  const [action, setAction] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [page, setPage] = useState(0);
  const limit = 25;

  useEffect(() => {
    loadLogs();
  }, [page, entityType, action]);

  const loadLogs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: Record<string, unknown> = {
        limit,
        offset: page * limit,
      };
      if (entityType) params.entity_type = entityType;
      if (action) params.action = action;

      const response = await api.getAuditLogs(params);
      setLogs(response.items);
      setTotal(response.total);
    } catch (err) {
      console.error(err);
      setError('Failed to load audit logs');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatValues = (values: Record<string, unknown> | null): string => {
    if (!values) return '-';
    return Object.entries(values)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
  };

  const getActionColor = (actionType: string): string => {
    switch (actionType) {
      case 'create':
        return 'action-create';
      case 'delete':
        return 'action-delete';
      case 'publish':
        return 'action-publish';
      case 'archive':
        return 'action-archive';
      default:
        return 'action-update';
    }
  };

  const totalPages = Math.ceil(total / limit);

  if (error) {
    return (
      <div className="error-container">
        <p>{error}</p>
        <button onClick={loadLogs} className="btn-primary">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="audit-log-page">
      <header className="page-header">
        <div className="header-title">
          <History size={24} />
          <h1>Activity Log</h1>
        </div>

        <div className="header-actions">
          <button
            className={`btn-icon ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
            title="Toggle filters"
          >
            <Filter size={18} />
          </button>
          <button className="btn-icon" onClick={loadLogs} title="Refresh">
            <RefreshCw size={18} />
          </button>
        </div>
      </header>

      {showFilters && (
        <div className="filters-panel">
          <div className="filter-group">
            <label>Entity Type</label>
            <select value={entityType} onChange={(e) => { setEntityType(e.target.value); setPage(0); }}>
              <option value="">All</option>
              <option value="schedule">Schedule</option>
              <option value="assignment">Assignment</option>
              <option value="doctor">Doctor</option>
              <option value="leave">Leave</option>
              <option value="user">User</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Action</label>
            <select value={action} onChange={(e) => { setAction(e.target.value); setPage(0); }}>
              <option value="">All</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
              <option value="publish">Publish</option>
              <option value="unpublish">Unpublish</option>
              <option value="archive">Archive</option>
              <option value="auto_build">Auto-build</option>
            </select>
          </div>
          <button
            className="btn-secondary"
            onClick={() => {
              setEntityType('');
              setAction('');
              setPage(0);
            }}
          >
            Clear Filters
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="loading-container">
          <div className="spinner" />
          <p>Loading activity log...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="empty-state">
          <History size={48} />
          <p>No activity logs found</p>
        </div>
      ) : (
        <>
          <div className="audit-log-list">
            {logs.map((log) => (
              <div key={log.id} className="audit-log-item">
                <div className="log-icon">
                  <FileText size={18} />
                </div>
                <div className="log-content">
                  <div className="log-header">
                    <span className={`action-badge ${getActionColor(log.action)}`}>
                      {ACTION_LABELS[log.action] || log.action}
                    </span>
                    <span className="entity-type">
                      {ENTITY_LABELS[log.entity_type] || log.entity_type}
                      {log.entity_id && ` #${log.entity_id}`}
                    </span>
                  </div>
                  <div className="log-meta">
                    <span className="log-user">
                      <User size={14} />
                      {log.user_name || 'System'}
                    </span>
                    <span className="log-time">
                      <Clock size={14} />
                      {formatDateTime(log.created_at)}
                    </span>
                    {log.ip_address && (
                      <span className="log-ip">{log.ip_address}</span>
                    )}
                  </div>
                  {(log.old_values || log.new_values) && (
                    <div className="log-details">
                      {log.old_values && (
                        <div className="log-values old">
                          <span className="label">Before:</span> {formatValues(log.old_values)}
                        </div>
                      )}
                      {log.new_values && (
                        <div className="log-values new">
                          <span className="label">After:</span> {formatValues(log.new_values)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="pagination">
            <button
              className="btn-icon"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft size={18} />
            </button>
            <span className="page-info">
              Page {page + 1} of {totalPages} ({total} total)
            </span>
            <button
              className="btn-icon"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
