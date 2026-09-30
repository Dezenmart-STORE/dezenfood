import { baseApi } from './baseApi';
import type {
  DeliveryAddress,
  CreateDeliveryAddressParams,
  UpdateDeliveryAddressParams,
} from '../../utils/types';

// The backend wraps responses in an envelope:
//   list      -> { status, results, total, data: { addresses: [] } }
//   single    -> { status, data: { address: {} } }
//   delete    -> { status, message }
// These helpers unwrap the envelope so components receive plain objects.
interface AddressListEnvelope {
  data?: { addresses?: DeliveryAddress[] };
}
interface AddressEnvelope {
  data?: { address: DeliveryAddress };
}

const unwrapList = (res: AddressListEnvelope): DeliveryAddress[] =>
  res?.data?.addresses ?? [];
const unwrapOne = (res: AddressEnvelope): DeliveryAddress =>
  res.data!.address;

export const deliveryAddressApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get all delivery addresses for current user
    getDeliveryAddresses: builder.query<DeliveryAddress[], void>({
      query: () => '/delivery-addresses',
      transformResponse: unwrapList,
      providesTags: (result) =>
        result
          ? [
              ...result.map((address) => ({ type: 'DeliveryAddress' as const, id: address._id })),
              { type: 'DeliveryAddress', id: 'LIST' },
            ]
          : [{ type: 'DeliveryAddress', id: 'LIST' }],
    }),

    // Get single delivery address by ID
    getDeliveryAddressById: builder.query<DeliveryAddress, string>({
      query: (addressId) => `/delivery-addresses/${addressId}`,
      transformResponse: unwrapOne,
      providesTags: (result, error, addressId) => [{ type: 'DeliveryAddress', id: addressId }],
    }),

    // Create new delivery address
    createDeliveryAddress: builder.mutation<DeliveryAddress, CreateDeliveryAddressParams>({
      query: (addressData) => ({
        url: '/delivery-addresses',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: addressData,
      }),
      transformResponse: unwrapOne,
      invalidatesTags: [{ type: 'DeliveryAddress', id: 'LIST' }],
    }),

    // Update delivery address
    updateDeliveryAddress: builder.mutation<DeliveryAddress, UpdateDeliveryAddressParams>({
      query: ({ _id, ...addressData }) => ({
        url: `/delivery-addresses/${_id}`,
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: addressData,
      }),
      transformResponse: unwrapOne,
      // Setting one address default flips isDefault on the previous default too,
      // so invalidate the whole list rather than a single id.
      invalidatesTags: [{ type: 'DeliveryAddress', id: 'LIST' }],
    }),

    // Delete delivery address
    deleteDeliveryAddress: builder.mutation<void, string>({
      query: (addressId) => ({
        url: `/delivery-addresses/${addressId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, addressId) => [
        { type: 'DeliveryAddress', id: addressId },
        { type: 'DeliveryAddress', id: 'LIST' },
      ],
    }),

    // Set an address as default.
    // The backend has no dedicated route - this is sugar over PUT /:id { isDefault: true }.
    setDefaultDeliveryAddress: builder.mutation<DeliveryAddress, string>({
      query: (addressId) => ({
        url: `/delivery-addresses/${addressId}`,
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: { isDefault: true },
      }),
      transformResponse: unwrapOne,
      invalidatesTags: [{ type: 'DeliveryAddress', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetDeliveryAddressesQuery,
  useGetDeliveryAddressByIdQuery,
  useCreateDeliveryAddressMutation,
  useUpdateDeliveryAddressMutation,
  useDeleteDeliveryAddressMutation,
  useSetDefaultDeliveryAddressMutation,
} = deliveryAddressApi;
