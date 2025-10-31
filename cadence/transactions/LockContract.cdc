/*
    LockContract.cdc - Locks the WatcherRegistry contract for security
*/

import "WatcherRegistry"

transaction() {
    prepare(signer: auth(Storage, Capabilities) &Account) {
        // No special permissions needed for locking
    }
    
    execute {
        WatcherRegistry.lockContract()
        log("Contract locked successfully")
    }
}















