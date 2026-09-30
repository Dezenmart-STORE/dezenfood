/**
 * Unified error parser for contract, swap, API, and wallet errors.
 */

export interface ParsedError {
  title: string;
  message: string;
  suggestion?: string;
  recoverable: boolean;
}

// Error pattern -> user-friendly output
const ERROR_PATTERNS: Array<{
  test: (s: string) => boolean;
  result: Omit<ParsedError, "recoverable"> & { recoverable?: boolean };
}> = [
  // ── User action ──
  {
    test: (s) =>
      s.includes("user rejected") ||
      s.includes("user denied") ||
      s.includes("user cancelled"),
    result: {
      title: "Cancelled",
      message: "You cancelled the transaction.",
    },
  },

  // ── Insufficient balance / funds ──
  {
    test: (s) =>
      (s.includes("insufficient") && (s.includes("funds") || s.includes("balance"))) ||
      s.includes("insufficienttokenbalance") ||
      s.includes("insufficientusdtbalance"),
    result: {
      title: "Insufficient Balance",
      message: "You don't have enough tokens to complete this transaction.",
      suggestion: "Check your balance and try a smaller amount.",
    },
  },

  // ── Gas ──
  {
    test: (s) => s.includes("gas") && s.includes("insufficient"),
    result: {
      title: "Not Enough Gas",
      message: "You need CELO to pay for transaction fees.",
      suggestion: "Add a small amount of CELO to your wallet.",
    },
  },

  // ── Allowance / Approval ──
  {
    test: (s) =>
      s.includes("allowance") ||
      s.includes("insufficienttokenallowance") ||
      s.includes("approval"),
    result: {
      title: "Approval Needed",
      message: "You need to approve token spending first.",
      suggestion: "Approve the token and try again.",
    },
  },

  // ── Slippage / price ──
  {
    test: (s) =>
      s.includes("slippage") ||
      s.includes("price movement") ||
      s.includes("too old"),
    result: {
      title: "Price Changed",
      message: "The price moved too much during the transaction.",
      suggestion: "Try again - or increase slippage tolerance.",
    },
  },

  // ── Liquidity ──
  {
    test: (s) =>
      s.includes("liquidity") || s.includes("insufficient reserves"),
    result: {
      title: "Low Liquidity",
      message: "Not enough liquidity for this swap.",
      suggestion: "Try a smaller amount or a different token.",
    },
  },

  // ── Network / connection ──
  {
    test: (s) =>
      s.includes("network") ||
      s.includes("timeout") ||
      s.includes("rpc") ||
      s.includes("connection"),
    result: {
      title: "Connection Issue",
      message: "Having trouble reaching the network.",
      suggestion: "Check your internet and try again.",
    },
  },

  // ── Chain not added to wallet (MetaMask 4902) ──
  // "Unrecognized chain ID ... Try adding the chain using wallet_addEthereumChain"
  {
    test: (s) =>
      s.includes("4902") ||
      s.includes("unrecognizedchain") ||
      s.includes("addethereumchain"),
    result: {
      title: "Add the Celo Network",
      message: "Celo isn't set up in your wallet yet.",
      suggestion: "Approve the \"Add network\" prompt in your wallet, then try again.",
    },
  },

  // ── Wrong chain ──
  // Catches wagmi's ChainMismatchError: "The current chain of the wallet
  // (id: X) does not match the target chain for the transaction (id: Y - ...)"
  {
    test: (s) =>
      s.includes("wrongnetwork") ||
      s.includes("unsupportedchain") ||
      s.includes("chainmismatch") ||
      s.includes("doesnotmatch") ||
      s.includes("currentchainofthewallet") ||
      s.includes("switchchain") ||
      (s.includes("chain") && s.includes("doesnotmatch")),
    result: {
      title: "Wrong Network",
      message: "Your wallet is on the wrong network.",
      suggestion: "Switch to Celo and try again.",
    },
  },

  // ── Deadline / expiry ──
  {
    test: (s) => s.includes("deadline") || s.includes("expired"),
    result: {
      title: "Transaction Expired",
      message: "The transaction took too long.",
      suggestion: "Please try again.",
    },
  },

  // ── Nonce ──
  {
    test: (s) => s.includes("nonce too low"),
    result: {
      title: "Transaction Conflict",
      message: "A previous transaction is still processing.",
      suggestion: "Wait a moment and try again.",
    },
  },

  // ── Contract-specific errors ──
  {
    test: (s) => s.includes("buyerisseller") || s.includes("buyyourownlisting"),
    result: {
      title: "Can't Buy Your Own Item",
      message: "You can't purchase your own listing.",
      suggestion: "Connect a different wallet than the one that listed it.",
    },
  },
  {
    test: (s) => s.includes("invalidtradeid") || s.includes("tradenotfound"),
    result: {
      title: "Trade Not Found",
      message: "This trade doesn't exist or has been removed.",
    },
  },
  {
    test: (s) => s.includes("invalidquantity") || s.includes("insufficientquantity"),
    result: {
      title: "Quantity Issue",
      message: "The requested quantity isn't available.",
      suggestion: "Try a smaller quantity.",
    },
  },
  {
    test: (s) => s.includes("invalidlogisticsprovider"),
    result: {
      title: "Delivery Issue",
      message: "The selected delivery provider isn't available.",
      suggestion: "Go back and choose a different delivery option.",
    },
  },
  {
    test: (s) => s.includes("notauthorized"),
    result: {
      title: "Not Authorized",
      message: "You don't have permission for this action.",
    },
  },
  {
    test: (s) => s.includes("invalidpurchasestate"),
    result: {
      title: "Action Not Available",
      message: "This order isn't in the right state for that action.",
    },
  },
  {
    test: (s) => s.includes("purchasenotfound") || s.includes("invalidpurchaseid"),
    result: {
      title: "Order Not Found",
      message: "This order doesn't exist.",
    },
  },
  {
    test: (s) =>
      s.includes("no longer available") ||
      s.includes("product is no longer available"),
    result: {
      title: "Item Unavailable",
      message: "This product is no longer available.",
      suggestion: "Browse for similar items.",
    },
  },
  {
    test: (s) =>
      s.includes("logistics provider before completing") ||
      s.includes("select a delivery option") ||
      s.includes("no logistics provider"),
    result: {
      title: "Select Delivery",
      message: "Please choose a delivery option first.",
      suggestion: "Go back to the product page and select delivery.",
    },
  },
  {
    test: (s) => s.includes("reverted") || s.includes("transaction failed"),
    result: {
      title: "Transaction Failed",
      message: "The transaction couldn't be completed.",
      suggestion: "Try again. If it keeps failing, try a different amount.",
    },
  },
];

