import React, { useState } from 'react';
import * as fcl from '@onflow/fcl';
import * as t from '@onflow/types';
import { deployWatcher, initializeHandler } from '../../services/watcherService';
import './DeployModal.css';

// ========================================
// PREDEFINED THRESHOLD OPTIONS (DROPDOWNS)
// ========================================
const PRICE_LIMIT_OPTIONS = {
  kittypunch: [
    { value: '0.001', label: '$0.001 - Ultra Low' },
    { value: '0.005', label: '$0.005 - Very Low' },
    { value: '0.01', label: '$0.01 - Low' },
    { value: '0.05', label: '$0.05 - Medium Low' },
    { value: '0.10', label: '$0.10 - Medium' },
    { value: '0.25', label: '$0.25 - Medium High' },
    { value: '0.50', label: '$0.50 - High' },
    { value: '1.00', label: '$1.00 - Very High' },
    { value: '2.00', label: '$2.00 - Ultra High' },
  ],
  customFlowToken: [
    { value: '0.10', label: '$0.10 USD - Very Low' },
    { value: '0.50', label: '$0.50 USD - Low' },
    { value: '1.00', label: '$1.00 USD - Medium Low' },
    { value: '5.00', label: '$5.00 USD - Medium' },
    { value: '10.00', label: '$10.00 USD - Medium High' },
    { value: '25.00', label: '$25.00 USD - High' },
    { value: '50.00', label: '$50.00 USD - Very High' },
    { value: '100.00', label: '$100.00 USD - Ultra High' },
    { value: '250.00', label: '$250.00 USD - Extreme' },
  ],
  generic: [
    { value: '0.10', label: '0.10 FLOW - Very Low' },
    { value: '0.50', label: '0.50 FLOW - Low' },
    { value: '1.00', label: '1.00 FLOW - Medium Low' },
    { value: '5.00', label: '5.00 FLOW - Medium' },
    { value: '10.00', label: '10.00 FLOW - Medium High' },
    { value: '25.00', label: '25.00 FLOW - High' },
    { value: '50.00', label: '50.00 FLOW - Very High' },
    { value: '100.00', label: '100.00 FLOW - Ultra High' },
    { value: '250.00', label: '250.00 FLOW - Extreme' },
  ]
};

const TRANSACTION_COUNT_OPTIONS = [
  { value: '10', label: '10 transactions - Very Low Activity' },
  { value: '25', label: '25 transactions - Low Activity' },
  { value: '50', label: '50 transactions - Medium Activity' },
  { value: '100', label: '100 transactions - High Activity' },
  { value: '250', label: '250 transactions - Very High Activity' },
  { value: '500', label: '500 transactions - Extreme Activity' },
  { value: '1000', label: '1,000 transactions - Viral Activity' },
  { value: '5000', label: '5,000 transactions - Massive Activity' },
];

const EVENT_THRESHOLD_OPTIONS = {
  // For player stats (points, rebounds, etc)
  playerStats: [
    { value: '10', label: '10+ points/rebounds/assists' },
    { value: '20', label: '20+ points/rebounds/assists' },
    { value: '30', label: '30+ points/rebounds/assists' },
    { value: '40', label: '40+ points/rebounds/assists (Elite)' },
    { value: '50', label: '50+ points/rebounds/assists (Historic)' },
  ],
  // For $JUICE amounts
  juiceAmount: [
    { value: '100', label: '100 $JUICE' },
    { value: '500', label: '500 $JUICE' },
    { value: '1000', label: '1,000 $JUICE' },
    { value: '5000', label: '5,000 $JUICE' },
    { value: '10000', label: '10,000 $JUICE' },
    { value: '50000', label: '50,000 $JUICE (Whale)' },
  ],
  // For time-based (minutes)
  minutes: [
    { value: '5', label: '5 minutes' },
    { value: '10', label: '10 minutes' },
    { value: '30', label: '30 minutes' },
    { value: '60', label: '1 hour' },
    { value: '120', label: '2 hours' },
  ],
  // For percentage changes
  percentage: [
    { value: '5', label: '5% change' },
    { value: '10', label: '10% change' },
    { value: '20', label: '20% change' },
    { value: '30', label: '30% change' },
    { value: '50', label: '50% change (Major)' },
  ],
  // For streaks/milestones
  streaks: [
    { value: '3', label: '3 day streak' },
    { value: '7', label: '7 day streak' },
    { value: '14', label: '14 day streak' },
    { value: '30', label: '30 day streak' },
    { value: '100', label: '100 day streak (Legend)' },
  ],
  // Generic/default
  generic: [
    { value: '1', label: 'Any occurrence (no threshold)' },
    { value: '5', label: '5 or more' },
    { value: '10', label: '10 or more' },
    { value: '25', label: '25 or more' },
    { value: '50', label: '50 or more' },
    { value: '100', label: '100 or more' },
  ],
};

const WATCHER_TEMPLATES = [
  // ========== FORTE HACKS BOUNTY TEMPLATES ==========
  
  // 🥊 KittyPunch: Build on $FROTH Challenge (Social/Community Tool + Utility)
  {
    id: 'kittypunch-froth',
    name: 'KittyPunch $FROTH Tracker',
    description: '🏆 Track $FROTH price, volume, and community metrics',
    icon: '🥊',
    category: 'KittyPunch',
    bountyType: 'kittypunch',
    bountyPrize: '$1,000 USDC',
    defaultToken: 'FROTH',
    dataSource: 'GeckoTerminal API + Flow Events',
    bounty: true,
    // ✅ Only 3 metrics available for KittyPunch
    availableMetrics: ['price', 'transaction', 'event']
  },
  
  // 🏀 aiSports: Best Integration of $JUICE & Fantasy Sports
  {
    id: 'aisports-juice',
    name: 'aiSports $JUICE Tracker',
    description: '🏆 Monitor $JUICE token & aiSports NFT marketplace',
    icon: '🏀',
    category: 'aiSports',
    bountyType: 'aisports',
    bountyPrize: '$1,000 USDC Prize Pool',
    defaultToken: 'JUICE',
    dataSource: 'Find Labs API',
    bounty: true,
    // ✅ 5 custom metrics for aiSports ecosystem
    availableMetrics: ['juice-price', 'juice-whale', 'player-stats', 'vault-activity', 'nft-marketplace']
  },
  
  // 🏈 Dapper: Best Dapper Data & Insights Tool
  {
    id: 'dapper-nba',
    name: 'NBA Top Shot Insights',
    description: '🏆 Real-time NBA Top Shot blockchain events & ownership tracking',
    icon: '🏀',
    category: 'Dapper',
    bountyType: 'dapper-insights',
    bountyPrize: '$7,000 USDC Prize Pool',
    defaultAssetType: 'NBA Moment',
    dataSource: 'Flow Blockchain (Find Labs API)',
    bounty: true,
    // ✅ Only metrics with real data from Find Labs API
    availableMetrics: ['event', 'transaction', 'ownership'],
    recommendedMetrics: {
      event: {
        label: '⚡ Moment Events',
        description: 'Track Moment minting, transfers, and set releases',
        default: true
      },
      transaction: {
        label: '📊 Transaction Volume',
        description: 'Monitor NBA Top Shot marketplace activity',
        default: false
      },
      ownership: {
        label: '👤 Ownership Changes',
        description: 'Alert when specific Moments change owners',
        default: false
      }
    }
  },
  {
    id: 'dapper-nfl',
    name: 'NFL ALL DAY Insights',
    description: '🏆 Real-time NFL ALL DAY blockchain events & ownership tracking',
    icon: '🏈',
    category: 'Dapper',
    bountyType: 'dapper-insights',
    bountyPrize: '$7,000 USDC Prize Pool',
    defaultAssetType: 'NFL Moment',
    dataSource: 'Flow Blockchain (Find Labs API)',
    bounty: true,
    // ✅ Only metrics with real data from Find Labs API
    // Removed 'event' per request – keep transaction and ownership only
    availableMetrics: ['transaction', 'ownership'],
    recommendedMetrics: {
      event: {
        label: '⚡ Moment Events',
        description: 'Track Moment minting, deposits/withdraws, and set updates',
        default: true
      },
      transaction: {
        label: '📊 Transaction Volume',
        description: 'Monitor NFL ALL DAY contract activity',
        default: false
      },
      ownership: {
        label: '👤 Ownership Changes',
        description: 'Alert when specific Moments change owners',
        default: false
      }
    }
  },
  {
    id: 'disney-pinnacle',
    name: 'Disney Pinnacle Insights',
    description: '🏆 Monitor Disney Pinnacle Pins floor price & sales',
    icon: '✨',
    category: 'Dapper',
    bountyType: 'dapper-insights',
    bountyPrize: '$7,000 USDC Prize Pool',
    defaultAssetType: 'Disney Pin',
    dataSource: 'Find Labs API',
    bounty: true,
    // Enable floor price and sales tracking
    availableMetrics: ['nft-floor', 'transaction'],
  },
  {
    id: 'cryptokitties-meowcoins',
    name: 'CryptoKitties MeowCoins Tracker',
    description: '🏆 Track MeowCoins price, whale movements & CryptoKitties NFT marketplace',
    icon: '😺',
    category: 'Dapper',
    bountyType: 'dapper-insights',
    bountyPrize: '$7,000 USDC Prize Pool',
    defaultAssetType: 'MeowCoin',
    dataSource: 'Find Labs API + CryptoKitties API',
    bounty: true,
    // ✅ Metrics supported by Find Labs API (Token + NFT)
    availableMetrics: ['price', 'transaction', 'balance', 'ownership', 'nft-floor'],
    recommendedMetrics: {
      price: {
        label: '💰 MeowCoin Price Tracking',
        description: 'Monitor MeowCoin token price against thresholds',
        default: true
      },
      transaction: {
        label: '🐋 Whale Alert & Sales Tracking',
        description: 'Track large MeowCoin transfers & NFT marketplace activity',
        default: false
      },
      balance: {
        label: '💳 Balance Change',
        description: 'Monitor wallet MeowCoin balance changes',
        default: false
      },
      ownership: {
        label: '👤 CryptoKitties NFT Ownership',
        description: 'Track CryptoKitties NFT ownership transfers',
        default: false
      },
      'nft-floor': {
        label: '📉 CryptoKitties Floor Price',
        description: 'Track CryptoKitties NFT collection floor price',
        default: false
      }
    }
  },
  
  // ⚽ MFL: Best On-chain Football
  {
    id: 'mfl-player',
    name: 'MFL Player Tracker',
    description: '🏆 Track MFL player NFTs, transfers, marketplace activity & competition results',
    icon: '⚽',
    category: 'MFL',
    bountyType: 'mfl',
    bountyPrize: '$1,000 USDC Prize',
    defaultAssetType: 'MFL Player',
    dataSource: 'MFL Contracts + Find Labs',
    bounty: true,
    // ✅ Metrics aligned with MFL bounty requirements
    availableMetrics: ['ownership', 'transaction', 'nft-floor', 'event'],
    recommendedMetrics: {
      ownership: {
        label: '👤 Player Ownership Transfer',
        description: 'Track when MFL player NFTs change hands',
        default: true
      },
      transaction: {
        label: '📊 Marketplace Activity',
        description: 'Monitor MFL marketplace trading volume',
        default: false
      },
      'nft-floor': {
        label: '📉 Player Collection Floor Price',
        description: 'Track MFL player NFT collection floor price',
        default: false
      },
      event: {
        label: '⚡ Competition & Game Events',
        description: 'Monitor competition results, level ups, matches',
        default: false
      }
    }
  },
  
  // 🎨 Beezie: Best AI Integration (Task 1: Market Value Fetcher)
  {
    id: 'beezie-collectible',
    name: 'Beezie Market Value Fetcher',
    description: '🏆 Task 1: Auto-fetch collectible Fair Market Value from ALT.xyz using certificate serial numbers with 24h auto-update',
    icon: '🎨',
    category: 'Beezie',
    bountyType: 'beezie',
    bountyPrize: '$1,000 USDC Prize',
    defaultAssetType: 'Graded Card',
    dataSource: 'ALT.xyz + Beezie Marketplace',
    bounty: true,
    // ✅ Task 1: Focus on Price tracking only (Market Value Fetcher)
    availableMetrics: ['price'],
    recommendedMetrics: {
      price: {
        label: '💰 ALT.xyz Fair Market Value',
        description: 'Task 1: Fetch market value from ALT.xyz, extract from Beezie URLs, store on-chain, 24h auto-update',
        default: true
      }
    }
  },
  
  // ========== CUSTOM TEMPLATES ==========
  {
    id: 'custom-flow-token',
    name: 'Custom Flow Token',
    description: 'Track any Flow-based token price',
    icon: '💎',
    category: 'Custom',
    bountyType: 'generic',
  },
  {
    id: 'custom-asset',
    name: 'Custom Asset Tracker',
    description: 'Monitor any custom NFT or asset',
    icon: '🎯',
    category: 'Custom',
    bountyType: 'generic',
  },
];

// Predefined KittyPunch Game Events
const KITTYPUNCH_EVENTS = [
  {
    value: 'GameStarted',
    label: '🎮 Game Started',
    description: 'Player starts a new game session',
    parameters: ['playerId', 'gameMode']
  },
  {
    value: 'GameCompleted',
    label: '✅ Game Completed',
    description: 'Player finishes a game round',
    parameters: ['playerId', 'score', 'duration']
  },
  {
    value: 'HighScore',
    label: '🏆 High Score Achieved',
    description: 'New high score recorded',
    parameters: ['playerId', 'score', 'previousRecord']
  },
  {
    value: 'NFTMinted',
    label: '🎨 NFT Minted',
    description: 'New KittyPunch NFT created',
    parameters: ['tokenId', 'owner', 'rarity']
  },
  {
    value: 'RewardClaimed',
    label: '🎁 Reward Claimed',
    description: 'Player claims FROTH reward',
    parameters: ['playerId', 'amount', 'rewardType']
  },
  {
    value: 'AchievementUnlocked',
    label: '⭐ Achievement Unlocked',
    description: 'Player unlocks achievement',
    parameters: ['playerId', 'achievementId', 'achievementName']
  },
  {
    value: 'LevelUp',
    label: '📈 Level Up',
    description: 'Player advances to next level',
    parameters: ['playerId', 'newLevel', 'xpGained']
  },
  {
    value: 'BattleWon',
    label: '⚔️ Battle Won',
    description: 'Player wins PvP battle',
    parameters: ['winnerId', 'loserId', 'rewardAmount']
  },
  {
    value: 'ItemPurchased',
    label: '🛒 Item Purchased',
    description: 'Player buys in-game item',
    parameters: ['playerId', 'itemId', 'price']
  },
  {
    value: 'DailyLoginStreak',
    label: '📅 Daily Login Streak',
    description: 'Player maintains login streak',
    parameters: ['playerId', 'streakCount', 'bonusAmount']
  }
];

