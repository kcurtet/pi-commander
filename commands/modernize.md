---
name: modernize
description: Update code to modern syntax and patterns
---

Modernize the following code to use current language features and best practices:

**Language-specific modernizations:**

**TypeScript/JavaScript:**
- var → const/let
- callbacks → async/await
- for loops → .map/.filter/.reduce where appropriate
- class components → hooks (React)
- Optional chaining (?.) and nullish coalescing (??)
- Template literals
- Destructuring
- Spread operator

**Python:**
- f-strings instead of .format() or %
- Type hints
- dataclasses or Pydantic
- pathlib instead of os.path
- Walrus operator where appropriate
- match statements (3.10+)

**General:**
- Use language idioms and patterns
- Apply latest API recommendations
- Remove deprecated patterns

**Output:**
- Modernized code
- List of modernizations applied
- Minimum version requirements
