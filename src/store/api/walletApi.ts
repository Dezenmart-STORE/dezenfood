import { baseApi } from "./baseApi";

// ── Types (mirror the trimmed backend wallet spec) ─────────────────────────
export interface WalletStatus {
  hasWallet: boolean;
  walletAddress: string | null;
  chainId?: number;
  provider?: string;
}

export interface SetupWalletParams {
  walletAddress: string;
  chainId: number;
  provider: string;
  dynamicUserId?: string;
}

// The backend wraps everything as { status, data }.
const unwrap = <T,>(res: unknown): T => (res as { data?: T })?.data as T;

export const walletApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Whether this user already has an embedded wallet linked (drives the
    // new-user vs returning-user branch after Google auth).
    getWalletStatus: builder.query<WalletStatus, void>({
      query: () => "/wallet/status",
      transformResponse: (res) => unwrap<WalletStatus>(res),
      providesTags: ["Wallet"],
    }),

    // Link the Dynamic embedded wallet to the backend the first time it appears.
    // Idempotent server-side.
    setupWallet: builder.mutation<WalletStatus, SetupWalletParams>({
      query: (body) => ({ url: "/wallet/setup", method: "POST", body }),
      transformResponse: (res) => unwrap<WalletStatus>(res),
      invalidatesTags: ["Wallet"],
    }),
  }),
});

export const {
  useGetWalletStatusQuery,
  useLazyGetWalletStatusQuery,
  useSetupWalletMutation,
} = walletApi;
