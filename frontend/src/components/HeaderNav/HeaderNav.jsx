import React, { useState, useEffect } from 'react';
import * as fcl from '@onflow/fcl';
import './HeaderNav.css';

const HeaderNav = ({ currentPage, onNavigate, user }) => {
  const [activeItem, setActiveItem] = useState(currentPage || 'dashboard');

  // Sync activeItem with currentPage prop
  useEffect(() => {
    if (currentPage) {
      setActiveItem(currentPage);
    }
  }, [currentPage]);

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: '📊',
      description: 'Main Overview',
    },
    {
      id: 'manage',
      label: 'Manage Watchers',
      icon: '⚙️',
      description: 'Configure & Control',
    },
    {
      id: 'logs',
      label: 'Activity Logs',
      icon: '📜',
      description: 'Event History',
    },
    {
      id: 'insights',
      label: 'Insights',
      icon: '💡',
      description: 'Analytics & Reports',
    },
  ];

  const handleItemClick = (item) => {
    if (item.external) {
      // For external links or future implementation
      console.log(`Opening ${item.label}...`);
      return;
    }

    setActiveItem(item.id);
    if (onNavigate) {
      onNavigate(item.id);
    }
  };

  return (
    <nav className="header-nav">
      <div className="header-nav-container">
        {/* Logo/Brand Section */}
        <div className="header-brand">
          <img src="/logo.png" alt="WatcherForte" className="brand-icon" />
          <div className="brand-text">
            <span className="brand-name">WatcherForte</span>
            <span className="brand-tagline">Flow Analytics</span>
          </div>
        </div>

        {/* Menu Items */}
        <div className="header-menu">
          {menuItems.map((item) => (
            <button
              key={item.id}
              className={`menu-item ${activeItem === item.id ? 'active' : ''}`}
              onClick={() => handleItemClick(item)}
              title={item.description}
            >
              <span className="menu-icon">{item.icon}</span>
              <span className="menu-label">{item.label}</span>
            </button>
          ))}
        </div>

        {/* Right Actions */}
        <div className="header-actions">
          {/* Settings Button */}
          {user?.addr && (
            <button 
              className="action-btn settings-btn" 
              title="Notification Settings"
              onClick={() => onNavigate && onNavigate('settings')}
            >
              <span className="settings-icon">⚙️</span>
            </button>
          )}
          
          {/* Notification Bell */}
          <button className="action-btn notification-btn" title="Notifications">
            <span className="notification-icon">🔔</span>
            <span className="notification-badge">3</span>
          </button>

          {/* Wallet Connect/Logout */}
          {user?.addr ? (
            <>
              <div className="wallet-info">
                <span className="wallet-status">●</span>
                <span className="wallet-address">
                  {user.addr.substring(0, 6)}...{user.addr.substring(user.addr.length - 4)}
                </span>
              </div>
              <button 
                className="btn-logout" 
                onClick={async () => {
                  try {
                    if (fcl && fcl.unauthenticate) {
                      await fcl.unauthenticate();
                    }
                  } catch (error) {
                    console.error('Logout error:', error);
                  }
                }}
              >
                Logout
              </button>
            </>
          ) : (
            <button 
              className="btn-connect" 
              onClick={async () => {
                try {
                  if (fcl && fcl.authenticate) {
                    await fcl.authenticate();
                  } else {
                    console.error('FCL not ready');
                  }
                } catch (error) {
                  console.error('Authentication error:', error);
                }
              }}
            >
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default HeaderNav;

