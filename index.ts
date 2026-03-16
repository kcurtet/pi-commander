/**
 * pi-commander - Command loader with startup resource summary
 *
 * Loads commands from multiple sources and displays a summary
 * of loaded resources (context, skills, extensions) at startup.
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

interface ResourceInfo {
  context: string | null;
  skills: Map<string, string[]>;  // source -> paths
  extensions: Map<string, string[]>;  // source -> paths
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
  const settingsPath = join(homedir(), ".pi/agent/settings.json");
  if (!existsSync(settingsPath)) return {};

  try {
    const content = readFileSync(settingsPath, "utf-8");
    return JSON.parse(content);
  } catch {
    return {};
  }
}

// ============================================================================
// Command Parsing
// ============================================================================

function parseFrontmatter(content: string): { frontmatter: CommandFrontmatter; body: string } {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return { frontmatter: {}, body: content.trim() };
  }

  const frontmatterStr = match[1];
  const body = content.slice(match[0].length).trim();
  const frontmatter: CommandFrontmatter = {};

  for (const line of frontmatterStr.split("\n")) {
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;

    const key = line.slice(0, colonIndex).trim();
    let value: string = line.slice(colonIndex + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (key === "name") frontmatter.name = value;
    else if (key === "model") frontmatter.model = value;
    else if (key === "thinking") {
      if (["off", "minimal", "low", "medium", "high", "xhigh"].includes(value)) {
        frontmatter.thinking = value as CommandFrontmatter["thinking"];
      }
    }
    else if (key === "description") frontmatter.description = value;
    else if (key === "input") {
      if (["enabled", "disabled", "required"].includes(value)) {
        frontmatter.input = value as CommandFrontmatter["input"];
      }
    }
  }

  return { frontmatter, body };
}

function loadMarkdownCommand(filePath: string, source: ParsedCommand["source"]): ParsedCommand | null {
  try {
    const content = readFileSync(filePath, "utf-8");
    const { frontmatter, body } = parseFrontmatter(content);
    const name = frontmatter.name || basename(filePath, ".md");

    return {
      name,
      path: filePath,
      prompt: body,
      frontmatter,
      source,
      type: "md",
    };
  } catch (err) {
    console.error(`[pi-commander] Error reading ${filePath}:`, err);
    return null;
  }
}

async function loadTypeScriptCommand(
  filePath: string,
  source: ParsedCommand["source"],
  pi: ExtensionAPI
): Promise<ParsedCommand | null> {
  try {
    const module = await import(filePath) as TSCommandModule | { default: TSCommandModule };
    const cmd = "default" in module ? module.default : module;

    if (!cmd.handler) {
      console.error(`[pi-commander] No handler exported in ${filePath}`);
      return null;
    }

    const name = cmd.name || basename(filePath, ".ts");

    return {
      name,
      path: filePath,
      frontmatter: {
        description: cmd.description,
      },
      source,
      type: "ts",
      handler: cmd.handler,
    };
  } catch (err) {
    console.error(`[pi-commander] Error loading ${filePath}:`, err);
    return null;
  }
}

async function loadCommandsFromPath(
  path: string,
  source: ParsedCommand["source"],
  pi: ExtensionAPI
): Promise<ParsedCommand[]> {
  const commands: ParsedCommand[] = [];

  if (!existsSync(path)) return commands;

  const files = readdirSync(path);
  for (const file of files) {
    const filePath = join(path, file);
    const stats = statSync(filePath);
    if (!stats.isFile()) continue;

    if (file.endsWith(".md")) {
      const cmd = loadMarkdownCommand(filePath, source);
      if (cmd) commands.push(cmd);
    } else if (file.endsWith(".ts")) {
      const cmd = await loadTypeScriptCommand(filePath, source, pi);
      if (cmd) commands.push(cmd);
    }
  }

  return commands;
}

async function discoverCommands(
  cwd: string,
  commandsConfig: boolean | string[],
  pi: ExtensionAPI
): Promise<ParsedCommand[]> {
  const commands: ParsedCommand[] = [];

  // Built-in commands from extension's commands folder
  if (commandsConfig !== false) {
    const builtinPath = join(dirname(new URL(import.meta.url).pathname), "commands");
    const builtinCommands = await loadCommandsFromPath(builtinPath, "builtin", pi);

    if (Array.isArray(commandsConfig)) {
      const requested = new Set(commandsConfig);
      commands.push(...builtinCommands.filter(cmd => requested.has(cmd.name)));
    } else {
      commands.push(...builtinCommands);
    }
  }

  // User commands (always loaded, can override builtin)
  const searchPaths: Array<{ path: string; source: ParsedCommand["source"] }> = [
    { path: join(homedir(), ".pi/agent/commands"), source: "agent" },
    { path: join(homedir(), ".pi/commands"), source: "user" },
    { path: join(cwd, ".pi/commands"), source: "project" },
  ];

  for (const { path, source } of searchPaths) {
    commands.push(...await loadCommandsFromPath(path, source, pi));
  }

  // Remove duplicates (later sources override earlier ones)
  const seen = new Map<string, ParsedCommand>();
  for (const cmd of commands) {
    seen.set(cmd.name, cmd);
  }

  return Array.from(seen.values());
}

// ============================================================================
// Resource Discovery
// ============================================================================

function discoverResources(): ResourceInfo {
  const home = homedir();
  const agentDir = join(home, ".pi/agent");

  const info: ResourceInfo = {
    context: null,
    skills: new Map(),
    extensions: new Map(),
  };

  // Context: AGENTS.md
  const agentsPath = join(agentDir, "AGENTS.md");
  if (existsSync(agentsPath)) {
    info.context = agentsPath;
  }

  // Skills
  const skillSources = [
    { path: join(agentDir, "skills"), source: "user" },
  ];

  // Add git packages skills
  const gitDir = join(agentDir, "git");
  if (existsSync(gitDir)) {
    const gitRepos = readdirSync(gitDir).filter(f => {
      const fp = join(gitDir, f);
      return statSync(fp).isDirectory() && !f.startsWith(".");
    });

    for (const repo of gitRepos) {
      const repoPath = join(gitDir, repo);

      // Walk subdirectories looking for SKILL.md files
      const walkDir = (dir: string, relPath: string) => {
        if (!existsSync(dir)) return;
        try {
          const entries = readdirSync(dir);
          for (const entry of entries) {
            const fullPath = join(dir, entry);
            let stat: ReturnType<typeof statSync>;
            try {
              stat = statSync(fullPath);
            } catch {
              continue;
            }

            if (stat.isDirectory()) {
              // Skip node_modules and hidden directories
              if (entry === "node_modules" || entry.startsWith(".")) continue;
              walkDir(fullPath, relPath ? `${relPath}/${entry}` : entry);
            } else if (entry === "SKILL.md") {
              const sourceKey = `git:github.com/${repo}`;
              if (!info.skills.has(sourceKey)) info.skills.set(sourceKey, []);
              info.skills.get(sourceKey)!.push(fullPath);
            }
          }
        } catch {
          // Ignore permission errors
        }
      };
      walkDir(repoPath, "");
    }
  }

  // Discover skills in directories
  for (const { path, source } of skillSources) {
    if (!existsSync(path)) continue;

    const skillFiles: string[] = [];
    const entries = readdirSync(path);

    for (const entry of entries) {
      const fullPath = join(path, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        // Check for SKILL.md in subdirectory
        const skillFile = join(fullPath, "SKILL.md");
        if (existsSync(skillFile)) {
          skillFiles.push(skillFile);
        }
      } else if (entry === "SKILL.md" || entry.endsWith(".md")) {
        skillFiles.push(fullPath);
      }
    }

    if (skillFiles.length > 0) {
      info.skills.set(source, skillFiles);
    }
  }

  // Extensions
  const extSources = [
    { path: join(agentDir, "extensions"), source: "user" },
  ];

  for (const { path, source } of extSources) {
    if (!existsSync(path)) continue;

    const extFiles: string[] = [];
    const entries = readdirSync(path);

    for (const entry of entries) {
      const fullPath = join(path, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        // Check for index.ts in subdirectory
        const indexFile = join(fullPath, "index.ts");
        if (existsSync(indexFile)) {
          extFiles.push(indexFile);
        }
      } else if (entry.endsWith(".ts")) {
        extFiles.push(fullPath);
      }
    }

    if (extFiles.length > 0) {
      info.extensions.set(source, extFiles);
    }
  }

  // Also check project-local extensions
  const projectExtPath = join(process.cwd(), ".pi/extensions");
  if (existsSync(projectExtPath)) {
    const extFiles: string[] = [];
    const entries = readdirSync(projectExtPath);

    for (const entry of entries) {
      const fullPath = join(projectExtPath, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        const indexFile = join(fullPath, "index.ts");
        if (existsSync(indexFile)) {
          extFiles.push(indexFile);
        }
      } else if (entry.endsWith(".ts")) {
        extFiles.push(fullPath);
      }
    }

    if (extFiles.length > 0) {
      info.extensions.set("project", extFiles);
    }
  }

  return info;
}

function formatResourceSummary(info: ResourceInfo, home: string): string[] {
  const lines: string[] = [];

  // Helper to make path relative to home with ~ prefix
  const formatPath = (p: string) => {
    if (p.startsWith(home)) {
      return "~" + p.slice(home.length);
    }
    return p;
  };

  // Context
  if (info.context) {
    lines.push("[Context]");
    lines.push(`  ${formatPath(info.context)}`);
    lines.push("");
  }

  // Skills
  if (info.skills.size > 0) {
    lines.push("[Skills]");
    for (const [source, paths] of info.skills) {
      lines.push(`  ${source}`);
      for (const p of paths) {
        lines.push(`    ${formatPath(p)}`);
      }
    }
    lines.push("");
  }

  // Extensions
  if (info.extensions.size > 0) {
    lines.push("[Extensions]");
    for (const [source, paths] of info.extensions) {
      lines.push(`  ${source}`);
      for (const p of paths) {
        lines.push(`    ${formatPath(p)}`);
      }
    }
  }

  return lines;
}

// ============================================================================
// Main Extension
// ============================================================================

export default function (pi: ExtensionAPI) {
  const settings = loadSettings();
  const showSummary = settings["pi-commander"]?.showSummary ?? true;
  const commandsConfig: boolean | string[] = settings["pi-commander"]?.commands ?? true;

  // Register skill via resources_discover
  pi.on("resources_discover", () => {
    const baseDir = dirname(new URL(import.meta.url).pathname);
    return {
      skillPaths: [join(baseDir, "SKILL.md")],
    };
  });

  // Register commands on session start
  pi.on("session_start", async (_event, ctx) => {
    // Load and register commands
    const commands = await discoverCommands(ctx.cwd, commandsConfig, pi);

    for (const cmd of commands) {
      pi.registerCommand(cmd.name, {
        description: cmd.frontmatter.description || `Execute command from ${cmd.path}`,
        handler: async (args, ctx) => {
          // TypeScript commands handle everything themselves
          if (cmd.type === "ts" && cmd.handler) {
            await cmd.handler(args, ctx, pi);
            return;
          }

          // Markdown commands: apply settings and send prompt
          if (cmd.type === "md" && cmd.prompt) {
            // Apply model if specified
            if (cmd.frontmatter.model) {
              const [provider, modelId] = cmd.frontmatter.model.includes("/")
                ? cmd.frontmatter.model.split("/")
                : ["anthropic", cmd.frontmatter.model];

              const model = ctx.modelRegistry.find(provider, modelId);

              if (model) {
                const success = await pi.setModel(model);
                if (!success) {
                  ctx.ui.notify(`No API key for model ${cmd.frontmatter.model}`, "warning");
                }
              } else {
                ctx.ui.notify(`Model not found: ${cmd.frontmatter.model}`, "warning");
              }
            }

            // Apply thinking level if specified
            if (cmd.frontmatter.thinking) {
              pi.setThinkingLevel(cmd.frontmatter.thinking);
            }

            // Handle input based on frontmatter setting
            const inputMode = cmd.frontmatter.input || "enabled"; // default: enabled
            const hasArgs = args && args.trim().length > 0;

            // Check if input is required but not provided
            if (inputMode === "required" && !hasArgs) {
              ctx.ui.notify(`Command '/${cmd.name}' requires input`, "error");
              ctx.ui.notify(`Usage: /${cmd.name} <input>`, "info");
              return;
            }

            // Build final prompt with args appended (if input is enabled/required and args exist)
            let finalPrompt = cmd.prompt;
            if ((inputMode === "enabled" || inputMode === "required") && hasArgs) {
              finalPrompt += `\n\n${args}`;
            }

            // Send as user message
            pi.sendUserMessage(finalPrompt);
          }
        },
      });
    }

    // Show resource summary
    if (showSummary && ctx.hasUI) {
      const home = homedir();
      const resources = discoverResources();
      const summary = formatResourceSummary(resources, home);

      if (summary.length > 0) {
        // Add command count info
        if (commands.length > 0) {
          const builtinCount = commands.filter(c => c.source === "builtin").length;
          const customCount = commands.length - builtinCount;
          summary.push("");
          summary.push(`[Commands] ${commands.length} loaded (${builtinCount} builtin, ${customCount} custom)`);
        }

        // Show as a temporary widget above editor
        ctx.ui.setWidget("pi-commander-startup", summary, { placement: "aboveEditor" });

        // Clear after 5 seconds
        setTimeout(() => {
          ctx.ui.setWidget("pi-commander-startup", undefined);
        }, 5000);
      }
    }
  });
}
