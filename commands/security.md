---
name: security
thinking: high
description: Security audit - find vulnerabilities and unsafe patterns
---

Perform a security audit of the following code:

**Injection Vulnerabilities:**
- SQL injection
- Command injection
- XSS (Cross-Site Scripting)
- LDAP/XML/Path injection

**Data Exposure:**
- Hardcoded secrets/credentials
- Sensitive data in logs
- Insecure data storage
- Missing encryption

**Authentication/Authorization:**
- Weak password handling
- Missing access controls
- Session management issues
- Insecure defaults

**Dependencies:**
- Known vulnerable packages
- Outdated dependencies with security issues

For each finding:
- Severity: Critical/High/Medium/Low
- Description of the vulnerability
- Specific line/location
- Remediation steps with code example
