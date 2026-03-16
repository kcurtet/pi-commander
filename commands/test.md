---
name: test
description: Generate unit tests for the provided code
---

Generate comprehensive unit tests for the following code:

**Coverage goals:**
1. **Happy path**: Normal expected usage
2. **Edge cases**: Boundary values, empty inputs, null/undefined
3. **Error cases**: Invalid inputs, exceptions, failures
4. **Integration points**: Mock external dependencies

**Test structure:**
- Use the project's existing test framework (Jest, Vitest, pytest, etc.)
- Follow AAA pattern (Arrange, Act, Assert)
- Descriptive test names that explain the scenario
- One assertion per test when possible

**Output:**
- Complete test file ready to run
- Include necessary imports and mocks
- Add comments explaining complex test scenarios

If no code is provided, examine the current file or ask what to test.
