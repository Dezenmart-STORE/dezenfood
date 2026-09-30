import { useParams, useNavigate } from "react-router-dom";
import { useGetProductByIdQuery } from "../store/api";
import { useGetLogisticsProvidersQuery } from "../store/api";
import Checkout from "../components/trade/Checkout";
import { DEFAULT_LOGISTICS_PROVIDER } from "../config/chains";

const BuyCheckout = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();

  const {
    data: product,
    isLoading,
    error,
  } = useGetProductByIdQuery(productId!, { skip: !productId });

  const { data: logisticsProviders = [] } = useGetLogisticsProvidersQuery();

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-3 border-gray-200 border-t-red-600" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <div className="rounded-2xl bg-white p-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <svg className="h-8 w-8 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.072 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900">Product Not Found</h2>
          <p className="mt-2 text-sm text-gray-500">
            We couldn't load this product. It may have been removed or the link is incorrect.
          </p>
          <button
            onClick={() => navigate(-1)}
            className="mt-6 w-full rounded-xl bg-gray-900 py-3 text-sm font-bold text-white hover:bg-gray-800"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!product.tradeId) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <div className="rounded-2xl bg-white p-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
            <svg className="h-8 w-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.072 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900">Not Available for Purchase</h2>
          <p className="mt-2 text-sm text-gray-500">
            This product hasn't been listed on the marketplace yet. Please check back later.
          </p>
          <button
            onClick={() => navigate(-1)}
            className="mt-6 w-full rounded-xl bg-gray-900 py-3 text-sm font-bold text-white hover:bg-gray-800"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Map logistics providers to the format Checkout expects
  const logisticsOptions = logisticsProviders
    .filter((lp) => lp.isActive)
    .map((lp) => ({
      provider: lp.walletAddress as `0x${string}`,
      name: lp.name,
      cost: 0, // Will come from contract/API - zero for now
      costRaw: "0",
    }));

  // Also map any product-level logistics costs if available
  const productLogisticsOptions =
    product.logisticsProviders?.length > 0
      ? product.logisticsProviders.map((addr, i) => ({
          provider: addr as `0x${string}`,
          name: `Delivery Option ${i + 1}`,
          cost: product.logisticsCost?.[i]
            ? parseFloat(product.logisticsCost[i])
            : 0.1,
          costRaw: product.logisticsCost?.[i] ?? "0.1",
        }))
      : logisticsOptions.length > 0
      ? logisticsOptions
      : [
          {
            provider: DEFAULT_LOGISTICS_PROVIDER,
            name: "Standard Delivery",
            cost: 0.1,
            costRaw: "0.1",
          },
        ];

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <Checkout
        mode="buy"
        product={{
          id: product._id,
          name: product.name,
          price: product.price,
          image: product.images?.[0],
          tradeId: product.tradeId!,
          tokenSymbol: product.paymentToken || "USDm",
        }}
        logisticsOptions={productLogisticsOptions}
        onSuccess={(txHash, purchaseId) => {
          const tradeRef = purchaseId ?? product.tradeId ?? product._id;
          navigate(
            `/trades/viewtrades/${tradeRef}?status=pending&tx=${txHash}${
              purchaseId ? `&purchaseId=${purchaseId}` : ""
            }`
          );
        }}
        onBack={() => navigate(-1)}
      />
    </div>
  );
};

export default BuyCheckout;
