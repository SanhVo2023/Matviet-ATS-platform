"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { useState } from "react";
import { Theme } from "@astryxdesign/core/theme";
import { matvietTheme } from "@/styles/themes/matviet/matviet";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    // matvietTheme is a BUILT theme (__built: true) — matviet.css carries the
    // styles; the provider only supplies context + light-mode color-scheme.
    <Theme theme={matvietTheme} mode="light">
      <QueryClientProvider client={queryClient}>
        <NuqsAdapter>{children}</NuqsAdapter>
      </QueryClientProvider>
    </Theme>
  );
}
