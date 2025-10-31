/*
    TestHandlerCapability.cdc - Test if handler capability can be borrowed
*/

import FlowTransactionScheduler from 0x8c5303eaa26202d6
import CustomWatcherHandler from 0x7ca8cd62e27bad20

transaction {
    prepare(signer: auth(BorrowValue, Capabilities) &Account) {
        log("🔍 Testing handler capability...")
        
        // 1. Check if handler resource exists
        let handlerRef = signer.storage
            .borrow<&CustomWatcherHandler.Handler>(from: /storage/CustomWatcherHandler)
        
        if handlerRef == nil {
            panic("❌ Handler resource not found!")
        }
        log("✅ Handler resource exists")
        
        // 2. Issue capability
        let cap = signer.capabilities.storage
            .issue<auth(FlowTransactionScheduler.Execute) &{FlowTransactionScheduler.TransactionHandler}>(/storage/CustomWatcherHandler)
        
        log("✅ Capability issued")
        
        // 3. Check if capability is valid
        if !cap.check() {
            panic("❌ Capability is INVALID!")
        }
        log("✅ Capability is VALID")
        
        // 4. Try to borrow from capability
        let borrowed = cap.borrow()
        if borrowed == nil {
            panic("❌ Cannot borrow from capability!")
        }
        log("✅ Successfully borrowed reference from capability")
        
        log("🎉 ALL TESTS PASSED! Handler capability is working correctly.")
    }
}

