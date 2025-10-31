/*
    CheckHandlerStatus.cdc - Check if handler is properly initialized
*/

import FlowTransactionScheduler from 0x8c5303eaa26202d6
import CustomWatcherHandler from 0x7ca8cd62e27bad20

access(all) struct HandlerStatus {
    access(all) let hasHandler: Bool
    access(all) let controllerCount: Int
    access(all) let hasExecuteCapability: Bool
    access(all) let hasPublicCapability: Bool
    
    init(
        hasHandler: Bool,
        controllerCount: Int,
        hasExecuteCapability: Bool,
        hasPublicCapability: Bool
    ) {
        self.hasHandler = hasHandler
        self.controllerCount = controllerCount
        self.hasExecuteCapability = hasExecuteCapability
        self.hasPublicCapability = hasPublicCapability
    }
}

access(all) fun main(userAddress: Address): HandlerStatus {
    let account = getAccount(userAddress)
    let handlerStoragePath = /storage/CustomWatcherHandler
    let handlerPublicPath = /public/CustomWatcherHandler
    
    // Check if handler resource exists
    let hasHandler = account.storage.type(at: handlerStoragePath) != nil
    
    // Check capabilities
    let controllers = account.capabilities.storage
        .getControllers(forPath: handlerStoragePath)
    
    var hasExecuteCapability = false
    for controller in controllers {
        if controller.capability.isInstance(Type<Capability<auth(FlowTransactionScheduler.Execute) &{FlowTransactionScheduler.TransactionHandler}>>()) {
            hasExecuteCapability = true
            break
        }
    }
    
    // Check public capability
    let publicCap = account.capabilities.get<&{FlowTransactionScheduler.TransactionHandler}>(handlerPublicPath)
    let hasPublicCapability = publicCap.check()
    
    return HandlerStatus(
        hasHandler: hasHandler,
        controllerCount: controllers.length,
        hasExecuteCapability: hasExecuteCapability,
        hasPublicCapability: hasPublicCapability
    )
}

