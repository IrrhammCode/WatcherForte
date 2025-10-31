// Simple test to deploy watcher without scheduling
// Use this to test if contract deployment works on testnet

import WatcherRegistry from 0x7ca8cd62e27bad20

transaction(
    targetSerial: String,
    priceLimit: UFix64
) {
    let watcherID: UInt64
    
    prepare(signer: auth(BorrowValue) &Account) {
        // Just deploy the watcher, no scheduling
        self.watcherID = WatcherRegistry.deployWatcher(
            targetSerial: targetSerial,
            priceLimit: priceLimit,
            scheduleDelay: 24.0,
            owner: signer.address
        )
    }

    execute {
        log("✅ Watcher deployed with ID: ".concat(self.watcherID.toString()))
    }
}

