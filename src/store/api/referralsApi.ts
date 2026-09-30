import { baseApi } from "./baseApi";
import type { ReferralInfo } from "../../utils/types";

export const referralsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get referral info
    getReferralInfo: builder.query<ReferralInfo, void>({
      query: () => "/referral/info",
      providesTags: ["Referrals"],
    }),

    // Apply referral code
    applyReferralCode: builder.mutation<
      { success: boolean; message: string },
      string
    >({
      query: (referralCode) => ({
        url: "/referrals/apply",
        method: "POST",
        body: { referralCode },
      }),
      invalidatesTags: ["Referrals", "User"],
    }),

    // Generate referral code
    generateReferralCode: builder.mutation<ReferralInfo, void>({
      query: () => ({
        url: "/referrals/generate",
        method: "POST",
      }),
      invalidatesTags: ["Referrals", "User"],
    }),
  }),
});

export const {
  useGetReferralInfoQuery,
  useApplyReferralCodeMutation,
  useGenerateReferralCodeMutation,
} = referralsApi;
