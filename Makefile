.PHONY: clean build typecheck test verify-dist check-exports publish release-install release-patch release-minor release-major help

## Build pipeline
clean:  ## Remove dist directory
	npm run clean

typecheck:  ## TypeScript type checking
	npm run typecheck

test:  ## Run unit tests (includes generated-file freshness checks)
	npm test

compile:  ## Compile TypeScript to dist/ (cleans dist/ first — CEL-1660 build-hygiene fix)
	npm run build

verify-dist:  ## CEL-1660 — assert dist/ has no artifact whose src/ source no longer exists
	npm run verify-dist

# `check-exports` (publint + arethetypeswrong) is deliberately NOT a
# prerequisite of `build`/`release-*`. `npx @arethetypeswrong/cli --pack .`
# exits non-zero on THIS package today independent of anything in this
# PR — verified on a clean checkout of main before this change — because
# the package ships ESM-only with no node10-compatible CJS fallback for
# the `./react` / `./vue` / `./angular` subpaths. That's a real, pre-existing
# gap (no CI job wires check-exports in either, so nobody's noticed it
# fails when its exit code isn't piped away), but it's a separate problem
# from the stale-dist bug this Makefile exists to fix, and chaining it into
# release-* would make every release fail for an unrelated reason. Run it
# manually when you want the publint/arethetypeswrong report; it is not a
# release gate here.
check-exports:  ## Manual-only: dist-orphan guard + publint + arethetypeswrong report (NOT a release gate — see comment above)
	npm run check-exports

build: typecheck test compile verify-dist  ## Full build: typecheck + test + compile (clean-first) + dist-orphan gate

## Publishing

# CEL-1660 — mirrors @cellarnode/ui's release-install/release-* shape.
# This repo has NO auth path configured for the agent session that wrote
# this Makefile — `npm publish` here returns ENEEDAUTH. Publishing remains
# a human action (Marcus); these targets exist so that action is a single
# command instead of a hand-run sequence, not so an agent can run them.
release-install:  ## Refresh node_modules from the lockfile (release pre-gate)
	npm ci --legacy-peer-deps

publish: build  ## Build (clean + typecheck + test + compile + dist-orphan gate) and publish current version to npm
	npm publish

release-patch:  ## Bump patch version, publish, and git tag
	$(MAKE) release-install && \
	$(MAKE) build && \
	npm version patch --no-git-tag-version && \
	npm publish && \
	git add package.json && \
	git commit -m "release(beverage-utils): $$(node -p "require('./package.json').version")" && \
	git tag "v$$(node -p "require('./package.json').version")"

release-minor:  ## Bump minor version, publish, and git tag
	$(MAKE) release-install && \
	$(MAKE) build && \
	npm version minor --no-git-tag-version && \
	npm publish && \
	git add package.json && \
	git commit -m "release(beverage-utils): $$(node -p "require('./package.json').version")" && \
	git tag "v$$(node -p "require('./package.json').version")"

release-major:  ## Bump major version, publish, and git tag
	$(MAKE) release-install && \
	$(MAKE) build && \
	npm version major --no-git-tag-version && \
	npm publish && \
	git add package.json && \
	git commit -m "release(beverage-utils): $$(node -p "require('./package.json').version")" && \
	git tag "v$$(node -p "require('./package.json').version")"

help:  ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'
