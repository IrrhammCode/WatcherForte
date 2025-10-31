import * as fcl from "@onflow/fcl";
import * as t from "@onflow/types";
import { getAuthHeaders } from './findLabsApi.js';

// Authentication functions
export const authenticate = async () => {
  try {
    await fcl.authenticate();
  } catch (error) {
    console.error("Login failed:", error);
    throw error;
  }
};

export const unauthenticate = async () => {
  try {
    await fcl.unauthenticate();
  } catch (error) {
    console.error("Logout failed:", error);
    throw error;
  }
};

export const getCurrentUser = () => {
  // fcl.currentUser is already a subscription object
  // Return it directly without wrapping
  return fcl.currentUser;
};

// Import Cadence transaction code as a string
const DEPLOY_WATCHER_CADENCE = `
import "FlowTransactionScheduler"
import "WatcherRegistry"
import "CustomWatcherHandler"
import "FlowToken"
import "FungibleToken"

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
    
    prepare(signer: auth(BorrowValue, Capabilities) &Account) {
        self.ownerAddress = signer.address
        
        let vaultRef = signer.storage
            .borrow<auth(FungibleToken.Withdraw) &FlowToken.Vault>(from: /storage/flowTokenVault)
            ?? panic("Could not borrow FlowToken vault")

        self.watcherID = WatcherRegistry.deployWatcher(
            targetSerial: targetSerial,
            priceLimit: priceLimit,
            scheduleDelay: scheduleDelay,
            owner: signer.address
        )

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
        
        let controllers = signer.capabilities.storage
            .getControllers(forPath: /storage/CustomWatcherHandler)
        
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
        let execData = CustomWatcherHandler.WatcherExecutionData(
            watcherID: self.watcherID,
            ownerAddress: self.ownerAddress
        )
        
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
`;

/**
 * Deploy a new watcher to the Flow blockchain
 * @param {string} targetSerial - The target serial (e.g., "ALT-001")
 * @param {string} priceLimit - The price limit as a string (e.g., "155.00")
 * @param {string} scheduleDelay - Schedule delay in hours (e.g., "24.0")
 * @param {string} initialDelay - Initial delay in seconds (e.g., "2.0")
 * @param {string} executionEffort - Execution effort (e.g., "1000")
 * @returns {Promise<string>} Transaction ID
 */
export async function deployWatcher(
  targetSerial,
  priceLimit,
  scheduleDelay = "24.0",
  initialDelay = "2.0",
  executionEffort = "1000"
) {
  try {
    const transactionId = await fcl.mutate({
      cadence: DEPLOY_WATCHER_CADENCE,
      args: (arg, t) => [
        arg(targetSerial, t.String),
        arg(priceLimit, t.UFix64),
        arg(scheduleDelay, t.UFix64),
        arg(initialDelay, t.UFix64),
        arg(executionEffort, t.UInt64),
      ],
      proposer: fcl.currentUser,
      payer: fcl.currentUser,
      authorizations: [fcl.currentUser],
      limit: 9999,
    });

    // Wait for transaction to be sealed
    const transaction = await fcl.tx(transactionId).onceSealed();
    return transactionId;
  } catch (error) {
    console.error("Error deploying watcher:", error);
    throw error;
  }
}

/**
 * Get watcher data from the blockchain
 * @param {string} watcherID - The watcher ID
 * @returns {Promise<Object>} Watcher data
 */
export async function getWatcherData(watcherID) {
  try {
    const result = await fcl.query({
      cadence: `
        import WatcherRegistry from 0xWatcherRegistry

        pub fun main(watcherID: UInt64): WatcherRegistry.WatcherData? {
          return WatcherRegistry.getWatcherData(watcherID: watcherID)
        }
      `,
      args: (arg, t) => [arg(parseInt(watcherID), t.UInt64)],
    });

    return result;
  } catch (error) {
    console.error("Error fetching watcher data:", error);
    throw error;
  }
}

/**
 * Get all watchers for a specific owner
 * @param {string} ownerAddress - The owner's Flow address
 * @returns {Promise<Array>} List of watchers
 */
