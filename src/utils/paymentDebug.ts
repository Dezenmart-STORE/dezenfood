/**
 * Payment flow debugger.
 *
 * This used to be gated entirely on `import.meta.env.DEV`, so in production -
 * the only place real payment failures happen - log() and error() returned
 * immediately and `window.__paymentDebug` was never exposed. A failing payment
 * left nothing behind to diagnose it with.
 *
 * Now:
 *  - error() ALWAYS reaches console.error. A failed payment is exactly the kind
 *    of thing that must be visible in production.
 *  - log() is verbose, so it prints in dev or when a user opts in at runtime
 *    with `__paymentDebug.enable()` (persisted, so it survives the reloads the
 *    wallet flows perform).
 *  - The step trace is always recorded to a bounded buffer, so
 *    `__paymentDebug.getTrace()` works after a failure even if nobody thought to
 *    turn logging on first.
 */

const IS_DEV = import.meta.env.DEV;
const FLAG_KEY = "dezen_payment_debug";
/** Bounded so an always-on buffer can't grow without limit. */
const MAX_STEPS = 300;

const readFlag = (): boolean => {
  try {
    return localStorage.getItem(FLAG_KEY) === "1";
  } catch {
    return false;
  }
};

interface DebugStep {
  step: string;
  data?: Record<string, unknown>;
  timestamp: number;
}

class PaymentDebugger {
  private sessionId = "";
  private steps: DebugStep[] = [];
  private verbose = IS_DEV || readFlag();

  /** Turn on verbose logging and persist it across the wallet flows' reloads. */
  enable(): string {
    try {
      localStorage.setItem(FLAG_KEY, "1");
    } catch {
      /* private mode: in-memory only */
    }
    this.verbose = true;
    console.log("[Payment] debug logging ON. Reproduce the payment, then run __paymentDebug.printTrace()");
    return "enabled";
  }

  disable(): string {
    try {
      localStorage.removeItem(FLAG_KEY);
    } catch {
      /* ignore */
    }
    this.verbose = false;
    return "disabled";
  }

  private push(entry: DebugStep): void {
    this.steps.push(entry);
    if (this.steps.length > MAX_STEPS) this.steps.shift();
  }

  startSession(context: string): string {
    this.sessionId = `pay_${Date.now().toString(36)}`;
    this.steps = [];
    this.log("session:start", { context, sessionId: this.sessionId });
    return this.sessionId;
  }

  log(step: string, data?: Record<string, unknown>): void {
    // Always recorded; only printed when verbose.
    this.push({ step, data, timestamp: Date.now() });
    if (this.verbose) console.log(`[Payment:${this.sessionId}] ${step}`, data ?? "");
  }

  /** Always surfaced - production included. */
  error(step: string, error: unknown, data?: Record<string, unknown>): void {
    console.error(`[Payment:${this.sessionId}] ERROR at ${step}`, { error, ...data });
    this.push({
      step: `ERROR:${step}`,
      data: { error: String(error), ...data },
      timestamp: Date.now(),
    });
  }

  getTrace(): DebugStep[] {
    return [...this.steps];
  }

  /** Console-friendly dump to paste into a bug report. */
  printTrace(): DebugStep[] {
    const t0 = this.steps[0]?.timestamp ?? 0;
    console.log(`[Payment] ${this.steps.length} steps, ${this.getDuration()}ms total`);
    console.table(
      this.steps.map((s) => ({
        "+ms": s.timestamp - t0,
        step: s.step,
        data: s.data ? JSON.stringify(s.data) : "",
      }))
    );
    return this.getTrace();
  }

  getDuration(): number {
    if (this.steps.length < 2) return 0;
    return this.steps[this.steps.length - 1].timestamp - this.steps[0].timestamp;
  }
}

// Singleton - components just import and use
export const paymentDebug = new PaymentDebugger();

// Exposed in EVERY build, not just dev: production is where payments fail.
if (typeof window !== "undefined") {
  (window as unknown as { __paymentDebug: PaymentDebugger }).__paymentDebug = paymentDebug;
}
