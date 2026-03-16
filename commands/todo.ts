import type { ExtensionCommandContext, ExtensionAPI } from "@mariozechner/pi-coding-agent";

interface TSCommandModule {
  name?: string;
  description?: string;
  handler: (args: string, ctx: ExtensionCommandContext, pi: ExtensionAPI) => Promise<void> | void;
}

export default {
  name: "todo",
  description: "Extract and list all TODOs, FIXMEs, and HACKs from the codebase",

  async handler(args: string, ctx: ExtensionCommandContext, pi: ExtensionAPI) {
    const patterns = ["TODO", "FIXME", "HACK", "XXX", "NOTE", "BUG"];
    const extensions = [".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".rs", ".java", ".c", ".cpp"];

    const patternArg = patterns.join("|");
    const extArg = extensions.map(e => `--include="*${e}"`).join(" ");

    const result = await pi.exec("sh", ["-c", `grep -rn -E "${patternArg}" ${extArg} . 2>/dev/null || true`], {
      timeout: 30000,
    });

    if (result.code !== 0 || !result.stdout.trim()) {
      ctx.ui.notify("No TODOs found", "info");
      return;
    }

    const lines = result.stdout.trim().split("\n");
    const grouped: Record<string, Array<{ file: string; line: number; text: string }>> = {};

    for (const line of lines) {
      const match = line.match(/^(.+?):(\d+):.*?(TODO|FIXME|HACK|XXX|NOTE|BUG):?\s*(.*)$/);
      if (match) {
        const [, file, lineNum, type, text] = match;
        if (!grouped[type]) grouped[type] = [];
        grouped[type].push({ file, line: parseInt(lineNum), text: text.trim() });
      }
    }

    let output = "## 📋 Codebase TODOs\n\n";
    const emojis: Record<string, string> = {
      TODO: "📌",
      FIXME: "🔧",
      HACK: "⚠️",
      XXX: "💀",
      NOTE: "📝",
      BUG: "🐛",
    };

    for (const [type, items] of Object.entries(grouped)) {
      output += `### ${emojis[type] || "•"} ${type} (${items.length})\n\n`;
      for (const item of items) {
        output += `- \`${item.file}:${item.line}\` - ${item.text}\n`;
      }
      output += "\n";
    }

    const viewInEditor = await ctx.ui.confirm("View results?", "Open in editor to see all TODOs?");
    if (viewInEditor) {
      await ctx.ui.editor("TODOs found:", output);
    } else {
      pi.sendUserMessage(output);
    }
  },
} satisfies TSCommandModule;
