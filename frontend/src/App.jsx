import React, { useState, useEffect } from 'react';
import * as fcl from '@onflow/fcl';
import SidebarNav from './components/SidebarNav/SidebarNav';
import LoginPage from './pages/LoginPage';
import ActiveWatchersDashboard from './pages/ActiveWatchersDashboard';
import ManageWatchers from './pages/ManageWatchers';
import ActivityLogs from './pages/ActivityLogs';
import Insights from './pages/Insights';
import SettingsModal from './components/Dashboard/SettingsModal';
import './App.css';

function App() {
  const [user, setUser] = useState({ loggedIn: false, addr: null });
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    // Subscribe to FCL user changes
    const unsubscribe = fcl.currentUser.subscribe(setUser);
    return () => unsubscribe();
  }, []);

  const handleNavigate = (pageId) => {
    console.log('🧭 Navigating to:', pageId);
    
    // Special handling for settings
    if (pageId === 'settings') {
      setShowSettings(true);
      return;
    }
    
    // Special handling for 'deploy' action from DashboardOverview
    if (pageId === 'deploy') {
      setCurrentPage('manage');
      return;
    }
    
    setCurrentPage(pageId);
  };

  const handleLoginConnect = (mode) => {
    if (mode === 'guest') {
      console.log('👤 Entering guest mode (read-only)');
      setIsGuestMode(true);
    }
    // If wallet connected, FCL subscription will update user state automatically
  };

  const renderPage = () => {
    console.log('📄 Rendering page:', currentPage);
    
    switch (currentPage) {
      case 'dashboard':
        return <ActiveWatchersDashboard user={user} onNavigate={handleNavigate} />;
      
      case 'manage':
        return <ManageWatchers user={user} />;
      
      case 'logs':
        return <ActivityLogs user={user} />;
      
      case 'insights':
        return <Insights user={user} />;
      
      default:
        return <ActiveWatchersDashboard user={user} onNavigate={handleNavigate} />;
    }
  };

  // Show LoginPage if user is not connected and not in guest mode
  if (!user?.addr && !isGuestMode) {
    return <LoginPage onConnect={handleLoginConnect} />;
  }

  // Show main app
  return (
    <div className="App">
      <SidebarNav currentPage={currentPage} onNavigate={handleNavigate} user={user} />
      <div className="app-content-with-sidebar">
        {renderPage()}
      </div>
      
      {/* Settings Modal */}
      {showSettings && user?.addr && (
        <SettingsModal 
          user={user} 
          onClose={() => setShowSettings(false)} 
        />
      )}
    </div>
  );
}

export default App;
