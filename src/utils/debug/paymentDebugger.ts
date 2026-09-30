/**
 * Production Payment Flow Debugger
 *
 * Enable in browser console:
 *   window.enablePaymentDebug()
 *
 * Disable:
 *   window.disablePaymentDebug()
 *
 * Export debug data:
 *   window.exportPaymentDebug()
 */

interface PaymentStep {
  timestamp: number;
  step: string;
  status: 'pending' | 'success' | 'error';
  data?: any;
  error?: string;
}

interface PaymentDebugSession {
  sessionId: string;
  startTime: number;
  userAddress?: string;
  chainId?: number;
  steps: PaymentStep[];
  tokenInfo?: {
    symbol: string;
    balance: string;
    allowance: string;
    requiredAmount: number;
  };
  transactionHashes?: {
    approval?: string;
    purchase?: string;
  };
}

class PaymentDebugger {
  private enabled: boolean = false;
  private currentSession: PaymentDebugSession | null = null;
  private sessions: PaymentDebugSession[] = [];
  private maxSessions: number = 10;

  constructor() {
    // Check if debug mode was previously enabled
    const savedState = localStorage.getItem('PAYMENT_DEBUG_ENABLED');
    if (savedState === 'true') {
      this.enable();
    }
  }

  enable() {
    this.enabled = true;
    localStorage.setItem('PAYMENT_DEBUG_ENABLED', 'true');
    console.log('🔍 Payment Debugger ENABLED');
    console.log('📊 Debug data will be collected for all payment flows');
    console.log('💾 Use window.exportPaymentDebug() to export data');
    console.log('❌ Use window.disablePaymentDebug() to disable');
  }

  disable() {
    this.enabled = false;
    localStorage.setItem('PAYMENT_DEBUG_ENABLED', 'false');
    console.log('🔍 Payment Debugger DISABLED');
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  startSession(userAddress?: string, chainId?: number) {
    if (!this.enabled) return;

    this.currentSession = {
      sessionId: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      startTime: Date.now(),
      userAddress,
      chainId,
      steps: [],
    };

    console.log('🎬 Payment Debug Session Started:', this.currentSession.sessionId);
  }

  logStep(step: string, status: 'pending' | 'success' | 'error', data?: any, error?: string) {
    if (!this.enabled || !this.currentSession) return;

    const stepData: PaymentStep = {
      timestamp: Date.now(),
      step,
      status,
      data: this.sanitizeData(data),
      error,
    };

    this.currentSession.steps.push(stepData);

    // Log to console with appropriate styling
    const icon = status === 'success' ? '✅' : status === 'error' ? '❌' : '⏳';
    console.log(`${icon} [Debug] ${step}`, data);
  }

  setTokenInfo(tokenInfo: PaymentDebugSession['tokenInfo']) {
    if (!this.enabled || !this.currentSession) return;
    this.currentSession.tokenInfo = tokenInfo;
  }

  setTransactionHash(type: 'approval' | 'purchase', hash: string) {
    if (!this.enabled || !this.currentSession) return;
    if (!this.currentSession.transactionHashes) {
      this.currentSession.transactionHashes = {};
    }
    this.currentSession.transactionHashes[type] = hash;
  }

  endSession(success: boolean) {
    if (!this.enabled || !this.currentSession) return;

    const duration = Date.now() - this.currentSession.startTime;
    console.log(`🏁 Payment Debug Session Ended: ${success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`⏱️ Duration: ${(duration / 1000).toFixed(2)}s`);

    // Store session
    this.sessions.push(this.currentSession);

    // Limit stored sessions
    if (this.sessions.length > this.maxSessions) {
      this.sessions.shift();
    }

    this.currentSession = null;
  }

  getCurrentSession(): PaymentDebugSession | null {
    return this.currentSession;
  }

  getAllSessions(): PaymentDebugSession[] {
    return this.sessions;
  }

  exportDebugData(): string {
    const exportData = {
      debuggerVersion: '1.0.0',
      exportTime: new Date().toISOString(),
      currentSession: this.currentSession,
      pastSessions: this.sessions,
      environment: {
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: Date.now(),
      },
    };

    const json = JSON.stringify(exportData, null, 2);

    // Create downloadable file
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payment-debug-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    console.log('📥 Debug data exported successfully');
    return json;
  }

  printSummary() {
    if (!this.currentSession) {
      console.log('No active debug session');
      return;
    }

    console.group('📊 Payment Debug Summary');
    console.log('Session ID:', this.currentSession.sessionId);
    console.log('User Address:', this.currentSession.userAddress);
    console.log('Chain ID:', this.currentSession.chainId);
    console.log('Steps:', this.currentSession.steps.length);

    if (this.currentSession.tokenInfo) {
      console.log('Token Info:', this.currentSession.tokenInfo);
    }

    if (this.currentSession.transactionHashes) {
      console.log('Transaction Hashes:', this.currentSession.transactionHashes);
    }

    console.log('\nSteps:');
    this.currentSession.steps.forEach((step, idx) => {
      const icon = step.status === 'success' ? '✅' : step.status === 'error' ? '❌' : '⏳';
      console.log(`${idx + 1}. ${icon} ${step.step} (${step.status})`);
      if (step.error) {
        console.log(`   Error: ${step.error}`);
      }
    });
    console.groupEnd();
  }

  clearSessions() {
    this.sessions = [];
    this.currentSession = null;
    console.log('🗑️ All debug sessions cleared');
  }

  private sanitizeData(data: any): any {
    if (!data) return data;

    // Remove sensitive information
    const sanitized = { ...data };

    // Remove private keys, mnemonics, etc.
    const sensitiveKeys = ['privateKey', 'mnemonic', 'seed', 'password', 'secret'];
    sensitiveKeys.forEach(key => {
      if (key in sanitized) {
        delete sanitized[key];
      }
    });

    return sanitized;
  }
}

// Create global instance
const paymentDebugger = new PaymentDebugger();

// Expose to window for console access
declare global {
  interface Window {
    paymentDebugger: PaymentDebugger;
    enablePaymentDebug: () => void;
    disablePaymentDebug: () => void;
    exportPaymentDebug: () => string;
    printPaymentDebug: () => void;
    clearPaymentDebug: () => void;
  }
}

window.paymentDebugger = paymentDebugger;

window.enablePaymentDebug = () => paymentDebugger.enable();
window.disablePaymentDebug = () => paymentDebugger.disable();
window.exportPaymentDebug = () => paymentDebugger.exportDebugData();
window.printPaymentDebug = () => paymentDebugger.printSummary();
window.clearPaymentDebug = () => paymentDebugger.clearSessions();

// Show available commands
if (typeof window !== 'undefined') {
  console.log('💳 Payment Debugger Available:');
  console.log('  enablePaymentDebug()  - Start collecting debug data');
  console.log('  disablePaymentDebug() - Stop collecting debug data');
  console.log('  printPaymentDebug()   - Show current session summary');
  console.log('  exportPaymentDebug()  - Download debug data as JSON');
  console.log('  clearPaymentDebug()   - Clear all debug sessions');
}

export default paymentDebugger;
