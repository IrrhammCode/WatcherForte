/**
 * GetAllWatchers.cdc
 * 
 * Script to fetch all watchers owned by a specific address
 * Returns complete watcher data including deployment timestamp
 */

import "WatcherRegistry"

access(all) fun main(owner: Address): [{String: AnyStruct}] {
    // Get all watcher IDs for this owner
    let watcherIDs = WatcherRegistry.getWatchersByOwner(owner: owner)
    
    // Build array of watcher data
    let watchers: [{String: AnyStruct}] = []
    
    for watcherID in watcherIDs {
        if let watcherData = WatcherRegistry.getWatcherData(watcherID: watcherID) {
            // Get additional data
            let currentPrice = WatcherRegistry.getCurrentPrice(watcherID: watcherID)
            let priceHistory = WatcherRegistry.getPriceHistory(watcherID: watcherID)
            let fractionalizationReady = WatcherRegistry.getFractionalizationStatus(watcherID: watcherID)
            
            // Calculate uptime
            let currentTimestamp = getCurrentBlock().timestamp
            let uptime = currentTimestamp - watcherData.deploymentTimestamp
            
            // Build watcher object with all data
            let watcher: {String: AnyStruct} = {
                "watcherID": watcherData.watcherID,
                "targetSerial": watcherData.targetSerial,
                "priceLimit": watcherData.priceLimit,
                "scheduleDelay": watcherData.scheduleDelay,
                "isActive": watcherData.isActive,
                "owner": watcherData.owner,
                "deploymentTimestamp": watcherData.deploymentTimestamp,
                "uptime": uptime,
                "currentPrice": currentPrice,
                "priceHistoryLength": priceHistory?.length ?? 0,
                "fractionalizationReady": fractionalizationReady
            }
            
            watchers.append(watcher)
        }
    }
    
    return watchers
}

