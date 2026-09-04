#!/usr/bin/env node
/**
 * Vendors cellarnode-backend-v2's generated canonical reference-data JSON
 * into this package (CEL-1604 D13/D27).
 *
 * Backend half (PR #608) commits
 * `apps/cellarnode/src/db/canonical/reference-data.json` — a deterministic
 * dump of `reference-data.ts` (the Drizzle-seeded canonical rows) with a
 * `$meta` header (generator, sourceFile, schemaVersion, entryCount) plus a
 * `data` array of `{ dataId, canonicalVersion, jsonData }` rows sorted by
 * `dataId`. This script copies that file deterministically into
 * `src/canonical/reference-data.json`, re-serialized with a stable 2-space
 * indent, and records provenance in `src/canonical/SYNC.md`.
 *
 * Pure filesystem copy — never touches the network or a database. Run this
 * whenever the backend canonical row set changes, then re-run
 * `pnpm test` to confirm the parity suite (`__tests__/canonical-parity.test.ts`)
 * still passes.
 *
 * Usage:
 *   node scripts/sync-canonical.mjs [path-to-backend-reference-data.json]
 *   pnpm sync-canonical -- /absolute/path/to/reference-data.json
 *
 * Default source path assumes a CellarNode sibling checkout layout:
 *   ../cellarnode-backend-v2/apps/cellarnode/src/db/canonical/reference-data.json
 */
