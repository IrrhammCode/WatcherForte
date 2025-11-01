import React, { useState } from 'react';
import { NETWORK } from '../config/fcl';
import './NetworkSwitcher.css';

const NetworkSwitcher = () => {
  const [currentNetwork] = useState(NETWORK);

  const switchNetwork = (network) => {
    if (network === currentNetwork) return;

    // Create notification
    const message = network === 'testnet' 
      ? '⚠️ To switch to TESTNET, change NETWORK in frontend/src/config/fcl.js to "testnet" and restart dev server.'
      : '⚠️ To switch to EMULATOR, change NETWORK in frontend/src/config/fcl.js to "emulator" and restart dev server.';
    
    alert(message);
  };

  return (
    <div className="network-switcher">
      <div className="network-indicator">
        <span className="network-label">Network:</span>
        <span className={`network-badge ${currentNetwork}`}>
          {currentNetwork === 'emulator' ? '🔧 Emulator' : '🌐 Testnet'}
        </span>
      </div>
      
      <div className="network-toggle">
        <button
          className={`toggle-btn ${currentNetwork === 'emulator' ? 'active' : ''}`}
          onClick={() => switchNetwork('emulator')}
          title="Local Development Network"
        >
          🔧 Emulator
        </button>
        <button
          className={`toggle-btn ${currentNetwork === 'testnet' ? 'active' : ''}`}
          onClick={() => switchNetwork('testnet')}
          title="Flow Testnet"
        >
          🌐 Testnet
        </button>
      </div>

      {currentNetwork === 'testnet' && (
        <div className="network-info">
          <small>
            📍 Contracts: <code>0x7ca8cd62e27bad20</code>
          </small>
        </div>
      )}
    </div>
  );
};

export default NetworkSwitcher;

