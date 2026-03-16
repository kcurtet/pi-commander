---
name: api
description: Design or document REST/GraphQL APIs
---

Design or document an API:

**Design mode:** Given requirements, design the API structure

**Document mode:** Given code, generate API documentation

**Output includes:**

### Endpoints

**METHOD /path**
- Description
- Authentication required?
- Request body/params
- Response schema
- Error responses
- Example curl command

### Common patterns:
- REST conventions (resources, HTTP methods)
- Pagination (cursor/offset)
- Filtering and sorting
- Error response format
- Authentication (Bearer, API keys)
- Rate limiting headers

**Design principles:**
- Consistent naming (camelCase vs snake_case)
- Proper HTTP status codes
- Versioning strategy
- Idempotency where appropriate

**For GraphQL:**
- Schema definitions
- Query/Mutation examples
- N+1 prevention considerations

Specify REST or GraphQL and the use case.