import { readFile, writeFile } from "node:fs/promises";
import { resolve, relative, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const PACKAGE_ROOT = fileURLToPath(new URL("..", import.meta.url));
const DEFAULT_SOURCE = resolve(
  PACKAGE_ROOT,
  "../cellarnode-backend-v2/apps/cellarnode/src/db/canonical/reference-data.json",
);
const DEST_JSON = resolve(PACKAGE_ROOT, "src/canonical/reference-data.json");
const DEST_SYNC_MD = resolve(PACKAGE_ROOT, "src/canonical/SYNC.md");

/**
 * Schema versions this package knows how to consume. Bump alongside a code
 * change in src/canonical/index.ts whenever the backend's generator changes
 * `$meta.schemaVersion` in a way this package's accessors need to handle.
 */
const SUPPORTED_SCHEMA_VERSIONS = [1];

async function main() {
  const sourceArg = process.argv[2];
  const sourcePath = sourceArg ? resolve(process.cwd(), sourceArg) : DEFAULT_SOURCE;

  let raw;
  try {
    raw = await readFile(sourcePath, "utf8");
  } catch (cause) {
    throw new Error(
      `Could not read backend canonical JSON at ${sourcePath}. Pass an explicit ` +
        `path as the first argument (e.g. the backend's worktree path) if the ` +
        `default sibling-checkout location doesn't apply here.`,
      { cause },
    );
  }

  /** @type {{ $meta: { generator: string; sourceFile: string; schemaVersion: number; entryCount: number }; data: Array<{ dataId: string; canonicalVersion: number; jsonData: unknown }> }} */
  const parsed = JSON.parse(raw);

  if (!parsed || typeof parsed !== "object" || !parsed.$meta || !Array.isArray(parsed.data)) {
    throw new Error(
      `${sourcePath} does not look like a canonical reference-data.json ` +
        `(expected top-level "$meta" object and "data" array).`,
    );
  }

  const { $meta } = parsed;
  if (!SUPPORTED_SCHEMA_VERSIONS.includes($meta.schemaVersion)) {
    throw new Error(
      `Unsupported $meta.schemaVersion ${$meta.schemaVersion} in ${sourcePath}. ` +
        `This package supports schema version(s) ${SUPPORTED_SCHEMA_VERSIONS.join(", ")}. ` +
        `Update SUPPORTED_SCHEMA_VERSIONS in scripts/sync-canonical.mjs and the ` +
        `accessors in src/canonical/index.ts before re-running the sync.`,
    );
  }

  if ($meta.entryCount !== parsed.data.length) {
    throw new Error(
      `$meta.entryCount (${$meta.entryCount}) does not match data.length ` +
        `(${parsed.data.length}) in ${sourcePath} — refusing to vendor a JSON ` +
        `file that fails its own internal invariant.`,
    );
  }

  // Validate row shape + dataId uniqueness before vendoring — a malformed
  // or duplicated row would otherwise silently ship broken input to
  // src/canonical/index.ts's accessors (CEL-1604 review fixup, P1-4).
  const seenDataIds = new Set();
  parsed.data.forEach((row, i) => {
    if (!row || typeof row !== "object") {
      throw new Error(`${sourcePath}: data[${i}] is not an object.`);
    }
    if (typeof row.dataId !== "string" || row.dataId.length === 0) {
      throw new Error(`${sourcePath}: data[${i}] is missing a non-empty string "dataId".`);
    }
    if (!("jsonData" in row)) {
      throw new Error(`${sourcePath}: data[${i}] ("${row.dataId}") is missing "jsonData".`);
    }
    if (seenDataIds.has(row.dataId)) {
      throw new Error(
        `${sourcePath}: duplicate "dataId" "${row.dataId}" at data[${i}] — canonical ` +
          `rows must have a unique dataId.`,
      );
    }
    seenDataIds.add(row.dataId);
  });

  // Re-serialize with a stable, diff-friendly 2-space indent regardless of
  // how the source file was formatted.
  const sortedData = [...parsed.data].sort((a, b) => a.dataId.localeCompare(b.dataId));
  const normalized = { $meta: parsed.$meta, data: sortedData };
  const output = `${JSON.stringify(normalized, null, 2)}\n`;

  // Only touch the vendored JSON + SYNC.md when the content actually
  // changed — a no-op sync (nothing changed on the backend since the last
  // run) should leave `git status` clean instead of dirtying SYNC.md's
  // timestamp every time someone runs this script (CEL-1604 review
  // fixup, P1-4).
  let previousOutput = null;
  try {
    previousOutput = await readFile(DEST_JSON, "utf8");
  } catch {
    // First sync — no existing vendored file yet.
  }
  const jsonChanged = previousOutput !== output;

  if (jsonChanged) {
    await writeFile(DEST_JSON, output, "utf8");

    const syncedAt = new Date().toISOString();
    const dataIds = sortedData.map((row) => `\`${row.dataId}\` (v${row.canonicalVersion})`).join(", ");

    // Best-effort provenance: if the source file lives inside a git working
    // tree, record the source repo (by origin remote, not the filesystem
    // path — a per-ticket worktree path like
    // `.claude/worktrees/cel-1604-canonical-json` gets pruned after merge and
    // would go stale in a committed SYNC.md) and its HEAD SHA. Never fails
    // the sync — a missing/unclean git tree just omits these lines
    // (CEL-1604 review fixup, P1-4).
    let sourceSha = null;
    let sourceRepoLabel = null;
    try {
      sourceSha = execFileSync("git", ["-C", dirname(sourcePath), "rev-parse", "HEAD"], {
        encoding: "utf8",
      }).trim();
      try {
        const originUrl = execFileSync(
          "git",
          ["-C", dirname(sourcePath), "remote", "get-url", "origin"],
          { encoding: "utf8" },
        ).trim();
        // "git@github.com:CellarNode/cellarnode-backend-v2.git" or
        // "https://github.com/CellarNode/cellarnode-backend-v2.git" -> "CellarNode/cellarnode-backend-v2"
        const match = originUrl.match(/[:/]([^/]+\/[^/]+?)(?:\.git)?$/);
        sourceRepoLabel = match ? match[1] : originUrl;
      } catch {
        // No "origin" remote — fall back to the git toplevel dir name, which
        // survives a worktree checkout (unlike the ticket-specific worktree
        // path itself).
        const toplevel = execFileSync(
          "git",
          ["-C", dirname(sourcePath), "rev-parse", "--show-toplevel"],
          { encoding: "utf8" },
        ).trim();
        sourceRepoLabel = basename(toplevel);
      }
    } catch {
      // Source isn't inside a git repo (or git isn't available) — skip.
    }

    const syncNote = `# Canonical reference-data sync log

Vendored copy of \`${$meta.sourceFile}\` from \`cellarnode-backend-v2\`
(CEL-1604 D13/D27). Regenerate with \`pnpm sync-canonical\`; never hand-edit
\`reference-data.json\`.

- **Last synced:** ${syncedAt}
${sourceRepoLabel ? `- **Source repo:** \`${sourceRepoLabel}\`\n` : ""}${sourceSha ? `- **Source commit:** \`${sourceSha}\`\n` : ""}- **Backend generator:** \`${$meta.generator}\`
- **Backend source file:** \`${$meta.sourceFile}\`
- **Schema version:** ${$meta.schemaVersion}
- **Entry count:** ${$meta.entryCount}
- **Row ids:** ${dataIds}

Run \`pnpm test\` after every sync — \`__tests__/canonical-parity.test.ts\`
fails loudly if any shipped static in this package has drifted from the rows
vendored here.
`;
    await writeFile(DEST_SYNC_MD, syncNote, "utf8");
  } else {
    console.log(
      `No change in vendored canonical data (already in sync with ${sourcePath}) — ` +
        `leaving ${relative(PACKAGE_ROOT, DEST_JSON)} and ${relative(PACKAGE_ROOT, DEST_SYNC_MD)} untouched.`,
    );
  }

  // Re-derive src/classifications.generated.ts and
  // src/aroma-descriptors.generated.ts from the vendored canonical JSON on
  // EVERY successful sync, including the no-change branch above — so a
  // sync never leaves a generated literal stale (CEL-1604 review fixup,
  // P0-1; CEL-1618 regression fix: the early `return` on the no-change path
  // used to skip regeneration entirely, silently reintroducing the same
  // staleness bug for both generated files). `pnpm check-classifications-fresh`
  // / the aroma-descriptors freshness check (part of `npm test`) catches it
  // if this step is ever skipped or its output hand-edited.
  execFileSync(
    process.execPath,
    [resolve(PACKAGE_ROOT, "scripts/generate-classifications.mjs")],
    { stdio: "inherit" },
  );
  execFileSync(
    process.execPath,
    [resolve(PACKAGE_ROOT, "scripts/generate-aroma-descriptors.mjs")],
    { stdio: "inherit" },
  );

  if (jsonChanged) {
    console.log(`Synced ${sortedData.length} canonical rows from:\n  ${sourcePath}`);
    console.log(`  -> ${relative(PACKAGE_ROOT, DEST_JSON)}`);
    console.log(`  -> ${relative(PACKAGE_ROOT, DEST_SYNC_MD)}`);
  } else {
    console.log("Regenerated generated literals from the already-synced canonical JSON.");
  }
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exitCode = 1;
});
