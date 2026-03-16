---
name: regex
description: Explain, debug, or generate regular expressions
---

Help with regular expressions:

**If given a regex:** Explain what it does in plain language, part by part

**If given a description:** Generate a regex that matches the pattern

**If given a regex and test cases:** Debug why it's not matching as expected

**Always include:**
1. The regex with explanation of each part
2. Example matches and non-matches
3. Common pitfalls or edge cases
4. If complex, suggest simpler alternatives

**Formats supported:**
- JavaScript/TypeScript: `/pattern/flags`
- Python: `r"pattern"` with `re` module
- Go: `regexp.MustCompile("pattern")`
- Rust: `Regex::new(r"pattern")`

**Example request formats:**
- "Explain this regex: /^(?:[a-z0-9._%+-]+)@(?:[a-z0-9-]+\.)+[a-z]{2,}$/i"
- "Generate a regex for phone numbers in format +XX XXX XXX XXX"
- "Why doesn't /\d{3}-\d{3}-\d{4}/ match 555.123.4567?"
