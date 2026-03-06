"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { arbitrumSepolia, baseSepolia, sepolia, foundry } from "wagmi/chains";
import { http } from "wagmi";
import type { Chain } from "viem";
import ToastProvider from "@/components/common/ToastProvider";

const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID || "";
const robinhoodRpcUrl =
  process.env.NEXT_PUBLIC_RPC_URL_ROBINHOOD_TESTNET || "https://rpc.testnet.chain.robinhood.com";

const robinhoodTestnet: Chain = {
  id: 46630,
  name: "Robinhood Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: [robinhoodRpcUrl] },
    public: { http: [robinhoodRpcUrl] },
  },
  blockExplorers: {
    default: {
      name: "Robinhood Explorer",
      url: "https://explorer.testnet.chain.robinhood.com",
    },
  },
  testnet: true,
};

const config = getDefaultConfig({
  appName: "EqualFi",
  projectId,
  chains: [arbitrumSepolia, baseSepolia, sepolia, robinhoodTestnet, foundry],
  transports: {
    [foundry.id]: http(process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545"),
    [arbitrumSepolia.id]: http(),
    [baseSepolia.id]: http(),
    [sepolia.id]: http(),
    [robinhoodTestnet.id]: http(robinhoodRpcUrl),
  },
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
