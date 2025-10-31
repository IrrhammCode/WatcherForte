/*
    ClearOldHandler.cdc - Remove old handler resource to fix type mismatch
    
    This transaction removes the old CustomWatcherHandler resource that was created
    with the old contract address (0x7ca8cd62e27bad20), allowing you to create
    a new handler with the correct contract address (0x0d2b623d26790e50).
*/

/*
    ClearOldHandler.cdc - Clear old handler and create new one
    
    IMPORTANT: This transaction can only clear handlers if type matches.
    For type mismatch cases, the handler needs to be removed manually via Flow CLI.
    
    Usage:
    flow transactions send cadence/transactions/ClearOldHandler.cdc --signer testnet-account --network testnet
*/

import FlowTransactionScheduler from 0x8c5303eaa26202d6
import CustomWatcherHandler from 0x0d2b623d26790e50

transaction {
    prepare(signer: auth(BorrowValue, LoadValue, SaveValue, IssueStorageCapabilityController) &Account) {
        let handlerPath = /storage/CustomWatcherHandler
        let handlerPublicPath = /public/CustomWatcherHandler
        
        // Try to borrow - if this fails, type doesn't match and we can't proceed
        let existingHandler = signer.storage.borrow<&CustomWatcherHandler.Handler>(from: handlerPath)
        
        if existingHandler != nil {
            log("✅ Handler already exists with correct type - no action needed")
            return
        }
        
        // Check if something exists but type doesn't match
        if signer.storage.type(at: handlerPath) != nil {
            log("❌ ERROR: Handler exists with wrong type (type mismatch)")
            log("💡 Cannot remove automatically - Cadence doesn't allow loading resources with mismatched types")
            log("🔧 Please use Flow CLI to remove the old handler:")
            log("   1. Use Flow CLI with admin access to remove /storage/CustomWatcherHandler")
            log("   2. Or contact support for assistance")
            panic("Cannot clear handler with type mismatch. Handler needs to be removed manually via Flow CLI.")
        }
        
        // No handler exists - create new one
        log("📦 Creating new handler...")
        let newHandler <- CustomWatcherHandler.createHandler()
        signer.storage.save(<-newHandler, to: handlerPath)
        
        // Issue capabilities
        let _ = signer.capabilities.storage
            .issue<auth(FlowTransactionScheduler.Execute) &{FlowTransactionScheduler.TransactionHandler}>(handlerPath)
        
        let publicCap = signer.capabilities.storage
            .issue<&{FlowTransactionScheduler.TransactionHandler}>(handlerPath)
        signer.capabilities.publish(publicCap, at: handlerPublicPath)
        
        log("✅ New handler created and capabilities issued")
    }
}

