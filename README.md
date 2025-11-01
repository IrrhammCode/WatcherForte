# 🎯 WatcherForte - Autonomous Price Monitoring/Event/etc Platform
**Built on Flow blockchain using Forte's Scheduled Transactions (FLIP-330)**

> 🚀 **Forte Hacks 2025 Submission** - Autonomous NFT/Token price monitoring with on-chain automation  
> ⚡ **Powered by Forte** - Flow's network upgrade enabling native scheduled transactions  
> 🔗 **Deployed on Flow Testnet** - Production-ready smart contracts  
> 📺 **Video Demo:** [Watch on X/Twitter](https://x.com/BabyBoomWeb3/status/1984466868749681004)  
> 🐦 **Social Media:** [View Post](https://x.com/BabyBoomWeb3/status/1984466868749681004) - Tags @flow_blockchain #ForteHacks

**Network:** Flow Testnet  
**Submission Type:** Fresh Code (Built from scratch during Forte Hacks 2025)

---


## 🚀 What is WatcherForte?

WatcherForte is a production-ready NFT monitoring platform built on Flow blockchain that:
- ✅ Monitors NFT prices automatically using scheduled transactions
- ✅ Sends alerts when price limits are reached
- ✅ Calculates volatility metrics for analytics
- ✅ Provides interactive dashboard with Dune Analytics integration
- ✅ Supports guest mode for easy onboarding

---

## 🌊 Built on Flow with Forte

**✅ This project is built on Flow blockchain.**

Flow is one of the fastest growing developer networks in 2025, and the number 1 choice for builders at hackathons all over the world. Flow has a unique multi-role architecture that ensures high transaction speed, near-instant finality, and MEV-resistance, enabling responsive, consumer-scale crypto applications.

**What is Forte?**

Forte is the Flow network upgrade that brings composability and automation natively to Flow. Two new primitives, Actions and Workflows, let developers compose reusable, protocol-agnostic workflows with onchain time-based triggers. Forte lets builders get an edge with new features, like standardized DeFi actions, **scheduled transactions**, and onchain workflows.

**WatcherForte leverages Forte's Scheduled Transactions (FLIP-330)** to enable fully on-chain automation without external cron jobs or services. Every price check is executed as a scheduled transaction on the Flow blockchain.

### 🏗️ Deployed Smart Contracts

**Network:** Flow Testnet

WatcherForte uses the following smart contracts deployed on Flow Testnet:

| Contract Name | Contract Address | Description |
|---------------|------------------|-------------|
| **WatcherRegistry** | `0x0d2b623d26790e50` | Core registry for all user-defined watchers, price oracle, and execution logic |
| **CustomWatcherHandler** | `0x0d2b623d26790e50` | Forte Transaction Scheduler handler for automated watcher execution |

**Explorer Links:**
- **WatcherRegistry** - [View Contract](https://testnet.flowscan.io/contract/A.0d2b623d26790e50.CustomWatcherHandler)
- **CustomWatcherHandler** - [View Contract](https://testnet.flowscan.io/contract/A.0d2b623d26790e50.CustomWatcherHandler)
- **Scheduled Transaction Example:** [View Scheduled Transaction #35632](https://testnet.flowscan.io/transaction/89f47761fcadcef9cc2e3f3861cb4382da47ddb85ead9e987ab0606cb8cdd1ca)

**Key Contract Features:**
- ✅ Automated price monitoring via scheduled transactions (Forte)
- ✅ Price oracle integration for real-time data
- ✅ Volatility calculation and tracking
- ✅ Price history storage on-chain
- ✅ Emergency execution capabilities
- ✅ Fractionalization status tracking

---

## 🏆 Forte Hacks 2025 Submission

**About Forte Hacks 2025**

From October 1-31st, this global hackathon invites hackers, creators, and Web3 developers to push the boundaries of smart contract automation, DeFi primitives, and user-centric killer applications to win a share of **$250,000 in bounties and prizes**.

Supported by a range of partners, like Dune, Quicknode, Moonpay, Dapper Labs, Thirdweb, Privy, Crossmint and more, the Forte Hacks hackathon has 5 core tracks - including exclusive bounties for building with partner applications.

**WatcherForte Submission Details:**

- **Submission Type:** Fresh Code (Built from scratch during Forte Hacks 2025)
- **Vibe Coded:** ✅ Yes - This project was vibe coded during Forte Hacks 2025, utilizing Flow AI tools and resources throughout the development process
- **Network:** Flow Testnet
- **Video Demo:** [Watch on X/Twitter](https://x.com/BabyBoomWeb3/status/1984466868749681004)
- **GitHub Repository:** This repository (public)
- **Social Media Post:** [View Post](https://x.com/BabyBoomWeb3/status/1984466868749681004) - Tags @flow_blockchain with #ForteHacks

### Bounties We're Competing In

WatcherForte is competing in multiple Forte Hacks challenges:

### 🥊 KittyPunch: Build on $FROTH Challenge
- **Prize:** $1,000 USDC
- **Focus:** Social/Community Tool + Utility Application
- **Features:** Track $FROTH price, volume, and community metrics
- **Data Source:** GeckoTerminal API + Flow Events

### 🏀 aiSports: Best Integration of $JUICE & Fantasy Sports
- **Prize:** $1,000 USDC Prize Pool
- **Focus:** Token Integration + Community Tools
- **Features:** Monitor $JUICE token & aiSports NFT marketplace
- **Data Source:** Find Labs API
- **Special Metrics:** Juice price, whale alerts, player stats, vault activity, NFT marketplace

### 🏈 Dapper: Best Dapper Data & Insights Tool
- **Prize:** $7,000 USDC Prize Pool
- **Focus:** Real-time Analytics + Market Health Metrics
- **Templates:**
  - **NBA Top Shot Insights** - Real-time blockchain events & ownership tracking
  - **NFL ALL DAY Insights** - Transaction volume & ownership monitoring
  - **Disney Pinnacle Insights** - Floor price & sales tracking
- **Data Source:** Flow Blockchain (Find Labs API)

### ⚽ MFL: Best On-chain Football
- **Prize:** $1,000 USDC Prize
- **Focus:** Market & Economy Tools + Automation
- **Features:** Track MFL player NFTs, transfers, marketplace activity & competition results
- **Data Source:** MFL Contracts + Find Labs

### 🎨 Vibe Coded Project
- **Prize:** Daily prizes for best Building in Public posts
- **Our Submission:** ✅ WatcherForte was vibe coded during Forte Hacks 2025, utilizing Flow AI tools and resources throughout the development process
- **Building in Public:** Daily posts with `#ForteHacks` and `@flow_blockchain` throughout October 2025

---

## 🛠️ Tech Stack

- **Blockchain:** Flow (Cadence smart contracts)
- **Frontend:** React + Vite
- **Scheduling:** Flow Transaction Scheduler
- **Wallet:** FCL (Flow Client Library)
- **Analytics:** Dune Analytics integration
- **Blockchain Data API:** Find Labs API - Comprehensive Flow network data & insights

---

## 📡 Find Labs API Integration

WatcherForte leverages **Find Labs API** to provide real-time blockchain data and insights:

### Network Analytics & Insights
- **Network Statistics** - Total transactions, block height, epoch status, tokenomics
- **Transaction History** - 30-day transaction trends and historical data
- **Recent Activity** - Live feeds of latest blocks and transactions
- **Block Data** - Current block height and block information

### API Endpoints Used
- `/status/v1/flow/stat` - Blockchain statistics
- `/status/v1/count` - Network transaction counts
- `/status/v1/stat/trend` - Transaction trend data for charts
- `/status/v1/epoch/status` - Current epoch information
- `/status/v1/tokenomics` - Tokenomics statistics
- `/flow/v1/block` - Block data and latest block height
- `/flow/v1/transaction` - Transaction lists and details
- `/flow/v1/nft` - NFT collection information
- `/flow/v1/ft` - Fungible token data

### Features Powered by Find Labs
- ✅ **Insights Dashboard** - Comprehensive network analytics with real-time data
- ✅ **Transaction Charts** - 30-day transaction history visualization
- ✅ **Network Health Monitoring** - Live network statistics and metrics
- ✅ **Data Aggregation** - Automatic data processing and visualization

All data is fetched in real-time from Find Labs API with JWT authentication for secure access.

---

## 📦 What You Need

- Node.js v18+
- Flow CLI v2.7.1+
- Flow Testnet account with Flow tokens
- Environment variables configured (see [ENVIRONMENT_VARIABLES.md](ENVIRONMENT_VARIABLES.md))

---

## 🚀 Getting Started

### Prerequisites

1. **Flow Testnet Account**: Create an account on Flow Testnet and fund it with testnet FLOW tokens
2. **Environment Variables**: Set up your `.env` files (see [ENVIRONMENT_VARIABLES.md](ENVIRONMENT_VARIABLES.md))
3. **Telegram Bot Token**: Create a Telegram bot via [@BotFather](https://t.me/BotFather) for notifications

### Running the Application

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

**Telegram Notifier Service:**
```bash
cd telegram-notifier
npm install
npm start
# or with PM2 for background process:
npm run pm2:start
```

**Note:** WatcherForte is deployed and runs on **Flow Testnet**. All transactions and scheduled executions happen on the Flow Testnet blockchain.

---


## 📁 Project Structure

```
WatcherForte/
├── cadence/
│   ├── contracts/
│   │   ├── WatcherRegistry.cdc          # Deployed: 0x0d2b623d26790e50
│   │   ├── CustomWatcherHandler.cdc      # Deployed: 0x0d2b623d26790e50
│   │   └── Counter.cdc                   # Legacy demo (reference)
│   ├── transactions/
│   │   └── DeployCustomWatcher.cdc       # Main deployment transaction
│   └── scripts/
├── frontend/                              # React + Vite frontend
│   ├── src/
│   │   ├── components/                   # UI components
│   │   ├── services/                     # Blockchain & API services
│   │   └── config/                       # FCL configuration
│   └── public/
├── telegram-notifier/                     # Telegram bot service
│   ├── api-server.js                     # Express API server
│   ├── multi-bot-service.js              # Bot logic & monitoring
│   └── findlabs-api.js                  # Find Labs API integration
├── flow.json                              # Flow project configuration
└── README.md                              # This file
```

**Key Contracts:**
- **WatcherRegistry.cdc** - Deployed on Flow Testnet at `0x0d2b623d26790e50`
- **CustomWatcherHandler.cdc** - Deployed on Flow Testnet at `0x0d2b623d26790e50`


## 🔧 Additional CLI Commands

If you need to perform additional setup or management tasks:

**Install dependencies** (if you add new imports that require external contracts):
```bash
flow dependencies install
```

**Create new accounts**:
```bash
flow accounts create
```

**See all available CLI commands**: Check out the [Flow CLI Commands Overview](https://developers.flow.com/build/tools/flow-cli/commands)

## 🔨 Additional Resources

Here are some essential resources to help you learn more:

- **[Flow Documentation](https://developers.flow.com/)** - The official Flow Documentation is a great starting point for learning about [building](https://developers.flow.com/build/flow) on Flow.
- **[Cadence Documentation](https://cadence-lang.org/docs/language)** - Cadence is the native language for the Flow Blockchain. It is a resource-oriented programming language designed for developing smart contracts.
- **[Visual Studio Code](https://code.visualstudio.com/)** and the **[Cadence Extension](https://marketplace.visualstudio.com/items?itemName=onflow.cadence)** - Recommended IDE with syntax highlighting, code completion, and other features for Cadence development.
- **[Flow Clients](https://developers.flow.com/tools/clients)** - Clients available in multiple languages to interact with the Flow Blockchain.
- **[Block Explorers](https://developers.flow.com/ecosystem/block-explorers)** - Tools to explore on-chain data on Flow Testnet and Mainnet.
