import { useQuery, queryOptions } from "@tanstack/react-query";

/**
 * Describes HOW to reach a reference-data row over HTTP. This is the only
 * thing that varies between an admin-dashboard caller (same-origin, cookie
 * session, generic `/admin/reference-data/:dataId` route) and a
 * cross-origin public caller (absolute base URL, per-row REST path under
 * `/reference-data` or the unauthenticated `/api/v1/classifications/*`
 * surface) — CEL-1607, spec `docs/specs/2026-09-02-matching-canonical-deepening.md`
 * §2 card 09 ("Dashboard client"), D13.
 */
export interface ReferenceDataTransport {
  /**
   * Which backend surface this transport reaches. Selects `row.paths.admin`
   * vs `row.paths.public` — the two surfaces name the same canonical row
   * with different path shapes (see `CLASSIFICATION_REFERENCE_ROW` for a
   * worked example: `/admin/reference-data/beverage_classifications` vs
   * `/api/v1/classifications/beverage-types`).
   */
  kind: "admin" | "public";
  /**
   * Prepended to the row's path. Empty (or omitted) for a same-origin
   * admin caller — the request rides the dashboard's own dev proxy / prod
   * Envoy route and picks up the session cookie for free. An absolute
   * origin (`http://localhost:4000`, `https://api.cellarnode.com`) for a
   * cross-origin public caller.
   */
  baseUrl?: string;
  /**
   * Fetch implementation override — SSR, tests, or a wrapped fetch that
   * injects auth headers. Defaults to the global `fetch`.
   */
  fetchFn?: typeof fetch;
  /**
   * Extra `RequestInit` merged into every request. Same-origin admin
   * callers typically pass `{ credentials: "include" }` so the session
   * cookie rides along; cross-origin public callers usually leave this
   * unset.
   */
  requestInit?: RequestInit;
}

/** One canonical reference-data row this hook knows how to fetch. */
export interface ReferenceDataRow<T> {
  /**
   * Canonical `reference_data.dataId` — used as the default cache-key
   * segment and in the error message thrown on a non-2xx response.
   */
  dataId: string;
  /** Path appended to `transport.baseUrl`, keyed by `transport.kind`. */
  paths: { admin: string; public: string };
  /**
   * Parses + validates the raw JSON response into `T`. Return `null` for
   * any shape the row doesn't recognise — the query function then throws
   * the same way a non-2xx response does (CEL-1607 review fixup), so
   * TanStack Query retries and `isError` becomes `true` instead of caching
   * a malformed payload as a "successful" result for `staleTime`.
   * `fallback` still renders meanwhile via `query.data ?? row.fallback`.
   */
  parse: (json: unknown) => T | null;
  /** Static fallback rendered while loading, on error, or on malformed data. */
  fallback: T;
}

export interface UseReferenceDataOptions {
  transport: ReferenceDataTransport;
  /**
   * Override the React Query cache key. Defaults to
   * `["reference-data", transport.kind, row.dataId, transport.baseUrl ?? ""]`
   * so same-kind callers on the same origin across a dashboard share one
   * cache entry without per-call overrides, while two same-kind callers
   * pointed at different origins (SSR, multi-tenant) don't collide
   * (CEL-1607 review fixup).
   */
  queryKey?: readonly unknown[];
  /**
   * Override the stale time (ms). Defaults to 5 minutes, mirroring the
   * other canonical-row hooks in `@cellarnode/ui`
   * (`usePackagingOptions`, `useActiveCurrencies`, …).
   */
  staleTimeMs?: number;
}

export interface UseReferenceDataResult<T> {
  /**
   * Always a usable value: the row's `fallback` while the query is
   * loading, errored, or the server returned something `row.parse`
   * couldn't recognise. Consumers can render without branching on
   * `isLoading` first — `isLoading` / `isError` still surface for callers
   * that want to show a spinner or a stale-data banner.
   */
  data: T;
  isLoading: boolean;
  isError: boolean;
  error?: Error;
}

const DEFAULT_STALE_TIME_MS = 5 * 60 * 1000;

function resolvePath<T>(row: ReferenceDataRow<T>, transport: ReferenceDataTransport): string {
  return transport.kind === "admin" ? row.paths.admin : row.paths.public;
}

/**
 * Builds the TanStack Query `queryOptions` for a reference-data row
 * without calling `useQuery` — useful for `queryClient.prefetchQuery` /
 * `ensureQueryData` in a route loader. `useReferenceData` below is a thin
 * `useQuery` wrapper around this.
 */
export function referenceDataOptions<T>(row: ReferenceDataRow<T>, options: UseReferenceDataOptions) {
  const { transport, queryKey, staleTimeMs = DEFAULT_STALE_TIME_MS } = options;
  const path = resolvePath(row, transport);
  const fetchImpl = transport.fetchFn ?? fetch;
  const baseUrl = transport.baseUrl ?? "";

  return queryOptions({
    queryKey: queryKey ?? ["reference-data", transport.kind, row.dataId, baseUrl],
    queryFn: async (): Promise<T> => {
      const res = await fetchImpl(`${baseUrl}${path}`, transport.requestInit);
      if (!res.ok) {
        throw new Error(
          `@cellarnode/beverage-utils: GET ${path} for reference-data row "${row.dataId}" failed (${res.status})`,
        );
      }
      const json: unknown = await res.json();
      const parsed = row.parse(json);
      if (parsed === null) {
        throw new Error(
          `@cellarnode/beverage-utils: GET ${path} for reference-data row "${row.dataId}" returned a body row.parse could not recognise`,
        );
      }
      return parsed;
    },
    staleTime: staleTimeMs,
  });
}

/**
 * `useReferenceData(row, { transport })` — one hook every dashboard uses
 * to read a canonical reference-data row (CEL-1607). Replaced three
 * hand-rolled fetchers that each re-implemented loading / error / fallback
 * behaviour slightly differently: this package's own classification hook
 * (`useBeverageLabelMap`, folded onto this hook and removed in CEL-1660 —
 * see that ticket for the per-consumer migration), admin's
 * `use-classification-options` (built on a same-origin `/admin/reference-data`
 * fetch), and producer's `useClassifications` (built on the cross-origin
 * public `/api/v1/classifications/beverage-types` endpoint).
 *
 * `transport` — same-origin admin vs cross-origin public — is the ONLY
 * thing that varies between callers; `row` (see `CLASSIFICATION_REFERENCE_ROW`)
 * owns the path, parsing, and static fallback for one canonical row.
 *
 * `data` is always a usable value: the row's `fallback` while the query is
 * loading, errored, or the server returned something `row.parse` couldn't
 * recognise — so consumers can render without branching on `isLoading`
 * first, the same contract as `usePackagingOptions` / `useActiveCurrencies`
 * in `@cellarnode/ui`.
 *
 * Requires a `QueryClientProvider` ancestor (this is a `useQuery` wrapper);
 * a consumer that omits one gets TanStack Query's own runtime throw, since
 * `@tanstack/react-query` is only an optional peer dependency here.
 */
export function useReferenceData<T>(
  row: ReferenceDataRow<T>,
  options: UseReferenceDataOptions,
): UseReferenceDataResult<T> {
  const query = useQuery(referenceDataOptions(row, options));
  return {
    data: query.data ?? row.fallback,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error ?? undefined,
  };
}
