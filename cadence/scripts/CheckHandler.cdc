/*
    CheckHandler.cdc - Simple check if handler resource exists
*/

import CustomWatcherHandler from 0x7ca8cd62e27bad20

access(all) fun main(userAddress: Address): Bool {
    let account = getAccount(userAddress)
    let handlerStoragePath = /storage/CustomWatcherHandler
    
    // Check if handler resource exists at storage path
    let hasHandler = account.storage.type(at: handlerStoragePath) != nil
    
    return hasHandler
}

