/**
 * pi-commander - Command loader with startup resource summary
 *
 * Loads commands from multiple sources and displays them at startup.
 */

import type { ExtensionAPI, ExtensionCommandContext } from "@mariozechner/pi-coding-agent";
import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { join, basename, dirname } from "path";
import { homedir } from "os";

// ============================================================================
// Types
// ============================================================================

interface CommandFrontmatter {
  name?: string;
  model?: string;
  thinking?: "off" | "minimal" | "low" | "medium" | "high" | "xhigh";
  description?: string;
  input?: "enabled" | "disabled" | "required";
}

interface ParsedCommand {
  name: string;
  path: string;
  prompt?: string;
  frontmatter: CommandFrontmatter;
  source: "user" | "project" | "agent" | "builtin";
  type: "md" | "ts";
  handler?: (args: string, ctx: ExtensionCommandContext, pi: ExtensionAPI) => Promise<void> | void;
}

interface Settings {
  "pi-commander"?: {
    /** true = all, false = none, string[] = specific commands */
    commands?: boolean | string[];
    /** Show resource summary at startup (default: true) */
    showSummary?: boolean;
  };
}

// Interface for TypeScript command modules
export interface TSCommandModule {
  name?: string;
  description?: string;
  handler: (args: string, ctx: ExtensionCommandContext, pi: ExtensionAPI) => Promise<void> | void;
}

// ============================================================================
// Settings
// ============================================================================

function loadSettings(): Settings {
  const settingsPath = join(homedir(), ".pi/agent/settings.json")
  if (!existsSync(settingsPath)) return {}
  try {
    const content = readFileSync(settingsPath, "utf-8")
    return JSON.parse(content) as Settings || {}
  } catch {
    return {}
  }
}

// ============================================================================
// Command Parsing
// ============================================================================

function parseFrontmatter(content: string): { frontmatter: CommandFrontmatter; body: string } {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/
  const match = content.match(frontmatterRegex)
  if (!match) {
    return { frontmatter: {}, body: content.trim() }
  }

  const frontmatterStr = match[1]
  const body = content.slice(match[0].length).trim()
  const frontmatter: CommandFrontmatter = {}

  for (const line of frontmatterStr.split("\n")) {
    const colonIndex = line.indexOf(":")
    if (colonIndex === -1) continue

    const key = line.slice(0, colonIndex).trim()
    let value: string = line.slice(colonIndex + 1).trim()

    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }

    if (key === "name") frontmatter.name = value;
    else if (key === "model") frontmatter.model = value;
    else if (key === "thinking") {
      if (["off", "minimal", "low", "medium", "high", "xhigh"].includes(value)) {
        frontmatter.thinking = value as CommandFrontmatter["thinking"]
      }
    } else if (key === "description") frontmatter.description = value;
    else if (key === "input") {
      if (["enabled", "disabled", "required"].includes(value)) {
        frontmatter.input = value as CommandFrontmatter["input"]
      }
    }
  }
  return { frontmatter, body }
}

function loadMarkdownCommand(filePath: string, source: ParsedCommand["source"]): ParsedCommand | null {
  try {
    const content = readFileSync(filePath, "utf-8")
    const { frontmatter, body } = parseFrontmatter(content)
    const name = frontmatter.name || basename(filePath, ".md")
    return {
      name,
      path: filePath,
      prompt: body,
      frontmatter,
      source,
      type: "md",
    }
  } catch (err) {
    console.error(`[pi-commander] Error reading ${filePath}:`, err)
    return null
  }
}

async function loadTypeScriptCommand(
  filePath: string,
  source: ParsedCommand["source"]
): Promise<ParsedCommand | null> {
  try {
    const module = await import(filePath) as TSCommandModule | { default: TSCommandModule }
    const cmd = "default" in module ? module.default : module

    if (!cmd.handler) {
      console.error(`[pi-commander] No handler exported in ${filePath}`)
      return null
    }

    const name = cmd.name || basename(filePath, ".ts")
    return {
      name,
      path: filePath,
      frontmatter: {
        description: cmd.description,
      },
      source,
      type: "ts",
      handler: cmd.handler,
    }
  } catch (err) {
    console.error(`[pi-commander] Error loading ${filePath}:`, err)
    return null
  }
}

// ============================================================================
// Command Discovery
// ============================================================================

async function loadCommandsFromPath(
  path: string,
  source: ParsedCommand["source"]
): Promise<ParsedCommand[]> {
  const commands: ParsedCommand[] = []

  if (!existsSync(path)) return commands

  const files = readdirSync(path)
  for (const file of files) {
    const filePath = join(path, file)
    const stats = statSync(filePath)
    if (!stats.isFile()) continue

    if (file.endsWith(".md")) {
      const cmd = loadMarkdownCommand(filePath, source)
      if (cmd) commands.push(cmd)
    } else if (file.endsWith(".ts")) {
      const cmd = await loadTypeScriptCommand(filePath, source)
      if (cmd) commands.push(cmd)
    }
  }

  return commands
}

