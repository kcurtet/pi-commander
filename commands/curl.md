---
name: curl
description: Convert between code and curl commands
---

Convert between curl commands and code:

**curl → code:**
Generate code in the specified language:
- JavaScript (fetch, axios)
- Python (requests, httpx)
- Go (net/http)
- Rust (reqwest)
- Node.js (fetch, axios)

**code → curl:**
Given code that makes an HTTP request, generate the equivalent curl command.

**Include:**
- All headers
- Request body (formatted)
- Authentication
- Query parameters

**Example conversions:**

curl → Python:
```bash
curl -X POST https://api.example.com/users \
  -H "Content-Type: application/json" \
  -d '{"name": "John"}'
```
↓
```python
import requests
response = requests.post(
    "https://api.example.com/users",
    headers={"Content-Type": "application/json"},
    json={"name": "John"}
)
```

Provide the curl command or code snippet to convert.
