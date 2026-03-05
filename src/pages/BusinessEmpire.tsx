import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  CreditCard, 
  Building2, 
  TrendingUp, 
  Home, 
  Gem, 
  Trophy, 
  Zap,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Crown,
  Wallet,
  TrendingDown,
  Activity
} from 'lucide-react';
import { useBusinessEmpireStore } from '@/store/businessEmpireStore';
import { supabase } from '@/integrations/supabase/client';
import { 
  CARDS, 
  BUSINESSES, 
  REAL_ESTATE_PROPERTIES, 
  LUXURY_ASSETS,
  CardType 
} from '@/types/business-empire';
import { toast } from 'sonner';

// Format number to currency
const formatCurrency = (value: number): string => {
  if (value >= 1e15) return `$${(value / 1e15).toFixed(2)}Q`;
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
};

// Floating click animation component with mouse tracking
function FloatingText({ amount, position, onComplete }: { amount: number; position: { x: number; y: number }; onComplete: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 1000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1, y: 0, scale: 1 }}
      animate={{ opacity: 0, y: -60, scale: 1.3 }}
      exit={{ opacity: 0 }}
      className="fixed pointer-events-none text-emerald-400 font-bold text-2xl drop-shadow-lg z-50"
      style={{ 
        left: position.x, 
        top: position.y,
        transform: 'translate(-50%, -100%)'
      }}
    >
      +${amount}
    </motion.div>
  );
}

// Sparkline Chart Component
function Sparkline({ data, width = 100, height = 30, color = '#22c55e' }: { data: number[]; width?: number; height?: number; color?: string }) {
  if (!data || data.length < 2) return null;
  
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  const isUp = data[data.length - 1] >= data[0];
  
  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={isUp ? '#22c55e' : '#ef4444'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Realistic Credit Card Component
function CreditCardDisplay({ 
  cardName, 
  cardNumber = '4000 1234 5678 9010',
  onClick 
}: { 
  cardName: CardType; 
  cardNumber?: string;
  onClick?: (e: React.MouseEvent) => void;
}) {
  const card = CARDS.find(c => c.name === cardName) || CARDS[0];
  const [validMonth, setValidMonth] = useState('12');
  const [validYear, setValidYear] = useState('28');
  
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="relative w-96 h-56 rounded-2xl cursor-pointer shadow-2xl overflow-hidden"
      style={{ background: card.gradient }}
    >
      {/* Card Pattern Overlay */}
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: `radial-gradient(circle at 20% 80%, rgba(255,255,255,0.3) 0%, transparent 50%),
                          radial-gradient(circle at 80% 20%, rgba(255,255,255,0.2) 0%, transparent 40%)`
      }} />
      
      {/* Card Content */}
      <div className="relative p-6 h-full flex flex-col justify-between text-white">
        {/* Top Row - Logo & Type */}
        <div className="flex justify-between items-start">
          <div className="text-xl font-bold tracking-wider opacity-90">BANK</div>
          <div className="text-xs opacity-70 uppercase">{card.name}</div>
        </div>
        
        {/* EMV Chip */}
        <div className="absolute top-20 left-6 w-12 h-10 rounded-md bg-gradient-to-br from-yellow-300 to-yellow-500 shadow-inner">
          <div className="w-full h-full grid grid-cols-3 grid-rows-3 gap-px p-1">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="bg-yellow-200/50 rounded-sm" />
            ))}
          </div>
        </div>
        
        {/* Card Number */}
        <div className="mt-8">
          <div className="text-xl tracking-[0.2em] font-mono opacity-90">
            {cardNumber.replace(/\d{4}/g, (match, offset) => 
              offset > 0 ? ` ${match}` : match
            )}
          </div>
        </div>
        
        {/* Bottom Row - Name & Expiry */}
        <div className="flex justify-between items-end">
          <div>
            <div className="text-[10px] opacity-60 uppercase mb-1">Card Holder</div>
            <div className="text-sm font-medium tracking-wider uppercase">AI TYCOON</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] opacity-60 uppercase mb-1">Valid Thru</div>
            <div className="text-sm font-medium tracking-wider">{validMonth}/{validYear}</div>
          </div>
        </div>
        
        {/* Tap to Earn Text */}
        <motion.div 
          className="absolute bottom-4 right-6 text-white/70 text-sm font-medium"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          TAP TO EARN
        </motion.div>
      </div>
      
      {/* Holographic Stripe */}
      <div className="absolute top-1/3 left-0 w-full h-8 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
    </motion.div>
  );
}

