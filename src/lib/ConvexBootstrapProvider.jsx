import { ConvexProvider } from "convex/react";
import { convex } from "@/lib/convexClient";

export function ConvexBootstrapProvider({ children }) {
  if (!convex) {
    return <>{children}</>;
  }

  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
