/**
 * Post-connect guidance for moving funds onto Celo, tailored per wallet.
 * Keyed by a normalized wallet key (see matchGuide).
 */
export interface FundGuide {
  title: string;
  intro: string;
  steps: string[];
  /** When true the wallet is already Celo-native and no move is needed. */
  alreadyOnCelo?: boolean;
}

const METAMASK: FundGuide = {
  title: "Using MetaMask on Celo",
  intro:
    "DezenFoods runs on Celo. We've switched MetaMask to the Celo network. Anything you hold on Ethereum, BSC, or other chains won't show up here until you move it to Celo.",
  steps: [
    "Confirm MetaMask's network selector shows \"Celo\" at the top.",
    "To bring funds over, open a bridge like Squid (squidrouter.com) or Portal and connect MetaMask.",
    "Choose your source chain and token, pick Celo as the destination, and confirm the bridge.",
    "Once the funds arrive on Celo, they'll be usable on DezenFoods.",
  ],
};

const COINBASE: FundGuide = {
  title: "Using Coinbase Wallet on Celo",
  intro:
    "DezenFoods runs on Celo. We've switched Coinbase Wallet to Celo. Balances on other networks stay put until you move them over.",
  steps: [
    "In Coinbase Wallet, make sure the active network is Celo.",
    "To move funds, use a bridge such as Squid (squidrouter.com) and connect Coinbase Wallet.",
    "Select your token and source chain, set Celo as the destination, and confirm.",
    "After bridging, your funds will be spendable on DezenFoods.",
  ],
};

const TRUST: FundGuide = {
  title: "Using Trust Wallet on Celo",
  intro:
    "DezenFoods runs on Celo. We've switched Trust Wallet to Celo. Funds on other chains won't be accessible here until you bridge them.",
  steps: [
    "In Trust Wallet, ensure Celo is the selected network.",
    "Open a bridge like Squid (squidrouter.com) in Trust Wallet's browser and connect.",
    "Pick your token and origin chain, choose Celo as the destination, and confirm.",
    "Once on Celo, the funds are ready to use on DezenFoods.",
  ],
};

const VALORA: FundGuide = {
  title: "You're all set with Valora",
  intro:
    "Valora is built on Celo, so your funds are already on the right network. Nothing to move.",
  steps: [
    "You can pay and get paid on DezenFoods right away.",
    "Top up in Valora any time using its built-in add-funds options.",
  ],
  alreadyOnCelo: true,
};

const GENERIC: FundGuide = {
  title: "Using your wallet on Celo",
  intro:
    "DezenFoods runs on Celo and we've switched your wallet to it. Funds on other networks won't be usable here until you move them to Celo.",
  steps: [
    "Confirm your wallet's active network is Celo.",
    "Use a cross-chain bridge such as Squid (squidrouter.com) to move tokens from other chains to Celo.",
    "After the funds arrive on Celo, they'll be usable on DezenFoods.",
  ],
};

/** Map a Dynamic wallet key/name to its fund guide. */
export function getFundGuide(keyOrName: string): FundGuide {
  const k = (keyOrName || "").toLowerCase();
  if (k.includes("valora")) return VALORA;
  if (k.includes("metamask")) return METAMASK;
  if (k.includes("coinbase")) return COINBASE;
  if (k.includes("trust")) return TRUST;
  return GENERIC;
}
