import { useState } from 'react';

const DuneQueryBuilder = () => {
  const [selectedQuery, setSelectedQuery] = useState(null);
  const [copiedQuery, setCopiedQuery] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  // SQL Query templates from DUNE_ANALYTICS_INTEGRATION.md
  const queryTemplates = [
    {
      id: 'volatility-latest',
      category: 'Volatility Analysis',
      name: 'Latest Volatility Scores',
      description: 'Get the most recent volatility scores for all watchers',
      difficulty: 'Easy',
      sql: `-- Latest Volatility Scores
SELECT 
    watcherID,
    volatilityScore,
    block_time
FROM flow.events
WHERE event_name = 'VolatilityUpdated'
    AND contract_address = 'YOUR_CONTRACT_ADDRESS'
ORDER BY block_time DESC
LIMIT 10`
    },
    {
      id: 'volatility-7d-avg',
      category: 'Volatility Analysis',
      name: 'Average Volatility (7 Days)',
      description: 'Calculate average volatility per asset over the last 7 days',
      difficulty: 'Easy',
      sql: `-- Average Volatility (Last 7 Days)
SELECT 
    watcherID,
    AVG(volatilityScore) as avg_volatility_7d,
    MAX(volatilityScore) as peak_volatility,
    COUNT(*) as measurements
FROM flow.events
WHERE event_name = 'VolatilityUpdated'
    AND block_time >= NOW() - INTERVAL '7 days'
    AND contract_address = 'YOUR_CONTRACT_ADDRESS'
GROUP BY watcherID
ORDER BY avg_volatility_7d DESC`
    },
    {
      id: 'volatility-top-10',
      category: 'Risk Monitoring',
      name: 'Top 10 Most Volatile Assets',
      description: 'Identify the most volatile assets in your portfolio',
      difficulty: 'Easy',
      sql: `-- Top 10 Most Volatile Assets
SELECT 
    watcherID,
    AVG(volatilityScore) as avg_volatility,
    MAX(volatilityScore) as peak_volatility,
    MIN(volatilityScore) as min_volatility,
    COUNT(*) as data_points
FROM flow.events
WHERE event_name = 'VolatilityUpdated'
    AND block_time >= NOW() - INTERVAL '7 days'
    AND contract_address = 'YOUR_CONTRACT_ADDRESS'
GROUP BY watcherID
ORDER BY avg_volatility DESC
LIMIT 10`
    },
    {
      id: 'price-volatility-correlation',
      category: 'Advanced Analytics',
      name: 'Price vs Volatility Correlation',
      description: 'Analyze relationship between price updates and volatility',
      difficulty: 'Medium',
      sql: `-- Price vs Volatility Correlation
SELECT 
    v.watcherID,
    v.volatilityScore,
    w.currentPrice,
    v.block_time,
    CASE 
        WHEN v.volatilityScore > 25 THEN 'High Risk'
        WHEN v.volatilityScore > 15 THEN 'Medium Risk'
        ELSE 'Low Risk'
    END as risk_category
FROM flow.events v
JOIN flow.events w 
    ON v.watcherID = w.watcherID
    AND w.event_name = 'WatcherUpdated'
    AND ABS(EXTRACT(EPOCH FROM (v.block_time - w.block_time))) < 60
WHERE v.event_name = 'VolatilityUpdated'
    AND v.contract_address = 'YOUR_CONTRACT_ADDRESS'
ORDER BY v.block_time DESC
LIMIT 50`
    },
    {
      id: 'volatility-trend',
      category: 'Trend Analysis',
      name: 'Volatility Trend Over Time',
      description: 'Track how volatility changes hour-by-hour',
      difficulty: 'Medium',
      sql: `-- Volatility Trend Analysis
WITH hourly_volatility AS (
    SELECT 
        DATE_TRUNC('hour', block_time) as hour,
        watcherID,
        AVG(volatilityScore) as volatility
    FROM flow.events
    WHERE event_name = 'VolatilityUpdated'
        AND contract_address = 'YOUR_CONTRACT_ADDRESS'
        AND block_time >= NOW() - INTERVAL '7 days'
    GROUP BY 1, 2
)
SELECT 
    hour,
    watcherID,
    volatility,
    LAG(volatility) OVER (PARTITION BY watcherID ORDER BY hour) as prev_volatility,
    volatility - LAG(volatility) OVER (PARTITION BY watcherID ORDER BY hour) as volatility_change
FROM hourly_volatility
ORDER BY hour DESC, volatility DESC`
    },
    {
      id: 'alert-correlation',
      category: 'Advanced Analytics',
      name: 'Volatility & Price Alert Correlation',
      description: 'Find correlation between high volatility and price alerts',
      difficulty: 'Advanced',
      sql: `-- Volatility & Price Alert Correlation
SELECT 
    v.watcherID,
    COUNT(DISTINCT v.tx_hash) as volatility_updates,
    COUNT(DISTINCT p.tx_hash) as price_alerts,
    AVG(v.volatilityScore) as avg_volatility,
    COUNT(DISTINCT p.tx_hash)::float / COUNT(DISTINCT v.tx_hash) as alert_ratio
FROM flow.events v
LEFT JOIN flow.events p
    ON v.watcherID = p.watcherID
    AND p.event_name = 'PriceLimitReached'
    AND p.block_time BETWEEN v.block_time - INTERVAL '1 hour' 
                          AND v.block_time + INTERVAL '1 hour'
WHERE v.event_name = 'VolatilityUpdated'
    AND v.contract_address = 'YOUR_CONTRACT_ADDRESS'
    AND v.block_time >= NOW() - INTERVAL '30 days'
GROUP BY v.watcherID
ORDER BY avg_volatility DESC`
    },
    {
      id: 'daily-summary',
      category: 'Reporting',
      name: 'Daily Volatility Summary',
      description: 'Daily aggregated volatility report for all assets',
      difficulty: 'Easy',
      sql: `-- Daily Volatility Summary
SELECT 
    DATE_TRUNC('day', block_time) as date,
    watcherID,
    AVG(volatilityScore) as avg_volatility,
    MAX(volatilityScore) as max_volatility,
    MIN(volatilityScore) as min_volatility,
    COUNT(*) as update_count
FROM flow.events
WHERE event_name = 'VolatilityUpdated'
    AND contract_address = 'YOUR_CONTRACT_ADDRESS'
    AND block_time >= NOW() - INTERVAL '30 days'
GROUP BY 1, 2
ORDER BY date DESC, avg_volatility DESC`
    },
    {
      id: 'market-stability',
      category: 'Market Insights',
      name: 'Market Stability Index',
      description: 'Calculate overall market stability across all assets',
      difficulty: 'Medium',
      sql: `-- Market Stability Index
WITH daily_avg AS (
    SELECT 
        DATE_TRUNC('day', block_time) as date,
        AVG(volatilityScore) as market_volatility,
        COUNT(DISTINCT watcherID) as active_watchers
    FROM flow.events
    WHERE event_name = 'VolatilityUpdated'
        AND contract_address = 'YOUR_CONTRACT_ADDRESS'
    GROUP BY 1
)
SELECT 
    date,
    market_volatility,
    active_watchers,
    100 - market_volatility as stability_index,
    CASE 
        WHEN market_volatility < 10 THEN 'Very Stable'
        WHEN market_volatility < 20 THEN 'Stable'
        WHEN market_volatility < 30 THEN 'Volatile'
        ELSE 'Highly Volatile'
    END as market_condition
FROM daily_avg
ORDER BY date DESC
LIMIT 30`
    }
  ];

  const copyToClipboard = async (query) => {
    try {
      await navigator.clipboard.writeText(query.sql);
      setCopiedQuery(query.id);
      setTimeout(() => setCopiedQuery(null), 3000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch(difficulty) {
      case 'Easy': return '#00FF88';
      case 'Medium': return '#FFAA00';
      case 'Advanced': return '#FF0055';
      default: return '#8B95A7';
    }
  };

  const categories = [...new Set(queryTemplates.map(q => q.category))];

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.1) 0%, rgba(255, 0, 255, 0.1) 100%)',
      backdropFilter: 'blur(20px)',
      border: '2px solid rgba(0, 240, 255, 0.4)',
      borderRadius: '16px',
      padding: '2rem',
      boxShadow: '0 20px 60px rgba(0, 240, 255, 0.2)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Animated background */}
      <div style={{
        position: 'absolute',
        top: '-50%',
        left: '-50%',
        width: '200%',
        height: '200%',
        background: 'radial-gradient(circle, rgba(0, 240, 255, 0.15) 0%, transparent 70%)',
        animation: 'rotate 20s linear infinite',
        pointerEvents: 'none'
      }}></div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
              <div style={{
                width: '50px',
                height: '50px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #00F0FF, #FF00FF)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem',
                boxShadow: '0 0 30px rgba(0, 240, 255, 0.6)'
              }}>
                📊
              </div>
              <div>
                <h2 style={{
                  fontSize: '1.5rem',
                  fontWeight: '700',
                  background: 'linear-gradient(135deg, #00F0FF, #FF00FF)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  margin: 0
                }}>
                  Interactive Dune Query Builder
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
                  Developer Tool • Pre-built SQL Queries for Analytics
                </p>
              </div>
            </div>
          </div>
          <div style={{
            background: 'rgba(0, 240, 255, 0.2)',
            border: '1px solid rgba(0, 240, 255, 0.5)',
            borderRadius: '8px',
            padding: '0.5rem 1rem',
            fontSize: '0.85rem',
            color: 'var(--accent-cyan)',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: 'var(--accent-cyan)',
              boxShadow: '0 0 12px var(--accent-cyan)',
              animation: 'pulse-glow 2s infinite'
            }}></span>
            {queryTemplates.length} Queries Available
          </div>
        </div>

        {/* Info Box */}
        <div style={{
          padding: '1rem',
          background: 'rgba(0, 240, 255, 0.1)',
          border: '1px solid rgba(0, 240, 255, 0.3)',
          borderRadius: '8px',
          marginBottom: '1.5rem'
        }}>
          <div style={{ color: 'var(--accent-cyan)', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.5rem' }}>
            🚀 Developer-Friendly Analytics Tool
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: '1.6' }}>
            Copy pre-built SQL queries optimized for <strong style={{ color: '#FF00FF' }}>Dune Analytics</strong>. 
            These queries leverage WatcherForte&apos;s <strong style={{ color: 'var(--accent-cyan)' }}>VolatilityUpdated</strong> events 
            to provide instant insights without complex calculations. Perfect for building dashboards, monitoring risk, and analyzing market trends.
          </div>
        </div>

        {/* Query Categories */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ 
            display: 'flex', 
            gap: '0.5rem', 
            flexWrap: 'wrap',
            marginBottom: '1rem'
          }}>
            {categories.map(category => (
              <button
                key={category}
                onClick={() => {
                  const firstQuery = queryTemplates.find(q => q.category === category);
                  setSelectedQuery(firstQuery);
                  setShowPreview(true);
                }}
                style={{
                  background: 'rgba(0, 240, 255, 0.1)',
                  border: '1px solid rgba(0, 240, 255, 0.3)',
                  borderRadius: '8px',
                  padding: '0.5rem 1rem',
                  color: 'var(--accent-cyan)',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 240, 255, 0.2)';
                  e.currentTarget.style.borderColor = 'var(--accent-cyan)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 240, 255, 0.1)';
                  e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.3)';
                }}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Query Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}>
          {queryTemplates.map((query) => (
            <div
              key={query.id}
              style={{
                background: 'rgba(0, 0, 0, 0.3)',
                border: `1px solid ${selectedQuery?.id === query.id ? 'var(--accent-cyan)' : 'rgba(0, 240, 255, 0.2)'}`,
                borderRadius: '12px',
                padding: '1.25rem',
                transition: 'all 0.3s ease',
                cursor: 'pointer'
              }}
              onClick={() => {
                setSelectedQuery(query);
                setShowPreview(true);
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 8px 30px rgba(0, 240, 255, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {/* Query Header */}
              <div style={{ marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <div style={{ color: 'var(--text-primary)', fontWeight: '700', fontSize: '1rem' }}>
                    {query.name}
                  </div>
                  <div style={{
                    background: getDifficultyColor(query.difficulty) + '20',
                    border: `1px solid ${getDifficultyColor(query.difficulty)}`,
                    borderRadius: '4px',
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.7rem',
                    fontWeight: '600',
                    color: getDifficultyColor(query.difficulty)
                  }}>
                    {query.difficulty}
                  </div>
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: '1.4' }}>
                  {query.description}
                </div>
              </div>

              {/* Category Badge */}
              <div style={{
                display: 'inline-block',
                background: 'rgba(255, 0, 255, 0.1)',
                border: '1px solid rgba(255, 0, 255, 0.3)',
                borderRadius: '6px',
                padding: '0.25rem 0.75rem',
                fontSize: '0.75rem',
                color: '#FF00FF',
                fontWeight: '600',
                marginBottom: '0.75rem'
              }}>
                {query.category}
              </div>

              {/* Copy Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  copyToClipboard(query);
                }}
                style={{
                  width: '100%',
                  background: copiedQuery === query.id 
                    ? 'linear-gradient(135deg, #00FF88, #00F0FF)' 
                    : 'linear-gradient(135deg, #00F0FF, #FF00FF)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  color: 'white',
                  fontSize: '0.85rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 240, 255, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {copiedQuery === query.id ? (
                  <>
                    <span>✓</span>
                    <span>Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <span>📋</span>
                    <span>Copy Dune Query</span>
                  </>
                )}
              </button>
            </div>
          ))}
        </div>

        {/* Query Preview */}
        {showPreview && selectedQuery && (
          <div style={{
            background: 'rgba(0, 0, 0, 0.5)',
            border: '2px solid var(--accent-cyan)',
            borderRadius: '12px',
            padding: '1.5rem',
            marginTop: '1.5rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <div style={{ color: 'var(--accent-cyan)', fontWeight: '700', fontSize: '1.1rem', marginBottom: '0.25rem' }}>
                  {selectedQuery.name}
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  {selectedQuery.description}
                </div>
              </div>
              <button
                onClick={() => setShowPreview(false)}
                style={{
                  background: 'rgba(255, 0, 85, 0.2)',
                  border: '1px solid #FF0055',
                  borderRadius: '6px',
                  padding: '0.5rem 1rem',
                  color: '#FF0055',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Close Preview
              </button>
            </div>

            {/* SQL Code Block */}
            <div style={{
              background: '#1a1a2e',
              border: '1px solid rgba(0, 240, 255, 0.3)',
              borderRadius: '8px',
              padding: '1rem',
              fontFamily: 'monospace',
              fontSize: '0.85rem',
              color: '#e0e0e0',
              overflowX: 'auto',
              marginBottom: '1rem'
            }}>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {selectedQuery.sql}
              </pre>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => copyToClipboard(selectedQuery)}
                style={{
                  flex: 1,
                  background: 'linear-gradient(135deg, #00F0FF, #FF00FF)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  color: 'white',
                  fontSize: '0.9rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                {copiedQuery === selectedQuery.id ? '✓ Copied!' : '📋 Copy Query'}
              </button>
              <a
                href="https://dune.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  flex: 1,
                  background: 'rgba(0, 240, 255, 0.2)',
                  border: '2px solid var(--accent-cyan)',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  color: 'var(--accent-cyan)',
                  fontSize: '0.9rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  textDecoration: 'none'
                }}
              >
                🚀 Open in Dune →
              </a>
            </div>
          </div>
        )}

        {/* Usage Instructions */}
        <div style={{
          marginTop: '1.5rem',
          padding: '1rem',
          background: 'rgba(255, 0, 255, 0.1)',
          border: '1px solid rgba(255, 0, 255, 0.3)',
          borderRadius: '8px'
        }}>
          <div style={{ color: '#FF00FF', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.5rem' }}>
            💡 How to Use These Queries
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: '1.6' }}>
            1. Click any query card to preview the SQL code<br/>
            2. Click &quot;Copy Dune Query&quot; to copy to clipboard<br/>
            3. Open <strong style={{ color: '#FF00FF' }}>Dune Analytics</strong> and create a new query<br/>
            4. Paste the SQL and replace <code style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>YOUR_CONTRACT_ADDRESS</code> with your deployed contract address<br/>
            5. Run the query and create beautiful visualizations!<br/>
            <br/>
            <strong style={{ color: 'var(--accent-cyan)' }}>Note:</strong> These queries are optimized for Flow blockchain events and require WatcherForte contracts to be deployed.
          </div>
        </div>
      </div>
    </div>
  );
};

export default DuneQueryBuilder;














