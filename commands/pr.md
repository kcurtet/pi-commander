---
name: pr
description: Generate pull request description from changes
---

Analyze the current git changes and generate a pull request description:

1. Run `git log main..HEAD --oneline` to see commits in this branch
2. Run `git diff main...HEAD --stat` to see file changes
3. Run `git diff main...HEAD` to understand the changes

**Generate PR description with:**

## Summary
Brief description of what this PR does and why

## Changes
- Bullet list of key changes
- Group by feature/area if complex

## Type of change
- [ ] Bug fix (non-breaking change fixing an issue)
- [ ] New feature (non-breaking change adding functionality)
- [ ] Breaking change (fix or feature causing existing functionality to change)
- [ ] Refactor (code change without fixing or adding features)
- [ ] Documentation update

## Testing
How was this tested? What tests were added?

## Screenshots (if applicable)

## Checklist
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No new warnings introduced
- [ ] Tests added/updated

Make the description concise but informative.
