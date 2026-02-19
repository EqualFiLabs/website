"use client";

export const TOKENS = [
  { symbol: "rETH", address: process.env.NEXT_PUBLIC_POOL1_UNDERLYING!, decimals: 18, poolId: 1 },
  { symbol: "stETH", address: process.env.NEXT_PUBLIC_POOL2_UNDERLYING!, decimals: 18, poolId: 2 },
  { symbol: "WBTC", address: process.env.NEXT_PUBLIC_POOL3_UNDERLYING!, decimals: 8, poolId: 3 },
  { symbol: "WETH", address: process.env.NEXT_PUBLIC_POOL4_UNDERLYING!, decimals: 18, poolId: 4 },
  { symbol: "USDC", address: process.env.NEXT_PUBLIC_POOL5_UNDERLYING!, decimals: 6, poolId: 5 },
  { symbol: "ETH", address: "0x0000000000000000000000000000000000000000", decimals: 18, poolId: 0 },
] as const;

export function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-mono uppercase tracking-[0.2em] text-gray-500">// {title}</h2>
      {subtitle && <p className="text-sm text-gray-400 font-mono">{subtitle}</p>}
    </div>
  );
}

export function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="card-glow h-full min-h-[180px] flex flex-col border border-white/15 bg-black/60 p-6 rounded-xl shadow-none transition-all">
      {children}
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-2 text-xs font-mono text-gray-400">
      <span className="uppercase tracking-[0.2em]">{label}</span>
      {children}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full bg-black border border-white/15 px-3 py-2 text-sm text-white focus:outline-none focus:border-white/40"
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="w-full bg-black border border-white/15 px-3 py-2 text-sm text-white focus:outline-none focus:border-white/40"
    />
  );
}

export function ActionButton({
  disabled,
  children,
  onClick,
}: {
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`w-full uppercase tracking-widest text-xs font-mono border px-4 py-3 transition-colors ${
        disabled
          ? "border-white/20 text-white/40 cursor-not-allowed"
          : "border-white text-white hover:bg-white hover:text-black"
      }`}
    >
      {children}
    </button>
  );
}

export function StatusLine({ text }: { text?: string }) {
  if (!text) return null;
  return <p className="text-xs text-gray-500 font-mono mt-2">{text}</p>;
}
