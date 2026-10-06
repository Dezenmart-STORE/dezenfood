import { baseApi } from './baseApi';
import { unwrapList } from './unwrap';
import type { Order, OrderStatus, CreateOrderParams, CreateFoodOrderParams } from '../../utils/types';
import type { VendorOrderAction } from '../../utils/orderFlow';

/** { data: { order } } -> order (also tolerates { order } or a bare order). */
const unwrapOrder = (res: unknown): Order => {
  const r = res as { data?: { order?: Order }; order?: Order };
  return (r?.data?.order ?? r?.order ?? r) as Order;
};

const toOrders = (response: unknown): Order[] =>
  unwrapList<Order>(response).filter((order) => order && order.product !== null);

export const ordersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get user orders (buyer or seller)
    getUserOrders: builder.query<Order[], { type: 'buyer' | 'seller' }>({
      query: ({ type }) => `/orders?type=${type}`,
      transformResponse: toOrders,
      providesTags: (result, error, { type }) =>
        result
          ? [
              ...result.map(({ _id }) => ({ type: 'Orders' as const, id: _id })),
              { type: 'Orders', id: type.toUpperCase() },
            ]
          : [{ type: 'Orders', id: type.toUpperCase() }],
    }),

    // Get all orders
    getOrders: builder.query<Order[], void>({
      query: () => '/orders',
      transformResponse: toOrders,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ _id }) => ({ type: 'Orders' as const, id: _id })),
              { type: 'Orders', id: 'LIST' },
            ]
          : [{ type: 'Orders', id: 'LIST' }],
    }),

    // Get order by ID. Response is enveloped as { data: { order } }.
    getOrderById: builder.query<Order, string>({
      query: (orderId) => `/orders/${orderId}`,
      transformResponse: (res: unknown): Order => {
        const r = res as { data?: { order?: Order }; order?: Order };
        return (r?.data?.order ?? r?.order ?? r) as Order;
      },
      providesTags: (result, error, orderId) => [{ type: 'Order', id: orderId }],
    }),

    // Create order. Response is enveloped as { data: { order } }, so unwrap to
    // the order itself (callers read order._id).
    createOrder: builder.mutation<Order, CreateOrderParams>({
      query: (orderData) => ({
        url: '/orders',
        method: 'POST',
        body: orderData,
      }),
      transformResponse: (res: unknown): Order => {
        const r = res as { data?: { order?: Order }; order?: Order };
        return (r?.data?.order ?? r?.order ?? r) as Order;
      },
      invalidatesTags: [
        { type: 'Orders', id: 'LIST' },
        { type: 'Orders', id: 'BUYER' },
      ],
    }),

    // Food order: several items from one vendor. Server prices everything.
    createFoodOrder: builder.mutation<Order, CreateFoodOrderParams>({
      query: (orderData) => ({
        url: '/orders',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: orderData,
      }),
      transformResponse: (res: unknown): Order => {
        const r = res as { data?: { order?: Order }; order?: Order };
        return (r?.data?.order ?? r?.order ?? r) as Order;
      },
      invalidatesTags: [
        { type: 'Orders', id: 'LIST' },
        { type: 'Orders', id: 'BUYER' },
      ],
    }),

    // Vendor moves a paid food order forward. The backend enforces who may do
    // which transition; the browser only asks.
    advanceFoodOrder: builder.mutation<
      Order,
      { orderId: string; action: VendorOrderAction; reason?: string; prepTimeMinutes?: number }
    >({
      query: ({ orderId, ...body }) => ({
        url: `/orders/${orderId}/vendor-action`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      }),
      transformResponse: unwrapOrder,
      invalidatesTags: (_r, _e, { orderId }) => [
        { type: 'Order', id: orderId },
        { type: 'Orders', id: 'SELLER' },
        { type: 'Orders', id: 'LIST' },
      ],
    }),

    // Buyer confirms receipt. Escrow-provider orders need the release OTP the
    // provider sent; on-chain orders confirm via the contract instead.
    confirmFiatDelivery: builder.mutation<Order, { orderId: string; otp?: string }>({
      query: ({ orderId, otp }) => ({
        url: `/orders/${orderId}/confirm-delivery`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: otp ? { otp } : {},
      }),
      transformResponse: unwrapOrder,
      invalidatesTags: (_r, _e, { orderId }) => [
        { type: 'Order', id: orderId },
        { type: 'Orders', id: 'BUYER' },
        { type: 'Orders', id: 'LIST' },
      ],
    }),

    // Buyer cancels before the vendor has accepted; backend refunds the payment.
    cancelOrder: builder.mutation<Order, { orderId: string; reason?: string }>({
      query: ({ orderId, reason }) => ({
        url: `/orders/${orderId}/cancel`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: reason ? { reason } : {},
      }),
      transformResponse: unwrapOrder,
      invalidatesTags: (_r, _e, { orderId }) => [
        { type: 'Order', id: orderId },
        { type: 'Orders', id: 'BUYER' },
        { type: 'Orders', id: 'LIST' },
      ],
    }),

    // Where to send a refund (rejected / cancelled / disputed orders). The
    // backend verifies the account and pays it out; it never trusts a name.
    submitRefundAccount: builder.mutation<Order, { orderId: string; bankCode: string; accountNumber: string }>({
      query: ({ orderId, ...body }) => ({
        url: `/orders/${orderId}/refund-account`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      }),
      transformResponse: unwrapOrder,
      invalidatesTags: (_r, _e, { orderId }) => [
        { type: 'Order', id: orderId },
        { type: 'Orders', id: 'BUYER' },
        { type: 'Orders', id: 'LIST' },
      ],
    }),

    resendReleaseOtp: builder.mutation<{ sent: boolean }, string>({
      query: (orderId) => ({
        url: `/orders/${orderId}/release-otp/resend`,
        method: 'POST',
      }),
    }),

    // Update order status
    updateOrderStatus: builder.mutation<
      Order,
      { orderId: string; details: { purchaseId?: string; status?: OrderStatus; [key: string]: any } }
    >({
      query: ({ orderId, details }) => ({
        url: `/orders/${orderId}`,
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: details,
      }),
      transformResponse: unwrapOrder,
      invalidatesTags: (result, error, { orderId }) => [
        { type: 'Order', id: orderId },
        { type: 'Orders', id: 'LIST' },
        { type: 'Orders', id: 'BUYER' },
        { type: 'Orders', id: 'SELLER' },
      ],
    }),

    // Raise dispute
    raiseDispute: builder.mutation<Order, { orderId: string; reason: string; screenshotUrl?: string }>({
      query: ({ orderId, reason, screenshotUrl }) => ({
        url: `/orders/${orderId}/dispute`,
        method: 'POST',
        body: screenshotUrl ? { reason, screenshotUrl } : { reason },
      }),
      transformResponse: unwrapOrder,
      invalidatesTags: (result, error, { orderId }) => [
        { type: 'Order', id: orderId },
        { type: 'Orders', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useGetUserOrdersQuery,
  useGetOrdersQuery,
  useGetOrderByIdQuery,
  useCreateOrderMutation,
  useCreateFoodOrderMutation,
  useAdvanceFoodOrderMutation,
  useConfirmFiatDeliveryMutation,
  useResendReleaseOtpMutation,
  useCancelOrderMutation,
  useSubmitRefundAccountMutation,
  useUpdateOrderStatusMutation,
  useRaiseDisputeMutation,
} = ordersApi;
