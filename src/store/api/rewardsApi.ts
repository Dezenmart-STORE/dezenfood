import { baseApi } from './baseApi';
import { unwrapList } from './unwrap';
import type { Reward, RewardSummary } from '../../utils/types';

export const rewardsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get rewards summary
    getRewardsSummary: builder.query<RewardSummary, void>({
      query: () => '/rewards/summary',
      transformResponse: (r: unknown) =>
        ((r as { data?: RewardSummary })?.data ?? r) as RewardSummary,
      providesTags: [{ type: 'Rewards', id: 'SUMMARY' }],
    }),

    // Get rewards history
    getRewards: builder.query<Reward[], void>({
      query: () => '/rewards',
      transformResponse: (r: unknown) => unwrapList<Reward>(r),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ _id }) => ({ type: 'Rewards' as const, id: _id })),
              { type: 'Rewards', id: 'LIST' },
            ]
          : [{ type: 'Rewards', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetRewardsSummaryQuery,
  useGetRewardsQuery,
} = rewardsApi;