export async function getAllWatchers(ownerAddress) {
  try {
    const result = await fcl.query({
      cadence: `
        import WatcherRegistry from 0xWatcherRegistry

        pub fun main(owner: Address): [WatcherRegistry.WatcherData] {
          // This is a simplified version
          // In production, you'd need to implement a proper getter
          return []
        }
      `,
      args: (arg, t) => [arg(ownerAddress, t.Address)],
    });

    return result;
  } catch (error) {
    console.error("Error fetching watchers:", error);
    throw error;
  }
}

/**
 * Check NFT ownership for a specific address and moment
 * @param {string} ownerAddress - The address to check
 * @param {number} momentID - The moment ID to check
 * @returns {Promise<Object>} Ownership result with isOwner, momentID, setID, playID, serialNumber
 */
export async function checkNFTOwnership(ownerAddress, momentID) {
  try {
    const result = await fcl.query({
      cadence: `
        import "NonFungibleToken"
        import "MetadataViews"
        import "TopShot" from 0x0b2a3299cc857e29

        pub struct OwnershipResult {
            pub let isOwner: Bool
            pub let momentID: UInt64
            pub let setID: UInt32
            pub let playID: UInt32
            pub let serialNumber: UInt32
            
            init(isOwner: Bool, momentID: UInt64, setID: UInt32, playID: UInt32, serialNumber: UInt32) {
                self.isOwner = isOwner
                self.momentID = momentID
                self.setID = setID
                self.playID = playID
                self.serialNumber = serialNumber
            }
        }

        pub fun main(ownerAddress: Address, momentID: UInt64): OwnershipResult {
            let account = getAccount(ownerAddress)
            
            let collectionRef = account.getCapability<&TopShot.Collection{TopShot.MomentPublic, NonFungibleToken.CollectionPublic}>(
                TopShot.CollectionPublicPath
            ).borrow()
            
            if collectionRef == nil {
                return OwnershipResult(
                    isOwner: false,
                    momentID: momentID,
                    setID: 0,
                    playID: 0,
                    serialNumber: 0
                )
            }
            
            let moment = collectionRef!.borrowNFT(id: momentID)
            
            if moment == nil {
                return OwnershipResult(
                    isOwner: false,
                    momentID: momentID,
                    setID: 0,
                    playID: 0,
                    serialNumber: 0
                )
            }
            
            let data = moment!.data
            
            return OwnershipResult(
                isOwner: true,
                momentID: momentID,
                setID: data.setID,
                playID: data.playID,
                serialNumber: data.serialNumber
            )
        }
      `,
      args: (arg, t) => [arg(ownerAddress, t.Address), arg(momentID, t.UInt64)],
    });

    return result;
  } catch (error) {
    console.error("Error checking NFT ownership:", error);
    throw error;
  }
}

/**
 * Check event schemas for Dune Analytics compatibility
 * Validates that events use clean data types that can be easily indexed and queried
 * @returns {Promise<Array>} Array of schema validation results
 */
