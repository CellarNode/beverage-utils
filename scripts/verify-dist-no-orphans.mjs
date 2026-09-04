#!/usr/bin/env node
/**
 * CEL-1660 build-hygiene fix — `npm run build` did not clean `dist/` first,
 * and `prepublishOnly` ran only `build`. After the PR #15 removal merged,
 * `dist/react/` still contained all four deleted `use-beverage-label-map.*`
 * artifacts (a stale local build from before the deletion): `index.js` no
 * longer referenced them, so nothing resolved through the package entry
 * point and `check-exports` stayed green — but `files: ["dist",
 * "!dist/canonical"]` meant a publish from that tree would ship the
 * "removed" hook anyway, still reachable by a deep import
 * (`@cellarnode/beverage-utils/react/use-beverage-label-map`). `build` now
 * cleans first (see the `clean` npm script), which makes this structurally
 * impossible in normal operation — this script is the second, independent
 * guard: it asserts `dist/` contains no artifact whose `src/` source no
 * longer exists, so a stale `dist/` (built without going through `npm run
 * build`, or meddled with by hand) fails loudly instead of publishing
 * silently.
 *
 * Every `.js` / `.d.ts` file under `dist/` must have a corresponding `.ts`
 * or `.tsx` file under `src/` at the same relative path. `.json` files
 * (e.g. `dist/canonical/reference-data.json`, emitted via tsc's
 * `resolveJsonModule` from the `src/canonical/reference-data.json` it
 * imports) must have a same-named counterpart under `src/`. `.map` files
 * are skipped — their `.js`/`.d.ts` sibling covers the same source.
 */

import { existsSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const DIST = "dist";
const SRC = "src";

if (!existsSync(DIST)) {
  console.error(`verify-dist-no-orphans: "${DIST}/" does not exist. Run \`npm run build\` first.`);
  process.exit(1);
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, out);
    } else {
      out.push(full);
    }
  }
  return out;
}

const distFiles = walk(DIST);
const orphans = [];
let checked = 0;

for (const distFile of distFiles) {
  const rel = relative(DIST, distFile);

  // Sourcemaps are covered by their .js/.d.ts sibling's own check.
  if (rel.endsWith(".js.map") || rel.endsWith(".d.ts.map")) continue;

  let candidates;
  if (rel.endsWith(".d.ts")) {
    const base = rel.slice(0, -".d.ts".length);
    candidates = [`${base}.ts`, `${base}.tsx`];
  } else if (rel.endsWith(".js")) {
    const base = rel.slice(0, -".js".length);
    candidates = [`${base}.ts`, `${base}.tsx`];
  } else if (rel.endsWith(".json")) {
    // Vendored via tsc's resolveJsonModule (e.g. dist/canonical/reference-data.json
    // <- src/canonical/reference-data.json) — copied verbatim, same relative path.
    candidates = [rel];
  } else {
    // Unknown file type (e.g. a stray README) — not this guard's concern.
    continue;
  }

  checked++;
  const exists = candidates.some((c) => existsSync(join(SRC, c)));
  if (!exists) orphans.push(rel);
}

if (orphans.length > 0) {
  console.error(
    `verify-dist-no-orphans: ${orphans.length} file(s) in "${DIST}/" have no corresponding source under "${SRC}/":`,
  );
  for (const o of orphans) console.error(`  - ${DIST}/${o}`);
  console.error(
    `\nThis means "${DIST}/" is stale relative to "${SRC}/" — a source file was deleted (or renamed) since the last time this tree was actually rebuilt from clean. Run \`npm run build\` (it cleans "${DIST}/" first) and re-run this check.`,
  );
  process.exit(1);
}

console.log(`verify-dist-no-orphans: OK — ${checked} dist artifact(s) checked, 0 orphans.`);
