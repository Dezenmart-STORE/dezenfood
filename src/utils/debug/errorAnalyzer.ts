/**
 * Web3 Error Analyzer
 *
 * Provides human-readable explanations for common Web3 errors
 */

interface ErrorAnalysis {
  category: string;
  message: string;
  solution: string;
  technicalDetails?: string;
}

class ErrorAnalyzer {
  analyzeError(error: any): ErrorAnalysis {
    const errorMessage = error?.message || error?.toString() || '';
    const errorCode = error?.code || '';

    // User rejected transaction
    if (
      errorMessage.includes('User rejected') ||
      errorMessage.includes('user rejected') ||
      errorCode === 4001 ||
      errorCode === 'ACTION_REJECTED'
    ) {
      return {
        category: 'User Action',
        message: 'Transaction was rejected by user',
        solution: 'Please approve the transaction in your wallet to continue',
      };
    }

    // Insufficient funds
    if (
      errorMessage.includes('insufficient funds') ||
      errorMessage.includes('InsufficientTokenBalance')
    ) {
      return {
        category: 'Balance',
        message: 'Insufficient token balance',
        solution: 'Please add more tokens to your wallet or reduce the purchase amount',
        technicalDetails: errorMessage,
      };
    }

    // Insufficient allowance
    if (
      errorMessage.includes('InsufficientTokenAllowance') ||
      errorMessage.includes('Insufficient') && errorMessage.includes('Allowance')
    ) {
      return {
        category: 'Approval',
        message: 'Token allowance is insufficient',
        solution: 'Please approve token spending first. This should happen automatically.',
        technicalDetails: errorMessage,
      };
    }

    // Insufficient quantity
    if (errorMessage.includes('InsufficientQuantity')) {
      return {
        category: 'Stock',
        message: 'Not enough stock available',
        solution: 'Try reducing the quantity or choose a different product',
      };
    }

    // Trade not found
    if (
      errorMessage.includes('TradeNotFound') ||
      errorMessage.includes('InvalidTradeId')
    ) {
      return {
        category: 'Product',
        message: 'Product listing not found on blockchain',
        solution: 'This product may no longer be available. Please refresh and try another item.',
      };
    }

    // Network errors
    if (
      errorMessage.includes('Network') ||
      errorMessage.includes('network') ||
      errorMessage.includes('JSON-RPC')
    ) {
      return {
        category: 'Network',
        message: 'Network connection issue',
        solution: 'Check your internet connection and try again. You may also need to switch RPC endpoints.',
        technicalDetails: errorMessage,
      };
    }

    // Gas errors
    if (
      errorMessage.includes('gas') ||
      errorMessage.includes('out of gas')
    ) {
      return {
        category: 'Gas',
        message: 'Gas estimation failed or insufficient gas',
        solution: 'Ensure you have enough CELO for transaction fees (usually 0.01-0.1 CELO)',
        technicalDetails: errorMessage,
      };
    }

    // Wrong network
    if (
      errorMessage.includes('wrong network') ||
      errorMessage.includes('switch network') ||
      errorMessage.includes('Unsupported chain')
    ) {
      return {
        category: 'Network',
        message: 'Wrong blockchain network',
        solution: 'Please switch to Celo network in your wallet',
      };
    }

    // Nonce too low
    if (errorMessage.includes('nonce too low')) {
      return {
        category: 'Transaction',
        message: 'Transaction nonce conflict',
        solution: 'Reset your wallet account or wait a few seconds and try again',
        technicalDetails: errorMessage,
      };
    }

    // Transaction timeout
    if (
      errorMessage.includes('timeout') ||
      errorMessage.includes('timed out')
    ) {
      return {
        category: 'Network',
        message: 'Transaction timed out',
        solution: 'The network may be congested. Please try again in a few moments.',
      };
    }

    // Generic fallback
    return {
      category: 'Unknown',
      message: 'An unexpected error occurred',
      solution: 'Please check the console for details and contact support if the issue persists',
      technicalDetails: errorMessage,
    };
  }

  printAnalysis(error: any) {
    const analysis = this.analyzeError(error);

    console.group('🔍 Error Analysis');
    console.log('📁 Category:', analysis.category);
    console.log('💬 Message:', analysis.message);
    console.log('💡 Solution:', analysis.solution);

    if (analysis.technicalDetails) {
      console.log('🔧 Technical Details:', analysis.technicalDetails);
    }

    console.groupEnd();

    return analysis;
  }
}

const errorAnalyzer = new ErrorAnalyzer();

declare global {
  interface Window {
    errorAnalyzer: ErrorAnalyzer;
    analyzeError: (error: any) => void;
  }
}

window.errorAnalyzer = errorAnalyzer;

window.analyzeError = (error: any) => {
  errorAnalyzer.printAnalysis(error);
};

export default errorAnalyzer;
