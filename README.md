# @cellarnode/beverage-utils

Beverage classification utilities for the [CellarNode](https://cellarnode.com) platform &mdash; label mapping, formatting, and display helpers for the industry-standard beverage classification system.

Works with **any JavaScript/TypeScript project**. Framework-specific adapters included for React, Vue, and Angular.

```bash
npm install @cellarnode/beverage-utils
```

## Entry Points

| Import path | What it provides | Peer dependencies |
|---|---|---|
| `@cellarnode/beverage-utils` | Core utilities (pure TS, zero deps) | None |
| `@cellarnode/beverage-utils/react` | React hook + query options | `react`, `@tanstack/react-query` |
| `@cellarnode/beverage-utils/vue` | Vue composable + query options | `vue`, `@tanstack/vue-query` |
| `@cellarnode/beverage-utils/angular` | Angular inject function + query options | `@angular/core`, `@tanstack/angular-query-experimental` |

All peer dependencies are **optional** &mdash; only install what your framework adapter needs.

## Why Composite Keys?

CellarNode classifies beverages into **categories** (e.g. Still Wine, Sparkling Wine, Beer) and **subtypes** (e.g. Red, White, Rose). The catch: subtype IDs like `red` are reused across categories. "Red" under Still Wine means "Red Wine", but "Red" under Sparkling Wine means "Red Sparkling".

`buildLabelMap()` solves this by creating **composite keys** (`category:subtype`) alongside flat keys, so lookups are always unambiguous.

## Core API

The core entry point works everywhere &mdash; Node.js, Deno, Bun, any bundler, any framework.

### `buildLabelMap(classification)`

Builds a flat lookup map from a `BeverageClassification` object. Each entry is keyed three ways:

- **Category ID** &rarr; category name (`"wine"` &rarr; `"Still Wine"`)
- **Subtype ID** &rarr; subtype name (`"red"` &rarr; `"Red Wine"`) &mdash; last-write-wins for duplicates
- **Composite key** &rarr; subtype name (`"wine:red"` &rarr; `"Red Wine"`) &mdash; always unambiguous

```typescript
import { buildLabelMap } from "@cellarnode/beverage-utils";

const map = buildLabelMap(classificationData);
map["wine"];               // "Still Wine"
map["wine:red"];           // "Red Wine"
map["sparkling_wine:red"]; // "Red Sparkling"
```

### `formatBeverageLabel(key, map?)`

Converts a slug to a human-readable label. Looks up the key in the map first; falls back to humanizing the slug (`snake_case` &rarr; `Title Case`). Returns `""` for `null`/`undefined`.

```typescript
import { formatBeverageLabel } from "@cellarnode/beverage-utils";

formatBeverageLabel("sparkling_wine", map); // "Sparkling Wine"
formatBeverageLabel("sparkling_wine");       // "Sparkling Wine" (fallback)
formatBeverageLabel(null);                   // ""
```

### `formatBeverageType(category, subtype?, map?)`

Formats a category + optional subtype into a display string like `"Still Wine / Red Wine"`. Uses composite keys for disambiguation when a map is provided.

```typescript
import { formatBeverageType } from "@cellarnode/beverage-utils";

formatBeverageType("wine", "red", map);          // "Still Wine / Red Wine"
formatBeverageType("sparkling_wine", "red", map); // "Sparkling Wine / Red Sparkling"
formatBeverageType("wine", null, map);            // "Still Wine"
formatBeverageType("sparkling_wine", "red");      // "Sparkling Wine / Red" (fallback)
```

### `formatBeverageSubtype(categoryId, subtypeId?, map?)`

Formats a subtype on its own into a category-aware label like `"Red Wine"`. Prefers the composite `categoryId:subtypeId` key, then the flat subtype key, then humanizes the slug. Returns `""` for a nullish/empty subtype. `formatBeverageType` reuses it so pair and subtype-only output cannot drift.

```typescript
import { formatBeverageSubtype } from "@cellarnode/beverage-utils";

formatBeverageSubtype("wine", "red", map);           // "Red Wine"
formatBeverageSubtype("sparkling_wine", "red", map); // "Red Sparkling"
formatBeverageSubtype("wine", "experimental_style"); // "Experimental Style" (fallback)
formatBeverageSubtype("wine", null);                 // ""
```

## Framework Adapters

All adapters use [TanStack Query](https://tanstack.com/query) to fetch and cache classification data from the CellarNode API. Cache lifetime differs by adapter — see each section below.

### React

```bash
npm install @cellarnode/beverage-utils react @tanstack/react-query
```

```tsx
import { useBeverageClassifications } from "@cellarnode/beverage-utils/react";
import { buildLabelMap, formatBeverageType } from "@cellarnode/beverage-utils";

function BeverageDisplay({ category, subtype }: Props) {
  const { data } = useBeverageClassifications({
    transport: { kind: "public", baseUrl: "https://api.cellarnode.com" },
  });
  const labelMap = buildLabelMap(data);

  return <span>{formatBeverageType(category, subtype, labelMap)}</span>;
}
```

`data` is always a usable value (the shipped canonical statics while loading, on
error, or on a malformed response), and defaults to a 5-minute `staleTime`
(override via `staleTimeMs`) — pass `transport: { kind: "admin", ... }` for a
same-origin admin caller instead of the cross-origin `public` shape above. See
`useReferenceData`'s own JSDoc for the full transport/row contract; it's the
one hook every dashboard uses for any canonical reference-data row, not just
classifications.

**Prefetching** with the raw query options:

```typescript
import {
  referenceDataOptions,
  CLASSIFICATION_REFERENCE_ROW,
} from "@cellarnode/beverage-utils/react";

// In a loader or server component
await queryClient.prefetchQuery(
  referenceDataOptions(CLASSIFICATION_REFERENCE_ROW, {
    transport: { kind: "public", baseUrl: "https://api.cellarnode.com" },
  }),
);
```

### Vue

Cached with `staleTime: Infinity` (classifications rarely change).

```bash
npm install @cellarnode/beverage-utils vue @tanstack/vue-query
```

```vue
<script setup lang="ts">
import { useBeverageLabelMap } from "@cellarnode/beverage-utils/vue";
import { formatBeverageType } from "@cellarnode/beverage-utils";

const { data: labelMap } = useBeverageLabelMap("https://api.cellarnode.com");
</script>

<template>
  <span>{{ formatBeverageType(category, subtype, labelMap) }}</span>
</template>
```

**Prefetching:**

```typescript
import { beverageLabelMapOptions } from "@cellarnode/beverage-utils/vue";

await queryClient.prefetchQuery(beverageLabelMapOptions("https://api.cellarnode.com"));
```

### Angular

Cached with `staleTime: Infinity` (classifications rarely change).

```bash
npm install @cellarnode/beverage-utils @angular/core @tanstack/angular-query-experimental
```

```typescript
import { Component, computed } from "@angular/core";
import { injectBeverageLabelMap } from "@cellarnode/beverage-utils/angular";
import { formatBeverageType } from "@cellarnode/beverage-utils";

@Component({
  selector: "app-beverage-display",
  template: `<span>{{ display() }}</span>`,
})
export class BeverageDisplayComponent {
  category = "wine";
  subtype = "red";

  private labelMapQuery = injectBeverageLabelMap("https://api.cellarnode.com");

  display = computed(() =>
    formatBeverageType(this.category, this.subtype, this.labelMapQuery.data())
  );
}
```

**Using query options directly:**

```typescript
import { beverageLabelMapOptions } from "@cellarnode/beverage-utils/angular";
import { injectQuery } from "@tanstack/angular-query-experimental";

const query = injectQuery(() => beverageLabelMapOptions("https://api.cellarnode.com"));
```

## Plain Fetch (No Framework)

For backends or vanilla frontends, use the core functions directly:

```typescript
import { buildLabelMap, formatBeverageType } from "@cellarnode/beverage-utils";

const res = await fetch("https://api.cellarnode.com/api/v1/classifications/beverage-types");
const { jsonData } = await res.json();

const map = buildLabelMap(jsonData);
console.log(formatBeverageType("wine", "red", map)); // "Still Wine / Red Wine"
```

## Classification API

The classification data is served by the CellarNode public API:

```
GET /api/v1/classifications/beverage-types
```

Response shape:

```json
{
  "jsonData": {
    "categories": [
      {
        "id": "wine",
        "name": "Still Wine",
        "hsHeading": "2204",
        "subtypes": [
          { "id": "red", "name": "Red Wine", "oivType": "1" },
          { "id": "white", "name": "White Wine", "oivType": "2" }
        ]
      }
    ]
  }
}
```

## Types

All types are exported from the main entry point:

```typescript
import type {
  BeverageClassification,
  BeverageCategory,
  BeverageSubtype,
  LabelMap,
} from "@cellarnode/beverage-utils";
```

## Contributing

```bash
git clone https://github.com/CellarNode/beverage-utils.git
cd beverage-utils
npm install --legacy-peer-deps
npm test
npm run typecheck
npm run build
npm run check-exports   # runs publint + attw
```

## Release Process

1. Make your changes and update `CHANGELOG.md`
2. Bump `version` in `package.json`
3. Push to `main`
4. GitHub Actions automatically publishes to npm (with provenance)

## License

MIT
