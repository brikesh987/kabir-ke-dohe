# AGENTS.md — Development & Operating Guide for AI Agents

Welcome to **`kabir-ke-dohe`**! This repository is a standalone generator and collection store of Saint Kabir Das's couplets (दोहे) formatted in Markdown.

---

## 1. Project Overview & Architecture

- **Purpose**: Fetches Kabir couplets (text and Hindi meanings) from the live REST API and generates structured, formatted Markdown collection files (`docs/collection-XX-to-YY.md`), with 50 couplets per page.
- **Data Source**: Live API endpoint `https://kabirdoheapi.vercel.app/api/couplets?per_page=50&page={n}` (overridable via `COUPLETS_API_URL` env var).
- **Output Directory**: `docs/` (46 collection files currently generated and committed).
- **Core Script**: `src/build-collections.ts` handles API fetching with retries, formatting lines at the danda (`।`), applying Devanagari numerals, formatting with Prettier, and appending SEO tags.

---

## 2. Directory Structure

```
kabir-ke-dohe/
├── docs/                       # Generated markdown collections (collection-01-to-50.md, etc.)
├── src/                        # TypeScript source files
│   ├── build-collections.ts    # Main build generator script
│   └── types.ts                # TypeScript interface definitions (ApiPost, ApiResponse, CollectionEntry)
├── README.md                   # Public repository documentation & index of couplet collections
├── AGENTS.md                   # Operating guidelines for AI coding assistants
├── package.json                # Project dependencies, scripts, and package metadata
├── tsconfig.json               # TypeScript configuration
├── eslint.config.mjs           # ESLint configuration (flat config)
└── prettier.config.mjs         # Prettier formatting rules
```

---

## 3. Toolchain & Development Commands

This project uses **Bun** as the JavaScript runtime and package manager.

| Command                | Purpose                          | Notes                                                |
| :--------------------- | :------------------------------- | :--------------------------------------------------- |
| `bun install`          | Install workspace dependencies   | Populates local `node_modules`                       |
| `bun run tsc`          | Run TypeScript type checking     | Strict mode enforced; must pass clean (exit 0)       |
| `bun run lint`         | Run ESLint check                 | Flat config using `@vijayhardaha/dev-config`         |
| `bun run lint:fix`     | Automatically fix lint errors    | Fixes auto-fixable formatting and lint issues        |
| `bun run format`       | Run Prettier format write        | Formats files in place                               |
| `bun run format:check` | Check Prettier formatting        | Fails if any file is unformatted                     |
| `bun run build`        | Regenerate `docs/` from live API | Network access to `kabirdoheapi.vercel.app` required |

---

## 4. Coding Standards & Conventions

- **TypeScript Strictness**:
  - `noImplicitAny: true` is enabled. Never use `any` (use `unknown` or exact types).
  - Explicit function return types and standard JSDoc comments on exported and helper functions.
- **Naming Conventions**:
  - `kebab-case` for file names (e.g., `build-collections.ts`).
  - `camelCase` for functions and variables.
  - `SCREAMING_SNAKE_CASE` for global module constants (e.g., `ENTRIES_PER_FILE`, `API_BASE_URL`).
- **Markdown & Content Generation**:
  - Couplet lines must break cleanly at danda (`।`).
  - The final line of each couplet uses double danda (`।।`), Devanagari numerals (e.g., `।।१।।`), and ending double danda (`।।`).
  - Hindi meaning is prefixed with `**अर्थ:**`.
  - Hidden SEO tags comment block is appended to each markdown file after Prettier formatting.

---

## 5. Guidelines for AI Agents

1. **Verification**: Before completing any task, always execute:
   ```bash
   bun run tsc && bun run lint && bun run format:check
   ```
2. **Docs Integrity**: If `build-collections.ts` or formatting logic is modified, run `bun run build` to verify the generated markdown files in `docs/` render correctly.
3. **No Unintended Changes**: Do not mutate or touch files outside this repository directory (`/Users/vijay/xoxo/apps/kabir-ke-dohe`).
