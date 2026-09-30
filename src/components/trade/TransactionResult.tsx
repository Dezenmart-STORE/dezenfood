import { useChainId } from "wagmi";
import { getExplorerUrl } from "../../config/chains";
import { truncateAddress } from "../../utils/format";

interface Props {
  success: boolean;
  txHash?: string;
  purchaseId?: string;
  message?: string;
  onDone?: () => void;
  onRetry?: () => void;
}

/**
 * Transaction result screen - success or failure. Dark themed.
 */
export default function TransactionResult({
  success,
  txHash,
  purchaseId,
  message,
  onDone,
  onRetry,
}: Props) {
  const chainId = useChainId();

  if (success) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-[#292B30] bg-[#212428] p-6 text-center sm:p-8">
        {/* Success icon */}
        <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-green-800/50 bg-green-900/30">
          <svg
            className="h-10 w-10 text-green-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h2 className="text-2xl font-bold text-white">
          {message || "Transaction Successful!"}
        </h2>
        <p className="mt-2 text-sm text-gray-400">
          Your transaction has been confirmed on the blockchain.
        </p>

        {/* Details */}
        <div className="mt-6 w-full space-y-3 rounded-xl border border-[#292B30] bg-[#292B30] p-4 text-left">
          {purchaseId && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Order ID</span>
              <span className="text-sm font-mono font-semibold text-gray-300">
                #{purchaseId}
              </span>
            </div>
          )}
          {txHash && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Transaction</span>
              <a
                href={getExplorerUrl(chainId, txHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-red-400 hover:text-red-300"
              >
                {truncateAddress(txHash, 6)} →
              </a>
            </div>
          )}
        </div>

        {onDone && (
          <button
            onClick={onDone}
            className="mt-6 w-full rounded-xl bg-[#292B30] py-3.5 text-sm font-bold text-white transition-colors hover:bg-[#373A3F]"
          >
            Continue
          </button>
        )}
      </div>
    );
  }

  // ── Failure ────────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center rounded-2xl border border-[#292B30] bg-[#212428] p-6 text-center sm:p-8">
      <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-red-800/50 bg-red-900/30">
        <svg
          className="h-10 w-10 text-red-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>

      <h2 className="text-2xl font-bold text-white">Transaction Failed</h2>
      <p className="mt-2 max-w-sm text-sm text-gray-400">
        {message || "Something went wrong. Please try again."}
      </p>

      <div className="mt-6 flex w-full gap-3">
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex-1 rounded-xl bg-brand py-3.5 text-sm font-bold text-white transition-colors hover:bg-brand-hover"
          >
            Try Again
          </button>
        )}
        {onDone && (
          <button
            onClick={onDone}
            className="flex-1 rounded-xl border border-[#292B30] bg-[#292B30] py-3.5 text-sm font-bold text-gray-300 transition-colors hover:bg-[#373A3F]"
          >
            Go Back
          </button>
        )}
      </div>
    </div>
  );
}
