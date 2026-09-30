/**
 * Debug Tools Index
 *
 * Import this file in main.tsx to enable all debugging tools
 */

import paymentDebugger from './paymentDebugger';
import transactionMonitor from './transactionMonitor';
import errorAnalyzer from './errorAnalyzer';
import { injectAuthToken } from '../dev/injectAuth';

// Initialize all debuggers
export const initDebugTools = () => {
  console.log('🛠️ Debug Tools Initialized');
  console.log('');
  console.log('📋 Available Commands:');
  console.log('  Authentication:');
  console.log('    injectAuthToken(token) - Login with JWT token');
  console.log('    clearAuth()            - Logout and clear auth');
  console.log('');
  console.log('  Payment Debugging:');
  console.log('    enablePaymentDebug()  - Track all payment flows');
  console.log('    printPaymentDebug()   - Show current session');
  console.log('    exportPaymentDebug()  - Download debug data');
  console.log('');
  console.log('  Transaction Tracking:');
  console.log('    viewTransaction(hash) - View transaction details');
  console.log('');
  console.log('  Error Analysis:');
  console.log('    analyzeError(error)   - Get help with errors');
  console.log('');
};

// Helper to log payment step
export const logPaymentStep = (
  step: string,
  status: 'pending' | 'success' | 'error',
  data?: any,
  error?: string
) => {
  if (paymentDebugger.isEnabled()) {
    paymentDebugger.logStep(step, status, data, error);
  }
};

// Helper to start payment session
export const startPaymentSession = (userAddress?: string, chainId?: number) => {
  if (paymentDebugger.isEnabled()) {
    paymentDebugger.startSession(userAddress, chainId);
  }
};

// Helper to end payment session
export const endPaymentSession = (success: boolean) => {
  if (paymentDebugger.isEnabled()) {
    paymentDebugger.endSession(success);
  }
};

// Helper to track transaction
export const trackTransaction = (
  hash: string,
  type: 'approval' | 'purchase'
) => {
  transactionMonitor.trackTransaction(hash, type);
};

// Helper to update transaction status
export const updateTransactionStatus = (
  hash: string,
  status: 'confirmed' | 'failed',
  details?: any
) => {
  transactionMonitor.updateStatus(hash, status, details);
};

// Helper to analyze error
export const analyzePaymentError = (error: any) => {
  return errorAnalyzer.analyzeError(error);
};

export {
  paymentDebugger,
  transactionMonitor,
  errorAnalyzer,
};
