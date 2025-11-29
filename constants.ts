export const BASE_RPC_URL = "https://mainnet.base.org";

// Supported Tokens on Base with Contract Addresses
export const SUPPORTED_TOKENS = [
  {
    id: 'ethereum',
    cgId: 'ethereum',
    symbol: 'ETH',
    name: 'Ethereum',
    isNative: true,
    decimals: 18,
    color: '#627EEA'
  },
  {
    id: 'usd-coin',
    cgId: 'usd-coin',
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    decimals: 6,
    color: '#2775CA'
  },
  {
    id: 'wrapped-ether',
    cgId: 'weth',
    symbol: 'WETH',
    name: 'Wrapped Ether',
    address: '0x4200000000000000000000000000000000000006',
    decimals: 18,
    color: '#C0C0C0'
  },
  {
    id: 'coinbase-wrapped-staked-eth',
    cgId: 'coinbase-wrapped-staked-eth',
    symbol: 'cbETH',
    name: 'Coinbase Wrapped Staked ETH',
    address: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22',
    decimals: 18,
    color: '#0052FF'
  },
  {
    id: 'aerodrome-finance',
    cgId: 'aerodrome-finance',
    symbol: 'AERO',
    name: 'Aerodrome',
    address: '0x940181a94A35A4569E4529A3CDfB74e38FD98631',
    decimals: 18,
    color: '#4472C4'
  },
  {
    id: 'degen-base',
    cgId: 'degen-base',
    symbol: 'DEGEN',
    name: 'Degen',
    address: '0x4ed4E862860beD51a9570b96d8014711Ad0AA622',
    decimals: 18,
    color: '#7C3AED'
  },
  {
    id: 'brett',
    cgId: 'based-brett',
    symbol: 'BRETT',
    name: 'Brett',
    address: '0x532f27101965dd16442E59d40670FaF5eBB142E4',
    decimals: 18,
    color: '#2ecc71'
  },
  {
    id: 'toshi',
    cgId: 'toshi',
    symbol: 'TOSHI',
    name: 'Toshi',
    address: '0xAC1Bd2486aAf3B5C0fc3Fd868558b082a531B2B4',
    decimals: 18,
    color: '#0099FF'
  },
  {
    id: 'mog-coin',
    cgId: 'mog-coin',
    symbol: 'MOG',
    name: 'Mog Coin',
    address: '0x2Da56AcB9Ea78330f947bD57C54119Debda7AF71',
    decimals: 18,
    color: '#888888'
  },
  {
    id: 'higher',
    cgId: 'higher',
    symbol: 'HIGHER',
    name: 'Higher',
    address: '0x0578d8A44db98B23BF096A382e016e29a5Ce0E3e',
    decimals: 18,
    color: '#16a34a'
  }
];

export const CHART_POINTS = 24; // Points for 24h chart