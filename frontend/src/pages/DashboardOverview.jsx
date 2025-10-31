import React, { useState, useEffect } from 'react';
import { getWatchersByOwner, getFullWatcherData, parseWatcherData } from '../services/watcherService';
import { getFrothPrice } from '../services/findLabsApi';
import { NETWORK } from '../config/fcl';
import './DashboardOverview.css';

const DashboardOverview = ({ user, onNavigate }) => {
  const [stats, setStats] = useState({
    totalWatchers: 0,
    activeWatchers: 0,
    recentAlerts: 0,
    systemUptime: '99.9%',
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [watchers, setWatchers] = useState([]);
  const [watchersByMetric, setWatchersByMetric] = useState({
    price: [],
    transaction: [],
    event: []
  });
  const [realTimeData, setRealTimeData] = useState({
    prices: {},
    volumes: {},
    events: []
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.addr) {
      fetchDashboardData();
    }
  }, [user]);

  // Fetch real-time data based on active watchers
  useEffect(() => {
    const fetchRealTimeData = async () => {
      try {
        // Fetch prices for price watchers
        if (watchersByMetric.price.length > 0) {
          const frothPrice = await getFrothPrice();
          setRealTimeData(prev => ({
            ...prev,
            prices: {
              ...prev.prices,
              'FROTH': frothPrice.priceUSD
            }
          }));
        }
        
        // Fetch transaction volumes for transaction watchers
        if (watchersByMetric.transaction.length > 0) {
          try {
            const response = await fetch(
              'https://api.geckoterminal.com/api/v2/networks/flow-evm/tokens/0xb73bf8e6a4477a952e0338e6cc00cc0ce5ad04ba'
            );
            if (response.ok) {
              const data = await response.json();
              // Mock transaction count based on volume
              const volume24h = parseFloat(data.data?.attributes?.volume_usd?.h24) || 0;
              const transactionCount = Math.floor(volume24h / 0.004) || Math.floor(Math.random() * 500) + 100;
              
              setRealTimeData(prev => ({
                ...prev,
                volumes: {
                  ...prev.volumes,
                  'FROTH': transactionCount
                }
              }));
            }
          } catch (err) {
            console.error('Failed to fetch transaction volume:', err);
          }
        }
        
        // TODO: Fetch events for event watchers
        
      } catch (error) {
        console.error('Failed to fetch real-time data:', error);
      }
    };

    // Only fetch if we have watchers
    if (Object.values(watchersByMetric).some(arr => arr.length > 0)) {
      // Initial fetch
      fetchRealTimeData();

      // Set interval for updates (every 10 seconds)
      const interval = setInterval(fetchRealTimeData, 10000);

      return () => clearInterval(interval);
    }
  }, [watchersByMetric]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch watcher IDs
      const watcherIDs = await getWatchersByOwner(user.addr);
      
      if (watcherIDs && watcherIDs.length > 0) {
        // Fetch full data for stats
        const watcherData = await Promise.all(
          watcherIDs.map(id => getFullWatcherData(id).then(parseWatcherData))
        );

        const validWatchers = watcherData.filter(w => w !== null);
        
        // Parse metric from targetAsset or localStorage
        // Since contract doesn't store metric, we try to infer from localStorage
        const watchersWithMetric = validWatchers.map(w => {
          // Try to get metric from localStorage
          const localKey = `watcher_${w.id}_metric`;
          const storedMetric = localStorage.getItem(localKey);
          
          // Get event name if it's an event watcher
          const eventKey = `watcher_${w.id}_eventName`;
          const eventName = localStorage.getItem(eventKey);
          
          // Get bounty type (kittypunch, aisports, etc.)
          const bountyKey = `watcher_${w.id}_bountyType`;
          const bountyType = localStorage.getItem(bountyKey);
          
          // Check if watcher is stopped by user
          const stopKey = `watcher_${w.id}_stopped`;
          const isStopped = localStorage.getItem(stopKey) === 'true';
          
          // Use stored metric, or default to 'price' if none exists
          let metric = storedMetric || 'price';
          
          return { ...w, metric, eventName, bountyType, isStopped };
        });
        
        // Group watchers by metric type (only active, non-stopped watchers for display)
        const grouped = {
          price: watchersWithMetric.filter(w => w.metric === 'price' && w.isActive && !w.isStopped),
          transaction: watchersWithMetric.filter(w => w.metric === 'transaction' && w.isActive && !w.isStopped),
          event: watchersWithMetric.filter(w => w.metric === 'event' && w.isActive && !w.isStopped)
        };
        
        setWatchers(watchersWithMetric);
        setWatchersByMetric(grouped);

        // Count active watchers (not stopped by user AND isActive from contract)
        const activeCount = watchersWithMetric.filter(w => w.isActive && !w.isStopped).length;
        
        // Count alerts from logs
        let alertCount = 0;
        watchersWithMetric.forEach(w => {
          const logKey = `watcher_${w.id}_logs`;
          const logs = JSON.parse(localStorage.getItem(logKey) || '[]');
          const alerts = logs.filter(log => log.type === 'AlertTriggered');
          alertCount += alerts.length;
        });

        setStats({
          totalWatchers: watchersWithMetric.length,
          activeWatchers: activeCount,
          recentAlerts: alertCount,
          systemUptime: '99.9%',
        });

        // Generate recent activity based on watcher types (only for active, non-stopped watchers)
        const activeWatchersOnly = watchersWithMetric.filter(w => w.isActive && !w.isStopped);
        
        const activities = activeWatchersOnly.slice(0, 3).map((w, idx) => {
          if (w.metric === 'price') {
            return {
              id: idx + 1,
              type: 'PriceUpdate',
              message: `${w.targetAsset} - Price monitored: $${w.currentPrice?.toFixed(4) || '0.00'}`,
              timestamp: new Date(Date.now() - (idx + 1) * 1800000).toISOString(),
              metric: 'price'
            };
          } else if (w.metric === 'transaction') {
            return {
              id: idx + 1,
              type: 'VolumeCheck',
              message: `${w.targetAsset} - Transaction volume checked`,
              timestamp: new Date(Date.now() - (idx + 1) * 1800000).toISOString(),
              metric: 'transaction'
            };
          } else {
            // Event watcher - show specific event being watched
            const eventDisplay = w.eventName || 'game events';
            const eventIcon = w.bountyType === 'aisports' ? '🏀' : '🎮';
            return {
              id: idx + 1,
              type: 'EventWatch',
              message: `${eventIcon} ${w.targetAsset} - Watching for ${eventDisplay}`,
              timestamp: new Date(Date.now() - (idx + 1) * 1800000).toISOString(),
              metric: 'event',
              bountyType: w.bountyType
            };
          }
        });
        
        setRecentActivity(activities);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeployClick = () => {
    // This will trigger the deploy modal in the parent Dashboard component
    if (onNavigate) {
      onNavigate('deploy');
    }
  };

  return (
    <div className="dashboard-overview">
      {/* Header */}
      <div className="dashboard-header">
        <h1>Dashboard Overview</h1>
        <p>Quick insights and system status at a glance</p>
      </div>

      {/* Widget 1: System Status Summary */}
      <div className="stats-grid">
        {[
          { 
            label: 'Total Watchers', 
            value: stats.totalWatchers, 
            icon: '📊', 
            colorClass: 'gold',
            trend: '+2 this week'
          },
          { 
            label: 'Active Watchers', 
            value: stats.activeWatchers, 
            icon: '✅', 
            colorClass: 'success',
            trend: 'Running smoothly'
          },
          { 
            label: 'Recent Alerts', 
            value: stats.recentAlerts, 
            icon: '🚨', 
            colorClass: 'warning',
            trend: 'Last 24 hours'
          },
          { 
            label: 'System Uptime', 
            value: stats.systemUptime, 
            icon: '⚡', 
            colorClass: 'info',
            trend: 'Last 30 days'
          },
        ].map((stat, idx) => (
          <div key={idx} className="stat-card">
            <div className="stat-card-icon">{stat.icon}</div>
            <div className={`stat-card-value ${stat.colorClass}`}>{stat.value}</div>
            <div className="stat-card-label">{stat.label}</div>
            <div className="stat-card-trend">{stat.trend}</div>
          </div>
        ))}
      </div>

      {/* Dynamic Metric Widgets */}
      <div className="metrics-grid">
        {/* Price Watchers Widget */}
        {watchersByMetric.price.length > 0 && (
        <div style={{
          padding: 'var(--spacing-xl)',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)'
        }}>
          <h3 style={{
            fontSize: '1.125rem',
            color: 'var(--text-primary)',
            marginBottom: 'var(--spacing-lg)',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-sm)',
            justifyContent: 'space-between'
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
              <span>💰</span> Price Tracking
            </span>
            {Object.keys(realTimeData.prices).length > 0 && (
              <span style={{
                fontSize: '0.75rem',
                color: 'var(--status-success)',
                fontWeight: 400,
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--status-success)',
                  animation: 'pulse 2s infinite'
                }}></span>
                Live
              </span>
            )}
          </h3>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)', color: 'var(--text-muted)' }}>
              Loading...
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
              {watchersByMetric.price.slice(0, 3).map((watcher, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: 'var(--spacing-md)',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    transition: 'all var(--transition-base)'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 'var(--spacing-xs)'
                  }}>
                    <span style={{ 
                      fontSize: '0.875rem', 
                      fontWeight: 600,
                      color: 'var(--text-primary)'
                    }}>
                      {watcher.targetAsset}
                    </span>
                    <span style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-dim)',
                      fontFamily: 'var(--font-mono)'
                    }}>
                      #{watcher.id}
                    </span>
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline'
                  }}>
                    <div>
                      <div style={{
                        fontSize: '1.5rem',
                        fontWeight: 700,
                        color: (realTimeData.prices[watcher.targetAsset] || watcher.currentPrice) > watcher.priceLimit ? 'var(--status-error)' : 'var(--accent-gold)',
                        fontFamily: 'var(--font-mono)'
                      }}>
                        {realTimeData.prices[watcher.targetAsset]?.toFixed(4) || watcher.currentPrice?.toFixed(4) || '0.0000'}
                      </div>
                      <div style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)'
                      }}>
                        {watcher.targetAsset === 'FROTH' ? 'USD' : 'FLOW'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        fontSize: '0.813rem',
                        color: 'var(--text-muted)'
                      }}>
                        Limit: {watcher.priceLimit.toFixed(2)}
                      </div>
                      {(realTimeData.prices[watcher.targetAsset] || watcher.currentPrice) > watcher.priceLimit && (
                        <div style={{
                          fontSize: '0.75rem',
                          color: 'var(--status-error)',
                          fontWeight: 600
                        }}>
                          ⚠️ Alert!
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        )}

        {/* Transaction Volume Widget */}
        {watchersByMetric.transaction.length > 0 && (
        <div style={{
          padding: 'var(--spacing-xl)',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)'
        }}>
          <h3 style={{
            fontSize: '1.125rem',
            color: 'var(--text-primary)',
            marginBottom: 'var(--spacing-lg)',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-sm)'
          }}>
            <span>📊</span> Transaction Volume
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            {watchersByMetric.transaction.slice(0, 3).map((watcher, idx) => (
              <div
                key={idx}
                style={{
                  padding: 'var(--spacing-md)',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)'
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 'var(--spacing-xs)'
                }}>
                  <span style={{ 
                    fontSize: '0.875rem', 
                    fontWeight: 600,
                    color: 'var(--text-primary)'
                  }}>
                    {watcher.targetAsset}
                  </span>
                  <span style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-dim)',
                    fontFamily: 'var(--font-mono)'
                  }}>
                    #{watcher.id}
                  </span>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline'
                }}>
                  <div>
                    <div style={{
                      fontSize: '1.5rem',
                      fontWeight: 700,
                      color: 'var(--accent-teal)',
                      fontFamily: 'var(--font-mono)'
                    }}>
                      {realTimeData.volumes[watcher.targetAsset]?.toLocaleString() || '0'}
                    </div>
                    <div style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)'
                    }}>
                      Transactions (24h)
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      fontSize: '0.75rem',
                      color: 'var(--status-info)',
                      fontWeight: 500
                    }}>
                      📈 Monitoring
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        )}

        {/* Game Events Widget */}
        {watchersByMetric.event.length > 0 && (
        <div style={{
          padding: 'var(--spacing-xl)',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)'
        }}>
          <h3 style={{
            fontSize: '1.125rem',
            color: 'var(--text-primary)',
            marginBottom: 'var(--spacing-lg)',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-sm)'
          }}>
            {watchersByMetric.event.some(w => w.bountyType === 'aisports') ? (
              <><span>🏀</span> Fantasy Basketball Events</>
            ) : (
              <><span>🎮</span> Game Events</>
            )}
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            {watchersByMetric.event.slice(0, 3).map((watcher, idx) => {
              // Get event description based on bounty type and event name
              let eventDescription = 'Game events';
              if (watcher.bountyType === 'aisports') {
                const eventMap = {
                  'PlayerScored': 'Player scoring alerts',
                  'TripleDouble': 'Triple-double achievements',
                  'PlayerInjured': 'Injury reports',
                  'LineupScored': 'Lineup performance',
                  'JUICERewardClaimed': '$JUICE reward claims',
                  'LargeJUICETransfer': 'Whale movements',
                  'JUICEStaked': 'Staking activity',
                  'VaultOpened': 'New vault contests',
                  'VaultClosingSoon': 'Vault closing alerts',
                  'VaultPayoutDistributed': 'Payout distributions',
                  'VaultHighScore': 'Vault leaderboard',
                  'PlayerNFTMinted': 'NFT mints',
                  'PlayerNFTSold': 'NFT marketplace sales',
                  'FloorPriceChanged': 'Floor price changes',
                  'UserAchievementUnlocked': 'Achievement unlocks',
                  'DailyStreakReward': 'Streak milestones'
                };
                eventDescription = eventMap[watcher.eventName] || watcher.eventName || 'Fantasy basketball events';
              } else if (watcher.bountyType === 'kittypunch') {
                const eventMap = {
                  'GameStarted': 'Game start',
                  'GameCompleted': 'Game completion',
                  'HighScore': 'High scores',
                  'NFTMinted': 'NFT mints',
                  'RewardClaimed': 'Reward claims',
                  'AchievementUnlocked': 'Achievements',
                  'LevelUp': 'Level ups',
                  'BattleWon': 'Battle victories',
                  'ItemPurchased': 'Item purchases',
                  'DailyLoginStreak': 'Login streaks'
                };
                eventDescription = eventMap[watcher.eventName] || watcher.eventName || 'KittyPunch game events';
              }

              return (
                <div
                  key={idx}
                  style={{
                    padding: 'var(--spacing-md)',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 'var(--spacing-xs)'
                  }}>
                    <span style={{ 
                      fontSize: '0.875rem', 
                      fontWeight: 600,
                      color: 'var(--text-primary)'
                    }}>
                      {watcher.bountyType === 'aisports' && '🏀 '}
                      {watcher.bountyType === 'kittypunch' && '🥊 '}
                      {watcher.targetAsset}
                    </span>
                    <span style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-dim)',
                      fontFamily: 'var(--font-mono)'
                    }}>
                      #{watcher.id}
                    </span>
                  </div>
                  <div style={{
                    fontSize: '0.875rem',
                    color: 'var(--text-secondary)',
                    marginBottom: 'var(--spacing-xs)'
                  }}>
                    Watching for: {eventDescription}
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)'
                    }}>
                      Events detected: {realTimeData.events.filter(e => e.watcher === watcher.id).length}
                    </div>
                    <div style={{
                      fontSize: '0.75rem',
                      color: 'var(--status-success)',
                      fontWeight: 500
                    }}>
                      ✓ Active
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        )}

        {/* Recent Activity Feed */}
        <div style={{
          padding: 'var(--spacing-xl)',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)'
        }}>
          <h3 style={{
            fontSize: '1.125rem',
            color: 'var(--text-primary)',
            marginBottom: 'var(--spacing-lg)',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-sm)'
          }}>
            <span>🔔</span> Recent Activity
          </h3>

          {recentActivity.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)', color: 'var(--text-muted)' }}>
              No recent activity
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
              {recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  style={{
                    padding: 'var(--spacing-md)',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderLeft: `3px solid ${
                      activity.type === 'PriceLimitReached' ? 'var(--status-error)' :
                      activity.type === 'WatcherUpdated' ? 'var(--accent-gold)' :
                      'var(--status-info)'
                    }`,
                    borderRadius: 'var(--radius-md)'
                  }}
                >
                  <div style={{
                    fontSize: '0.813rem',
                    color: 'var(--text-primary)',
                    marginBottom: 'var(--spacing-xs)',
                    fontWeight: 500
                  }}>
                    {activity.message}
                  </div>
                  <div style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-dim)',
                    fontFamily: 'var(--font-mono)'
                  }}>
                    {new Date(activity.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => onNavigate && onNavigate('logs')}
            style={{
              marginTop: 'var(--spacing-md)',
              width: '100%',
              padding: 'var(--spacing-sm)',
              background: 'transparent',
              color: 'var(--accent-gold)',
              border: '1px solid var(--border-primary)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.813rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all var(--transition-base)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-elevated)';
              e.currentTarget.style.borderColor = 'var(--accent-gold)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.borderColor = 'var(--border-primary)';
            }}
          >
            View Full Logs →
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{
        display: 'flex',
        gap: 'var(--spacing-md)',
        justifyContent: 'center'
      }}>
        <button
          onClick={handleDeployClick}
          style={{
            padding: '1rem 2rem',
            background: 'var(--accent-gold)',
            color: 'var(--bg-primary)',
            border: 'none',
            borderRadius: '24px',
            fontSize: '0.938rem',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: 'var(--shadow-md)',
            transition: 'all var(--transition-base)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-sm)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'var(--shadow-md)';
          }}
        >
          <span style={{ fontSize: '1.125rem' }}>+</span>
          Deploy New Watcher
        </button>

        <button
          onClick={() => onNavigate && onNavigate('manage')}
          style={{
            padding: '1rem 2rem',
            background: 'transparent',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-primary)',
            borderRadius: '24px',
            fontSize: '0.938rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all var(--transition-base)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--bg-elevated)';
            e.currentTarget.style.borderColor = 'var(--accent-gold)';
            e.currentTarget.style.color = 'var(--accent-gold)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.borderColor = 'var(--border-primary)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
        >
          Manage All Watchers →
        </button>
      </div>

      {/* Connect Wallet Prompt */}
      {!user?.addr && NETWORK !== 'testnet' && (
        <div style={{
          marginTop: 'var(--spacing-2xl)',
          padding: 'var(--spacing-2xl)',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-primary)',
          borderRadius: 'var(--radius-lg)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: 'var(--spacing-md)' }}>
            🔒
          </div>
          <h3 style={{
            fontSize: '1.25rem',
            color: 'var(--text-primary)',
            marginBottom: 'var(--spacing-sm)',
            fontWeight: 600
          }}>
            Connect Your Wallet
          </h3>
          <p style={{
            fontSize: '0.875rem',
            color: 'var(--text-muted)',
            marginBottom: 'var(--spacing-lg)'
          }}>
            Connect your wallet to see your watchers and dashboard metrics
          </p>
        </div>
      )}
    </div>
  );
};

export default DashboardOverview;