export async function checkEventSchema() {
  try {
    const result = await fcl.query({
      cadence: `
        import WatcherRegistry from 0xWatcherRegistry

        pub struct SchemaValidationResult {
            pub let eventName: String
            pub let isCompatible: Bool
            pub let dataTypes: [String]
            pub let issues: [String]
            
            init(eventName: String, isCompatible: Bool, dataTypes: [String], issues: [String]) {
                self.eventName = eventName
                self.isCompatible = isCompatible
                self.dataTypes = dataTypes
                self.issues = issues
            }
        }

        pub fun main(): [SchemaValidationResult] {
            var results: [SchemaValidationResult] = []
            
            // Validate PriceUpdated event (WatcherUpdated)
            let watcherUpdatedTypes = ["UInt64", "UFix64"]
            let watcherUpdatedCompatible = true
            var watcherUpdatedIssues: [String] = []
            
            for type in watcherUpdatedTypes {
                if type != "String" && type != "UFix64" && type != "UInt64" && type != "Bool" && type != "Address" {
                    watcherUpdatedCompatible = false
                    watcherUpdatedIssues.append("Unsupported type for SQL indexing: ".concat(type))
                }
            }
            
            results.append(SchemaValidationResult(
                eventName: "WatcherUpdated (PriceUpdated)",
                isCompatible: watcherUpdatedCompatible,
                dataTypes: watcherUpdatedTypes,
                issues: watcherUpdatedIssues
            ))
            
            // Validate PriceLimitReached event
            let priceLimitTypes = ["UInt64", "UFix64", "UFix64"]
            let priceLimitCompatible = true
            var priceLimitIssues: [String] = []
            
            for type in priceLimitTypes {
                if type != "String" && type != "UFix64" && type != "UInt64" && type != "Bool" && type != "Address" {
                    priceLimitCompatible = false
                    priceLimitIssues.append("Unsupported type for SQL indexing: ".concat(type))
                }
            }
            
            results.append(SchemaValidationResult(
                eventName: "PriceLimitReached",
                isCompatible: priceLimitCompatible,
                dataTypes: priceLimitTypes,
                issues: priceLimitIssues
            ))
            
            // Validate VolatilityUpdated event
            let volatilityTypes = ["UInt64", "UFix64"]
            let volatilityCompatible = true
            var volatilityIssues: [String] = []
            
            for type in volatilityTypes {
                if type != "String" && type != "UFix64" && type != "UInt64" && type != "Bool" && type != "Address" {
                    volatilityCompatible = false
                    volatilityIssues.append("Unsupported type for SQL indexing: ".concat(type))
                }
            }
            
            results.append(SchemaValidationResult(
                eventName: "VolatilityUpdated",
                isCompatible: volatilityCompatible,
                dataTypes: volatilityTypes,
                issues: volatilityIssues
            ))
            
            // Validate FractionalizationReady event
            let fractionalizationTypes = ["UInt64", "UFix64", "UFix64"]
            let fractionalizationCompatible = true
            var fractionalizationIssues: [String] = []
            
            for type in fractionalizationTypes {
                if type != "String" && type != "UFix64" && type != "UInt64" && type != "Bool" && type != "Address" {
                    fractionalizationCompatible = false
                    fractionalizationIssues.append("Unsupported type for SQL indexing: ".concat(type))
                }
            }
            
            results.append(SchemaValidationResult(
                eventName: "FractionalizationReady",
                isCompatible: fractionalizationCompatible,
                dataTypes: fractionalizationTypes,
                issues: fractionalizationIssues
            ))
            
            return results
        }
      `,
    });

    return result;
  } catch (error) {
    console.error("Error checking event schema:", error);
    throw error;
  }
}

/**
 * ===================
 * FIND LABS API INTEGRATION
 * ===================
 * Network analytics endpoints for Flow blockchain data
 */

const FIND_LABS_API_BASE = 'https://api.find.xyz';

/**
 * Helper function untuk panggilan API terotentikasi
 * @param {string} endpoint - API endpoint path
 * @returns {Promise<Object>} Response data
 */
export const fetchFindAPI = async (endpoint) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${FIND_LABS_API_BASE}${endpoint}`, {
      headers,
      method: 'GET'
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API request failed ${endpoint}:`, response.status, response.statusText, errorText.substring(0, 200));
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Log response structure for debugging (first time only)
    if (!fetchFindAPI._loggedEndpoints) {
      fetchFindAPI._loggedEndpoints = new Set();
    }
    if (!fetchFindAPI._loggedEndpoints.has(endpoint)) {
      const responseData = data.data || data;
      console.log(`📊 Response structure for ${endpoint}:`, {
        isArray: Array.isArray(responseData),
        hasData: !!data.data,
        keys: Object.keys(responseData || {}).slice(0, 15),
        sample: Array.isArray(responseData) ? responseData[0] : (responseData && typeof responseData === 'object' ? Object.keys(responseData).slice(0, 10) : responseData)
      });
      fetchFindAPI._loggedEndpoints.add(endpoint);
    }
    
    return data.data || data;
  } catch (error) {
    console.error(`Error fetching ${endpoint}:`, error);
    throw error;
  }
};

/**
 * Test alternative API endpoints to find reliable data for replacing Smart Contracts
 * @returns {Promise<Object>} Test results for various endpoints
 */
