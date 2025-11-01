import React, { useState, useEffect } from 'react';
import { getWatchersByOwner, getFullWatcherData, parseWatcherData } from '../services/watcherService';
import WatcherTable from '../components/Dashboard/WatcherTable';
import DeployModal from '../components/Dashboard/DeployModal';
import './ManageWatchers.css';

const ManageWatchers = ({ user }) => {
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
  const [deploymentLogs, setDeploymentLogs] = useState([]);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [selectedWatcher, setSelectedWatcher] = useState(null);
  const [watcherLogs, setWatcherLogs] = useState([]);

  useEffect(() => {
    if (user?.addr) {
      fetchWatchers();
    }
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

  const fetchWatchers = async () => {
    setLoading(true);
    try {
      console.log('📊 Fetching watchers for:', user.addr);
      
      const watcherIDs = await getWatchersByOwner(user.addr);
      console.log('Found watcher IDs:', watcherIDs);

      if (!watcherIDs || watcherIDs.length === 0) {
        setWatchers([]);
        setFilteredWatchers([]);
        setLoading(false);
        return;
      }

      const watcherPromises = watcherIDs.map(async (id) => {
        try {
          const rawData = await getFullWatcherData(id);
          const parsedData = parseWatcherData(rawData);
          
          // 🐛 DEBUG: Log blockchain data for each watcher
          console.log(`🔍 DEBUG - Watcher ${id} from blockchain:`, {
            id: parsedData?.id,
            targetAsset: parsedData?.targetAsset,
            priceLimit: parsedData?.priceLimit,
            currentPrice: parsedData?.currentPrice
          });
          
          if (!parsedData) return null;

          const nextExecution = new Date(
            Date.now() + parsedData.scheduleDelay * 60 * 60 * 1000
          ).toISOString();

          // Get template info from localStorage (more reliable than parsing targetAsset)
          const templateKey = `watcher_${id}_template`;
          let templateType = localStorage.getItem(templateKey);
          
          const iconKey = `watcher_${id}_icon`;
          let templateIcon = localStorage.getItem(iconKey);
          
          // ✅ SMART FALLBACK: Detect template from targetAsset if not in localStorage
          if (!templateType || !templateIcon) {
            const asset = parsedData.targetAsset || '';
            if (asset.includes('FROTH') || asset.includes('KittyPunch') || asset.includes('kittypunch')) {
              templateType = 'KittyPunch $FROTH Tracker';
              templateIcon = '🥊';
            } else if (asset.includes('JUICE') || asset.includes('aiSports') || asset.includes('aisports')) {
              templateType = 'aiSports $JUICE Tracker';
              templateIcon = '🏀';
            } else if (asset.includes('NBA') || asset.includes('TopShot')) {
              templateType = 'NBA Top Shot Insights';
              templateIcon = '🏀';
            } else if (asset.includes('NFL') || asset.includes('AllDay')) {
              templateType = 'NFL ALL DAY Insights';
              templateIcon = '🏈';
            } else if (asset.includes('Disney') || asset.includes('Pinnacle')) {
              templateType = 'Disney Pinnacle Insights';
              templateIcon = '✨';
            } else if (asset.includes('MFL') || asset.includes('MetaverseFootball')) {
              templateType = 'MFL Player Tracker';
              templateIcon = '⚽';
            } else if (asset.includes('Beezie') || asset.includes('ALT')) {
              templateType = 'Beezie Market Value Tracker';
              templateIcon = '🎨';
            } else if (asset.includes('CryptoKitties') || asset.includes('MeowCoin')) {
              templateType = 'CryptoKitties MeowCoins';
              templateIcon = '😺';
            } else {
              templateType = 'Custom Tracker';
              templateIcon = '💎';
            }
          }
          
          // Get watcher name from localStorage
          const nameKey = `watcher_${id}_name`;
          let watcherName = localStorage.getItem(nameKey);
          
          // ✅ SMART FALLBACK: Use template type as name if no custom name
          if (!watcherName) {
            watcherName = templateType;
          }

          // Get transaction ID from localStorage for FlowScan link
          const txIdKey = `watcher_${id}_transactionId`;
          const transactionId = localStorage.getItem(txIdKey);

          // Get metric type from localStorage
          const metricKey = `watcher_${id}_metric`;
          const metric = localStorage.getItem(metricKey) || 'price';
          
          // Get event name and bounty type for proper display
          const eventKey = `watcher_${id}_eventName`;
          const eventName = localStorage.getItem(eventKey);
          
          const bountyKey = `watcher_${id}_bountyType`;
          const bountyType = localStorage.getItem(bountyKey);
          
          // Check if stopped by user
          const stopKey = `watcher_${id}_stopped`;
          let isStopped = localStorage.getItem(stopKey) === 'true';
          
          const targetAsset = parsedData.targetAsset || localStorage.getItem(`watcher_${id}_targetAsset`) || '';
          
          // ✅ CRITICAL FIX: For ALL templates (not just FROTH), check if stopped flag is false positive
          // If watcher was never stopped manually (no WatcherStopped log), remove stopped flag
          if (isStopped) {
            const stoppedLogKey = `watcher_${id}_logs`;
            const logs = JSON.parse(localStorage.getItem(stoppedLogKey) || '[]');
            const hasBeenStoppedManually = logs.some(log => log.type === 'WatcherStopped');
            
            if (!hasBeenStoppedManually) {
              // ✅ CRITICAL: Watcher was never stopped manually - this is a false positive
              // Remove stopped flag for ALL templates (JUICE, NBA, NFL, etc), not just FROTH
              console.log(`🔄 Auto-resuming Watcher #${id} (${targetAsset}) - was never stopped manually, removing stopped flag`);
              localStorage.removeItem(stopKey); // Remove stopped flag
              isStopped = false; // Mark as not stopped
            } else {
              // User stopped it manually - keep stopped
              console.log(`ℹ️ Watcher #${id} (${targetAsset}) was stopped manually - keeping stopped (user control)`);
            }
          }
          
          // ✅ FROTH-specific auto-resume (for mock price 0.5)
          if (isStopped && (targetAsset?.includes('FROTH') || targetAsset?.includes('froth'))) {
            const blockchainPrice = parsedData.currentPrice !== undefined && parsedData.currentPrice !== null
              ? parseFloat(parsedData.currentPrice)
              : null;
            
            // Only auto-resume if price is 0.5 (mock) and never stopped manually
            if (blockchainPrice === 0.5) {
              const stoppedLogKey = `watcher_${id}_logs`;
              const logs = JSON.parse(localStorage.getItem(stoppedLogKey) || '[]');
              const hasBeenStoppedManually = logs.some(log => log.type === 'WatcherStopped');
              
              if (!hasBeenStoppedManually) {
                console.log(`🔄 Auto-resuming FROTH Watcher #${id} - was stopped due to false mock price limit (0.5), never stopped manually`);
                localStorage.removeItem(stopKey); // Remove stopped flag
                isStopped = false; // Mark as not stopped
              }
            }
          }
          
          let status = 'Active';
          if (isStopped) {
            status = 'Stopped';
          } else if (!parsedData.isActive) {
            // ✅ CRITICAL FIX: isActive = false doesn't always mean Inactive
            // In Flow blockchain, watcher might have isActive=false temporarily between executions
            // We should check actual conditions, not just isActive flag
            
            // Check if condition was actually met
            let conditionMet = false;
            
            if (metric === 'price') {
              // targetAsset already declared above, reuse it
              const blockchainPrice = parsedData.currentPrice !== undefined && parsedData.currentPrice !== null
                ? parseFloat(parsedData.currentPrice)
                : null;
              
              // ✅ CRITICAL: For ALL templates (JUICE, NBA, NFL, etc), validate price before checking condition
              // Similar to FROTH logic - don't stop if price is invalid
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
                console.log(`✅ Watcher #${id} (${targetAsset}): Valid price check - condition met: $${blockchainPrice} > $${parsedData.priceLimit}`);
              } else if (!isValidPrice) {
                console.log(`ℹ️ Watcher #${id} (${targetAsset}): Price invalid (${blockchainPrice}) - condition not met yet, keeping Active`);
              } else {
                console.log(`ℹ️ Watcher #${id} (${targetAsset}): Price $${blockchainPrice} within limit $${parsedData.priceLimit} - condition not met`);
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
              console.log(`🚨 Watcher #${id} condition met - setting Limit Reached`);
            } else {
              // Condition not met, but isActive = false
              // This is likely a temporary state - watcher is waiting for next execution
              // Keep as Active to allow monitoring to continue
              status = 'Active';
              console.log(`ℹ️ Watcher #${id} isActive=false but condition not met - keeping Active (waiting for next execution)`);
            }
          } else {
            // parsedData.isActive = true - watcher is active, check conditions
            // ✅ CRITICAL: For FROTH, don't use blockchain price 0.5 for limit check
            // targetAsset already declared above, reuse it
            const blockchainPrice = parsedData.currentPrice !== undefined && parsedData.currentPrice !== null
              ? parseFloat(parsedData.currentPrice)
              : null;
            
            const isFrothMockPrice = (targetAsset?.includes('FROTH') || targetAsset?.includes('froth')) &&
                                    blockchainPrice === 0.5;
            
            // ✅ CRITICAL: For ALL price watchers, check if we should use blockchain price or wait for API
            // FROTH has mock price 0.5, but other templates might have invalid prices too (0, null, etc)
            // Always prefer API price over blockchain price for accurate limit checks
            
            const shouldUseBlockchainPrice = blockchainPrice !== null && 
                                           blockchainPrice !== undefined &&
                                           !isNaN(blockchainPrice) &&
                                           blockchainPrice > 0 &&
                                           !isFrothMockPrice; // Skip mock price for FROTH
            
            if (metric === 'price') {
              if (shouldUseBlockchainPrice && blockchainPrice > parsedData.priceLimit) {
                status = 'Limit Reached';
                console.log(`🚨 Price limit reached: $${blockchainPrice} > $${parsedData.priceLimit}`);
              } else if (isFrothMockPrice) {
                console.log(`⏳ FROTH Watcher #${id}: Skipping limit check, waiting for real price from API (blockchain shows mock: 0.5)`);
              } else if (!shouldUseBlockchainPrice) {
                // Price is invalid (0, null, NaN) - wait for API price, keep Active
                console.log(`⏳ Watcher #${id} (${targetAsset}): Blockchain price invalid (${blockchainPrice}), waiting for API price - keeping Active`);
              }
              // If price is valid and within limit, status remains Active (default)
            }
            // For transaction and event, we keep status as Active (no automatic limit check)
          }

          const scheduleHours = Math.floor(parsedData.scheduleDelay);
          const schedule = scheduleHours >= 24 
            ? `Every ${Math.floor(scheduleHours / 24)} Day${scheduleHours / 24 > 1 ? 's' : ''}`
            : `Every ${scheduleHours} Hour${scheduleHours > 1 ? 's' : ''}`;

          // ✅ DEBUG: Log status determination for JUICE (targetAsset already declared above)
          if (targetAsset?.includes('JUICE') || targetAsset?.includes('juice')) {
            console.log(`🔍 JUICE Watcher #${id} initial status determination:`, {
              status,
              isStopped,
              isActive: parsedData.isActive,
              blockchainPrice: parsedData.currentPrice,
              priceLimit: parsedData.priceLimit,
              metric
            });
          }

          return {
            id: String(parsedData.id),
            watcherName, // Include watcher name
            targetAsset: parsedData.targetAsset,
            templateType,
            templateIcon, // Include template icon
            schedule,
            nextExecution,
            status,
            priceLimit: parsedData.priceLimit,
            // ✅ CRITICAL: For FROTH, don't display blockchain price 0.5 (mock)
            // Set to null and wait for real price from API
            currentPrice: (() => {
              const blockchainPrice = parsedData.currentPrice !== undefined && parsedData.currentPrice !== null
                ? parseFloat(parsedData.currentPrice)
                : null;
              
              // If it's FROTH and price is 0.5 (mock), return null (wait for API)
              if ((targetAsset?.includes('FROTH') || targetAsset?.includes('froth')) && blockchainPrice === 0.5) {
                return null; // Don't use mock price, wait for API
              }
              
              return blockchainPrice || null;
            })(),
            volatilityScore: parsedData.volatilityScore || 0,
            isActive: parsedData.isActive,
            metric, // Include metric type
            eventName, // Include event name
            bountyType, // Include bounty type
            isStopped,
            transactionId // Include transaction ID for FlowScan link
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
      
      // ✅ FETCH PRICES FROM API after watchers are loaded
      if (validWatchers.length > 0) {
        setTimeout(() => {
          console.log(`💰 Starting price fetch for ${validWatchers.length} watchers in ManageWatchers...`);
          fetchPricesFromAPI(validWatchers);
        }, 100);
      }
    } catch (error) {
      console.error('Error fetching watchers:', error);
      setWatchers([]);
      setFilteredWatchers([]);
    } finally {
      setLoading(false);
    }
  };
  
  // ✅ FETCH REAL PRICES FROM API (same as ActiveWatchersDashboard)
  const fetchPricesFromAPI = async (watchersList) => {
    console.log('💰 Fetching prices from APIs (ManageWatchers)...');
    
    const updatedWatchers = await Promise.all(
      watchersList.map(async (watcher) => {
        try {
          let price = null;
          
          // Check asset type and fetch from appropriate API
          if (watcher.targetAsset?.includes('FROTH') || watcher.targetAsset?.includes('froth')) {
            const frothTokenAddress = '0xb73bf8e6a4477a952e0338e6cc00cc0ce5ad04ba';
            try {
              const response = await fetch(`https://api.geckoterminal.com/api/v2/networks/flow-evm/tokens/${frothTokenAddress}`);
              
              if (!response.ok) {
                console.warn(`⚠️ GeckoTerminal API failed: ${response.status}`);
                throw new Error(`API returned ${response.status}`);
              }
              
              const data = await response.json();
              const attrs = data?.data?.attributes || {};
              const rawPrice = attrs.price_usd;
              
              if (rawPrice !== undefined && rawPrice !== null && rawPrice !== '') {
                price = parseFloat(rawPrice);
                
                if (isNaN(price) || price <= 0 || price > 1000000) {
                  console.warn(`⚠️ Invalid FROTH price from API: ${price} (raw: ${rawPrice})`);
                  price = null;
                } else {
                  console.log(`✅ FROTH price from GeckoTerminal: $${price.toFixed(6)} USD (Watcher #${watcher.id})`);
                }
              } else {
                console.warn(`⚠️ No price_usd field in GeckoTerminal response`);
                price = null;
              }
            } catch (error) {
              console.error(`❌ Failed to fetch FROTH price:`, error.message);
              price = null;
            }
          } else if (watcher.targetAsset?.includes('JUICE') || watcher.targetAsset?.includes('juice')) {
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
                    price = null;
                  }
                } else {
                  price = null;
                }
              } else {
                price = null;
              }
            } catch (error) {
              console.error(`❌ Failed to fetch JUICE price:`, error.message);
              price = null;
            }
          }
          
          // ✅ CRITICAL: Check if watcher is stopped BEFORE checking price
          const stopKey = `watcher_${watcher.id}_stopped`;
          const isStopped = localStorage.getItem(stopKey) === 'true';
          
          // ✅ CRITICAL FIX: If price fetch failed BUT watcher is not stopped, keep status as Active
          // Don't let failed API calls change status to Stopped
          // This applies to ALL templates (JUICE, NBA, NFL, etc), not just FROTH
          if (price === null || price === undefined || isNaN(price) || price <= 0) {
            // Price fetch failed or invalid
            if (!isStopped) {
              // Watcher is NOT stopped by user - keep it Active even if price fetch failed
              console.log(`ℹ️ Watcher #${watcher.id} (${watcher.targetAsset}): Price fetch failed/invalid, but not stopped - keeping Active`);
              return {
                ...watcher,
                // Don't update currentPrice if fetch failed
                status: 'Active', // ✅ FORCE Active if not stopped (don't use watcher.status which might be Stopped from previous state)
                isStopped: false // ✅ Ensure isStopped is false
              };
            } else {
              // User stopped it - keep stopped
              console.log(`⏸️ Watcher #${watcher.id} (${watcher.targetAsset}): User stopped, keeping Stopped`);
              return {
                ...watcher,
                status: 'Stopped',
                isStopped: true
              };
            }
          }
          
          // ✅ Update watcher with REAL price from API
          if (price !== null && price !== undefined && !isNaN(price) && price > 0) {
            const exceedsLimit = price > watcher.priceLimit;
            
            console.log(`✅ Updating watcher #${watcher.id} with REAL price: $${price.toFixed(6)} (limit: $${watcher.priceLimit.toFixed(2)})`);
            
            // ✅ CRITICAL: Always respect stopped flag - don't change status if user manually stopped
            // ✅ IMPORTANT: If isStopped = false, FORCE Active (don't keep previous Stopped status)
            let newStatus;
            
            if (isStopped) {
              // User stopped it - keep it stopped
              newStatus = 'Stopped';
              console.log(`⏸️ Watcher #${watcher.id} (${watcher.targetAsset}) is stopped manually - keeping Stopped (price: $${price.toFixed(6)})`);
            } else {
              // ✅ CRITICAL: If NOT stopped, ALWAYS set to Active or Limit Reached (never Stopped)
              // Don't use watcher.status which might be "Stopped" from previous state
              if (exceedsLimit) {
                newStatus = 'Limit Reached';
                console.log(`🚨 Watcher #${watcher.id} (${watcher.targetAsset}): Price $${price.toFixed(6)} exceeds limit $${watcher.priceLimit.toFixed(2)} - setting Limit Reached`);
              } else {
                newStatus = 'Active';
                console.log(`✅ Watcher #${watcher.id} (${watcher.targetAsset}): Price $${price.toFixed(6)} within limit $${watcher.priceLimit.toFixed(2)} - setting Active`);
              }
            }
            
            console.log(`📊 Watcher #${watcher.id} status update: ${newStatus} (price: $${price.toFixed(6)}, limit: $${watcher.priceLimit.toFixed(2)}, wasStopped: ${isStopped})`);
            
            return {
              ...watcher,
              currentPrice: price, // ✅ REAL price from API
              status: newStatus,
              isStopped: isStopped
            };
          }
          
          // Fallback: if we somehow reach here, return watcher unchanged
          return watcher;
        } catch (error) {
          console.error(`❌ Failed to fetch price for ${watcher.targetAsset}:`, error);
          return watcher;
        }
      })
    );
    
    // ✅ CRITICAL: Update watchers state with real prices AND ensure status is correct
    setWatchers(prev => {
      const updated = prev.map(w => {
        const updatedWatcher = updatedWatchers.find(uw => uw.id === w.id);
        if (updatedWatcher) {
          // ✅ DEBUG: Log status changes for JUICE
          if (updatedWatcher.targetAsset?.includes('JUICE') || updatedWatcher.targetAsset?.includes('juice')) {
            console.log(`🔍 JUICE Watcher #${updatedWatcher.id} status update:`, {
              oldStatus: w.status,
              newStatus: updatedWatcher.status,
              isStopped: updatedWatcher.isStopped,
              currentPrice: updatedWatcher.currentPrice,
              priceLimit: updatedWatcher.priceLimit
            });
          }
          return updatedWatcher;
        }
        return w;
      });
      return updated;
    });
    
    // Also update filtered watchers
    setFilteredWatchers(updatedWatchers);
  };

  const handleFilterToggle = (filterName) => {
    setFilters((prev) => ({
      ...prev,
      [filterName]: !prev[filterName],
    }));
  };

  const handleDeploySuccess = () => {
    setShowDeployModal(false);
    
    // Add to deployment logs
    const newLog = {
      id: Date.now(),
      message: 'New watcher deployed successfully',
      timestamp: new Date().toISOString(),
      type: 'success'
    };
    setDeploymentLogs(prev => [newLog, ...prev].slice(0, 10));
    
    // Refresh watcher list
    fetchWatchers();
  };

  // Stop/Pause watcher
  const handleStopWatcher = async (watcherId) => {
    if (!window.confirm(`Stop watcher #${watcherId}? It will no longer send notifications.`)) {
      return;
    }

    try {
      // Save stopped status to localStorage
      const stopKey = `watcher_${watcherId}_stopped`;
      localStorage.setItem(stopKey, 'true');
      
      // ✅ Call Telegram API to stop notifications
      try {
        const response = await fetch(`http://localhost:3001/api/telegram/watcher/${watcherId}/stop`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          console.log(`✅ Telegram bot notifications stopped for watcher ${watcherId}`);
        } else {
          console.warn(`⚠️  Failed to stop Telegram notifications for watcher ${watcherId}`);
        }
      } catch (telegramError) {
        console.warn('⚠️  Telegram API not available:', telegramError.message);
        // Continue anyway - watcher is stopped locally
      }
      
      // Add log
      const logKey = `watcher_${watcherId}_logs`;
      const existingLogs = JSON.parse(localStorage.getItem(logKey) || '[]');
      const newLog = {
        id: Date.now(),
        type: 'WatcherStopped',
        message: `Watcher #${watcherId} stopped by user`,
        timestamp: new Date().toISOString(),
        metric: localStorage.getItem(`watcher_${watcherId}_metric`) || 'price'
      };
      localStorage.setItem(logKey, JSON.stringify([newLog, ...existingLogs].slice(0, 50)));
      
      // ✅ Update state immediately without refresh (to prevent auto-resume from overriding)
      setWatchers(prev => prev.map(w => 
        w.id === String(watcherId) ? { ...w, isStopped: true, status: 'Stopped' } : w
      ));
      setFilteredWatchers(prev => prev.map(w => 
        w.id === String(watcherId) ? { ...w, isStopped: true, status: 'Stopped' } : w
      ));
      
      // ✅ CRITICAL: Don't call fetchWatchers() after stop - it will trigger auto-resume
      // State is already updated above, and fetchPricesFromAPI will continue to update prices
      // without changing the stopped status
      
      alert(`✅ Watcher #${watcherId} stopped successfully!`);
    } catch (error) {
      console.error('Error stopping watcher:', error);
      alert('❌ Failed to stop watcher. Please try again.');
    }
  };

  // Resume watcher
  const handleResumeWatcher = async (watcherId) => {
    if (!window.confirm(`Resume watcher #${watcherId}? It will start sending notifications again.`)) {
      return;
    }

    try {
      // Remove stopped status from localStorage
      const stopKey = `watcher_${watcherId}_stopped`;
      localStorage.removeItem(stopKey);
      
      // ✅ Call Telegram API to resume notifications
      try {
        const response = await fetch(`http://localhost:3001/api/telegram/watcher/${watcherId}/resume`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          console.log(`✅ Telegram bot notifications resumed for watcher ${watcherId}`);
        } else {
          console.warn(`⚠️  Failed to resume Telegram notifications for watcher ${watcherId}`);
        }
      } catch (telegramError) {
        console.warn('⚠️  Telegram API not available:', telegramError.message);
        // Continue anyway - watcher is resumed locally
      }
      
      // Add log
      const logKey = `watcher_${watcherId}_logs`;
      const existingLogs = JSON.parse(localStorage.getItem(logKey) || '[]');
      const newLog = {
        id: Date.now(),
        type: 'WatcherResumed',
        message: `Watcher #${watcherId} resumed by user`,
        timestamp: new Date().toISOString(),
        metric: localStorage.getItem(`watcher_${watcherId}_metric`) || 'price'
      };
      localStorage.setItem(logKey, JSON.stringify([newLog, ...existingLogs].slice(0, 50)));
      
      // ✅ Update state immediately
      setWatchers(prev => prev.map(w => {
        if (w.id === String(watcherId)) {
          // Determine status based on current price and limit
          const newStatus = (w.currentPrice && w.priceLimit && w.currentPrice > w.priceLimit) 
            ? 'Limit Reached' 
            : 'Active';
          return { ...w, isStopped: false, status: newStatus };
        }
        return w;
      }));
      setFilteredWatchers(prev => prev.map(w => {
        if (w.id === String(watcherId)) {
          const newStatus = (w.currentPrice && w.priceLimit && w.currentPrice > w.priceLimit) 
            ? 'Limit Reached' 
            : 'Active';
          return { ...w, isStopped: false, status: newStatus };
        }
        return w;
      }));
      
      // ✅ CRITICAL: Don't call fetchWatchers() after resume - state is already updated
      // fetchPricesFromAPI will continue to update prices and respect the resumed status
      
      alert(`✅ Watcher #${watcherId} resumed successfully!`);
    } catch (error) {
      console.error('Error resuming watcher:', error);
      alert('❌ Failed to resume watcher. Please try again.');
    }
  };

  // View watcher logs
  const handleViewLogs = (watcherId) => {
    setSelectedWatcher(watcherId);
    
    // Fetch logs from localStorage
    const logKey = `watcher_${watcherId}_logs`;
    const logs = JSON.parse(localStorage.getItem(logKey) || '[]');
    
    // If no logs yet, create some sample logs
    if (logs.length === 0) {
      const metric = localStorage.getItem(`watcher_${watcherId}_metric`) || 'price';
      const sampleLogs = [
        {
          id: Date.now(),
          type: 'WatcherDeployed',
          message: `Watcher #${watcherId} deployed`,
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          metric: metric
        },
        {
          id: Date.now() + 1,
          type: metric === 'price' ? 'PriceUpdate' : metric === 'transaction' ? 'VolumeCheck' : 'EventWatch',
          message: metric === 'price' ? 'Price monitored' : metric === 'transaction' ? 'Volume checked' : 'Events monitored',
          timestamp: new Date(Date.now() - 1800000).toISOString(),
          metric: metric
        }
      ];
      setWatcherLogs(sampleLogs);
    } else {
      setWatcherLogs(logs);
    }
    
    setShowLogsModal(true);
  };

  // Add notification log (for Telegram integration)
  const addNotificationLog = (watcherId, notificationType, message) => {
    const logKey = `watcher_${watcherId}_logs`;
    const existingLogs = JSON.parse(localStorage.getItem(logKey) || '[]');
    const metric = localStorage.getItem(`watcher_${watcherId}_metric`) || 'price';
    
    const newLog = {
      id: Date.now(),
      type: notificationType,
      message: message,
      timestamp: new Date().toISOString(),
      metric: metric,
      sent: true
    };
    
    localStorage.setItem(logKey, JSON.stringify([newLog, ...existingLogs].slice(0, 50)));
  };

  return (
    <div style={{
      padding: 'var(--spacing-xl)',
      background: 'var(--bg-primary)',
      minHeight: 'calc(100vh - 64px)'
    }}>
      {/* Header */}
      <div style={{
        marginBottom: 'var(--spacing-xl)'
      }}>
        <h1 style={{
          fontSize: '1.75rem',
          fontWeight: 600,
          color: 'var(--text-primary)',
          marginBottom: 'var(--spacing-xs)',
          letterSpacing: '-0.03em',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-sm)'
        }}>
          <span>⚙️</span> Manage Watchers
        </h1>
        <p style={{
          fontSize: '0.875rem',
          color: 'var(--text-muted)',
          margin: 0
        }}>
          Detailed management and control of all your watchers
        </p>
      </div>

      {/* Control Panel */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 'var(--spacing-lg) var(--spacing-xl)',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        marginBottom: 'var(--spacing-xl)',
        flexWrap: 'wrap',
        gap: 'var(--spacing-lg)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-xl)',
          flexWrap: 'wrap'
        }}>
          <button 
            onClick={() => setShowDeployModal(true)}
            disabled={!user?.addr}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              background: 'var(--accent-gold)',
              color: 'var(--bg-primary)',
              border: 'none',
              borderRadius: '24px',
              cursor: user?.addr ? 'pointer' : 'not-allowed',
              fontSize: '0.875rem',
              fontWeight: 600,
              letterSpacing: '-0.01em',
              boxShadow: 'var(--shadow-md)',
              transition: 'all var(--transition-base)',
              opacity: user?.addr ? 1 : 0.5
            }}
          >
            <span style={{ fontSize: '1.125rem', fontWeight: 400 }}>+</span>
            DEPLOY NEW WATCHER
          </button>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-sm)'
          }}>
            <span style={{
              fontSize: '0.813rem',
              color: 'var(--text-muted)',
              fontWeight: 500,
              marginRight: 'var(--spacing-sm)'
            }}>
              Filter:
            </span>
            {[
              { key: 'active', label: 'Active' },
              { key: 'limitReached', label: 'Limit Reached' },
              { key: 'failed', label: 'Failed' }
            ].map(filter => (
              <button
                key={filter.key}
                onClick={() => handleFilterToggle(filter.key)}
                style={{
                  padding: '0.5rem 1rem',
                  background: filters[filter.key] ? 'rgba(176, 141, 87, 0.15)' : 'transparent',
                  color: filters[filter.key] ? 'var(--accent-gold)' : 'var(--text-muted)',
                  border: '1px solid',
                  borderColor: filters[filter.key] ? 'var(--accent-gold)' : 'var(--border-primary)',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  letterSpacing: '-0.01em',
                  transition: 'all var(--transition-base)'
                }}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center'
        }}>
          <input
            type="text"
            placeholder="Search by ID, Asset, or Type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '300px',
              padding: '0.625rem 2.5rem 0.625rem 1rem',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-primary)',
              borderRadius: '24px',
              color: 'var(--text-primary)',
              fontSize: '0.875rem',
              transition: 'all var(--transition-base)'
            }}
          />
          <span style={{
            position: 'absolute',
            right: '1rem',
            fontSize: '0.875rem',
            color: 'var(--text-dim)',
            pointerEvents: 'none'
          }}>
            🔍
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: deploymentLogs.length > 0 ? '1fr 300px' : '1fr',
        gap: 'var(--spacing-lg)'
      }}>
        {/* Watcher Table */}
        <div style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--spacing-2xl)',
          minHeight: '400px'
        }}>
          {!user?.addr ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 'var(--spacing-2xl)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '4rem', marginBottom: 'var(--spacing-lg)' }}>🔒</div>
              <h3 style={{
                fontSize: '1.25rem',
                color: 'var(--text-primary)',
                marginBottom: 'var(--spacing-sm)'
              }}>
                Connect Your Wallet
              </h3>
              <p style={{
                fontSize: '0.875rem',
                color: 'var(--text-muted)',
                margin: 0
              }}>
                Please connect your wallet to view and manage your watchers.
              </p>
            </div>
          ) : loading ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 'var(--spacing-2xl)'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                border: '2px solid var(--border-primary)',
                borderTopColor: 'var(--accent-gold)',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              <p style={{
                marginTop: 'var(--spacing-lg)',
                color: 'var(--text-muted)',
                fontSize: '0.875rem'
              }}>
                Loading watchers...
              </p>
            </div>
          ) : filteredWatchers.length === 0 ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 'var(--spacing-2xl)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '4rem', marginBottom: 'var(--spacing-lg)' }}>📭</div>
              <h3 style={{
                fontSize: '1.25rem',
                color: 'var(--text-primary)',
                marginBottom: 'var(--spacing-sm)'
              }}>
                No Watchers Found
              </h3>
              <p style={{
                fontSize: '0.875rem',
                color: 'var(--text-muted)',
                marginBottom: 'var(--spacing-xl)',
                maxWidth: '400px'
              }}>
                {searchQuery || !filters.active || !filters.limitReached || !filters.failed
                  ? 'No watchers match your current filters. Try adjusting your search or filters.'
                  : 'You haven\'t deployed any watchers yet. Click "Deploy New Watcher" to get started.'}
              </p>
              <button
                onClick={() => setShowDeployModal(true)}
                style={{
                  padding: '0.875rem 2rem',
                  background: 'var(--accent-gold)',
                  color: 'var(--bg-primary)',
                  border: 'none',
                  borderRadius: '24px',
                  cursor: 'pointer',
                  fontSize: '0.938rem',
                  fontWeight: 600,
                  boxShadow: 'var(--shadow-md)',
                  transition: 'all var(--transition-base)'
                }}
              >
                + Deploy Your First Watcher
              </button>
            </div>
          ) : (
            <WatcherTable 
              watchers={filteredWatchers}
              onRefresh={fetchWatchers}
              onStop={handleStopWatcher}
              onResume={handleResumeWatcher}
              onViewLogs={handleViewLogs}
            />
          )}
        </div>

        {/* Deployment Logs Panel (Side) */}
        {deploymentLogs.length > 0 && (
          <div style={{
            padding: 'var(--spacing-lg)',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            maxHeight: '600px',
            overflowY: 'auto'
          }}>
            <h3 style={{
              fontSize: '1rem',
              color: 'var(--text-primary)',
              marginBottom: 'var(--spacing-md)',
              fontWeight: 600
            }}>
              📝 Deployment Logs
            </h3>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--spacing-sm)'
            }}>
              {deploymentLogs.map(log => (
                <div
                  key={log.id}
                  style={{
                    padding: 'var(--spacing-sm)',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderLeft: '3px solid var(--accent-gold)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.75rem'
                  }}
                >
                  <div style={{ color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                    {log.message}
                  </div>
                  <div style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Deploy Modal */}
      {showDeployModal && (
        <DeployModal
          user={user}
          onClose={() => setShowDeployModal(false)}
          onSuccess={handleDeploySuccess}
        />
      )}

      {/* Logs Modal */}
      {showLogsModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 'var(--spacing-lg)'
        }}
        onClick={() => setShowLogsModal(false)}
        >
          <div style={{
            background: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--spacing-xl)',
            maxWidth: '800px',
            width: '100%',
            maxHeight: '80vh',
            overflow: 'auto',
            border: '1px solid var(--border-primary)'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 'var(--spacing-lg)',
              paddingBottom: 'var(--spacing-md)',
              borderBottom: '1px solid var(--border-subtle)'
            }}>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                margin: 0
              }}>
                📜 Notification Logs - Watcher #{selectedWatcher}
              </h3>
              <button
                onClick={() => setShowLogsModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  lineHeight: 1
                }}
              >
                ×
              </button>
            </div>

            {/* Logs List */}
            {watcherLogs.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: 'var(--spacing-2xl)',
                color: 'var(--text-muted)'
              }}>
                No notifications sent yet
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                {watcherLogs.map((log) => (
                  <div
                    key={log.id}
                    style={{
                      padding: 'var(--spacing-md)',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      borderLeft: `3px solid ${
                        log.metric === 'price' ? 'var(--status-success)' 
                        : log.metric === 'transaction' ? 'var(--status-info)'
                        : 'var(--status-warning)'
                      }`
                    }}
                  >
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      marginBottom: 'var(--spacing-xs)'
                    }}>
                      <span style={{ 
                        fontSize: '0.875rem', 
                        fontWeight: 600,
                        color: 'var(--text-primary)'
                      }}>
                        {log.message}
                      </span>
                      <span style={{ 
                        fontSize: '0.75rem', 
                        color: 'var(--text-dim)',
                        fontFamily: 'var(--font-mono)'
                      }}>
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--spacing-xs)', alignItems: 'center' }}>
                      <div style={{
                        display: 'inline-block',
                        padding: '0.25rem 0.625rem',
                        background: 'rgba(176, 141, 87, 0.1)',
                        color: 'var(--accent-gold)',
                        borderRadius: '12px',
                        fontSize: '0.688rem',
                        fontWeight: 600
                      }}>
                        {log.type}
                      </div>
                      {log.metric && (
                        <div style={{
                          display: 'inline-block',
                          padding: '0.25rem 0.625rem',
                          background: log.metric === 'price' ? 'rgba(16, 185, 129, 0.1)' 
                            : log.metric === 'transaction' ? 'rgba(59, 130, 246, 0.1)'
                            : 'rgba(245, 158, 11, 0.1)',
                          color: log.metric === 'price' ? 'var(--status-success)' 
                            : log.metric === 'transaction' ? 'var(--status-info)'
                            : 'var(--status-warning)',
                          borderRadius: '12px',
                          fontSize: '0.688rem',
                          fontWeight: 600
                        }}>
                          {log.metric === 'price' ? '💰' : log.metric === 'transaction' ? '📊' : '🎮'} {log.metric.toUpperCase()}
                        </div>
                      )}
                      {log.sent && (
                        <div style={{
                          display: 'inline-block',
                          padding: '0.25rem 0.625rem',
                          background: 'rgba(16, 185, 129, 0.1)',
                          color: 'var(--status-success)',
                          borderRadius: '12px',
                          fontSize: '0.688rem',
                          fontWeight: 600
                        }}>
                          ✓ Sent to Telegram
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Footer */}
            <div style={{
              marginTop: 'var(--spacing-lg)',
              paddingTop: 'var(--spacing-md)',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{
                fontSize: '0.813rem',
                color: 'var(--text-muted)'
              }}>
                Showing last {watcherLogs.length} notifications
              </span>
              <button
                onClick={() => setShowLogsModal(false)}
                style={{
                  padding: '0.5rem 1.5rem',
                  background: 'var(--accent-gold)',
                  color: 'var(--bg-primary)',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all var(--transition-base)'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageWatchers;

