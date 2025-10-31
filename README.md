# 🎯 WatcherForte - NFT Price Monitoring Platform

**Automated NFT price monitoring with scheduled transactions on Flow blockchain.**

> 🚀 **Built for Forte Hacks 2025** - Winner of multiple Flow hackathon challenges  
> ⚡ Powered by **Forte** - Flow's native automation upgrade with scheduled transactions  
> 🔗 **Deployed on Flow Testnet** - Production-ready smart contracts

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

**WatcherForte is built on Flow blockchain using Forte's scheduled transactions.**

Flow is one of the fastest growing developer networks in 2025, and the number 1 choice for builders at hackathons all over the world. Forte is the Flow network upgrade that brings composability and automation natively to Flow. Two new primitives, Actions and Workflows, let developers compose reusable, protocol-agnostic workflows with onchain time-based triggers.

### 🏗️ Smart Contracts (Deployed on Flow Testnet)

WatcherForte uses the following smart contracts deployed on **Flow Testnet**:

| Contract | Address | Description |
|----------|---------|-------------|
| **WatcherRegistry** | `0x0d2b623d26790e50` | Core registry for all user-defined watchers, price oracle, and execution logic |
| **CustomWatcherHandler** | `0x0d2b623d26790e50` | Forte Transaction Scheduler handler for automated watcher execution |

**Contract Deployment Details:**
- **Network:** Flow Testnet
- **Deployment Address:** `0x0d2b623d26790e50`
- **Explorer Links:**
  - [WatcherRegistry on FlowScan](https://testnet.flowscan.org/account/0x0d2b623d26790e50)
  - [CustomWatcherHandler on FlowScan](https://testnet.flowscan.org/account/0x0d2b623d26790e50)

**Key Contract Features:**
- ✅ Automated price monitoring via scheduled transactions (Forte)
- ✅ Price oracle integration for real-time data
- ✅ Volatility calculation and tracking
- ✅ Price history storage on-chain
- ✅ Emergency execution capabilities
- ✅ Fractionalization status tracking

---

## 🏆 Forte Hacks 2025 Submission

WatcherForte is participating in **Forte Hacks 2025** (October 1-31st), a global hackathon inviting hackers, creators, and Web3 developers to push the boundaries of smart contract automation, DeFi primitives, and user-centric killer applications to win a share of **$250,000 in bounties and prizes**.

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
- **Our Submission:** WatcherForte was vibe coded during Forte Hacks 2025, utilizing Flow AI tools and resources throughout the development process

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
- PowerShell (Windows) or Bash (Mac/Linux)

---

## 🎮 Services That Run

| Service | What It Does | Port |
|---------|--------------|------|
| **Flow Emulator** | Local blockchain | 3569 |
| **FCL Dev Wallet** | Authentication | 8701 |
| **Frontend** | React dashboard | 5173 |

All started automatically with `.\start-all.ps1`

---

## 📖 Legacy Counter Demo

The original Scheduled Transactions demo (Counter increment) is preserved below for reference.

## Files used

- `cadence/contracts/Counter.cdc`
- `cadence/contracts/CounterTransactionHandler.cdc`
- `cadence/transactions/InitSchedulerManager.cdc`
- `cadence/transactions/InitCounterTransactionHandler.cdc`
- `cadence/transactions/ScheduleIncrementIn.cdc`
- `cadence/scripts/GetCounter.cdc`

## 1) Start the emulator with Scheduled Transactions

```bash
flow emulator --block-time 1s
```

Keep this running. Open a new terminal for the next steps.

## 2) Deploy contracts

```bash
flow project deploy --network emulator
```

This deploys `Counter` and `CounterTransactionHandler` (see `flow.json`).

## 3) Initialize the scheduler manager (if not already done)

The scheduler manager is now integrated into the scheduling transactions, so this step is optional. The manager will be created automatically when you schedule your first transaction.

If you want to initialize it separately:

```bash
flow transactions send cadence/transactions/InitSchedulerManager.cdc \
  --network emulator \
  --signer emulator-account
```

## 4) Initialize the handler capability

Saves a handler resource at `/storage/CounterTransactionHandler` and issues the correct capability for the scheduler.

```bash
flow transactions send cadence/transactions/InitCounterTransactionHandler.cdc \
  --network emulator \
  --signer emulator-account
```

## 5) Check the initial counter

```bash
flow scripts execute cadence/scripts/GetCounter.cdc --network emulator
```

Expected: `Result: 0`

## 6) Schedule an increment in ~2 seconds

Uses `ScheduleIncrementIn.cdc` to compute a future timestamp relative to the current block. This transaction will automatically create the scheduler manager if it doesn't exist.

```bash
flow transactions send cadence/transactions/ScheduleIncrementCounter.cdc \
  --network emulator \
  --signer emulator-account \
  --args-json '[
    {"type":"UFix64","value":"2.0"},
    {"type":"UInt8","value":"1"},
    {"type":"UInt64","value":"1000"},
    {"type":"Optional","value":null}
  ]'
```

Notes:

- Priority `1` = Medium. You can use `0` = High or `2` = Low.
- `executionEffort` must be >= 10 (1000 is a safe example value).
- With `--block-time 1s`, blocks seal automatically; after ~3 seconds your scheduled transaction should execute.
- The transaction uses the scheduler manager to track and manage the scheduled transaction.

## 7) Verify the counter incremented

```bash
flow scripts execute cadence/scripts/GetCounter.cdc --network emulator
```

Expected: `Result: 1`

## Troubleshooting

- Invalid timestamp error: use `ScheduleIncrementIn.cdc` with a small delay (e.g., 2.0) so the timestamp is in the future.
- Missing FlowToken vault: on emulator the default account has a vault; if you use a custom account, initialize it accordingly.
- Manager not found: The scheduler manager is automatically created in the scheduling transactions. If you see this error, ensure you're using the latest transaction files.
- More docs: see `/.cursor/rules/scheduledtransactions/index.md`, `agent-rules.mdc`, and `flip.md` in this repo.

## 📦 Project Structure

Your project has been set up with the following structure:

- `flow.json` – Project configuration and dependency aliases (string-imports)
- `/cadence` – Your Cadence code

Inside the `cadence` folder you will find:

- `/contracts` - This folder contains your Cadence contracts (these are deployed to the network and contain the business logic for your application)
  - `WatcherRegistry.cdc` - **Deployed on Testnet at `0x0d2b623d26790e50`** - Core watcher registry with price oracle and execution logic
  - `CustomWatcherHandler.cdc` - **Deployed on Testnet at `0x0d2b623d26790e50`** - Forte Transaction Scheduler handler
  - `Counter.cdc` - Legacy demo contract (for reference only)
  - `CounterTransactionHandler.cdc` - Legacy demo handler (for reference only)

- `/scripts` - This folder contains your Cadence scripts (read-only operations)
  - `GetCounter.cdc`

- `/transactions` - This folder contains your Cadence transactions (state-changing operations)
  - `IncrementCounter.cdc`
  - `ScheduleIncrementCounter.cdc`
  - `InitSchedulerManager.cdc`
  - `InitCounterTransactionHandler.cdc`

- `/tests` - This folder contains your Cadence tests (integration tests for your contracts, scripts, and transactions to verify they behave as expected)
  - `Counter_test.cdc`
  - `CounterTransactionHandler_test.cdc`


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
- **[Block Explorers](https://developers.flow.com/ecosystem/block-explorers)** - Tools to explore on-chain data. [Flowser](https://flowser.dev/) is a powerful block explorer for local development.
