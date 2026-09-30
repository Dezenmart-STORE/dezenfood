/**
 * Real-time Transaction Monitor
 *
 * Tracks Web3 transactions and provides live updates
 */

interface TransactionStatus {
  hash: string;
  type: 'approval' | 'purchase';
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: number;
  confirmations?: number;
  gasUsed?: string;
  blockNumber?: number;
  error?: string;
}

class TransactionMonitor {
  private transactions: Map<string, TransactionStatus> = new Map();
  private callbacks: Map<string, (status: TransactionStatus) => void> = new Map();

  trackTransaction(
    hash: string,
    type: 'approval' | 'purchase',
    callback?: (status: TransactionStatus) => void
  ) {
    const tx: TransactionStatus = {
      hash,
      type,
      status: 'pending',
      timestamp: Date.now(),
    };

    this.transactions.set(hash, tx);

    if (callback) {
      this.callbacks.set(hash, callback);
    }

    console.log(`📡 Tracking ${type} transaction:`, hash);
    this.logTransactionLink(hash);
  }

  updateStatus(
    hash: string,
    status: 'confirmed' | 'failed',
    details?: Partial<TransactionStatus>
  ) {
    const tx = this.transactions.get(hash);
    if (!tx) return;

    tx.status = status;
    if (details) {
      Object.assign(tx, details);
    }

    this.transactions.set(hash, tx);

    const callback = this.callbacks.get(hash);
    if (callback) {
      callback(tx);
    }

    const icon = status === 'confirmed' ? '✅' : '❌';
    console.log(`${icon} Transaction ${status}:`, hash);

    if (details?.gasUsed) {
      console.log(`⛽ Gas used: ${details.gasUsed}`);
    }
  }

  getTransaction(hash: string): TransactionStatus | undefined {
    return this.transactions.get(hash);
  }

  getAllTransactions(): TransactionStatus[] {
    return Array.from(this.transactions.values());
  }

  private logTransactionLink(hash: string) {
    // Detect network from URL or default to Celo mainnet
    const network = window.location.hostname.includes('test') ? 'alfajores' : 'mainnet';
    const explorerUrl = network === 'alfajores'
      ? `https://alfajores.celoscan.io/tx/${hash}`
      : `https://celoscan.io/tx/${hash}`;

    console.log(`🔗 View on explorer: ${explorerUrl}`);
  }

  clearOldTransactions(olderThanMs: number = 3600000) {
    const now = Date.now();
    let removed = 0;

    for (const [hash, tx] of this.transactions.entries()) {
      if (now - tx.timestamp > olderThanMs) {
        this.transactions.delete(hash);
        this.callbacks.delete(hash);
        removed++;
      }
    }

    if (removed > 0) {
      console.log(`🗑️ Cleared ${removed} old transaction(s)`);
    }
  }
}

const transactionMonitor = new TransactionMonitor();

declare global {
  interface Window {
    transactionMonitor: TransactionMonitor;
    viewTransaction: (hash: string) => void;
  }
}

window.transactionMonitor = transactionMonitor;

window.viewTransaction = (hash: string) => {
  const tx = transactionMonitor.getTransaction(hash);
  if (!tx) {
    console.log('❌ Transaction not found:', hash);
    return;
  }

  console.group('📊 Transaction Details');
  console.log('Hash:', tx.hash);
  console.log('Type:', tx.type);
  console.log('Status:', tx.status);
  console.log('Timestamp:', new Date(tx.timestamp).toISOString());

  if (tx.confirmations) {
    console.log('Confirmations:', tx.confirmations);
  }

  if (tx.gasUsed) {
    console.log('Gas Used:', tx.gasUsed);
  }

  if (tx.blockNumber) {
    console.log('Block Number:', tx.blockNumber);
  }

  if (tx.error) {
    console.log('Error:', tx.error);
  }

  console.groupEnd();
};

export default transactionMonitor;