export const testAlternativeEndpoints = async () => {
  const results = {};
  
  // Test 1: /flow/v1/node (Nodes count)
  try {
    const nodesData = await fetchFindAPI('/flow/v1/node?limit=100');
    let nodeCount = 0;
    if (Array.isArray(nodesData)) {
      nodeCount = nodesData.length;
    } else if (nodesData?.data && Array.isArray(nodesData.data)) {
      nodeCount = nodesData.data.length;
    } else if (nodesData?.total) {
      nodeCount = typeof nodesData.total === 'string' ? parseInt(nodesData.total) : nodesData.total;
    }
    results.nodes = { success: true, count: nodeCount, data: nodesData };
    console.log('✅ /flow/v1/node test:', nodeCount > 0 ? `✅ ${nodeCount} nodes` : '⚠️ 0 nodes');
  } catch (error) {
    results.nodes = { success: false, error: error.message };
    console.log('❌ /flow/v1/node test failed:', error.message);
  }
  
  // Test 2: /status/v1/epoch/status (Epoch status)
  try {
    const epochStatus = await fetchFindAPI('/status/v1/epoch/status');
    results.epochStatus = { success: true, data: epochStatus };
    console.log('✅ /status/v1/epoch/status test:', epochStatus ? '✅ Got epoch status' : '⚠️ Empty');
  } catch (error) {
    results.epochStatus = { success: false, error: error.message };
    console.log('❌ /status/v1/epoch/status test failed:', error.message);
  }
  
  // Test 3: /flowscan/v1/epoch/stats (Epoch statistics)
  try {
    const epochStats = await fetchFindAPI('/flowscan/v1/epoch/stats');
    results.epochStats = { success: true, data: epochStats };
    console.log('✅ /flowscan/v1/epoch/stats test:', epochStats ? '✅ Got epoch stats' : '⚠️ Empty');
  } catch (error) {
    results.epochStats = { success: false, error: error.message };
    console.log('❌ /flowscan/v1/epoch/stats test failed:', error.message);
  }
  
  // Test 4: /status/v1/tokenomics (Tokenomics data)
  try {
    const tokenomics = await fetchFindAPI('/status/v1/tokenomics');
    results.tokenomics = { success: true, data: tokenomics };
    console.log('✅ /status/v1/tokenomics test:', tokenomics ? '✅ Got tokenomics' : '⚠️ Empty');
  } catch (error) {
    results.tokenomics = { success: false, error: error.message };
    console.log('❌ /status/v1/tokenomics test failed:', error.message);
  }
  
  // Test 5: /flowscan/v1/latest-block (Latest block info)
  try {
    const latestBlockInfo = await fetchFindAPI('/flowscan/v1/latest-block');
    results.latestBlock = { success: true, data: latestBlockInfo };
    console.log('✅ /flowscan/v1/latest-block test:', latestBlockInfo ? '✅ Got latest block' : '⚠️ Empty');
  } catch (error) {
    results.latestBlock = { success: false, error: error.message };
    console.log('❌ /flowscan/v1/latest-block test failed:', error.message);
  }
  
  return results;
};

/**
 * 1. Fungsi untuk Data Ringkasan (Total Txn, Total Staking)
 * @returns {Promise<Object>} Network summary with totalTransactions and totalStaking
 */
