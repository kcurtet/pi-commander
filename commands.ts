import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
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
  prompt: string;
  frontmatter: CommandFrontmatter;
  source: "user" | "project" | "agent" | "builtin";
}

interface Settings {
  "pi-commander"?: {
    loadDefaults?: boolean;
  };
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

  // Parse YAML-like frontmatter
  for (const line of frontmatterStr.split("\n")) {
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;

    const key = line.slice(0, colonIndex).trim();
    let value: string = line.slice(colonIndex + 1).trim();

    // Remove quotes if present
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

function loadCommandsFromPath(path: string, source: ParsedCommand["source"]): ParsedCommand[] {
  const commands: ParsedCommand[] = [];

  if (!existsSync(path)) return commands;

  const files = readdirSync(path);
  for (const file of files) {
    if (!file.endsWith(".md")) continue;

    const filePath = join(path, file);
    const stats = statSync(filePath);
    if (!stats.isFile()) continue;

    try {
      const content = readFileSync(filePath, "utf-8");
      const { frontmatter, body } = parseFrontmatter(content);

      // Command name: frontmatter.name or filename without extension
      const name = frontmatter.name || basename(file, ".md");

      commands.push({
        name,
        path: filePath,
        prompt: body,
        frontmatter,
        source,
      });
    } catch (err) {
      console.error(`[pi-commander] Error reading ${filePath}:`, err);
    }
  }

  return commands;
}

function discoverCommands(cwd: string, loadDefaults: boolean): ParsedCommand[] {
  const commands: ParsedCommand[] = [];

  // Built-in commands from extension's commands folder
  if (loadDefaults) {
    const builtinPath = join(dirname(new URL(import.meta.url).pathname), "commands");
    commands.push(...loadCommandsFromPath(builtinPath, "builtin"));
  }

  // User commands
  const searchPaths: Array<{ path: string; source: ParsedCommand["source"] }> = [
    { path: join(homedir(), ".pi/agent/commands"), source: "agent" },
    { path: join(homedir(), ".pi/commands"), source: "user" },
    { path: join(cwd, ".pi/commands"), source: "project" },
  ];

  for (const { path, source } of searchPaths) {
    commands.push(...loadCommandsFromPath(path, source));
  }

  // Remove duplicates (later sources override earlier ones)
  // Priority: project > user > agent > builtin
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

    const commands = discoverCommands(ctx.cwd, loadDefaults);

    for (const cmd of commands) {
      pi.registerCommand(cmd.name, {
        description: cmd.frontmatter.description || `Execute prompt from ${cmd.path}`,
        handler: async (args, ctx) => {
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
        },
      });
    }

    if (commands.length > 0) {
      const builtinCount = commands.filter(c => c.source === "builtin").length;
      const customCount = commands.length - builtinCount;
      const parts: string[] = [];
      if (builtinCount > 0) parts.push(`${builtinCount} builtin`);
      if (customCount > 0) parts.push(`${customCount} custom`);
      ctx.ui.notify(`Loaded ${parts.join(" + ")} command(s)`, "info");
    }
  });
}
