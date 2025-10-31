/*
    GetVolatilityData.cdc - Query volatility metrics for Dune Analytics
    
    This script demonstrates how to retrieve:
    1. Current volatility score
    2. Price history for manual verification
    3. Latest price update
    
    Usage for Dune Analytics:
    - Subscribe to VolatilityUpdated events on-chain
    - Events provide pre-calculated volatility metrics
    - No need to calculate standard deviation from raw prices
*/

import "WatcherRegistry"

access(all) fun main(watcherID: UInt64): {String: AnyStruct} {
    let priceHistory = WatcherRegistry.getPriceHistory(watcherID: watcherID)
        ?? panic("No price history found for this watcher")
    
    // Calculate current volatility score
    let volatilityScore = WatcherRegistry.calculateVolatilityScore(history: priceHistory)
    
    // Get latest price
    let currentPrice = WatcherRegistry.getCurrentPrice(watcherID: watcherID)
        ?? panic("No current price found")
    
    // Calculate price range for insights
    var minPrice: UFix64 = currentPrice
    var maxPrice: UFix64 = currentPrice
    
    for entry in priceHistory {
        if entry.price < minPrice {
            minPrice = entry.price
        }
        if entry.price > maxPrice {
            maxPrice = entry.price
        }
    }
    
    let priceRange = maxPrice - minPrice
    
    return {
        "watcherID": watcherID,
        "currentPrice": currentPrice,
        "volatilityScore": volatilityScore,
        "dataPoints": priceHistory.length,
        "minPrice": minPrice,
        "maxPrice": maxPrice,
        "priceRange": priceRange,
        "priceHistory": priceHistory
    }
}














