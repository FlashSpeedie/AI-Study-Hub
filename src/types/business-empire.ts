export type CardType = 
  | 'Student Card'
  | 'Basic Card'
  | 'Silver Card'
  | 'Gold Card'
  | 'Platinum Card'
  | 'Diamond Card'
  | 'Black Card'
  | 'Infinite Card';

export interface Card {
  id: string;
  name: CardType;
  earningsPerClick: number;
  cost: number;
  color: string;
  gradient: string;
  description: string;
}

export interface Business {
  id: string;
  name: string;
  type: 'profitable' | 'risky' | 'unprofitable';
  cost: number;
  earningsPerSecond: number;  maintenancePerSecond: number;
  owned: number;
  icon: string;
}

export interface MarketAsset {
  id: string;
  symbol: string;
  name: string;
  type: 'stock' | 'crypto';
  price: number;
  owned: number;
  previousPrice: number;
  volatility: number;
  priceHistory?: number[];
}

export interface RealEstate {
  id: string;
  name: string;
  type: 'house' | 'apartment' | 'commercial' | 'land';
  cost: number;
  earningsPerSecond: number;
  maintenancePerSecond: number;
  owned: number;
  icon: string;
}

export interface LuxuryAsset {
  id: string;
  name: string;
  category: 'car' | 'yacht' | 'plane' | 'island' | 'watch' | 'jewelry' | 'sports' | 'other';
  cost: number;
  owned: number;
  prestige: number;
  icon: string;
}

export interface BusinessEmpireState {
  cash: number;
  netWorth: number;
  
  currentCard: CardType;
  totalClicks: number;
  clickEarnings: number;
  
  businesses: Business[];
  
  marketAssets: MarketAsset[];
  
  realEstate: RealEstate[];
  
  luxuryAssets: LuxuryAsset[];
  
  // Stats
  totalEarned: number;
  totalSpent: number;
  earningsPerSecond: number;
  maintenancePerSecond: number;
  lastSaved: number;
}

// Leaderboard entry
export interface LeaderboardEntry {
  id: string;
  user_id: string;
  username: string | null;
  net_worth: number;
  total_clicks: number;
  highest_card: string;
  rank?: number;
}

// Predefined game data - Cards with gradients
export const CARDS: Card[] = [
  { id: '1', name: 'Student Card', earningsPerClick: 1, cost: 0, color: '#6B7280', gradient: 'linear-gradient(135deg, #6B7280 0%, #9CA3AF 100%)', description: 'A basic student ID card' },
  { id: '2', name: 'Basic Card', earningsPerClick: 5, cost: 100, color: '#3B82F6', gradient: 'linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)', description: 'Your first credit card' },
  { id: '3', name: 'Silver Card', earningsPerClick: 25, cost: 500, color: '#9CA3AF', gradient: 'linear-gradient(135deg, #9CA3AF 0%, #D1D5DB 100%)', description: 'Silver tier benefits' },
  { id: '4', name: 'Gold Card', earningsPerClick: 100, cost: 2500, color: '#F59E0B', gradient: 'linear-gradient(135deg, #F59E0B 0%, #FCD34D 100%)', description: 'Gold member exclusive' },
  { id: '5', name: 'Platinum Card', earningsPerClick: 500, cost: 15000, color: '#8B5CF6', gradient: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)', description: 'Platinum prestige' },
  { id: '6', name: 'Diamond Card', earningsPerClick: 2000, cost: 100000, color: '#06B6D4', gradient: 'linear-gradient(135deg, #06B6D4 0%, #22D3EE 100%)', description: 'Diamond elite status' },
  { id: '7', name: 'Black Card', earningsPerClick: 10000, cost: 1000000, color: '#1F2937', gradient: 'linear-gradient(135deg, #1F2937 0%, #374151 100%)', description: 'The ultimate status symbol' },
  { id: '8', name: 'Infinite Card', earningsPerClick: 100000, cost: 50000000, color: '#DC2626', gradient: 'linear-gradient(135deg, #DC2626 0%, #EF4444 100%)', description: 'Unlimited power' },
];

