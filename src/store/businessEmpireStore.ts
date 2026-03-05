import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  BusinessEmpireState, 
  CardType,
  Business,
  MarketAsset,
  RealEstate,
  LuxuryAsset,
  CARDS,
  BUSINESSES,
  INITIAL_MARKET_ASSETS,
  REAL_ESTATE_PROPERTIES,
  LUXURY_ASSETS
} from '@/types/business-empire';

// Game constants
const TICK_INTERVAL_MS = 100; // 10 ticks per second
const TICKS_PER_SECOND = 1000 / TICK_INTERVAL_MS;

interface BusinessEmpireActions {
  // Clicker actions
  clickCard: () => void;
  upgradeCard: (cardName: CardType) => boolean;
  
  // Business actions
  buyBusiness: (businessId: string) => boolean;
  sellBusiness: (businessId: string, amount?: number) => boolean;
  
  // Market actions
  buyAsset: (assetId: string, amount: number) => boolean;
  sellAsset: (assetId: string, amount: number) => boolean;
  updateMarketPrices: () => void;
  
  // Real Estate actions
  buyProperty: (propertyId: string) => boolean;
  sellProperty: (propertyId: string, amount?: number) => boolean;
  
  // Luxury actions
  buyLuxury: (assetId: string) => boolean;
  
  // Game loop
  tick: () => void;
  setLastSyncTime: (time: number) => void;
  getLastSyncTime: () => number;
  
  // Actions
  resetGame: () => void;
  getNetWorth: () => number;
  getEarningsPerSecond: () => number;
  getMaintenancePerSecond: () => number;
  getNetIncomePerSecond: () => number;
}

// Helper to generate initial state - NO passive income initially!
const generateInitialState = (): BusinessEmpireState => ({
  cash: 0,
  netWorth: 0,
  currentCard: 'Student Card',
  totalClicks: 0,
  clickEarnings: 1,
  businesses: BUSINESSES.map(b => ({ ...b, owned: 0 })),
  marketAssets: INITIAL_MARKET_ASSETS.map(m => ({ ...m, owned: 0, previousPrice: m.price, priceHistory: [m.price] })),
  realEstate: REAL_ESTATE_PROPERTIES.map(r => ({ ...r, owned: 0 })),
  luxuryAssets: LUXURY_ASSETS.map(l => ({ ...l, owned: 0 })),
  totalEarned: 0,
  totalSpent: 0,
  earningsPerSecond: 0,
  maintenancePerSecond: 0,
  lastSaved: Date.now(),
});

