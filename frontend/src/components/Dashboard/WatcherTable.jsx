import React from 'react';
import './WatcherTable.css';

const WatcherTable = ({ watchers, onRefresh, onStop, onViewLogs }) => {
  const getStatusBadge = (status) => {
    const statusClasses = {
      'Active': 'status-active',
      'Limit Reached': 'status-limit',
      'Failed': 'status-failed',
      'Error': 'status-error',
      'Inactive': 'status-inactive',
      'Stopped': 'status-inactive',
    };

    return (
      <span className={`status-badge ${statusClasses[status] || 'status-unknown'}`}>
        {status}
      </span>
    );
  };

  const formatNextExecution = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = date - now;
    
    if (diff < 0) return 'Overdue';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `in ${days}d ${hours % 24}h`;
    }
    
    return `in ${hours}h ${minutes}m`;
  };

  const handleStopWatcher = (watcherId, e) => {
    e.stopPropagation();
    if (onStop) {
      onStop(watcherId);
    }
  };

  const handleViewLogs = (watcherId, e) => {
    e.stopPropagation();
    if (onViewLogs) {
      onViewLogs(watcherId);
    }
  };

  return (
    <div className="watcher-table-container">
      <div className="table-header-row">
        <div className="table-controls">
          <span className="watcher-count">
            {watchers.length} {watchers.length === 1 ? 'Watcher' : 'Watchers'}
          </span>
          <button className="btn-refresh" onClick={onRefresh} title="Refresh">
            🔄 Refresh
          </button>
        </div>
      </div>

      <table className="watcher-table">
        <thead>
          <tr>
            <th>Watcher ID</th>
            <th>Watcher Name</th>
            <th>Target Asset</th>
            <th>Template Type</th>
            <th>Schedule</th>
            <th>Next Execution</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {watchers.map((watcher) => (
            <tr key={watcher.id}>
              <td className="cell-id">
                <span className="watcher-id">#{watcher.id}</span>
              </td>
              <td className="cell-name">
                <div className="watcher-name-info">
                  <span className="watcher-name-text">
                    {watcher.watcherName || watcher.templateType || 'Unnamed Watcher'}
                  </span>
                  {watcher.bountyType && watcher.bountyType !== 'generic' && (
                    <span className="bounty-tag">
                      {watcher.bountyType === 'kittypunch' && '🥊'}
                      {watcher.bountyType === 'aisports' && '🏀'}
                      {watcher.bountyType === 'dapper-insights' && '🏈'}
                      {watcher.bountyType === 'mfl' && '⚽'}
                      {watcher.bountyType === 'beezie' && '🎨'}
                    </span>
                  )}
                  {watcher.transactionId && watcher.transactionId !== 'undefined' && (
                    <a
                      href={`https://testnet.flowscan.io/tx/${watcher.transactionId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        marginTop: '6px',
                        fontSize: '0.75rem',
                        color: '#3B82F6',
                        textDecoration: 'none',
                        fontWeight: 500,
                        transition: 'opacity 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.opacity = '0.7'}
                      onMouseLeave={(e) => e.target.style.opacity = '1'}
                    >
                      <span>📝</span>
                      View Transaction Proof
                      <span style={{ fontSize: '0.625rem' }}>↗</span>
                    </a>
                  )}
                </div>
              </td>
              <td className="cell-asset">
                <div className="asset-info">
                  <span className="asset-name">
                    {watcher.metric === 'price' && '💰 '}
                    {watcher.metric === 'transaction' && '📊 '}
                    {watcher.metric === 'event' && '🎮 '}
                    {watcher.targetAsset}
                  </span>
                  <span className="asset-price">
                    {watcher.metric === 'price' && (
                      watcher.currentPrice !== null && watcher.currentPrice !== undefined
                        ? `$${watcher.currentPrice.toFixed(4)} / $${watcher.priceLimit?.toFixed(2) || '0.00'}`
                        : `Price loading... / $${watcher.priceLimit?.toFixed(2) || '0.00'}`
                    )}
                    {watcher.metric === 'transaction' && `Watching volume (limit: ${Math.floor(watcher.priceLimit || 0)} tx)`}
                    {watcher.metric === 'event' && `Watching game events`}
                    {!watcher.metric && `${watcher.currentPrice} / ${watcher.priceLimit} FLOW`}
                  </span>
                </div>
              </td>
              <td className="cell-template">
                <span className="template-badge">
                  {watcher.templateIcon && <span style={{ marginRight: '6px' }}>{watcher.templateIcon}</span>}
                  {watcher.templateType}
                </span>
              </td>
              <td className="cell-schedule">{watcher.schedule}</td>
              <td className="cell-execution">
                <span className="execution-time">
                  {formatNextExecution(watcher.nextExecution)}
                </span>
              </td>
              <td className="cell-status">
                {getStatusBadge(watcher.status)}
              </td>
              <td className="cell-actions">
                <button 
                  className="btn-action btn-logs"
                  onClick={(e) => handleViewLogs(watcher.id, e)}
                  title="View Notification Logs"
                >
                  📜
                </button>
                {watcher.isStopped ? (
                  <button 
                    className="btn-action btn-resume"
                    onClick={(e) => onResume && onResume(watcher.id)}
                    title="Resume Watcher"
                  >
                    ▶️
                  </button>
                ) : (
                  <button 
                    className="btn-action btn-stop"
                    onClick={(e) => handleStopWatcher(watcher.id, e)}
                    title="Stop Watcher"
                  >
                    ⏹️
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default WatcherTable;