// Businesses - mix of profitable, risky, and unprofitable
export const BUSINESSES: Omit<Business, 'owned'>[] = [
  // PROFITABLE - Safe investments
  { id: 'b1', name: 'Lemonade Stand', type: 'profitable', cost: 50, earningsPerSecond: 2, maintenancePerSecond: 0.1, icon: '🍋' },
  { id: 'b2', name: 'Newspaper Route', type: 'profitable', cost: 200, earningsPerSecond: 8, maintenancePerSecond: 0.5, icon: '📰' },
  { id: 'b3', name: 'Dog Walking Service', type: 'profitable', cost: 1000, earningsPerSecond: 35, maintenancePerSecond: 2, icon: '🐕' },
  { id: 'b4', name: 'Tutoring Service', type: 'profitable', cost: 5000, earningsPerSecond: 150, maintenancePerSecond: 10, icon: '📚' },
  { id: 'b5', name: 'Food Truck', type: 'profitable', cost: 25000, earningsPerSecond: 600, maintenancePerSecond: 50, icon: '🌮' },
  { id: 'b6', name: 'Small Restaurant', type: 'profitable', cost: 100000, earningsPerSecond: 2000, maintenancePerSecond: 300, icon: '🍕' },
  { id: 'b7', name: 'Boutique Hotel', type: 'profitable', cost: 500000, earningsPerSecond: 8000, maintenancePerSecond: 1500, icon: '🏨' },
  { id: 'b8', name: 'Tech Startup', type: 'profitable', cost: 2500000, earningsPerSecond: 35000, maintenancePerSecond: 5000, icon: '💻' },
  { id: 'b9', name: 'Software Company', type: 'profitable', cost: 15000000, earningsPerSecond: 150000, maintenancePerSecond: 30000, icon: '📱' },
  { id: 'b10', name: 'AI Research Lab', type: 'profitable', cost: 100000000, earningsPerSecond: 800000, maintenancePerSecond: 200000, icon: '🤖' },
  
  // RISKY - Higher variance, can be profitable or not
  { id: 'b11', name: 'Car Wash', type: 'risky', cost: 15000, earningsPerSecond: 500, maintenancePerSecond: 200, icon: '🚗' },
  { id: 'b12', name: 'Convenience Store', type: 'risky', cost: 75000, earningsPerSecond: 2500, maintenancePerSecond: 800, icon: '🏪' },
  { id: 'b13', name: 'Movie Theater', type: 'risky', cost: 400000, earningsPerSecond: 12000, maintenancePerSecond: 5000, icon: '🎬' },
  { id: 'b14', name: 'Amusement Park', type: 'risky', cost: 2000000, earningsPerSecond: 50000, maintenancePerSecond: 25000, icon: '🎢' },
  { id: 'b15', name: 'Casino', type: 'risky', cost: 15000000, earningsPerSecond: 400000, maintenancePerSecond: 200000, icon: '🎰' },
  
  // UNPROFITABLE - High maintenance, money pits
  { id: 'b16', name: 'Race Track', type: 'unprofitable', cost: 5000000, earningsPerSecond: 50000, maintenancePerSecond: 80000, icon: '🏎️' },
  { id: 'b17', name: 'Zoo', type: 'unprofitable', cost: 25000000, earningsPerSecond: 100000, maintenancePerSecond: 250000, icon: '🦁' },
  { id: 'b18', name: 'Professional Sports Team', type: 'unprofitable', cost: 100000000, earningsPerSecond: 500000, maintenancePerSecond: 1500000, icon: '🏈' },
  { id: 'b19', name: 'Space Company', type: 'unprofitable', cost: 500000000, earningsPerSecond: 1000000, maintenancePerSecond: 5000000, icon: '🚀' },
  { id: 'b20', name: 'Formula 1 Team', type: 'unprofitable', cost: 2000000000, earningsPerSecond: 5000000, maintenancePerSecond: 30000000, icon: '🏁' },
];

