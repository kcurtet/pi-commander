---
name: git-changelog
description: Generate changelog from git commits
---

Generate a changelog from recent git commits:

1. Run `git log --oneline --no-merges <last-tag>..HEAD` to get commits since last release
2. Categorize commits by type (feat, fix, refactor, etc.)
3. Generate a changelog in Keep a Changelog format

**Output format:**

## [Unreleased]

### Added
- New features

### Changed
- Changes to existing features

### Deprecated
- Features to be removed

### Removed
- Removed features

### Fixed
- Bug fixes

### Security
- Security improvements

**Guidelines:**
- Group related commits
- Rewrite commit messages to be user-friendly
- Include PR/issue references
- Omit internal/dev-only changes
