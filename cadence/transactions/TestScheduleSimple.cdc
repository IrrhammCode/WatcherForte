/*
    TestScheduleSimple.cdc - Test scheduling with minimal parameters
*/

import FlowTransactionScheduler from 0x8c5303eaa26202d6
import CustomWatcherHandler from 0x7ca8cd62e27bad20
import FlowToken from 0x7e60df042a9c0868
import FungibleToken from 0x9a0766d93b6608b7

transaction {
    prepare(signer: auth(BorrowValue, Capabilities) &Account) {
        log("🧪 Testing FlowTransactionScheduler.schedule()...")
        
        // 1. Get FlowToken vault
        let vaultRef = signer.storage
            .borrow<auth(FungibleToken.Withdraw) &FlowToken.Vault>(from: /storage/flowTokenVault)
            ?? panic("Could not borrow FlowToken vault")
        log("✅ Got FlowToken vault")
        
        // 2. Get handler capability
        let handlerCap = signer.capabilities.storage
            .issue<auth(FlowTransactionScheduler.Execute) &{FlowTransactionScheduler.TransactionHandler}>(/storage/CustomWatcherHandler)
        log("✅ Issued handler capability")
        
        // 3. Verify capability
        assert(handlerCap.check(), message: "Capability is invalid!")
        log("✅ Capability is valid")
        
        // 4. Create test data
        let testData = CustomWatcherHandler.WatcherExecutionData(
            watcherID: 999,
            ownerAddress: signer.address
        )
        log("✅ Created test execution data")
        
        // 5. Estimate fees
        let estimate = FlowTransactionScheduler.estimate(
            data: testData,
            timestamp: getCurrentBlock().timestamp + 10.0,
            priority: FlowTransactionScheduler.Priority.Medium,
            executionEffort: 1000
        )
        log("✅ Fee estimated: ".concat(estimate.flowFee?.toString() ?? "0.0"))
        
        // 6. Withdraw fees
        let feeVault <- vaultRef.withdraw(amount: estimate.flowFee ?? 0.001)
        log("✅ Fees withdrawn")
        
        // 7. Try to schedule
        log("🚀 Calling schedule()...")
        let receipt <- FlowTransactionScheduler.schedule(
            handlerCap: handlerCap,
            data: testData,
            timestamp: getCurrentBlock().timestamp + 10.0,
            priority: FlowTransactionScheduler.Priority.Medium,
            executionEffort: 1000,
            fees: <- (feeVault as! @FlowToken.Vault)
        )
        
        log("🎉 SUCCESS! Scheduled transaction ID: ".concat(receipt.id.toString()))
        destroy receipt
    }
}

