/**
 * WatcherForte - Blockchain Service Layer
 * Handles all FCL interactions with Flow blockchain
 */

import * as fcl from '@onflow/fcl';
import * as t from '@onflow/types';

// ==========================================
// SCRIPTS (Read-only queries)
// ==========================================

/**
 * Get full watcher data including price history and volatility
 * @param {number} watcherID - The watcher ID to query
 * @returns {Promise<Object>} Full watcher data
 */
export const getFullWatcherData = async (watcherID) => {
  try {
    const script = `
import WatcherRegistry from 0x0d2b623d26790e50

access(all) struct FullWatcherData {
    access(all) let watcherData: WatcherRegistry.WatcherData?
    access(all) let priceHistory: [WatcherRegistry.PriceEntry]?
    access(all) let currentPrice: UFix64?
    access(all) let volatilityScore: UFix64?
    
    init(
        watcherData: WatcherRegistry.WatcherData?,
        priceHistory: [WatcherRegistry.PriceEntry]?,
        currentPrice: UFix64?,
        volatilityScore: UFix64?
    ) {
        self.watcherData = watcherData
        self.priceHistory = priceHistory
        self.currentPrice = currentPrice
        self.volatilityScore = volatilityScore
    }
}

access(all) fun main(watcherID: UInt64): FullWatcherData {
    let watcher = WatcherRegistry.getWatcherData(watcherID: watcherID)
    let history = WatcherRegistry.getPriceHistory(watcherID: watcherID)
    
    var currentPrice: UFix64? = nil
    if history != nil && history!.length > 0 {
        currentPrice = history![history!.length - 1].price
    }
    
    var volatilityScore: UFix64? = nil
    if history != nil {
        volatilityScore = WatcherRegistry.calculateVolatilityScore(history: history!)
    }
    
    return FullWatcherData(
        watcherData: watcher,
        priceHistory: history,
        currentPrice: currentPrice,
        volatilityScore: volatilityScore
    )
}
    `;

    // Ensure FCL is ready
    if (!fcl || !fcl.query) {
      throw new Error('FCL query is not available. Please refresh the page.');
    }

    // Add timeout promise (3 seconds)
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Query timeout after 3 seconds')), 3000)
    );

    const queryPromise = fcl.query({
      cadence: script,
      args: (arg, t) => [arg(String(watcherID), t.UInt64)],
    });

    // Race between query and timeout
    const result = await Promise.race([queryPromise, timeoutPromise]);

    return result;
  } catch (error) {
    console.warn('⚠️ Failed to fetch watcher data:', error.message);
    return null; // Return null instead of throwing
  }
};

/**
 * Get all watcher IDs for a specific owner
 * TEMPORARY WORKAROUND: Contract on testnet is old version
 * Cannot access nextWatcherID (private field) and no getWatchersByOwner function
 * For now, return empty array. Watchers will appear after successful deploy.
 * 
 * TODO: Once contract is updated on testnet, replace with proper implementation
 * @param {string} ownerAddress - The owner's Flow address
 * @returns {Promise<Array<number>>} Array of watcher IDs
 */
export const getWatchersByOwner = async (ownerAddress) => {
  try {
    console.log(`🔍 Fetching watchers for ${ownerAddress}...`);
    
    // WORKAROUND: Contract on testnet doesn't have getWatchersByOwner yet
    // Use localStorage to track deployed watcher IDs
    const localStorageKey = `watchers_${ownerAddress}`;
    const storedWatchers = localStorage.getItem(localStorageKey);
    
    if (storedWatchers) {
      const watcherIds = JSON.parse(storedWatchers);
      console.log(`📦 Found ${watcherIds.length} watchers in localStorage:`, watcherIds);
      
      // Validate each watcher still exists on-chain
      const validWatchers = [];
      for (const id of watcherIds) {
        try {
          const watcherData = await getFullWatcherData(id);
          if (watcherData && watcherData.watcherData && watcherData.watcherData.owner === ownerAddress) {
            validWatchers.push(id);
          }
        } catch (e) {
          console.warn(`⚠️ Watcher ${id} not found on-chain, removing from localStorage`);
        }
      }
      
      // Update localStorage with valid watchers only
      if (validWatchers.length !== watcherIds.length) {
        localStorage.setItem(localStorageKey, JSON.stringify(validWatchers));
      }
      
      console.log(`✅ Found ${validWatchers.length} valid watchers`);
      return validWatchers;
    }
    
    console.log('📭 No watchers found in localStorage');
    return [];
  } catch (error) {
    console.warn('⚠️ Failed to fetch watchers by owner:', error.message);
    return [];
  }
};

