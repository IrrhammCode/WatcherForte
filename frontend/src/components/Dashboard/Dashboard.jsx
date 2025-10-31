import React, { useState, useEffect } from 'react';
import * as fcl from '@onflow/fcl';
import WatcherTable from './WatcherTable';
import DeployModal from './DeployModal';
import { getWatchersByOwner, getFullWatcherData, parseWatcherData } from '../../services/watcherService';
import './Dashboard.css';

const Dashboard = ({ user }) => {
  const [watchers, setWatchers] = useState([]);
  const [filteredWatchers, setFilteredWatchers] = useState([]);
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [filters, setFilters] = useState({
    active: true,
    limitReached: true,
    failed: true,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch watchers from blockchain
  const fetchWatchers = async () => {
    if (!user?.addr) {
      setWatchers([]);
      setFilteredWatchers([]);
      return;
    }

    setLoading(true);
    try {
      console.log('📊 Fetching watchers for:', user.addr);
      
      // Get all watcher IDs for this owner
      const watcherIDs = await getWatchersByOwner(user.addr);
      
      console.log('Found watcher IDs:', watcherIDs);

      if (!watcherIDs || watcherIDs.length === 0) {
        console.log('No watchers found');
        setWatchers([]);
        setFilteredWatchers([]);
        setLoading(false);
        return;
      }

      // Fetch full data for each watcher
      const watcherPromises = watcherIDs.map(async (id) => {
        try {
          const rawData = await getFullWatcherData(id);
          const parsedData = parseWatcherData(rawData);
          
          if (!parsedData) return null;

          // Calculate next execution (scheduleDelay in hours)
          const nextExecution = new Date(
            Date.now() + parsedData.scheduleDelay * 60 * 60 * 1000
          ).toISOString();

          // Determine template type based on targetAsset
          let templateType = 'Custom Tracker';
          if (parsedData.targetAsset.includes('NBA')) {
            templateType = 'Dapper Tracker';
          } else if (parsedData.targetAsset.includes('NFL')) {
            templateType = 'Dapper Tracker';
          } else if (parsedData.targetAsset.includes('Beezie') || parsedData.targetAsset.includes('ALT')) {
            templateType = 'Beezie Tracker';
          }

          // Determine status
          let status = 'Active';
          if (!parsedData.isActive) {
            status = 'Inactive';
          } else {
            // ✅ FIX: Only check limit if we have a REAL currentPrice (not null/undefined/0/mock)
            const targetAsset = parsedData.targetAsset || localStorage.getItem(`watcher_${id}_targetAsset`) || '';
            const isMockPrice = parsedData.currentPrice === 0.5 && 
                                (targetAsset?.includes('FROTH') || targetAsset?.includes('froth'));
            
            if (parsedData.currentPrice !== null && 
                parsedData.currentPrice !== undefined &&
                !isNaN(parsedData.currentPrice) &&
                parsedData.currentPrice > 0 &&
                !isMockPrice &&
                parsedData.currentPrice > parsedData.priceLimit) {
              status = 'Limit Reached';
            }
          }

          // Format schedule
          const scheduleHours = Math.floor(parsedData.scheduleDelay);
          const schedule = scheduleHours >= 24 
            ? `Every ${Math.floor(scheduleHours / 24)} Day${scheduleHours / 24 > 1 ? 's' : ''}`
            : `Every ${scheduleHours} Hour${scheduleHours > 1 ? 's' : ''}`;

          return {
            id: String(parsedData.id),
            targetAsset: parsedData.targetAsset,
            templateType,
            schedule,
            nextExecution,
            status,
            priceLimit: parsedData.priceLimit,
            currentPrice: parsedData.currentPrice || 0,
            volatilityScore: parsedData.volatilityScore || 0,
            isActive: parsedData.isActive,
          };
        } catch (error) {
          console.error(`Error fetching watcher ${id}:`, error);
          return null;
        }
      });

      const watcherDataArray = await Promise.all(watcherPromises);
      const validWatchers = watcherDataArray.filter((w) => w !== null);

      console.log('✅ Fetched watchers:', validWatchers);

      setWatchers(validWatchers);
      setFilteredWatchers(validWatchers);
    } catch (error) {
      console.error('Error fetching watchers:', error);
      setWatchers([]);
      setFilteredWatchers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWatchers();
  }, [user]);

  // Filter watchers based on status and search
  useEffect(() => {
    let filtered = watchers;

    // Apply status filters
    filtered = filtered.filter((w) => {
      if (w.status === 'Active' && !filters.active) return false;
      if (w.status === 'Limit Reached' && !filters.limitReached) return false;
      if (w.status === 'Failed' && !filters.failed) return false;
      return true;
    });

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (w) =>
          w.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          w.targetAsset.toLowerCase().includes(searchQuery.toLowerCase()) ||
          w.templateType.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredWatchers(filtered);
  }, [watchers, filters, searchQuery]);

  const handleFilterToggle = (filterName) => {
    setFilters((prev) => ({
      ...prev,
      [filterName]: !prev[filterName],
    }));
  };

  const handleDeploySuccess = () => {
    setShowDeployModal(false);
    fetchWatchers();
  };

  return (
    <div className="dashboard-container">

      {/* Control Panel */}
      <div className="control-panel">
        <div className="control-left">
          {/* Wallet Status */}
          {user?.addr ? (
            <div className="wallet-info-compact">
              <span className="wallet-status">●</span>
              <span className="wallet-address">{user.addr.substring(0, 6)}...{user.addr.substring(user.addr.length - 4)}</span>
            </div>
          ) : (
            <button className="btn-connect-compact" onClick={fcl.authenticate}>
              Connect Wallet
            </button>
          )}

          <button 
            className="btn-deploy-new"
            onClick={() => setShowDeployModal(true)}
            disabled={!user?.addr}
          >
            <span className="btn-icon">+</span>
            DEPLOY NEW WATCHER
          </button>

          <div className="filter-tags">
            <span className="filter-label">Filter:</span>
            <button
              className={`filter-tag ${filters.active ? 'active' : ''}`}
              onClick={() => handleFilterToggle('active')}
            >
              Active
            </button>
            <button
              className={`filter-tag ${filters.limitReached ? 'active' : ''}`}
              onClick={() => handleFilterToggle('limitReached')}
            >
              Limit Reached
            </button>
            <button
              className={`filter-tag ${filters.failed ? 'active' : ''}`}
              onClick={() => handleFilterToggle('failed')}
            >
              Failed
            </button>
          </div>
        </div>

        <div className="control-right">
          <div className="search-bar">
            <input
              type="text"
              placeholder="Search by ID, Asset, or Type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <span className="search-icon">🔍</span>
          </div>
        </div>
      </div>

      {/* Main Content - Watcher Table */}
      <div className="main-content">
        {!user?.addr ? (
          <div className="empty-state">
            <div className="empty-icon">🔒</div>
            <h3>Connect Your Wallet</h3>
            <p>Please connect your wallet to view and manage your watchers.</p>
            <button className="btn-connect-large" onClick={fcl.authenticate}>
              Connect Wallet
            </button>
          </div>
        ) : loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading watchers...</p>
          </div>
        ) : filteredWatchers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>No Watchers Deployed Yet</h3>
            <p>Click "Deploy New Watcher" to start monitoring your assets.</p>
            <button className="btn-deploy-empty" onClick={() => setShowDeployModal(true)}>
              + Deploy Your First Watcher
            </button>
          </div>
        ) : (
          <WatcherTable 
            watchers={filteredWatchers}
            onRefresh={fetchWatchers}
          />
        )}
      </div>

      {/* Footer */}
      <footer className="dashboard-footer">
        <div className="footer-links">
          <a href="#" onClick={(e) => e.preventDefault()}>📊 Logs</a>
          <a href="#" onClick={(e) => e.preventDefault()}>⚙️ Settings</a>
          <a href="#" onClick={(e) => e.preventDefault()}>📖 Documentation</a>
        </div>
        <div className="footer-info">
          <span>WatcherForte v1.0</span>
          <span>•</span>
          <span>Flow Blockchain</span>
        </div>
      </footer>

      {/* Deploy Modal */}
      {showDeployModal && (
        <DeployModal
          user={user}
          onClose={() => setShowDeployModal(false)}
          onSuccess={handleDeploySuccess}
        />
      )}
    </div>
  );
};

export default Dashboard;

