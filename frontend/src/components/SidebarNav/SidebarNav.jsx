import React, { useState } from 'react';
import * as fcl from '@onflow/fcl';
import './SidebarNav.css';

const SidebarNav = ({ currentPage, onNavigate, user }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: '🏠',
      description: 'Active watchers'
    },
    {
      id: 'manage',
      label: 'Deploy New',
      icon: '🚀',
      description: 'Deploy new watcher'
    },
    {
      id: 'insights',
      label: 'Insights',
      icon: '📊',
      description: 'Analytics & metrics'
    },
    {
      id: 'logs',
      label: 'Logs',
      icon: '📜',
      description: 'Activity logs'
    }
  ];

  const handleLogout = () => {
    fcl.unauthenticate();
    console.log('🔓 User logged out');
  };

  return (
    <div className={`sidebar-nav ${isExpanded ? 'expanded' : 'collapsed'}`}>
      {/* Logo Section */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <img src="/logo.png" alt="WatcherForte" className="logo-icon" />
          {isExpanded && (
            <div className="logo-text">
              <h2>Watcher<span className="text-gradient-cyan">Forte</span></h2>
              <p>Data Hub</p>
            </div>
          )}
        </div>
        
        <button 
          className="sidebar-toggle"
          onClick={() => setIsExpanded(!isExpanded)}
          title={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? '◀' : '▶'}
        </button>
      </div>

      {/* Navigation Items */}
      <nav className="sidebar-nav-items">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`sidebar-nav-item ${currentPage === item.id ? 'active' : ''}`}
            onClick={() => onNavigate(item.id)}
            title={!isExpanded ? item.label : ''}
          >
            <span className="nav-icon">{item.icon}</span>
            {isExpanded && (
              <div className="nav-content">
                <span className="nav-label">{item.label}</span>
                <span className="nav-description">{item.description}</span>
              </div>
            )}
            {currentPage === item.id && <div className="nav-indicator" />}
          </button>
        ))}
      </nav>

      {/* Settings Button */}
      {user?.addr && (
        <button
          className="sidebar-nav-item"
          onClick={() => onNavigate('settings')}
          title={!isExpanded ? 'Settings' : ''}
        >
          <span className="nav-icon">⚙️</span>
          {isExpanded && (
            <div className="nav-content">
              <span className="nav-label">Settings</span>
              <span className="nav-description">Configure bot</span>
            </div>
          )}
        </button>
      )}

      {/* User Section */}
      <div className="sidebar-footer">
        {user?.addr ? (
          <div className="sidebar-user">
            <div className="user-avatar">
              <span>👤</span>
            </div>
            {isExpanded && (
              <div className="user-info">
                <div className="user-address">
                  {user.addr.substring(0, 6)}...{user.addr.substring(user.addr.length - 4)}
                </div>
                <div className="user-status">
                  <span className="status-dot"></span>
                  Connected
                </div>
              </div>
            )}
            {isExpanded && (
              <button 
                className="logout-button"
                onClick={handleLogout}
                title="Logout"
              >
                🚪
              </button>
            )}
          </div>
        ) : (
          <div className="sidebar-status">
            <div className="status-indicator disconnected">
              <span className="status-dot-red"></span>
              {isExpanded && <span>Guest Mode</span>}
            </div>
          </div>
        )}
        
        {/* FCL Connection Status */}
        <div className="sidebar-connection">
          <div className={`connection-status ${user?.addr ? 'connected' : 'disconnected'}`}>
            <span className="connection-dot"></span>
            {isExpanded && (
              <span className="connection-text">
                {user?.addr ? 'Flow Connected' : 'Disconnected'}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SidebarNav;

