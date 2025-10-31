/*
    InitWatcherExecutor.cdc - Initializes and publishes the WatcherExecutor public capability
    for reusable onchain building blocks (Flow Actions).
*/

import "WatcherRegistry"

transaction {
    prepare(signer: auth(BorrowValue, IssueStorageCapabilityController, SaveValue, PublishCapability) &Account) {
        
        let storagePath = /storage/WatcherExecutor
        let publicPath = /public/WatcherExecutor
        
        // Create and save the WatcherExecutor resource
        if signer.storage.borrow<&WatcherRegistry.WatcherExecutor>(from: storagePath) == nil {
            let executor <- WatcherRegistry.createWatcherExecutor()
            signer.storage.save(<-executor, to: storagePath)
        }
        
        // Issue and publish the public capability
        let publicCap = signer.capabilities.storage
            .issue<&{WatcherRegistry.WatcherExecutor}>(storagePath)
        
        signer.capabilities.publish(publicCap, at: publicPath)
        
        log("WatcherExecutor public capability published successfully.")
        log("Other smart contracts can now borrow this capability to execute watchers.")
    }
}















