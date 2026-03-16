---
name: stash
description: Stash current changes with a descriptive message
---

Stash the current working directory changes. Follow these steps:

1. Run `git status` to see all changes
2. Run `git diff` to understand what will be stashed
3. Create a stash with a descriptive message: `git stash push -m "description"`

The stash message should:
- Briefly describe what changes are being stashed
- Include context about why (e.g., "WIP: auth refactor before pulling main")

If there are no changes to stash, inform the user instead of creating an empty stash.

To restore later, the user can run:
- `git stash pop` - apply and remove the stash
- `git stash apply` - apply but keep the stash
