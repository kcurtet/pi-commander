import type { ExtensionAPI, ExtensionCommandContext } from "@mariozechner/pi-coding-agent";
import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { join, basename, dirname } from "path";
import { homedir } from "os";

interface CommandFrontmatter {
  name?: string;
  model?: string;
  thinking?: "off" | "minimal" | "low" | "medium" | "high" | "xhigh";
  description?: string;
}

interface ParsedCommand {
  name: string;
  path: string;
  prompt?: string;
  frontmatter: CommandFrontmatter;
  source: "user" | "project" | "agent" | "builtin";
  type: "md" | "ts";
  handler?: (args: string, ctx: ExtensionCommandContext) => Promise<void> | void;
}

interface Settings {
  "pi-commander"?: {
    loadDefaults?: boolean;
  };
}

// Interface for TypeScript command modules
export interface TSCommandModule {
  name?: string;
  description?: string;
  handler: (args: string, ctx: ExtensionCommandContext, pi: ExtensionAPI) => Promise<void> | void;
}

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
    // Dynamic import of TypeScript module
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

async function discoverCommands(cwd: string, loadDefaults: boolean, pi: ExtensionAPI): Promise<ParsedCommand[]> {
  const commands: ParsedCommand[] = [];

  // Built-in commands from extension's commands folder
  if (loadDefaults) {
    const builtinPath = join(dirname(new URL(import.meta.url).pathname), "commands");
    commands.push(...await loadCommandsFromPath(builtinPath, "builtin", pi));
  }

  // User commands
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

export default function (pi: ExtensionAPI) {
  pi.on("session_start", async (_event, ctx) => {
    const settings = loadSettings();
    const loadDefaults = settings["pi-commander"]?.loadDefaults !== false;

    const commands = await discoverCommands(ctx.cwd, loadDefaults, pi);

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

            // Build final prompt with args appended
            let finalPrompt = cmd.prompt;
            if (args && args.trim()) {
              finalPrompt += `\n\n${args}`;
            }

            // Send as user message
            pi.sendUserMessage(finalPrompt);
          }
        },
      });
    }

    if (commands.length > 0) {
      const builtinCount = commands.filter(c => c.source === "builtin").length;
      const customCount = commands.length - builtinCount;
      const tsCount = commands.filter(c => c.type === "ts").length;
      const mdCount = commands.length - tsCount;

      const parts: string[] = [];
      if (builtinCount > 0) parts.push(`${builtinCount} builtin`);
      if (customCount > 0) parts.push(`${customCount} custom`);
      const typeInfo = `(${mdCount} md, ${tsCount} ts)`;

      ctx.ui.notify(`Loaded ${parts.join(" + ")} command(s) ${typeInfo}`, "info");
    }
  });
}
