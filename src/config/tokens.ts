import { celo, celoSepolia } from "wagmi/chains";

// Icon imports (existing SVGs are reused for the renamed Mento tokens)
import cUSDIcon from "../assets/icons/cUSD.svg";
import cEURIcon from "../assets/icons/cEUR.svg";
import cREALIcon from "../assets/icons/cREAL.svg";
import cKESIcon from "../assets/icons/cKES.svg";
import PUSOIcon from "../assets/icons/PUSO.svg";
import cCOPIcon from "../assets/icons/cCOP.svg";
import eXOFIcon from "../assets/icons/eXOF.svg";
import cNGNIcon from "../assets/icons/cNGN.svg";
import cJPYIcon from "../assets/icons/cJPY.svg";
import cCHFIcon from "../assets/icons/cCHF.svg";
import cZARIcon from "../assets/icons/cZAR.svg";
import cGBPIcon from "../assets/icons/cGBP.svg";
import cAUDIcon from "../assets/icons/cAUD.svg";
import cCADIcon from "../assets/icons/cCAD.svg";
import cGHSIcon from "../assets/icons/cGHS.svg";
import USDTIcon from "../assets/icons/USDT.svg";
import GDIcon from "../assets/icons/G$.svg";

// ---------------------------------------------------------------------------
// Token type
// ---------------------------------------------------------------------------
export interface StableToken {
  name: string;
  symbol: string;
  decimals: number;
  /** address[chainId] -> contract address */
  address: Record<number, `0x${string}`>;
  icon: string;
  /** True if the token is a fiat-pegged stablecoin */
  isStableToken: boolean;
}

