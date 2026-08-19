"use client";

import { usePathname } from "next/navigation";

export const HeaderTitle = () => {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const segment = segments.at(-1) || "Dashboard";
  const title = segment.charAt(0).toUpperCase() + segment.slice(1);

  return <h1 className="text-sm font-medium">{title}</h1>;
};
