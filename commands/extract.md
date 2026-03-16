---
name: extract
description: Extract function/component from selected code
---

Extract the selected code into a separate function or component:

**Analysis:**
1. Identify inputs (parameters needed)
2. Identify outputs (return value)
3. Determine scope of extraction
4. Name appropriately

**After extraction:**
1. Create new function/component with clear name
2. Replace original code with call to new function
3. Pass necessary parameters
4. Handle return value

**Options:**
- Extract to same file or separate file
- Export as public or keep private
- Add types/documentation

**Guidelines:**
- Function should do one thing
- Clear, descriptive name
- Minimal parameters
- No side effects if possible

Provide the code to extract and specify:
- Target name (optional)
- Same file or new file
- Any specific requirements
