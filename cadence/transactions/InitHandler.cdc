/*
    InitHandler.cdc - Initializes the CustomWatcherHandler resource and publishes its capability.
*/

import FlowTransactionScheduler from 0x8c5303eaa26202d6
import CustomWatcherHandler from 0x0d2b623d26790e50

transaction {
    prepare(signer: auth(BorrowValue, IssueStorageCapabilityController, SaveValue, PublishCapability) &Account) {

        let handlerStoragePath = /storage/CustomWatcherHandler
        let handlerPublicPath = /public/CustomWatcherHandler

        // Simpan resource Handler baru
        if signer.storage.borrow<&CustomWatcherHandler.Handler>(from: handlerStoragePath) == nil {
            let handler <- CustomWatcherHandler.createHandler()
            signer.storage.save(<-handler, to: handlerStoragePath)
        }

        // Validation that we can create an issue a handler capability with correct entitlement for FlowTransactionScheduler
        let _ = signer.capabilities.storage
            .issue<auth(FlowTransactionScheduler.Execute) &{FlowTransactionScheduler.TransactionHandler}>(handlerStoragePath)

        // Issue a non-entitled public capability for the handler that is publicly accessible
        let publicCap = signer.capabilities.storage
            .issue<&{FlowTransactionScheduler.TransactionHandler}>(handlerStoragePath)
        
        // Publish the capability
        signer.capabilities.publish(publicCap, at: handlerPublicPath)
        
        log("CustomWatcherHandler successfully initialized.")
    }
}