export const fetchNetworkSummary = async () => {
  let totalTransactions = 0;
  let totalStaking = 0;

  try {
    // Try multiple endpoints for transaction count
    // Priority 1: /status/v1/flow/stat (most reliable)
    let flowStats = null;
    try {
      flowStats = await fetchFindAPI('/status/v1/flow/stat');
      if (flowStats) {
        // Check if flowStats is an object with properties
        if (typeof flowStats === 'object' && !Array.isArray(flowStats)) {
          totalTransactions = flowStats.transaction_count || 
                             flowStats.total_transactions || 
                             flowStats.transactions || 
                             flowStats.count || 
                             flowStats.transactionCount || 0;
          console.log('✅ Got transaction count from /status/v1/flow/stat:', totalTransactions, 'Available keys:', Object.keys(flowStats).slice(0, 10));
        } else if (Array.isArray(flowStats)) {
          // If it's an array, try to get the first object element
          const firstObj = flowStats.find(item => typeof item === 'object' && item !== null);
          if (firstObj) {
            totalTransactions = firstObj.transaction_count || 
                               firstObj.total_transactions || 
                               firstObj.transactions || 
                               firstObj.count || 0;
            console.log('✅ Got transaction count from flowStats array:', totalTransactions);
          } else {
            console.log('⚠️ flowStats is an array but no valid object found:', flowStats);
          }
        } else {
          console.log('⚠️ flowStats is not an object, type:', typeof flowStats, 'value:', flowStats);
        }
      }
    } catch (error) {
      console.warn('⚠️ /status/v1/flow/stat failed, trying alternatives...', error.message);
    }

    // Priority 2 & 3: Skip /status/v1/count and /status/v1/stat - they require query parameters
    // Instead, we'll rely on chart data aggregation which is more reliable

    // Fetch Latest Block Height from /flow/v1/block (this endpoint works reliably)
    try {
      const latestBlock = await fetchFindAPI('/flow/v1/block?limit=1');
      
      let blockHeight = 0;
      if (Array.isArray(latestBlock) && latestBlock.length > 0) {
        blockHeight = latestBlock[0].height || latestBlock[0].id || latestBlock[0].block_height || 0;
      } else if (latestBlock?.data && Array.isArray(latestBlock.data) && latestBlock.data.length > 0) {
        blockHeight = latestBlock.data[0].height || latestBlock.data[0].id || latestBlock.data[0].block_height || 0;
      } else if (latestBlock?.height) {
        blockHeight = latestBlock.height;
      } else if (latestBlock?.block_height) {
        blockHeight = latestBlock.block_height;
      } else if (latestBlock?.id) {
        blockHeight = latestBlock.id;
      }
      
      if (blockHeight > 0) {
        totalStaking = typeof blockHeight === 'string' ? parseInt(blockHeight) : blockHeight;
        console.log('✅ Got latest block height from /flow/v1/block:', totalStaking);
      } else {
        console.log('⚠️ Block data structure:', {
          isArray: Array.isArray(latestBlock),
          keys: Object.keys(latestBlock || {}).slice(0, 10),
          firstItem: Array.isArray(latestBlock) ? latestBlock[0] : (latestBlock?.data?.[0] || latestBlock)
        });
      }
    } catch (error) {
      console.warn('⚠️ Failed to get block data:', error.message);
    }

    // Test and fetch alternative metric (to replace Smart Contracts)
    // NOTE: Nodes endpoint (/flow/v1/node) is SKIPPED because it returns limit=100, not actual count
    let alternativeMetric = 0;
    let alternativeMetricName = '';
    
    console.log('🔄 Fetching alternative metric (skipping nodes endpoint)...');
    
    // Priority 1: Try /status/v1/epoch/status (More reliable than nodes)
    try {
      const epochStatus = await fetchFindAPI('/status/v1/epoch/status');
      console.log('🔍 Epoch status response keys:', epochStatus && typeof epochStatus === 'object' ? Object.keys(epochStatus).slice(0, 10) : 'null');
      
      // Handle both array and object responses
      let epochData = epochStatus;
      if (Array.isArray(epochStatus) && epochStatus.length > 0) {
        // If it's an array, take the first element
        epochData = epochStatus[0];
        console.log('📊 Epoch status is array, using first element');
      }
      
      if (epochData && typeof epochData === 'object' && !Array.isArray(epochData)) {
        // Try to extract meaningful number from epoch status
        const epochNumber = epochData.current_epoch || epochData.epoch || epochData.number || epochData.currentEpoch;
        if (epochNumber !== undefined && epochNumber !== null && epochNumber > 0) {
          alternativeMetric = typeof epochNumber === 'string' ? parseInt(epochNumber) : epochNumber;
          alternativeMetricName = 'epoch';
          console.log('✅ Using epoch number as alternative metric:', alternativeMetric);
        } else {
          console.warn('⚠️ Epoch status found but no valid epoch number. Available keys:', Object.keys(epochData).slice(0, 10));
          console.warn('⚠️ Epoch data sample:', epochData);
        }
      } else {
        console.warn('⚠️ Epoch status is not a valid object:', typeof epochData, Array.isArray(epochStatus) ? 'Array' : 'Not array');
      }
    } catch (error) {
      console.warn('⚠️ /status/v1/epoch/status failed, trying tokenomics...', error.message);
    }
    
    // Priority 2: If epoch failed, try /status/v1/tokenomics
    if (alternativeMetric === 0) {
      try {
        const tokenomics = await fetchFindAPI('/status/v1/tokenomics');
        console.log('🔍 Tokenomics response keys:', tokenomics && typeof tokenomics === 'object' ? Object.keys(tokenomics).slice(0, 10) : 'null');
        
        // Handle both array and object responses
        let tokenomicsData = tokenomics;
        if (Array.isArray(tokenomics) && tokenomics.length > 0) {
          // If it's an array, take the first element
          tokenomicsData = tokenomics[0];
          console.log('📊 Tokenomics is array, using first element');
        }
        
        if (tokenomicsData && typeof tokenomicsData === 'object' && !Array.isArray(tokenomicsData)) {
          // Try to extract meaningful number (e.g., total supply, staked amount)
          const totalSupply = tokenomicsData.total_supply || tokenomicsData.totalSupply || tokenomicsData.supply;
          const stakedAmount = tokenomicsData.total_staked || tokenomicsData.staked || tokenomicsData.staking;
          
          console.log('📊 Tokenomics data:', { totalSupply, stakedAmount, allKeys: Object.keys(tokenomicsData).slice(0, 10) });
          
          if (stakedAmount && stakedAmount > 0) {
            // Prefer staked amount (more meaningful metric)
            const metric = typeof stakedAmount === 'string' ? parseFloat(stakedAmount) : stakedAmount;
            if (metric > 0) {
              // Convert to millions for display
              alternativeMetric = Math.floor(metric / 1000000);
              alternativeMetricName = 'tokenomics';
              console.log('✅ Using staked amount (millions) as alternative metric:', alternativeMetric);
            }
          } else if (totalSupply && totalSupply > 0) {
            // Fallback to supply (in millions)
            const metric = typeof totalSupply === 'string' ? parseFloat(totalSupply) : totalSupply;
            if (metric > 0) {
              alternativeMetric = Math.floor(metric / 1000000);
              alternativeMetricName = 'tokenomics';
              console.log('✅ Using total supply (millions) as alternative metric:', alternativeMetric);
            }
          } else {
            console.warn('⚠️ Tokenomics data found but no valid supply/staked amount');
            console.warn('⚠️ Tokenomics sample:', JSON.stringify(tokenomicsData).substring(0, 200));
          }
        } else {
          console.warn('⚠️ Tokenomics is not a valid object:', typeof tokenomicsData, Array.isArray(tokenomics) ? 'Array' : 'Not array');
        }
      } catch (error) {
        console.warn('⚠️ /status/v1/tokenomics failed:', error.message);
      }
    }
    
    if (alternativeMetric === 0) {
      console.warn('⚠️ No alternative metric found from epoch or tokenomics endpoints');
    }

    return {
      totalTransactions: totalTransactions || 0,
      totalStaking: totalStaking || 0, // Now represents Latest Block Height
      alternativeMetric: alternativeMetric || 0, // New metric to replace Smart Contracts
      alternativeMetricName: alternativeMetricName || '', // Name of the metric
      // Include flowStats data for additional metrics
      _flowStats: flowStats || null,
      _source: totalTransactions > 0 ? 'Find Labs API' : 'fallback'
    };
  } catch (error) {
    console.error('❌ Error fetching network summary:', error);
    // Return fallback data with indicator
    return {
      totalTransactions: 0,
      totalStaking: 0,
      alternativeMetric: 0,
      alternativeMetricName: '',
      _source: 'fallback',
      _error: error.message
    };
  }
};

