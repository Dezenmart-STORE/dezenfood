// ─── Quidax Ramp API Service ───────────────────────────────────────────────
// Base URL for all ramp endpoints
const BASE = "https://ramp-be.quidax.io/api/v1/merchants/custodial";

// ────────────── Types ──────────────────────────────────────────────────────

export interface CustomerPayload {
  email: string;
  first_name: string;
  last_name: string;
}

export interface WalletAddress {
  address: string;
  network: string;
}

// OnRamp ──────────────────────────────────────────────────────────────────

export interface InitiateOnRampPayload {
  from_currency: string;        // e.g. "ngn"
  to_currency: string;          // e.g. "usdt"
  from_amount: string;
  merchant_reference: string;
  customer: CustomerPayload;
  wallet_address: WalletAddress;
}

export interface RefreshOnRampPayload {
  from_currency: string;
  to_currency: string;
  from_amount: string;
}

// OffRamp ─────────────────────────────────────────────────────────────────

export interface InitiateOffRampPayload {
  from_currency: string;        // e.g. "usdt"
  to_currency: string;          // e.g. "ngn"
  from_amount: string;
  network: string;
  customer: CustomerPayload;
}

export interface RefreshOffRampPayload {
  from_currency: string;
  to_currency: string;
  from_amount: string;
  network: string;
}

export interface BankDetails {
  bank_code: string;
  account_number: string;
  account_name?: string;
}

// ────────────── Helpers ────────────────────────────────────────────────────

async function quidaxFetch<T>(
  method: "GET" | "POST" | "PUT",
  path: string,
  body?: object,
  authToken?: string
): Promise<T> {
  const headers: Record<string, string> = {
    accept: "application/json",
    "content-type": "application/json",
  };
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      data?.message ?? data?.error ?? `Request failed: ${res.status}`
    );
  }

  return data as T;
}

// ─── OnRamp API calls ──────────────────────────────────────────────────────

export const initiateOnRamp = (payload: InitiateOnRampPayload, token?: string) =>
  quidaxFetch("POST", "/on_ramp_transactions/initiate", payload, token);

export const refreshOnRamp = (
  merchantRef: string,
  payload: RefreshOnRampPayload,
  token?: string
) =>
  quidaxFetch(
    "PUT",
    `/on_ramp_transactions/${merchantRef}/refresh`,
    payload,
    token
  );

export const confirmOnRamp = (merchantRef: string, token?: string) =>
  quidaxFetch("POST", `/on_ramp_transactions/${merchantRef}/confirm`, undefined, token);

// ─── OffRamp API calls ─────────────────────────────────────────────────────

export const initiateOffRamp = (payload: InitiateOffRampPayload, token?: string) =>
  quidaxFetch("POST", "/off_ramp_transactions/initiate", payload, token);

export const refreshOffRamp = (
  merchantRef: string,
  payload: RefreshOffRampPayload,
  token?: string
) =>
  quidaxFetch(
    "PUT",
    `/off_ramp_transactions/${merchantRef}/refresh`,
    payload,
    token
  );

export const confirmOffRamp = (merchantRef: string, token?: string) =>
  quidaxFetch("POST", `/off_ramp_transactions/${merchantRef}/confirm`, undefined, token);

// ─── Bank verification ────────────────────────────────────────────────────

export const verifyBankAccount = (
  bankCode: string,
  accountNumber: string
): Promise<{ data: { account_name: string; account_number: string } }> =>
  fetch(
    `https://openapi.quidax.io/exchange-open-api/api/v1/banks/verify_account?bank_code=${bankCode}&account_number=${accountNumber}`,
    { headers: { accept: "application/json" } }
  ).then((r) => r.json());

// ─── Utility ──────────────────────────────────────────────────────────────

export const generateMerchantRef = () =>
  `DZM-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
