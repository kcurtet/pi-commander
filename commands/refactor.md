---
name: refactor
description: Refactor code while preserving functionality
---

Refactor the following code to improve its structure while maintaining exact same behavior:

**Refactoring priorities:**
1. **Extract functions**: Break down large functions into smaller, focused ones
2. **Remove duplication**: DRY principle, extract common logic
3. **Improve naming**: Clear, descriptive names for variables and functions
4. **Simplify conditionals**: Guard clauses, early returns, remove nested ifs
5. **Reduce complexity**: Simplify logic, remove dead code
6. **Improve modularity**: Better separation of concerns

**Guidelines:**
- Preserve exact same behavior and outputs
- Don't change public API unless requested
- Make incremental, safe changes
- Explain each change and why it improves the code

**Output:**
- Refactored code
- Summary of changes made
- Any behavioral assumptions that were made