/**
 * Get counter value (for testing)
 * @returns {Promise<number>} Current counter value
 */
export const getCounter = async () => {
  try {
    const script = `
import WatcherRegistry from 0x0d2b623d26790e50

access(all) fun main(): UInt64 {
    return WatcherRegistry.getCounter()
}
    `;

    // Ensure FCL is ready
    if (!fcl || !fcl.query) {
      console.error('FCL query not available');
      return 0;
    }

    const result = await fcl.query({
      cadence: script,
    });

    return result;
  } catch (error) {
    console.error('Error fetching counter:', error);
    return 0;
  }
};

// ==========================================
// TELEGRAM INTEGRATION
// ==========================================

/**
 * Register watcher with Telegram notification service
 * @param {string} watcherId - The watcher ID
 * @param {Object} config - Telegram configuration
 * @returns {Promise<Object>} Registration result
 */
const registerWithTelegram = async (watcherId, config) => {
  const TELEGRAM_API_URL = 'http://localhost:3001/api/telegram/register-watcher';
  
  const payload = {
    watcherId: String(watcherId),
    botToken: config.botToken,
    notificationInterval: parseInt(config.notificationInterval) || 60,
    notifyOnAlert: config.notifyOnAlert !== false,
    notifyOnStatus: config.notifyOnStatus !== false,
    notifyOnError: config.notifyOnError !== false,
    watcherName: config.watcherName || 'Watcher',
    metric: config.metric || 'price',
    eventName: config.eventName || null, // Include event name for event watchers
    bountyType: config.bountyType || 'generic', // Include bounty type
    templateId: config.templateId || null
  };
  
  console.log('📤 Sending to Telegram API:', payload);
  
  const response = await fetch(TELEGRAM_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Telegram API error: ${errorText}`);
  }
  
  return await response.json();
};

// ==========================================
// TRANSACTIONS (State-changing operations)
// ==========================================

/**
 * Deploy a new watcher
 * @param {Object} params - Deployment parameters
 * @param {Object} telegramConfig - Optional Telegram notification config
 * @returns {Promise<Object>} Deployment result with transactionId, scheduledTxId, scheduleInfo
 */
export const deployWatcher = async ({
  targetSerial,
  priceLimit,
  scheduleDelay = 24.0,
  initialDelay = 5.0,
  executionEffort = 1000, // Reduced back to 1000 - testnet validated value
}, telegramConfig = null) => {
  try {
    // ==========================================
    // FULL SCHEDULED TRANSACTION - Deploy + Schedule
    // ==========================================
    // This uses the proper DeployCustomWatcher transaction
    // which includes scheduled execution fees
    const transaction = `
import FlowTransactionScheduler from 0x8c5303eaa26202d6
import WatcherRegistry from 0x0d2b623d26790e50
import CustomWatcherHandler from 0x0d2b623d26790e50
import FlowToken from 0x7e60df042a9c0868
import FungibleToken from 0x9a0766d93b6608b7

transaction(
    targetSerial: String,
    priceLimit: UFix64,
    scheduleDelay: UFix64,
    initialDelay: UFix64,
    executionEffort: UInt64
) {
    let watcherID: UInt64
    let ownerAddress: Address
    let feeVault: @FlowToken.Vault?
    let handlerCap: Capability<auth(FlowTransactionScheduler.Execute) &{FlowTransactionScheduler.TransactionHandler}>
    
    prepare(signer: auth(BorrowValue, Capabilities, SaveValue) &Account) {
        self.ownerAddress = signer.address
        
        // 1. Get FlowToken Vault reference to pay fees
        let vaultRef = signer.storage
            .borrow<auth(FungibleToken.Withdraw) &FlowToken.Vault>(from: /storage/flowTokenVault)
            ?? panic("Could not borrow FlowToken vault")

        // 2. Deploy new Watcher to registry
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
        
        // 4. Create or get handler capability
        log("🔑 Setting up handler capability...")
        
        // ⚠️ FIX: Handle type mismatch - old handler might be from different contract address
        // Strategy: Try to borrow first. If it works, type matches. If not, we need to handle error gracefully.
        let handlerStoragePath = /storage/CustomWatcherHandler
        
        // Try to borrow handler to check if it exists with correct type
        let existingHandler = signer.storage.borrow<&CustomWatcherHandler.Handler>(from: handlerStoragePath)
        
        if existingHandler != nil {
            log("✅ Handler already exists with correct type")
            // Handler exists and type matches - we're good, no need to create new one
        } else {
            // Handler doesn't exist OR type doesn't match
            // Check if something exists at that path
            if signer.storage.type(at: handlerStoragePath) != nil {
                // Something exists but type doesn't match - this is the type mismatch error
                log("❌ ERROR: Handler exists but with wrong type (type mismatch)")
                log("💡 This happens when contract address changed from 0x7ca8cd62e27bad20 to 0x0d2b623d26790e50")
                log("🔧 Solution: The old handler needs to be removed manually or via Flow CLI")
                panic("Handler type mismatch detected. Old handler was created with contract address 0x7ca8cd62e27bad20, but current contract is at 0x0d2b623d26790e50. Please clear the old handler from storage first. Contact support or use Flow CLI to remove /storage/CustomWatcherHandler")
            } else {
                // No handler exists - create new one
                log("📦 No handler found, creating new one...")
                let handler <- CustomWatcherHandler.createHandler()
                signer.storage.save(<-handler, to: handlerStoragePath)
                log("✅ New handler resource created and saved")
            }
        }
        
        // Issue capability with Execute entitlement
        self.handlerCap = signer.capabilities.storage
            .issue<auth(FlowTransactionScheduler.Execute) &{FlowTransactionScheduler.TransactionHandler}>(/storage/CustomWatcherHandler)
        
        log("✅ Handler capability issued")
    }

    execute {
        log("🚀 Starting execute phase...")
        
        // Verify fee vault is set
        assert(self.feeVault != nil, message: "Fee vault must be set before execute")
        log("✅ Fee vault is set")
        
        // Data for CustomWatcherHandler
        let execData = CustomWatcherHandler.WatcherExecutionData(
            watcherID: self.watcherID,
            ownerAddress: self.ownerAddress
        )
        log("✅ Execution data created for watcher ID: ".concat(self.watcherID.toString()))
        
        // Calculate scheduled timestamp
        let scheduledTime = getCurrentBlock().timestamp + initialDelay
        log("⏰ Scheduling for timestamp: ".concat(scheduledTime.toString()))
        
        // Verify capability one more time before scheduling
        assert(self.handlerCap.check(), message: "Handler capability became invalid")
        log("✅ Handler capability verified before scheduling")
        
        // Schedule first watcher execution
        log("📅 Calling FlowTransactionScheduler.schedule()...")
        let receipt <- FlowTransactionScheduler.schedule(
            handlerCap: self.handlerCap,
            data: execData,
            timestamp: scheduledTime,
            priority: FlowTransactionScheduler.Priority.Medium,
            executionEffort: executionEffort,
            fees: <- (self.feeVault!)
        )
        
        log("✅ Scheduled transaction created with ID: ".concat(receipt.id.toString()))
        destroy receipt

        log("✅ Watcher deployed with ID: ".concat(self.watcherID.toString()))
        log("📊 Target: ".concat(targetSerial))
        log("💰 Price Limit: ".concat(priceLimit.toString()))
        log("⏰ Scheduled to run at: ".concat(scheduledTime.toString()))
    }
}
    `;

    console.log('📤 Sending FULL scheduled transaction (with fees)...');
    console.log('  Target:', targetSerial);
    console.log('  Price Limit:', priceLimit, typeof priceLimit);
    console.log('  Schedule Delay:', scheduleDelay);
    console.log('  Initial Delay:', initialDelay);
    console.log('  Execution Effort:', executionEffort);
    
    // 🚨 VALIDATION: Check if priceLimit is valid (must be > 0 for price/transaction, can be 0 for events)
    if (isNaN(priceLimit) || priceLimit < 0) {
      console.error('❌ INVALID THRESHOLD VALUE!', {
        priceLimit,
        type: typeof priceLimit,
        isNaN: isNaN(priceLimit)
      });
      throw new Error(`Invalid threshold value: ${priceLimit}. Please select a valid threshold from the dropdown.`);
    }
    
    console.log('✅ Threshold validation passed:', priceLimit);
    
    // Check if user is authenticated
    console.log('🔐 Checking authentication...');
    
    // Ensure FCL is ready
    if (!fcl || !fcl.currentUser) {
      throw new Error('FCL is not initialized. Please refresh the page.');
    }
    
    const currentUser = await fcl.currentUser.snapshot();
    console.log('👤 Current user:', currentUser);
    
    if (!currentUser || !currentUser.addr) {
      throw new Error('User not authenticated. Please connect wallet first.');
    }
    
    console.log('✅ User authenticated:', currentUser.addr);
    
    // Ensure all numbers have proper decimal format
    const priceLimitFormatted = Number(priceLimit).toFixed(1);
    const scheduleDelayFormatted = Number(scheduleDelay).toFixed(1);
    const initialDelayFormatted = Number(initialDelay).toFixed(1);
    
    console.log('📝 Preparing transaction with args:', {
      targetSerial,
      priceLimit: priceLimitFormatted,
      scheduleDelay: scheduleDelayFormatted,
      initialDelay: initialDelayFormatted,
      executionEffort
    });
    
    console.log('🚀 Calling fcl.mutate() with scheduled transaction...');
    console.log('💰 User will need to approve FLOW withdrawal for scheduled execution fees');
    
    // Add timeout wrapper
    const mutatePromise = fcl.mutate({
      cadence: transaction,
      args: (arg, t) => [
        arg(targetSerial, t.String),
        arg(priceLimitFormatted, t.UFix64),
        arg(scheduleDelayFormatted, t.UFix64),
        arg(initialDelayFormatted, t.UFix64),
        arg(String(executionEffort), t.UInt64),
      ],
      proposer: fcl.authz,
      payer: fcl.authz,
      authorizations: [fcl.authz],
      limit: 9999,
    });
    
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Transaction timeout after 30 seconds')), 30000)
    );
    
    const txId = await Promise.race([mutatePromise, timeoutPromise]);

    // Validate transaction ID
    if (!txId) {
      throw new Error('Transaction ID is missing. Transaction may have failed.');
    }

    console.log('✅ Deploy transaction submitted:', txId);

    // Wait for transaction to be sealed
    const result = await fcl.tx(txId).onceSealed();
    console.log('✅ Deploy transaction sealed:', result);
    console.log('📋 Transaction ID (for FlowScan):', txId);
    console.log('📋 Transaction Status:', result.status);
    console.log('📋 Transaction Events:', result.events?.length || 0, 'events found');

    // Extract watcher ID from events
    const deployEvent = result.events.find(e => e.type.includes('WatcherDeployed'));
    const watcherId = deployEvent?.data?.watcherID;
    
    // Extract scheduled transaction ID from Scheduled event
    console.log('🔍 Looking for Scheduled event in transaction result...');
    console.log('📋 All events:', result.events?.map(e => e.type) || []);
    
    const scheduledEvent = result.events.find(e => 
      e.type.includes('FlowTransactionScheduler.Scheduled') || 
      e.type.includes('Scheduled')
    );
    
    if (scheduledEvent) {
      console.log('✅ Found Scheduled event:', scheduledEvent);
      console.log('📊 Scheduled event data:', scheduledEvent.data);
    } else {
      console.warn('⚠️ Scheduled event not found in transaction result');
    }
    
    // Extract all available fields from Scheduled event
    const scheduledTxId = scheduledEvent?.data?.id;
    const scheduledTimestamp = scheduledEvent?.data?.timestamp;
    const scheduleInfo = scheduledEvent ? {
      scheduledTxId: scheduledTxId?.toString(),
      scheduledTimestamp: scheduledTimestamp ? parseFloat(scheduledTimestamp) : null,
      priority: scheduledEvent.data?.priority,
      executionEffort: scheduledEvent.data?.executionEffort,
      fees: scheduledEvent.data?.fees ? parseFloat(scheduledEvent.data.fees) : null,
      handlerOwner: scheduledEvent.data?.transactionHandlerOwner,
      handlerTypeIdentifier: scheduledEvent.data?.transactionHandlerTypeIdentifier,
      handlerUUID: scheduledEvent.data?.transactionHandlerUUID?.toString(),
      handlerPublicPath: scheduledEvent.data?.transactionHandlerPublicPath
    } : null;
    
    if (scheduleInfo) {
      console.log('✅ Schedule info extracted:', scheduleInfo);
    } else {
      console.warn('⚠️ No schedule info extracted - scheduled event may be missing');
    }
    
    if (watcherId) {
      // Save transaction ID to localStorage for FlowScan link
      const txIdKey = `watcher_${watcherId}_transactionId`;
      localStorage.setItem(txIdKey, txId.toString());
      console.log(`💾 Saved transaction ID for watcher ${watcherId}:`, txId);
      
      // Save schedule info to localStorage for display in Manage page
      if (scheduleInfo) {
        const scheduleKey = `watcher_${watcherId}_scheduleInfo`;
        localStorage.setItem(scheduleKey, JSON.stringify(scheduleInfo));
        console.log(`💾 Saved schedule info for watcher ${watcherId}:`, scheduleInfo);
      }
      
      // Save to localStorage for tracking (workaround until contract update)
      if (!fcl || !fcl.currentUser) {
        console.warn('FCL not ready, skipping user snapshot');
        return;
      }
      const currentUser = await fcl.currentUser.snapshot();
      const ownerAddress = currentUser.addr;
      const localStorageKey = `watchers_${ownerAddress}`;
      const existingWatchers = JSON.parse(localStorage.getItem(localStorageKey) || '[]');
      
      if (!existingWatchers.includes(watcherId)) {
        existingWatchers.push(watcherId);
        localStorage.setItem(localStorageKey, JSON.stringify(existingWatchers));
        console.log(`💾 Saved watcher ID ${watcherId} to localStorage`);
      }
      
      // ✅ SAVE TARGET ASSET for price fetching
      const targetAssetKey = `watcher_${watcherId}_targetAsset`;
      localStorage.setItem(targetAssetKey, targetSerial);
      console.log(`💾 Saved watcher ${watcherId} targetAsset: ${targetSerial}`);
      
      // Save metric type to localStorage for dashboard display
      if (telegramConfig && telegramConfig.metric) {
        const metricKey = `watcher_${watcherId}_metric`;
        localStorage.setItem(metricKey, telegramConfig.metric);
        console.log(`💾 Saved watcher ${watcherId} metric: ${telegramConfig.metric}`);
      }
      
      // Save event name if it's an event watcher
      if (telegramConfig && telegramConfig.eventName) {
        const eventKey = `watcher_${watcherId}_eventName`;
        localStorage.setItem(eventKey, telegramConfig.eventName);
        console.log(`💾 Saved watcher ${watcherId} event: ${telegramConfig.eventName}`);
      }
      
      // Save bounty type for proper display
      if (telegramConfig && telegramConfig.bountyType) {
        const bountyKey = `watcher_${watcherId}_bountyType`;
        localStorage.setItem(bountyKey, telegramConfig.bountyType);
        console.log(`💾 Saved watcher ${watcherId} bounty type: ${telegramConfig.bountyType}`);
      }
      
      // Save template info for proper display in Manage page
      if (telegramConfig && telegramConfig.templateName) {
        const templateKey = `watcher_${watcherId}_template`;
        localStorage.setItem(templateKey, telegramConfig.templateName);
        console.log(`💾 Saved watcher ${watcherId} template: ${telegramConfig.templateName}`);
        
        // ✅ Also save as templateName (for consistency)
        const templateNameKey = `watcher_${watcherId}_templateName`;
        localStorage.setItem(templateNameKey, telegramConfig.templateName);
      }
      
      // ✅ Save templateId for CryptoKitties and other template-specific detection
      if (telegramConfig && telegramConfig.templateId) {
        const templateIdKey = `watcher_${watcherId}_templateId`;
        localStorage.setItem(templateIdKey, telegramConfig.templateId);
        console.log(`💾 Saved watcher ${watcherId} templateId: ${telegramConfig.templateId}`);
      }
      
      if (telegramConfig && telegramConfig.templateIcon) {
        const iconKey = `watcher_${watcherId}_icon`;
        localStorage.setItem(iconKey, telegramConfig.templateIcon);
        console.log(`💾 Saved watcher ${watcherId} icon: ${telegramConfig.templateIcon}`);
        
        // ✅ Also save as templateIcon (for consistency)
        const templateIconKey = `watcher_${watcherId}_templateIcon`;
        localStorage.setItem(templateIconKey, telegramConfig.templateIcon);
      }
      
      // Save watcher name for proper display in Manage page
      if (telegramConfig && telegramConfig.watcherName) {
        const nameKey = `watcher_${watcherId}_name`;
        localStorage.setItem(nameKey, telegramConfig.watcherName);
        console.log(`💾 Saved watcher ${watcherId} name: ${telegramConfig.watcherName}`);
      }
      
      // ✅ SAVE DEPLOYMENT TIMESTAMP for accurate uptime calculation
      const deployTimeKey = `watcher_${watcherId}_deployTime`;
      const deployTimestamp = Date.now() / 1000; // Unix timestamp in seconds
      localStorage.setItem(deployTimeKey, deployTimestamp.toString());
      console.log(`💾 Saved watcher ${watcherId} deployment time: ${deployTimestamp}`);
      
      // ✅ SAVE INITIAL DEPLOY LOG
      const initialLog = {
        timestamp: Date.now(),
        type: 'deploy',
        message: `🚀 Watcher deployed - Monitoring ${targetSerial} with ${telegramConfig?.metric || 'price'} metric`,
        data: {
          target: targetSerial,
          limit: priceLimit,
          metric: telegramConfig?.metric || 'price'
        }
      };
      const logsKey = `watcher_${watcherId}_logs`;
      localStorage.setItem(logsKey, JSON.stringify([initialLog]));
      console.log(`💾 Saved initial log for watcher ${watcherId}`);
      
      // 🔥 ALWAYS save template info to localStorage (even if Telegram is disabled)
      console.log('💾 Saving template metadata to localStorage...');
      console.log('  - Template Name:', telegramConfig?.templateName);
      console.log('  - Template Icon:', telegramConfig?.templateIcon);
      console.log('  - Watcher Name:', telegramConfig?.watcherName);
      console.log('  - Bounty Type:', telegramConfig?.bountyType);
    }

    // 🤖 Register with Telegram if enabled
    if (telegramConfig && telegramConfig.enabled && telegramConfig.botToken) {
      try {
        console.log('🤖 Registering watcher with Telegram service...');
        
        const finalWatcherId = watcherId || `watcher-${Date.now()}`;
        await registerWithTelegram(finalWatcherId, telegramConfig);
        
        console.log('✅ Telegram registration successful!');
      } catch (telegramError) {
        console.warn('⚠️  Telegram registration failed:', telegramError.message);
        // Don't throw - watcher is still deployed!
      }
    }

    // Validate transaction ID before returning
    if (!txId) {
      console.error('❌ CRITICAL: Transaction ID is missing!');
      throw new Error('Transaction deployment failed: No transaction ID received');
    }

    console.log('📤 Returning deployment result:', {
      transactionId: txId,
      watcherId: watcherId?.toString() || 'unknown',
      hasScheduleInfo: !!scheduleInfo,
      scheduleDelay: parseFloat(scheduleDelayFormatted)
    });

    // Return comprehensive deployment result
    return {
      transactionId: txId.toString(), // Ensure it's a string
      watcherId: watcherId?.toString() || null,
      scheduleInfo: scheduleInfo,
      scheduleDelay: parseFloat(scheduleDelayFormatted)
    };
  } catch (error) {
    console.error('Error deploying watcher:', error);
    throw error;
  }
};

/**
 * Initialize handler (should be done once per account)
 * @returns {Promise<string>} Transaction ID
 */
export const initializeHandler = async () => {
  try {
    const transaction = `
import FlowTransactionScheduler from 0x8c5303eaa26202d6
import CustomWatcherHandler from 0x0d2b623d26790e50

transaction {
    prepare(signer: auth(BorrowValue, IssueStorageCapabilityController, SaveValue, PublishCapability, UnpublishCapability) &Account) {
        let handlerStoragePath = /storage/CustomWatcherHandler
        let handlerPublicPath = /public/CustomWatcherHandler

        // Only create handler if it doesn't exist
        if signer.storage.borrow<&CustomWatcherHandler.Handler>(from: handlerStoragePath) == nil {
            let handler <- CustomWatcherHandler.createHandler()
            signer.storage.save(<-handler, to: handlerStoragePath)
            log("✅ Handler created and saved")
        } else {
            log("ℹ️  Handler already exists, skipping creation")
        }

        // Check if capability already exists
        let existingControllers = signer.capabilities.storage
            .getControllers(forPath: handlerStoragePath)
        
        var hasAuthCap = false
        for controller in existingControllers {
            if controller.capability.isInstance(Type<Capability<auth(FlowTransactionScheduler.Execute) &{FlowTransactionScheduler.TransactionHandler}>>()) {
                hasAuthCap = true
                break
            }
        }
        
        // Only issue new capability if doesn't exist
        if !hasAuthCap {
            let _ = signer.capabilities.storage
                .issue<auth(FlowTransactionScheduler.Execute) &{FlowTransactionScheduler.TransactionHandler}>(handlerStoragePath)
            log("✅ Auth capability issued")
        } else {
            log("ℹ️  Auth capability already exists")
        }

        // Unpublish old public capability if exists
        if signer.capabilities.get<&{FlowTransactionScheduler.TransactionHandler}>(handlerPublicPath).check() {
            signer.capabilities.unpublish(handlerPublicPath)
        }
        
        // Issue and publish new public capability
        let publicCap = signer.capabilities.storage
            .issue<&{FlowTransactionScheduler.TransactionHandler}>(handlerStoragePath)
        
        signer.capabilities.publish(publicCap, at: handlerPublicPath)
        
        log("✅ CustomWatcherHandler successfully initialized")
    }
}
    `;

    // Ensure FCL is ready
    if (!fcl || !fcl.mutate) {
      throw new Error('FCL mutate is not available. Please refresh the page.');
    }
    
    const txId = await fcl.mutate({
      cadence: transaction,
      proposer: fcl.authz,
      payer: fcl.authz,
      authorizations: [fcl.authz],
      limit: 9999,
    });
    
    if (!fcl || !fcl.tx) {
      throw new Error('FCL tx is not available.');
    }
    const result = await fcl.tx(txId).onceSealed();
    console.log('✅ Handler initialized:', result);

    return txId;
  } catch (error) {
    console.error('⚠️ Handler initialization error:', error);
    // Don't throw - might already be initialized
    return null;
  }
};

// ==========================================
// EVENT LISTENERS
// ==========================================

/**
 * Subscribe to watcher events
 * @param {Function} callback - Called when event is detected
 * @returns {Function} Unsubscribe function
 */
export const subscribeToWatcherEvents = (callback) => {
  // Subscribe to WatcherRegistry events
  const eventTypes = [
    'A.f8d6e0586b0a20c7.WatcherRegistry.WatcherDeployed',
    'A.f8d6e0586b0a20c7.WatcherRegistry.WatcherUpdated',
    'A.f8d6e0586b0a20c7.WatcherRegistry.PriceLimitReached',
    'A.f8d6e0586b0a20c7.WatcherRegistry.VolatilityUpdated',
  ];

  // FCL doesn't have built-in event subscription yet
  // For now, we'll poll for events
  const pollInterval = setInterval(async () => {
    // This is a simplified version
    // In production, you'd want to use Flow's event API
    try {
      // Query recent events
      // This is placeholder - actual implementation would query Flow event API
      callback({
        type: 'poll',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error polling events:', error);
    }
  }, 5000); // Poll every 5 seconds

  // Return unsubscribe function
  return () => clearInterval(pollInterval);
};

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Format transaction result for display
 * @param {Object} txResult - Transaction result from FCL
 * @returns {Object} Formatted result
 */
export const formatTransactionResult = (txResult) => {
  return {
    status: txResult.status === 4 ? 'SEALED' : 'PENDING',
    txId: txResult.transactionId,
    events: txResult.events || [],
    error: txResult.errorMessage || null,
  };
};

/**
 * Parse watcher data for frontend display
 * @param {Object} rawData - Raw data from blockchain
 * @returns {Object} Formatted watcher data
 */
export const parseWatcherData = (rawData) => {
  if (!rawData || !rawData.watcherData) {
    return null;
  }

  return {
    id: rawData.watcherData.watcherID,
    targetAsset: rawData.watcherData.targetSerial,
    priceLimit: parseFloat(rawData.watcherData.priceLimit),
    scheduleDelay: parseFloat(rawData.watcherData.scheduleDelay),
    isActive: rawData.watcherData.isActive,
    owner: rawData.watcherData.owner,
    currentPrice: rawData.currentPrice ? parseFloat(rawData.currentPrice) : null,
    volatilityScore: rawData.volatilityScore ? parseFloat(rawData.volatilityScore) : null,
    priceHistory: rawData.priceHistory || [],
  };
};

export default {
  getFullWatcherData,
  getWatchersByOwner,
  getCounter,
  deployWatcher,
  initializeHandler,
  subscribeToWatcherEvents,
  formatTransactionResult,
  parseWatcherData,
};

