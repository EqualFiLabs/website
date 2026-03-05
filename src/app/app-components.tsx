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
    <div className="mb-6">
      <h2 className="text-lg font-semibold text-neutral1">{title}</h2>
      {subtitle && <p className="text-sm text-neutral2 mt-1">{subtitle}</p>}
    </div>
  );
}

export function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-surface2 bg-surface1 p-6 shadow-card h-full min-h-[180px] min-w-0 flex flex-col transition-all overflow-hidden">
      {children}
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col text-xs uppercase tracking-[0.2em] text-neutral3">
      {label}
      {children}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="mt-2 w-full rounded-2xl border border-surface3 bg-surface2 px-4 py-3 text-sm text-neutral1 outline-none focus:border-accent1 focus:ring-2 focus:ring-accent1/20"
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="mt-2 w-full rounded-2xl border border-surface3 bg-surface2 px-4 py-3 text-sm text-neutral1 outline-none focus:border-accent1 focus:ring-2 focus:ring-accent1/20"
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
      className={`min-h-[44px] rounded-full border px-4 font-semibold text-sm transition-all text-neutral1 mt-2 ${disabled
          ? "border-surface3 text-neutral3 cursor-not-allowed opacity-50"
          : "border-surface3 hover:border-accent1"
        }`}
    >
      {children}
    </button>
  );
}

export function StatusLine({ text }: { text?: string }) {
  if (!text) return null;
  return <p className="text-xs text-neutral3 mt-2">{text}</p>;
}
