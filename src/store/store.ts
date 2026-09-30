import { configureStore } from "@reduxjs/toolkit";
import watchlistReducer from "./slices/watchlistSlice";
import rewardsReducer from "./slices/rewardsSlice";
import notificationsReducer from "./slices/notificationsSlice";
import cartReducer, { saveCart } from "./slices/cartSlice";
import { baseApi } from "./api/baseApi";

export const store = configureStore({
  reducer: {
    // RTK Query API reducer
    [baseApi.reducerPath]: baseApi.reducer,
    // Active slices
    watchlist: watchlistReducer,
    rewards: rewardsReducer,
    notifications: notificationsReducer,
    cart: cartReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(baseApi.middleware),
});

// Persist the cart across reloads (small, synchronous, only when it changes).
let lastCart = store.getState().cart;
store.subscribe(() => {
  const next = store.getState().cart;
  if (next !== lastCart) {
    lastCart = next;
    saveCart(next);
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