// 15+ Stocks and 10+ Crypto
export const INITIAL_MARKET_ASSETS: Omit<MarketAsset, 'owned' | 'previousPrice' | 'priceHistory'>[] = [
  // Tech Stocks
  { id: 'm1', symbol: 'NVDA', name: 'NVIDIA Corp', type: 'stock', price: 500, volatility: 0.02 },
  { id: 'm2', symbol: 'GOOG', name: 'Alphabet Inc', type: 'stock', price: 150, volatility: 0.015 },
  { id: 'm3', symbol: 'MSFT', name: 'Microsoft', type: 'stock', price: 400, volatility: 0.012 },
  { id: 'm4', symbol: 'APPL', name: 'Apple Inc', type: 'stock', price: 180, volatility: 0.013 },
  { id: 'm5', symbol: 'TSLA', name: 'Tesla Inc', type: 'stock', price: 250, volatility: 0.035 },
  { id: 'm6', symbol: 'AMZN', name: 'Amazon.com', type: 'stock', price: 180, volatility: 0.018 },
  { id: 'm7', symbol: 'META', name: 'Meta Platforms', type: 'stock', price: 500, volatility: 0.025 },
  { id: 'm8', symbol: 'AIPL', name: 'AI Tech Corp', type: 'stock', price: 100, volatility: 0.022 },
  { id: 'm9', symbol: 'ROBO', name: 'Robotics Inc', type: 'stock', price: 75, volatility: 0.028 },
  { id: 'm10', symbol: 'QUAN', name: 'Quantum AI', type: 'stock', price: 200, volatility: 0.04 },
  { id: 'm11', symbol: 'CYBR', name: 'CyberTech', type: 'stock', price: 120, volatility: 0.025 },
  { id: 'm12', symbol: 'CLOUD', name: 'Cloud Systems', type: 'stock', price: 90, volatility: 0.02 },
  { id: 'm13', symbol: 'NEURA', name: 'Neural Networks', type: 'stock', price: 180, volatility: 0.035 },
  { id: 'm14', symbol: 'SPACE', name: 'SpaceXplore', type: 'stock', price: 220, volatility: 0.045 },
  { id: 'm15', symbol: 'BIOT', name: 'BioTech Labs', type: 'stock', price: 85, volatility: 0.03 },
  // Crypto
  { id: 'm16', symbol: 'BTC', name: 'Bitcoin', type: 'crypto', price: 50000, volatility: 0.05 },
  { id: 'm17', symbol: 'ETH', name: 'Ethereum', type: 'crypto', price: 3000, volatility: 0.06 },
  { id: 'm18', symbol: 'SOL', name: 'Solana', type: 'crypto', price: 100, volatility: 0.08 },
  { id: 'm19', symbol: 'ADA', name: 'Cardano', type: 'crypto', price: 0.5, volatility: 0.07 },
  { id: 'm20', symbol: 'DOT', name: 'Polkadot', type: 'crypto', price: 7, volatility: 0.065 },
  { id: 'm21', symbol: 'LINK', name: 'Chainlink', type: 'crypto', price: 15, volatility: 0.055 },
  { id: 'm22', symbol: 'AVAX', name: 'Avalanche', type: 'crypto', price: 35, volatility: 0.075 },
  { id: 'm23', symbol: 'MATIC', name: 'Polygon', type: 'crypto', price: 0.8, volatility: 0.07 },
  { id: 'm24', symbol: 'UNI', name: 'Uniswap', type: 'crypto', price: 6, volatility: 0.06 },
  { id: 'm25', symbol: 'AICO', name: 'AICoin', type: 'crypto', price: 500, volatility: 0.12 },
];

export const REAL_ESTATE_PROPERTIES: Omit<RealEstate, 'owned'>[] = [
  { id: 'r1', name: 'Small House', type: 'house', cost: 50000, earningsPerSecond: 15, maintenancePerSecond: 2, icon: '🏠' },
  { id: 'r2', name: 'Beach House', type: 'house', cost: 250000, earningsPerSecond: 60, maintenancePerSecond: 10, icon: '🏖️' },
  { id: 'r3', name: 'Mountain Cabin', type: 'house', cost: 400000, earningsPerSecond: 100, maintenancePerSecond: 20, icon: '🏔️' },
  { id: 'r4', name: 'Mansion', type: 'house', cost: 1000000, earningsPerSecond: 250, maintenancePerSecond: 50, icon: '🏰' },
  { id: 'r5', name: 'Estate Villa', type: 'house', cost: 5000000, earningsPerSecond: 1200, maintenancePerSecond: 300, icon: '🏛️' },
  { id: 'r6', name: 'City Apartment', type: 'apartment', cost: 150000, earningsPerSecond: 40, maintenancePerSecond: 8, icon: '🏢' },
  { id: 'r7', name: 'Penthouse Suite', type: 'apartment', cost: 750000, earningsPerSecond: 180, maintenancePerSecond: 40, icon: '🌇' },
  { id: 'r8', name: 'Luxury Condo', type: 'apartment', cost: 1500000, earningsPerSecond: 350, maintenancePerSecond: 80, icon: '🌆' },
  { id: 'r9', name: 'Skyscraper Office', type: 'commercial', cost: 5000000, earningsPerSecond: 1200, maintenancePerSecond: 300, icon: '🏬' },
  { id: 'r10', name: 'Shopping Mall', type: 'commercial', cost: 25000000, earningsPerSecond: 6000, maintenancePerSecond: 1500, icon: '🛍️' },
  { id: 'r11', name: 'Industrial Park', type: 'commercial', cost: 100000000, earningsPerSecond: 25000, maintenancePerSecond: 6000, icon: '🏭' },
  { id: 'r12', name: 'Tech Campus', type: 'commercial', cost: 500000000, earningsPerSecond: 120000, maintenancePerSecond: 30000, icon: '🏢' },
  { id: 'r13', name: 'Vacation Land', type: 'land', cost: 300000, earningsPerSecond: 80, maintenancePerSecond: 15, icon: '🌴' },
  { id: 'r14', name: 'Development Plot', type: 'land', cost: 2500000, earningsPerSecond: 600, maintenancePerSecond: 100, icon: '🏗️' },
  { id: 'r15', name: 'Farmland', type: 'land', cost: 10000000, earningsPerSecond: 2500, maintenancePerSecond: 500, icon: '🌾' },
  { id: 'r16', name: 'Oil Field', type: 'land', cost: 100000000, earningsPerSecond: 30000, maintenancePerSecond: 8000, icon: '🛢️' },
  { id: 'r17', name: 'Rare Mineral Mine', type: 'land', cost: 500000000, earningsPerSecond: 120000, maintenancePerSecond: 35000, icon: '💎' },
  { id: 'r18', name: 'Moon Colony', type: 'land', cost: 5000000000, earningsPerSecond: 1200000, maintenancePerSecond: 400000, icon: '🌙' },
  { id: 'r19', name: 'Mars Settlement', type: 'land', cost: 50000000000, earningsPerSecond: 12000000, maintenancePerSecond: 4000000, icon: '🔴' },
  { id: 'r20', name: 'Space Station', type: 'land', cost: 250000000000, earningsPerSecond: 60000000, maintenancePerSecond: 20000000, icon: '🛰️' },
];

