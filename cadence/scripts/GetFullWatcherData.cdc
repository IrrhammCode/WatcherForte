/*
    GetFullWatcherData.cdc - Comprehensive getter script for frontend
    Returns WatcherData, PriceHistory, CurrentPrice, and VolatilityScore
*/

import "WatcherRegistry"

access(all) struct FullWatcherData {
    access(all) let watcherData: WatcherRegistry.WatcherData?
    access(all) let priceHistory: [WatcherRegistry.PriceEntry]?
    access(all) let currentPrice: UFix64?
    access(all) let volatilityScore: UFix64?
    
    init(
        watcherData: WatcherRegistry.WatcherData?,
        priceHistory: [WatcherRegistry.PriceEntry]?,
        currentPrice: UFix64?,
        volatilityScore: UFix64?
    ) {
        self.watcherData = watcherData
        self.priceHistory = priceHistory
        self.currentPrice = currentPrice
        self.volatilityScore = volatilityScore
    }
}

access(all) fun main(watcherID: UInt64): FullWatcherData {
    // Get watcher data
    let watcher = WatcherRegistry.getWatcherData(watcherID: watcherID)
    
    // Get price history
    let history = WatcherRegistry.getPriceHistory(watcherID: watcherID)
    
    // Get current price from the last entry in history
    var currentPrice: UFix64? = nil
    if history != nil && history!.length > 0 {
        currentPrice = history![history!.length - 1].price
    }
    
    // Calculate volatility score
    var volatilityScore: UFix64? = nil
    if history != nil {
        volatilityScore = WatcherRegistry.calculateVolatilityScore(history: history!)
    }
    
    return FullWatcherData(
        watcherData: watcher,
        priceHistory: history,
        currentPrice: currentPrice,
        volatilityScore: volatilityScore
    )
}