export const useBusinessEmpireStore = create<BusinessEmpireState & BusinessEmpireActions>()(
  persist(
    (set, get) => ({
      ...generateInitialState(),
      
      // Track last sync time for debouncing
      lastSaved: Date.now(),

      clickCard: () => {
        const state = get();
        const card = CARDS.find(c => c.name === state.currentCard);
        const earnings = card?.earningsPerClick || 1;
        
        set({
          cash: state.cash + earnings,
          totalClicks: state.totalClicks + 1,
          totalEarned: state.totalEarned + earnings,
        });
        
        // Recalculate net worth
        const netWorth = get().getNetWorth();
        set({ netWorth });
      },

      upgradeCard: (cardName: CardType): boolean => {
        const state = get();
        const newCard = CARDS.find(c => c.name === cardName);
        const currentCardIndex = CARDS.findIndex(c => c.name === state.currentCard);
        const newCardIndex = CARDS.findIndex(c => c.name === cardName);
        
        if (!newCard || newCardIndex <= currentCardIndex) return false;
        if (state.cash < newCard.cost) return false;
        
        set({
          cash: state.cash - newCard.cost,
          currentCard: cardName,
          clickEarnings: newCard.earningsPerClick,
          totalSpent: state.totalSpent + newCard.cost,
        });
        
        return true;
      },

      buyBusiness: (businessId: string): boolean => {
        const state = get();
        const business = state.businesses.find(b => b.id === businessId);
        if (!business || state.cash < business.cost) return false;
        
        const updatedBusinesses = state.businesses.map(b => 
          b.id === businessId 
            ? { ...b, owned: b.owned + 1, cost: Math.floor(b.cost * 1.15) } 
            : b
        );
        
        // Recalculate earnings and maintenance
        const earningsPerSecond = updatedBusinesses.reduce(
          (sum, b) => sum + (b.earningsPerSecond * b.owned), 0
        );
        const maintenancePerSecond = updatedBusinesses.reduce(
          (sum, b) => sum + (b.maintenancePerSecond * b.owned), 0
        );
        
        set({
          cash: state.cash - business.cost,
          businesses: updatedBusinesses,
          earningsPerSecond,
          maintenancePerSecond,
          totalSpent: state.totalSpent + business.cost,
        });
        
        return true;
      },

      sellBusiness: (businessId: string, amount: number = 1): boolean => {
        const state = get();
        const business = state.businesses.find(b => b.id === businessId);
        
        if (!business || business.owned < amount) return false;
        
        // Sell at 70% of current value (depreciation)
        const sellPrice = Math.floor(business.cost * 0.7 / 1.15); // Reverse the upgrade cost
        
        const updatedBusinesses = state.businesses.map(b => 
          b.id === businessId 
            ? { ...b, owned: Math.max(0, b.owned - amount) } 
            : b
        );
        
        // Recalculate earnings and maintenance
        const earningsPerSecond = updatedBusinesses.reduce(
          (sum, b) => sum + (b.earningsPerSecond * b.owned), 0
        );
        const maintenancePerSecond = updatedBusinesses.reduce(
          (sum, b) => sum + (b.maintenancePerSecond * b.owned), 0
        );
        
        set({
          cash: state.cash + sellPrice,
          businesses: updatedBusinesses,
          earningsPerSecond,
          maintenancePerSecond,
        });
        
        return true;
      },

      buyAsset: (assetId: string, amount: number): boolean => {
        const state = get();
        const asset = state.marketAssets.find(a => a.id === assetId);
        if (!asset || state.cash < asset.price * amount) return false;
        
        const updatedAssets = state.marketAssets.map(a => 
          a.id === assetId ? { ...a, owned: a.owned + amount } : a
        );
        
        set({
          cash: state.cash - (asset.price * amount),
          marketAssets: updatedAssets,
          totalSpent: state.totalSpent + (asset.price * amount),
        });
        
        return true;
      },

      sellAsset: (assetId: string, amount: number): boolean => {
        const state = get();
        const asset = state.marketAssets.find(a => a.id === assetId);
        if (!asset || asset.owned < amount) return false;
        
        const updatedAssets = state.marketAssets.map(a => 
          a.id === assetId ? { ...a, owned: a.owned - amount } : a
        );
        
        set({
          cash: state.cash + (asset.price * amount),
          marketAssets: updatedAssets,
        });
        
        return true;
      },

      updateMarketPrices: () => {
        const state = get();
        const updatedAssets = state.marketAssets.map(asset => {
          // Random volatility factor between -volatility and +volatility
          const change = (Math.random() - 0.5) * 2 * asset.volatility;
          const newPrice = Math.max(0.01, asset.price * (1 + change));
          
          // Keep last 50 price points for sparklines
          const newHistory = [...(asset.priceHistory || []), newPrice].slice(-50);
          
          return {
            ...asset,
            previousPrice: asset.price,
            price: newPrice,
            priceHistory: newHistory,
          };
        });
        
        set({ marketAssets: updatedAssets });
      },

      buyProperty: (propertyId: string): boolean => {
        const state = get();
        const property = state.realEstate.find(r => r.id === propertyId);
        if (!property || state.cash < property.cost) return false;
        
        const updatedProperties = state.realEstate.map(r => 
          r.id === propertyId 
            ? { ...r, owned: r.owned + 1, cost: Math.floor(r.cost * 1.2) } 
            : r
        );
        
        // Recalculate earnings and maintenance
        const earningsPerSecond = 
          state.businesses.reduce((sum, b) => sum + (b.earningsPerSecond * b.owned), 0) +
          updatedProperties.reduce((sum, r) => sum + (r.earningsPerSecond * r.owned), 0);
        const maintenancePerSecond = 
          state.businesses.reduce((sum, b) => sum + (b.maintenancePerSecond * b.owned), 0) +
          updatedProperties.reduce((sum, r) => sum + (r.maintenancePerSecond * r.owned), 0);
        
        set({
          cash: state.cash - property.cost,
          realEstate: updatedProperties,
          earningsPerSecond,
          maintenancePerSecond,
          totalSpent: state.totalSpent + property.cost,
        });
        
        return true;
      },

      sellProperty: (propertyId: string, amount: number = 1): boolean => {
        const state = get();
        const property = state.realEstate.find(r => r.id === propertyId);
        
        if (!property || property.owned < amount) return false;
        
        // Sell at 80% of current value
        const sellPrice = Math.floor(property.cost * 0.8 / 1.2);
        
        const updatedProperties = state.realEstate.map(r => 
          r.id === propertyId 
            ? { ...r, owned: Math.max(0, r.owned - amount) } 
            : r
        );
        
        // Recalculate earnings and maintenance
        const earningsPerSecond = 
          state.businesses.reduce((sum, b) => sum + (b.earningsPerSecond * b.owned), 0) +
          updatedProperties.reduce((sum, r) => sum + (r.earningsPerSecond * r.owned), 0);
        const maintenancePerSecond = 
          state.businesses.reduce((sum, b) => sum + (b.maintenancePerSecond * b.owned), 0) +
          updatedProperties.reduce((sum, r) => sum + (r.maintenancePerSecond * r.owned), 0);
        
        set({
          cash: state.cash + sellPrice,
          realEstate: updatedProperties,
          earningsPerSecond,
          maintenancePerSecond,
        });
        
        return true;
      },

      buyLuxury: (assetId: string): boolean => {
        const state = get();
        const asset = state.luxuryAssets.find(a => a.id === assetId);
        if (!asset || state.cash < asset.cost) return false;
        
        const updatedAssets = state.luxuryAssets.map(a => 
          a.id === assetId ? { ...a, owned: a.owned + 1 } : a
        );
        
        set({
          cash: state.cash - asset.cost,
          luxuryAssets: updatedAssets,
          totalSpent: state.totalSpent + asset.cost,
        });
        
        return true;
      },

      tick: () => {
        const state = get();
        const netIncomePerSecond = state.earningsPerSecond - state.maintenancePerSecond;
        
        if (netIncomePerSecond !== 0) {
          // Income per tick = netIncomePerSecond / TICKS_PER_SECOND
          const netIncomePerTick = netIncomePerSecond / TICKS_PER_SECOND;
          
          set({
            cash: state.cash + netIncomePerTick,
            totalEarned: netIncomePerSecond > 0 ? state.totalEarned + netIncomePerTick : state.totalEarned,
            netWorth: get().getNetWorth(),
          });
        }
      },

      setLastSyncTime: (time: number) => {
        set({ lastSaved: time });
      },

      getLastSyncTime: () => {
        return get().lastSaved;
      },

      resetGame: () => {
        set(generateInitialState());
      },

      getNetWorth: (): number => {
        const state = get();
        
        // Liquid cash
        const cashValue = state.cash;
        
        // Business values (current cost * owned at 70%)
        const businessValue = state.businesses.reduce(
          (sum, b) => sum + Math.floor(b.cost * 0.7 * b.owned), 0
        );
        
        // Market portfolio value
        const marketValue = state.marketAssets.reduce(
          (sum, a) => sum + (a.price * a.owned), 0
        );
        
        // Real estate value (80%)
        const realEstateValue = state.realEstate.reduce(
          (sum, r) => sum + Math.floor(r.cost * 0.8 * r.owned), 0
        );
        
        // Luxury assets value
        const luxuryValue = state.luxuryAssets.reduce(
          (sum, l) => sum + (l.cost * l.owned), 0
        );
        
        return cashValue + businessValue + marketValue + realEstateValue + luxuryValue;
      },

      getEarningsPerSecond: (): number => {
        const state = get();
        return state.earningsPerSecond;
      },

      getMaintenancePerSecond: (): number => {
        const state = get();
        return state.maintenancePerSecond;
      },

      getNetIncomePerSecond: (): number => {
        const state = get();
        return state.earningsPerSecond - state.maintenancePerSecond;
      },
    }),
    {
      name: 'business-empire-storage',
      partialize: (state) => ({
        cash: state.cash,
        netWorth: state.netWorth,
        currentCard: state.currentCard,
        totalClicks: state.totalClicks,
        clickEarnings: state.clickEarnings,
        businesses: state.businesses,
        marketAssets: state.marketAssets,
        realEstate: state.realEstate,
        luxuryAssets: state.luxuryAssets,
        totalEarned: state.totalEarned,
        totalSpent: state.totalSpent,
        earningsPerSecond: state.earningsPerSecond,
        maintenancePerSecond: state.maintenancePerSecond,
        lastSaved: state.lastSaved,
      }),
    }
  )
);
