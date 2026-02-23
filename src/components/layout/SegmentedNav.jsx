"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const SEGMENTED_ROUTES = [];

function SegmentedNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary" className="flex items-center gap-spacing12">
      {SEGMENTED_ROUTES.map((route) => {
        const isActive = pathname === route.to;
        return (
          <Link
            key={route.to}
            href={route.to}
            className={[
              "px-spacing12 py-spacing8 text-sm font-bold uppercase tracking-wider transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent1",
              isActive
                ? "text-accent1 border-b-2 border-accent1"
                : "text-neutral2 hover:text-neutral1",
            ].join(" ")}
          >
            {route.label}
          </Link>
        );
      })}
    </nav>
  );
}

export default SegmentedNav