// 🏀 NBA Top Shot Events (Verified from Flow Blockchain)
const NBA_TOPSHOT_EVENTS = [
  {
    value: 'TopShot.MomentMinted',
    label: '🎨 Moment Minted',
    description: 'New NBA Top Shot Moment created',
    parameters: ['momentID', 'playID', 'setID'],
    thresholdHint: 'Track specific playID or setID'
  },
  {
    value: 'TopShot.Withdraw',
    label: '📤 Moment Withdrawn',
    description: 'Moment withdrawn from collection',
    parameters: ['id', 'from'],
    thresholdHint: 'Monitor specific Moment ID or wallet address'
  },
  {
    value: 'TopShot.Deposit',
    label: '📥 Moment Deposited',
    description: 'Moment deposited to collection',
    parameters: ['id', 'to'],
    thresholdHint: 'Track Moment deposits to specific wallet'
  },
  {
    value: 'TopShot.MomentDestroyed',
    label: '🔥 Moment Destroyed',
    description: 'NBA Top Shot Moment burned/destroyed',
    parameters: ['id'],
    thresholdHint: 'Alert when any Moment is destroyed'
  },
  {
    value: 'TopShot.SetCreated',
    label: '🎬 New Set Created',
    description: 'New NBA Top Shot set released',
    parameters: ['setID', 'series'],
    thresholdHint: 'Alert on new set launches'
  },
  {
    value: 'TopShot.SetLocked',
    label: '🔒 Set Locked',
    description: 'NBA Top Shot set locked (no more minting)',
    parameters: ['setID'],
    thresholdHint: 'Track when sets become limited edition'
  },
  {
    value: 'TopShot.PlayCreated',
    label: '⭐ New Play Added',
    description: 'New play/highlight added to Top Shot',
    parameters: ['playID', 'metadata'],
    thresholdHint: 'Alert when new plays are added'
  },
  {
    value: 'TopShot.MomentNFTBurned',
    label: '💎 Moment Burned',
    description: 'Moment removed from circulation',
    parameters: ['id', 'owner'],
    thresholdHint: 'Track rare Moment burns (increases scarcity)'
  },
  {
    value: 'TopShot.SeriesCreated',
    label: '🎯 New Series Launched',
    description: 'New NBA Top Shot series started',
    parameters: ['seriesID'],
    thresholdHint: 'Alert on new season launches'
  },
  {
    value: 'TopShot.MomentListed',
    label: '🏷️ Moment Listed for Sale',
    description: 'Moment listed on marketplace (if available)',
    parameters: ['momentID', 'price', 'seller'],
    thresholdHint: 'Minimum listing price threshold'
  }
];

// 🏈 NFL ALL DAY Events (pattern aligned with on-chain events)
const NFL_ALLDAY_EVENTS = [
  {
    value: 'AllDay.MomentMinted',
    label: '🎨 Moment Minted',
    description: 'New NFL ALL DAY Moment created',
    parameters: ['momentID', 'playID', 'setID'],
    thresholdHint: 'Track specific playID or setID'
  },
  {
    value: 'AllDay.Withdraw',
    label: '📤 Moment Withdrawn',
    description: 'Moment withdrawn from collection',
    parameters: ['id', 'from'],
    thresholdHint: 'Monitor specific Moment ID or wallet address'
  },
  {
    value: 'AllDay.Deposit',
    label: '📥 Moment Deposited',
    description: 'Moment deposited to collection',
    parameters: ['id', 'to'],
    thresholdHint: 'Track deposits to specific wallet'
  },
  {
    value: 'AllDay.MomentDestroyed',
    label: '🔥 Moment Destroyed',
    description: 'NFL ALL DAY Moment burned/destroyed',
    parameters: ['id'],
    thresholdHint: 'Alert when any Moment is destroyed'
  },
  {
    value: 'AllDay.SetCreated',
    label: '🎬 New Set Created',
    description: 'New NFL ALL DAY set released',
    parameters: ['setID', 'series'],
    thresholdHint: 'Alert on new set launches'
  },
  {
    value: 'AllDay.SetLocked',
    label: '🔒 Set Locked',
    description: 'NFL ALL DAY set locked (no more minting)',
    parameters: ['setID'],
    thresholdHint: 'Track when sets become limited edition'
  },
  {
    value: 'AllDay.PlayCreated',
    label: '⭐ New Play Added',
    description: 'New play/highlight added',
    parameters: ['playID', 'metadata'],
    thresholdHint: 'Alert when new plays are added'
  },
  {
    value: 'AllDay.SeriesCreated',
    label: '🎯 New Series Launched',
    description: 'New NFL ALL DAY series started',
    parameters: ['seriesID'],
    thresholdHint: 'Alert on new season launches'
  }
];

// ⚽ MFL (Meta Football League) Events - On-chain Football Events
const MFL_EVENTS = [
  {
    value: 'MFL.PlayerTransferred',
    label: '⚽ Player Transferred',
    description: 'MFL player NFT transferred between managers',
    parameters: ['playerId', 'from', 'to', 'price'],
    thresholdHint: 'Minimum transfer price (FLOW)'
  },
  {
    value: 'MFL.PlayerLevelUp',
    label: '📈 Player Level Up',
    description: 'Player leveled up (stats improved)',
    parameters: ['playerId', 'newLevel', 'oldLevel', 'statChanges'],
    thresholdHint: 'Target level threshold'
  },
  {
    value: 'MFL.MatchCompleted',
    label: '🎮 Match Completed',
    description: 'MFL match finished with results',
    parameters: ['matchId', 'homeClub', 'awayClub', 'score', 'winner'],
    thresholdHint: 'Track specific match results'
  },
  {
    value: 'MFL.CompetitionStarted',
    label: '🏆 Competition Started',
    description: 'New MFL competition/tournament started',
    parameters: ['competitionId', 'type', 'prizePool'],
    thresholdHint: 'Minimum prize pool (FLOW)'
  },
  {
    value: 'MFL.CompetitionEnded',
    label: '🏁 Competition Ended',
    description: 'MFL competition finished with winners',
    parameters: ['competitionId', 'winner', 'prizeDistributed'],
    thresholdHint: 'Track competition completion'
  },
  {
    value: 'MFL.ClubDelegated',
    label: '👔 Club Delegated',
    description: 'Club ownership delegated to another manager',
    parameters: ['clubId', 'owner', 'delegate', 'permissions'],
    thresholdHint: 'Track delegation events'
  },
  {
    value: 'MFL.PlayerListed',
    label: '🏷️ Player Listed for Sale',
    description: 'MFL player NFT listed on marketplace',
    parameters: ['playerId', 'price', 'seller'],
    thresholdHint: 'Minimum listing price (FLOW)'
  },
  {
    value: 'MFL.PlayerDelisted',
    label: '❌ Player Delisted',
    description: 'Player removed from marketplace (e.g., after level up)',
    parameters: ['playerId', 'reason'],
    thresholdHint: 'Track automatic delisting events'
  },
  {
    value: 'MFL.SwapExecuted',
    label: '🔄 Player Swap Executed',
    description: 'Direct player-for-player swap between managers',
    parameters: ['player1Id', 'player2Id', 'manager1', 'manager2'],
    thresholdHint: 'Track swap transactions'
  },
  {
    value: 'MFL.PrizeDistributed',
    label: '💰 Prize Distributed',
    description: 'Competition prize distributed to winners',
    parameters: ['competitionId', 'winner', 'amount'],
    thresholdHint: 'Minimum prize amount (FLOW)'
  }
];

// Predefined aiSports Events (Phase 1: MVP - Core Features)
const AISPORTS_EVENTS = [
  // ========================================
  // 🏀 PLAYER PERFORMANCE EVENTS
  // ========================================
  {
    value: 'PlayerScored',
    label: '🏀 Player Scored Points',
    description: 'Alert when your fantasy player scores in real NBA game',
    parameters: ['playerId', 'points', 'gameId'],
    thresholdHint: 'Minimum points (e.g., 25, 30, 40)'
  },
  {
    value: 'TripleDouble',
    label: '⭐ Triple-Double Achieved',
    description: 'Player gets triple-double (10+ in 3 stat categories)',
    parameters: ['playerId', 'points', 'rebounds', 'assists'],
    thresholdHint: 'No threshold needed (always alert)'
  },
  {
    value: 'PlayerInjured',
    label: '🚑 Player Injury Report',
    description: 'Critical alert when player is injured/unavailable',
    parameters: ['playerId', 'injuryStatus', 'expectedReturn'],
    thresholdHint: 'No threshold (always alert)'
  },
  {
    value: 'LineupScored',
    label: '🎯 Lineup Total Score',
    description: 'Your fantasy lineup collectively scores threshold',
    parameters: ['lineupId', 'totalPoints', 'playerCount'],
    thresholdHint: 'Minimum total score (e.g., 100, 150, 200)'
  },

  // ========================================
  // 💰 $JUICE TOKEN EVENTS
  // ========================================
  {
    value: 'JUICERewardClaimed',
    label: '💰 JUICE Reward Claimed',
    description: 'User claims $JUICE rewards from game/vault',
    parameters: ['userAddress', 'amount', 'source'],
    thresholdHint: 'Minimum $JUICE amount (e.g., 100, 500, 1000)'
  },
  {
    value: 'LargeJUICETransfer',
    label: '🐋 Large JUICE Transfer (Whale Alert)',
    description: 'Whale moves significant amount of $JUICE',
    parameters: ['fromAddress', 'toAddress', 'amount'],
    thresholdHint: 'Minimum $JUICE amount (e.g., 10000, 50000)'
  },
  {
    value: 'JUICEStaked',
    label: '🔒 JUICE Staked',
    description: 'User stakes $JUICE for rewards',
    parameters: ['userAddress', 'amount', 'duration'],
    thresholdHint: 'Minimum stake amount (e.g., 1000, 5000)'
  },

  // ========================================
  // 🏆 FAST BREAK VAULT EVENTS
  // ========================================
  {
    value: 'VaultOpened',
    label: '🏆 New Vault Opened',
    description: 'New Fast Break Vault contest starts',
    parameters: ['vaultId', 'prizePool', 'entryFee'],
    thresholdHint: 'Minimum prize pool (e.g., 1000, 5000 $JUICE)'
  },
  {
    value: 'VaultClosingSoon',
    label: '⏰ Vault Closing Soon',
    description: 'Vault closes in X minutes (last chance to enter)',
    parameters: ['vaultId', 'minutesRemaining', 'currentEntries'],
    thresholdHint: 'Minutes before close (e.g., 5, 10, 30)'
  },
  {
    value: 'VaultPayoutDistributed',
    label: '💸 Vault Payout Distributed',
    description: 'Winners receive their vault rewards',
    parameters: ['vaultId', 'winners', 'totalPayout'],
    thresholdHint: 'Minimum payout amount'
  },
  {
    value: 'VaultHighScore',
    label: '🎯 New Vault High Score',
    description: 'Someone takes the lead in vault leaderboard',
    parameters: ['vaultId', 'userAddress', 'score'],
    thresholdHint: 'No threshold (always interesting)'
  },

  // ========================================
  // 🎴 NFT EVENTS
  // ========================================
  {
    value: 'PlayerNFTMinted',
    label: '✨ Player NFT Minted',
    description: 'New player NFT card is minted',
    parameters: ['playerId', 'nftId', 'rarity'],
    thresholdHint: 'Rarity level (e.g., Legendary, Epic)'
  },
  {
    value: 'PlayerNFTSold',
    label: '💵 Player NFT Sold',
    description: 'Player NFT sold on marketplace',
    parameters: ['nftId', 'price', 'buyer', 'seller'],
    thresholdHint: 'Minimum sale price (e.g., 100, 500 $JUICE)'
  },
  {
    value: 'FloorPriceChanged',
    label: '📊 Floor Price Changed',
    description: 'Player NFT collection floor price moves significantly',
    parameters: ['playerId', 'oldFloor', 'newFloor', 'changePercent'],
    thresholdHint: 'Minimum % change (e.g., 10%, 20%)'
  },

  // ========================================
  // 🎮 ACHIEVEMENT/MILESTONE EVENTS
  // ========================================
  {
    value: 'UserAchievementUnlocked',
    label: '🏅 Achievement Unlocked',
    description: 'User unlocks rare achievement',
    parameters: ['userAddress', 'achievementId', 'rewardAmount'],
    thresholdHint: 'Achievement rarity (e.g., Rare, Legendary)'
  },
  {
    value: 'DailyStreakReward',
    label: '🔥 Daily Login Streak',
    description: 'User maintains daily login streak milestone',
    parameters: ['userAddress', 'streakDays', 'bonusReward'],
    thresholdHint: 'Minimum streak days (e.g., 7, 30, 100)'
  },
];

