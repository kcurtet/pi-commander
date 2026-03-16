# pi-commander

Extensión para [pi](https://github.com/badlogic/pi-mono) que carga comandos personalizados desde archivos markdown o TypeScript, y muestra un resumen de recursos al inicio.

## Características

- **Carga de comandos** desde múltiples ubicaciones (markdown y TypeScript)
- **Resumen al inicio** que muestra contexto, skills y extensiones cargadas
- **Configuración flexible** para habilitar/deshabilitar comandos específicos
- **SKILL.md incluido** que enseña a crear extensiones de pi usando el SDK

## Instalación

Añade a tu `~/.pi/agent/settings.json`:

```json
{
  "packages": [
    "git:github.com/kcurtet/pi-commander"
  ]
}
```

## Resumen al inicio

Al iniciar pi, verás un resumen de los recursos cargados:

```
[Context]
  ~/.pi/agent/AGENTS.md

[Skills]
  user
    ~/.pi/agent/skills/calendar/SKILL.md
    ~/.pi/agent/skills/crypto-analysis/SKILL.md
    ...
  git:github.com/kcurtet/pi-web-access
    ~/.pi/agent/git/github.com/kcurtet/pi-web-access/skills/librarian/SKILL.md

[Extensions]
  user
    ~/.pi/agent/extensions/fast-tools/index.ts
    ~/.pi/agent/extensions/image-support/index.ts
    ~/.pi/agent/extensions/pi-commander/index.ts

[Commands] 39 loaded (36 builtin, 3 custom)
```

Este resumen desaparece automáticamente después de 5 segundos.

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
| `input` | Control de argumentos | `enabled` (default), `disabled`, `required` |

#### Input Modes

- **`enabled`** (default): Argumentos opcionales, se añaden al final del prompt
- **`disabled`**: Ignora cualquier argumento proporcionado
- **`required`**: Muestra error si no se proporcionan argumentos

Ejemplo con `input: required`:

```markdown
---
name: skill-create
description: Create a new skill from a prompt description
model: claude-sonnet-4
input: required
---

Create a skill based on the following description:
{args}
```

Uso: `/skill-create A skill for managing Docker containers`

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
| `/skill-create` | Crea un nuevo skill desde una descripción |

### 🎯 Skill Creation

El comando `/skill-create` permite crear nuevas habilidades (skills) para el agente:

```bash
# Uso básico
/skill-create A skill for managing Docker containers

# Ejemplos
/skill-create A skill for working with PostgreSQL databases
/skill-create A skill for AWS CLI operations
/skill-create A skill for React component testing
```

El comando:
1. Te pide confirmar el nombre del skill
2. Genera contenido completo con ejemplos prácticos
3. Guarda el archivo en `~/.pi/agent/skills/<name>/SKILL.md`
4. Te permite revisar y editar antes de finalizar

Los skills creados siguen el estándar [Agent Skills](https://agentskills.io/specification).

## Configuración

En `~/.pi/agent/settings.json`:

```json
{
  "pi-commander": {
    "commands": true,
    "showSummary": true
  }
}
```

Opciones:

| Opción | Valor por defecto | Descripción |
|--------|-------------------|-------------|
| `commands` | `true` | Cargar comandos builtin |
| `showSummary` | `true` | Mostrar resumen de recursos al inicio |

### Comandos

| Valor | Descripción |
|-------|-------------|
| `true` | Cargar todos los comandos por defecto (36 comandos) |
| `false` | No cargar ningún comando por defecto |
| `["commit", "stash", "review"]` | Cargar solo los comandos especificados |

Los comandos personalizados en `~/.pi/commands/` y `.pi/commands/` siempre se cargan y pueden sobrescribir los builtin.

## Skill: Pi Extensions

La extensión incluye un skill (`SKILL.md`) que proporciona una guía completa para crear extensiones de pi. Este skill se carga automáticamente vía el evento `resources_discover` y está disponible para el LLM.

Contenido del skill:
- Estructura básica de extensiones
- Registro de herramientas con TypeBox
- Eventos del ciclo de vida
- UI personalizada (notificaciones, diálogos, widgets)
- Comandos y atajos de teclado
- Estado persistente
- Ejemplos completos

## Licencia

MIT