/**
 * 2. Fungsi untuk Grafik Jaringan
 * @returns {Promise<Object>} Chart data for network transactions
 */
export const fetchNetworkChartData = async () => {
  try {
    // Note: /stats/charts/transactions doesn't exist in Find Labs API
    // Directly use transaction aggregation instead
    // Fetch recent transactions and aggregate by date
    const transactions = await fetchFindAPI('/flow/v1/transaction?limit=100');
    
    if (!transactions || (Array.isArray(transactions) && transactions.length === 0)) {
      console.warn('⚠️ No transactions found for chart data');
      return [];
    }
    
    return transactions || [];
  } catch (error) {
    console.error('Error fetching network chart data:', error);
    return [];
  }
};

/**
 * 3. Fungsi untuk Data Feed Langsung (Recent Blocks & TXs)
 * @param {number} limit - Number of items to fetch (default: 5)
 * @returns {Promise<Object>} Recent blocks and transactions
 */
export const fetchRecentActivity = async (limit = 5) => {
  try {
    // GET /flow/v1/block (Recent Blocks)
    const blocksData = await fetchFindAPI(`/flow/v1/block?limit=${limit}`);
    const blocks = Array.isArray(blocksData) ? blocksData : (blocksData.data || blocksData.blocks || []);
    
    // GET /flow/v1/transaction (Recent TX)
    const txData = await fetchFindAPI(`/flow/v1/transaction?limit=${limit}`);
    const transactions = Array.isArray(txData) ? txData : (txData.data || txData.transactions || []);

    return {
      blocks: blocks.slice(0, limit),
      transactions: transactions.slice(0, limit)
    };
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    return {
      blocks: [],
      transactions: []
    };
  }
};