// ---------------------------------------------------------------------------
// All supported stablecoins
// Mento rebranded its stablecoins to the "…m" tickers (USDm, EURm, …). Mainnet
// addresses are unchanged from the old cX tokens; testnet is now Celo Sepolia.
// See: https://docs.celo.org/build-on-celo/build-with-local-stablecoin
// ---------------------------------------------------------------------------
export const TOKENS: StableToken[] = [
  {
    name: "Tether USD",
    symbol: "USDT",
    decimals: 6,
    address: {
      [celo.id]: "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e",
      [celoSepolia.id]: "0xd077A400968890Eacc75cdc901F0356c943e4fDb",
    },
    icon: USDTIcon,
    isStableToken: true,
  },
  {
    name: "GoodDollar",
    symbol: "G$",
    decimals: 18,
    address: {
      [celo.id]: "0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A",
    },
    icon: GDIcon,
    isStableToken: false,
  },
  {
    name: "Mento Dollar",
    symbol: "USDm",
    decimals: 18,
    address: {
      [celo.id]: "0x765de816845861e75a25fca122bb6898b8b1282a",
      [celoSepolia.id]: "0xdE9e4C3ce781b4bA68120d6261cbad65ce0aB00b",
    },
    icon: cUSDIcon,
    isStableToken: true,
  },
  {
    name: "Mento Euro",
    symbol: "EURm",
    decimals: 18,
    address: {
      [celo.id]: "0xd8763cba276a3738e6de85b4b3bf5fded6d6ca73",
      [celoSepolia.id]: "0xA99dC247d6b7B2E3ab48a1fEE101b83cD6aCd82a",
    },
    icon: cEURIcon,
    isStableToken: true,
  },
  {
    name: "Mento Brazilian Real",
    symbol: "BRLm",
    decimals: 18,
    address: {
      [celo.id]: "0xe8537a3d056da446677b9e9d6c5db704eaab4787",
      [celoSepolia.id]: "0x2294298942fdc79417DE9E0D740A4957E0e7783a",
    },
    icon: cREALIcon,
    isStableToken: true,
  },
  {
    name: "Mento West African CFA Franc",
    symbol: "XOFm",
    decimals: 18,
    address: {
      [celo.id]: "0x73F93dcc49cB8A239e2032663e9475dd5ef29A08",
      [celoSepolia.id]: "0x5505b70207aE3B826c1A7607F19F3Bf73444A082",
    },
    icon: eXOFIcon,
    isStableToken: true,
  },
  {
    name: "Mento Kenyan Shilling",
    symbol: "KESm",
    decimals: 18,
    address: {
      [celo.id]: "0x456a3D042C0DbD3db53D5489e98dFb038553B0d0",
      [celoSepolia.id]: "0xC7e4635651E3e3Af82b61d3E23c159438daE3BbF",
    },
    icon: cKESIcon,
    isStableToken: true,
  },
  {
    name: "Mento Philippine Peso",
    symbol: "PHPm",
    decimals: 18,
    address: {
      [celo.id]: "0x105d4A9306D2E55a71d2Eb95B81553AE1dC20d7B",
      [celoSepolia.id]: "0x0352976d940a2C3FBa0C3623198947Ee1d17869E",
    },
    icon: PUSOIcon,
    isStableToken: true,
  },
  {
    name: "Mento Colombian Peso",
    symbol: "COPm",
    decimals: 18,
    address: {
      [celo.id]: "0x8a567e2ae79ca692bd748ab832081c45de4041ea",
      [celoSepolia.id]: "0x5F8d55c3627d2dc0a2B4afa798f877242F382F67",
    },
    icon: cCOPIcon,
    isStableToken: true,
  },
  {
    name: "Mento British Pound",
    symbol: "GBPm",
    decimals: 18,
    address: {
      [celo.id]: "0xCCF663b1fF11028f0b19058d0f7B674004a40746",
      [celoSepolia.id]: "0x85F5181Abdbf0e1814Fc4358582Ae07b8eBA3aF3",
    },
    icon: cGBPIcon,
    isStableToken: true,
  },
  {
    name: "Mento Canadian Dollar",
    symbol: "CADm",
    decimals: 18,
    address: {
      [celo.id]: "0xff4Ab19391af240c311c54200a492233052B6325",
      [celoSepolia.id]: "0xF151c9a13b78C84f93f50B8b3bC689fedc134F60",
    },
    icon: cCADIcon,
    isStableToken: true,
  },
  {
    name: "Mento Australian Dollar",
    symbol: "AUDm",
    decimals: 18,
    address: {
      [celo.id]: "0x7175504C455076F15c04A2F90a8e352281F492F9",
      [celoSepolia.id]: "0x5873Faeb42F3563dcD77F0fbbdA818E6d6DA3139",
    },
    icon: cAUDIcon,
    isStableToken: true,
  },
  {
    name: "Mento South African Rand",
    symbol: "ZARm",
    decimals: 18,
    address: {
      [celo.id]: "0x4c35853A3B4e647fD266f4de678dCc8fEC410BF6",
      [celoSepolia.id]: "0x10CCfB235b0E1Ed394bACE4560C3ed016697687e",
    },
    icon: cZARIcon,
    isStableToken: true,
  },
  {
    name: "Mento Ghanaian Cedi",
    symbol: "GHSm",
    decimals: 18,
    address: {
      [celo.id]: "0xfAeA5F3404bbA20D3cc2f8C4B0A888F55a3c7313",
      [celoSepolia.id]: "0x5e94B8C872bD47BC4255E60ECBF44D5E66e7401C",
    },
    icon: cGHSIcon,
    isStableToken: true,
  },
  {
    name: "Mento Nigerian Naira",
    symbol: "NGNm",
    decimals: 18,
    address: {
      [celo.id]: "0xE2702Bd97ee33c88c8f6f92DA3B733608aa76F71",
      [celoSepolia.id]: "0x3d5ae86F34E2a82771496D140daFAEf3789dF888",
    },
    icon: cNGNIcon,
    isStableToken: true,
  },
  {
    name: "Mento Japanese Yen",
    symbol: "JPYm",
    decimals: 18,
    address: {
      [celo.id]: "0xc45eCF20f3CD864B32D9794d6f76814aE8892e20",
      [celoSepolia.id]: "0x85Bee67D435A39f7467a8a9DE34a5B73D25Df426",
    },
    icon: cJPYIcon,
    isStableToken: true,
  },
  {
    name: "Mento Swiss Franc",
    symbol: "CHFm",
    decimals: 18,
    address: {
      [celo.id]: "0xb55a79F398E759E43C95b979163f30eC87Ee131D",
      [celoSepolia.id]: "0x284E9b7B623eAE866914b7FA0eB720C2Bb3C2980",
    },
    icon: cCHFIcon,
    isStableToken: true,
  },
];

// Old cX tickers -> new Mento tickers, so products/orders stored with the old
// symbols still resolve to the right token after the rebrand.
const LEGACY_SYMBOL_ALIASES: Record<string, string> = {
  cUSD: "USDm",
  cEUR: "EURm",
  cREAL: "BRLm",
  eXOF: "XOFm",
  cKES: "KESm",
  PUSO: "PHPm",
  cCOP: "COPm",
  cGBP: "GBPm",
  cCAD: "CADm",
  cAUD: "AUDm",
  cZAR: "ZARm",
  cGHS: "GHSm",
  cNGN: "NGNm",
  cJPY: "JPYm",
  cCHF: "CHFm",
};

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------
let _bySymbol: Map<string, StableToken> | null = null;

