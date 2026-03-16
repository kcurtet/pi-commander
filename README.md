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

### 🔍 Análisis y Debugging

| Comando | Descripción |
|---------|-------------|
| `/debug` | Analiza errores y tracebacks, sugiere soluciones |
| `/perf` | Identifica cuellos de botella y optimizaciones |
| `/security` | Auditoría de seguridad del código |
| `/deps` | Analiza dependencias, busca actualizaciones y vulnerabilidades |
| `/complexity` | Calcula complejidad y sugiere simplificaciones |

### 📝 Generación de Código

| Comando | Descripción |
|---------|-------------|
| `/test` | Genera tests unitarios |
| `/doc` | Genera documentación (JSDoc, docstrings) |
| `/types` | Añade o mejora tipado TypeScript |
| `/scaffold` | Genera boilerplate (componentes, endpoints, etc.) |
| `/mock` | Genera mocks y fixtures para tests |

### 🔄 Refactoring

| Comando | Descripción |
|---------|-------------|
| `/refactor` | Refactoring general manteniendo funcionalidad |
| `/modernize` | Actualiza código a sintaxis moderna |
| `/extract` | Extrae función/componente del código |
| `/inline` | Inlinea funciones/variables pequeñas |
| `/dedupe` | Detecta y elimina código duplicado |

### 🌐 Web y APIs

| Comando | Descripción |
|---------|-------------|
| `/api` | Diseña o documenta endpoints REST/GraphQL |
| `/curl` | Convierte código a curl y viceversa |
| `/json` | Formatea, valida o genera schema JSON |
| `/regex` | Explica, debuggea o genera expresiones regulares |
| `/sql` | Explica, optimiza o traduce queries SQL |

### 📦 Git y DevOps

| Comando | Descripción |
|---------|-------------|
| `/commit` | Analiza diff y crea commit descriptivo |
| `/stash` | Guarda cambios en stash con mensaje |
| `/pr` | Genera descripción para pull request |
| `/changelog` | Genera changelog desde commits |

### 📚 Documentación

| Comando | Descripción |
|---------|-------------|
| `/readme` | Genera o mejora README.md |
| `/todo` | Extrae TODOs/FIXMEs del código |
| `/env` | Genera .env.example desde código |
| `/ignore` | Genera .gitignore para el proyecto |

### 🧠 Thinking Modes

| Comando | Descripción |
|---------|-------------|
| `/think` | Análisis profundo sin acción inmediata |
| `/critic` | Critica y encuentra fallos en el enfoque |
| `/alt` | Propone alternativas de solución |
| `/estimate` | Estima complejidad/tiempo de implementación |

### 🛠️ Utilidades

| Comando | Descripción |
|---------|-------------|
| `/translate` | Traduce código entre lenguajes |
| `/review` | Review de código con best practices |
| `/explain` | Explicación simple de código |
| `/deep-think` | Análisis profundo con máximo razonamiento |

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
