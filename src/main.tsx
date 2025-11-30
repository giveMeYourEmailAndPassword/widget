import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from "./App";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: 2000,
      staleTime: 5 * 60 * 1000, // 5 минут по умолчанию
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      gcTime: 10 * 60 * 1000, // 10 минут хранения в кэше
    },
  },
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