function ensureSymbolMap(): Map<string, StableToken> {
  if (!_bySymbol) {
    _bySymbol = new Map(TOKENS.map((t) => [t.symbol, t]));
  }
  return _bySymbol;
}

export function getToken(symbol: string): StableToken | undefined {
  const map = ensureSymbolMap();
  return map.get(symbol) ?? map.get(LEGACY_SYMBOL_ALIASES[symbol] ?? "");
}

export function getTokenAddress(
  symbol: string,
  chainId: number
): `0x${string}` | undefined {
  return getToken(symbol)?.address[chainId];
}

export function getTokenDecimals(symbol: string): number {
  return getToken(symbol)?.decimals ?? 18;
}

/**
 * Tokens accepted by the Celo FeeCurrencyDirectory contract (CIP-64).
 * When set as `feeCurrency` in a transaction, gas is deducted from that token
 * instead of CELO. All Mento stablecoins + USDT (via adapter) are registered.
 */
const FEE_CURRENCY_SYMBOLS = new Set([
  "USDm", "EURm", "BRLm", "KESm", "XOFm", "COPm", "PHPm", "GHSm",
  "NGNm", "GBPm", "ZARm", "CADm", "AUDm", "CHFm", "JPYm",
  "USDT", // Tether USD (CGP-0167, via FeeCurrencyAdapter)
  // G$ (GoodDollar) is NOT in the FeeCurrencyDirectory.
]);

/**
 * Tokens with non-18 decimals cannot be registered directly in the
 * FeeCurrencyDirectory - a FeeCurrencyAdapter normalises decimals for the Celo
 * gas engine. The `feeCurrency` field must point to the adapter address, NOT
 * the token address, for these tokens to function as fee currencies.
 */
const FEE_CURRENCY_ADAPTERS: Partial<Record<string, Partial<Record<number, `0x${string}`>>>> = {
  USDT: {
    [celo.id]: "0x0E2A3e05bc9A16F5292A6170456A710cb89C6f72", // CGP-0167
  },
};

/**
 * Returns the on-chain address to pass as `feeCurrency` in a Celo transaction,
 * or `undefined` if the token is not whitelisted or has no adapter on this chain.
 */
export function getFeeCurrencyAddress(
  tokenSymbol: string,
  chainId: number
): `0x${string}` | undefined {
  if (!FEE_CURRENCY_SYMBOLS.has(tokenSymbol)) return undefined;
  if (FEE_CURRENCY_ADAPTERS[tokenSymbol]) {
    return FEE_CURRENCY_ADAPTERS[tokenSymbol]?.[chainId];
  }
  // 18-decimal Mento stablecoins: token address = fee currency address
  return getTokenAddress(tokenSymbol, chainId);
}

/**
 * Priority order for fee currency fallback.
 * USDm first because it's the most liquid and universally held on MiniPay.
 */
const FEE_CURRENCY_PRIORITY = [
  "USDm", "EURm", "BRLm", "KESm", "XOFm", "COPm", "PHPm",
  "GHSm", "NGNm", "GBPm", "ZARm", "CADm", "AUDm", "CHFm", "JPYm",
  "USDT",
];

/**
 * For wallets that support CIP-64 but are paying with a non-fee-currency token
 * (e.g. USDT on MiniPay), returns the address + symbol of the best available
 * fee currency based on the user's actual balances.
 */
export function getFallbackFeeCurrency(
  paymentToken: string,
  chainId: number,
  /** Map of symbol → numeric balance. Only needs fee-currency tokens. */
  balances: Partial<Record<string, number>>
): { address: `0x${string}`; symbol: string } | undefined {
  if (FEE_CURRENCY_SYMBOLS.has(paymentToken)) return undefined;

  for (const symbol of FEE_CURRENCY_PRIORITY) {
    if ((balances[symbol] ?? 0) > 0.0005) {
      const address = getTokenAddress(symbol, chainId);
      if (address) return { address, symbol };
    }
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------
export const DEFAULT_TOKEN = TOKENS[0]; // USDT

// ---------------------------------------------------------------------------
// Trade parameter builder
// ---------------------------------------------------------------------------
export function buildTradeParams(
  productCost: number,
  totalQuantity: number,
  paymentToken: string,
  chainId: number
) {
  const normalizedQty = Number.isFinite(totalQuantity)
    ? Math.floor(totalQuantity)
    : 0;
  const tokenAddress = getTokenAddress(paymentToken, chainId);

  return {
    productCost,
    totalQuantity: normalizedQty,
    paymentToken,
    tokenAddress,
  };
}
