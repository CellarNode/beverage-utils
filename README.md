# @cellarnode/beverage-utils

Beverage classification utilities for the CellarNode platform -- label mapping, formatting, and display helpers for the industry-standard beverage classification system.

## Why composite keys?

CellarNode classifies beverages into **categories** (e.g. Still Wine, Sparkling Wine, Beer) and **subtypes** (e.g. Red, White, Rose). The catch: subtype IDs like `red` are reused across categories. "Red" under Still Wine means "Red Wine", but "Red" under Sparkling Wine means "Red Sparkling".

`buildLabelMap()` solves this by creating **composite keys** (`category:subtype`) alongside flat keys, so `formatBeverageType("wine", "red", map)` correctly returns `"Still Wine / Red Wine"` while `formatBeverageType("sparkling_wine", "red", map)` returns `"Sparkling Wine / Red Sparkling"`.

## Installation

This package is published to [GitHub Packages](https://github.com/cellarnode/beverage-utils/packages). You need an `.npmrc` that points `@cellarnode` to the GitHub registry.

### 1. Configure `.npmrc`

In your project root (or `~/.npmrc` for global config):

```ini
@cellarnode:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

For **local development**, create a [personal access token](https://github.com/settings/tokens) with `read:packages` scope and set it as `GITHUB_TOKEN` in your environment.

For **CI**, use the built-in `GITHUB_TOKEN` secret (it has `read:packages` by default for packages in the same org).

### 2. Install

```bash
npm install @cellarnode/beverage-utils
```

### Optional peer dependencies

The React adapter (`@cellarnode/beverage-utils/react`) requires:

- `react` ^18.0.0 or ^19.0.0
- `@tanstack/react-query` ^5.0.0

These are listed as optional peer dependencies -- install them only if you use the React entry point.

## API Reference

### `buildLabelMap(classification)`

Builds a flat lookup map from a `BeverageClassification` object. Each entry is keyed three ways:

- **Category ID** -> category name (e.g. `"wine"` -> `"Still Wine"`)
- **Subtype ID** -> subtype name (e.g. `"red"` -> `"Red Wine"`) -- last-write-wins for duplicates
- **Composite key** -> subtype name (e.g. `"wine:red"` -> `"Red Wine"`) -- always unambiguous

```typescript
import { buildLabelMap } from "@cellarnode/beverage-utils";

const map = buildLabelMap(classificationData);
// map["wine"]           => "Still Wine"
// map["wine:red"]       => "Red Wine"
// map["sparkling_wine:red"] => "Red Sparkling"
```

### `formatBeverageLabel(key, map?)`

Converts a slug to a human-readable label. Looks up the key in the map first; falls back to humanizing the slug (`snake_case` -> `Title Case`). Returns `""` for `null` or `undefined`.

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

formatBeverageType("wine", "red", map);            // "Still Wine / Red Wine"
formatBeverageType("sparkling_wine", "red", map);   // "Sparkling Wine / Red Sparkling"
formatBeverageType("wine", null, map);              // "Still Wine"
formatBeverageType("sparkling_wine", "red");        // "Sparkling Wine / Red" (fallback)
```

### `useBeverageLabelMap(apiBaseUrl)` (React)

TanStack Query hook that fetches the classification from the CellarNode public API and returns a `LabelMap`. The data is cached with `staleTime: Infinity` (classifications rarely change).

```tsx
import { useBeverageLabelMap } from "@cellarnode/beverage-utils/react";
import { formatBeverageType } from "@cellarnode/beverage-utils";

function BeverageDisplay({ category, subtype }: Props) {
  const { data: labelMap } = useBeverageLabelMap("https://api.cellarnode.com");

  return <span>{formatBeverageType(category, subtype, labelMap)}</span>;
}
```

### `beverageLabelMapOptions(apiBaseUrl)` (React)

Returns the raw TanStack Query `queryOptions` object, useful for prefetching or using outside the hook:

```typescript
import { beverageLabelMapOptions } from "@cellarnode/beverage-utils/react";

// Prefetch in a loader
await queryClient.prefetchQuery(beverageLabelMapOptions("https://api.cellarnode.com"));
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

## Non-React Usage

For backends or non-React frontends, use the core functions directly:

```typescript
import { buildLabelMap, formatBeverageType } from "@cellarnode/beverage-utils";

// Fetch classification data however you like
const res = await fetch("https://api.cellarnode.com/api/v1/classifications/beverage-types");
const { jsonData } = await res.json();

const map = buildLabelMap(jsonData);
console.log(formatBeverageType("wine", "red", map)); // "Still Wine / Red Wine"
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

1. Clone the repo and install dependencies: `npm install`
2. Run tests: `npm test`
3. Run typecheck: `npm run typecheck`

## Release Process

1. Update `version` in `package.json` and add notes to `CHANGELOG.md`
2. Push to `main`
3. Create a GitHub release with a tag matching the version (e.g. `v0.1.0`)
4. The `publish.yml` workflow will automatically run tests and publish to GitHub Packages

## License

MIT
