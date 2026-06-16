---
name: llm-wiki
description: >
  Use when the user mentions wiki, ingest, llm-wiki, knowledge base, or wants to
  accumulate persistent project knowledge. Implements Karpathy's LLM Wiki pattern:
  an LLM-maintained wiki at `llm-wiki/` that sits between raw sources and queries,
  building a compounding knowledge base rather than re-deriving knowledge from
  scratch on every question.
version: 1.0.0
license: MIT
---

# LLM Wiki — SRV Project Knowledge Base

This skill maintains a persistent, LLM-compiled wiki at `llm-wiki/` for the SRV monorepo. The wiki accumulates architectural knowledge, domain model understanding, design decisions, and conventions as you work on the project — instead of re-discovering them on every session.

## Architecture

Three layers:

1. **Raw sources** (`llm-wiki/raw/`) — immutable source materials you drop in: specs, meeting notes, design docs, external references. The LLM reads from here but never modifies.
2. **The wiki** (`llm-wiki/wiki/`) — LLM-generated markdown pages: summaries, entity docs, concept pages, cross-linked with `[[wikilinks]]`. The LLM owns this layer entirely.
3. **This skill** — the schema that tells the LLM how to structure and maintain the wiki.

## Directory Layout

```
llm-wiki/
├── raw/
│   ├── specs/            # Feature requirements, PRDs
│   ├── meetings/          # Meeting notes, sync transcripts
│   └── references/        # External docs (Firebase, ICP, Expo)
├── wiki/
│   ├── architecture/      # System architecture pages
│   ├── backend/           # ICP canisters, Firebase Functions
│   ├── frontend/          # React/Vite component tree, routing
│   ├── mobile/            # Expo/RN structure and patterns
│   ├── domain/            # Business entities and rules
│   ├── decisions/         # Design decisions with rationale
│   ├── conventions/       # Evolved coding patterns
│   ├── operations/        # CI/CD, deployment, debugging
│   ├── index.md           # Page catalog (auto-maintained)
│   └── log.md             # Append-only activity log
```

## When to Use

Use this skill when the user says anything involving:
- "wiki" or "llm-wiki"
- "ingest" a document, source, or file
- "query" or "ask" the wiki
- "lint" or "health-check" the wiki
- "knowledge base" or "project knowledge"
- "update" wiki pages
- "index" or "log" in context of the wiki

## Operations

### 1. Ingest

The user drops a source into `llm-wiki/raw/` (or asks you to write one there) and says "ingest this." Steps:

1. **Read the source** from `llm-wiki/raw/<path>`.
2. **Discuss** key takeaways with the user to understand what to emphasize.
3. **Write summary pages** in the appropriate `llm-wiki/wiki/` subdirectory:
   - One page per major concept/entity/decision.
   - Use `[[Page Name]]` wikilinks to cross-reference existing pages.
   - Add YAML frontmatter: `tags`, `date`, `sources` (paths to raw files).
4. **Update existing pages** that are touched by the new source — revise summaries, note contradictions, strengthen or challenge claims.
5. **Update `index.md`**: add the new page(s) with a one-line summary under the correct category.
6. **Append to `log.md`**: `## [YYYY-MM-DD] ingest | <Source Title>` with brief notes on what was added/changed.

### 2. Query

The user asks a question about the project. Steps:

1. **Read `index.md`** to find relevant pages.
2. **Read the identified pages** from `llm-wiki/wiki/`.
3. **Synthesize an answer** with citations to specific wiki pages (`[[Page Name]]`).
4. If the answer produces valuable new knowledge (comparison, analysis, connection), **file it as a new wiki page** and update index + log.

### 3. Lint

The user says "lint the wiki." Run a health check:

- **Orphans**: pages with no inbound `[[wikilinks]]`.
- **Missing cross-refs**: concepts mentioned in pages that lack their own page.
- **Contradictions**: conflicting claims across pages (flag, don't resolve — ask user).
- **Stale claims**: claims that newer sources have superseded.
- **Gaps**: topics the user could explore, sources to find.

Write findings to a lint report page and append to log.

## Page Format

Every wiki page follows this convention:

```markdown
---
tags: [architecture, backend]
date: 2026-06-16
sources:
  - raw/specs/feature-x.md
related:
  - [[Related Page]]
  - [[Another Page]]
---

# Page Title

One-paragraph summary of what this page covers.

## Overview

Body content using `[[Wikilinks]]` to reference other pages.

## Details

...

## References

- Source: `raw/specs/feature-x.md`
```

## Index Maintenance

`index.md` is organized by category matching the subdirectory structure. Each entry is:

```markdown
### Category

- [[Page Name]] — One-line summary of what the page covers
```

Update it on every ingest. When querying, read it first to locate relevant pages.

## Log Format

```markdown
## [2026-06-16] ingest | Feature X Design

- Created [[Feature X Architecture]]
- Updated [[Authentication Flow]] with new token handling
- Raw source: `raw/specs/feature-x.md`
```

Each entry starts with `## [YYYY-MM-DD]` so it's parseable with `grep "^## \[" log.md | tail -5`.

## Cross-Referencing Rules

- Always use `[[Page Name]]` when mentioning another wiki page.
- If a concept is important enough to reference in 2+ pages, it needs its own page.
- On ingest, scan all existing pages for mentions of the new source's topics and update cross-refs.
- Typed relationships in frontmatter `related:` section for stronger links.

## Integration Notes

- The wiki complements `AGENTS.md` — AGENTS.md has session-level project context; the wiki has accumulated deep knowledge.
- Existing `docs/` directory and top-level `.md` plan files (e.g. `CHAT-MEDIA-PLAN.md`) are good initial ingest sources.
- The wiki is plain markdown in a git repo — version history, branching, and collaboration come for free.
- At small scale, `index.md` is sufficient for navigation. No vector DB or embedding pipeline needed.
