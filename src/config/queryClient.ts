import { QueryClient } from "@tanstack/react-query";

// Shared React Query client. Used by the app root and by the smart-wallet
// provider tree (which may wrap it with Dynamic + wagmi).
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30000,
      gcTime: 5 * 60 * 1000,
      refetchOnMount: false,
    },
  },
});
