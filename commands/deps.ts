import type { ExtensionCommandContext, ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { existsSync } from "fs";
import { join } from "path";

interface TSCommandModule {
  name?: string;
  description?: string;
  handler: (args: string, ctx: ExtensionCommandContext, pi: ExtensionAPI) => Promise<void> | void;
}

export default {
  name: "deps",
  description: "Analyze dependencies for updates and vulnerabilities",

  async handler(args: string, ctx: ExtensionCommandContext, pi: ExtensionAPI) {
    const cwd = ctx.cwd;

    // Detect package manager
    let cmd = "";
    let lockFile = "";

    if (existsSync(join(cwd, "package-lock.json"))) {
      cmd = "npm";
      lockFile = "package-lock.json";
    } else if (existsSync(join(cwd, "yarn.lock"))) {
      cmd = "yarn";
      lockFile = "yarn.lock";
    } else if (existsSync(join(cwd, "pnpm-lock.yaml"))) {
      cmd = "pnpm";
      lockFile = "pnpm-lock.yaml";
    } else if (existsSync(join(cwd, "Cargo.lock"))) {
      cmd = "cargo";
      lockFile = "Cargo.lock";
    } else if (existsSync(join(cwd, "poetry.lock"))) {
      cmd = "poetry";
      lockFile = "poetry.lock";
    } else if (existsSync(join(cwd, "requirements.txt"))) {
      cmd = "pip";
      lockFile = "requirements.txt";
    } else {
      ctx.ui.notify("No recognized package manager found", "warning");
      return;
    }

    ctx.ui.notify(`Detected ${cmd} (${lockFile})`, "info");

    // Check for outdated packages
    let outdatedCmd = "";
    switch (cmd) {
      case "npm":
        outdatedCmd = "npm outdated --json 2>/dev/null || echo '{}'";
        break;
      case "yarn":
        outdatedCmd = "yarn outdated --json 2>/dev/null || echo '[]'";
        break;
      case "pnpm":
        outdatedCmd = "pnpm outdated --json 2>/dev/null || echo '{}'";
        break;
      case "cargo":
        outdatedCmd = "cargo outdated 2>/dev/null || echo 'Run: cargo install cargo-outdated'";
        break;
      case "pip":
        outdatedCmd = "pip list --outdated --format=json 2>/dev/null || echo '[]'";
        break;
    }

    const result = await pi.exec("sh", ["-c", outdatedCmd], { timeout: 30000 });

    let output = `## 📦 Dependency Analysis (${cmd})\n\n`;
    output += `**Lock file:** ${lockFile}\n\n`;

    if (result.stdout.trim() && result.stdout !== "{}" && result.stdout !== "[]") {
      output += "### Outdated packages\n\n";
      output += "```json\n";
      output += result.stdout;
      output += "\n```\n\n";
    } else {
      output += "✅ All dependencies are up to date\n\n";
    }

    // Check for audit (npm/yarn/pnpm only)
    if (["npm", "yarn", "pnpm"].includes(cmd)) {
      output += "### Security audit\n\n";
      const auditCmd = cmd === "npm"
        ? "npm audit --json 2>/dev/null || echo '{}'"
        : cmd === "yarn"
        ? "yarn audit --json 2>/dev/null | head -50 || echo '{}'"
        : "pnpm audit --json 2>/dev/null || echo '{}'";

      const auditResult = await pi.exec("sh", ["-c", auditCmd], { timeout: 30000 });

      if (auditResult.stdout.includes("vulnerabilities") || auditResult.stdout.includes("critical") || auditResult.stdout.includes("high")) {
        output += "⚠️ Vulnerabilities found. Run the following for details:\n\n";
        output += "```bash\n";
        output += `${cmd} audit\n`;
        output += "```\n";
      } else {
        output += "✅ No known vulnerabilities\n";
      }
    }

    pi.sendUserMessage(output);
  },
} satisfies TSCommandModule;
