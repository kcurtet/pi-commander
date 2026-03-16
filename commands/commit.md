---
name: commit
description: Stage and commit current changes with a descriptive message
---

Analyze the current git diff and create a meaningful commit. Follow these steps:

1. Run `git status` to see all changes
2. Run `git diff` and `git diff --staged` to understand what changed
3. Stage relevant files with `git add` (group related changes logically)
4. Create a commit with a clear, descriptive message following conventional commits format:
   - `feat:` for new features
   - `fix:` for bug fixes
   - `refactor:` for code restructuring
   - `docs:` for documentation
   - `test:` for tests
   - `chore:` for maintenance

The commit message should:
- Have a concise subject line (50 chars max)
- Use imperative mood ("add feature" not "added feature")
- Explain *why* the change was made, not just *what*

Do NOT commit if:
- There are no meaningful changes
- The user hasn't requested this action