/**
 * Parse any error into a user-friendly message.
 */
export function parseError(error: unknown): ParsedError {
  // Extract the best message string from the error
  const raw = extractMessage(error);
  const lower = raw.toLowerCase().replace(/[\s_-]/g, "");

  for (const { test, result } of ERROR_PATTERNS) {
    if (test(lower)) {
      return { recoverable: true, ...result };
    }
  }

  // Fallback
  return {
    title: "Something Went Wrong",
    message: raw || "An unexpected error occurred.",
    suggestion: "Please try again. If the problem persists, contact support.",
    recoverable: true,
  };
}

/**
 * Extract the most useful message string from an error of any shape.
 */
function extractMessage(error: unknown): string {
  if (!error) return "";
  if (typeof error === "string") return error;

  const err = error as Record<string, any>;

  // Viem ContractFunctionExecutionError: the decoded custom Solidity error name
  // lives at cause.data.errorName (e.g. "InvalidLogisticsProvider").
  // Include args so patterns like InsufficientQuantity(1,0) are fully visible.
  if (err.cause?.data?.errorName) {
    const name = err.cause.data.errorName as string;
    const args = err.cause?.data?.args as unknown[] | undefined;
    if (args?.length) {
      return `${name}(${args.map(String).join(",")})`;
    }
    return name;
  }

  // Viem / wagmi structured errors
  if (err.cause?.reason) return err.cause.reason;
  if (err.shortMessage) return err.shortMessage;
  if (err.message) return err.message;

  return String(error);
}

/**
 * One-liner: get just the user-facing message string.
 */
export function getErrorMessage(error: unknown): string {
  const parsed = parseError(error);
  return parsed.suggestion
    ? `${parsed.message} ${parsed.suggestion}`
    : parsed.message;
}

/**
 * Log error with context. In development, logs full details. In production,
 * logs to console.error (so APM / browser error-tracking tools capture it)
 * and forwards to any registered reporter (e.g. Sentry).
 */
export function logError(
  error: unknown,
  context: string,
  extra?: Record<string, unknown>
): void {
  const parsed = parseError(error);

  if (!import.meta.env.PROD) {
    console.error(`[${context}]`, { ...parsed, raw: error, ...extra });
    return;
  }

  // Production: always surface so APM / RUM tools capture it.
  console.error(`[DezenFoods/${context}]`, parsed.title, parsed.message, extra ?? "");
  _forwardToReporter(error, context, parsed, extra);
}

let _reporter: ((
  error: unknown,
  context: string,
  parsed: ParsedError,
  extra?: Record<string, unknown>
) => void) | null = null;

/**
 * Register a production error reporter (e.g. Sentry).
 * Call once at app startup before any transactions can occur.
 *
 * Example:
 *   registerErrorReporter((err, ctx, parsed) =>
 *     Sentry.captureException(err, { extra: { ctx, ...parsed } })
 *   );
 */
export function registerErrorReporter(
  fn: (error: unknown, context: string, parsed: ParsedError, extra?: Record<string, unknown>) => void
): void {
  _reporter = fn;
}

function _forwardToReporter(
  error: unknown,
  context: string,
  parsed: ParsedError,
  extra?: Record<string, unknown>
): void {
  if (!_reporter) return;
  try {
    _reporter(error, context, parsed, extra);
  } catch {
    // reporter itself failed - don't crash the app
  }
}
