---
name: env
description: Generate .env.example from codebase
---

Analyze the codebase and generate a .env.example file:

1. Search for environment variable usage:
   - `process.env.VAR_NAME` (Node.js)
   - `os.environ.get('VAR_NAME')` (Python)
   - `std::env::var("VAR_NAME")` (Rust)
   - `dotenv` patterns

2. For each variable found:
   - Variable name
   - Description (from comments if available)
   - Example value (or placeholder)
   - Whether it's required or optional

**Output format:**

```bash
# Database configuration
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
DATABASE_POOL_SIZE=10

# API Keys (required)
API_KEY=your-api-key-here
API_SECRET=your-api-secret-here

# Optional settings
LOG_LEVEL=info
DEBUG=false
```

Group related variables and add comments explaining their purpose.
