---
name: dedupe
description: Find and eliminate code duplication
---

Analyze the codebase for duplication and suggest consolidations:

**Detection:**
1. Exact duplicates (copy-paste)
2. Similar patterns (structural duplication)
3. Near-duplicates (small variations)

**Analysis:**
- Where is the duplicated code?
- What are the variations?
- What's the common core?
- What should be parameterized?

**Refactoring options:**
- Extract to shared function
- Create utility module
- Use inheritance/composition
- Configuration-based approach

**Output:**
1. List of duplications found
2. Recommended abstraction
3. Refactored code
4. Migration plan (if complex)

Focus on high-value deduplication:
- Frequently changing code
- Bug-prone areas
- Business logic
