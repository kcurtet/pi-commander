---
name: skill-create
description: Create a new skill from a prompt description
model: anthropic/claude-sonnet-4
thinking: medium
---

# Skill Creation Task

You are tasked with creating a new skill for the pi coding agent.

## Input Description

{args}

## Instructions

Follow these steps to create a comprehensive skill:

### 1. Skill Naming

- Suggest a concise, descriptive name (lowercase, hyphens only)
- Ask the user to confirm or provide an alternative
- Normalize the name: `name.toLowerCase().trim().replace(/[^a-z0-9-]/g, "-")`

### 2. File Location

- Target directory: `~/.pi/agent/skills/<skill-name>/`
- Target file: `SKILL.md`

### 3. Content Structure

Create the SKILL.md file with this structure:

```markdown
---
name: <skill-name>
description: <clear description max 150 chars>
---

# Skill: <Title>

## 📖 What It Does

<Brief overview of the skill's purpose and capabilities>

## 🎯 When to Use It

<Specific scenarios and use cases>

## 🚀 Quick Start

<Immediate, actionable steps to get started>

## 🛠️ Detailed Instructions

<Comprehensive guidance with subsections>

## 💡 Examples

<Copy-paste ready examples with explanations>

## 📋 Command Reference

| Command | Description | Example |
|---------|-------------|---------|
| ... | ... | ... |

## 🚨 Troubleshooting

<Common issues and solutions>

## ✅ Best Practices

<Tips for effective usage>

## 🔗 Related Resources

<Links to documentation, related skills, etc.>
```

### 4. Content Guidelines

- Use practical, real-world examples
- Include code blocks with proper language tags
- Add tables for command/option references
- Use emojis for section headers
- Make examples executable and copy-paste ready
- Focus on actionable guidance
- Include edge cases and common pitfalls
- Reference related tools/skills when relevant

### 5. Write the File

After generating the content:
1. Use the `write` tool to create the file
2. Confirm the skill was created successfully
3. Show the file path to the user

### 6. Post-Creation

Ask the user if they want to:
- Review and edit the skill
- Test the skill immediately
- Make any adjustments

## Important Notes

- Skills follow the Agent Skills standard (https://agentskills.io/specification)
- The frontmatter must include `name` and `description`
- Keep descriptions under 150 characters
- Use clear, concise language
- Prioritize practical utility over theoretical completeness
