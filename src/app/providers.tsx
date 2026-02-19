"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { mainnet, arbitrum, base, sepolia, foundry } from "wagmi/chains";
import { http } from "wagmi";
import ToastProvider from "@/components/common/ToastProvider";

const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID || "";
const useLocal = process.env.NEXT_PUBLIC_CHAIN_ID === "31337";

const chains = useLocal ? [foundry] : [mainnet, arbitrum, base, sepolia];

const config = getDefaultConfig({
  appName: "EqualFi",
  projectId,
  chains,
  transports: useLocal
    ? {
        [foundry.id]: http(process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545"),
      }
    : undefined,
  ssr: true,
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: "#ffffff",
            accentColorForeground: "#000000",
            borderRadius: "small",
          })}
        >
          <ToastProvider>{children}</ToastProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
