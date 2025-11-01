/**
 * ActiveWatchersDashboard.jsx
 * 
 * Main dashboard page showing all active watchers in a card grid
 * Features: Category filters, real-time status, uptime tracking
 */

import React, { useState, useEffect } from 'react';
import { getWatchersByOwner, getFullWatcherData, parseWatcherData } from '../services/watcherService';
import WatcherCard from '../components/Dashboard/WatcherCard';
import './ActiveWatchersDashboard.css';

const ActiveWatchersDashboard = ({ user, onNavigate }) => {
  const [watchers, setWatchers] = useState([]);
  const [filteredWatchers, setFilteredWatchers] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    paused: 0,
    alerts: 0
  });
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedWatcher, setSelectedWatcher] = useState(null);
  const [watcherLogs, setWatcherLogs] = useState([]);

  // Category definitions
  const categories = [
    { id: 'all', label: 'All Watchers', icon: '📊' },
    { id: 'dapper', label: 'Dapper', icon: '🏈' },
    { id: 'aisports', label: 'aiSports', icon: '🏀' },
    { id: 'kittypunch', label: 'KittyPunch', icon: '🥊' },
    { id: 'mfl', label: 'MFL', icon: '⚽' },
    { id: 'beezie', label: 'Beezie', icon: '🎨' },
    { id: 'custom', label: 'Custom', icon: '💎' }
  ];

  // ✅ FETCH REAL PRICES FROM API
  const fetchPricesFromAPI = async (watchersList) => {
    console.log('💰 Fetching prices from APIs...');
    
    const updatedWatchers = await Promise.all(
      watchersList.map(async (watcher) => {
        try {
          let price = null;
          
          // Check asset type and fetch from appropriate API
          if (watcher.targetAsset.includes('FROTH') || watcher.targetAsset.includes('froth')) {
            // ✅ FIX: Use correct GeckoTerminal endpoint (token address, not pool)
            const frothTokenAddress = '0xb73bf8e6a4477a952e0338e6cc00cc0ce5ad04ba';
            try {
              const response = await fetch(`https://api.geckoterminal.com/api/v2/networks/flow-evm/tokens/${frothTokenAddress}`);
              
              if (!response.ok) {
                console.warn(`⚠️ GeckoTerminal API failed: ${response.status}`);
                throw new Error(`API returned ${response.status}`);
              }
              
              const data = await response.json();
              
              // ✅ DEBUG: Log full response structure for debugging
              console.log(`🔍 GeckoTerminal API Response for FROTH:`, {
                hasData: !!data.data,
                hasAttributes: !!data.data?.attributes,
                keys: data.data ? Object.keys(data.data).slice(0, 10) : [],
                attrsKeys: data.data?.attributes ? Object.keys(data.data.attributes).slice(0, 10) : [],
                rawResponse: JSON.stringify(data).substring(0, 500)
              });
              
              const attrs = data?.data?.attributes || {};
              const rawPrice = attrs.price_usd;
              
              console.log(`🔍 Raw price_usd value:`, rawPrice, `(type: ${typeof rawPrice})`);
              
              if (rawPrice !== undefined && rawPrice !== null && rawPrice !== '') {
                price = parseFloat(rawPrice);
                
                // ✅ VALIDATION: Only accept if price is valid and reasonable
                if (isNaN(price) || price <= 0 || price > 1000000) { // Sanity check: price should be between 0 and 1M
                  console.warn(`⚠️ Invalid FROTH price from API: ${price} (raw: ${rawPrice})`);
                  price = null; // Don't use invalid price
                } else {
                  console.log(`✅ FROTH price from GeckoTerminal: $${price.toFixed(6)} USD (Watcher #${watcher.id})`);
                }
              } else {
                console.warn(`⚠️ No price_usd field in GeckoTerminal response`);
                console.warn(`   Available fields:`, attrs ? Object.keys(attrs).slice(0, 10) : 'none');
                console.warn(`   Full attributes:`, JSON.stringify(attrs, null, 2).substring(0, 300));
                price = null;
              }
            } catch (error) {
              console.error(`❌ Failed to fetch FROTH price:`, error.message);
              price = null; // Don't use fallback - better to show no price than wrong price
            }
          } else if (watcher.targetAsset.includes('JUICE') || watcher.targetAsset.includes('juice')) {
            // Fetch JUICE price from Find Labs API (public endpoint, no auth needed)
            try {
              const response = await fetch('https://api.find.xyz/tokens/flow/juice/price');
              if (response.ok) {
                const data = await response.json();
                const rawPrice = data?.data?.price_usd || data?.data?.priceUSD;
                if (rawPrice !== undefined && rawPrice !== null) {
                  price = parseFloat(rawPrice);
                  if (!isNaN(price) && price > 0) {
                    console.log(`✅ JUICE price: $${price.toFixed(6)}`);
                  } else {
                    console.warn(`⚠️ Invalid JUICE price: ${price}`);
                    price = null;
                  }
                } else {
                  price = null;
                }
              } else {
                console.warn(`⚠️ JUICE API failed: ${response.status}`);
                price = null;
              }
            } catch (error) {
              console.error(`❌ Failed to fetch JUICE price:`, error.message);
              price = null;
            }
          }
          
          // ✅ CRITICAL FIX: Only update watcher with REAL price (never use default/fallback values)
          // If price fetch fails, DON'T update currentPrice - let it remain undefined/null
          // This prevents watcher from stopping due to incorrect default price (like 0.5)
          if (price !== null && price !== undefined && !isNaN(price) && price > 0) {
            // ✅ LOG: Save price check
            const logEntry = {
              timestamp: Date.now(),
              type: 'check',
              message: `📊 Price check: $${price.toFixed(4)} (Target: $${watcher.priceLimit})`,
              data: { price, limit: watcher.priceLimit }
            };
            saveLogEntry(watcher.id, logEntry);
            
            console.log(`✅ Updating watcher #${watcher.id} with REAL price from API: $${price.toFixed(6)} (replacing blockchain mock)`);
            
            // ✅ CRITICAL: Check if watcher is stopped manually - respect user's stop action
            const stopKey = `watcher_${watcher.id}_stopped`;
            const isStopped = localStorage.getItem(stopKey) === 'true';
            
            // ✅ IMPORTANT: Now that we have REAL price from API, check limit
            const exceedsLimit = price > watcher.priceLimit;
            
            // ✅ CRITICAL: Always respect stopped flag - don't change status if user manually stopped
            let newStatus = watcher.status; // Keep current status by default
            
            if (isStopped) {
              // User stopped it - keep it stopped
              newStatus = 'Stopped';
              console.log(`⏸️ Watcher #${watcher.id} is stopped manually - keeping Stopped (price: $${price.toFixed(6)})`);
            } else {
              // Not stopped - determine status based on real price from API
              if (exceedsLimit) {
                newStatus = 'Limit Reached';
                console.log(`🚨 Watcher #${watcher.id}: Real price $${price.toFixed(6)} exceeds limit $${watcher.priceLimit.toFixed(2)} - will update status to Limit Reached`);
              } else {
                newStatus = 'Active';
                console.log(`✅ Watcher #${watcher.id}: Real price $${price.toFixed(6)} is within limit $${watcher.priceLimit.toFixed(2)} - keeping Active`);
              }
            }
            
            return {
              ...watcher,
              currentPrice: price, // ✅ REAL price from API (always override blockchain mock)
              currentValue: `$${price.toFixed(4)}`,
              conditionMet: exceedsLimit,
              status: newStatus, // ✅ Respect stopped flag
              isStopped: isStopped
            };
          }
          
          return watcher;
        } catch (error) {
          console.error(`❌ Failed to fetch price for ${watcher.targetAsset}:`, error);
          return watcher;
        }
      })
    );
    
    // ✅ After updating prices, also update status for watchers where price exceeds limit
    // Note: Status should already be updated in fetchPricesFromAPI, but we do a final check here
    // ✅ CRITICAL: Always respect stopped flag in final check
    const finalWatchers = updatedWatchers.map(watcher => {
      // ✅ CRITICAL: Check if watcher is stopped manually - don't change status if stopped
      const stopKey = `watcher_${watcher.id}_stopped`;
      const isStopped = localStorage.getItem(stopKey) === 'true';
      
      if (isStopped) {
        // User stopped it - keep it stopped, don't change status
        return {
          ...watcher,
          status: 'Stopped',
          isStopped: true
        };
      }
      
      // If price from API exceeds limit, ensure status is "Limit Reached"
      if (watcher.currentPrice !== null && 
          watcher.currentPrice !== undefined &&
          !isNaN(watcher.currentPrice) &&
          watcher.currentPrice > 0 &&
          watcher.priceLimit > 0 &&
          watcher.currentPrice > watcher.priceLimit &&
          watcher.metric === 'price') {
        // Only update if status is not already "Limit Reached"
        if (watcher.status !== 'Limit Reached') {
          console.log(`🚨 Watcher #${watcher.id}: Final check - Price $${watcher.currentPrice.toFixed(6)} exceeds limit $${watcher.priceLimit.toFixed(2)}, updating status to Limit Reached`);
          return {
            ...watcher,
            status: 'Limit Reached',
            conditionMet: true
          };
        }
      } else if (watcher.currentPrice !== null && 
                 watcher.currentPrice !== undefined &&
                 !isNaN(watcher.currentPrice) &&
                 watcher.currentPrice > 0 &&
                 watcher.priceLimit > 0 &&
                 watcher.currentPrice <= watcher.priceLimit &&
                 watcher.metric === 'price' &&
                 watcher.status === 'Limit Reached') {
        // If price is now within limit, revert status to Active
        console.log(`✅ Watcher #${watcher.id}: Price $${watcher.currentPrice.toFixed(6)} is now within limit $${watcher.priceLimit.toFixed(2)}, reverting to Active`);
        return {
          ...watcher,
          status: 'Active',
          conditionMet: false
        };
      }
      return watcher;
    });
    
    setWatchers(finalWatchers);
    updateStats(finalWatchers);
  };

  useEffect(() => {
    if (user?.addr) {
      fetchWatchers();
    }
  }, [user]);
  
  // ✅ AUTO-REFRESH: Fetch prices every 10 seconds
  useEffect(() => {
    if (watchers.length > 0) {
      const priceRefreshInterval = setInterval(() => {
        console.log('🔄 Auto-refreshing prices...');
        fetchPricesFromAPI(watchers);
      }, 10000); // 10 seconds
      
      return () => clearInterval(priceRefreshInterval);
    }
  }, [watchers]);

  useEffect(() => {
    applyFilter();
  }, [watchers, activeFilter]);

  const fetchWatchers = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching watchers for user:', user.addr);
      
      const watcherIds = await getWatchersByOwner(user.addr);
      console.log('📊 Found watcher IDs:', watcherIds);
      
      if (watcherIds.length === 0) {
        console.log('⚠️  No watchers found');
        setWatchers([]);
        setLoading(false);
        return;
      }
      
      const watchersData = await Promise.all(
        watcherIds.map(async (id) => {
          try {
            console.log(`📥 Fetching data for watcher #${id}...`);
            const fullData = await getFullWatcherData(id);
            console.log(`✅ Got data for watcher #${id}:`, fullData);
            
            // Get stored metadata
            const templateType = localStorage.getItem(`watcher_${id}_templateType`) || localStorage.getItem(`watcher_${id}_template`) || 'Custom Tracker';
            const templateIcon = localStorage.getItem(`watcher_${id}_templateIcon`) || localStorage.getItem(`watcher_${id}_icon`) || '📊';
            const templateId = localStorage.getItem(`watcher_${id}_templateId`) || null;
            const templateName = localStorage.getItem(`watcher_${id}_templateName`) || templateType;
            const watcherName = localStorage.getItem(`watcher_${id}_name`) || templateName;
            const metric = localStorage.getItem(`watcher_${id}_metric`) || 'price';
            const eventName = localStorage.getItem(`watcher_${id}_eventName`);
            const bountyType = localStorage.getItem(`watcher_${id}_bountyType`);
            
            // ✅ LOAD TARGET ASSET from localStorage (for price fetching)
            const storedTargetAsset = localStorage.getItem(`watcher_${id}_targetAsset`);
            const targetAsset = storedTargetAsset || parsedData.targetAsset || 'Unknown';
            console.log(`📊 Watcher #${id} targetAsset: ${targetAsset}`);
            
            // Determine category
            let category = 'custom';
            if (bountyType === 'aisports' || templateType.includes('aiSports')) {
              category = 'aisports';
            } else if (bountyType === 'kittypunch' || templateType.includes('KittyPunch')) {
              category = 'kittypunch';
            } else if (bountyType === 'dapper-insights' || templateType.includes('NBA') || 
                       templateType.includes('NFL') || templateType.includes('Disney') || 
                       templateType.includes('CryptoKitties') || templateType.includes('Dapper')) {
              category = 'dapper';
            } else if (bountyType === 'mfl' || templateType.includes('MFL')) {
              category = 'mfl';
            } else if (bountyType === 'beezie' || templateType.includes('Beezie')) {
              category = 'beezie';
            }
            
            // Get watcher status from blockchain
            // ✅ Pass entire fullData object (includes watcherData, priceHistory, etc)
            const parsedData = parseWatcherData(fullData);
            
            // ✅ NULL CHECK: Skip if parsing failed
            if (!parsedData) {
              console.warn(`⚠️  Failed to parse watcher #${id}, skipping...`);
              return null;
            }
            
            // ✅ SAME LOGIC AS ManageWatchers.jsx
            const stopKey = `watcher_${id}_stopped`;
            const isStopped = localStorage.getItem(stopKey) === 'true';
            
            // Determine status (EXACT same logic as ManageWatchers)
            let status = 'Active';
            if (isStopped) {
              status = 'Stopped';
            } else if (!parsedData.isActive) {
              // ✅ CRITICAL FIX: Same logic as ManageWatchers - isActive = false doesn't mean Inactive
              // Check actual conditions, not just isActive flag
              
              let conditionMet = false;
              
              if (metric === 'price') {
                const targetAsset = parsedData.targetAsset || localStorage.getItem(`watcher_${id}_targetAsset`) || '';
                const blockchainPrice = parsedData.currentPrice !== undefined && parsedData.currentPrice !== null
                  ? parseFloat(parsedData.currentPrice)
                  : null;
                
                // ✅ CRITICAL: For ALL templates, validate price before checking condition
                // Same logic as ManageWatchers - don't stop if price is invalid
                const isFrothMockPrice = (targetAsset?.includes('FROTH') || targetAsset?.includes('froth')) &&
                                        blockchainPrice === 0.5;
                const isValidPrice = blockchainPrice !== null && 
                                   blockchainPrice !== undefined &&
                                   !isNaN(blockchainPrice) &&
                                   blockchainPrice > 0 &&
                                   !isFrothMockPrice;
                
                // Only set conditionMet if we have VALID price that exceeds limit
                if (isValidPrice && blockchainPrice > parsedData.priceLimit) {
                  conditionMet = true;
                }
              } else {
                // For transaction/event metrics, check logs
                const logKey = `watcher_${id}_logs`;
                const logs = JSON.parse(localStorage.getItem(logKey) || '[]');
                conditionMet = logs.some(log => 
                  log.type === 'AlertTriggered' || 
                  log.type === 'alert' ||
                  log.message?.includes('ALERT') ||
                  log.message?.includes('Condition Met')
                );
              }
              
              if (conditionMet) {
                status = 'Limit Reached';
              } else {
                // Condition not met - keep Active (waiting for next execution)
                status = 'Active';
              }
            } else {
              // ✅ CRITICAL: For FROTH, don't use blockchain price 0.5 for limit check
              // Wait for real price from API first
              const blockchainPrice = parsedData.currentPrice !== undefined && parsedData.currentPrice !== null
                ? parseFloat(parsedData.currentPrice)
                : null;
              
              // If it's FROTH and price is 0.5 (mock from blockchain), skip limit check
              // Wait for real price from API instead
              const isFrothMockPrice = (targetAsset?.includes('FROTH') || targetAsset?.includes('froth')) &&
                                      blockchainPrice === 0.5;
              
              if (metric === 'price' && 
                  blockchainPrice !== null && 
                  blockchainPrice !== undefined &&
                  !isNaN(blockchainPrice) &&
                  blockchainPrice > 0 &&
                  !isFrothMockPrice && // Don't check limit with mock price 0.5
                  blockchainPrice > parsedData.priceLimit) {
                status = 'Limit Reached';
                console.log(`🚨 Price limit reached: $${blockchainPrice} > $${parsedData.priceLimit}`);
              } else if (isFrothMockPrice) {
                console.log(`⏳ FROTH Watcher #${id}: Skipping limit check, waiting for real price from API (blockchain shows mock: 0.5)`);
              } else if (metric === 'event') {
                // ✅ CHECK EVENT CONDITION: Check if event was triggered
                const logKey = `watcher_${id}_logs`;
                const logs = JSON.parse(localStorage.getItem(logKey) || '[]');
                const hasAlertTriggered = logs.some(log => 
                  log.type === 'AlertTriggered' || 
                  log.type === 'alert' ||
                  log.message?.includes('ALERT') ||
                  log.message?.includes('Condition Met')
                );
                
                if (hasAlertTriggered) {
                  status = 'Limit Reached';
                  console.log(`🚨 Watcher #${id} condition met! (Event alert detected)`);
                }
              } else if (metric === 'transaction') {
                // ✅ CHECK TRANSACTION VOLUME CONDITION
                const logKey = `watcher_${id}_logs`;
                const logs = JSON.parse(localStorage.getItem(logKey) || '[]');
                const hasAlertTriggered = logs.some(log => 
                  log.type === 'AlertTriggered' || 
                  log.type === 'alert'
                );
                
                if (hasAlertTriggered) {
                  status = 'Limit Reached';
                  console.log(`🚨 Watcher #${id} condition met! (Volume alert detected)`);
                }
              }
            }
            
            // ✅ FILTER: Only show Active and Limit Reached watchers on dashboard
            if (status !== 'Active' && status !== 'Limit Reached') {
              console.log(`⏭️  Skipping watcher #${id} - Status: ${status}`);
              return null;
            }
            
            // ✅ FIX UPTIME: Get real deployment timestamp from localStorage or use recent fallback
            const deployTimestampKey = `watcher_${id}_deployTime`;
            let deploymentTimestamp = localStorage.getItem(deployTimestampKey);
            
            if (!deploymentTimestamp) {
              // If not in localStorage, use blockchain timestamp or recent fallback (7 days ago)
              deploymentTimestamp = fullData.watcherData?.deploymentTimestamp || (Date.now() / 1000 - 604800);
              // Save to localStorage for future
              localStorage.setItem(deployTimestampKey, deploymentTimestamp);
            } else {
              deploymentTimestamp = parseFloat(deploymentTimestamp);
            }
            
            // Get current value (will be updated by API fetch later)
            let currentValue = `Tracking ${targetAsset}...`;
            
            return {
              id,
              watcherName,
              templateType,
              templateIcon,
              templateId, // ✅ Add templateId for CryptoKitties detection
              templateName, // ✅ Add templateName for proper naming
              metric,
              eventName,
              bountyType,
              category,
              status,
              targetAsset, // ✅ Use loaded targetAsset from localStorage
              priceLimit: parsedData.priceLimit || 0,
              limit: parsedData.priceLimit || parsedData.limit || 0,
              scheduleDelay: parsedData.scheduleDelay || 24,
              isActive: parsedData.isActive !== false,
              deploymentTimestamp,
              currentValue,
              lastPrice: parsedData.lastPrice || parsedData.currentPrice || null,
            // ✅ CRITICAL: For FROTH, don't display blockchain price 0.5 (mock)
            // Set to null and wait for real price from API
            currentPrice: (() => {
              const blockchainPrice = parsedData.currentPrice !== undefined && parsedData.currentPrice !== null 
                ? parseFloat(parsedData.currentPrice) 
                : null;
              
              // If it's FROTH and price is 0.5 (mock), return null (wait for API)
              if ((targetAsset?.includes('FROTH') || targetAsset?.includes('froth')) && blockchainPrice === 0.5) {
                console.log(`⚠️ FROTH Watcher #${id}: Ignoring blockchain mock price 0.5, will use API price instead`);
                return null;
              }
              
              return blockchainPrice;
            })(),
              isStopped: false, // Always false on Active Dashboard (stopped ones are filtered out)
              conditionMet: status === 'Limit Reached'
            };
          } catch (watcherError) {
            console.error(`❌ Error fetching watcher #${id}:`, watcherError);
            return null; // Skip this watcher if error
          }
        })
      );
      
      // Filter out null values (failed fetches)
      const validWatchers = watchersData.filter(w => w !== null);
      console.log(`✅ Successfully loaded ${validWatchers.length} watchers`);
      
      setWatchers(validWatchers);
      updateStats(validWatchers);
      setLoading(false);
      
      // ✅ FETCH PRICES FROM API (with delay to ensure state is set)
      // Use setTimeout to ensure watchers state is updated first
      setTimeout(() => {
        console.log(`💰 Starting price fetch for ${validWatchers.length} watchers...`);
        fetchPricesFromAPI(validWatchers);
      }, 100); // Small delay to ensure state update
    } catch (error) {
      console.error('❌ Failed to fetch watchers:', error);
      setLoading(false);
    }
  };

  const updateStats = (watchersData) => {
    const total = watchersData.length;
    const active = watchersData.filter(w => !w.isStopped && w.isActive).length;
    const paused = watchersData.filter(w => w.isStopped).length;
    const alerts = watchersData.filter(w => w.conditionMet).length;
    
    setStats({ total, active, paused, alerts });
  };

  const applyFilter = () => {
    if (activeFilter === 'all') {
      setFilteredWatchers(watchers);
    } else {
      setFilteredWatchers(watchers.filter(w => w.category === activeFilter));
    }
  };

  const handleStopWatcher = async (watcherId) => {
    try {
      // ✅ LOG: Save stop event
      const logEntry = {
        timestamp: Date.now(),
        type: 'stop',
        message: `⏸️ Watcher paused by user`
      };
      saveLogEntry(watcherId, logEntry);
      
      const response = await fetch(`http://localhost:3001/api/telegram/watcher/${watcherId}/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        // ✅ Update state immediately
        setWatchers(prev => prev.map(w => 
          w.id === watcherId ? { ...w, isStopped: true, status: 'Stopped' } : w
        ));
        localStorage.setItem(`watcher_${watcherId}_stopped`, 'true');
        console.log(`✅ Watcher #${watcherId} stopped successfully`);
      } else {
        console.error(`❌ Failed to stop watcher #${watcherId}: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to stop watcher:', error);
    }
  };

  const handleResumeWatcher = async (watcherId) => {
    try {
      const response = await fetch(`http://localhost:3001/api/telegram/watcher/${watcherId}/resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        // ✅ Update state immediately
        setWatchers(prev => prev.map(w => {
          if (w.id === watcherId) {
            // Determine status based on current price and limit
            const newStatus = (w.currentPrice && w.priceLimit && w.currentPrice > w.priceLimit) 
              ? 'Limit Reached' 
              : 'Active';
            return { ...w, isStopped: false, status: newStatus };
          }
          return w;
        }));
        localStorage.removeItem(`watcher_${watcherId}_stopped`); // Remove instead of set to false
        console.log(`✅ Watcher #${watcherId} resumed successfully`);
      } else {
        console.error(`❌ Failed to resume watcher #${watcherId}: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to resume watcher:', error);
    }
  };

  // ✅ LOG MANAGEMENT FUNCTIONS
  const saveLogEntry = (watcherId, logEntry) => {
    const logsKey = `watcher_${watcherId}_logs`;
    const existingLogs = JSON.parse(localStorage.getItem(logsKey) || '[]');
    existingLogs.push(logEntry);
    // Keep only last 100 logs
    const trimmedLogs = existingLogs.slice(-100);
    localStorage.setItem(logsKey, JSON.stringify(trimmedLogs));
  };
  
  const getWatcherLogs = (watcherId) => {
    const logsKey = `watcher_${watcherId}_logs`;
    return JSON.parse(localStorage.getItem(logsKey) || '[]');
  };
  
  const handleViewDetails = async (watcherId) => {
    const watcher = watchers.find(w => w.id === watcherId);
    setSelectedWatcher(watcher);
    
    // Load logs from localStorage (frontend actions: deploy, stop, price checks)
    const localLogs = getWatcherLogs(watcherId);
    
    // ✅ Fetch logs from backend (Telegram notifications)
    try {
      const response = await fetch(`http://localhost:3001/api/telegram/watcher/${watcherId}/logs`);
      const data = await response.json();
      const backendLogs = data.logs || [];
      
      // Merge and sort by timestamp
      const allLogs = [...localLogs, ...backendLogs].sort((a, b) => a.timestamp - b.timestamp);
      setWatcherLogs(allLogs);
    } catch (error) {
      console.error('Failed to fetch backend logs:', error);
      // Use only local logs if backend fetch fails
      setWatcherLogs(localLogs);
    }
    
    setShowDetailsModal(true);
  };
  
  const handleCloseDetails = () => {
    setShowDetailsModal(false);
    setSelectedWatcher(null);
    setWatcherLogs([]);
  };

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-header">
          <h1>🏠 Active Watchers</h1>
        </div>
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading your watchers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      {/* Header */}
      <div className="dashboard-header">
        <div className="dashboard-title">
          <h1>🏠 Active Watchers Dashboard</h1>
          <p>Monitor all your blockchain watchers in real-time</p>
        </div>
        
        <button 
          className="deploy-new-btn"
          onClick={() => onNavigate('manage')}
        >
          ➕ Deploy New Watcher
        </button>
      </div>

      {/* Stats Overview */}
      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Watchers</div>
          </div>
        </div>
        
        <div className="stat-card active">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-value">{stats.active}</div>
            <div className="stat-label">Active</div>
          </div>
        </div>
        
        <div className="stat-card paused">
          <div className="stat-icon">⏸️</div>
          <div className="stat-content">
            <div className="stat-value">{stats.paused}</div>
            <div className="stat-label">Paused</div>
          </div>
        </div>
        
        <div className="stat-card alerts">
          <div className="stat-icon">🚨</div>
          <div className="stat-content">
            <div className="stat-value">{stats.alerts}</div>
            <div className="stat-label">Alerts</div>
          </div>
        </div>
      </div>

      {/* Category Filters */}
      <div className="category-filters">
        {categories.map(category => (
          <button
            key={category.id}
            className={`filter-btn ${activeFilter === category.id ? 'active' : ''}`}
            onClick={() => setActiveFilter(category.id)}
          >
            <span className="filter-icon">{category.icon}</span>
            <span className="filter-label">{category.label}</span>
            <span className="filter-count">
              {category.id === 'all' 
                ? watchers.length 
                : watchers.filter(w => w.category === category.id).length}
            </span>
          </button>
        ))}
      </div>

      {/* Watchers Grid */}
      {filteredWatchers.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <h3>No Watchers Found</h3>
          <p>
            {activeFilter === 'all' 
              ? "You haven't deployed any watchers yet." 
              : `No ${activeFilter} watchers found.`}
          </p>
          <button 
            className="deploy-new-btn"
            onClick={() => onNavigate('manage')}
          >
            ➕ Deploy Your First Watcher
          </button>
        </div>
      ) : (
        <div className="watchers-grid">
          {filteredWatchers.map(watcher => (
            <WatcherCard
              key={watcher.id}
              watcher={watcher}
              onStop={handleStopWatcher}
              onResume={handleResumeWatcher}
              onViewDetails={handleViewDetails}
            />
          ))}
        </div>
      )}
      
      {/* ✅ DETAILS MODAL */}
      {showDetailsModal && selectedWatcher && (
        <div className="modal-overlay" onClick={handleCloseDetails}>
          <div className="modal-content details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <span className="watcher-icon">{selectedWatcher.templateIcon}</span>
                {selectedWatcher.watcherName || `Watcher #${selectedWatcher.id}`}
              </h2>
              <button className="close-btn" onClick={handleCloseDetails}>✕</button>
            </div>
            
            <div className="modal-body">
              {/* Watcher Info */}
              <div className="watcher-info-section">
                <h3>📊 Watcher Information</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">ID:</span>
                    <span className="info-value">{selectedWatcher.id}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Asset:</span>
                    <span className="info-value">{selectedWatcher.targetAsset}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Metric:</span>
                    <span className="info-value">{selectedWatcher.metric}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Target:</span>
                    <span className="info-value">{selectedWatcher.priceLimit}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Current:</span>
                    <span className="info-value">{selectedWatcher.currentValue}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Status:</span>
                    <span className={`info-value status-${selectedWatcher.status?.toLowerCase()}`}>
                      {selectedWatcher.status}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Activity Logs */}
              <div className="logs-section">
                <h3>📜 Activity Log</h3>
                <div className="logs-container">
                  {watcherLogs.length === 0 ? (
                    <div className="empty-logs">
                      <p>No activity logs yet. Logs will appear as your watcher runs.</p>
                    </div>
                  ) : (
                    <div className="logs-list">
                      {watcherLogs.slice().reverse().map((log, index) => (
                        <div key={index} className={`log-entry log-${log.type}`}>
                          <div className="log-time">
                            {new Date(log.timestamp).toLocaleString()}
                          </div>
                          <div className="log-message">{log.message}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button className="btn-secondary" onClick={handleCloseDetails}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActiveWatchersDashboard;

