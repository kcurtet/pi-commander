---
name: inline
description: Inline small functions or variables
---

Inline the specified function or variable:

**When to inline:**
- Function is only called once or twice
- Function body is simpler than the call
- Variable is used only once
- Abstraction adds no clarity

**Process:**
1. Find all usages
2. Replace calls with function body
3. Substitute parameters with arguments
4. Remove the original definition
5. Clean up any dead code

**Considerations:**
- Does inlining hurt readability?
- Are there side effects to consider?
- Does the function provide useful documentation?

**Provide:**
- The function/variable to inline
- Or the code and let me identify candidates

Output will show the refactored code with explanations.
