---
name: doc
description: Generate documentation for code (JSDoc, docstrings, etc.)
---

Generate documentation for the following code:

**For functions/methods:**
- Brief description of purpose
- @param for each parameter with type and description
- @returns with type and description
- @throws if exceptions are possible
- @example with usage example

**For classes:**
- Class-level description
- Document public properties
- Document constructor parameters

**For modules/files:**
- File-level documentation
- Export summary

Use the appropriate format for the language:
- TypeScript/JavaScript: JSDoc
- Python: docstrings (Google or NumPy style)
- Rust: /// documentation comments
- Go: godoc format
- Java: Javadoc

Keep descriptions concise but complete. Avoid documenting obvious things.
