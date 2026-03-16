---
name: ignore
description: Generate .gitignore for the project
---

Analyze the project and generate an appropriate .gitignore:

**Detect project type from:**
- package.json → Node.js
- Cargo.toml → Rust
- pyproject.toml, requirements.txt → Python
- go.mod → Go
- pom.xml, build.gradle → Java
- *.csproj → C#/.NET

**Include patterns for:**
1. **Language-specific**: Build artifacts, compiled files, caches
2. **IDE/Editor**: .vscode, .idea, *.swp
3. **OS**: .DS_Store, Thumbs.db
4. **Dependencies**: node_modules, venv, target
5. **Environment**: .env, .env.local
6. **Logs**: *.log, logs/
7. **Build outputs**: dist/, build/, out/

**Output:**
Complete .gitignore file with sections commented by category

If .gitignore already exists, suggest additions rather than replacement.
