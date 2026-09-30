import { vi } from 'vitest';

// Mock quote data
export const mockQuoteData = {
  amountOut: '95.5',
  exchangeRate: '0.955',
  minAmountOut: '94.605',
  priceImpact: '0.5',
  route: ['cUSD', 'cEUR'],
  timestamp: Date.now(),
  fees: {
    networkFee: '0.001',
    protocolFee: '0.0025',
  },
  gasEstimate: '0.002',
  isDirectSwap: true,
};

// Mock Uniswap hook
export const mockUniswapHook = {
  isReady: true,
  isInitializing: false,
  isSwapping: false,
  isGettingQuote: false,
  error: null,
  lastQuote: mockQuoteData,
  isInitialized: true,
  isApproving: false,
  currentStep: 0,
  totalSteps: 0,
  initializationAttempts: 0,
  initializeUniswap: vi.fn().mockResolvedValue(true),
  getSwapQuote: vi.fn().mockResolvedValue(mockQuoteData),
  performSwap: vi.fn().mockResolvedValue({
    success: true,
    hash: '0x123abc',
    amountOut: '95.5',
    recipient: '0xRecipient',
  }),
  clearQuoteCache: vi.fn(),
};

// Mock Mento hook
export const mockMentoHook = {
  ...mockUniswapHook,
  availablePairs: [],
  initializeMento: vi.fn().mockResolvedValue(true),
};

// Mock Web3 Context
export const mockWeb3Context = {
  wallet: {
    isConnected: true,
    address: '0xUserAddress',
    chainId: 42220,
    balance: '10',
    isConnecting: false,
    selectedToken: {
      symbol: 'cUSD',
      name: 'Celo Dollar',
      decimals: 18,
      address: { 42220: '0xCUSD', 44787: '0xCUSDTest' },
    },
    tokenBalances: {
      cUSD: { raw: '100', formatted: '100 cUSD', fiat: '$100' },
      cEUR: { raw: '50', formatted: '50 cEUR', fiat: '$50' },
    },
    isLoadingTokenBalance: false,
  },
  uniswap: mockUniswapHook,
  mento: mockMentoHook,
  connectWallet: vi.fn(),
  disconnectWallet: vi.fn(),
  switchToCorrectNetwork: vi.fn(),
  sendPayment: vi.fn(),
  performSwap: vi.fn().mockResolvedValue(undefined),
  getSwapQuote: vi.fn().mockResolvedValue('95.5'),
  initializeUniswap: vi.fn().mockResolvedValue(true),
  swapState: {
    isSwapping: false,
    fromAmount: '',
    toAmount: '',
    error: null,
    isInitializing: false,
  },
  isCorrectNetwork: true,
  setSelectedToken: vi.fn(),
  refreshTokenBalance: vi.fn(),
  availableTokens: [
    {
      symbol: 'cUSD',
      name: 'Celo Dollar',
      decimals: 18,
      address: { 42220: '0xCUSD', 44787: '0xCUSDTest' },
    },
    {
      symbol: 'cEUR',
      name: 'Celo Euro',
      decimals: 18,
      address: { 42220: '0xCEUR', 44787: '0xCEURTest' },
    },
  ],
  approveToken: vi.fn(),
  getTokenAllowance: vi.fn().mockResolvedValue(1000),
  buyTrade: vi.fn(),
  validateTradeBeforePurchase: vi.fn(),
  usdtAllowance: BigInt(1000000000000000000),
  usdtDecimals: 6,
  approveUSDT: vi.fn(),
  divvi: {
    isReady: true,
    error: null,
    referralCode: null,
    generateReferralTag: vi.fn(),
    trackTransaction: vi.fn(),
    generateReferralLink: vi.fn(),
    clearReferralCode: vi.fn(),
  },
};

// Mock Snackbar Context
export const mockSnackbarContext = {
  showSnackbar: vi.fn(),
  hideSnackbar: vi.fn(),
};

// Helper to create wrapped component with providers
export const createMockProviders = (customContext = {}) => {
  const contextValue = { ...mockWeb3Context, ...customContext };

  return {
    web3Context: contextValue,
    snackbarContext: mockSnackbarContext,
  };
};

// Mock swap error scenarios
export const mockSwapErrors = {
  networkError: new Error('Network connection issue. Please check your internet and try again.'),
  liquidityError: new Error('Insufficient liquidity for this trade. Try a smaller amount or different tokens.'),
  userRejection: new Error('Transaction was cancelled. No funds were transferred.'),
  slippageError: new Error('Price moved too much during the swap. Try increasing slippage tolerance or refreshing the quote.'),
  gasError: new Error('Insufficient CELO for gas fees. Please add CELO to your wallet.'),
  initializationError: new Error('Swap service is starting up. Please wait a moment and try again.'),
};
