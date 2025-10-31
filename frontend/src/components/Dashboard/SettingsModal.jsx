import React, { useState, useEffect } from 'react';
import './SettingsModal.css';

const SettingsModal = ({ user, onClose }) => {
  const [botToken, setBotToken] = useState('');
  const [testingBot, setTestingBot] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    // Load saved bot token from localStorage
    const saved = localStorage.getItem(`telegram_bot_token_${user.addr}`);
    if (saved) {
      setBotToken(saved);
    }
  }, [user]);

  const handleTestBot = async () => {
    if (!botToken) {
      setTestResult({ success: false, message: 'Please enter a bot token' });
      return;
    }

    setTestingBot(true);
    setTestResult(null);

    try {
      const response = await fetch('http://localhost:3001/api/telegram/test-bot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ botToken }),
      });

      const data = await response.json();
      
      if (data.success) {
        setTestResult({
          success: true,
          message: `Bot connected: @${data.username}`,
          botInfo: data
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || 'Failed to connect bot'
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Failed to connect to Telegram API server. Make sure it\'s running on port 3001.'
      });
    } finally {
      setTestingBot(false);
    }
  };

  const handleSave = () => {
    // Save to localStorage with user address as key
    localStorage.setItem(`telegram_bot_token_${user.addr}`, botToken);
    
    // Also save to global key for backward compatibility
    localStorage.setItem('telegram_bot_token_default', botToken);
    
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 1500);
  };

  const handleClear = () => {
    localStorage.removeItem(`telegram_bot_token_${user.addr}`);
    localStorage.removeItem('telegram_bot_token_default');
    setBotToken('');
    setTestResult(null);
  };

  return (
    <div className="settings-modal-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>⚙️ Notification Settings</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="settings-body">
          {/* Info Box */}
          <div className="settings-info-box">
            <div className="info-icon">🤖</div>
            <div className="info-content">
              <strong>Setup Your Telegram Bot Token</strong>
              <p>Save your bot token here once, and it will automatically populate when deploying new watchers.</p>
            </div>
          </div>

          {/* How to Get Bot Token */}
          <div className="settings-section">
            <h3>📖 How to Get Bot Token</h3>
            <ol className="instruction-list">
              <li>Open Telegram and search for <code>@BotFather</code></li>
              <li>Send <code>/newbot</code> and follow the instructions</li>
              <li>Choose a name and username for your bot</li>
              <li>Copy the <strong>bot token</strong> provided</li>
              <li>Paste it below and click "Test & Save"</li>
            </ol>
          </div>

          {/* Bot Token Input */}
          <div className="settings-section">
            <label className="settings-label">
              Telegram Bot Token *
              <span className="label-hint">From @BotFather</span>
            </label>
            <input
              type="text"
              className="settings-input"
              placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
              value={botToken}
              onChange={(e) => {
                setBotToken(e.target.value);
                setTestResult(null);
                setSaveSuccess(false);
              }}
              style={{ fontFamily: 'monospace', fontSize: '0.9em' }}
            />
          </div>

          {/* Test Result */}
          {testResult && (
            <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
              <span className="result-icon">{testResult.success ? '✅' : '❌'}</span>
              <span className="result-message">{testResult.message}</span>
              {testResult.botInfo && (
                <div className="bot-info">
                  <div>Bot Name: {testResult.botInfo.name}</div>
                  <div>Bot ID: {testResult.botInfo.id}</div>
                </div>
              )}
            </div>
          )}

          {/* Save Success */}
          {saveSuccess && (
            <div className="save-success">
              ✅ Bot token saved! It will auto-fill when you deploy watchers.
            </div>
          )}

          {/* Tips */}
          <div className="settings-tips">
            <div className="tip-title">💡 Tips:</div>
            <ul>
              <li>Your bot token is stored locally in your browser</li>
              <li>After saving, you won't need to enter it again for new watchers</li>
              <li>You can test the bot connection before saving</li>
              <li>Start a chat with your bot and send <code>/start</code> after deploying a watcher</li>
            </ul>
          </div>
        </div>

        <div className="settings-footer">
          <button className="btn-secondary" onClick={handleClear}>
            Clear Token
          </button>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              className="btn-test" 
              onClick={handleTestBot}
              disabled={!botToken || testingBot}
            >
              {testingBot ? 'Testing...' : '🧪 Test Connection'}
            </button>
            <button 
              className="btn-primary" 
              onClick={handleSave}
              disabled={!botToken || testingBot}
            >
              💾 Save Token
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;

