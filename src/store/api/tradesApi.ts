import { baseApi } from './baseApi';
import type { CreateTradeParams, TradeResponse, Order } from '../../utils/types/index';

interface LogisticsProvider {
  _id: string;
  name: string;
  walletAddress: string;
  isActive: boolean;
}

export const tradesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get trade by ID
    getTradeById: builder.query<TradeResponse, string>({
      query: (tradeId) => `/contracts/trades/${tradeId}`,
      providesTags: (result, error, tradeId) => [{ type: 'Trade', id: tradeId }],
    }),

    // Get trades by seller
    getTradesBySeller: builder.query<Order[], void>({
      query: () => '/contracts/trades/seller/list',
      providesTags: (result) =>
        result
          ? [
              ...result.map((trade) => ({ type: 'Trade' as const, id: trade._id })),
              { type: 'Trades', id: 'SELLER' },
            ]
          : [{ type: 'Trades', id: 'SELLER' }],
    }),

    // Get trades by buyer
    getTradesByBuyer: builder.query<Order[], void>({
      query: () => '/contracts/trades/buyer/list',
      providesTags: (result) =>
        result
          ? [
              ...result.map((trade) => ({ type: 'Trade' as const, id: trade._id })),
              { type: 'Trades', id: 'BUYER' },
            ]
          : [{ type: 'Trades', id: 'BUYER' }],
    }),

    // Create trade
    createTrade: builder.mutation<TradeResponse, CreateTradeParams>({
      query: (tradeData) => ({
        url: '/contracts/trades',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: tradeData,
      }),
      invalidatesTags: [
        { type: 'Trades', id: 'SELLER' },
        { type: 'Trades', id: 'BUYER' },
      ],
    }),

    // Buy trade
    buyTrade: builder.mutation<
      TradeResponse,
      { tradeId: string; data: { quantity: number; logisticsProvider: string; logisticsCost: string } }
    >({
      query: ({ tradeId, data }) => ({
        url: `/contracts/trades/${tradeId}/buy`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: data,
      }),
      invalidatesTags: (result, error, { tradeId }) => [
        { type: 'Trade', id: tradeId },
        { type: 'Trades', id: 'BUYER' },
      ],
    }),

    // Confirm delivery
    confirmDelivery: builder.mutation<TradeResponse, string>({
      query: (tradeId) => ({
        url: `/trades/${tradeId}/confirm-delivery`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, tradeId) => [
        { type: 'Trade', id: tradeId },
        { type: 'Trades', id: 'BUYER' },
        { type: 'Trades', id: 'SELLER' },
      ],
    }),

    // Get logistics providers
    getLogisticsProviders: builder.query<LogisticsProvider[], void>({
      query: () => '/logistics',
      providesTags: ['Logistics'],
    }),

    // Get logistics provider details
    getLogisticsDetails: builder.query<LogisticsProvider, string>({
      query: (logisticsId) => `/logistics/${logisticsId}`,
      providesTags: (result, error, logisticsId) => [
        { type: 'Logistics', id: logisticsId },
      ],
    }),

    // Register logistics provider (admin only)
    registerLogisticsProvider: builder.mutation<LogisticsProvider, { providerAddress: string }>({
      query: (data) => ({
        url: '/contracts/admin/register-logistics',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: data,
      }),
      invalidatesTags: ['Logistics'],
    }),
  }),
});

export const {
  useGetTradeByIdQuery,
  useGetTradesBySellerQuery,
  useGetTradesByBuyerQuery,
  useCreateTradeMutation,
  useBuyTradeMutation,
  useConfirmDeliveryMutation,
  useGetLogisticsProvidersQuery,
  useGetLogisticsDetailsQuery,
  useRegisterLogisticsProviderMutation,
} = tradesApi;