export const LUXURY_ASSETS: Omit<LuxuryAsset, 'owned'>[] = [
  // Cars
  { id: 'l1', name: 'Used Honda', category: 'car', cost: 10000, prestige: 1, icon: '🚙' },
  { id: 'l2', name: 'Toyota Camry', category: 'car', cost: 30000, prestige: 2, icon: '🚗' },
  { id: 'l3', name: 'BMW X5', category: 'car', cost: 75000, prestige: 5, icon: '🚘' },
  { id: 'l4', name: 'Mercedes S-Class', category: 'car', cost: 150000, prestige: 10, icon: '🚔' },
  { id: 'l5', name: 'Porsche 911', category: 'car', cost: 250000, prestige: 20, icon: '🏎️' },
  { id: 'l6', name: 'Ferrari 488', category: 'car', cost: 500000, prestige: 40, icon: '🏎️' },
  { id: 'l7', name: 'Lamborghini Aventador', category: 'car', cost: 1000000, prestige: 80, icon: '🏎️' },
  { id: 'l8', name: 'Bugatti Chiron', category: 'car', cost: 5000000, prestige: 200, icon: '🏎️' },
  // Yachts
  { id: 'l9', name: 'Small Yacht', category: 'yacht', cost: 500000, prestige: 50, icon: '🚤' },
  { id: 'l10', name: 'Luxury Yacht', category: 'yacht', cost: 2500000, prestige: 150, icon: '🛥️' },
  { id: 'l11', name: 'Mega Yacht', category: 'yacht', cost: 25000000, prestige: 500, icon: '🛥️' },
  // Planes
  { id: 'l12', name: 'Private Jet', category: 'plane', cost: 10000000, prestige: 300, icon: '✈️' },
  { id: 'l13', name: 'Gulfstream G650', category: 'plane', cost: 70000000, prestige: 1000, icon: '✈️' },
  { id: 'l14', name: 'Airbus A380', category: 'plane', cost: 500000000, prestige: 5000, icon: '🛫' },
  // Islands
  { id: 'l15', name: 'Private Island', category: 'island', cost: 5000000, prestige: 200, icon: '🏝️' },
  { id: 'l16', name: 'Luxury Resort Island', category: 'island', cost: 100000000, prestige: 1000, icon: '🏝️' },
  // Other
  { id: 'l17', name: 'Luxury Watch', category: 'watch', cost: 15000, prestige: 2, icon: '⌚' },
  { id: 'l18', name: 'Diamond Necklace', category: 'jewelry', cost: 100000, prestige: 10, icon: '💎' },
  { id: 'l19', name: 'Sports Team', category: 'sports', cost: 1000000000, prestige: 5000, icon: '🏆' },
  { id: 'l20', name: 'F1 Racing Team', category: 'sports', cost: 5000000000, prestige: 15000, icon: '🏁' },
  { id: 'l21', name: 'Pro Soccer Club', category: 'sports', cost: 10000000000, prestige: 25000, icon: '⚽' },
  { id: 'l22', name: 'Yacht Squadron', category: 'other', cost: 100000000, prestige: 800, icon: '⚓' },
  { id: 'l23', name: 'Art Collection', category: 'other', cost: 50000000, prestige: 400, icon: '🎨' },
  { id: 'l24', name: 'Wine Vintage Collection', category: 'other', cost: 25000000, prestige: 200, icon: '🍷' },
  { id: 'l25', name: 'Rare Artifact', category: 'other', cost: 250000000, prestige: 1500, icon: '🏺' },
];
