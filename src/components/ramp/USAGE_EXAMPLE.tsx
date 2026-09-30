// ─────────────────────────────────────────────────────────────────────────────
// USAGE EXAMPLE - DezenMart Ramp System
// ─────────────────────────────────────────────────────────────────────────────

import { RampProvider, RampModal, FloatingRampButton, useRamp } from "./index";
import { FEATURES } from "../../config/brand";

// ═══════════════════════════════════════════════════════════════
// 1. ZERO CONFIG - auth user resolved automatically
//    RampProvider reads useAuth() internally. Just wrap and go.
// ═══════════════════════════════════════════════════════════════
// Publishable Quidax key. Set VITE_QUIDAX_PUBLIC_KEY in the environment
// (Vite only exposes VITE_-prefixed vars to the client).
const QUIDAX_PUBLIC_KEY = import.meta.env.VITE_QUIDAX_PUBLIC_KEY as string | undefined;

export const RampMinimalProvider = ({ children }: { children: React.ReactNode }) => (
  <RampProvider
    integrationMode="widget"
    widgetConfig={QUIDAX_PUBLIC_KEY ? { publicKey: QUIDAX_PUBLIC_KEY } : null}
  >
    {/* The crypto on/off-ramp is a wallet feature: hide it when crypto is off. */}
    {FEATURES.crypto && <RampModal />}
    {FEATURES.crypto && <FloatingRampButton label="Buy / Sell Crypto" />}
    {children}
  </RampProvider>
);
// Customer resolution order (highest → lowest):
//   openRamp(mode, customer)  ← per-call override
//   <RampProvider customer={...} />  ← provider-level override
//   useAuth().user  ← auto from your auth hook  ✓ this runs by default
//   safe placeholders ("User", "user@example.com")

// ═══════════════════════════════════════════════════════════════
// 2. Provider-level customer override (e.g. after KYC enrichment)
// ═══════════════════════════════════════════════════════════════
export const AppWithCustomer = ({ children }: { children: React.ReactNode }) => (
  <RampProvider
    integrationMode="widget"
    widgetConfig={{ publicKey: "pub_YOUR_KEY_HERE" }}
    customer={{
      // Only override what you need - auth user fills the rest
      email: "verified@dezenmart.io",
    }}
  >
    <RampModal />
    <FloatingRampButton />
    {children}
  </RampProvider>
);

// ═══════════════════════════════════════════════════════════════
// 3. Per-call override - e.g. acting on behalf of another user
// ═══════════════════════════════════════════════════════════════
export const WalletCard = () => {
  const { openRamp } = useRamp();

  return (
    <div>
      {/* No customer arg → uses auth user automatically */}
      <button onClick={() => openRamp("onramp")}>Buy Crypto</button>
      <button onClick={() => openRamp("offramp")}>Sell Crypto</button>

      {/* Partial override - only email changes, name still from auth user */}
      <button onClick={() => openRamp("onramp", { email: "promo@dezenmart.io" })}>
        Buy with promo account
      </button>

      {/* Full override */}
      <button onClick={() => openRamp("offramp", {
        email: "jane@example.com",
        first_name: "Jane",
        last_name: "Smith",
      })}>
        Sell as Jane
      </button>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// 4. Trigger from inside another modal (no FAB)
// ═══════════════════════════════════════════════════════════════
export const WithdrawModal = () => {
  const { openRamp } = useRamp();
  // customer comes from auth automatically - no need to pass it
  return (
    <div className="modal">
      <button onClick={() => openRamp("offramp")}>Withdraw to bank</button>
    </div>
  );
};

export const NoFabApp = ({ children }: { children: React.ReactNode }) => (
  <RampProvider integrationMode="widget" widgetConfig={{ publicKey: "pub_xxx" }}>
    <RampModal />
    <FloatingRampButton hidden />   {/* invisible; hook still works */}
    {children}
  </RampProvider>
);

// ═══════════════════════════════════════════════════════════════
// 5. API mode + env-based switching
// ═══════════════════════════════════════════════════════════════
const USE_WIDGET = import.meta.env.VITE_RAMP_MODE !== "api";

export const App = ({ children }: { children: React.ReactNode }) => (
  // No customer prop needed - useAuth() is called inside the provider
  <RampProvider
    integrationMode={USE_WIDGET ? "widget" : "api"}
    widgetConfig={USE_WIDGET ? { publicKey: import.meta.env.VITE_QUIDAX_PUBLIC_KEY } : undefined}
  >
    <RampModal />
    <FloatingRampButton />
    {children}
  </RampProvider>
);