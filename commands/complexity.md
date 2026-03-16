---
name: complexity
description: Analyze code complexity and suggest simplifications
---

Analyze the complexity of the following code:

**Metrics:**
1. **Cyclomatic complexity**: Number of decision points
2. **Cognitive complexity**: How hard to understand
3. **Nesting depth**: Levels of indentation
4. **Function length**: Lines of code
5. **Parameter count**: Number of arguments

**For each metric:**
- Current value
- Threshold (recommended max)
- Assessment (OK/Warning/Critical)

**Simplification suggestions:**
- Reduce nesting (guard clauses, early returns)
- Break into smaller functions
- Reduce branch complexity
- Extract complex conditions
- Remove dead code

**Output:**
1. Complexity report
2. Specific problem areas
3. Refactoring suggestions with code examples
4. Priority order for addressing

Target functions with complexity > 10 for refactoring.
