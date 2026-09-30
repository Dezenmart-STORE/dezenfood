import { useParams, useNavigate } from "react-router-dom";
import { useGetProductByIdQuery } from "../store/api";
import Checkout from "../components/trade/Checkout";

const SellCheckout = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();

  const {
    data: product,
    isLoading,
    error,
  } = useGetProductByIdQuery(productId!, { skip: !productId });

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
          <h2 className="text-xl font-bold text-gray-900">Not Listed Yet</h2>
          <p className="mt-2 text-sm text-gray-500">
            This product hasn't been listed on-chain yet.
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

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <Checkout
        mode="sell"
        product={{
          id: product._id,
          name: product.name,
          price: product.price,
          image: product.images?.[0],
          tradeId: product.tradeId,
          tokenSymbol: product.paymentToken || "USDm",
        }}
        logisticsOptions={[]}
        onSuccess={() => {
          navigate("/trades/viewtrades");
        }}
        onBack={() => navigate(-1)}
      />
    </div>
  );
};

export default SellCheckout;
