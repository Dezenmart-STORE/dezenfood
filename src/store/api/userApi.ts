import { baseApi } from './baseApi';
import type { UserProfile } from '../../utils/types';

interface TermsStatusResponse {
  hasAcceptedTerms: boolean;
}

interface SelfVerificationData {
  proof: {
    pi_a: string[];
    pi_b: string[][];
    pi_c: string[];
    protocol: string;
    curve: string;
  };
  publicSignals: string[];
}

interface SelfVerificationStatusResponse {
  isVerified: boolean;
  verifiedAt?: string;
}

export const userApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get current user profile
    getUserProfile: builder.query<UserProfile, void>({
      query: () => '/users/profile',
      providesTags: ['User'],
    }),

    // Get user by ID
    getUserById: builder.query<UserProfile, string>({
      query: (userId) => `/users/${userId}`,
      providesTags: (result, error, userId) => [{ type: 'User', id: userId }],
    }),

    // Get user by email
    getUserByEmail: builder.query<UserProfile, string>({
      query: (email) => `/users/email/${email}`,
      providesTags: (result, error, email) => [{ type: 'User', id: email }],
    }),

    // Get all users (admin only)
    getAllUsers: builder.query<UserProfile[], void>({
      query: () => '/users',
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ _id }) => ({ type: 'User' as const, id: _id })),
              { type: 'User', id: 'LIST' },
            ]
          : [{ type: 'User', id: 'LIST' }],
    }),

    // Update user profile
    updateUserProfile: builder.mutation<UserProfile, FormData>({
      query: (formData) => ({
        url: '/users/profile',
        method: 'PUT',
        body: formData,
      }),
      invalidatesTags: ['User'],
    }),

    // Delete user profile
    deleteUserProfile: builder.mutation<void, string>({
      query: (userId) => ({
        url: `/users/${userId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, userId) => [
        { type: 'User', id: userId },
        { type: 'User', id: 'LIST' },
      ],
    }),

    // Accept terms and conditions
    acceptTerms: builder.mutation<{ data: { user: UserProfile } }, void>({
      query: () => ({
        url: '/users/accept-terms',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }),
      invalidatesTags: ['User'],
    }),

    // Get terms acceptance status
    getTermsStatus: builder.query<TermsStatusResponse, void>({
      query: () => '/users/terms-status',
      providesTags: ['User'],
    }),

    // Verify Self identity (zkSNARK proof)
    verifySelfIdentity: builder.mutation<UserProfile, SelfVerificationData>({
      query: (verificationData) => ({
        url: '/users/verify-self',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: verificationData,
      }),
      invalidatesTags: ['User'],
    }),

    // Get Self verification status
    getSelfVerificationStatus: builder.query<SelfVerificationStatusResponse, void>({
      query: () => '/users/self/status',
      providesTags: ['User'],
    }),

    // Revoke Self verification
    revokeSelfVerification: builder.mutation<void, void>({
      query: () => ({
        url: '/users/self/revoke',
        method: 'DELETE',
      }),
      invalidatesTags: ['User'],
    }),
  }),
});

export const {
  useGetUserProfileQuery,
  useGetUserByIdQuery,
  useGetUserByEmailQuery,
  useGetAllUsersQuery,
  useUpdateUserProfileMutation,
  useDeleteUserProfileMutation,
  useAcceptTermsMutation,
  useGetTermsStatusQuery,
  useVerifySelfIdentityMutation,
  useGetSelfVerificationStatusQuery,
  useRevokeSelfVerificationMutation,
} = userApi;
