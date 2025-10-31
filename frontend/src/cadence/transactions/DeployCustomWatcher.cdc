/*
    DeployCustomWatcher.cdc - Deploys a new Watcher and schedules its first execution.
*/

import "FlowTransactionScheduler"
import "WatcherRegistry"
import "CustomWatcherHandler"
import "FlowToken"
import "FungibleToken"

transaction(
    targetSerial: String,
    priceLimit: UFix64,
    scheduleDelay: UFix64,
    initialDelay: UFix64, // Delay untuk eksekusi pertama (misalnya, 2.0 detik)
    executionEffort: UInt64
) {
    let watcherID: UInt64
    let ownerAddress: Address
    let feeVault: @FlowToken.Vault?
    let handlerCap: Capability<auth(FlowTransactionScheduler.Execute) &{FlowTransactionScheduler.TransactionHandler}>
    
    prepare(signer: auth(BorrowValue, Capabilities) &Account) {
        self.ownerAddress = signer.address
        
        // 1. Dapatkan referensi ke FlowToken Vault untuk membayar biaya
        let vaultRef = signer.storage
            .borrow<auth(FungibleToken.Withdraw) &FlowToken.Vault>(from: /storage/flowTokenVault)
            ?? panic("Could not borrow FlowToken vault")

        // 2. Daftarkan Watcher baru
        self.watcherID = WatcherRegistry.deployWatcher(
            targetSerial: targetSerial,
            priceLimit: priceLimit,
            scheduleDelay: scheduleDelay,
            owner: signer.address
        )

        // 3. Estimate fees for scheduling
        let est = FlowTransactionScheduler.estimate(
            data: CustomWatcherHandler.WatcherExecutionData(
                watcherID: self.watcherID,
                ownerAddress: self.ownerAddress
            ),
            timestamp: getCurrentBlock().timestamp + initialDelay,
            priority: FlowTransactionScheduler.Priority.Medium,
            executionEffort: executionEffort
        )
        
        assert(
            est.timestamp != nil,
            message: est.error ?? "estimation failed"
        )
        
        self.feeVault <- vaultRef.withdraw(amount: est.flowFee ?? 0.0) as! @FlowToken.Vault
        
        // 4. Get the handler capability from storage controllers
        // The capability must be issued during InitHandler
        let controllers = signer.capabilities.storage
            .getControllers(forPath: /storage/CustomWatcherHandler)
        
        // Find the capability with Execute entitlement
        var tempCap: Capability<auth(FlowTransactionScheduler.Execute) &{FlowTransactionScheduler.TransactionHandler}>? = nil
        for controller in controllers {
            if let cap = controller.capability as? Capability<auth(FlowTransactionScheduler.Execute) &{FlowTransactionScheduler.TransactionHandler}> {
                tempCap = cap
                break
            }
        }
        
        self.handlerCap = tempCap ?? panic("Handler capability not found. Run InitHandler first.")
    }

    execute {
        // Data yang akan dikirim ke CustomWatcherHandler
        let execData = CustomWatcherHandler.WatcherExecutionData(
            watcherID: self.watcherID,
            ownerAddress: self.ownerAddress
        )
        
        // Jadwalkan tugas Watcher pertama
        let receipt <- FlowTransactionScheduler.schedule(
            handlerCap: self.handlerCap,
            data: execData,
            timestamp: getCurrentBlock().timestamp + initialDelay,
            priority: FlowTransactionScheduler.Priority.Medium,
            executionEffort: executionEffort,
            fees: <- (self.feeVault ?? panic("Fee vault not set"))
        )
        
        destroy receipt

        log("Watcher "
            .concat(self.watcherID.toString())
            .concat(" deployed and scheduled to run at ")
            .concat((getCurrentBlock().timestamp + initialDelay).toString())
        )
    }
}
