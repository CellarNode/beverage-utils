# @cellarnode/beverage-utils

Beverage classification utilities — label mapping, formatting, and display helpers for the CellarNode industry-standard beverage classification system.

## Stack

- TypeScript 5.x, zero runtime deps in core.
- Built with `tsc` (no bundler). Tested with vitest.
- Framework adapters (React, Vue, Angular) are optional peer-dep'd.

## Entry points (all published to npm)

```
@cellarnode/beverage-utils          # Core (no peers)
@cellarnode/beverage-utils/react    # peers: react, @tanstack/react-query
@cellarnode/beverage-utils/vue      # peers: vue, @tanstack/vue-query
@cellarnode/beverage-utils/angular  # peers: @angular/core, @tanstack/angular-query-experimental
```

Consumers install only the peers their framework needs.

## Commands

```bash
pnpm install
pnpm build              # tsc only
pnpm test               # vitest run
pnpm test:watch         # vitest watch
make build              # clean + lint + typecheck + compile (PREFERRED pre-publish gate)
```

Always run `make build` (not bare `pnpm build`) before opening a PR or publishing — the release script gates on lint + typecheck.

## Structure

```
src/
├── index.ts            # Core exports
├── label-map.ts        # buildLabelMap (composite keys "category:subtype")
├── format.ts           # formatBeverageLabel
├── normalize.ts        # ID normalization
├── types.ts            # BeverageClassification, ...
├── react/              # useBeverageLabels hook + query options
├── vue/                # useBeverageLabels composable + query options
└── angular/            # injectBeverageLabels + query options
```

## Why composite keys?

Subtype IDs like `red` are reused across categories. `red` under Still Wine = "Red Wine", but `red` under Sparkling Wine = "Red Sparkling". `buildLabelMap()` emits composite keys (`category:subtype`) so lookups are always unambiguous, plus flat fallback keys for last-write-wins direct lookups.

## Consumers

`@cellarnode/ui`, `cellarnode-admin-dashboard-v2`, `cellarnode-importer-dashboard`, `producer-dashboard`, `cellarnode-elabel-frontend`. Classification source-of-truth is the backend V2 `reference_data` table → fetched via the framework adapter's TanStack Query options.

## Workflow

Build-in-lib-first / publish-then-update discipline is encoded in the `/cellarnode-component-workflow` skill — load it before touching this package from a consumer task.

## Agent skills

### Issue tracker

Linear, workspace `cellarnode`, team **CellarNode** (`CEL`) — Linear MCP first,
GraphQL `issueCreate` fallback. There are no GitHub issues. See `docs/agents/issue-tracker.md`.

### Triage labels

Linear states carry `needs-triage` (`Backlog`) and `wontfix` (`Canceled`); three new labels
carry `needs-info`, `ready-for-agent`, `ready-for-human`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context. ADRs are graph-anchored RepoSkein decisions, not `docs/adr/*.md`.
See `docs/agents/domain.md`.
