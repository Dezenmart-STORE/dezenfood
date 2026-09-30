import { baseApi } from "./baseApi";
import type { Product } from "../../utils/types";

export const productsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get all products
    getProducts: builder.query<Product[], void>({
      query: () => "/products",
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ _id }) => ({
                type: "Products" as const,
                id: _id,
              })),
              { type: "Products", id: "LIST" },
            ]
          : [{ type: "Products", id: "LIST" }],
    }),

    // Get product by ID
    getProductById: builder.query<Product, string>({
      query: (id) => `/products/${id}`,
      providesTags: (result, error, id) => [{ type: "Product", id }],
    }),

    // Get products by category
    // Uses category query param so each category has its own cache entry.
    // transformResponse acts as a safety net if the backend ignores the param.
    getProductsByCategory: builder.query<Product[], string>({
      query: (category) =>
        `/products?category=${encodeURIComponent(category)}`,
      transformResponse: (response: Product[], meta, category) =>
        response.filter(
          (product) =>
            product.category?.toLowerCase() === category.toLowerCase()
        ),
      providesTags: (result, error, category) =>
        result
          ? [
              ...result.map(({ _id }) => ({
                type: "Products" as const,
                id: _id,
              })),
              { type: "Products", id: `CATEGORY-${category.toLowerCase()}` },
            ]
          : [{ type: "Products", id: `CATEGORY-${category.toLowerCase()}` }],
    }),

    // Get products by seller
    getProductsBySeller: builder.query<Product[], string>({
      query: (sellerId) => `/products/seller/${sellerId}`,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ _id }) => ({
                type: "Products" as const,
                id: _id,
              })),
              { type: "Products", id: "SELLER" },
            ]
          : [{ type: "Products", id: "SELLER" }],
    }),

    // Search products
    searchProducts: builder.query<Product[], string>({
      query: (searchTerm) =>
        `/products/search?q=${encodeURIComponent(searchTerm)}`,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ _id }) => ({
                type: "Products" as const,
                id: _id,
              })),
              { type: "Products", id: "SEARCH" },
            ]
          : [{ type: "Products", id: "SEARCH" }],
    }),

    // Get sponsored products
    getSponsoredProducts: builder.query<Product[], void>({
      query: () => "/products/sponsored",
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ _id }) => ({
                type: "Products" as const,
                id: _id,
              })),
              { type: "Products", id: "SPONSORED" },
            ]
          : [{ type: "Products", id: "SPONSORED" }],
    }),

    // Create product
    createProduct: builder.mutation<Product, FormData>({
      query: (formData) => ({
        url: "/products",
        method: "POST",
        body: formData,
      }),
      invalidatesTags: [{ type: "Products", id: "LIST" }],
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        // Optimistically prepend a placeholder to the list
        const placeholder: Product = {
          _id: "opt-new",
          name: "New listing…",
          price: 0,
          currency: "USDm",
          category: "",
          description: "",
          quantity: 1,
          images: [],
          seller: { _id: "", name: "" } as any,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as unknown as Product;

        const patchResult = dispatch(
          productsApi.util.updateQueryData("getProducts", undefined, (draft) => {
            draft.unshift(placeholder);
          })
        );

        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
    }),

    // Update product
    updateProduct: builder.mutation<Product, { id: string; data: FormData }>({
      query: ({ id, data }) => ({
        url: `/products/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Product", id },
        { type: "Products", id: "LIST" },
      ],
      async onQueryStarted({ id, data }, { dispatch, queryFulfilled }) {
        // Optimistically patch the single-product cache entry with form fields
        const updates: Partial<Product> = {};
        const name = data.get("name");
        const price = data.get("price");
        const description = data.get("description");
        if (name) updates.name = name as string;
        if (price) updates.price = parseFloat(price as string);
        if (description) updates.description = description as string;

        const patchResult = dispatch(
          productsApi.util.updateQueryData("getProductById", id, (draft) => {
            Object.assign(draft, updates);
          })
        );

        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
    }),

    // Delete product
    deleteProduct: builder.mutation<void, string>({
      query: (id) => ({
        url: `/products/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, id) => [
        { type: "Product", id },
        { type: "Products", id: "LIST" },
      ],
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        // Optimistically remove from the list cache
        const patchResult = dispatch(
          productsApi.util.updateQueryData("getProducts", undefined, (draft) => {
            const idx = draft.findIndex((p) => p._id === id);
            if (idx !== -1) draft.splice(idx, 1);
          })
        );

        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
    }),
  }),
});

export const {
  useGetProductsQuery,
  useGetProductByIdQuery,
  useGetProductsByCategoryQuery,
  useGetProductsBySellerQuery,
  useSearchProductsQuery,
  useGetSponsoredProductsQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
} = productsApi;
