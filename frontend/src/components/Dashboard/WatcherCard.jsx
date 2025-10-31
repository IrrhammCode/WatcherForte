/**
 * WatcherCard.jsx
 * 
 * Premium glassmorphism card component for displaying individual watcher status
 * Shows: Status badge, live data, uptime, schedule, and action buttons
 */

import React, { useState, useEffect } from 'react';
import './WatcherCard.css';

const WatcherCard = ({ watcher, onStop, onResume, onViewDetails }) => {
  const [uptime, setUptime] = useState('');
  const [showMarkAlert, setShowMarkAlert] = useState(false);
  
  // ✅ CHECK: Show "Mark as Alerted" button only for event/transaction watchers that aren't alerted yet
  useEffect(() => {
    if ((watcher.metric === 'event' || watcher.metric === 'transaction') && watcher.status !== 'Limit Reached') {
      setShowMarkAlert(true);
    } else {
      setShowMarkAlert(false);
    }
  }, [watcher.metric, watcher.status]);
  
  // ✅ MARK AS ALERTED: Save alert log to localStorage
  const handleMarkAsAlerted = () => {
    const logKey = `watcher_${watcher.id}_logs`;
    const existingLogs = JSON.parse(localStorage.getItem(logKey) || '[]');
    
    const alertLog = {
      timestamp: Date.now(),
      type: 'AlertTriggered',
      message: '🚨 ALERT! Condition Met - Manually marked via dashboard',
      data: {
        source: 'manual',
        triggeredAt: new Date().toISOString()
      }
    };
    
    existingLogs.push(alertLog);
    localStorage.setItem(logKey, JSON.stringify(existingLogs));
    
    console.log(`✅ Watcher #${watcher.id} marked as alerted!`);
    alert(`✅ Watcher "${watcher.watcherName}" marked as alerted!\n\nRefresh the page to see it in the Alert tab.`);
    
    // Reload page to update status
    setTimeout(() => window.location.reload(), 1500);
  };
  
  // Calculate uptime from deployment timestamp
  useEffect(() => {
    if (watcher.deploymentTimestamp) {
      const calculateUptime = () => {
        const now = Date.now();
        const deployed = watcher.deploymentTimestamp * 1000; // Convert to ms
        const diff = now - deployed;
        
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        if (days > 0) {
          return `${days}d ${hours}h`;
        } else if (hours > 0) {
          return `${hours}h ${minutes}m`;
        } else {
          return `${minutes}m`;
        }
      };
      
      setUptime(calculateUptime());
      const interval = setInterval(() => setUptime(calculateUptime()), 60000); // Update every minute
      
      return () => clearInterval(interval);
    }
  }, [watcher.deploymentTimestamp]);
  
  // Determine status and styling (use status from backend)
  const getStatusBadge = () => {
    if (watcher.status === 'Limit Reached') {
      return { label: 'Alert Triggered', className: 'status-alert', icon: '🚨' };
    } else if (watcher.status === 'Active') {
      return { label: 'Active', className: 'status-active', icon: '✅' };
    } else {
      return { label: watcher.status, className: 'status-paused', icon: '⏸️' };
    }
  };
  
  // Get metric icon
  const getMetricIcon = () => {
    const metricMap = {
      'price': '💰',
      'transaction': '📊',
      'event': '🎮',
      'balance': '💳',
      'ownership': '👤',
      'nft-floor': '📉',
      'juice-price': '💰',
      'juice-whale': '🐋',
      'player-stats': '🏀',
      'vault-activity': '🏆',
      'nft-marketplace': '🎴'
    };
    return metricMap[watcher.metric] || '📊';
  };
  
  // Get bounty/template icon
  const getTemplateIcon = () => {
    if (watcher.templateIcon) return watcher.templateIcon;
    // Check templateId from localStorage or watcher object
    const templateId = watcher.templateId || localStorage.getItem(`watcher_${watcher.id}_templateId`);
    if (templateId === 'cryptokitties-meowcoins') return '😺';
    if (templateId === 'mfl-player') return '⚽';
    if (templateId === 'beezie-collectible') return '🎨';
    if (watcher.targetAsset?.includes('FROTH')) return '🥊';
    if (watcher.targetAsset?.includes('JUICE')) return '🏀';
    return '📊';
  };
  
  const statusBadge = getStatusBadge();
  
  return (
    <div className="watcher-card">
      {/* Header */}
      <div className="watcher-card-header">
        <div className="watcher-title">
          <span className="template-icon">{getTemplateIcon()}</span>
          <h3>{watcher.watcherName || watcher.templateName || watcher.templateType || `Watcher #${watcher.id}`}</h3>
        </div>
        <span className={`status-badge ${statusBadge.className}`}>
          {statusBadge.icon} {statusBadge.label}
        </span>
      </div>
      
      {/* Body - Live Data */}
      <div className="watcher-card-body">
        <div className="data-row">
          <div className="data-item">
            <span className="data-label">📊 Output</span>
            <span className="data-value">
              {watcher.currentValue || watcher.lastPrice || 'Pending first check...'}
            </span>
          </div>
        </div>
        
        <div className="data-row">
          <div className="data-item">
            <span className="data-label">⏱️ Uptime</span>
            <span className="data-value uptime">{uptime || 'Calculating...'}</span>
          </div>
          <div className="data-item">
            <span className="data-label">📅 Schedule</span>
            <span className="data-value">Every {watcher.scheduleDelay || 24}h</span>
          </div>
        </div>
        
        <div className="data-row">
          <div className="data-item">
            <span className="data-label">{getMetricIcon()} Metric</span>
            <span className="data-value metric-name">
              {watcher.metric === 'juice-price' ? '$JUICE Price' :
               watcher.metric === 'juice-whale' ? 'Whale Tracking' :
               watcher.metric === 'player-stats' ? 'Player Performance' :
               watcher.metric === 'vault-activity' ? 'Fast Break Vaults' :
               watcher.metric === 'nft-marketplace' ? 'NFT Trading' :
               watcher.metric === 'price' && watcher.templateId === 'cryptokitties-meowcoins' ? 'MeowCoin Price' :
               watcher.metric === 'transaction' && watcher.templateId === 'cryptokitties-meowcoins' ? 'Whale Alert & Sales' :
               watcher.metric === 'balance' && watcher.templateId === 'cryptokitties-meowcoins' ? 'Balance Change' :
               watcher.metric === 'ownership' && watcher.templateId === 'cryptokitties-meowcoins' ? 'CryptoKitties NFT Ownership' :
               watcher.metric === 'nft-floor' && watcher.templateId === 'cryptokitties-meowcoins' ? 'CryptoKitties Floor Price' :
               watcher.metric === 'ownership' && watcher.templateId === 'mfl-player' ? 'MFL Player Ownership' :
               watcher.metric === 'transaction' && watcher.templateId === 'mfl-player' ? 'MFL Marketplace Activity' :
               watcher.metric === 'nft-floor' && watcher.templateId === 'mfl-player' ? 'MFL Player Floor Price' :
               watcher.metric === 'event' && watcher.templateId === 'mfl-player' ? 'MFL Football Events' :
               watcher.metric === 'price' && watcher.templateId === 'beezie-collectible' ? 'ALT.xyz Fair Market Value' :
               watcher.metric === 'event' && watcher.templateId === 'beezie-collectible' ? 'Beezie Marketplace Events' :
               watcher.metric === 'price' ? 'Price Tracking' :
               watcher.metric === 'transaction' ? 'Transaction Volume' :
               watcher.metric === 'ownership' ? 'NFT Ownership' :
               watcher.metric === 'nft-floor' ? 'NFT Floor Price' :
               watcher.metric === 'balance' ? 'Balance Change' :
               watcher.metric.charAt(0).toUpperCase() + watcher.metric.slice(1)}
            </span>
          </div>
          <div className="data-item">
            <span className="data-label">🎯 Target</span>
            <span className="data-value">{watcher.priceLimit || watcher.limit}</span>
          </div>
        </div>
      </div>
      
      {/* Footer - Actions */}
      <div className="watcher-card-footer" style={{
        display: 'flex',
        gap: '0.5rem',
        flexWrap: 'wrap'
      }}>
        {/* ✅ MARK AS ALERTED BUTTON (for event/transaction watchers) */}
        {showMarkAlert && (
          <button 
            className="action-btn alert-btn" 
            onClick={handleMarkAsAlerted}
            title="Mark as alerted (if you received Telegram notification)"
            style={{
              background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
              color: 'white',
              border: '1px solid #F59E0B',
              fontSize: '0.75rem',
              padding: '0.5rem 0.75rem',
              flex: '1'
            }}
          >
            🚨 Mark Alert
          </button>
        )}
        
        {/* Always show Pause button - this dashboard only shows active watchers */}
        <button 
          className="action-btn stop-btn" 
          onClick={() => onStop(watcher.id)}
          title="Pause watcher"
        >
          ⏸️ Pause
        </button>
        
        <button 
          className="action-btn details-btn" 
          onClick={() => onViewDetails(watcher.id)}
          title="View details"
        >
          📋 Details
        </button>
      </div>
    </div>
  );
};

export default WatcherCard;

