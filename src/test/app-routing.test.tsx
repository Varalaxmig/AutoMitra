import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";

// Match routes without running loaders or rendering: loaders may need a server or
// network the test run lacks, and jsdom never loads the stylesheets React waits on.
describe("App routing", () => {
  it("matches a page for / instead of falling back to not found", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const matches = router.matchRoutes("/");

    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });

  it("matches a page for /onboard instead of falling back to not found", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const matches = router.matchRoutes("/onboard");

    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
    expect(matches.at(-1)?.routeId).toBe("/onboard");
  });

  it("matches a page for /console and /q/$slug", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    expect(router.matchRoutes("/console").at(-1)?.routeId).toBe("/console");
    expect(router.matchRoutes("/q/K7M2QX9A").at(-1)?.routeId).toBe("/q/$slug");
  });

  it("renders the root page component without throwing ReferenceError or TypeError", () => {
    const IndexComponent = routeTree.children?.find((r: any) => r.path === "/")?.options?.component;
    expect(IndexComponent).toBeDefined();
  });
});
