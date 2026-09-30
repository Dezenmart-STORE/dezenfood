import { getReferralTag, submitReferral } from "@divvi/referral-sdk";
import { parseError } from "../utils/errors";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

export const ensure0xPrefix = (value?: string): `0x${string}` => {
  if (!value) return ZERO_ADDRESS;
  return (value.startsWith("0x") ? value : `0x${value}`) as `0x${string}`;
};

export const ensure0xPrefixStrict = (value: string): `0x${string}` => {
  if (!value) {
    throw new Error("Value cannot be empty for 0x prefix conversion.");
  }
  return (value.startsWith("0x") ? value : `0x${value}`) as `0x${string}`;
};

interface DivviTrackingData {
  transactionHash: string;
  chainId: number;
  user: string; // The user address making the transaction
  consumer?: string; // The address of the consumer making the call
  providers?: string[]; // Array of provider addresses involved in the referral
  metadata?: Record<string, any>;
}

interface ReferralTagParams {
  user: string;
  consumer?: string;
  providers?: string[];
}

export class DivviService {
  private isInitialized = false;
  private baseUrl?: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl;
    this.isInitialized = true;
  }

  //Generate referral tag to append to transaction data

  generateReferralTag(params: ReferralTagParams): string {
    try {
      if (!params.user) {
        throw new Error("User address is required for referral tag generation");
      }

      return getReferralTag({
        user: ensure0xPrefixStrict(params.user),
        consumer: ensure0xPrefix(params.consumer),
        providers: params.providers?.map((p) => ensure0xPrefixStrict(p)) || [],
      });
    } catch (error) {
      console.error("Failed to generate referral tag:", error);
      throw new Error(
        `Referral tag generation failed: ${parseError(error).message}`
      );
    }
  }

  //Submit referral data to Divvi tracking API
  async trackTransaction(
    data: DivviTrackingData
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!data.transactionHash || !data.chainId || !data.user) {
        throw new Error(
          "Transaction hash, chain ID, and user address are required"
        );
      }

      await submitReferral({
        txHash: ensure0xPrefixStrict(data.transactionHash),
        chainId: data.chainId,
        ...(this.baseUrl && { baseUrl: this.baseUrl }),
      });

      console.log("Divvi referral tracked successfully:", data.transactionHash);

      return { success: true };
    } catch (error: any) {
      console.error("Error tracking Divvi referral:", error);

      return {
        success: false,
        error: error?.message || "Failed to track referral",
      };
    }
  }

  //Extract referral code from URL parameters
  extractReferralFromUrl(): string | undefined {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get("ref") || urlParams.get("referral") || undefined;
    } catch {
      return undefined;
    }
  }

  //Generate referral link with current origin
  generateReferralLink(referralCode: string, baseUrl?: string): string {
    const url = baseUrl || window.location.origin;
    return `${url}?ref=${referralCode}`;
  }

  isReady(): boolean {
    return this.isInitialized;
  }
}

// Singleton instance
export const divviService = new DivviService(
  process.env.REACT_APP_DIVVI_BASE_URL
);