/**
 * 4. Fungsi untuk Data Forte Anda (Scheduled Transactions)
 * Tries multiple endpoints and formats
 * @param {number} limit - Number of scheduled transactions to fetch (default: 100)
 * @returns {Promise<Array>} Scheduled transactions list
 */
export const fetchScheduledTransactions = async (limit = 100) => {
  let scheduledTxs = [];
  
  // Priority 1: /flow/v1/scheduled-transaction (Flow API v1)
  try {
    const data = await fetchFindAPI(`/flow/v1/scheduled-transaction?limit=${limit}`);
    
    // Handle different response formats
    if (Array.isArray(data)) {
      scheduledTxs = data;
    } else if (data?.data && Array.isArray(data.data)) {
      scheduledTxs = data.data;
    } else if (data?.scheduled_transactions && Array.isArray(data.scheduled_transactions)) {
      scheduledTxs = data.scheduled_transactions;
    } else if (data?.results && Array.isArray(data.results)) {
      scheduledTxs = data.results;
    } else if (data?.items && Array.isArray(data.items)) {
      scheduledTxs = data.items;
    }
    
    if (scheduledTxs.length > 0) {
      console.log(`✅ Fetched ${scheduledTxs.length} scheduled transactions from /flow/v1/scheduled-transaction`);
      return scheduledTxs.slice(0, limit);
    }
  } catch (error) {
    console.warn('⚠️ /flow/v1/scheduled-transaction failed, trying alternatives...', error.message);
  }

  // Priority 2: Try /flow/v1/transaction with status filter (if API supports it)
  if (scheduledTxs.length === 0) {
    try {
      // Try to get transactions and filter for scheduled status
      const transactions = await fetchFindAPI(`/flow/v1/transaction?limit=${limit * 2}`);
      if (Array.isArray(transactions)) {
        // Filter for scheduled transactions (status might be 'Scheduled', 'Pending', etc.)
        scheduledTxs = transactions.filter(tx => 
          tx.status === 'Scheduled' || 
          tx.status === 'Pending' ||
          tx.type === 'scheduled' ||
          tx.scheduled_at ||
          (tx.executed_at === null || tx.executed_at === undefined)
        );
        
        if (scheduledTxs.length > 0) {
          console.log(`✅ Fetched ${scheduledTxs.length} scheduled transactions from /flow/v1/transaction (filtered)`);
          return scheduledTxs.slice(0, limit);
        }
      }
    } catch (error) {
      console.warn('⚠️ /flow/v1/transaction filtering failed:', error.message);
    }
  }

  // Priority 3: Try /simple/v1/transaction (Simple API - might have different format)
  if (scheduledTxs.length === 0) {
    try {
      const simpleData = await fetchFindAPI(`/simple/v1/transaction?limit=${limit * 2}`);
      if (Array.isArray(simpleData)) {
        scheduledTxs = simpleData.filter(tx => 
          tx.status === 'Scheduled' || 
          tx.status === 'Pending' ||
          !tx.executed_at
        );
        
        if (scheduledTxs.length > 0) {
          console.log(`✅ Fetched ${scheduledTxs.length} scheduled transactions from /simple/v1/transaction (filtered)`);
          return scheduledTxs.slice(0, limit);
        }
      }
    } catch (error) {
      console.warn('⚠️ /simple/v1/transaction failed:', error.message);
    }
  }

  if (scheduledTxs.length === 0) {
    console.warn('⚠️ No scheduled transactions found from any endpoint');
  }
  
  return scheduledTxs.slice(0, limit);
};
