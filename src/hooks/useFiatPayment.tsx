import { useCallback, useEffect, useReducer, useRef } from "react";
import {
  useInitializeFiatPaymentMutation,
  useLazyGetPaymentStatusQuery,
  type FiatProvider,
  type InitializeFiatPaymentResult,
  type PaymentStatusResult,
} from "../store/api/paymentsApi";
import { getErrorMessage } from "../utils/errors";

/**
 * Fiat payment state machine. It never decides a payment succeeded on its own:
 * "success" is only reached when the backend reports a status it verified with
 * the provider (charge webhook / verify call).
 *
 *   idle -> initializing -> (redirecting | awaiting-transfer) -> verifying -> success
 *                                                                     ↘ failed / expired
 */
export type FiatPaymentStep =
  | "idle"
  | "initializing"
  | "redirecting" // sending the buyer to the provider's hosted page
  | "awaiting-transfer" // virtual account shown; waiting for the bank transfer
  | "verifying" // polling the backend for the verified result
  | "success"
  | "error";

export const PENDING_PAYMENT_KEY = "dezenfoods_pending_payment";
const POLL_MS = 4000;
const POLL_MAX_MS = 10 * 60 * 1000;

interface State {
  step: FiatPaymentStep;
  error: string | null;
  session: InitializeFiatPaymentResult | null;
}

type Action =
  | { type: "INIT" }
  | { type: "SESSION"; session: InitializeFiatPaymentResult; step: "redirecting" | "awaiting-transfer" }
  | { type: "VERIFYING" }
  | { type: "SUCCESS" }
  | { type: "ERROR"; error: string }
  | { type: "RESET" };

const initialState: State = { step: "idle", error: null, session: null };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "INIT":
      return { ...initialState, step: "initializing" };
    case "SESSION":
      return { step: action.step, error: null, session: action.session };
    case "VERIFYING":
      return { ...state, step: "verifying", error: null };
    case "SUCCESS":
      return { ...state, step: "success", error: null };
    case "ERROR":
      return { ...state, step: "error", error: action.error };
    case "RESET":
      return initialState;
  }
}

/** Only ever send the buyer to an http(s) page the backend handed us. */
export function isSafeCheckoutUrl(url: string | undefined): url is string {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.protocol === "https:" || (import.meta.env.DEV && u.protocol === "http:");
  } catch {
    return false;
  }
}

export function useFiatPayment() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [initialize] = useInitializeFiatPaymentMutation();
  const [fetchStatus] = useLazyGetPaymentStatusQuery();
  const pollTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const stopped = useRef(false);

  useEffect(() => {
    stopped.current = false;
    return () => {
      stopped.current = true;
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, []);

  const reset = useCallback(() => {
    if (pollTimer.current) clearTimeout(pollTimer.current);
    dispatch({ type: "RESET" });
  }, []);

  /** Poll the backend until it reports a final, provider-verified status. */
  const pollUntilSettled = useCallback(
    (reference: string, onSettled?: (r: PaymentStatusResult) => void) => {
      const startedAt = Date.now();
      const tick = async () => {
        if (stopped.current) return;
        const res = await fetchStatus(reference, false);
        if (stopped.current) return;
        const data = res.data;
        if (data?.status === "success") {
          try { sessionStorage.removeItem(PENDING_PAYMENT_KEY); } catch { /* noop */ }
          dispatch({ type: "SUCCESS" });
          onSettled?.(data);
          return;
        }
        if (data?.status === "failed" || data?.status === "expired") {
          dispatch({
            type: "ERROR",
            error:
              data.status === "expired"
                ? "This payment expired before it was completed."
                : "The payment was not successful. You have not been charged.",
          });
          onSettled?.(data);
          return;
        }
        if (Date.now() - startedAt > POLL_MAX_MS) {
          dispatch({
            type: "ERROR",
            error: "We haven't received confirmation yet. If money left your account it will be applied to your order automatically - check your order in a few minutes.",
          });
          return;
        }
        pollTimer.current = setTimeout(tick, POLL_MS);
      };
      dispatch({ type: "VERIFYING" });
      void tick();
    },
    [fetchStatus],
  );

  const startFiatPayment = useCallback(
    async (params: { orderId: string; provider: FiatProvider; email: string }) => {
      dispatch({ type: "INIT" });
      try {
        const returnUrl = `${window.location.origin}/payment/callback?orderId=${encodeURIComponent(params.orderId)}`;
        const session = await initialize({ ...params, returnUrl }).unwrap();

        try {
          sessionStorage.setItem(
            PENDING_PAYMENT_KEY,
            JSON.stringify({ reference: session.reference, orderId: params.orderId }),
          );
        } catch { /* storage blocked - the callback URL still carries the order id */ }

        if (session.virtualAccount?.accountNumber) {
          dispatch({ type: "SESSION", session, step: "awaiting-transfer" });
          pollUntilSettled(session.reference);
          return;
        }
        if (!isSafeCheckoutUrl(session.checkoutUrl)) {
          dispatch({ type: "ERROR", error: "We couldn't open the payment page. Please try again." });
          return;
        }
        dispatch({ type: "SESSION", session, step: "redirecting" });
        window.location.assign(session.checkoutUrl);
      } catch (err) {
        dispatch({ type: "ERROR", error: getErrorMessage(err) || "Could not start payment. Please try again." });
      }
    },
    [initialize, pollUntilSettled],
  );

  return { state, startFiatPayment, pollUntilSettled, reset };
}
