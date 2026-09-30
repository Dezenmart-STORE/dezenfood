import { baseApi } from "./baseApi";
import type { LegalDocument, LegalDocType } from "../../utils/types";

// GET /terms/current and GET /terms/:id both return { data: { terms } }.
interface TermsEnvelope {
  data?: { terms?: LegalDocument };
}

export const termsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // The active legal document for a content type (terms/privacy/cookie).
    // Legal text changes rarely, so cache it for the session; the tag lets a
    // future publish invalidate it without a reload.
    getCurrentTerms: builder.query<LegalDocument | null, LegalDocType>({
      query: (type) => `/terms/current?type=${encodeURIComponent(type)}`,
      transformResponse: (res: TermsEnvelope) => res?.data?.terms ?? null,
      keepUnusedDataFor: 3600,
      providesTags: (_res, _err, type) => [{ type: "Legal", id: type }],
    }),

    // A specific version by id (e.g. to show exactly what a user accepted).
    getTermsById: builder.query<LegalDocument | null, string>({
      query: (id) => `/terms/${id}`,
      transformResponse: (res: TermsEnvelope) => res?.data?.terms ?? null,
      keepUnusedDataFor: 3600,
      providesTags: (_res, _err, id) => [{ type: "Legal", id }],
    }),
  }),
});

export const { useGetCurrentTermsQuery, useGetTermsByIdQuery } = termsApi;
