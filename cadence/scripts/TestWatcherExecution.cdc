/*
    TestWatcherExecution.cdc - Test if we can execute watcher logic directly
*/

import WatcherRegistry from 0x7ca8cd62e27bad20

access(all) fun main(watcherID: UInt64): String {
    let registryAddress: Address = 0x7ca8cd62e27bad20
    
    // Try to get registry
    if let registry = getAccount(registryAddress).contracts.borrow<&WatcherRegistry>(name: "WatcherRegistry") {
        // Check if watcher exists
        if let watcher = registry.getWatcherData(watcherID: watcherID) {
            return "Watcher exists: ".concat(watcher.targetSerial)
        } else {
            return "ERROR: Watcher not found"
        }
    } else {
        return "ERROR: WatcherRegistry not found at address 0x7ca8cd62e27bad20"
    }
}

