// @vitest-environment jsdom
/**
 * CEL-1607 — the parameterised `useReferenceData(row, { transport })` hook.
 *
 * Covers the acceptance-criteria matrix: success, in-flight, transport
 * error falling back to the shipped statics, and same-origin (admin) vs
 * cross-origin (public) base-URL composition.
 */
import { describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { useReferenceData, type ReferenceDataRow } from "../../src/react/use-reference-data";

interface Widget {
  id: string;
}

const FALLBACK: Widget = { id: "fallback" };

const ROW: ReferenceDataRow<Widget> = {
  dataId: "widgets",
  paths: {
    admin: "/admin/reference-data/widgets",
    public: "/reference-data/widgets",
  },
  parse: (json) => {
    if (json === null || typeof json !== "object") return null;
    const id = (json as { id?: unknown }).id;
    return typeof id === "string" && id.length > 0 ? { id } : null;
  },
  fallback: FALLBACK,
};

function wrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("useReferenceData — success", () => {
  it("resolves the parsed row once the fetch settles", async () => {
    const fetchFn = vi.fn(async () =>
      new Response(JSON.stringify({ id: "live" }), { status: 200 }),
    );

    const { result } = renderHook(
      () => useReferenceData(ROW, { transport: { kind: "public", baseUrl: "http://localhost:4000", fetchFn } }),
      { wrapper: wrapper() },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toEqual({ id: "live" });
    expect(result.current.isError).toBe(false);
    expect(fetchFn).toHaveBeenCalledWith(
      "http://localhost:4000/reference-data/widgets",
      undefined,
    );
  });
});

describe("useReferenceData — in-flight", () => {
  it("surfaces the static fallback with isLoading=true before the fetch settles", async () => {
    let resolveFetch!: (value: Response) => void;
    const fetchFn = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    );

    const { result } = renderHook(
      () => useReferenceData(ROW, { transport: { kind: "public", baseUrl: "http://localhost:4000", fetchFn } }),
      { wrapper: wrapper() },
    );

    // Still pending: data is the fallback, never `undefined`.
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toEqual(FALLBACK);

    resolveFetch(new Response(JSON.stringify({ id: "live" }), { status: 200 }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual({ id: "live" });
  });
});

describe("useReferenceData — transport error falls back to statics", () => {
  it("falls back on a network rejection", async () => {
    const fetchFn = vi.fn(async () => {
      throw new Error("network down");
    });

    const { result } = renderHook(
      () => useReferenceData(ROW, { transport: { kind: "public", baseUrl: "http://localhost:4000", fetchFn } }),
      { wrapper: wrapper() },
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toEqual(FALLBACK);
  });

  it("falls back on a non-2xx response", async () => {
    const fetchFn = vi.fn(async () => new Response("", { status: 500 }));

    const { result } = renderHook(
      () => useReferenceData(ROW, { transport: { kind: "public", baseUrl: "http://localhost:4000", fetchFn } }),
      { wrapper: wrapper() },
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toEqual(FALLBACK);
  });

  it("throws + falls back to statics on a malformed (unparseable) body, same as a non-2xx (CEL-1607 review fixup)", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify({ nope: true }), { status: 200 }));

    const { result } = renderHook(
      () => useReferenceData(ROW, { transport: { kind: "public", baseUrl: "http://localhost:4000", fetchFn } }),
      { wrapper: wrapper() },
    );

    // A 200 whose body row.parse can't recognise is treated the same as a
    // transport failure: the query throws, isError becomes true (so a
    // consumer can tell live data from a garbage payload), and the result
    // is NOT cached as a success for staleTime.
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toEqual(FALLBACK);
  });
});

describe("useReferenceData — same-origin admin vs cross-origin public transport", () => {
  it("hits the admin path with an empty/relative base URL", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify({ id: "admin-widget" }), { status: 200 }));

    const { result } = renderHook(
      () =>
        useReferenceData(ROW, {
          transport: { kind: "admin", fetchFn, requestInit: { credentials: "include" } },
        }),
      { wrapper: wrapper() },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(fetchFn).toHaveBeenCalledWith("/admin/reference-data/widgets", { credentials: "include" });
    expect(result.current.data).toEqual({ id: "admin-widget" });
  });

  it("hits the public path with an absolute cross-origin base URL", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify({ id: "public-widget" }), { status: 200 }));

    const { result } = renderHook(
      () =>
        useReferenceData(ROW, {
          transport: { kind: "public", baseUrl: "https://api.cellarnode.com", fetchFn },
        }),
      { wrapper: wrapper() },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(fetchFn).toHaveBeenCalledWith("https://api.cellarnode.com/reference-data/widgets", undefined);
    expect(result.current.data).toEqual({ id: "public-widget" });
  });

  it("uses distinct cache keys per transport kind by default", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify({ id: "x" }), { status: 200 }));
    const Wrapper = wrapper();

    const admin = renderHook(() => useReferenceData(ROW, { transport: { kind: "admin", fetchFn } }), {
      wrapper: Wrapper,
    });
    const pub = renderHook(() => useReferenceData(ROW, { transport: { kind: "public", fetchFn } }), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(admin.result.current.isLoading).toBe(false));
    await waitFor(() => expect(pub.result.current.isLoading).toBe(false));

    // Two distinct requests, one per transport kind — proves the default
    // queryKey namespaces admin vs public rather than colliding.
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("uses distinct cache keys per base URL for the same transport kind (CEL-1607 review fixup)", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify({ id: "x" }), { status: 200 }));
    const Wrapper = wrapper();

    const a = renderHook(
      () =>
        useReferenceData(ROW, {
          transport: { kind: "public", baseUrl: "https://a.example.com", fetchFn },
        }),
      { wrapper: Wrapper },
    );
    const b = renderHook(
      () =>
        useReferenceData(ROW, {
          transport: { kind: "public", baseUrl: "https://b.example.com", fetchFn },
        }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(a.result.current.isLoading).toBe(false));
    await waitFor(() => expect(b.result.current.isLoading).toBe(false));

    // Two public transports on different origins must not share a cache
    // entry — before this fix the default key omitted baseUrl entirely.
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });
});