async function discoverCommands(
  cwd: string,
  commandsConfig: boolean | string[]
): Promise<ParsedCommand[]> {
  const commands: ParsedCommand[] = []
  const home = homedir()

  // Built-in commands from extension's commands folder
  if (commandsConfig !== false) {
    const builtinPath = join(dirname(new URL(import.meta.url).pathname), "commands")
    // Normalize path for Windows compatibility
    const normalizedBuiltinPath = builtinPath.startsWith("file://") ? builtinPath.slice(7) : builtinPath
    const builtinCommands = await loadCommandsFromPath(normalizedBuiltinPath, "builtin")

    if (Array.isArray(commandsConfig)) {
      const requested = new Set(commandsConfig)
      commands.push(...builtinCommands.filter(cmd => requested.has(cmd.name)))
    } else {
      commands.push(...builtinCommands)
    }
  }

  // User commands (always loaded, can override builtin)
  const searchPaths: Array<{ path: string; source: ParsedCommand["source"] }> = [
    { path: join(home, ".pi/agent/commands"), source: "agent" },
    { path: join(home, ".pi/commands"), source: "user" },
    { path: join(cwd, ".pi/commands"), source: "project" },
  ]

  for (const { path, source } of searchPaths) {
    commands.push(...await loadCommandsFromPath(path, source))
  }

  // Remove duplicates (later sources override earlier ones)
  const seen = new Map<string, ParsedCommand>()
  for (const cmd of commands) {
    seen.set(cmd.name, cmd)
  }

  return Array.from(seen.values())
}

// ============================================================================
// Main Extension
// ============================================================================

export default function (pi: ExtensionAPI) {
  const settings = loadSettings()
  const showSummary = settings["pi-commander"]?.showSummary ?? true
  const commandsConfig: boolean | string[] = settings["pi-commander"]?.commands ?? true
  const home = homedir()
  const commands: ParsedCommand[] = []

  // Register skill via resources_discover
  pi.on("resources_discover", async () => {
    const baseDir = dirname(new URL(import.meta.url).pathname)
    return {
      skillPaths: [join(baseDir, "SKILL.md")],
    }
  })

  // Register commands on session start
  pi.on("session_start", async () => {
    // Load commands
    const loaded = await discoverCommands(process.cwd(), commandsConfig)
    commands.push(...loaded)

    // Register all commands
    for (const cmd of commands) {
      pi.registerCommand(cmd.name, {
        description: cmd.frontmatter.description || `Execute command from ${cmd.path}`,
        handler: async (args: string, ctx: ExtensionCommandContext) => {
          // TypeScript commands handle everything themselves
          if (cmd.type === "ts" && cmd.handler) {
            await cmd.handler(args, ctx, pi)
            return
          }

          // Markdown commands: apply settings and send prompt
          if (cmd.type === "md" && cmd.prompt) {
            // Apply model if specified
            if (cmd.frontmatter.model) {
              const [provider, modelId] = cmd.frontmatter.model.includes("/")
                ? cmd.frontmatter.model.split("/")
                : ["anthropic", cmd.frontmatter.model]
              const model = ctx.modelRegistry.find(provider, modelId)
              if (model) {
                const success = await pi.setModel(model)
                if (!success) ctx.ui.notify(`No API key for model ${cmd.frontmatter.model}`, "warning")
              } else {
                ctx.ui.notify(`Model not found: ${cmd.frontmatter.model}`, "warning")
              }
            }

            // Apply thinking level if specified
            if (cmd.frontmatter.thinking) {
              pi.setThinkingLevel(cmd.frontmatter.thinking)
            }

            // Handle input based on frontmatter setting
            const inputMode = cmd.frontmatter.input || "enabled" // default: enabled
            const hasArgs = args && args.trim().length > 0

            if (inputMode === "required" && !hasArgs) {
              ctx.ui.notify(`Command '/${cmd.name}' requires input`, "error")
              ctx.ui.notify(`Usage: /${cmd.name} <input>`, "info")
              return
            }

            // Build final prompt with args appended (if input is enabled/required and args exist)
            let finalPrompt = cmd.prompt
            if ((inputMode === "enabled" || inputMode === "required") && hasArgs) {
              finalPrompt += `\n\n${args}`
            }

            pi.sendUserMessage(finalPrompt)
          }
        },
      })
    }

    // Show resource summary at startup (like [Extensions] and [Skills])
    if (showSummary && commands.length > 0) {
      const lines: string[] = []

      // Group commands by source
      const bySource = new Map<ParsedCommand["source"], ParsedCommand[]>()
      for (const cmd of commands) {
        const list = bySource.get(cmd.source) ?? []
        list.push(cmd)
        bySource.set(cmd.source, list)
      }

      // Define display order: project > agent > user > builtin
      const order: ParsedCommand["source"][] = ["project", "agent", "user", "builtin"]

      lines.push("[Commands]")
      for (const source of order) {
        const cmds = bySource.get(source)
        if (!cmds || cmds.length === 0) continue

        lines.push(`  ${source}`)
        for (const cmd of cmds.sort((a, b) => a.name.localeCompare(b.name))) {
          const displayPath = cmd.path.startsWith(home)
            ? "~" + cmd.path.slice(home.length)
            : cmd.path
          lines.push(`    /${cmd.name} (${displayPath})`)
        }
      }

      // Display for 10 seconds
      pi.setWidget("pi-commander-startup", lines, { placement: "aboveEditor" })
      setTimeout(() => {
        pi.setWidget("pi-commander-startup", undefined)
      }, 10000)
    }
  })
}