const DeployModal = ({ user, onClose, onSuccess }) => {
  const [currentStep, setCurrentStep] = useState(1);
  
  // Get saved bot token from localStorage
  const getSavedBotToken = () => {
    if (user?.addr) {
      // Try user-specific token first
      const userToken = localStorage.getItem(`telegram_bot_token_${user.addr}`);
      if (userToken) return userToken;
      
      // Fallback to default token
      const defaultToken = localStorage.getItem('telegram_bot_token_default');
      if (defaultToken) return defaultToken;
    }
    return '';
  };
  
  const [formData, setFormData] = useState({
    template: null,
    targetAsset: '',
    assetId: '',
    priceLimit: '',
    scheduleDelay: '24',
    scheduleUnit: 'hours',
    // NEW: Metric to Watch feature
    selectedMetric: 'price', // Default to price monitoring
    
    // Metric-specific fields (Original 4 metrics)
    eventName: '',
    eventParameter: '',
    txThreshold: '',
    txTimeWindow: '24',
    
    // NFT Floor Price fields
    collectionIdentifier: '',
    floorPriceLimit: '',
    
    // Token Balance Change fields
    walletAddress: '',
    tokenSymbol: '',
    balanceThreshold: '',
    balanceCondition: 'above', // 'above', 'below'
    
    // Staking Reward fields
    stakingWalletAddress: '',
    rewardType: 'delegation', // 'delegation', 'node'
    
    // 🤖 Telegram Notification fields
    enableTelegram: true, // ✅ Changed to true - auto-enable if bot token exists
    watcherName: '', // Custom name for the watcher
    telegramBotToken: getSavedBotToken(), // Auto-populate from settings
    notificationInterval: '60', // minutes
    notifyOnAlert: true,
    notifyOnStatus: true,
    notifyOnError: true,
  });
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployError, setDeployError] = useState(null);
  const [deploySuccess, setDeploySuccess] = useState(null);

  const steps = [
    { number: 1, title: 'Select Template', icon: '📋' },
    { number: 2, title: 'Configure Target', icon: '🎯' },
    { number: 3, title: 'Set Schedule', icon: '⏰' },
    { number: 4, title: 'Review & Deploy', icon: '🚀' },
  ];

  const handleTemplateSelect = (template) => {
    // Determine default metric for this template
    let defaultMetric = 'price'; // default fallback
    
    // If template has custom availableMetrics, use the first one as default
    if (template.availableMetrics && template.availableMetrics.length > 0) {
      defaultMetric = template.availableMetrics[0];
    }
    
    // Or if template has recommendedMetrics, find the one marked as default
    if (template.recommendedMetrics) {
      const defaultRecommended = Object.keys(template.recommendedMetrics).find(
        key => template.recommendedMetrics[key].default
      );
      if (defaultRecommended) {
        defaultMetric = defaultRecommended;
      }
    }
    
    setFormData({ 
      ...formData, 
      template,
      assetId: template.defaultToken || '',
      targetAsset: template.defaultAssetType || template.defaultToken || '',
      selectedMetric: defaultMetric,
    });
    setCurrentStep(2);
  };

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleNext = () => {
    // Validate Telegram fields if enabled (Step 3 → Step 4)
    if (currentStep === 3 && formData.enableTelegram) {
      if (!formData.telegramBotToken) {
        setDeployError('Please provide Bot Token for Telegram notifications');
        return;
      }
      
      // Basic token format validation
      if (!formData.telegramBotToken.includes(':')) {
        setDeployError('Invalid bot token format. Should look like: 1234567890:ABC...');
        return;
      }
      
      // Clear error if validation passed
      setDeployError(null);
      setDeploySuccess(null);
    }
    
    setCurrentStep((prev) => Math.min(prev + 1, 4));
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    setDeployError(null);
    setDeploySuccess(null);
  };

  const calculateScheduleInHours = () => {
    const { scheduleDelay, scheduleUnit } = formData;
    const delay = parseFloat(scheduleDelay) || 24.0;
    
    switch (scheduleUnit) {
      case 'hours':
        return delay;
      case 'days':
        return delay * 24.0;
      case 'weeks':
        return delay * 24.0 * 7.0;
      default:
        return 24.0;
    }
  };

  /**
   * Calculate estimated fees for scheduled transactions
   * 
   * TESTNET ACTUAL PRICING (from on-chain test):
   * - Fee per check: ~0.00125 FLOW (tested and confirmed on testnet)
   * - Based on executionEffort: 1000
   * - Priority: Medium (5x multiplier)
   * 
   * This is the REAL fee charged by FlowTransactionScheduler on testnet!
   */
  const calculateFeeEstimate = () => {
    // TESTNET: Actual measured fee from successful test transaction
    // Transaction ID: ebcc627a2730cb8e00e62a7d04746b5b6d089bfa572753b90a2d67706159ae30
    // Fee withdrawn: 0.00125644 FLOW
    const testnetFeePerCheck = 0.00126; // Actual testnet fee (rounded up)
    
    return testnetFeePerCheck;
  };
  
  /**
   * Calculate total cost for duration
   */
  const calculateTotalCost = () => {
    const scheduleHours = calculateScheduleInHours();
    const feePerExecution = calculateFeeEstimate();
    
    // Calculate number of executions based on duration
    const durations = {
      '1h': 1,
      '6h': 6,
      '12h': 12,
      '24h': 24,
      '7d': 24 * 7,
      '30d': 24 * 30
    };
    
    const executionsPerDuration = {};
    
    for (const [duration, hours] of Object.entries(durations)) {
      const numExecutions = Math.ceil(hours / scheduleHours);
      const totalCost = numExecutions * feePerExecution;
      executionsPerDuration[duration] = {
        executions: numExecutions,
        cost: totalCost.toFixed(5)
      };
    }
    
    return {
      feePerExecution: feePerExecution.toFixed(6),
      scheduleHours,
      durations: executionsPerDuration
    };
  };
  
  const estimateFee = () => {
    // Return fee for single execution (for backward compatibility)
    return calculateFeeEstimate().toFixed(6) + ' FLOW';
  };

  const handleDeploy = async () => {
    setIsDeploying(true);
    setDeployError(null);
    setDeploySuccess(null);

    try {
      const scheduleHours = calculateScheduleInHours();
      
      // 🐛 DEBUG: Log form data before deploy
      console.log('🔍 DEBUG - Form Data:', {
        priceLimit: formData.priceLimit,
        priceLimitParsed: parseFloat(formData.priceLimit),
        assetId: formData.assetId,
        selectedMetric: formData.selectedMetric,
        template: formData.template?.name
      });
      
      // Prepare Telegram config if enabled (also used for storing metadata)
      const telegramConfig = formData.enableTelegram ? {
        enabled: true,
        botToken: formData.telegramBotToken,
        notificationInterval: formData.notificationInterval,
        notifyOnAlert: formData.notifyOnAlert,
        notifyOnStatus: formData.notifyOnStatus,
        notifyOnError: formData.notifyOnError,
        watcherName: formData.watcherName || formData.template?.name || 'Watcher',
        metric: formData.selectedMetric || 'price',
        eventName: formData.eventName || null, // Store event type
        bountyType: formData.template?.bountyType || 'generic', // Store bounty type
        templateId: formData.template?.id || null, // Store template id for brand detection
        templateName: formData.template?.name || 'Custom Tracker', // Store template name
        templateIcon: formData.template?.icon || '📊' // Store template icon
      } : {
        // Even without Telegram, save metadata for proper dashboard display
        enabled: false,
        metric: formData.selectedMetric || 'price',
        eventName: formData.eventName || null,
        bountyType: formData.template?.bountyType || 'generic',
        templateId: formData.template?.id || null,
        templateName: formData.template?.name || 'Custom Tracker',
        templateIcon: formData.template?.icon || '📊'
      };
      
      // ✅ Map the correct value based on metric type
      let limitValue = 0.0;
      if (formData.selectedMetric === 'price') {
        limitValue = parseFloat(formData.priceLimit) || 0.0;
      } else if (formData.selectedMetric === 'transaction') {
        limitValue = parseFloat(formData.txThreshold) || 0.0;
      } else if (formData.selectedMetric === 'event') {
        limitValue = parseFloat(formData.eventParameter) || 1.0;
      } else if (['juice-price', 'juice-whale', 'player-stats', 'vault-activity', 'nft-marketplace'].includes(formData.selectedMetric)) {
        // aiSports metrics all use priceLimit field
        limitValue = parseFloat(formData.priceLimit) || 0.0;
      } else {
        limitValue = parseFloat(formData.priceLimit) || 0.0;
      }
      
      const deployParams = {
        targetSerial: formData.assetId || formData.targetAsset || 'WATCHER-' + Date.now(),
        priceLimit: limitValue,
        scheduleDelay: parseFloat(scheduleHours) || 24.0,
        initialDelay: 5.0, // First execution in 5 seconds
        executionEffort: 1000.0,
      };
      
      // 🐛 DEBUG: Log deployment params
      console.log('📤 DEBUG - Deploying with params:', deployParams);
      console.log('📤 DEBUG - Template info:', {
        templateName: formData.template?.name,
        templateIcon: formData.template?.icon,
        watcherName: formData.watcherName,
        bountyType: formData.template?.bountyType
      });
      
      // Deploy watcher using service layer
      const deployResult = await deployWatcher(deployParams, telegramConfig);

      console.log('✅ Watcher deployed! Result:', deployResult);

      // Validate deployment result
      if (!deployResult || !deployResult.transactionId) {
        console.error('❌ Deployment result missing transaction ID:', deployResult);
        setDeployError('Deployment completed but transaction ID is missing. Please check the transaction manually.');
        setIsDeploying(false);
        return;
      }

      console.log('📋 Deployment result:', {
        transactionId: deployResult.transactionId,
        scheduledTxId: deployResult.scheduleInfo?.scheduledTxId,
        watcherId: deployResult.watcherId
      });

      // Show success message with transaction links and schedule info
      setDeploySuccess({
        transactionId: deployResult.transactionId.toString(), // Ensure string
        scheduledTxId: deployResult.scheduleInfo?.scheduledTxId,
        scheduleDelay: deployResult.scheduleDelay,
        scheduledTimestamp: deployResult.scheduleInfo?.scheduledTimestamp,
        watcherId: deployResult.watcherId,
        // Include all schedule info fields for FlowScan-style display
        fees: deployResult.scheduleInfo?.fees,
        handlerOwner: deployResult.scheduleInfo?.handlerOwner,
        handlerTypeIdentifier: deployResult.scheduleInfo?.handlerTypeIdentifier,
        handlerUUID: deployResult.scheduleInfo?.handlerUUID,
        handlerPublicPath: deployResult.scheduleInfo?.handlerPublicPath,
        priority: deployResult.scheduleInfo?.priority,
        executionEffort: deployResult.scheduleInfo?.executionEffort
      });

      // Success - close modal and refresh after showing success message
      setTimeout(() => {
        onSuccess();
      }, 5000); // Give user time to see success message
      
    } catch (error) {
      console.error('Deploy error:', error);
      
      // Check if it's a handler not initialized error
      const isHandlerError = error.message && (
        error.message.includes('Handler capability not found') ||
        error.message.includes('Handler resource not found') ||
        error.message.includes('Please run InitHandler')
      );
      
      if (isHandlerError) {
        setDeployError(
          'Handler not initialized for your wallet. Initializing now... Please approve the transaction in your wallet.'
        );
        
        // Try to initialize handler
        try {
          console.log('🔧 Auto-initializing handler for wallet:', user.addr);
          await initializeHandler();
          setDeployError('✅ Handler initialized! Please try deploying your watcher again.');
        } catch (initError) {
          console.error('Handler init error:', initError);
          setDeployError('⚠️ Failed to initialize handler: ' + (initError.message || 'Unknown error'));
        }
      } else {
        setDeployError(
          error.message || 'Failed to deploy watcher. Please try again.'
        );
      }
    } finally {
      setIsDeploying(false);
    }
  };

  // ========================================
  // METRIC OPTIONS & HELPERS
  // ========================================

  /**
   * Available metrics to watch (10 Total Options)
   */
  const METRIC_OPTIONS = [
    // === ORIGINAL 4 METRICS ===
    { 
      value: 'price', 
      label: 'Price', 
      icon: '💰',
      description: 'Monitor asset price changes',
      applicableTo: ['token', 'nft', 'beezie']
    },
    { 
      value: 'event', 
      label: 'Specific Event', 
      icon: '⚡',
      description: 'Watch for blockchain events',
      applicableTo: ['token', 'nft', 'beezie']
    },
    { 
      value: 'transaction', 
      label: 'Transaction Count', 
      icon: '📊',
      description: 'Track transaction volume',
      applicableTo: ['token', 'nft']
    },
    
    // === AISPORTS-SPECIFIC METRICS (5 custom metrics) ===
    {
      value: 'juice-price',
      label: '$JUICE Price',
      icon: '💰',
      description: 'Real-time $JUICE token price monitoring',
      applicableTo: ['aisports']
    },
    {
      value: 'juice-whale',
      label: 'Whale Tracking',
      icon: '🐋',
      description: 'Large $JUICE transfers & whale activity',
      applicableTo: ['aisports']
    },
    {
      value: 'player-stats',
      label: 'Player Performance',
      icon: '🏀',
      description: 'NBA player scores, rebounds, assists in real-time',
      applicableTo: ['aisports']
    },
    {
      value: 'vault-activity',
      label: 'Fast Break Vaults',
      icon: '🏆',
      description: 'Vault openings, closings, and payouts',
      applicableTo: ['aisports']
    },
    {
      value: 'nft-marketplace',
      label: 'NFT Trading',
      icon: '🎴',
      description: 'aiSports NFT sales & marketplace activity',
      applicableTo: ['aisports']
    },
    { 
      value: 'ownership', 
      label: 'NFT Ownership Change', 
      icon: '👤',
      description: 'Detect ownership transfers',
      applicableTo: ['nft']
    },
    
    // === NEW 6 METRICS (Total 10) ===
    { 
      value: 'nft-floor', 
      label: 'NFT Floor Price', 
      icon: '📉',
      description: 'Track collection floor price',
      applicableTo: ['nft']
    },
    { 
      value: 'balance', 
      label: 'Token Balance Change', 
      icon: '💳',
      description: 'Monitor wallet token balance (via FT Transfer API)',
      applicableTo: ['token']
    },
    { 
      value: 'staking', 
      label: 'Staking Reward Received', 
      icon: '🎁',
      description: 'Detect staking reward distribution (Find Labs Staking API)',
      applicableTo: ['token']
    },
  ];

  /**
   * Get available metrics for current template type
   */
  const getAvailableMetrics = () => {
    let metrics = [];
    
    // Check if template has custom availableMetrics defined
    if (formData.template?.availableMetrics) {
      metrics = METRIC_OPTIONS.filter(metric => 
        formData.template.availableMetrics.includes(metric.value)
      );
    } else {
      // Otherwise use default logic based on template type
      const templateType = getTemplateType();
      metrics = METRIC_OPTIONS.filter(metric => 
        metric.applicableTo.includes(templateType)
      );
    }
    
    // ✅ Remove duplicates based on metric.value (defensive programming)
    const uniqueMetrics = metrics.filter((metric, index, self) =>
      index === self.findIndex((m) => m.value === metric.value)
    );
    
    // 🐛 DEBUG: Log if duplicates were found
    if (metrics.length !== uniqueMetrics.length) {
      console.warn('⚠️  Duplicate metrics detected and removed:', {
        before: metrics.length,
        after: uniqueMetrics.length,
        template: formData.template?.name
      });
    }
    
    return uniqueMetrics;
  };

  // ========================================
  // HELPER FUNCTIONS FOR DYNAMIC FORMS
  // ========================================

  /**
   * Get bounty type for custom form rendering
   */
  const getBountyType = () => {
    if (!formData.template) return null;
    return formData.template.bountyType || 'generic';
  };

  /**
   * Determine template type for conditional rendering
   */
  const getTemplateType = () => {
    if (!formData.template) return null;
    
    const templateId = formData.template.id;
    
    // aiSports template (custom form with 5 metrics)
    if (templateId === 'aisports-juice') {
      return 'aisports';
    }
    
    // Token templates (simplified form)
    if (['kittypunch-froth', 'custom-flow-token'].includes(templateId)) {
      return 'token';
    }
    
    // MFL is NFT-based (Player NFTs), not token-based
    if (templateId === 'mfl-player') {
      return 'nft';
    }
    
    // Beezie template (special form)
    if (templateId === 'beezie-collectible') {
      return 'beezie';
    }
    
    // NFT templates (standard form)
    // Includes: dapper-nba, dapper-nfl, disney-pinnacle, custom-asset
    return 'nft';
  };

  /**
   * Get description text for Step 2 based on template
   */
  const getConfigureDescription = () => {
    const templateType = getTemplateType();
    
    switch (templateType) {
      case 'token':
        return 'Configure token tracking parameters';
      case 'beezie':
        return 'Specify Beezie collectible details and price threshold';
      case 'nft':
        return 'Specify which NFT asset you want to monitor';
      default:
        return 'Select a template to configure your watcher';
    }
  };

  /**
   * Validate Step 2 form based on template type and selected metric
   */
  const isStep2Valid = () => {
    const templateType = getTemplateType();
    
    // All types require asset ID/token symbol (except some metrics)
    const metricsWithoutAssetId = ['balance', 'contract-var', 'staking', 'code-update', 'dao-proposal'];
    if (!metricsWithoutAssetId.includes(formData.selectedMetric) && !formData.assetId) {
      return false;
    }
    
    // Validate based on selected metric
    switch (formData.selectedMetric) {
      // ========== AISPORTS METRICS ==========
      case 'juice-price':
      case 'juice-whale':
      case 'player-stats':
      case 'vault-activity':
      case 'nft-marketplace':
        // All aiSports metrics require a price limit (threshold)
        return !!formData.priceLimit;
      
      // ========== GENERIC METRICS ==========
      case 'price':
        // Price monitoring requires price limit
        return !!formData.priceLimit;
      
      case 'event':
        // Event monitoring requires event name
        return !!formData.eventName;
      
      case 'transaction':
        // Transaction monitoring requires threshold and time window
        return !!(formData.txThreshold && formData.txTimeWindow);
      
      case 'ownership':
        // Ownership monitoring only needs asset ID (already checked above)
        return true;
      
      case 'nft-floor':
        // NFT Floor Price requires collection identifier and floor price limit
        return !!(formData.collectionIdentifier && formData.floorPriceLimit);
      
      case 'balance':
        // Token Balance requires wallet address, token symbol, and threshold
        return !!(formData.walletAddress && formData.tokenSymbol && formData.balanceThreshold);
      
      case 'staking':
        // Staking Reward requires wallet address
        return !!formData.stakingWalletAddress;
      
      default:
        return false;
    }
  };

  /**
   * Auto-fill token symbol based on template
   */
  const getDefaultTokenSymbol = () => {
    if (!formData.template) return '';
    
    const templateId = formData.template.id;
    
    switch (templateId) {
      case 'kittypunch-froth':
        return 'FROTH';
      case 'aisports-juice':
        return 'JUICE';
      case 'custom-flow-token':
        return 'FLOW';
      default:
        return '';
    }
  };

  /**
   * Get label for asset ID field in review (based on template type)
   */
  const getAssetLabelForReview = () => {
    const templateType = getTemplateType();
    
    switch (templateType) {
      case 'token':
        return 'Token Symbol';
      case 'beezie':
        return 'Certificate Number';
      case 'nft':
        return 'Asset ID';
      default:
        return 'Asset ID';
    }
  };

  /**
   * Get label for asset name field in review (based on template type)
   */
  const getAssetNameLabelForReview = () => {
    const templateType = getTemplateType();
    
    switch (templateType) {
      case 'beezie':
        return 'Beezie URL';
      case 'nft':
        return 'Asset Name';
      default:
        return 'Description';
    }
  };

  /**
   * Get price currency unit for review (based on template type)
   */
  const getPriceCurrencyForReview = () => {
    const templateId = formData.template?.id;
    const templateType = getTemplateType();
    
    // Custom Flow Token uses USD
    if (templateId === 'custom-flow-token') {
      return 'USD';
    }
    
    // Token templates use WFLOW (DEX pool pricing)
    if (templateType === 'token') {
      return 'WFLOW';
    }
    
    // NFT templates use FLOW (marketplace pricing)
    return 'FLOW';
  };

  /**
   * Render bounty-specific header
   */
  const renderBountyHeader = () => {
    const bountyType = getBountyType();
    const template = formData.template;
    
    if (!template?.bounty) return null;
    
    const bountyInfo = {
      'kittypunch': {
        title: '🥊 KittyPunch: Build on $FROTH Challenge',
        subtitle: 'Social/Community Tool + Utility Application',
        color: 'rgba(255, 107, 107, 0.1)',
        border: 'rgba(255, 107, 107, 0.3)'
      },
      'aisports': {
        title: '🏀 aiSports: Best Integration of $JUICE',
        subtitle: 'Token Integration + Community Tools',
        color: 'rgba(66, 165, 245, 0.1)',
        border: 'rgba(66, 165, 245, 0.3)'
      },
      'dapper-insights': {
        title: '🏈 Dapper: Best Dapper Data & Insights Tool',
        subtitle: 'Real-time Analytics + Market Health Metrics',
        color: 'rgba(156, 39, 176, 0.1)',
        border: 'rgba(156, 39, 176, 0.3)'
      },
      'mfl': {
        title: '⚽ MFL: Best On-chain Football',
        subtitle: 'Market & Economy Tools + Automation',
        color: 'rgba(76, 175, 80, 0.1)',
        border: 'rgba(76, 175, 80, 0.3)'
      },
      'beezie': {
        title: '🎨 Beezie: Best AI Integration (Task 1)',
        subtitle: 'Market Value Fetcher + 24h Auto-Update',
        color: 'rgba(255, 193, 7, 0.1)',
        border: 'rgba(255, 193, 7, 0.3)'
      }
    };
    
    const info = bountyInfo[bountyType];
    if (!info) return null;
    
    return (
      <div className="form-info-box" style={{ 
        background: info.color, 
        border: `1px solid ${info.border}`,
        marginBottom: '1.5rem'
      }}>
        <div className="info-icon">🏆</div>
        <div className="info-content">
          <strong>{info.title}</strong>
          <p>{info.subtitle}</p>
          <small style={{ opacity: 0.8 }}>
            Prize: {template.bountyPrize} | Data: {template.dataSource}
          </small>
        </div>
      </div>
    );
  };

  /**
   * Render appropriate form based on template type
   */
  const renderConfigureForm = () => {
    const templateType = getTemplateType();
    const bountyType = getBountyType();
    
    // ========== AISPORTS FORM (Custom 5 Metrics) ==========
    if (templateType === 'aisports') {
      const availableMetrics = getAvailableMetrics();
      
      return (
        <>
          {/* Bounty Header */}
          {renderBountyHeader()}
          
          {/* Token Symbol (Pre-filled with JUICE) */}
          <div className="form-group">
            <label>
              Token Symbol
              <span className="required-indicator">*</span>
            </label>
            <input
              type="text"
              placeholder="JUICE"
              value={formData.assetId || 'JUICE'}
              onChange={(e) => handleInputChange('assetId', e.target.value.toUpperCase())}
              className="input-field"
              readOnly
            />
            <small>🏀 Tracking $JUICE for aiSports Integration</small>
          </div>

          {/* Metric to Watch Dropdown (5 custom options) */}
          <div className="form-group">
            <label>
              Metric to Watch
              <span className="required-indicator">*</span>
            </label>
            <select
              value={formData.selectedMetric}
              onChange={(e) => handleInputChange('selectedMetric', e.target.value)}
              className="input-field"
            >
              {availableMetrics.map((metric) => (
                <option key={metric.value} value={metric.value}>
                  {metric.icon} {metric.label} - {metric.description}
                </option>
              ))}
            </select>
            <small>Choose what aspect of the aiSports ecosystem you want to monitor</small>
          </div>

          {/* Conditional Fields Based on Selected Metric */}
          {formData.selectedMetric === 'juice-price' && (
          <div className="form-group">
            <label>
              Price Limit (USD)
              <span className="required-indicator">*</span>
            </label>
            <select
              value={formData.priceLimit}
              onChange={(e) => handleInputChange('priceLimit', e.target.value)}
              className="input-field"
            >
              <option value="">Select price limit...</option>
              {PRICE_LIMIT_OPTIONS.kittypunch.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <small>🏀 Alert triggers when $JUICE price exceeds this limit in USD</small>
          </div>
          )}

          {formData.selectedMetric === 'juice-whale' && (
            <div className="form-group">
              <label>
                Minimum Transfer Amount (JUICE)
                <span className="required-indicator">*</span>
              </label>
              <select
                value={formData.priceLimit}
                onChange={(e) => handleInputChange('priceLimit', e.target.value)}
                className="input-field"
              >
                <option value="">Select whale threshold...</option>
                {EVENT_THRESHOLD_OPTIONS.juiceAmount.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <small>🐋 Alert on large $JUICE transfers exceeding this amount</small>
            </div>
          )}

          {formData.selectedMetric === 'player-stats' && (
            <div className="form-group">
              <label>
                Minimum Player Performance Threshold
                <span className="required-indicator">*</span>
              </label>
              <select
                value={formData.priceLimit}
                onChange={(e) => handleInputChange('priceLimit', e.target.value)}
                className="input-field"
              >
                <option value="">Select performance threshold...</option>
                {EVENT_THRESHOLD_OPTIONS.playerStats.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <small>🏀 Alert when NBA player stats exceed this threshold (points/rebounds/assists)</small>
            </div>
          )}

          {formData.selectedMetric === 'vault-activity' && (
            <div className="form-group">
              <label>
                Minimum Vault Prize Pool (JUICE)
                <span className="required-indicator">*</span>
              </label>
              <select
                value={formData.priceLimit}
                onChange={(e) => handleInputChange('priceLimit', e.target.value)}
                className="input-field"
              >
                <option value="">Select vault threshold...</option>
                {EVENT_THRESHOLD_OPTIONS.juiceAmount.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <small>🏆 Alert on Fast Break Vaults with prize pools exceeding this amount</small>
            </div>
          )}

          {formData.selectedMetric === 'nft-marketplace' && (
            <div className="form-group">
              <label>
                Minimum Sale Price (JUICE)
                <span className="required-indicator">*</span>
              </label>
              <select
                value={formData.priceLimit}
                onChange={(e) => handleInputChange('priceLimit', e.target.value)}
                className="input-field"
              >
                <option value="">Select sale price threshold...</option>
                {EVENT_THRESHOLD_OPTIONS.juiceAmount.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <small>🎴 Alert on aiSports NFT sales exceeding this price</small>
            </div>
          )}

          {/* Schedule Configuration */}
          <div className="form-group">
            <label>Check Schedule</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="number"
                min="1"
                placeholder="24"
                value={formData.scheduleDelay}
                onChange={(e) => handleInputChange('scheduleDelay', e.target.value)}
                className="input-field"
                style={{ flex: 1 }}
              />
              <select
                value={formData.scheduleUnit}
                onChange={(e) => handleInputChange('scheduleUnit', e.target.value)}
                className="input-field"
                style={{ flex: 1 }}
              >
                <option value="hours">Hours</option>
                <option value="days">Days</option>
              </select>
            </div>
            <small>How often should the watcher check for updates?</small>
          </div>
        </>
      );
    }
    
    // ========== TOKEN FORM (Simplified) ==========
    if (templateType === 'token') {
      const defaultSymbol = getDefaultTokenSymbol();
      const availableMetrics = getAvailableMetrics();
      
      return (
        <>
          {/* Bounty Header */}
          {renderBountyHeader()}
          
          {/* Token Symbol */}
          <div className="form-group">
            <label>
              Token Symbol
              <span className="required-indicator">*</span>
            </label>
            <input
              type="text"
              placeholder={defaultSymbol || "e.g., FROTH, JUICE, FLOW"}
              value={formData.assetId || defaultSymbol}
              onChange={(e) => handleInputChange('assetId', e.target.value.toUpperCase())}
              className="input-field"
            />
            <small>
              {bountyType === 'kittypunch' && '🥊 Tracking $FROTH for KittyPunch Challenge'}
              {bountyType === 'aisports' && '🏀 Tracking $JUICE for aiSports Integration'}
              {!['kittypunch', 'aisports'].includes(bountyType) && (defaultSymbol 
                ? `Tracking ${defaultSymbol} token`
                : 'Enter the token symbol you want to track')}
            </small>
          </div>

          {/* Metric to Watch Dropdown */}
          <div className="form-group">
            <label>
              Metric to Watch
              <span className="required-indicator">*</span>
            </label>
            <select
              value={formData.selectedMetric}
              onChange={(e) => handleInputChange('selectedMetric', e.target.value)}
              className="input-field"
            >
              {availableMetrics.map((metric) => (
                <option key={metric.value} value={metric.value}>
                  {metric.icon} {metric.label} - {metric.description}
                </option>
              ))}
            </select>
            <small>Choose what aspect of the token you want to monitor</small>
          </div>

          {/* Conditional Fields Based on Selected Metric */}
          {formData.selectedMetric === 'price' && (
          <div className="form-group">
            <label>
              Price Limit ({bountyType === 'kittypunch' || formData.template?.id === 'custom-flow-token' ? 'USD' : 'WFLOW'})
              <span className="required-indicator">*</span>
            </label>
            <select
              value={formData.priceLimit}
              onChange={(e) => handleInputChange('priceLimit', e.target.value)}
              className="input-field"
            >
              <option value="">Select price limit...</option>
              {(() => {
                // Determine which options to use
                if (bountyType === 'kittypunch') {
                  return PRICE_LIMIT_OPTIONS.kittypunch;
                } else if (formData.template?.id === 'custom-flow-token') {
                  return PRICE_LIMIT_OPTIONS.customFlowToken;
                } else {
                  return PRICE_LIMIT_OPTIONS.generic;
                }
              })().map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <small>
              {bountyType === 'kittypunch' 
                ? '🥊 Alert triggers when $FROTH price exceeds this limit in USD' 
                : formData.template?.id === 'custom-flow-token' 
                  ? 'Alert triggers when token price exceeds this limit in USD'
                  : 'Alert triggers when token price exceeds this limit in WFLOW'}
            </small>
          </div>
          )}

          {formData.selectedMetric === 'event' && (
            <>
              <div className="form-group">
                <label>
                  Event Type
                  <span className="required-indicator">*</span>
                </label>
                <select
                  value={formData.eventName}
                  onChange={(e) => handleInputChange('eventName', e.target.value)}
                  className="input-field"
                >
                  <option value="">Select event to watch...</option>
                  {bountyType === 'kittypunch' && KITTYPUNCH_EVENTS.map((event) => (
                    <option key={event.value} value={event.value}>
                      {event.label} - {event.description}
                    </option>
                  ))}
                  {bountyType === 'aisports' && AISPORTS_EVENTS.map((event) => (
                    <option key={event.value} value={event.value}>
                      {event.label} - {event.description}
                    </option>
                  ))}
                  {bountyType === 'dapper-insights' && formData.template?.id === 'dapper-nba' && NBA_TOPSHOT_EVENTS.map((event) => (
                    <option key={event.value} value={event.value}>
                      {event.label} - {event.description}
                    </option>
                  ))}
                  {bountyType === 'dapper-insights' && formData.template?.id === 'dapper-nfl' && NFL_ALLDAY_EVENTS.map((event) => (
                    <option key={event.value} value={event.value}>
                      {event.label} - {event.description}
                    </option>
                  ))}
                  {bountyType === 'mfl' && MFL_EVENTS.map((event) => (
                    <option key={event.value} value={event.value}>
                      {event.label} - {event.description}
                    </option>
                  ))}
                  {!['kittypunch', 'aisports', 'dapper-insights', 'mfl'].includes(bountyType) && KITTYPUNCH_EVENTS.map((event) => (
                    <option key={event.value} value={event.value}>
                      {event.label} - {event.description}
                    </option>
                  ))}
                </select>
                <small>
                  {bountyType === 'kittypunch' && '🎮 Select which KittyPunch game event to monitor'}
                  {bountyType === 'aisports' && '🏀 Select which aiSports/fantasy basketball event to monitor'}
                  {bountyType === 'dapper-insights' && formData.template?.id === 'dapper-nba' && '🏀 Select which NBA Top Shot blockchain event to monitor'}
                  {bountyType === 'dapper-insights' && formData.template?.id === 'dapper-nfl' && '🏈 Select which NFL ALL DAY blockchain event to monitor'}
                  {bountyType === 'mfl' && '⚽ Select which MFL on-chain football event to monitor'}
                  {!['kittypunch', 'aisports', 'dapper-insights', 'mfl'].includes(bountyType) && 'Choose the blockchain event to watch for'}
                </small>
              </div>
              
              {formData.eventName && (
                <div className="form-group">
                  <label>Event Details</label>
                  <div style={{
                    padding: 'var(--spacing-md)',
                    background: 'rgba(59, 130, 246, 0.1)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid rgba(59, 130, 246, 0.3)'
                  }}>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                      <strong>
                        {bountyType === 'kittypunch' && (KITTYPUNCH_EVENTS.find(e => e.value === formData.eventName)?.label || formData.eventName)}
                        {bountyType === 'aisports' && (AISPORTS_EVENTS.find(e => e.value === formData.eventName)?.label || formData.eventName)}
                        {bountyType === 'dapper-insights' && formData.template?.id === 'dapper-nba' && (NBA_TOPSHOT_EVENTS.find(e => e.value === formData.eventName)?.label || formData.eventName)}
                        {bountyType === 'dapper-insights' && formData.template?.id === 'dapper-nfl' && (NFL_ALLDAY_EVENTS.find(e => e.value === formData.eventName)?.label || formData.eventName)}
                        {bountyType === 'mfl' && (MFL_EVENTS.find(e => e.value === formData.eventName)?.label || formData.eventName)}
                        {!['kittypunch', 'aisports', 'dapper-insights', 'mfl'].includes(bountyType) && (KITTYPUNCH_EVENTS.find(e => e.value === formData.eventName)?.label || formData.eventName)}
                      </strong>
                    </div>
                    <div style={{ fontSize: '0.813rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                      {bountyType === 'kittypunch' && KITTYPUNCH_EVENTS.find(e => e.value === formData.eventName)?.description}
                      {bountyType === 'aisports' && AISPORTS_EVENTS.find(e => e.value === formData.eventName)?.description}
                      {bountyType === 'dapper-insights' && formData.template?.id === 'dapper-nba' && NBA_TOPSHOT_EVENTS.find(e => e.value === formData.eventName)?.description}
                      {bountyType === 'dapper-insights' && formData.template?.id === 'dapper-nfl' && NFL_ALLDAY_EVENTS.find(e => e.value === formData.eventName)?.description}
                      {bountyType === 'mfl' && MFL_EVENTS.find(e => e.value === formData.eventName)?.description}
                      {!['kittypunch', 'aisports', 'dapper-insights', 'mfl'].includes(bountyType) && KITTYPUNCH_EVENTS.find(e => e.value === formData.eventName)?.description}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <strong>Parameters:</strong> 
                      {bountyType === 'kittypunch' && KITTYPUNCH_EVENTS.find(e => e.value === formData.eventName)?.parameters.join(', ')}
                      {bountyType === 'aisports' && AISPORTS_EVENTS.find(e => e.value === formData.eventName)?.parameters.join(', ')}
                      {bountyType === 'dapper-insights' && formData.template?.id === 'dapper-nba' && NBA_TOPSHOT_EVENTS.find(e => e.value === formData.eventName)?.parameters.join(', ')}
                      {bountyType === 'dapper-insights' && formData.template?.id === 'dapper-nfl' && NFL_ALLDAY_EVENTS.find(e => e.value === formData.eventName)?.parameters.join(', ')}
                      {bountyType === 'mfl' && MFL_EVENTS.find(e => e.value === formData.eventName)?.parameters.join(', ')}
                      {!['kittypunch', 'aisports', 'dapper-insights', 'mfl'].includes(bountyType) && KITTYPUNCH_EVENTS.find(e => e.value === formData.eventName)?.parameters.join(', ')}
                    </div>
                  </div>
                </div>
              )}
              
              <div className="form-group">
                <label>Minimum Threshold (Optional)</label>
                <input
                  type="number"
                  placeholder={
                    bountyType === 'aisports' 
                      ? AISPORTS_EVENTS.find(e => e.value === formData.eventName)?.thresholdHint || "e.g., 30 (points), 100 (lineup), 1000 ($JUICE)"
                      : "e.g., 1000 (for scores), 5 (for level), 10 (for streak)"
                  }
                  value={formData.eventParameter}
                  onChange={(e) => handleInputChange('eventParameter', e.target.value)}
                  className="input-field"
                />
                <small>
                  {bountyType === 'kittypunch' && (
                    <>
                      {formData.eventName === 'HighScore' && 'Alert only if score exceeds this value'}
                      {formData.eventName === 'LevelUp' && 'Alert only when reaching this level or higher'}
                      {formData.eventName === 'DailyLoginStreak' && 'Alert only if streak reaches this count'}
                      {formData.eventName === 'RewardClaimed' && 'Alert only if reward amount exceeds this (FROTH)'}
                      {!['HighScore', 'LevelUp', 'DailyLoginStreak', 'RewardClaimed'].includes(formData.eventName) && 'Optional: Set minimum value threshold for this event'}
                    </>
                  )}
                  {bountyType === 'aisports' && (
                    <>
                      {formData.eventName === 'PlayerScored' && 'Alert only if player scores exceed this (e.g., 30 points)'}
                      {formData.eventName === 'LineupScored' && 'Alert when lineup total exceeds this (e.g., 150 points)'}
                      {formData.eventName === 'JUICERewardClaimed' && 'Alert when reward exceeds this amount (e.g., 500 $JUICE)'}
                      {formData.eventName === 'LargeJUICETransfer' && 'Alert on transfers exceeding this (e.g., 10000 $JUICE)'}
                      {formData.eventName === 'JUICEStaked' && 'Alert on stake amounts exceeding this (e.g., 5000 $JUICE)'}
                      {formData.eventName === 'VaultOpened' && 'Alert only if prize pool exceeds this (e.g., 5000 $JUICE)'}
                      {formData.eventName === 'VaultClosingSoon' && 'Minutes before close to alert (e.g., 5, 10, 30)'}
                      {formData.eventName === 'VaultPayoutDistributed' && 'Minimum payout to alert (e.g., 10000 $JUICE)'}
                      {formData.eventName === 'PlayerNFTSold' && 'Minimum sale price to alert (e.g., 500 $JUICE)'}
                      {formData.eventName === 'FloorPriceChanged' && 'Minimum % change to alert (e.g., 10, 20)'}
                      {formData.eventName === 'DailyStreakReward' && 'Minimum streak days to alert (e.g., 7, 30, 100)'}
                      {!['PlayerScored', 'LineupScored', 'JUICERewardClaimed', 'LargeJUICETransfer', 'JUICEStaked', 'VaultOpened', 'VaultClosingSoon', 'VaultPayoutDistributed', 'PlayerNFTSold', 'FloorPriceChanged', 'DailyStreakReward'].includes(formData.eventName) && 'Optional: Set minimum threshold for this event'}
                    </>
                  )}
                  {!['kittypunch', 'aisports'].includes(bountyType) && 'Optional: Set minimum value threshold for this event'}
                </small>
              </div>
            </>
          )}

          {formData.selectedMetric === 'transaction' && (
            <>
              <div className="form-group">
                <label>
                  Transaction Count Threshold
                  <span className="required-indicator">*</span>
                </label>
                <select
                  value={formData.txThreshold}
                  onChange={(e) => handleInputChange('txThreshold', e.target.value)}
                  className="input-field"
                >
                  <option value="">Select transaction threshold...</option>
                  {TRANSACTION_COUNT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <small>Alert triggers when transaction count exceeds this threshold</small>
              </div>
              <div className="form-group">
                <label>
                  Time Window (Hours)
                  <span className="required-indicator">*</span>
                </label>
                <input
                  type="number"
                  placeholder="e.g., 24"
                  value={formData.txTimeWindow}
                  onChange={(e) => handleInputChange('txTimeWindow', e.target.value)}
                  className="input-field"
                />
                <small>Alert triggers if threshold exceeded within this time window</small>
              </div>
            </>
          )}

          {/* === NEW METRIC: Token Balance Change === */}
          {formData.selectedMetric === 'balance' && (
            <>
              <div className="form-group">
                <label>
                  Wallet Address to Watch
                  <span className="required-indicator">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., 0x1234567890abcdef"
                  value={formData.walletAddress}
                  onChange={(e) => handleInputChange('walletAddress', e.target.value)}
                  className="input-field"
                />
                <small>Flow address of the wallet to monitor</small>
              </div>
              <div className="form-group">
                <label>
                  Token Symbol
                  <span className="required-indicator">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., FLOW, FROTH, USDC"
                  value={formData.tokenSymbol}
                  onChange={(e) => handleInputChange('tokenSymbol', e.target.value.toUpperCase())}
                  className="input-field"
                />
                <small>Symbol of the token to track balance for</small>
              </div>
              <div className="form-group">
                <label>
                  Balance Threshold
                  <span className="required-indicator">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g., 1000"
                  value={formData.balanceThreshold}
                  onChange={(e) => handleInputChange('balanceThreshold', e.target.value)}
                  className="input-field"
                />
                <small>Threshold amount for triggering alert</small>
              </div>
              <div className="form-group">
                <label>
                  Condition
                  <span className="required-indicator">*</span>
                </label>
                <select
                  value={formData.balanceCondition}
                  onChange={(e) => handleInputChange('balanceCondition', e.target.value)}
                  className="input-field"
                >
                  <option value="above">Above Threshold</option>
                  <option value="below">Below Threshold</option>
                </select>
                <small>Alert when balance goes above or below the threshold</small>
              </div>
            </>
          )}

          {/* === NEW METRIC: Staking Reward === */}
          {formData.selectedMetric === 'staking' && (
            <>
              <div className="form-group">
                <label>
                  Wallet Address to Watch
                  <span className="required-indicator">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., 0x1234567890abcdef"
                  value={formData.stakingWalletAddress}
                  onChange={(e) => handleInputChange('stakingWalletAddress', e.target.value)}
                  className="input-field"
                />
                <small>Address receiving staking rewards</small>
              </div>
              <div className="form-group">
                <label>
                  Reward Type
                  <span className="required-indicator">*</span>
                </label>
                <select
                  value={formData.rewardType}
                  onChange={(e) => handleInputChange('rewardType', e.target.value)}
                  className="input-field"
                >
                  <option value="delegation">Delegation Rewards</option>
                  <option value="node">Node Operation Rewards</option>
                </select>
                <small>Type of staking reward to monitor</small>
              </div>
            </>
          )}

          {/* Info Box */}
          {(
          <div className="form-info-box">
            <div className="info-icon">💡</div>
            <div className="info-content">
                <strong>
                  {formData.selectedMetric === 'price' && 'Token Price Tracking'}
                  {formData.selectedMetric === 'event' && 'Event Monitoring'}
                  {formData.selectedMetric === 'transaction' && 'Transaction Volume Tracking'}
                  {formData.selectedMetric === 'balance' && 'Wallet Balance Monitoring'}
                  {formData.selectedMetric === 'contract-var' && 'Contract State Monitoring'}
                  {formData.selectedMetric === 'staking' && 'Staking Reward Tracking'}
                  {formData.selectedMetric === 'dao-proposal' && 'DAO Governance Tracking'}
                </strong>
                <p>
                  {formData.selectedMetric === 'price' && bountyType === 'kittypunch' && 
                    '🥊 Real-time $FROTH price from Flow EVM DEX (via GeckoTerminal API). Get alerts when price reaches your target in USD.'}
                  {formData.selectedMetric === 'price' && bountyType !== 'kittypunch' && 
                    formData.template?.id === 'custom-flow-token'
                      ? 'Monitor token price in USD and get alerts when it reaches your target.'
                      : 'Monitor token price in WFLOW (from DEX pools) and get alerts when it reaches your target.'}
                  {formData.selectedMetric === 'event' && bountyType === 'kittypunch' && 
                    '🎮 Watch for KittyPunch game events: NFT mints, reward distributions, and achievement unlocks.'}
                  {formData.selectedMetric === 'event' && bountyType !== 'kittypunch' && 
                    'Watch for specific blockchain events related to this token and get notified when they occur.'}
                  {formData.selectedMetric === 'transaction' && bountyType === 'kittypunch' && 
                    '📊 Track $FROTH trading volume and detect viral moments when community activity spikes.'}
                  {formData.selectedMetric === 'transaction' && bountyType !== 'kittypunch' && 
                    'Track transaction volume over time and get alerted when activity spikes above your threshold.'}
                  {formData.selectedMetric === 'balance' && 
                    'Monitor any wallet\'s token balance and receive alerts when it crosses your specified threshold.'}
                  {formData.selectedMetric === 'contract-var' && 
                    'Advanced: Watch a specific contract variable and get notified when its value changes.'}
                  {formData.selectedMetric === 'staking' && 
                    'Track staking rewards automatically and get notified when new rewards are distributed to your wallet.'}
                  {formData.selectedMetric === 'dao-proposal' && 
                    'Stay updated on DAO proposals and receive notifications when they reach your target status.'}
                </p>
            </div>
          </div>
          )}
        </>
      );
    }
    
    // ========== BEEZIE FORM (Special) ==========
    if (templateType === 'beezie') {
      return (
        <>
          {/* Bounty Header */}
          {renderBountyHeader()}
          
          <div className="form-group">
            <label>
              Beezie Collectible URL or Certificate Serial
              <span className="required-indicator">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g., https://beezie.io/marketplace/collectible/12345 OR PSA-12345"
              value={formData.assetId}
              onChange={(e) => handleInputChange('assetId', e.target.value)}
              className="input-field"
            />
            <small>
              🎨 Task 1: Enter Beezie URL (e.g., https://beezie.io/marketplace/collectible/&lt;tokenID&gt;) 
              or certificate serial (e.g., PSA-12345)
              <br />
              The system will extract tokenID from URL, fetch metadata, extract serial, then fetch ALT.xyz Fair Market Value
            </small>
          </div>

          <div className="form-group">
            <label>
              Grading Company
              <span className="required-indicator">*</span>
            </label>
            <select
              value={formData.targetAsset || 'PSA'}
              onChange={(e) => handleInputChange('targetAsset', e.target.value)}
              className="input-field"
            >
              <option value="PSA">PSA - Professional Sports Authenticator</option>
              <option value="BGS">BGS - Beckett Grading Services</option>
              <option value="CGC">CGC - Certified Guaranty Company</option>
              <option value="SGC">SGC - Sports Card Guaranty</option>
              <option value="TAG">TAG - The Authentication Group (ALT)</option>
            </select>
            <small>Select the grading company for accurate ALT.xyz data fetching</small>
          </div>

          <div className="form-group">
            <label>
              Fair Market Value Limit (USD)
              <span className="required-indicator">*</span>
            </label>
            <select
              value={formData.priceLimit}
              onChange={(e) => handleInputChange('priceLimit', e.target.value)}
              className="input-field"
            >
              <option value="">Select threshold...</option>
              <option value="100">$100 USD</option>
              <option value="250">$250 USD</option>
              <option value="500">$500 USD</option>
              <option value="1000">$1,000 USD</option>
              <option value="2500">$2,500 USD</option>
              <option value="5000">$5,000 USD</option>
              <option value="10000">$10,000 USD</option>
              <option value="25000">$25,000 USD</option>
              <option value="50000">$50,000 USD</option>
              <option value="100000">$100,000 USD</option>
              <option value="custom">Custom Amount...</option>
            </select>
            {formData.priceLimit === 'custom' && (
              <input
                type="number"
                step="0.01"
                placeholder="Enter custom amount (USD)"
                value={formData.customPriceLimit || ''}
                onChange={(e) => {
                  handleInputChange('customPriceLimit', e.target.value);
                  handleInputChange('priceLimit', e.target.value);
                }}
                className="input-field"
                style={{ marginTop: '0.5rem' }}
              />
            )}
            <small>Alert triggers when ALT.xyz Fair Market Value exceeds this threshold</small>
          </div>

          <div className="form-info-box" style={{ 
            background: 'rgba(255, 193, 7, 0.1)', 
            border: '1px solid rgba(255, 193, 7, 0.3)' 
          }}>
            <div className="info-icon">🤖</div>
            <div className="info-content">
              <strong>Beezie Task 1: Market Value Fetcher</strong>
              <p>
                ✅ Fetches market value using certificate serial number<br />
                ✅ Pulls data from ALT.xyz API<br />
                ✅ Extracts serial from Beezie collectible URLs<br />
                ✅ Stores ALT Fair Market Value on-chain<br />
                ✅ 24-hour auto-update via Flow Scheduled Transactions<br />
                ✅ Detects price changes and sends alerts
              </p>
              <small style={{ color: 'rgba(255, 193, 7, 0.9)', display: 'block', marginTop: '0.5rem' }}>
                💡 Full Task 1 Implementation: Automated cron via Flow Scheduled Transactions + ALT.xyz integration
              </small>
            </div>
          </div>
        </>
      );
    }
    
    // ========== NFT FORM (Standard) ==========
    if (templateType === 'nft') {
      const availableMetrics = getAvailableMetrics();
      const bountyType = getBountyType();
      
      // Bounty-specific placeholders
      const assetPlaceholders = {
        'dapper-insights': {
          id: bountyType === 'dapper-insights' && formData.template?.id === 'dapper-nba' 
            ? 'e.g., 12345 (NBA Top Shot Moment ID)'
            : bountyType === 'dapper-insights' && formData.template?.id === 'dapper-nfl'
            ? 'e.g., 67890 (NFL ALL DAY Moment ID)'
            : bountyType === 'dapper-insights' && formData.template?.id === 'disney-pinnacle'
            ? 'e.g., 001 (Disney Pinnacle Pin Render ID)'
            : bountyType === 'dapper-insights' && formData.template?.id === 'cryptokitties-meowcoins' && ['ownership', 'nft-floor'].includes(formData.selectedMetric)
            ? 'e.g., 12345 (CryptoKitties NFT ID)'
            : bountyType === 'dapper-insights' && formData.template?.id === 'cryptokitties-meowcoins'
            ? 'e.g., MEOWCOIN (Token Symbol) or 0x... (Wallet Address)'
            : 'e.g., MEOWCOIN (CryptoKitties MeowCoin Symbol)',
          name: bountyType === 'dapper-insights' && formData.template?.id === 'dapper-nba'
            ? 'e.g., LeBron James Dunk Moment #12345'
            : bountyType === 'dapper-insights' && formData.template?.id === 'dapper-nfl'
            ? 'e.g., Patrick Mahomes TD Pass #67890'
            : bountyType === 'dapper-insights' && formData.template?.id === 'disney-pinnacle'
            ? 'e.g., Mickey Mouse Classic Pin'
            : bountyType === 'dapper-insights' && formData.template?.id === 'cryptokitties-meowcoins' && ['ownership', 'nft-floor'].includes(formData.selectedMetric)
            ? 'e.g., Rare CryptoKitties Kitty #12345'
            : bountyType === 'dapper-insights' && formData.template?.id === 'cryptokitties-meowcoins'
            ? 'e.g., MeowCoin Price Tracker'
            : 'e.g., MeowCoin Price Tracker'
        },
        'mfl': {
          id: 'e.g., 123456 (MFL Player Token ID)',
          name: 'e.g., Cristiano Ronaldo - Striker'
        },
        'generic': {
          id: 'e.g., NBA-12345, NFL-67890, PINNACLE-001',
          name: 'e.g., LeBron James Dunk Moment'
        }
      };
      
      const placeholders = assetPlaceholders[bountyType] || assetPlaceholders['generic'];
      
      return (
        <>
          {/* Bounty Header */}
          {renderBountyHeader()}
          
          {/* Asset ID */}
          <div className="form-group">
            <label>
              {bountyType === 'dapper-insights' && formData.template?.id === 'dapper-nba' && 'NBA Top Shot Moment ID'}
              {bountyType === 'dapper-insights' && formData.template?.id === 'dapper-nfl' && 'NFL ALL DAY Moment ID'}
              {bountyType === 'dapper-insights' && formData.template?.id === 'disney-pinnacle' && 'Disney Pin Render ID'}
              {bountyType === 'dapper-insights' && formData.template?.id === 'cryptokitties-meowcoins' && (
                ['ownership', 'nft-floor'].includes(formData.selectedMetric)
                  ? 'CryptoKitties NFT ID'
                  : 'MeowCoin Symbol / Wallet Address'
              )}
              {bountyType === 'mfl' && 'MFL Player Token ID'}
              {!['dapper-insights', 'mfl'].includes(bountyType) && 'Asset ID / Serial Number'}
              <span className="required-indicator">*</span>
            </label>
            <input
              type="text"
              placeholder={placeholders.id}
              value={formData.assetId}
              onChange={(e) => handleInputChange('assetId', e.target.value)}
              className="input-field"
            />
            <small>
              {bountyType === 'dapper-insights' && formData.template?.id === 'cryptokitties-meowcoins' 
                ? '😺 Track MeowCoin price, whale movements & CryptoKitties NFT sales'
                : bountyType === 'dapper-insights' 
                ? '🏆 Find Labs API will fetch real-time data for this Moment/Pin'
                : ''
              }
              {bountyType === 'mfl' && '⚽ Track player value, transfers & competition results'}
              {!['dapper-insights', 'mfl'].includes(bountyType) && 'Enter the unique identifier for your NFT'}
            </small>
          </div>

          <div className="form-group">
            <label>
              {bountyType === 'dapper-insights' && 'Moment / Pin Name (Optional)'}
              {bountyType === 'mfl' && 'Player Name (Optional)'}
              {!['dapper-insights', 'mfl'].includes(bountyType) && 'Target Asset Name (Optional)'}
            </label>
            <input
              type="text"
              placeholder={placeholders.name}
              value={formData.targetAsset}
              onChange={(e) => handleInputChange('targetAsset', e.target.value)}
              className="input-field"
            />
            <small>Friendly name for easier identification in your dashboard</small>
          </div>

          {/* Metric to Watch Dropdown */}
          <div className="form-group">
            <label>
              Metric to Watch
              <span className="required-indicator">*</span>
            </label>
            <select
              value={formData.selectedMetric}
              onChange={(e) => handleInputChange('selectedMetric', e.target.value)}
              className="input-field"
            >
              {availableMetrics.map((metric) => (
                <option key={metric.value} value={metric.value}>
                  {metric.icon} {metric.label} - {metric.description}
                </option>
              ))}
            </select>
            <small>Choose what aspect of the NFT you want to monitor</small>
            
            {/* NBA Top Shot Data Availability Notice */}
            {formData.template?.id === 'dapper-nba' && (
              <div style={{
                marginTop: '10px',
                padding: '12px',
                background: 'linear-gradient(135deg, rgba(52, 211, 153, 0.1), rgba(16, 185, 129, 0.1))',
                border: '1px solid rgba(52, 211, 153, 0.3)',
                borderRadius: '8px',
                fontSize: '13px',
                lineHeight: '1.6'
              }}>
                <div style={{ fontWeight: '600', marginBottom: '6px', color: '#10b981' }}>
                  ✅ Real-time Flow Blockchain Data
                </div>
                <div style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                  NBA Top Shot watchers use <strong>live blockchain data</strong> from Find Labs API:
                  <br />
                  • Events: Moment minting, transfers, set releases
                  <br />
                  • Transactions: Marketplace activity & volume
                  <br />
                  • Ownership: Wallet-to-wallet transfers
                  <br />
                  <span style={{ fontSize: '12px', opacity: '0.7', fontStyle: 'italic' }}>
                    Price tracking not available (requires NBA Top Shot marketplace API)
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Conditional Fields Based on Selected Metric */}
          {formData.selectedMetric === 'price' && (
          <div className="form-group">
            <label>
              Price Limit (FLOW)
              <span className="required-indicator">*</span>
            </label>
            <select
              value={formData.priceLimit}
              onChange={(e) => handleInputChange('priceLimit', e.target.value)}
              className="input-field"
            >
              <option value="">Select price limit...</option>
              {PRICE_LIMIT_OPTIONS.generic.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <small>Alert triggers when NFT price exceeds this limit</small>
          </div>
          )}

          {formData.selectedMetric === 'event' && (
            <>
              <div className="form-group">
                <label>
                  Event Type
                  <span className="required-indicator">*</span>
                </label>
                <select
                  value={formData.eventName}
                  onChange={(e) => handleInputChange('eventName', e.target.value)}
                  className="input-field"
                >
                  <option value="">Select event to watch...</option>
                  {bountyType === 'kittypunch' && KITTYPUNCH_EVENTS.map((event) => (
                    <option key={event.value} value={event.value}>
                      {event.label} - {event.description}
                    </option>
                  ))}
                  {bountyType === 'aisports' && AISPORTS_EVENTS.map((event) => (
                    <option key={event.value} value={event.value}>
                      {event.label} - {event.description}
                    </option>
                  ))}
                  {bountyType === 'dapper-insights' && formData.template?.id === 'dapper-nba' && NBA_TOPSHOT_EVENTS.map((event) => (
                    <option key={event.value} value={event.value}>
                      {event.label} - {event.description}
                    </option>
                  ))}
                  {!['kittypunch', 'aisports', 'dapper-insights'].includes(bountyType) && KITTYPUNCH_EVENTS.map((event) => (
                    <option key={event.value} value={event.value}>
                      {event.label} - {event.description}
                    </option>
                  ))}
                </select>
                <small>
                  {bountyType === 'kittypunch' && '🎮 Select which KittyPunch game event to monitor'}
                  {bountyType === 'aisports' && '🏀 Select which aiSports/fantasy basketball event to monitor'}
                  {bountyType === 'dapper-insights' && formData.template?.id === 'dapper-nba' && '🏀 Select which NBA Top Shot blockchain event to monitor'}
                  {!['kittypunch', 'aisports', 'dapper-insights'].includes(bountyType) && '🎮 Select which game/NFT event to monitor'}
                </small>
              </div>
              
              {formData.eventName && (
                <div className="form-group">
                  <label>Event Details</label>
                  <div style={{
                    padding: 'var(--spacing-md)',
                    background: 'rgba(59, 130, 246, 0.1)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid rgba(59, 130, 246, 0.3)'
                  }}>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                      <strong>
                        {bountyType === 'kittypunch' && (KITTYPUNCH_EVENTS.find(e => e.value === formData.eventName)?.label || formData.eventName)}
                        {bountyType === 'aisports' && (AISPORTS_EVENTS.find(e => e.value === formData.eventName)?.label || formData.eventName)}
                        {bountyType === 'dapper-insights' && formData.template?.id === 'dapper-nba' && (NBA_TOPSHOT_EVENTS.find(e => e.value === formData.eventName)?.label || formData.eventName)}
                        {!['kittypunch', 'aisports', 'dapper-insights'].includes(bountyType) && (KITTYPUNCH_EVENTS.find(e => e.value === formData.eventName)?.label || formData.eventName)}
                      </strong>
                    </div>
                    <div style={{ fontSize: '0.813rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                      {bountyType === 'kittypunch' && KITTYPUNCH_EVENTS.find(e => e.value === formData.eventName)?.description}
                      {bountyType === 'aisports' && AISPORTS_EVENTS.find(e => e.value === formData.eventName)?.description}
                      {bountyType === 'dapper-insights' && formData.template?.id === 'dapper-nba' && NBA_TOPSHOT_EVENTS.find(e => e.value === formData.eventName)?.description}
                      {!['kittypunch', 'aisports', 'dapper-insights'].includes(bountyType) && KITTYPUNCH_EVENTS.find(e => e.value === formData.eventName)?.description}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <strong>Event Parameters:</strong> 
                      {bountyType === 'kittypunch' && KITTYPUNCH_EVENTS.find(e => e.value === formData.eventName)?.parameters.join(', ')}
                      {bountyType === 'aisports' && AISPORTS_EVENTS.find(e => e.value === formData.eventName)?.parameters.join(', ')}
                      {bountyType === 'dapper-insights' && formData.template?.id === 'dapper-nba' && NBA_TOPSHOT_EVENTS.find(e => e.value === formData.eventName)?.parameters.join(', ')}
                      {!['kittypunch', 'aisports', 'dapper-insights'].includes(bountyType) && KITTYPUNCH_EVENTS.find(e => e.value === formData.eventName)?.parameters.join(', ')}
                    </div>
                  </div>
                </div>
              )}
              
              <div className="form-group">
                <label>Minimum Threshold (Optional)</label>
                <input
                  type="number"
                  placeholder={
                    bountyType === 'aisports' 
                      ? AISPORTS_EVENTS.find(e => e.value === formData.eventName)?.thresholdHint || "e.g., 30 (points), 100 (lineup), 1000 ($JUICE)"
                      : "e.g., 1000 (for scores), 5 (for level), 10 (for streak)"
                  }
                  value={formData.eventParameter}
                  onChange={(e) => handleInputChange('eventParameter', e.target.value)}
                  className="input-field"
                />
                <small>
                  {bountyType === 'kittypunch' && (
                    <>
                      {formData.eventName === 'HighScore' && 'Alert only if score exceeds this value'}
                      {formData.eventName === 'LevelUp' && 'Alert only when reaching this level or higher'}
                      {formData.eventName === 'DailyLoginStreak' && 'Alert only if streak reaches this count'}
                      {formData.eventName === 'RewardClaimed' && 'Alert only if reward amount exceeds this (FROTH)'}
                      {!['HighScore', 'LevelUp', 'DailyLoginStreak', 'RewardClaimed'].includes(formData.eventName) && 'Optional: Set minimum value threshold for this event'}
                    </>
                  )}
                  {bountyType === 'aisports' && (
                    <>
                      {formData.eventName === 'PlayerScored' && 'Alert only if player scores exceed this (e.g., 30 points)'}
                      {formData.eventName === 'LineupScored' && 'Alert when lineup total exceeds this (e.g., 150 points)'}
                      {formData.eventName === 'JUICERewardClaimed' && 'Alert when reward exceeds this amount (e.g., 500 $JUICE)'}
                      {formData.eventName === 'LargeJUICETransfer' && 'Alert on transfers exceeding this (e.g., 10000 $JUICE)'}
                      {formData.eventName === 'JUICEStaked' && 'Alert on stake amounts exceeding this (e.g., 5000 $JUICE)'}
                      {formData.eventName === 'VaultOpened' && 'Alert only if prize pool exceeds this (e.g., 5000 $JUICE)'}
                      {formData.eventName === 'VaultClosingSoon' && 'Minutes before close to alert (e.g., 5, 10, 30)'}
                      {formData.eventName === 'VaultPayoutDistributed' && 'Minimum payout to alert (e.g., 10000 $JUICE)'}
                      {formData.eventName === 'PlayerNFTSold' && 'Minimum sale price to alert (e.g., 500 $JUICE)'}
                      {formData.eventName === 'FloorPriceChanged' && 'Minimum % change to alert (e.g., 10, 20)'}
                      {formData.eventName === 'DailyStreakReward' && 'Minimum streak days to alert (e.g., 7, 30, 100)'}
                      {!['PlayerScored', 'LineupScored', 'JUICERewardClaimed', 'LargeJUICETransfer', 'JUICEStaked', 'VaultOpened', 'VaultClosingSoon', 'VaultPayoutDistributed', 'PlayerNFTSold', 'FloorPriceChanged', 'DailyStreakReward'].includes(formData.eventName) && 'Optional: Set minimum threshold for this event'}
                    </>
                  )}
                  {!['kittypunch', 'aisports'].includes(bountyType) && 'Optional: Set minimum value threshold for this event'}
                </small>
              </div>
            </>
          )}

          {formData.selectedMetric === 'transaction' && (
            <>
              <div className="form-group">
                <label>
                  Transaction Count Threshold
                  <span className="required-indicator">*</span>
                </label>
                <select
                  value={formData.txThreshold}
                  onChange={(e) => handleInputChange('txThreshold', e.target.value)}
                  className="input-field"
                >
                  <option value="">Select transaction threshold...</option>
                  {TRANSACTION_COUNT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <small>Alert triggers when transaction count exceeds this threshold</small>
              </div>
              <div className="form-group">
                <label>
                  Time Window (Hours)
                  <span className="required-indicator">*</span>
                </label>
                <input
                  type="number"
                  placeholder="e.g., 24"
                  value={formData.txTimeWindow}
                  onChange={(e) => handleInputChange('txTimeWindow', e.target.value)}
                  className="input-field"
                />
                <small>Alert triggers if threshold exceeded within this time window</small>
              </div>
            </>
          )}

          {formData.selectedMetric === 'ownership' && (
            <div className="form-info-box" style={{ background: 'rgba(0, 240, 255, 0.1)', border: '1px solid var(--accent-cyan)' }}>
              <div className="info-icon">👤</div>
              <div className="info-content">
                <strong>Ownership Change Monitoring</strong>
                <p>This watcher will automatically detect when the NFT ownership changes (transfer/sale) and alert you immediately.</p>
                <small style={{ color: 'var(--accent-cyan)', display: 'block', marginTop: '0.5rem' }}>
                  ✓ No additional configuration needed
                </small>
              </div>
            </div>
          )}

          {/* === NEW NFT METRIC: Floor Price === */}
          {formData.selectedMetric === 'nft-floor' && (
            <>
              <div className="form-group">
                <label>
                  Collection Identifier
                  <span className="required-indicator">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., 0xNFTContract or Collection Name"
                  value={formData.collectionIdentifier}
                  onChange={(e) => handleInputChange('collectionIdentifier', e.target.value)}
                  className="input-field"
                />
                <small>NFT collection contract address or identifier</small>
              </div>
              <div className="form-group">
                <label>
                  Floor Price Limit (FLOW)
                  <span className="required-indicator">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g., 50.00"
                  value={formData.floorPriceLimit}
                  onChange={(e) => handleInputChange('floorPriceLimit', e.target.value)}
                  className="input-field"
                />
                <small>Alert when collection floor price exceeds this limit</small>
              </div>
            </>
          )}

          {/* Info Box */}
          {!['ownership'].includes(formData.selectedMetric) && (
          <div className="form-info-box">
              <div className="info-icon">
                {formData.selectedMetric === 'price' && '🏀'}
                {formData.selectedMetric === 'event' && '⚡'}
                {formData.selectedMetric === 'transaction' && '📊'}
                {formData.selectedMetric === 'nft-floor' && '📉'}
              </div>
            <div className="info-content">
                <strong>
                  {formData.selectedMetric === 'price' && 'NFT Price Monitoring'}
                  {formData.selectedMetric === 'event' && 'NFT Event Monitoring'}
                  {formData.selectedMetric === 'transaction' && 'NFT Transaction Tracking'}
                  {formData.selectedMetric === 'nft-floor' && 'NFT Floor Price Tracking'}
                </strong>
                <p>
                  {formData.selectedMetric === 'price' && 
                    'Track your NFT\'s market value and receive alerts when it hits your target price.'}
                  {formData.selectedMetric === 'event' && 
                    'Watch for specific events related to this NFT collection and get notified when they occur.'}
                  {formData.selectedMetric === 'transaction' && 
                    'Monitor trading activity for this NFT and get alerted when volume spikes.'}
                  {formData.selectedMetric === 'nft-floor' && 
                    'Track the floor price of an entire NFT collection and get alerted when it reaches your target.'}
                </p>
            </div>
          </div>
          )}
        </>
      );
    }
    
    return null;
  };

  // ========================================
  // MAIN RENDER FUNCTION
  // ========================================

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="step-content">
            <h3>Select Watcher Template</h3>
            <p className="step-description">Choose a pre-configured template or create a custom tracker</p>
            
            <div className="template-grid">
              {WATCHER_TEMPLATES.map((template) => {
                // ✅ Check if template is locked (Coming Soon)
                const isLocked = template.id === 'cryptokitties-meowcoins' || template.id === 'beezie-collectible';
                
                return (
                  <div
                    key={template.id}
                    className={`template-card ${formData.template?.id === template.id ? 'selected' : ''} ${template.bounty ? 'bounty-template' : ''} ${isLocked ? 'locked' : ''}`}
                    onClick={() => !isLocked && handleTemplateSelect(template)}
                  >
                    {isLocked && (
                      <div className="coming-soon-badge">
                        🔒 Coming Soon
                      </div>
                    )}
                    {template.bounty && !isLocked && (
                      <div className="bounty-badge">
                        <span className="bounty-icon">🎁</span>
                        <span className="bounty-text">BOUNTY</span>
                      </div>
                    )}
                    <div className="template-icon">{template.icon}</div>
                    <h4>{template.name}</h4>
                    <p>{template.description}</p>
                    <span className="template-category">{template.category}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="step-content">
            <h3>Configure Target Asset</h3>
            <p className="step-description">{getConfigureDescription()}</p>
            
            {/* Show template not selected message */}
            {!formData.template && (
              <div className="placeholder-message">
                <div className="placeholder-icon">📋</div>
                <h4>No Template Selected</h4>
                <p>Please select a watcher template in Step 1 to continue.</p>
                <button className="btn-secondary" onClick={handleBack}>
                  ← Back to Templates
                </button>
              </div>
            )}

            {/* Render form based on template type */}
            {formData.template && renderConfigureForm()}

            {/* Form actions (only show if template selected) */}
            {formData.template && (
              <div className="form-actions">
                <button className="btn-secondary" onClick={handleBack}>
                  Back
                </button>
                <button 
                  className="btn-primary" 
                  onClick={handleNext}
                  disabled={!isStep2Valid()}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="step-content">
            <h3>Set Execution Schedule</h3>
            <p className="step-description">Define how often the watcher should check prices</p>
            
            <div className="form-group">
              <label>Check Frequency</label>
              <div className="schedule-input-group">
                <input
                  type="number"
                  min="1"
                  value={formData.scheduleDelay}
                  onChange={(e) => handleInputChange('scheduleDelay', e.target.value)}
                  className="input-field schedule-number"
                />
                <select
                  value={formData.scheduleUnit}
                  onChange={(e) => handleInputChange('scheduleUnit', e.target.value)}
                  className="input-field schedule-unit"
                >
                  <option value="hours">Hours</option>
                  <option value="days">Days</option>
                  <option value="weeks">Weeks</option>
                </select>
              </div>
              <small>Watcher will execute every {formData.scheduleDelay} {formData.scheduleUnit}</small>
            </div>

            <div className="schedule-preview">
              <h4>Schedule Preview</h4>
              <ul>
                <li>First check: ~5 seconds after deployment</li>
                <li>Subsequent checks: Every {formData.scheduleDelay} {formData.scheduleUnit}</li>
                <li>Estimated checks per week: {Math.floor((24 * 7) / calculateScheduleInHours())}</li>
              </ul>
            </div>

            {/* 🤖 Telegram Notifications Section */}
            <div className="telegram-notifications-section" style={{ marginTop: '2rem', padding: '1.5rem', background: 'rgba(30, 41, 59, 0.5)', borderRadius: '8px', border: '1px solid rgba(148, 163, 184, 0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>🤖</span>
                  <h4 style={{ margin: 0 }}>Telegram Notifications</h4>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={formData.enableTelegram}
                    onChange={(e) => handleInputChange('enableTelegram', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
              
              {formData.enableTelegram && (
                <>
                  <div className="form-info-box" style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(234, 179, 8, 0.1)', borderLeft: '4px solid #eab308', borderRadius: '4px' }}>
                    <div className="info-icon">🤖</div>
                    <div className="info-content">
                      <strong>Setup Your Own Bot (1 minute):</strong>
                      <ol style={{ marginBottom: 0, paddingLeft: '1.2rem', marginTop: '0.5rem' }}>
                        <li>Open Telegram, search <code>@BotFather</code></li>
                        <li>Send <code>/newbot</code> and follow instructions</li>
                        <li>Copy the <strong>bot token</strong> (e.g., 1234567890:ABC...)</li>
                        <li>Start chat with your new bot, send <code>/start</code></li>
                        <li>Your chat will be automatically detected! ✨</li>
                      </ol>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Watcher Name (for Telegram) *</label>
                    <input
                      type="text"
                      placeholder="e.g., FROTH Price Tracker, KittyPunch Volume Monitor"
                      value={formData.watcherName}
                      onChange={(e) => handleInputChange('watcherName', e.target.value)}
                      className="input-field"
                      maxLength="50"
                    />
                    <small style={{ color: 'rgba(148, 163, 184, 0.8)' }}>
                      📝 This name will appear in your Telegram notifications
                    </small>
                  </div>

                  <div className="form-group">
                    <label>Bot Token from @BotFather *</label>
                    <input
                      type="text"
                      placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
                      value={formData.telegramBotToken}
                      onChange={(e) => handleInputChange('telegramBotToken', e.target.value)}
                      className="input-field"
                      style={{ fontFamily: 'monospace', fontSize: '0.9em' }}
                    />
                    <small style={{ color: 'rgba(148, 163, 184, 0.8)' }}>
                      {getSavedBotToken() ? '✅ Auto-filled from Settings | ' : ''}
                      🔐 Your bot token (only you have access to this bot)
                    </small>
                  </div>

                  <div className="form-group">
                    <label>Status Update Interval (minutes)</label>
                    <input
                      type="number"
                      min="1"
                      max="1440"
                      placeholder="60"
                      value={formData.notificationInterval}
                      onChange={(e) => handleInputChange('notificationInterval', e.target.value)}
                      className="input-field"
                    />
                    <small style={{ color: 'rgba(148, 163, 184, 0.8)' }}>
                      Receive status updates every {formData.notificationInterval} minutes
                    </small>
                  </div>

                  <div className="notification-types" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        type="checkbox"
                        checked={formData.notifyOnAlert}
                        onChange={(e) => handleInputChange('notifyOnAlert', e.target.checked)}
                      />
                      <span>🚨 Alerts (when condition met)</span>
                    </label>
                    
                    <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        type="checkbox"
                        checked={formData.notifyOnStatus}
                        onChange={(e) => handleInputChange('notifyOnStatus', e.target.checked)}
                      />
                      <span>🔔 Regular status updates</span>
                    </label>
                    
                    <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        type="checkbox"
                        checked={formData.notifyOnError}
                        onChange={(e) => handleInputChange('notifyOnError', e.target.checked)}
                      />
                      <span>⚠️ Error notifications</span>
                    </label>
                  </div>

                  <div className="form-info-box" style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(59, 130, 246, 0.1)', borderLeft: '4px solid #3b82f6', borderRadius: '4px' }}>
                    <div className="info-icon">📱</div>
                    <div className="info-content">
                      <strong>How It Works:</strong>
                      <ul style={{ marginBottom: 0, paddingLeft: '1.2rem' }}>
                        <li>Send <code>/start</code> to your bot after deployment</li>
                        <li>Bot automatically detects your chat ✨</li>
                        <li>Receive updates directly on your phone 📲</li>
                        <li>Status updates every {formData.notificationInterval} minutes</li>
                        <li>Instant alerts when conditions are met 🚨</li>
                      </ul>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="form-actions">
              <button className="btn-secondary" onClick={handleBack}>
                Back
              </button>
              <button className="btn-primary" onClick={handleNext}>
                Next
              </button>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="step-content">
            <h3>Review & Deploy</h3>
            <p className="step-description">Review your watcher configuration before deployment</p>
            
            <div className="review-summary">
              <div className="review-section">
                <h4>Template</h4>
                <div className="review-item">
                  <span className="review-icon">{formData.template?.icon}</span>
                  <span>{formData.template?.name}</span>
                </div>
              </div>

              <div className="review-section">
                <h4>Target Configuration</h4>
                <div className="review-item">
                  <span className="review-label">{getAssetLabelForReview()}:</span>
                  <span className="review-value">{formData.assetId}</span>
                </div>
                {formData.targetAsset && (
                  <div className="review-item">
                    <span className="review-label">{getAssetNameLabelForReview()}:</span>
                    <span className="review-value">{formData.targetAsset}</span>
                  </div>
                )}
                <div className="review-item">
                  <span className="review-label">Metric to Watch:</span>
                  <span className="review-value">
                    {METRIC_OPTIONS.find(m => m.value === formData.selectedMetric)?.icon}{' '}
                    {METRIC_OPTIONS.find(m => m.value === formData.selectedMetric)?.label}
                  </span>
                </div>
                {formData.selectedMetric === 'price' && formData.priceLimit && (
                <div className="review-item">
                  <span className="review-label">Price Limit:</span>
                  <span className="review-value">{formData.priceLimit} {getPriceCurrencyForReview()}</span>
                </div>
                )}
                {formData.selectedMetric === 'event' && (
                  <>
                    <div className="review-item">
                      <span className="review-label">Event Name:</span>
                      <span className="review-value">{formData.eventName}</span>
                    </div>
                    {formData.eventParameter && (
                      <div className="review-item">
                        <span className="review-label">Event Filter:</span>
                        <span className="review-value">{formData.eventParameter}</span>
                      </div>
                    )}
                  </>
                )}
                {formData.selectedMetric === 'transaction' && (
                  <>
                    <div className="review-item">
                      <span className="review-label">Transaction Threshold:</span>
                      <span className="review-value">{formData.txThreshold} transactions</span>
                    </div>
                    <div className="review-item">
                      <span className="review-label">Time Window:</span>
                      <span className="review-value">{formData.txTimeWindow} hours</span>
                    </div>
                  </>
                )}
                {formData.selectedMetric === 'ownership' && (
                  <div className="review-item">
                    <span className="review-label">Trigger:</span>
                    <span className="review-value">Any ownership change</span>
                  </div>
                )}
              </div>

              <div className="review-section">
                <h4>Schedule</h4>
                <div className="review-item">
                  <span className="review-label">Frequency:</span>
                  <span className="review-value">Every {formData.scheduleDelay} {formData.scheduleUnit}</span>
                </div>
                <div className="review-item">
                  <span className="review-label">Total Hours:</span>
                  <span className="review-value">{calculateScheduleInHours()} hours</span>
                </div>
              </div>

              {formData.enableTelegram && (
                <div className="review-section" style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                  <h4>🤖 Telegram Notifications</h4>
                  <div className="review-item">
                    <span className="review-label">Status:</span>
                    <span className="review-value">✅ Enabled</span>
                  </div>
                  <div className="review-item">
                    <span className="review-label">Watcher Name:</span>
                    <span className="review-value">{formData.watcherName || formData.template?.name || 'Watcher'}</span>
                  </div>
                  <div className="review-item">
                    <span className="review-label">Bot Token:</span>
                    <span className="review-value" style={{ fontFamily: 'monospace', fontSize: '0.85em' }}>
                      {formData.telegramBotToken.substring(0, 15)}...
                    </span>
                  </div>
                  <div className="review-item">
                    <span className="review-label">Chat Detection:</span>
                    <span className="review-value">✨ Automatic (send /start to bot)</span>
                  </div>
                  <div className="review-item">
                    <span className="review-label">Update Interval:</span>
                    <span className="review-value">{formData.notificationInterval} minutes</span>
                  </div>
                  <div className="review-item">
                    <span className="review-label">Notifications:</span>
                    <span className="review-value">
                      {formData.notifyOnAlert && '🚨 Alerts '}
                      {formData.notifyOnStatus && '🔔 Status '}
                      {formData.notifyOnError && '⚠️ Errors'}
                    </span>
                  </div>
                </div>
              )}

              <div className="review-section fee-section">
                <h4>💰 Estimated Costs</h4>
                
                {(() => {
                  const costData = calculateTotalCost();
                  return (
                    <>
                      <div className="review-item">
                        <span className="review-label">Fee per Check:</span>
                        <span className="review-value fee-value">{costData.feePerExecution} FLOW</span>
                      </div>
                      <div className="review-item">
                        <span className="review-label">Check Frequency:</span>
                        <span className="review-value">Every {costData.scheduleHours} hour{costData.scheduleHours > 1 ? 's' : ''}</span>
                      </div>
                      
                      <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                        <small style={{ display: 'block', marginBottom: '8px', color: 'rgba(255, 255, 255, 0.6)' }}>
                          📊 Total Cost Estimates:
                        </small>
                        
                        <div style={{ display: 'grid', gap: '6px', fontSize: '13px' }}>
                          <div className="review-item" style={{ padding: '4px 0' }}>
                            <span className="review-label">1 Hour:</span>
                            <span className="review-value">{costData.durations['1h'].executions}x checks = {costData.durations['1h'].cost} FLOW</span>
                          </div>
                          <div className="review-item" style={{ padding: '4px 0' }}>
                            <span className="review-label">6 Hours:</span>
                            <span className="review-value">{costData.durations['6h'].executions}x checks = {costData.durations['6h'].cost} FLOW</span>
                          </div>
                          <div className="review-item" style={{ padding: '4px 0' }}>
                            <span className="review-label">24 Hours (1 day):</span>
                            <span className="review-value" style={{ color: '#00FFAA', fontWeight: '600' }}>
                              {costData.durations['24h'].executions}x checks = {costData.durations['24h'].cost} FLOW
                            </span>
                          </div>
                          <div className="review-item" style={{ padding: '4px 0' }}>
                            <span className="review-label">7 Days:</span>
                            <span className="review-value">{costData.durations['7d'].executions}x checks = {costData.durations['7d'].cost} FLOW</span>
                          </div>
                          <div className="review-item" style={{ padding: '6px 8px', background: 'rgba(255, 170, 0, 0.1)', borderRadius: '4px' }}>
                            <span className="review-label" style={{ fontWeight: '600' }}>30 Days (1 month):</span>
                            <span className="review-value" style={{ color: '#FFAA00', fontWeight: '700' }}>
                              {costData.durations['30d'].executions}x checks = {costData.durations['30d'].cost} FLOW
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(59, 130, 246, 0.15)', borderLeft: '3px solid #3B82F6', borderRadius: '4px' }}>
                        <small style={{ display: 'block', color: 'rgba(255, 255, 255, 0.9)', lineHeight: '1.6' }}>
                          <strong>🧪 TESTNET ACTUAL PRICING:</strong><br/>
                          • <strong style={{ color: '#00FFAA' }}>~0.00126 FLOW per check</strong> (tested and confirmed on-chain)<br/>
                          • Testnet FLOW tokens are <strong>FREE</strong> from <a href="https://testnet-faucet.onflow.org" target="_blank" style={{ color: '#3B82F6', textDecoration: 'underline' }}>Flow Faucet</a><br/>
                          • Based on executionEffort: 1000, Priority: Medium<br/>
                          • Each check is a scheduled transaction on Flow blockchain<br/>
                          • You can pause/resume anytime to save tokens
                        </small>
                      </div>
                      
                      <small style={{ display: 'block', marginTop: '8px', color: 'rgba(255, 255, 255, 0.5)', fontSize: '11px', fontStyle: 'italic' }}>
                        ✅ Verified from test transaction ebcc627a2730cb8e (0.00125644 FLOW actual fee)
                      </small>
                    </>
                  );
                })()}
              </div>
            </div>

            {deployError && (
              <div className="error-message">
                ⚠️ {deployError}
              </div>
            )}

            {deploySuccess && (
              <div style={{
                padding: 'var(--spacing-lg)',
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)',
                border: '2px solid rgba(16, 185, 129, 0.3)',
                borderRadius: 'var(--radius-lg)',
                marginBottom: 'var(--spacing-lg)',
                animation: 'slideInDown 0.3s ease-out'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-sm)',
                  marginBottom: 'var(--spacing-md)',
                  fontSize: '1.125rem',
                  fontWeight: 600,
                  color: '#10B981'
                }}>
                  ✅ Watcher Deployed Successfully!
                </div>
                
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--spacing-sm)',
                  fontSize: '0.875rem',
                  color: 'var(--text-primary)'
                }}>
                  <div>
                    <strong>Watcher ID:</strong> {deploySuccess.watcherId || 'N/A'}
                  </div>
                  
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--spacing-xs)',
                    marginTop: 'var(--spacing-sm)'
                  }}>
                    <div>
                      <strong>📝 Transaction Proof:</strong>
                      {deploySuccess.transactionId && deploySuccess.transactionId !== 'undefined' ? (
                        <a
                          href={`https://testnet.flowscan.io/tx/${deploySuccess.transactionId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            marginLeft: 'var(--spacing-xs)',
                            color: '#3B82F6',
                            textDecoration: 'underline',
                            fontWeight: 500
                          }}
                        >
                          View on FlowScan
                          <span style={{ fontSize: '0.75rem' }}>↗</span>
                        </a>
                      ) : (
                        <span style={{
                          marginLeft: 'var(--spacing-xs)',
                          color: 'var(--text-muted)',
                          fontStyle: 'italic'
                        }}>
                          Transaction ID unavailable
                        </span>
                      )}
                      {deploySuccess.transactionId && (
                        <div style={{
                          fontSize: '0.75rem',
                          color: 'var(--text-dim)',
                          fontFamily: 'monospace',
                          marginTop: '4px',
                          wordBreak: 'break-all'
                        }}>
                          ID: {deploySuccess.transactionId}
                        </div>
                      )}
                    </div>
                    
                    {deploySuccess.scheduledTxId && (
                      <div>
                        <strong>⏰ Scheduled Transaction ID:</strong>
                        <span style={{ 
                          fontFamily: 'monospace', 
                          fontSize: '0.813rem',
                          marginLeft: 'var(--spacing-xs)',
                          color: 'var(--text-primary)'
                        }}>
                          {deploySuccess.scheduledTxId}
                        </span>
                        <div style={{ marginTop: '4px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Note: Scheduled transactions are managed by FlowTransactionScheduler and may not appear on FlowScan until executed.
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Scheduled Transaction Details - FlowScan Format */}
                  {deploySuccess.scheduledTxId || deploySuccess.scheduledTimestamp ? (
                    <div style={{
                      marginTop: 'var(--spacing-md)',
                      padding: 'var(--spacing-lg)',
                      background: 'var(--bg-secondary)',
                      borderRadius: 'var(--radius-lg)',
                      border: '1px solid var(--border-primary)'
                    }}>
                      <div style={{ 
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 'var(--spacing-md)',
                        paddingBottom: 'var(--spacing-sm)',
                        borderBottom: '1px solid var(--border-subtle)'
                      }}>
                        <h3 style={{ 
                          fontWeight: 600, 
                          fontSize: '1rem',
                          color: 'var(--text-primary)',
                          margin: 0
                        }}>
                          ⏰ Scheduled Transaction
                        </h3>
                        <span style={{
                          padding: '4px 12px',
                          background: 'rgba(245, 158, 11, 0.2)',
                          color: 'var(--accent-gold)',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 600
                        }}>
                          scheduled
                        </span>
                      </div>
                      
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'auto 1fr',
                        gap: 'var(--spacing-sm) var(--spacing-md)',
                        fontSize: '0.875rem'
                      }}>
                        {deploySuccess.scheduledTxId && (
                          <>
                            <div style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Id</div>
                            <div style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                              {deploySuccess.scheduledTxId}
                            </div>
                          </>
                        )}
                        
                        {deploySuccess.handlerOwner && (
                          <>
                            <div style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Owner</div>
                            <div style={{ color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: '0.813rem' }}>
                              {deploySuccess.handlerOwner.length > 20 
                                ? `${deploySuccess.handlerOwner.slice(0, 6)}...${deploySuccess.handlerOwner.slice(-4)}`
                                : deploySuccess.handlerOwner}
                            </div>
                          </>
                        )}
                        
                        {deploySuccess.scheduledTimestamp && (
                          <>
                            <div style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Expected at</div>
                            <div style={{ color: 'var(--text-primary)' }}>
                              {(() => {
                                const flowGenesisOffset = 946684800;
                                const unixTimestamp = (deploySuccess.scheduledTimestamp + flowGenesisOffset) * 1000;
                                return new Date(unixTimestamp).toLocaleString('en-US', {
                                  month: 'long',
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit',
                                  hour12: false
                                });
                              })()}
                            </div>
                          </>
                        )}
                        
                        {deploySuccess.transactionId && (
                          <>
                            <div style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Scheduled By</div>
                            <div style={{ color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: '0.813rem', wordBreak: 'break-all' }}>
                              {deploySuccess.transactionId}
                            </div>
                          </>
                        )}
                        
                        {deploySuccess.handlerTypeIdentifier && (
                          <>
                            <div style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Handler Contract</div>
                            <div style={{ color: 'var(--text-primary)' }}>
                              {deploySuccess.handlerTypeIdentifier.split('.').pop() || deploySuccess.handlerTypeIdentifier}
                            </div>
                          </>
                        )}
                        
                        {deploySuccess.handlerUUID && (
                          <>
                            <div style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Handler UUID</div>
                            <div style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                              {deploySuccess.handlerUUID}
                            </div>
                          </>
                        )}
                        
                        {deploySuccess.fees !== null && deploySuccess.fees !== undefined && (
                          <>
                            <div style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Fees</div>
                            <div style={{ color: 'var(--text-primary)' }}>
                              {parseFloat(deploySuccess.fees).toFixed(2)} FLOW
                            </div>
                          </>
                        )}
                        
                        {deploySuccess.scheduleDelay && (
                          <>
                            <div style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Interval</div>
                            <div style={{ color: 'var(--text-primary)' }}>
                              Every {deploySuccess.scheduleDelay || 24} hour{deploySuccess.scheduleDelay !== 1 ? 's' : ''}
                            </div>
                          </>
                        )}
                      </div>
                      
                      {deploySuccess.scheduledTxId && (
                        <div style={{
                          marginTop: 'var(--spacing-md)',
                          paddingTop: 'var(--spacing-md)',
                          borderTop: '1px solid var(--border-subtle)'
                        }}>
                          <a
                            href={`https://testnet.flowscan.io/scheduled-tx/${deploySuccess.scheduledTxId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              color: '#3B82F6',
                              textDecoration: 'none',
                              fontSize: '0.813rem',
                              fontWeight: 500
                            }}
                          >
                            <span>View on FlowScan</span>
                            <span style={{ fontSize: '0.625rem' }}>↗</span>
                          </a>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{
                      marginTop: 'var(--spacing-md)',
                      padding: 'var(--spacing-md)',
                      background: 'rgba(245, 158, 11, 0.1)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid rgba(245, 158, 11, 0.3)'
                    }}>
                      <div style={{ fontSize: '0.813rem', color: 'var(--text-muted)' }}>
                        ⚠️ Schedule information not found in transaction events. The watcher may still be scheduled - check the transaction events on FlowScan.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="form-actions">
              <button className="btn-secondary" onClick={handleBack} disabled={isDeploying}>
                Back
              </button>
              <button 
                className="btn-deploy" 
                onClick={handleDeploy}
                disabled={isDeploying}
              >
                {isDeploying ? (
                  <>
                    <span className="spinner-small"></span>
                    Deploying...
                  </>
                ) : (
                  <>
                    🚀 DEPLOY WATCHER
                  </>
                )}
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        
        <div className="modal-content">
          {/* Progress Tracker */}
          <div className="progress-tracker">
            <h2 className="modal-title">Deploy New Watcher</h2>
            <div className="steps-container">
              {steps.map((step) => (
                <div
                  key={step.number}
                  className={`step-item ${currentStep === step.number ? 'active' : ''} ${currentStep > step.number ? 'completed' : ''}`}
                >
                  <div className="step-number">
                    {currentStep > step.number ? '✓' : step.icon}
                  </div>
                  <div className="step-info">
                    <span className="step-label">Step {step.number}</span>
                    <span className="step-title">{step.title}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Step Content */}
          <div className="modal-body">
            {renderStepContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeployModal;

