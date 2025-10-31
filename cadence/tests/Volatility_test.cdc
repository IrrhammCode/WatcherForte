/*
    Volatility_test.cdc - Test the Historical Volatility Event feature
    
    This test verifies:
    1. VolatilityUpdated event is emitted after price updates
    2. Volatility calculation produces expected results
    3. Event data is accessible for Dune Analytics
*/

import Test
import "WatcherRegistry"
import "CustomWatcherHandler"

access(all) let admin = Test.getAccount(0x0000000000000007)

access(all) fun setup() {
    let err = Test.deployContract(
        name: "WatcherRegistry",
        path: "cadence/contracts/WatcherRegistry.cdc",
        arguments: []
    )
    Test.expect(err, Test.beNil())
    
    let err2 = Test.deployContract(
        name: "CustomWatcherHandler",
        path: "cadence/contracts/CustomWatcherHandler.cdc",
        arguments: []
    )
    Test.expect(err2, Test.beNil())
}

// Test that VolatilityUpdated event is emitted when watcher executes
access(all) fun testVolatilityEventEmitted() {
    // Deploy a watcher
    let txResult = executeTransaction(
        "../transactions/DeployCustomWatcher.cdc",
        [
            "TEST-ASSET-001",      // targetSerial
            250.00,                 // priceLimit
            3600.0,                 // scheduleDelay (1 hour)
            admin.address           // owner
        ],
        admin
    )
    Test.expect(txResult, Test.beSucceeded())
    
    // Extract watcherID from events
    let events = Test.eventsOfType(Type<WatcherRegistry.WatcherDeployed>())
    Test.assertEqual(1, events.length)
    let watcherID = (events[0].data as! {String: AnyStruct})["watcherID"]! as! UInt64
    
    // Execute the watcher logic (simulates cron job)
    let execResult = executeTransaction(
        "../transactions/EmergencyExecution.cdc",
        [watcherID],
        admin
    )
    Test.expect(execResult, Test.beSucceeded())
    
    // Verify VolatilityUpdated event was emitted
    let volatilityEvents = Test.eventsOfType(Type<WatcherRegistry.VolatilityUpdated>())
    Test.expect(volatilityEvents.length > 0, Test.beTrue())
    
    // Verify event contains required data for Dune Analytics
    let eventData = volatilityEvents[0].data as! {String: AnyStruct}
    Test.expect(eventData.containsKey("watcherID"), Test.beTrue())
    Test.expect(eventData.containsKey("volatilityScore"), Test.beTrue())
    
    let emittedWatcherID = eventData["watcherID"]! as! UInt64
    let volatilityScore = eventData["volatilityScore"]! as! UFix64
    
    Test.assertEqual(watcherID, emittedWatcherID)
    
    // First execution should have low/zero volatility (only 1 data point)
    Test.expect(volatilityScore >= 0.0, Test.beTrue())
}

// Test volatility calculation accuracy
access(all) fun testVolatilityCalculation() {
    // Create sample price history
    let timestamp = getCurrentBlock().timestamp
    let history = [
        WatcherRegistry.PriceEntry(timestamp: timestamp, price: 100.0),
        WatcherRegistry.PriceEntry(timestamp: timestamp + 60.0, price: 110.0),
        WatcherRegistry.PriceEntry(timestamp: timestamp + 120.0, price: 90.0),
        WatcherRegistry.PriceEntry(timestamp: timestamp + 180.0, price: 105.0)
    ]
    
    // Calculate volatility
    let volatility = WatcherRegistry.calculateVolatilityScore(history: history)
    
    // Volatility should be non-negative
    Test.expect(volatility >= 0.0, Test.beTrue())
    
    // With these varied prices, volatility should be > 0
    Test.expect(volatility > 0.0, Test.beTrue())
}

// Test multiple executions increase price history and affect volatility
access(all) fun testVolatilityOverTime() {
    // Deploy a watcher
    let txResult = executeTransaction(
        "../transactions/DeployCustomWatcher.cdc",
        [
            "TEST-VOLATILE-ASSET",
            500.00,
            3600.0,
            admin.address
        ],
        admin
    )
    Test.expect(txResult, Test.beSucceeded())
    
    let events = Test.eventsOfType(Type<WatcherRegistry.WatcherDeployed>())
    let watcherID = (events[events.length - 1].data as! {String: AnyStruct})["watcherID"]! as! UInt64
    
    // Execute multiple times to build price history
    var i = 0
    while i < 5 {
        let execResult = executeTransaction(
            "../transactions/EmergencyExecution.cdc",
            [watcherID],
            admin
        )
        Test.expect(execResult, Test.beSucceeded())
        i = i + 1
    }
    
    // Verify we have multiple VolatilityUpdated events
    let volatilityEvents = Test.eventsOfType(Type<WatcherRegistry.VolatilityUpdated>())
    Test.expect(volatilityEvents.length >= 5, Test.beTrue())
    
    // Verify price history has been built
    let scriptResult = executeScript(
        "../scripts/GetVolatilityData.cdc",
        [watcherID]
    )
    Test.expect(scriptResult, Test.beSucceeded())
    
    let result = scriptResult.returnValue! as! {String: AnyStruct}
    let dataPoints = result["dataPoints"]! as! Int
    Test.expect(dataPoints >= 5, Test.beTrue())
}

access(all) fun executeTransaction(_ path: String, _ args: [AnyStruct], _ signer: Test.TestAccount): Test.TransactionResult {
    let code = Test.readFile(path)
    let tx = Test.Transaction(
        code: code,
        authorizers: [signer.address],
        signers: [signer],
        arguments: args
    )
    return Test.executeTransaction(tx)
}

access(all) fun executeScript(_ path: String, _ args: [AnyStruct]): Test.ScriptResult {
    let code = Test.readFile(path)
    return Test.executeScript(code, args)
}














