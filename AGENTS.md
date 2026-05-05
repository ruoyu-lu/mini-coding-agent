# Repository Guidelines

## Project Structure & Module Organization

This is a small TypeScript CLI package. Source code lives in `src/`, with the executable entry point at `src/index.ts`. Compiled JavaScript is emitted to `dist/` by TypeScript and is referenced by both `main` and the `minicode` binary in `package.json`. Project configuration is kept at the repository root: `package.json`, `tsconfig.json`, and `pnpm-lock.yaml`. There is no dedicated test directory yet; when tests are added, prefer colocated `*.test.ts` files or a top-level `test/` directory for broader integration coverage.

## Build, Test, and Development Commands

Use pnpm, matching the recorded package manager version in `package.json`.

- `pnpm install`: install dependencies from `pnpm-lock.yaml`.
- `pnpm dev`: run the CLI directly from `src/index.ts` with `tsx`.
- `pnpm build`: compile TypeScript into `dist/`.
- `pnpm typecheck`: run `tsc --noEmit` without writing build output.
- `node dist/index.js init`: test the built CLI initialization flow after `pnpm build`.

## Coding Style & Naming Conventions

The project uses ES modules and strict TypeScript with `moduleResolution: "NodeNext"` and `target: "ES2022"`. Keep code in TypeScript, prefer explicit small functions, and avoid weakening strictness with `any` unless there is a clear boundary reason. Follow the existing style: two-space indentation in JSON, single quotes in TypeScript imports/strings, semicolons, `camelCase` variables/functions, and `PascalCase` types/classes. Keep CLI command names lowercase and action-oriented, for example `init`.

## Testing Guidelines

No test framework is currently configured. Until one is added, run `pnpm typecheck` and `pnpm build` before submitting changes, then manually exercise relevant CLI paths with `pnpm dev` or `node dist/index.js`. If adding automated tests, add a package script such as `pnpm test`, document the framework, and name test files with the `*.test.ts` suffix.

## Commit & Pull Request Guidelines

Recent commits use short conventional-style messages such as `feat: update CLI structure`. Prefer the same pattern: `feat:`, `fix:`, `docs:`, `refactor:`, or `test:` followed by a concise imperative summary. Pull requests should include a brief description, the commands run for validation, and any user-visible CLI behavior changes. Link related issues when available and include terminal output snippets only when they clarify behavior or failures.

## Security & Configuration Tips

The package depends on OpenAI-related SDKs and `dotenv`, so do not commit local `.env` files, API keys, generated `.minicode/` config, or memory files. Keep dependency changes intentional and preserve `pnpm-lock.yaml` whenever package versions change.
