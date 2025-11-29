
export const BASE_RPC_URL = "https://mainnet.base.org";

// Supported Tokens on Base with Contract Addresses
// Note: Addresses are normalized to lowercase for reliable matching
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
    address: '0x2ae3f1ec7f1f5012cfeab0185bfc7aa3cf0dec22',
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
    address: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
    decimals: 6,
    color: '#2775CA',
    imageUrl: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png'
  },
  {
    id: 'tether',
    cgId: 'tether',
    symbol: 'USDT',
    name: 'Tether USD',
    address: '0xfde4c96c8593536e31f229ea8f37b2ada2699bb2',
    decimals: 6,
    color: '#26A17B',
    imageUrl: 'https://assets.coingecko.com/coins/images/325/small/Tether.png'
  },
  {
    id: 'dai',
    cgId: 'dai',
    symbol: 'DAI',
    name: 'Dai',
    address: '0x50c5725949a6f0c72e6c4a641f24049a917db0cb',
    decimals: 18,
    color: '#F5AC37',
    imageUrl: 'https://assets.coingecko.com/coins/images/9956/small/Badge_Dai.png'
  },
  {
    id: 'eurc',
    cgId: 'euro-coin',
    symbol: 'EURC',
    name: 'EURC',
    address: '0x60a3e35cc302bfa443010c948eebb6ac2569ac2c',
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
    address: '0x940181a94a35a4569e4529a3cdfb74e38fd98631',
    decimals: 18,
    color: '#4472C4',
    imageUrl: 'https://assets.coingecko.com/coins/images/35634/small/aerodrome.png'
  },
  {
    id: 'moonwell',
    cgId: 'moonwell',
    symbol: 'WELL',
    name: 'Moonwell',
    address: '0xa88594d404727625a9437c3f886c764269ba633a',
    decimals: 18,
    color: '#E01E5A',
    imageUrl: 'https://assets.coingecko.com/coins/images/25732/small/well.png'
  },
  {
    id: 'seamless-protocol',
    cgId: 'seamless-protocol',
    symbol: 'SEAM',
    name: 'Seamless',
    address: '0x1c7a460413dd4e964f96d8dfc56e7223ce88cd85',
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
    address: '0x111111111118cad7653fcd3e817ef440d9372784',
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
    address: '0x4ed4e862860bed51a9570b96d8014711ad0aa622',
    decimals: 18,
    color: '#7C3AED',
    imageUrl: 'https://assets.coingecko.com/coins/images/34515/small/degen.jpeg'
  },
  {
    id: 'brett',
    cgId: 'based-brett',
    symbol: 'BRETT',
    name: 'Brett',
    address: '0x532f27101965dd16442e59d40670faf5ebb142e4',
    decimals: 18,
    color: '#2ecc71',
    imageUrl: 'https://assets.coingecko.com/coins/images/35565/small/brett.png'
  },
  {
    id: 'toshi',
    cgId: 'toshi',
    symbol: 'TOSHI',
    name: 'Toshi',
    address: '0xac1bd2486aaf3b5c0fc3fd868558b082a531b2b4',
    decimals: 18,
    color: '#0099FF',
    imageUrl: 'https://assets.coingecko.com/coins/images/32578/small/toshi.png'
  },
  {
    id: 'mog-coin',
    cgId: 'mog-coin',
    symbol: 'MOG',
    name: 'Mog Coin',
    address: '0x2da56acb9ea78330f947bd57c54119debda7af71',
    decimals: 18,
    color: '#888888',
    imageUrl: 'https://assets.coingecko.com/coins/images/31551/small/mog.png'
  },
  {
    id: 'keyboard-cat',
    cgId: 'keyboard-cat',
    symbol: 'KEYCAT',
    name: 'Keyboard Cat',
    address: '0x9d903794125d21e543005a422d4f5b05527a4bf9',
    decimals: 18,
    color: '#FFA500',
    imageUrl: 'https://assets.coingecko.com/coins/images/36585/small/keycat.jpg'
  },
  {
    id: 'mister-miggles',
    cgId: 'mister-miggles',
    symbol: 'MIGGLES',
    name: 'Mister Miggles',
    address: '0xb1a03eda1034252964f15931b4d604cdc6015a29',
    decimals: 18,
    color: '#F4A460',
    imageUrl: 'https://assets.coingecko.com/coins/images/39097/small/miggles.jpg'
  },
  {
    id: 'basenji',
    cgId: 'basenji',
    symbol: 'BENJI',
    name: 'Basenji',
    address: '0xbc45647ea894030a4e9801ec03479739fa2485f0',
    decimals: 18,
    color: '#8B4513',
    imageUrl: 'https://assets.coingecko.com/coins/images/36423/small/BENJI.png'
  },
  {
    id: 'higher',
    cgId: 'higher',
    symbol: 'HIGHER',
    name: 'Higher',
    address: '0x0578d8a44db98b23bf096a382e016e29a5ce0e3e',
    decimals: 18,
    color: '#16a34a',
    imageUrl: 'https://assets.coingecko.com/coins/images/36528/small/higher.png'
  },
  {
    id: 'base-god',
    cgId: 'base-god',
    symbol: 'TYBG',
    name: 'Base God',
    address: '0x0d97f261b1e88845184f678e2d1e7a98d9fd38de',
    decimals: 18,
    color: '#4B0082',
    imageUrl: 'https://assets.coingecko.com/coins/images/34149/small/tybg.png'
  }
];

export const CHART_POINTS = 24; // Points for 24h chart
