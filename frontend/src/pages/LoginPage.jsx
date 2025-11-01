import React, { useState } from 'react';
import * as fcl from '@onflow/fcl';
import './LoginPage.css';

const LoginPage = ({ onConnect }) => {
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnectWallet = async () => {
    setIsConnecting(true);
    try {
      if (!fcl || !fcl.authenticate) {
        console.error('FCL not ready');
        throw new Error('FCL is not initialized. Please refresh the page.');
      }
      await fcl.authenticate();
      console.log('✅ Wallet connected');
      if (onConnect) {
        onConnect();
      }
    } catch (error) {
      console.error('❌ Wallet connection failed:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleBrowseAsGuest = () => {
    console.log('👤 Browsing as guest (read-only mode)');
    if (onConnect) {
      onConnect('guest');
    }
  };

  const features = [
    {
      icon: '🤖',
      title: 'Deploy Autonomous Watchers',
      description: 'Set up automated price monitoring with smart scheduling',
      color: 'var(--accent-gold)'
    },
    {
      icon: '📊',
      title: 'Real-Time On-Chain Analytics',
      description: 'Live price tracking and volatility insights from Flow blockchain',
      color: 'var(--status-info)'
    },
    {
      icon: '🔐',
      title: 'Decentralized Control via Flow',
      description: 'Your data, your control—powered by Flow blockchain security',
      color: 'var(--status-success)'
    }
  ];

  return (
    <div className="login-page">
      <div className="login-container">
        {/* Logo & Branding */}
        <div className="login-header">
          <div className="brand-logo-large">
            <div className="logo-icon-large">🔍</div>
          </div>
          <h1 className="brand-title">WatcherForte</h1>
          <p className="brand-tagline">Web3 Autonomous Monitoring & Insights</p>
        </div>

        {/* Value Proposition Cards */}
        <div className="features-grid">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className="feature-card"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="feature-icon" style={{ color: feature.color }}>
                {feature.icon}
              </div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-description">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Call to Action */}
        <div className="login-actions">
          <button 
            className="btn-connect-wallet"
            onClick={handleConnectWallet}
            disabled={isConnecting}
          >
            {isConnecting ? (
              <>
                <span className="spinner"></span>
                Connecting...
              </>
            ) : (
              <>
                <span className="wallet-icon">👛</span>
                CONNECT WALLET
              </>
            )}
          </button>

          <button 
            className="link-guest"
            onClick={handleBrowseAsGuest}
          >
            or Browse as Guest →
          </button>
        </div>

        {/* Footer */}
        <div className="login-footer">
          <div className="footer-divider"></div>
          <p className="footer-text">
            Powered by <span className="highlight">Flow Blockchain</span> & <span className="highlight">FCL</span>
          </p>
          <div className="footer-badges">
            <span className="badge">Scheduled Transactions</span>
            <span className="badge">FLIP 330</span>
            <span className="badge">Flow Emulator</span>
          </div>
        </div>
      </div>

      {/* Background Decorations */}
      <div className="bg-decoration bg-decoration-1"></div>
      <div className="bg-decoration bg-decoration-2"></div>
      <div className="bg-decoration bg-decoration-3"></div>
    </div>
  );
};

export default LoginPage;