// Net Worth Display Component
function NetWorthDisplay() {
  const { cash, earningsPerSecond, maintenancePerSecond } = useBusinessEmpireStore();
  const netIncome = earningsPerSecond - maintenancePerSecond;

  return (
    <Card className="bg-gradient-to-r from-navy to-navy-light border-0 text-white">
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <p className="text-white/70 text-sm font-medium flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              Your Money
            </p>
            <p className="text-4xl font-display font-bold mt-1">{formatCurrency(cash)}</p>
            <div className="flex items-center gap-4 mt-2">
              <div className={`flex items-center gap-1 ${netIncome >= 0 ? 'text-emerald-300' : 'text-ruby-300'}`}>
                {netIncome >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                <span className="text-sm">Net: {formatCurrency(netIncome)}/sec</span>
              </div>
            </div>
          </div>
          
          {/* Profit/Loss breakdown */}
          <div className="flex gap-4 text-sm">
            <div className="bg-emerald-500/20 rounded-lg px-3 py-2 text-center">
              <p className="text-emerald-300 text-xs">Income</p>
              <p className="font-bold">+{formatCurrency(earningsPerSecond)}</p>
            </div>
            <div className="bg-ruby-500/20 rounded-lg px-3 py-2 text-center">
              <p className="text-ruby-300 text-xs">Expenses</p>
              <p className="font-bold">-{formatCurrency(maintenancePerSecond)}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Clicker Card Component with mouse tracking
function ClickerCard() {
  const { currentCard, clickEarnings, clickCard } = useBusinessEmpireStore();
  const [floatingTexts, setFloatingTexts] = useState<{ id: number; amount: number; position: { x: number; y: number } }[]>([]);

  const handleClick = (e: React.MouseEvent) => {
    // Get exact mouse position
    const position = { x: e.clientX, y: e.clientY };
    
    clickCard();
    
    const id = Date.now();
    setFloatingTexts(prev => [...prev, { id, amount: clickEarnings, position }]);
    
    setTimeout(() => {
      setFloatingTexts(prev => prev.filter(t => t.id !== id));
    }, 1000);
  };

  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <CreditCard className="w-5 h-5" />
          Your Card
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center py-8">
        <CreditCardDisplay cardName={currentCard} onClick={handleClick} />
        
        <div className="mt-6 text-center">
          <Badge variant="outline" className="text-lg px-4 py-1">
            +${clickEarnings} per tap
          </Badge>
          <p className="text-sm text-muted-foreground mt-2">{currentCard}</p>
        </div>
        
        {/* Floating text overlays */}
        <AnimatePresence>
          {floatingTexts.map(text => (
            <FloatingText 
              key={text.id} 
              amount={text.amount} 
              position={text.position}
              onComplete={() => {}} 
            />
          ))}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

// Card Upgrade Component
function CardUpgrades() {
  const { cash, currentCard, upgradeCard } = useBusinessEmpireStore();
  
  const currentCardIndex = CARDS.findIndex(c => c.name === currentCard);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="w-5 h-5 text-amber-500" />
          Upgrade Your Card
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {CARDS.map((card, index) => {
            const isOwned = index <= currentCardIndex;
            const isNext = index === currentCardIndex + 1;
            const canAfford = cash >= card.cost;
            
            return (
              <motion.div
                key={card.id}
                whileHover={{ scale: 1.02 }}
                className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                  isOwned 
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30' 
                    : isNext && canAfford
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30 hover:shadow-md'
                      : 'border-border bg-muted/50 opacity-60'
                }`}
                onClick={() => {
                  if (!isOwned && isNext && canAfford) {
                    const success = upgradeCard(card.name);
                    if (success) {
                      toast.success(`Upgraded to ${card.name}!`);
                    } else {
                      toast.error('Upgrade failed');
                    }
                  }
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div 
                    className="w-8 h-8 rounded-md flex items-center justify-center"
                    style={{ background: card.gradient }}
                  >
                    <CreditCard className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-semibold text-sm">{card.name}</span>
                </div>
                <div className="text-xs text-muted-foreground mb-2">
                  +${card.earningsPerClick}/tap
                </div>
                {isOwned ? (
                  <Badge className="bg-emerald-500 text-white text-xs">Owned</Badge>
                ) : isNext ? (
                  <Badge className={canAfford ? 'bg-amber-500 text-white' : 'bg-muted'} variant="outline">
                    {formatCurrency(card.cost)}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">
                    {formatCurrency(card.cost)}
                  </Badge>
                )}
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// Businesses Component with Sell functionality
function BusinessesList() {
  const { cash, businesses, buyBusiness, sellBusiness } = useBusinessEmpireStore();

  const profitable = businesses.filter(b => b.type === 'profitable');
  const risky = businesses.filter(b => b.type === 'risky');
  const unprofitable = businesses.filter(b => b.type === 'unprofitable');

  const renderBusiness = (business: typeof businesses[0]) => {
    const canAfford = cash >= business.cost;
    const canSell = business.owned > 0;
    const netProfit = business.earningsPerSecond - business.maintenancePerSecond;
    const sellPrice = Math.floor(business.cost * 0.7 / 1.15);
    
    return (
      <motion.div
        key={business.id}
        className={`p-3 rounded-lg border bg-card ${
          business.type === 'profitable' ? 'border-emerald-500/30' :
          business.type === 'risky' ? 'border-amber-500/30' : 'border-ruby-500/30'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">{business.icon}</span>
            <div>
              <h4 className="font-semibold text-sm">{business.name}</h4>
              <p className={`text-xs ${netProfit >= 0 ? 'text-emerald-500' : 'text-ruby-500'}`}>
                {netProfit >= 0 ? '+' : ''}{formatCurrency(netProfit)}/sec net
              </p>
            </div>
          </div>
          <div className="text-right text-xs">
            <p className="font-bold">{formatCurrency(business.cost)}</p>
            <p className="text-muted-foreground">Owned: {business.owned}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={!canSell}
            onClick={() => sellBusiness(business.id, 1)}
            className="flex-1 text-xs"
          >
            Sell {formatCurrency(sellPrice)}
          </Button>
          <Button
            size="sm"
            disabled={!canAfford}
            onClick={() => buyBusiness(business.id)}
            className="flex-1 text-xs"
          >
            Buy
          </Button>
        </div>
      </motion.div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-blue-500" />
          Businesses & Investments
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2">
          <div>
            <h3 className="font-semibold mb-3 text-emerald-500 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Profitable Businesses
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {profitable.map(renderBusiness)}
            </div>
          </div>
          <div>
            <h3 className="font-semibold mb-3 text-amber-500 flex items-center gap-2">
              <Activity className="w-4 h-4" /> Risky Ventures
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {risky.map(renderBusiness)}
            </div>
          </div>
          <div>
            <h3 className="font-semibold mb-3 text-ruby-500 flex items-center gap-2">
              <TrendingDown className="w-4 h-4" /> Money Pits (Unprofitable)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {unprofitable.map(renderBusiness)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Financial Markets Component with Sparklines
function FinancialMarkets() {
  const { cash, marketAssets, buyAsset, sellAsset, updateMarketPrices } = useBusinessEmpireStore();
  const [quantities, setQuantities] = useState<{ [key: string]: string }>({});

  // Update prices every 3 seconds with market events
  useEffect(() => {
    const interval = setInterval(updateMarketPrices, 3000);
    return () => clearInterval(interval);
  }, [updateMarketPrices]);

  const stocks = marketAssets.filter(a => a.type === 'stock');
  const cryptos = marketAssets.filter(a => a.type === 'crypto');

  const handleQuantityChange = (id: string, value: string) => {
    setQuantities(prev => ({ ...prev, [id]: value }));
  };

  const getQuantity = (id: string): number => {
    const val = quantities[id];
    if (!val || isNaN(parseInt(val))) return 1;
    return Math.max(1, parseInt(val));
  };

  const renderAsset = (asset: typeof marketAssets[0]) => {
    const priceChange = asset.price - asset.previousPrice;
    const priceChangePercent = asset.previousPrice > 0 ? ((priceChange / asset.previousPrice) * 100) : 0;
    const totalValue = asset.price * asset.owned;
    const qty = getQuantity(asset.id);
    const canBuy = cash >= asset.price * qty;
    const canSell = asset.owned >= qty;

    return (
      <motion.div
        key={asset.id}
        className="p-3 rounded-lg border border-border bg-card"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="font-bold">{asset.symbol}</span>
            <span className="text-xs text-muted-foreground">{asset.name}</span>
          </div>
          <Sparkline 
            data={asset.priceHistory || [asset.price]} 
            width={60} 
            height={20} 
          />
        </div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="font-semibold">{formatCurrency(asset.price)}</p>
            <div className={`flex items-center gap-1 text-xs ${priceChange >= 0 ? 'text-emerald-500' : 'text-ruby'}`}>
              {priceChange >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(priceChangePercent).toFixed(1)}%
            </div>
          </div>
          <div className="text-right text-xs">
            <p className="text-muted-foreground">Owned: {asset.owned}</p>
            <p className="font-medium">Value: {formatCurrency(totalValue)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min="1"
            value={quantities[asset.id] || '1'}
            onChange={(e) => handleQuantityChange(asset.id, e.target.value)}
            className="w-20 h-8 text-sm"
            placeholder="Qty"
          />
          <Button
            size="sm"
            variant="outline"
            disabled={!canSell}
            onClick={() => sellAsset(asset.id, qty)}
            className="flex-1"
          >
            Sell
          </Button>
          <Button
            size="sm"
            disabled={!canBuy}
            onClick={() => buyAsset(asset.id, qty)}
            className="flex-1"
          >
            Buy
          </Button>
        </div>
      </motion.div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-500" />
          Financial Markets
          <Badge variant="outline" className="ml-2 text-xs">
            <Activity className="w-3 h-3 mr-1" />
            LIVE
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <span>📈</span> Stocks
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {stocks.map(renderAsset)}
          </div>
        </div>
        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <span>🪙</span> Crypto
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {cryptos.map(renderAsset)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Real Estate Component with Sell
function RealEstateList() {
  const { cash, realEstate, buyProperty, sellProperty } = useBusinessEmpireStore();

  const houses = realEstate.filter(r => r.type === 'house');
  const apartments = realEstate.filter(r => r.type === 'apartment');
  const commercial = realEstate.filter(r => r.type === 'commercial');
  const land = realEstate.filter(r => r.type === 'land');

  const renderProperty = (property: typeof realEstate[0]) => {
    const canAfford = cash >= property.cost;
    const canSell = property.owned > 0;
    const maintenanceCost = Math.floor(property.maintenancePerSecond);
    const sellPrice = Math.floor(property.cost * 0.8 / 1.2);

    return (
      <motion.div
        key={property.id}
        className="p-3 rounded-lg border border-border bg-card"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">{property.icon}</span>
            <div>
              <p className="font-semibold text-sm">{property.name}</p>
              <p className="text-xs text-emerald-500">+{formatCurrency(property.earningsPerSecond - property.maintenancePerSecond)}/sec</p>
              {maintenanceCost > 0 && (
                <p className="text-xs text-ruby">-{formatCurrency(maintenanceCost)}/sec</p>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="font-bold text-sm">{formatCurrency(property.cost)}</p>
            <p className="text-xs text-muted-foreground">Owned: {property.owned}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={!canSell}
            onClick={() => sellProperty(property.id, 1)}
            className="flex-1 text-xs"
          >
            Sell {formatCurrency(sellPrice)}
          </Button>
          <Button
            size="sm"
            disabled={!canAfford}
            onClick={() => buyProperty(property.id)}
            className="flex-1 text-xs"
          >
            Buy
          </Button>
        </div>
      </motion.div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Home className="w-5 h-5 text-amber-500" />
          Real Estate Properties
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2">
          <div>
            <h3 className="font-semibold mb-3">🏠 Houses</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{houses.map(renderProperty)}</div>
          </div>
          <div>
            <h3 className="font-semibold mb-3">🏢 Apartments</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{apartments.map(renderProperty)}</div>
          </div>
          <div>
            <h3 className="font-semibold mb-3">🏬 Commercial</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{commercial.map(renderProperty)}</div>
          </div>
          <div>
            <h3 className="font-semibold mb-3">🌴 Land & Space</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{land.map(renderProperty)}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Luxury Assets Component
function LuxuryAssetsList() {
  const { cash, luxuryAssets, buyLuxury } = useBusinessEmpireStore();

  const cars = luxuryAssets.filter(l => l.category === 'car');
  const yachts = luxuryAssets.filter(l => l.category === 'yacht');
  const planes = luxuryAssets.filter(l => l.category === 'plane');
  const islands = luxuryAssets.filter(l => l.category === 'island');
  const other = luxuryAssets.filter(l => !['car', 'yacht', 'plane', 'island'].includes(l.category));

  const renderAsset = (asset: typeof luxuryAssets[0]) => {
    const canAfford = cash >= asset.cost;

    return (
      <motion.div
        key={asset.id}
        whileHover={{ scale: 1.02 }}
        className={`p-3 rounded-lg border border-border bg-card ${
          canAfford ? 'cursor-pointer hover:border-amber-500/50' : 'opacity-60'
        }`}
        onClick={() => {
          if (canAfford) {
            const success = buyLuxury(asset.id);
            if (!success) toast.error('Failed to buy luxury item');
            else toast.success(`Bought ${asset.name}!`);
          }
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">{asset.icon}</span>
            <div>
              <p className="font-semibold text-sm">{asset.name}</p>
              <p className="text-xs text-amber-500">+{asset.prestige} Prestige</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-bold text-sm">{formatCurrency(asset.cost)}</p>
            <p className="text-xs text-muted-foreground">Owned: {asset.owned}</p>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gem className="w-5 h-5 text-purple-500" />
          Luxury Assets (Net Worth)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2">
          <div>
            <h3 className="font-semibold mb-3">🚗 Cars</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{cars.map(renderAsset)}</div>
          </div>
          <div>
            <h3 className="font-semibold mb-3">🛥️ Yachts</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{yachts.map(renderAsset)}</div>
          </div>
          <div>
            <h3 className="font-semibold mb-3">✈️ Planes</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{planes.map(renderAsset)}</div>
          </div>
          <div>
            <h3 className="font-semibold mb-3">🏝️ Islands</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{islands.map(renderAsset)}</div>
          </div>
          <div>
            <h3 className="font-semibold mb-3">💎 Other</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{other.map(renderAsset)}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Forbes Leaderboard Component with robust sync
function ForbesLeaderboard() {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const { netWorth, totalClicks, currentCard, resetGame, lastSaved, setLastSyncTime } = useBusinessEmpireStore();
  
  // Sync debounce - only sync if last sync was > 30 seconds ago
  const SYNC_COOLDOWN = 30000;

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    try {
      const supabaseClient = supabase as any;
      const { data, error } = await supabaseClient
        .from('business_empire_profiles')
        .select('*')
        .order('net_worth', { ascending: false })
        .limit(50);

      if (error) throw error;

      const ranked = (data || []).map((entry: any, index: number) => ({
        id: entry.id,
        user_id: entry.user_id,
        username: entry.username,
        net_worth: entry.net_worth,
        total_clicks: entry.total_clicks,
        highest_card: entry.highest_card,
        rank: index + 1,
      }));

      setLeaderboard(ranked);
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const syncToDatabase = useCallback(async (force = false) => {
    const now = Date.now();
    const timeSinceLastSync = now - lastSaved;
    
    // Don't sync if on cooldown (unless forced)
    if (!force && timeSinceLastSync < SYNC_COOLDOWN) {
      return;
    }
    
    setSyncing(true);
    
    // Retry logic with exponential backoff
    const maxRetries = 3;
    let retries = 0;
    
    while (retries < maxRetries) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          // Silent fail - don't show error for not logged in
          setSyncing(false);
          return;
        }

        const username = session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'Anonymous';
        
        const supabaseClient = supabase as any;
        const { error } = await supabaseClient
          .from('business_empire_profiles')
          .upsert({
            user_id: session.user.id,
            username,
            net_worth: netWorth,
            total_clicks: totalClicks,
            total_earned: netWorth,
            highest_card: currentCard,
            last_synced_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });

        if (error) throw error;
        
        // Update last sync time
        setLastSyncTime(now);
        fetchLeaderboard();
        break;
      } catch (error) {
        retries++;
        if (retries >= maxRetries) {
          console.error('Sync failed after retries:', error);
        } else {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * retries));
        }
      }
    }
    
    setSyncing(false);
  }, [netWorth, totalClicks, currentCard, lastSaved, setLastSyncTime, fetchLeaderboard]);

  useEffect(() => {
    fetchLeaderboard();
    
    // Auto-sync every 60 seconds
    const syncInterval = setInterval(() => syncToDatabase(false), 60000);
    
    // Sync on page unload (navigator.sendBeacon fallback)
    const handleUnload = () => {
      syncToDatabase(true);
    };
    window.addEventListener('beforeunload', handleUnload);
    
    return () => {
      clearInterval(syncInterval);
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [fetchLeaderboard, syncToDatabase]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Forbes Billionaires List
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchLeaderboard} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button size="sm" onClick={() => syncToDatabase(true)} disabled={syncing}>
              {syncing ? 'Syncing...' : 'Sync Now'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-6 p-4 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-amber-700 dark:text-amber-300">Your Net Worth</p>
              <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">
                {formatCurrency(netWorth)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-amber-700 dark:text-amber-300">Total Clicks</p>
              <p className="text-xl font-bold text-amber-900 dark:text-amber-100">
                {totalClicks.toLocaleString()}
              </p>
            </div>
            <Button variant="destructive" size="sm" onClick={() => {
              if (confirm('Are you sure you want to reset your game? This cannot be undone!')) {
                resetGame();
                toast.success('Game reset!');
              }
            }}>
              Reset Game
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto" />
            <p className="text-muted-foreground mt-2">Loading leaderboard...</p>
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="text-center py-8">
            <Trophy className="w-12 h-12 mx-auto text-muted-foreground/50" />
            <p className="text-muted-foreground mt-2">No players yet. Be the first!</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {leaderboard.map((entry) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  entry.rank === 1 
                    ? 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-300 dark:border-yellow-700'
                    : entry.rank === 2
                      ? 'bg-gray-50 dark:bg-gray-900/30 border-gray-300 dark:border-gray-700'
                      : entry.rank === 3
                        ? 'bg-orange-50 dark:bg-orange-950/30 border-orange-300 dark:border-orange-700'
                        : 'border-border bg-card'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                    entry.rank === 1 
                      ? 'bg-yellow-500 text-white'
                      : entry.rank === 2
                        ? 'bg-gray-400 text-white'
                        : entry.rank === 3
                          ? 'bg-orange-500 text-white'
                          : 'bg-muted text-muted-foreground'
                  }`}>
                    {entry.rank}
                  </div>
                  <div>
                    <p className="font-semibold">{entry.username || 'Anonymous'}</p>
                    <p className="text-xs text-muted-foreground">
                      {entry.highest_card} • {entry.total_clicks.toLocaleString()} clicks
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold">{formatCurrency(entry.net_worth)}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Main Business Empire Page
export default function BusinessEmpire() {
  const { tick } = useBusinessEmpireStore();

  // Game tick - runs every 100ms for smooth passive income (10 ticks/sec)
  useEffect(() => {
    const interval = setInterval(tick, 100);
    return () => clearInterval(interval);
  }, [tick]);

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Business Empire</h1>
          <p className="text-muted-foreground">Build your fortune from scratch!</p>
        </div>
      </div>

      {/* Net Worth Display */}
      <NetWorthDisplay />

      {/* Game Tabs */}
      <Tabs defaultValue="clicker" className="w-full">
        <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-flex">
          <TabsTrigger value="clicker" className="gap-2">
            <CreditCard className="w-4 h-4" />
            <span className="hidden sm:inline">Card</span>
          </TabsTrigger>
          <TabsTrigger value="businesses" className="gap-2">
            <Building2 className="w-4 h-4" />
            <span className="hidden sm:inline">Businesses</span>
          </TabsTrigger>
          <TabsTrigger value="markets" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            <span className="hidden sm:inline">Markets</span>
          </TabsTrigger>
          <TabsTrigger value="realestate" className="gap-2">
            <Home className="w-4 h-4" />
            <span className="hidden sm:inline">Real Estate</span>
          </TabsTrigger>
          <TabsTrigger value="luxury" className="gap-2">
            <Gem className="w-4 h-4" />
            <span className="hidden sm:inline">Luxury</span>
          </TabsTrigger>
          <TabsTrigger value="forbes" className="gap-2">
            <Trophy className="w-4 h-4" />
            <span className="hidden sm:inline">Forbes</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clicker" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ClickerCard />
            <CardUpgrades />
          </div>
        </TabsContent>

        <TabsContent value="businesses" className="mt-6">
          <BusinessesList />
        </TabsContent>

        <TabsContent value="markets" className="mt-6">
          <FinancialMarkets />
        </TabsContent>

        <TabsContent value="realestate" className="mt-6">
          <RealEstateList />
        </TabsContent>

        <TabsContent value="luxury" className="mt-6">
          <LuxuryAssetsList />
        </TabsContent>

        <TabsContent value="forbes" className="mt-6">
          <ForbesLeaderboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
