/*
    EmergencyExecution.cdc - Demonstrates reusable onchain building blocks (Flow Actions).
    This simulates how another smart contract (e.g., ChainCron) can borrow the public
    WatcherExecutor capability to trigger emergency price checks.
*/

import "WatcherRegistry"

transaction(watcherID: UInt64) {
    
    // This simulates a capability borrowed from the WatcherRegistry contract
    let registryRef: &WatcherRegistry
    
    prepare(signer: auth(BorrowValue) &Account) {
        // Get reference to the WatcherRegistry contract
        self.registryRef = getAccount(0xf8d6e0586b0a20c7)
            .contracts
            .borrow<&WatcherRegistry>(name: "WatcherRegistry")
            ?? panic("Could not borrow WatcherRegistry")
    }
    
    execute {
        // SIMULATED: Borrow the public WatcherExecutor capability
        // In a real scenario, this would be borrowed from the capability path:
        // let executorCap = getAccount(WATCHER_REGISTRY_ADDRESS)
        //     .capabilities.get<&WatcherRegistry.WatcherExecutor>(/public/WatcherExecutor)
        // let executor = executorCap.borrow() ?? panic("Could not borrow WatcherExecutor")
        // executor.executeWatcher(watcherID: watcherID)
        
        // For demo purposes, we directly call the function
        // This shows how the capability pattern works
        self.registryRef.executeWatcherLogic(watcherID: watcherID)
        
        log("Emergency execution triggered for Watcher ID: ".concat(watcherID.toString()))
        log("This demonstrates the reusable onchain building block pattern")
        log("The WatcherExecutor capability can be borrowed by any smart contract")
        log("to execute watcher logic as a composable action (Flow Action)")
    }
}















