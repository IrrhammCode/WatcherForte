/*
    CheckContractDeployment.cdc - Verify if WatcherRegistry is deployed at specific address
*/

import WatcherRegistry from 0x7ca8cd62e27bad20

access(all) fun main(): Bool {
    // Try to get contract reference
    let account = getAccount(0x7ca8cd62e27bad20)
    
    // Check if WatcherRegistry contract exists
    if let registry = account.contracts.borrow<&WatcherRegistry>(name: "WatcherRegistry") {
        // Try to call a simple function to verify it works
        let watcherCount = registry.registry.keys.length
        return true
    }
    
    return false
}

