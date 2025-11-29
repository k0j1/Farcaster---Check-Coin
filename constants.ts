
export const BASE_RPC_URL = "https://mainnet.base.org";

// Supported Tokens on Base with Contract Addresses
// Note: Limited by URL length for CoinGecko API (approx 30-40 tokens max in one batch safely)
export const SUPPORTED_TOKENS = [
  // --- Native & Wrapped ---
  {
    id: 'ethereum',
    cgId: 'ethereum',
    symbol: 'ETH',
    name: 'Ethereum',
    isNative: true,
    decimals: 18,
    color: '#627EEA',
    imageUrl: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png'
  },
  {
    id: 'wrapped-ether',
    cgId: 'weth',
    symbol: 'WETH',
    name: 'Wrapped Ether',
    address: '0x4200000000000000000000000000000000000006',
    decimals: 18,
    color: '#C0C0C0',
    imageUrl: 'https://assets.coingecko.com/coins/images/2518/small/weth.png'
  },
  {
    id: 'coinbase-wrapped-staked-eth',
    cgId: 'coinbase-wrapped-staked-eth',
    symbol: 'cbETH',
    name: 'Coinbase Wrapped Staked ETH',
    address: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22',
    decimals: 18,
    color: '#0052FF',
    imageUrl: 'https://assets.coingecko.com/coins/images/27008/small/cbeth.png'
  },

  // --- Stablecoins ---
  {
    id: 'usd-coin',
    cgId: 'usd-coin',
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    decimals: 6,
    color: '#2775CA',
    imageUrl: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png'
  },
  {
    id: 'tether',
    cgId: 'tether',
    symbol: 'USDT',
    name: 'Tether USD',
    address: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',
    decimals: 6,
    color: '#26A17B',
    imageUrl: 'https://assets.coingecko.com/coins/images/325/small/Tether.png'
  },
  {
    id: 'dai',
    cgId: 'dai',
    symbol: 'DAI',
    name: 'Dai',
    address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
    decimals: 18,
    color: '#F5AC37',
    imageUrl: 'https://assets.coingecko.com/coins/images/9956/small/Badge_Dai.png'
  },
  {
    id: 'eurc',
    cgId: 'euro-coin',
    symbol: 'EURC',
    name: 'EURC',
    address: '0x60a3E35Cc302bFA443010C948EEbb6Ac2569Ac2C',
    decimals: 6,
    color: '#003399',
    imageUrl: 'https://assets.coingecko.com/coins/images/26127/small/EURC.png'
  },

  // --- DeFi & Infra ---
  {
    id: 'aerodrome-finance',
    cgId: 'aerodrome-finance',
    symbol: 'AERO',
    name: 'Aerodrome',
    address: '0x940181a94A35A4569E4529A3CDfB74e38FD98631',
    decimals: 18,
    color: '#4472C4',
    imageUrl: 'https://assets.coingecko.com/coins/images/35634/small/aerodrome.png'
  },
  {
    id: 'moonwell',
    cgId: 'moonwell',
    symbol: 'WELL',
    name: 'Moonwell',
    address: '0xA88594D404727625A9437C3f886C764269Ba633A',
    decimals: 18,
    color: '#E01E5A',
    imageUrl: 'https://assets.coingecko.com/coins/images/25732/small/well.png'
  },
  {
    id: 'seamless-protocol',
    cgId: 'seamless-protocol',
    symbol: 'SEAM',
    name: 'Seamless',
    address: '0x1C7a460413dD4e964f96D8dFC56E7223cE88CD85',
    decimals: 18,
    color: '#00C2FF',
    imageUrl: 'https://assets.coingecko.com/coins/images/33580/small/seamless.jpeg'
  },
  {
    id: 'virtual-protocol',
    cgId: 'virtual-protocol',
    symbol: 'VIRTUAL',
    name: 'Virtual Protocol',
    address: '0x0b3e328455c4059eeb9e3743215830ecf99c7279',
    decimals: 18,
    color: '#000000',
    imageUrl: 'https://assets.coingecko.com/coins/images/33649/small/virtual_protocol.jpeg'
  },
  {
    id: 'echelon-prime',
    cgId: 'echelon-prime',
    symbol: 'PRIME',
    name: 'Echelon Prime',
    address: '0x111111111118CaD7653fCd3e817eF440d9372784',
    decimals: 18,
    color: '#FFFFFF',
    imageUrl: 'https://assets.coingecko.com/coins/images/29322/small/Prime.png'
  },

  // --- Memes & Community ---
  {
    id: 'degen-base',
    cgId: 'degen-base',
    symbol: 'DEGEN',
    name: 'Degen',
    address: '0x4ed4E862860beD51a9570b96d8014711Ad0AA622',
    decimals: 18,
    color: '#7C3AED',
    imageUrl: 'https://assets.coingecko.com/coins/images/34515/small/degen.jpeg'
  },
  {
    id: 'brett',
    cgId: 'based-brett',
    symbol: 'BRETT',
    name: 'Brett',
    address: '0x532f27101965dd16442E59d40670FaF5eBB142E4',
    decimals: 18,
    color: '#2ecc71',
    imageUrl: 'https://assets.coingecko.com/coins/images/35565/small/brett.png'
  },
  {
    id: 'toshi',
    cgId: 'toshi',
    symbol: 'TOSHI',
    name: 'Toshi',
    address: '0xAC1Bd2486aAf3B5C0fc3Fd868558b082a531B2B4',
    decimals: 18,
    color: '#0099FF',
    imageUrl: 'https://assets.coingecko.com/coins/images/32578/small/toshi.png'
  },
  {
    id: 'mog-coin',
    cgId: 'mog-coin',
    symbol: 'MOG',
    name: 'Mog Coin',
    address: '0x2Da56AcB9Ea78330f947bD57C54119Debda7AF71',
    decimals: 18,
    color: '#888888',
    imageUrl: 'https://assets.coingecko.com/coins/images/31551/small/mog.png'
  },
  {
    id: 'keyboard-cat',
    cgId: 'keyboard-cat',
    symbol: 'KEYCAT',
    name: 'Keyboard Cat',
    address: '0x9D903794125d21e543005A422D4F5B05527a4bF9',
    decimals: 18,
    color: '#FFA500',
    imageUrl: 'https://assets.coingecko.com/coins/images/36585/small/keycat.jpg'
  },
  {
    id: 'mister-miggles',
    cgId: 'mister-miggles',
    symbol: 'MIGGLES',
    name: 'Mister Miggles',
    address: '0xB1a03Eda1034252964F15931b4d604Cdc6015a29',
    decimals: 18,
    color: '#F4A460',
    imageUrl: 'https://assets.coingecko.com/coins/images/39097/small/miggles.jpg'
  },
  {
    id: 'basenji',
    cgId: 'basenji',
    symbol: 'BENJI',
    name: 'Basenji',
    address: '0xBC45647eA894030a4E9801Ec03479739FA2485F0',
    decimals: 18,
    color: '#8B4513',
    imageUrl: 'https://assets.coingecko.com/coins/images/36423/small/BENJI.png'
  },
  {
    id: 'higher',
    cgId: 'higher',
    symbol: 'HIGHER',
    name: 'Higher',
    address: '0x0578d8A44db98B23BF096A382e016e29a5Ce0E3e',
    decimals: 18,
    color: '#16a34a',
    imageUrl: 'https://assets.coingecko.com/coins/images/36528/small/higher.png'
  },
  {
    id: 'base-god',
    cgId: 'base-god',
    symbol: 'TYBG',
    name: 'Base God',
    address: '0x0d97F261b1e88845184f678e2d1e7a98D9FD38dE',
    decimals: 18,
    color: '#4B0082',
    imageUrl: 'https://assets.coingecko.com/coins/images/34149/small/tybg.png'
  }
];

export const CHART_POINTS = 24; // Points for 24h chart
