// ─── Quidax Ramp API Service ───────────────────────────────────────────────

import { GET_CONFIRM_OFFRAMP_URL, GET_CONFIRM_ONRAMP_URL, GET_REFRESH_OFFRAMP_URL, INITIATE_OFFRAMP_URL, INITIATE_ONRAMP_URL } from "./const";

// Base URL for all ramp endpoints
// const BASE = "https://ramp-be.quidax.io/api/v1/merchants/custodial";
const BASE = "https://ramp-be.quidax.io/api/v1/merchants/custodial/ramp";

// ────────────── Types ──────────────────────────────────────────────────────

export interface CustomerPayload {
  email: string;
  first_name: string;
  last_name: string;
}

export interface WalletAddress {
  address: string;
  network: string;
  [key: string]: string;
}

// OnRamp ──────────────────────────────────────────────────────────────────


// {
//   "from_currency": "ngn",
//   "to_currency": "usdt",
//   "from_amount": "5000",
//   "customer": {
//     "email": "user@example.com",
//     "name": "string"
//   },
//   "wallet_address": {
//     "usdt": "0xabc..."
//   }
// }
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

async function apiFetch<T>(
  method: "GET" | "POST" | "PUT",
  path: string,
  body?: object,
  authToken?: string
): Promise<T> {
  const headers: Record<string, string> = {
    accept: "application/json",
    "content-type": "application/json",
  };

  // let c =process.env.VITE_API_URL??"fhfhf"
  // console.log(c)
     authToken = authToken||  (localStorage.getItem('auth_token')??undefined);
    
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
// 0xdB055877e6c13b6A6B25aBcAA29B393777dD0a73
let baseUrl = import.meta.env.VITE_API_URL
  const res = await fetch(`${baseUrl}/ramp${path}`, {
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
  apiFetch("POST", INITIATE_ONRAMP_URL, payload, token);

export const refreshOnRamp = (
  merchantRef: string,
  payload: RefreshOnRampPayload,
  token?: string
) =>
  apiFetch(
    "PUT",
   GET_CONFIRM_ONRAMP_URL(merchantRef),
    payload,
    token
  );

export const confirmOnRamp = (merchantRef: string, token?: string) =>{
let url = GET_CONFIRM_ONRAMP_URL(merchantRef);
return apiFetch("POST", url, undefined, token);
}

// ─── OffRamp API calls ─────────────────────────────────────────────────────

export const initiateOffRamp = (payload: InitiateOffRampPayload, token?: string) =>
  apiFetch("POST", INITIATE_OFFRAMP_URL, payload, token);

export const refreshOffRamp = (
  merchantRef: string,
  payload: RefreshOffRampPayload,
  token?: string
) =>
  apiFetch(
    "PUT",
    // `/off_ramp_transactions/${merchantRef}/refresh`,
    GET_REFRESH_OFFRAMP_URL(merchantRef),
    payload,
    token
  );

export const confirmOffRamp = (merchantRef: string, token?: string) =>
  apiFetch("POST", GET_CONFIRM_OFFRAMP_URL(merchantRef), undefined, token);

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
