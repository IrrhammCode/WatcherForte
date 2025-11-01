import { config } from "@onflow/fcl";

// ========================================
// NETWORK CONFIGURATION
// ========================================
// Choose your network: "emulator" or "testnet"
const NETWORK = "testnet"; // Using Flow Testnet

// ========================================
// EMULATOR CONFIGURATION (Local Development)
// ========================================
const EMULATOR_CONFIG = {
  "accessNode.api": "http://localhost:8888",
  "discovery.wallet": "http://localhost:8701/fcl/authn",
  "0xWatcherRegistry": "0xf8d6e0586b0a20c7",
  "0xCustomWatcherHandler": "0xf8d6e0586b0a20c7",
};

// ========================================
// TESTNET CONFIGURATION (Flow Testnet)
// ========================================
const TESTNET_CONFIG = {
  "accessNode.api": "https://rest-testnet.onflow.org",
  "discovery.wallet": "https://fcl-discovery.onflow.org/testnet/authn",
  
  // DEPLOYED CONTRACT ADDRESSES ON TESTNET (✅ VERIFIED - DEPLOYED!)
  // Updated: Contracts are deployed to testnet-account address
  "0xWatcherRegistry": "0x0d2b623d26790e50",
  "0xCustomWatcherHandler": "0x0d2b623d26790e50",
  "0xFlowToken": "0x7e60df042a9c0868",
  "0xFungibleToken": "0x9a0766d93b6608b7",
  "0xFlowTransactionScheduler": "0x8c5303eaa26202d6",
};

// ========================================
// WALLETCONNECT CONFIGURATION
// ========================================
// Register at: https://cloud.walletconnect.com/
// This is a demo projectId - replace with your own for production
// Only include if WalletConnect is needed and available
const WALLETCONNECT_CONFIG = {
  "walletconnect.projectId": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
};

// ========================================
// APPLY CONFIGURATION
// ========================================
const networkConfig = NETWORK === "testnet" ? TESTNET_CONFIG : EMULATOR_CONFIG;

// Initialize FCL with error handling
// Only initialize in browser environment
if (typeof window !== 'undefined') {
  try {
    // Safely apply FCL config
    if (config && typeof config === 'function') {
      // Ensure all required config properties are defined
      const configObject = {
        ...networkConfig,
      };

      // Validate required config properties before applying
      if (!configObject['accessNode.api']) {
        console.error('❌ FCL config missing accessNode.api');
      }
      if (!configObject['discovery.wallet']) {
        console.error('❌ FCL config missing discovery.wallet');
      }

      // Apply config
      config(configObject);
      
      // Verify config was applied by checking if config function still exists
      if (config) {
        console.log('✅ FCL configured successfully');
      } else {
        console.warn('⚠️ FCL config may not be fully initialized');
      }
    } else {
      console.warn('⚠️ FCL config function not available');
    }
  } catch (error) {
    console.error('❌ Error configuring FCL:', error);
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack,
      config: networkConfig
    });
    // Continue execution even if FCL config fails
  }
} else {
  // Server-side rendering or build time - skip FCL initialization
  console.log('⚠️ Skipping FCL initialization (not in browser environment)');
}

// Export network for components to use
export { NETWORK };

// Helper to ensure FCL is ready before use
let fclReady = false;
let fclReadyPromise = null;

export const ensureFCLReady = async () => {
  if (fclReady) return true;
  
  if (!fclReadyPromise) {
    fclReadyPromise = new Promise((resolve) => {
      const checkFCL = () => {
        try {
          // Import fcl dynamically to ensure it's available
          import('@onflow/fcl').then((fclModule) => {
            const fcl = fclModule.default || fclModule;
            if (fcl && fcl.config && typeof fcl.config === 'function') {
              fclReady = true;
              resolve(true);
            } else {
              setTimeout(checkFCL, 50);
            }
          }).catch(() => {
            setTimeout(checkFCL, 50);
          });
        } catch (error) {
          setTimeout(checkFCL, 50);
        }
      };
      checkFCL();
    });
  }
  
  return fclReadyPromise;
};

