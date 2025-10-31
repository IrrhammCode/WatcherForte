/*
    CustomWatcherHandler.cdc - The Forte Scheduler Worker.
    This is executed automatically by FlowTransactionScheduler.
*/

import FlowTransactionScheduler from 0x8c5303eaa26202d6
import WatcherRegistry from 0x0d2b623d26790e50 

access(all) contract CustomWatcherHandler {

    // Structure for the data passed by the Scheduler Transaction
    access(all) struct WatcherExecutionData {
        access(all) let watcherID: UInt64
        access(all) let ownerAddress: Address
        
        init(watcherID: UInt64, ownerAddress: Address) {
            self.watcherID = watcherID
            self.ownerAddress = ownerAddress
        }
    }

    // Resource Handler: MUST implement TransactionHandler interface
    access(all) resource Handler: FlowTransactionScheduler.TransactionHandler {

        // Signature required by FlowTransactionScheduler
        access(FlowTransactionScheduler.Execute) fun executeTransaction(
            id: UInt64,
            data: AnyStruct?
        ) {
            // Validate execution data
            let execData = data as! WatcherExecutionData?
                ?? panic("Invalid execution data provided")
            
            log("🔍 Executing watcher: ".concat(execData.watcherID.toString()))
            log("📍 Owner address: ".concat(execData.ownerAddress.toString()))
            
            // ✅ FIX: WatcherRegistry is deployed at the same address as CustomWatcherHandler
            // From flow.json: testnet-account = 0x0d2b623d26790e50
            // Both WatcherRegistry and CustomWatcherHandler are deployed to this address
            let registryAddress: Address = 0x0d2b623d26790e50
            
            log("🔍 Looking for WatcherRegistry at: ".concat(registryAddress.toString()))
            
            // Try to get WatcherRegistry from contract deployment address
            let registry = getAccount(registryAddress).contracts.borrow<&WatcherRegistry>(name: "WatcherRegistry")
            
            if registry == nil {
                log("❌ ERROR: WatcherRegistry not found at contract address 0x0d2b623d26790e50")
                panic("Could not find WatcherRegistry at contract address 0x0d2b623d26790e50")
            }
            
            log("✅ WatcherRegistry found")
            
            // Verify watcher exists before execution
            if registry!.getWatcherData(watcherID: execData.watcherID) == nil {
                log("❌ ERROR: Watcher ".concat(execData.watcherID.toString()).concat(" not found in registry"))
                panic("Watcher ".concat(execData.watcherID.toString()).concat(" not found"))
            }
            
            log("✅ Watcher found, executing logic...")
            
            // Execute the core logic
            registry!.executeWatcherLogic(watcherID: execData.watcherID)
            
            log("✅ Watcher execution completed successfully")
        }
    }

    // Function to create and return the Handler Resource
    access(all) fun createHandler(): @Handler {
        return <- create Handler()
    }
}