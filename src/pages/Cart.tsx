import { useCallback, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaMinus, FaPlus, FaTrash } from "react-icons/fa";
import Container from "../components/common/Container";
import DeliveryAddressSelector from "../components/product/singleProduct/DeliveryAddressSelector";
import LogisticsProviderSelector from "../components/product/singleProduct/LogisticsProviderSelector";
import { useAppDispatch, useAppSelector } from "../hooks/redux";
import {
  clearCart,
  lineKey,
  removeFromCart,
  selectCartSubtotal,
  selectCartWeight,
  setNote,
  setQuantity,
} from "../store/slices/cartSlice";
import { useCreateFoodOrderMutation } from "../store/api";
import { useAuth } from "../context/AuthContext";
import { useSEO } from "../hooks/useSEO";
import { formatNaira, FULFILMENT_MODES, type FulfilmentMode } from "../utils/food";
import { getErrorMessage } from "../utils/errors";
import type {
  AvailableProvider,
  DeliveryAddress,
  Product,
} from "../utils/types";

/**
 * Cart + checkout in one screen. The cart is a single vendor's items; the
 * numbers here are an estimate. The backend re-prices every line and adds fees
 * when the order is created, and the payment page shows the authoritative total.
 */
export default function Cart() {
  useSEO({ title: "Your Cart", description: "Review your order.", noindex: true });
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isAuthenticated } = useAuth();
  const { vendor, items } = useAppSelector((s) => s.cart);
  const subtotal = useAppSelector(selectCartSubtotal);
  const totalWeight = useAppSelector(selectCartWeight);
  const [createFoodOrder, { isLoading }] = useCreateFoodOrderMutation();

  // Only modes every item supports are offered.
  const modes = useMemo<FulfilmentMode[]>(() => {
    if (items.length === 0) return ["delivery"];
    return FULFILMENT_MODES.map((m) => m.id).filter((id) => items.every((i) => i.fulfilment.includes(id)));
  }, [items]);
  const [chosenMode, setChosenMode] = useState<FulfilmentMode>("delivery");
  const fulfilment: FulfilmentMode = modes.includes(chosenMode) ? chosenMode : (modes[0] ?? "delivery");

  const [address, setAddress] = useState<DeliveryAddress | null>(null);
  const [logistics, setLogistics] = useState<AvailableProvider | null>(null);
  const [buyerNote, setBuyerNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleAddress = useCallback((a: DeliveryAddress) => {
    setAddress(a);
    setLogistics(null);
  }, []);
  const handleProvider = useCallback((p: AvailableProvider) => setLogistics(p), []);

  // The selector only needs origin + total weight to quote a route.
  const quoteProduct = useMemo(
    () => ({ state: vendor?.state ?? "", lga: vendor?.lga ?? "", weight: totalWeight || 0.5 }) as unknown as Product,
    [vendor?.state, vendor?.lga, totalWeight],
  );

  const deliveryEstimate = fulfilment === "delivery" ? (logistics?.cost ?? 0) : 0;
  const estimatedTotal = subtotal + deliveryEstimate;

  const placeOrder = async () => {
    setError(null);
    if (!isAuthenticated) return navigate("/login");
    if (fulfilment === "delivery" && (!address || !logistics?.quoteId)) {
      setError("Choose a delivery address and delivery option.");
      return;
    }
    try {
      const order = await createFoodOrder({
        vertical: "food",
        items: items.map((i) => ({
          product: i.productId,
          quantity: i.quantity,
          variantIndex: i.variantIndex,
          note: i.note?.trim() || undefined,
        })),
        fulfilment,
        ...(fulfilment === "delivery" && address && logistics
          ? {
              quoteId: logistics.quoteId,
              deliveryAddress: {
                label: address.label,
                fullName: address.fullName,
                phone: address.phone,
                country: address.country,
                state: address.state,
                lga: address.lga,
                street: address.street,
                zipCode: address.zipCode,
                isDefault: address.isDefault,
              },
            }
          : {}),
        buyerNote: buyerNote.trim() || undefined,
      }).unwrap();
      if (!order?._id) throw new Error("Order creation failed");
      // The order now exists on the backend (awaiting payment), so the cart's job is done.
      dispatch(clearCart());
      navigate(`/orders/${order._id}`);
    } catch (e) {
      setError(getErrorMessage(e) || "We couldn't place your order. Please try again.");
    }
  };

  if (items.length === 0) {
    return (
      <div className="bg-Dark min-h-[70vh]">
        <Container className="py-16 text-center">
          <div className="text-5xl">🛒</div>
          <h1 className="mt-4 text-xl font-bold text-white">Your cart is empty</h1>
          <p className="mt-2 text-sm text-gray-400">Find something delicious and add it here.</p>
          <Link to="/product" className="mt-6 inline-block rounded-xl bg-brand px-6 py-3 text-sm font-bold text-white hover:bg-brand-hover">
            Browse food
          </Link>
        </Container>
      </div>
    );
  }

  return (
    <div className="bg-Dark min-h-screen">
      <Container className="max-w-2xl py-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">Your cart</h1>
          <button onClick={() => dispatch(clearCart())} className="text-xs text-gray-400 hover:text-red-400">
            Clear cart
          </button>
        </div>
        {vendor && (
          <p className="mt-1 text-sm text-gray-400">
            From{" "}
            <Link to={`/vendors/${vendor.id}`} className="text-brand hover:underline">
              {vendor.name}
            </Link>
          </p>
        )}

        <ul className="mt-4 space-y-3">
          {items.map((i) => {
            const key = lineKey(i);
            return (
              <li key={key} className="rounded-2xl bg-[#292B30] p-3">
                <div className="flex gap-3">
                  {i.image && <img src={i.image} alt="" className="h-16 w-16 flex-shrink-0 rounded-xl object-cover" />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{i.name}</p>
                    {i.variantLabel && <p className="text-xs text-gray-400">{i.variantLabel}</p>}
                    <p className="mt-1 text-sm text-white">{formatNaira(i.price * i.quantity)}</p>
                  </div>
                  <button
                    aria-label={`Remove ${i.name}`}
                    onClick={() => dispatch(removeFromCart(key))}
                    className="self-start p-2 text-gray-500 hover:text-red-400"
                  >
                    <FaTrash size={13} />
                  </button>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex items-center rounded-lg bg-[#31333a]">
                    <button
                      aria-label="Decrease quantity"
                      disabled={i.quantity <= i.minQuantity}
                      onClick={() => dispatch(setQuantity({ key, quantity: i.quantity - 1 }))}
                      className="px-3 py-2 text-white disabled:opacity-30"
                    >
                      <FaMinus size={10} />
                    </button>
                    <span className="min-w-[2rem] text-center text-sm text-white" aria-live="polite">{i.quantity}</span>
                    <button
                      aria-label="Increase quantity"
                      disabled={i.quantity >= i.maxQuantity}
                      onClick={() => dispatch(setQuantity({ key, quantity: i.quantity + 1 }))}
                      className="px-3 py-2 text-white disabled:opacity-30"
                    >
                      <FaPlus size={10} />
                    </button>
                  </div>
                  {i.minQuantity > 1 && <span className="text-[11px] text-gray-500">Min. {i.minQuantity}</span>}
                </div>
                <input
                  value={i.note ?? ""}
                  onChange={(e) => dispatch(setNote({ key, note: e.target.value }))}
                  maxLength={200}
                  placeholder='Note for the vendor, e.g. "less pepper"'
                  aria-label={`Note for ${i.name}`}
                  className="mt-2 w-full rounded-lg border border-[#373A3F] bg-[#1a1c20] px-3 py-2 text-xs text-white placeholder-gray-600 outline-none focus:border-brand"
                />
              </li>
            );
          })}
        </ul>

        {modes.length > 1 && (
          <div className="mt-5 flex gap-2" role="radiogroup" aria-label="How do you want to get it?">
            {FULFILMENT_MODES.filter((m) => modes.includes(m.id)).map((m) => (
              <button
                key={m.id}
                role="radio"
                aria-checked={fulfilment === m.id}
                onClick={() => setChosenMode(m.id)}
                className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-colors ${
                  fulfilment === m.id ? "bg-brand text-white" : "bg-[#292B30] text-gray-300 hover:text-white"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        )}

        {fulfilment === "delivery" ? (
          <div className="mt-5 space-y-4 rounded-2xl bg-[#212428] p-4">
            <DeliveryAddressSelector selectedAddress={address} onAddressSelect={handleAddress} />
            {address && vendor && (
              <LogisticsProviderSelector
                product={quoteProduct}
                deliveryAddress={address}
                quantity={1}
                selectedProvider={logistics}
                onProviderSelect={handleProvider}
                currency="NGN"
              />
            )}
          </div>
        ) : (
          <p className="mt-5 rounded-2xl bg-[#212428] p-4 text-sm text-gray-300">
            Pick up from <strong className="text-white">{vendor?.name}</strong>
            {vendor?.lga ? ` in ${vendor.lga}, ${vendor.state}` : ""}. The vendor will share the exact address after they accept your order.
          </p>
        )}

        <textarea
          value={buyerNote}
          onChange={(e) => setBuyerNote(e.target.value)}
          maxLength={300}
          rows={2}
          placeholder="Anything else the vendor should know? (optional)"
          aria-label="Note to vendor"
          className="mt-4 w-full resize-none rounded-xl border border-[#292B30] bg-[#1a1c20] px-3 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-brand"
        />

        <div className="mt-4 space-y-2 rounded-2xl bg-[#292B30] p-4 text-sm">
          <div className="flex justify-between text-gray-400">
            <span>Subtotal</span>
            <span>{formatNaira(subtotal)}</span>
          </div>
          {fulfilment === "delivery" && (
            <div className="flex justify-between text-gray-400">
              <span>Delivery</span>
              <span>{logistics ? formatNaira(deliveryEstimate) : "Choose above"}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-gray-700 pt-2 font-semibold text-white">
            <span>Estimated total</span>
            <span>{formatNaira(estimatedTotal)}</span>
          </div>
          <p className="text-[11px] text-gray-500">
            The final amount, including any service fee, is confirmed on the next screen before you pay.
          </p>
        </div>

        {error && (
          <p role="alert" className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
            {error}
          </p>
        )}

        <button
          onClick={placeOrder}
          disabled={isLoading}
          className="mt-4 w-full rounded-xl bg-gradient-to-r from-brand to-brand-hover py-3.5 text-sm font-bold text-white shadow-lg transition-all hover:opacity-90 disabled:opacity-50"
        >
          {isLoading ? "Placing order…" : isAuthenticated ? "Place order & continue to payment" : "Sign in to order"}
        </button>
      </Container>
    </div>
  );
}
