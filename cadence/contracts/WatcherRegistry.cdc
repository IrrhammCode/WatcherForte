/*
    WatcherRegistry.cdc - The core database for all user-defined Watchers.
*/

access(all) contract WatcherRegistry {

    // Structure for price history entry
    access(all) struct PriceEntry {
        access(all) let timestamp: UFix64
        access(all) let price: UFix64
        
        init(timestamp: UFix64, price: UFix64) {
            self.timestamp = timestamp
            self.price = price
        }
    }

    // Structure for a single custom Watcher
    access(all) struct WatcherData {
        access(all) let watcherID: UInt64
        access(all) let targetSerial: String
        access(all) let priceLimit: UFix64 
        access(all) let scheduleDelay: UFix64 
        access(all) let isActive: Bool
        access(all) let owner: Address
        access(all) let deploymentTimestamp: UFix64  // ✅ NEW: Track when watcher was deployed
        
        init(
            watcherID: UInt64,
            targetSerial: String,
            priceLimit: UFix64,
            scheduleDelay: UFix64,
            isActive: Bool,
            owner: Address,
            deploymentTimestamp: UFix64
        ) {
            self.watcherID = watcherID
            self.targetSerial = targetSerial
            self.priceLimit = priceLimit
            self.scheduleDelay = scheduleDelay
            self.isActive = isActive
            self.owner = owner
            self.deploymentTimestamp = deploymentTimestamp
        }
    }

    // ID Generator and Database
    access(self) var nextWatcherID: UInt64
    access(all) var registry: {UInt64: WatcherData}
    
    // Price History Database (Feature 6)
    access(all) var priceHistory: {UInt64: [PriceEntry]}
    
    // Fractionalization Status (Task 8)
    access(all) var fractionalizationStatus: {UInt64: Bool}
    access(all) var fractionalizationThreshold: UFix64  // Default: $500.00
    
    // Lock mechanism
    access(all) var locked: Bool
    
    // ========================================
    // PRICE ORACLE - Real API Integration
    // ========================================
    // Maps asset serial/ID to current price (updated by external oracle service)
    access(all) var priceOracle: {String: UFix64}
    
    // Default price if oracle hasn't updated yet
    access(all) var defaultPrice: UFix64

    // Resource to expose executeWatcherLogic as a public capability
    access(all) resource WatcherExecutor {
        access(all) fun executeWatcher(watcherID: UInt64) {
            WatcherRegistry.executeWatcherLogic(watcherID: watcherID)
        }
    }

    // Events
    access(all) event WatcherDeployed(watcherID: UInt64, target: String, limit: UFix64)
    access(all) event WatcherUpdated(watcherID: UInt64, currentPrice: UFix64)
    access(all) event PriceLimitReached(watcherID: UInt64, price: UFix64, limit: UFix64)
    access(all) event ContractLocked()
    access(all) event VolatilityUpdated(watcherID: UInt64, volatilityScore: UFix64)
    access(all) event EmergencyExecutionTriggered(watcherID: UInt64, triggerAddress: Address)
    access(all) event FractionalizationReady(watcherID: UInt64, price: UFix64, threshold: UFix64)
    access(all) event PriceOracleUpdated(assetSerial: String, price: UFix64, timestamp: UFix64)


    // Function to deploy a new Watcher
    access(all) fun deployWatcher(
        targetSerial: String,
        priceLimit: UFix64,
        scheduleDelay: UFix64,
        owner: Address
    ): UInt64 {
        assert(!self.locked, message: "Contract is locked")
        
        let newID = self.nextWatcherID
        let currentTimestamp = getCurrentBlock().timestamp  // ✅ Get deployment timestamp
        
        let newWatcher = WatcherData(
            watcherID: newID,
            targetSerial: targetSerial,
            priceLimit: priceLimit,
            scheduleDelay: scheduleDelay,
            isActive: true,
            owner: owner,
            deploymentTimestamp: currentTimestamp  // ✅ Store deployment time
        )
        
        self.registry[newID] = newWatcher
        self.priceHistory[newID] = []
        self.nextWatcherID = newID + 1
        
        emit WatcherDeployed(watcherID: newID, target: targetSerial, limit: priceLimit)
        return newID
    }

    // Function executed by the Forte Scheduler Handler
    access(all) fun executeWatcherLogic(watcherID: UInt64) {
        assert(!self.locked, message: "Contract is locked")
        
        let watcherRef = self.registry[watcherID] 
            ?? panic("Watcher not found")
        
        // ========================================
        // FETCH PRICE FROM ORACLE
        // ========================================
        // Lookup price from oracle (updated by external API service)
        var currentPrice = self.priceOracle[watcherRef.targetSerial] ?? self.defaultPrice
        
        // Special handling for $FROTH token
        // If targetSerial is "FROTH" and no oracle price exists, use simulated price
        if watcherRef.targetSerial == "FROTH" && currentPrice == 0.0 {
            // Simulate FROTH price from PunchSwap pool (mock for demonstration)
            // In production, this would query actual DEX pool reserves
            currentPrice = self.getFrothPrice()
        }
        
        // NOTE: If price is defaultPrice, it means oracle hasn't been updated yet
        // External service should call updatePrice() to feed real market data

        // Add price to history (Feature 6)
        if self.priceHistory[watcherID] == nil {
            self.priceHistory[watcherID] = []
        }
        
        var history = self.priceHistory[watcherID]!
        let newEntry = PriceEntry(timestamp: getCurrentBlock().timestamp, price: currentPrice)
        history.append(newEntry)
        
        // Limit history to last 100 entries to prevent storage bloat
        while history.length > 100 {
            history.removeFirst()
        }
        
        self.priceHistory[watcherID] = history

        emit WatcherUpdated(watcherID: watcherID, currentPrice: currentPrice)
        
        // Calculate and emit volatility (safe - returns 0.0 if history.length < 2)
        let volatility = self.calculateVolatilityScore(history: history)
        emit VolatilityUpdated(watcherID: watcherID, volatilityScore: volatility)
        
        // Check Price Limit (The Composable Action)
        if currentPrice >= watcherRef.priceLimit {
            emit PriceLimitReached(watcherID: watcherID, price: currentPrice, limit: watcherRef.priceLimit)
        }
        
        // Check Fractionalization Readiness (Task 8: Auto-Fractionalization Trigger)
        if currentPrice >= self.fractionalizationThreshold {
            // Mark as ready for fractionalization
            self.fractionalizationStatus[watcherID] = true
            emit FractionalizationReady(watcherID: watcherID, price: currentPrice, threshold: self.fractionalizationThreshold)
        }
    }
    
    // Lock contract function
    access(all) fun lockContract() {
        self.locked = true
        emit ContractLocked()
    }
    
    // ========================================
    // PRICE ORACLE FUNCTIONS
    // ========================================
    
    // Update price oracle (called by external API service)
    // This should be called by your backend service that fetches real prices
    access(all) fun updatePrice(assetSerial: String, price: UFix64) {
        assert(!self.locked, message: "Contract is locked")
        assert(price > 0.0, message: "Price must be greater than 0")
        
        self.priceOracle[assetSerial] = price
        emit PriceOracleUpdated(
            assetSerial: assetSerial, 
            price: price, 
            timestamp: getCurrentBlock().timestamp
        )
    }
    
    // Batch update multiple prices (gas efficient for multiple assets)
    access(all) fun updatePrices(prices: {String: UFix64}) {
        assert(!self.locked, message: "Contract is locked")
        
        for assetSerial in prices.keys {
            let price = prices[assetSerial]!
            assert(price > 0.0, message: "Price must be greater than 0")
            
            self.priceOracle[assetSerial] = price
            emit PriceOracleUpdated(
                assetSerial: assetSerial, 
                price: price, 
                timestamp: getCurrentBlock().timestamp
            )
        }
    }
    
    // Get price from oracle
    access(all) fun getOraclePrice(assetSerial: String): UFix64? {
        return self.priceOracle[assetSerial]
    }
    
    // Get current price from latest history entry
    access(all) fun getCurrentPrice(watcherID: UInt64): UFix64? {
        if let history = self.priceHistory[watcherID] {
            if history.length > 0 {
                return history[history.length - 1].price
            }
        }
        return nil
    }
    
    // Get price history
    access(all) fun getPriceHistory(watcherID: UInt64): [PriceEntry]? {
        return self.priceHistory[watcherID]
    }
    
    // Calculate volatility score from price history
    access(all) fun calculateVolatilityScore(history: [PriceEntry]): UFix64 {
        if history.length < 2 {
            return 0.0
        }
        
        // Calculate standard deviation
        var sum: UFix64 = 0.0
        var count: UFix64 = 0.0
        for entry in history {
            sum = sum + entry.price
            count = count + 1.0
        }
        let mean = sum / count
        
        var variance: UFix64 = 0.0
        for entry in history {
            let diff = entry.price - mean
            variance = variance + (diff * diff)
        }
        variance = variance / count
        
        // Return volatility as percentage
        if mean > 0.0 {
            return (variance / mean) * 100.0
        }
        return 0.0
    }

    // Function to retrieve Watcher data
    access(all) fun getWatcherData(watcherID: UInt64): WatcherData? {
        return self.registry[watcherID]
    }
    
    // Get all watchers owned by a specific address
    access(all) fun getWatchersByOwner(owner: Address): [UInt64] {
        let watcherIDs: [UInt64] = []
        
        for watcherID in self.registry.keys {
            if let watcher = self.registry[watcherID] {
                if watcher.owner == owner {
                    watcherIDs.append(watcherID)
                }
            }
        }
        
        return watcherIDs
    }
    
    // Get fractionalization status for a watcher
    access(all) fun getFractionalizationStatus(watcherID: UInt64): Bool {
        if let status = self.fractionalizationStatus[watcherID] {
            return status
        }
        return false
    }

    // Function to create a WatcherExecutor resource
    access(all) fun createWatcherExecutor(): @WatcherExecutor {
        return <- create WatcherExecutor()
    }

    // Function to get the public capability for emergency execution
    access(all) fun getWatcherExecutorCapability(): Capability<&WatcherExecutor>? {
        return self.account.capabilities.get<&WatcherExecutor>(/public/WatcherExecutor)
    }

    // ========================================
    // $FROTH PRICE FETCHING (KittyPunch Integration)
    // ========================================
    
    /// Get $FROTH token price from PunchSwap V2 pool
    /// This simulates fetching price from DEX reserves
    /// In production, this would query actual PunchSwap pool reserves
    access(all) fun getFrothPrice(): UFix64 {
        // Mock FROTH/WFLOW pool reserves for demonstration
        // Production: Query PunchSwap V2 pool at 0x0f6C2EF40FA42B2F0E0a9f5987b2f3F8Af3C173f
        let mockReserveFROTH: UFix64 = 1000000.0  // 1M FROTH tokens
        let mockReserveWFLOW: UFix64 = 500000.0   // 500K WFLOW tokens
        
        // Calculate price: WFLOW / FROTH
        // This represents how many WFLOW tokens = 1 FROTH token
        let price = mockReserveWFLOW / mockReserveFROTH
        
        return price // Returns 0.5 WFLOW per FROTH in this simulation
    }
    
    /// Set $FROTH price directly (for oracle updates)
    access(all) fun updateFrothPrice(price: UFix64) {
        assert(!self.locked, message: "Contract is locked")
        assert(price > 0.0, message: "Price must be greater than 0")
        
        self.priceOracle["FROTH"] = price
        emit PriceOracleUpdated(
            assetSerial: "FROTH", 
            price: price, 
            timestamp: getCurrentBlock().timestamp
        )
    }

    init() {
        self.nextWatcherID = 1
        self.registry = {}
        self.priceHistory = {}
        self.fractionalizationStatus = {}
        self.fractionalizationThreshold = 500.00
        self.locked = false
        
        // Initialize price oracle
        self.priceOracle = {}
        self.defaultPrice = 0.0  // Will use 0.0 until oracle is updated
    }
}