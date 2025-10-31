import React, { useState, useEffect } from 'react';
import { getWatchersByOwner, getFullWatcherData, parseWatcherData } from '../services/watcherService';
import './ActivityLogs.css';

const ActivityLogs = ({ user }) => {
  const [events, setEvents] = useState([]);
  const [filter, setFilter] = useState('all');
  const [metricFilter, setMetricFilter] = useState('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.addr) {
      fetchActivityLogs();
    }
  }, [user]);

  const fetchActivityLogs = async () => {
    setLoading(true);
    try {
      // Fetch watcher IDs
      const watcherIDs = await getWatchersByOwner(user.addr);
      
      if (watcherIDs && watcherIDs.length > 0) {
        // Fetch full data for each watcher
        const watcherData = await Promise.all(
          watcherIDs.map(id => getFullWatcherData(id).then(parseWatcherData))
        );

        const validWatchers = watcherData.filter(w => w !== null);
        
        // Generate activity logs based on watchers and their metrics
        const generatedEvents = [];
        
        validWatchers.forEach((watcher, idx) => {
          const metricKey = `watcher_${watcher.id}_metric`;
          const metric = localStorage.getItem(metricKey) || 'price';
          
          const eventKey = `watcher_${watcher.id}_eventName`;
          const eventName = localStorage.getItem(eventKey);
          
          const bountyKey = `watcher_${watcher.id}_bountyType`;
          const bountyType = localStorage.getItem(bountyKey);
          
          // Deploy event
          const icon = bountyType === 'aisports' ? '🏀' : bountyType === 'kittypunch' ? '🥊' : '📊';
          generatedEvents.push({
            id: `deploy-${watcher.id}`,
            watcherId: watcher.id,
            type: 'WatcherDeployed',
            metric: metric,
            bountyType: bountyType,
            timestamp: new Date(Date.now() - (idx + 1) * 3600000).toISOString(),
            message: `${icon} ${watcher.targetAsset} Watcher deployed`,
            details: `Metric: ${metric.toUpperCase()} | Limit: ${watcher.priceLimit.toFixed(2)}`,
          });
          
          // Metric-specific events
          if (metric === 'price') {
            generatedEvents.push({
              id: `price-${watcher.id}-1`,
              watcherId: watcher.id,
              type: 'PriceUpdate',
              metric: 'price',
              timestamp: new Date(Date.now() - (idx + 1) * 1800000).toISOString(),
              message: `${watcher.targetAsset} - Price monitored`,
              details: `Current: $${watcher.currentPrice?.toFixed(4) || '0.00'} | Limit: $${watcher.priceLimit?.toFixed(2) || '0.00'}`,
            });
            
            if (watcher.currentPrice && 
                watcher.currentPrice > watcher.priceLimit) {
              generatedEvents.push({
                id: `alert-${watcher.id}`,
                watcherId: watcher.id,
                type: 'AlertTriggered',
                metric: 'price',
                timestamp: new Date(Date.now() - (idx + 1) * 900000).toISOString(),
                message: `🚨 ${watcher.targetAsset} - Price Alert!`,
                details: `Price exceeded limit: $${watcher.currentPrice.toFixed(4)} > $${watcher.priceLimit.toFixed(2)}`,
              });
            }
          } else if (metric === 'transaction') {
            // Mock transaction count for demo
            const mockTxCount = Math.floor(Math.random() * 500) + 100;
            const threshold = Math.floor(watcher.priceLimit || 200);
            
            generatedEvents.push({
              id: `tx-${watcher.id}-1`,
              watcherId: watcher.id,
              type: 'VolumeCheck',
              metric: 'transaction',
              timestamp: new Date(Date.now() - (idx + 1) * 1800000).toISOString(),
              message: `${watcher.targetAsset} - Volume monitored`,
              details: `24h Transactions: ${mockTxCount} | Threshold: ${threshold} tx`,
            });
            
            // Add alert if volume high
            if (mockTxCount > threshold) {
              generatedEvents.push({
                id: `vol-alert-${watcher.id}`,
                watcherId: watcher.id,
                type: 'AlertTriggered',
                metric: 'transaction',
                timestamp: new Date(Date.now() - (idx + 1) * 900000).toISOString(),
                message: `🚨 ${watcher.targetAsset} - High Volume Alert!`,
                details: `Transaction volume spiked: ${mockTxCount} tx > ${threshold} tx threshold`,
              });
            }
          } else if (metric === 'event') {
            // Event-specific logs based on bounty type
            let eventTypes, eventIcon, eventDetails, alertDetails;
            const eventCount = Math.floor(Math.random() * 10) + 1;
            
            if (bountyType === 'aisports') {
              // aiSports-specific events
              eventIcon = '🏀';
              eventTypes = [
                { name: 'PlayerScored', display: 'Player scored 32 points', value: '32 pts' },
                { name: 'TripleDouble', display: 'Triple-double achieved', value: '12/10/11' },
                { name: 'VaultOpened', display: 'New vault opened', value: '5000 $JUICE prize' },
                { name: 'LargeJUICETransfer', display: 'Whale alert', value: '50k $JUICE moved' },
                { name: 'PlayerNFTSold', display: 'Player NFT sold', value: '800 $JUICE' }
              ];
              
              const eventTypeDisplay = eventName ? 
                eventTypes.find(e => e.name === eventName)?.display || eventName :
                'Fantasy basketball events';
              
              eventDetails = eventName ? 
                `Watching: ${eventTypeDisplay} | Detected: ${eventCount} event(s)` :
                `Watching: Player scores, vaults, $JUICE activity | Detected: ${eventCount} event(s)`;
              
            } else if (bountyType === 'kittypunch') {
              // KittyPunch-specific events
              eventIcon = '🥊';
              eventTypes = [
                { name: 'HighScore', display: 'High score', value: '9,850' },
                { name: 'RewardClaimed', display: 'Reward claimed', value: '150 FROTH' },
                { name: 'NFTMinted', display: 'NFT minted', value: '#12345' },
                { name: 'LevelUp', display: 'Level up', value: 'Level 10' }
              ];
              
              const eventTypeDisplay = eventName ?
                eventTypes.find(e => e.name === eventName)?.display || eventName :
                'Game events';
              
              eventDetails = eventName ?
                `Watching: ${eventTypeDisplay} | Detected: ${eventCount} event(s)` :
                `Watching: NFT mints, rewards, achievements | Detected: ${eventCount} event(s)`;
                
            } else {
              // Generic events
              eventIcon = '🎮';
              eventTypes = [
                { name: 'GenericEvent', display: 'Event detected', value: 'N/A' }
              ];
              eventDetails = `Watching: Blockchain events | Detected: ${eventCount} event(s)`;
            }
            
            const randomEvent = eventTypes[Math.floor(Math.random() * eventTypes.length)];
            
            generatedEvents.push({
              id: `event-${watcher.id}-1`,
              watcherId: watcher.id,
              type: 'EventWatch',
              metric: 'event',
              bountyType: bountyType,
              timestamp: new Date(Date.now() - (idx + 1) * 1800000).toISOString(),
              message: `${eventIcon} ${watcher.targetAsset} - Events monitored`,
              details: eventDetails,
            });
            
            // Add alert for new events
            if (eventCount > 0) {
              alertDetails = bountyType === 'aisports' ?
                `${randomEvent.display}: ${randomEvent.value}` :
                `${randomEvent.display} for player #${Math.floor(Math.random() * 10000)}`;
              
              generatedEvents.push({
                id: `event-alert-${watcher.id}`,
                watcherId: watcher.id,
                type: 'AlertTriggered',
                metric: 'event',
                bountyType: bountyType,
                timestamp: new Date(Date.now() - (idx + 1) * 900000).toISOString(),
                message: `${eventIcon} ${watcher.targetAsset} - New Event!`,
                details: alertDetails,
              });
            }
          }
        });
        
        // Sort by timestamp (newest first)
        generatedEvents.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        setEvents(generatedEvents);
      }
    } catch (error) {
      console.error('Error fetching activity logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = events.filter(e => {
    const typeMatch = filter === 'all' || e.type === filter;
    const metricMatch = metricFilter === 'all' || e.metric === metricFilter;
    return typeMatch && metricMatch;
  });

  return (
    <div className="activity-logs-page" style={{
      padding: 'var(--spacing-xl)',
      background: 'var(--bg-primary)',
      minHeight: 'calc(100vh - 64px)'
    }}>
      {/* Header */}
      <div style={{
        padding: 'var(--spacing-lg) var(--spacing-xl)',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        marginBottom: 'var(--spacing-xl)'
      }}>
        <h2 style={{ 
          color: 'var(--accent-gold)', 
          marginBottom: 'var(--spacing-sm)',
          fontSize: '1.5rem',
          fontWeight: 600
        }}>
          📜 Activity Logs
        </h2>
        <p style={{ 
          color: 'var(--text-muted)',
          fontSize: '0.875rem',
          margin: 0
        }}>
          Real-time event history and transaction logs
        </p>
      </div>

      {/* Filter Bar */}
      <div style={{
        padding: 'var(--spacing-md) var(--spacing-lg)',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        marginBottom: 'var(--spacing-lg)'
      }}>
        {/* Event Type Filter */}
        <div style={{
          display: 'flex',
          gap: 'var(--spacing-md)',
          alignItems: 'center',
          marginBottom: 'var(--spacing-md)'
        }}>
          <span style={{ 
            fontSize: '0.813rem', 
            color: 'var(--text-muted)',
            fontWeight: 600,
            minWidth: '80px'
          }}>
            Event Type:
          </span>
          {['all', 'WatcherDeployed', 'PriceUpdate', 'AlertTriggered', 'VolumeCheck', 'EventWatch'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '0.5rem 1rem',
                background: filter === f ? 'rgba(176, 141, 87, 0.15)' : 'transparent',
                color: filter === f ? 'var(--accent-gold)' : 'var(--text-secondary)',
                border: '1px solid',
                borderColor: filter === f ? 'rgba(176, 141, 87, 0.3)' : 'var(--border-primary)',
                borderRadius: '20px',
                fontSize: '0.75rem',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.25s ease'
              }}
            >
              {f === 'all' ? 'All' : f}
            </button>
          ))}
        </div>
        
        {/* Metric Filter */}
        <div style={{
          display: 'flex',
          gap: 'var(--spacing-md)',
          alignItems: 'center'
        }}>
          <span style={{ 
            fontSize: '0.813rem', 
            color: 'var(--text-muted)',
            fontWeight: 600,
            minWidth: '80px'
          }}>
            Metric:
          </span>
          {[
            { value: 'all', label: 'All', icon: '📊' },
            { value: 'price', label: 'Price', icon: '💰' },
            { value: 'transaction', label: 'Volume', icon: '📈' },
            { value: 'event', label: 'Events', icon: '🎮' }
          ].map((m) => (
            <button
              key={m.value}
              onClick={() => setMetricFilter(m.value)}
              style={{
                padding: '0.5rem 1rem',
                background: metricFilter === m.value ? 'rgba(176, 141, 87, 0.15)' : 'transparent',
                color: metricFilter === m.value ? 'var(--accent-gold)' : 'var(--text-secondary)',
                border: '1px solid',
                borderColor: metricFilter === m.value ? 'rgba(176, 141, 87, 0.3)' : 'var(--border-primary)',
                borderRadius: '20px',
                fontSize: '0.75rem',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.25s ease'
              }}
            >
              {m.icon} {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Event List */}
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--spacing-lg)'
      }}>
        <h3 style={{
          fontSize: '1rem',
          color: 'var(--text-primary)',
          marginBottom: 'var(--spacing-lg)',
          fontWeight: 600
        }}>
          Recent Events ({filteredEvents.length})
        </h3>

        {filteredEvents.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: 'var(--spacing-2xl)',
            color: 'var(--text-muted)'
          }}>
            No events found
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            {filteredEvents.map((event) => (
              <div
                key={event.id}
                style={{
                  padding: 'var(--spacing-md)',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  borderLeft: '3px solid var(--accent-gold)',
                  transition: 'all 0.25s ease'
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
                    {event.message}
                  </span>
                  <span style={{ 
                    fontSize: '0.75rem', 
                    color: 'var(--text-dim)',
                    fontFamily: 'var(--font-mono)'
                  }}>
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div style={{ 
                  fontSize: '0.813rem', 
                  color: 'var(--text-muted)',
                  marginBottom: 'var(--spacing-xs)'
                }}>
                  {event.details}
                </div>
                <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                  <div style={{
                    display: 'inline-block',
                    padding: '0.25rem 0.625rem',
                    background: 'rgba(176, 141, 87, 0.1)',
                    color: 'var(--accent-gold)',
                    borderRadius: '12px',
                    fontSize: '0.688rem',
                    fontWeight: 600
                  }}>
                    {event.type}
                  </div>
                  {event.metric && (
                    <div style={{
                      display: 'inline-block',
                      padding: '0.25rem 0.625rem',
                      background: event.metric === 'price' ? 'rgba(16, 185, 129, 0.1)' 
                        : event.metric === 'transaction' ? 'rgba(59, 130, 246, 0.1)'
                        : 'rgba(245, 158, 11, 0.1)',
                      color: event.metric === 'price' ? 'var(--status-success)' 
                        : event.metric === 'transaction' ? 'var(--status-info)'
                        : 'var(--status-warning)',
                      borderRadius: '12px',
                      fontSize: '0.688rem',
                      fontWeight: 600
                    }}>
                      {event.metric === 'price' ? '💰' : event.metric === 'transaction' ? '📊' : '🎮'} {event.metric.toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Box */}
      {!user?.addr && (
        <div style={{
          marginTop: 'var(--spacing-xl)',
          padding: 'var(--spacing-lg)',
          background: 'rgba(245, 158, 11, 0.1)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: 'var(--radius-lg)',
          color: 'var(--status-warning)',
          fontSize: '0.875rem'
        }}>
          💡 Connect your wallet to see your real transaction logs
        </div>
      )}
    </div>
  );
};

export default ActivityLogs;

