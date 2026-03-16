# pi-commander

Extensión para [pi](https://github.com/badlogic/pi-mono) que carga comandos personalizados desde archivos markdown o TypeScript.

## Instalación

Añade a tu `~/.pi/agent/settings.json`:

```json
{
  "packages": [
    "git:github.com/kcurtet/pi-commander"
  ]
}
```

## Uso

Crea archivos `.md` o `.ts` en cualquiera de estas ubicaciones:

- `~/.pi/agent/commands/` - Comandos del sistema
- `~/.pi/commands/` - Comandos del usuario
- `.pi/commands/` - Comandos del proyecto

## Comandos Markdown

Formato con frontmatter opcional:

```markdown
---
name: mi-comando
model: claude-sonnet-4
thinking: high
description: Descripción del comando
---

Tu prompt aquí. Los argumentos se añaden al final.
```

### Frontmatter

| Campo | Descripción | Valores |
|-------|-------------|---------|
| `name` | Nombre del comando (por defecto: nombre del archivo) | string |
| `model` | Modelo a usar | `claude-sonnet-4`, `claude-opus-4`, etc. |
| `thinking` | Nivel de razonamiento | `off`, `minimal`, `low`, `medium`, `high`, `xhigh` |
| `description` | Descripción mostrada en `/help` | string |

## Comandos TypeScript

Para lógica más compleja, usa TypeScript:

```typescript
import type { ExtensionCommandContext, ExtensionAPI } from "@mariozechner/pi-coding-agent";

interface TSCommandModule {
  name?: string;
  description?: string;
  handler: (args: string, ctx: ExtensionCommandContext, pi: ExtensionAPI) => Promise<void> | void;
}

export default {
  name: "mi-comando",
  description: "Descripción del comando",

  async handler(args: string, ctx: ExtensionCommandContext, pi: ExtensionAPI) {
    // Acceso a herramientas
    const result = await pi.exec("git", ["status"]);

    // UI interactiva
    const choice = await ctx.ui.select("Elige:", ["A", "B"]);

    // Enviar mensaje al agente
    pi.sendUserMessage("Resultado: ...");
  },
} satisfies TSCommandModule;
```

### API disponible

- `pi.exec(cmd, args, options)` - Ejecutar comandos shell
- `pi.sendUserMessage(text)` - Enviar mensaje al agente
- `pi.setModel(model)` - Cambiar modelo
- `pi.setThinkingLevel(level)` - Cambiar nivel de thinking
- `ctx.ui.notify(msg, type)` - Notificación
- `ctx.ui.confirm(title, msg)` - Diálogo de confirmación
- `ctx.ui.select(title, options)` - Selección
- `ctx.ui.input(title, placeholder)` - Input de texto
- `ctx.ui.editor(title, content)` - Editor multilínea

## Comandos incluidos

### Markdown

| Comando | Descripción |
|---------|-------------|
| `/commit` | Analiza diff y crea commit descriptivo |
| `/stash` | Guarda cambios en stash con mensaje |
| `/review` | Review de código con best practices |
| `/explain` | Explicación simple de código |
| `/deep-think` | Análisis profundo con máximo razonamiento |

### TypeScript

| Comando | Descripción |
|---------|-------------|
| `/todo` | Extrae y lista todos los TODOs/FIXMEs del código |

## Configuración

Desactivar comandos por defecto en `~/.pi/agent/settings.json`:

```json
{
  "pi-commander": {
    "loadDefaults": false
  }
}
```

## Licencia

MIT
