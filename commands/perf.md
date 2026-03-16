---
name: perf
thinking: high
description: Identify performance bottlenecks and suggest optimizations
---

Analyze the following code for performance issues:

1. **Algorithmic complexity**: Identify O(n²) or worse algorithms that could be optimized
2. **Memory usage**: Look for unnecessary allocations, large objects, memory leaks
3. **I/O patterns**: Batch operations, unnecessary reads/writes, missing caching
4. **Network calls**: N+1 queries, missing parallelization, redundant requests
5. **Loop inefficiencies**: Repeated calculations, unnecessary iterations

For each issue found:
- Explain why it's slow
- Estimate the impact (low/medium/high)
- Provide optimized code example

If no code is provided, examine the current file or ask what to analyze.
