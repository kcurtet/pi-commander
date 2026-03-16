---
name: pi-commander
description: Sistema de gestión de comandos para pi. Carga comandos desde markdown/TypeScript y proporciona herramientas para crear extensiones y skills.
---

# Skill: Pi Commander - Gestión de Comandos y Extensiones

## 📖 ¿Qué son las extensiones de pi?

Las extensiones son módulos TypeScript que extienden el comportamiento de pi. Pueden:

- **Registrar herramientas** que el LLM puede invocar
- **Suscribirse a eventos** del ciclo de vida del agente
- **Añadir comandos** tipo `/mi-comando`
- **Crear UI personalizada** con componentes TUI
- **Interceptar y modificar** llamadas a herramientas
- **Gestionar estado** persistente entre sesiones

## 📁 Ubicaciones de Extensiones

Las extensiones se descubren automáticamente desde:

| Ubicación                           | Ámbito                         |
| ----------------------------------- | ------------------------------ |
| `~/.pi/agent/extensions/*.ts`       | Global (todos los proyectos)   |
| `~/.pi/agent/extensions/*/index.ts` | Global (subdirectorio)         |
| `.pi/extensions/*.ts`               | Proyecto local                 |
| `.pi/extensions/*/index.ts`         | Proyecto local (subdirectorio) |

## 🚀 Estructura Básica

### Extensión simple (un archivo)

```typescript
// ~/.pi/agent/extensions/my-extension.ts
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";

export default function (pi: ExtensionAPI) {
  // Suscribirse a eventos
  pi.on("session_start", async (_event, ctx) => {
    ctx.ui.notify("¡Extensión cargada!", "info");
  });

  // Registrar herramienta personalizada
  pi.registerTool({
    name: "greet",
    label: "Saludar",
    description: "Saluda a alguien por nombre",
    parameters: Type.Object({
      name: Type.String({ description: "Nombre a saludar" }),
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      return {
        content: [{ type: "text", text: `¡Hola, ${params.name}!` }],
        details: {},
      };
    },
  });

  // Registrar comando
  pi.registerCommand("hello", {
    description: "Decir hola",
    handler: async (args, ctx) => {
      ctx.ui.notify(`¡Hola ${args || "mundo"}!`, "info");
    },
  });
}
```

### Extensión con directorio

```
~/.pi/agent/extensions/my-extension/
├── index.ts        # Punto de entrada
├── tools.ts        # Herramientas
├── commands.ts     # Comandos
└── utils.ts        # Utilidades
```

## 📦 Imports Disponibles

| Paquete                         | Propósito                                                         |
| ------------------------------- | ----------------------------------------------------------------- |
| `@mariozechner/pi-coding-agent` | Tipos de extensión (`ExtensionAPI`, `ExtensionContext`, eventos)  |
| `@sinclair/typebox`             | Definiciones de esquemas para parámetros de herramientas          |
| `@mariozechner/pi-ai`           | Utilidades de IA (`StringEnum` para enums compatibles con Google) |
| `@mariozechner/pi-tui`          | Componentes TUI para renderizado personalizado                    |
| `node:fs`, `node:path`, etc.    | Built-ins de Node.js                                              |

## 🔧 Registro de Herramientas

### Herramienta básica

```typescript
import { Type } from "@sinclair/typebox";
import { StringEnum } from "@mariozechner/pi-ai";

pi.registerTool({
  name: "my_tool",
  label: "Mi Herramienta",
  description: "Lo que hace esta herramienta (visible para el LLM)",
  promptSnippet: "Descripción corta para el system prompt", // Opcional
  promptGuidelines: [
    // Opcional: directrices específicas
    "Usa esta herramienta cuando el usuario pida X.",
  ],
  parameters: Type.Object({
    action: StringEnum(["list", "add", "remove"] as const), // Enums compatibles con Google
    text: Type.Optional(Type.String()),
    count: Type.Optional(Type.Number({ default: 10 })),
  }),

  async execute(toolCallId, params, signal, onUpdate, ctx) {
    // Verificar cancelación
    if (signal?.aborted) {
      throw new Error("Operación cancelada");
    }

    // Enviar actualización de progreso
    onUpdate?.({
      content: [{ type: "text", text: "Procesando..." }],
      details: { progress: 50 },
    });

    // Ejecutar comando
    const result = await pi.exec("git", ["status"], { signal });

    // Retornar resultado
    return {
      content: [{ type: "text", text: "Completado" }],
      details: { data: result }, // Para estado y renderizado
    };
  },

  // Renderizado personalizado (opcional)
  renderCall(args, theme) {
    // ...
  },
  renderResult(result, options, theme) {
    // ...
  },
});
```

### Enums compatibles con Google API

```typescript
// ✅ CORRECTO - Usa StringEnum
import { StringEnum } from "@mariozechner/pi-ai";

parameters: Type.Object({
  action: StringEnum(["create", "update", "delete"] as const),
});

// ❌ INCORRECTO - Type.Union no funciona con Google
parameters: Type.Object({
  action: Type.Union([
    Type.Literal("create"),
    Type.Literal("update"),
    Type.Literal("delete"),
  ]),
});
```

### Sobrescribir herramientas built-in

```typescript
// Sobrescribir la herramienta 'read'
pi.registerTool({
  name: "read",
  label: "read (custom)",
  description: "Lector de archivos con logging",
  parameters: readSchema,
  async execute(toolCallId, params, signal, onUpdate, ctx) {
    // Tu implementación personalizada
    console.log(`[custom-read] Leyendo: ${params.path}`);
    // ...
  },
  // Si no provees renderCall/renderResult, se usan los built-in
});
```

## 📡 Eventos del Ciclo de Vida

### Visión general

```
pi inicia (solo CLI)
  │
  ├─► session_directory (solo startup CLI, sin ctx)
  └─► session_start
      │
      ▼
usuario envía prompt ─────────────────────────────────────┐
  │                                                        │
  ├─► input (puede interceptar/transformar)               │
  ├─► before_agent_start (inyectar mensaje, modificar system prompt)
  ├─► agent_start                                        │
  ├─► message_start / message_update / message_end       │
  │                                                        │
  │   ┌─── turn (repite mientras LLM llama tools) ───┐   │
  │   │                                               │   │
  │   ├─► turn_start                                 │   │
  │   ├─► context (modificar mensajes)               │   │
  │   ├─► before_provider_request                    │   │
  │   │                                               │   │
  │   │   LLM responde, puede llamar tools:          │   │
  │   │     ├─► tool_execution_start                 │   │
  │   │     ├─► tool_call (puede bloquear)           │   │
  │   │     ├─► tool_execution_update                │   │
  │   │     ├─► tool_result (puede modificar)        │   │
  │   │     └─► tool_execution_end                   │   │
  │   │                                               │   │
  │   └─► turn_end                                   │   │
  │                                                       │
  └─► agent_end                                          │
                                                          │
usuario envía otro prompt ◄───────────────────────────────┘
```

### Eventos de sesión

```typescript
// Al iniciar sesión
pi.on("session_start", async (_event, ctx) => {
  ctx.ui.notify("Sesión iniciada", "info");
});

// Antes de cambiar de sesión (se puede cancelar)
pi.on("session_before_switch", async (event, ctx) => {
  // event.reason - "new" o "resume"
  // event.targetSessionFile - sesión a la que se cambia

  if (event.reason === "new") {
    const ok = await ctx.ui.confirm(
      "¿Limpiar?",
      "¿Eliminar todos los mensajes?",
    );
    if (!ok) return { cancel: true };
  }
});

// Después de cambiar de sesión
pi.on("session_switch", async (event, ctx) => {
  // event.reason - "new" o "resume"
  // event.previousSessionFile - sesión anterior
});

// Al cerrar pi
pi.on("session_shutdown", async (_event, ctx) => {
  // Limpieza, guardar estado, etc.
});
```

### Eventos de agente

```typescript
// Antes de que el agente empiece (puede inyectar mensaje)
pi.on("before_agent_start", async (event, ctx) => {
  // event.prompt - texto del usuario
  // event.images - imágenes adjuntas
  // event.systemPrompt - system prompt actual

  return {
    // Inyectar mensaje persistente
    message: {
      customType: "my-extension",
      content: "Contexto adicional para el LLM",
      display: true,
    },
    // Modificar system prompt
    systemPrompt: event.systemPrompt + "\n\nInstrucciones extra...",
  };
});

// Al empezar/acabar cada prompt
pi.on("agent_start", async (_event, ctx) => {});
pi.on("agent_end", async (event, ctx) => {
  // event.messages - mensajes de este prompt
});

// Cada turno (una respuesta LLM + tool calls)
pi.on("turn_start", async (event, ctx) => {
  // event.turnIndex, event.timestamp
});
pi.on("turn_end", async (event, ctx) => {
  // event.turnIndex, event.message, event.toolResults
});
```

### Eventos de herramientas

```typescript
import { isToolCallEventType } from "@mariozechner/pi-coding-agent";

// Antes de ejecutar (puede bloquear)
pi.on("tool_call", async (event, ctx) => {
  // event.toolName, event.toolCallId, event.input

  // Verificar tipo y obtener input tipado
  if (isToolCallEventType("bash", event)) {
    // event.input es { command: string; timeout?: number }
    if (event.input.command.includes("rm -rf")) {
      const ok = await ctx.ui.confirm("¡Peligroso!", "¿Permitir rm -rf?");
      if (!ok) return { block: true, reason: "Bloqueado por usuario" };
    }
  }
});

// Después de ejecutar (puede modificar resultado)
pi.on("tool_result", async (event, ctx) => {
  // event.toolName, event.toolCallId, event.input
  // event.content, event.details, event.isError

  // Modificar resultado
  return {
    content: [...],
    details: {...},
    isError: false
  };
});
```

### Evento de input

```typescript
pi.on("input", async (event, ctx) => {
  // event.text - input raw (antes de expandir skills/templates)
  // event.images - imágenes adjuntas
  // event.source - "interactive", "rpc", o "extension"

  // Transformar: reescribir input
  if (event.text.startsWith("?quick ")) {
    return {
      action: "transform",
      text: `Responde brevemente: ${event.text.slice(7)}`,
    };
  }

  // Manejar: responder sin LLM
  if (event.text === "ping") {
    ctx.ui.notify("pong", "info");
    return { action: "handled" };
  }

  // Continuar normalmente
  return { action: "continue" };
});
```

## 🖥️ Interfaz de Usuario

### Notificaciones y diálogos

```typescript
// Notificación simple
ctx.ui.notify("Mensaje", "info"); // "info" | "warning" | "error"

// Confirmación
const ok = await ctx.ui.confirm("Título", "¿Estás seguro?");

// Selección
const choice = await ctx.ui.select("Elige:", [
  "Opción A",
  "Opción B",
  "Opción C",
]);

// Input de texto
const text = await ctx.ui.input("Introduce valor:", "placeholder");

// Editor multilínea
const content = await ctx.ui.editor("Edita el contenido:", "texto inicial");
```

### Status y widgets

```typescript
// Status en el footer
ctx.ui.setStatus("my-ext", "Procesando...");

// Widget sobre el editor
ctx.ui.setWidget("my-widget", ["Línea 1", "Línea 2", "Línea 3"]);

// Widget con componente TUI
ctx.ui.setWidget("my-widget", (tui, theme) => {
  return {
    render(width: number): string[] {
      return [theme.fg("accent", "★ Widget personalizado ★")];
    },
    dispose() {
      // Limpieza
    },
  };
});

// Limpiar widget/status
ctx.ui.setStatus("my-ext", undefined);
ctx.ui.setWidget("my-widget", undefined);
```

### Header y footer personalizados

```typescript
// Header personalizado (al inicio, sobre el chat)
ctx.ui.setHeader((tui, theme) => {
  return {
    render(width: number): string[] {
      return [
        "",
        theme.fg("accent", "  ╔════════════════════════╗"),
        theme.fg("accent", "  ║   Mi Header Custom     ║"),
        theme.fg("accent", "  ╚════════════════════════╝"),
        "",
      ];
    },
    dispose() {},
  };
});

// Restaurar header built-in
ctx.ui.setHeader(undefined);

// Footer personalizado
ctx.ui.setFooter((tui, theme, footerData) => {
  // footerData incluye: git branch, extension statuses, etc.
  return {
    render(width: number): string[] {
      return [theme.fg("dim", `Git: ${footerData.gitBranch || "N/A"}`)];
    },
    dispose() {},
  };
});
```

### UI personalizada con teclado

```typescript
// Componente completo con interacción
const result = await ctx.ui.custom<string>((tui, theme, keybindings, done) => {
  let selected = 0;
  const items = ["A", "B", "C"];

  return {
    render(width: number): string[] {
      return items.map((item, i) =>
        i === selected
          ? theme.fg("accent", `▶ ${item}`)
          : theme.fg("dim", `  ${item}`),
      );
    },
    handleInput(data: string): boolean {
      if (data === "j") selected = (selected + 1) % items.length;
      if (data === "k") selected = (selected - 1 + items.length) % items.length;
      if (data === "\r") done(items[selected]); // Enter
      if (data === "\x1b") done(undefined); // Escape
      return true;
    },
    dispose() {},
  };
});

if (result) {
  ctx.ui.notify(`Seleccionaste: ${result}`, "info");
}
```

## 📝 Registro de Comandos

### Comando simple

```typescript
pi.registerCommand("stats", {
  description: "Mostrar estadísticas de sesión",
  handler: async (args, ctx) => {
    const count = ctx.sessionManager.getEntries().length;
    ctx.ui.notify(`${count} entradas en la sesión`, "info");
  },
});
```

### Comando con autocompletado

```typescript
import type { AutocompleteItem } from "@mariozechner/pi-tui";

pi.registerCommand("deploy", {
  description: "Desplegar a un entorno",
  getArgumentCompletions: (prefix: string): AutocompleteItem[] | null => {
    const envs = ["dev", "staging", "prod"];
    const items = envs.map((e) => ({ value: e, label: e }));
    return items.filter((i) => i.value.startsWith(prefix));
  },
  handler: async (args, ctx) => {
    ctx.ui.notify(`Desplegando a: ${args}`, "info");
  },
});
```

## 💾 Estado Persistente

### Guardar estado en entradas

```typescript
export default function (pi: ExtensionAPI) {
  let items: string[] = [];

  // Reconstruir estado desde la sesión
  pi.on("session_start", async (_event, ctx) => {
    items = [];
    for (const entry of ctx.sessionManager.getBranch()) {
      if (entry.type === "message" && entry.message.role === "toolResult") {
        if (entry.message.toolName === "my_tool") {
          items = entry.message.details?.items ?? [];
        }
      }
    }
  });

  pi.registerTool({
    name: "my_tool",
    // ...
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      items.push("nuevo item");
      return {
        content: [{ type: "text", text: "Añadido" }],
        details: { items: [...items] }, // Guardar para reconstrucción
      };
    },
  });
}
```

### Usar appendEntry para estado personalizado

```typescript
// Guardar estado (NO participa en contexto LLM)
pi.appendEntry("my-state", { count: 42 });

// Restaurar al iniciar
pi.on("session_start", async (_event, ctx) => {
  for (const entry of ctx.sessionManager.getEntries()) {
    if (entry.type === "custom" && entry.customType === "my-state") {
      // Reconstruir desde entry.data
    }
  }
});
```

## 🔄 Envío de Mensajes

### Enviar mensaje de usuario

```typescript
// Mensaje simple
pi.sendUserMessage("¿Cuánto es 2+2?");

// Con contenido (texto + imágenes)
pi.sendUserMessage([
  { type: "text", text: "Describe esta imagen:" },
  {
    type: "image",
    source: { type: "base64", mediaType: "image/png", data: "..." },
  },
]);

// Durante streaming - especificar modo de entrega
pi.sendUserMessage("Enfócate en errores", { deliverAs: "steer" });
pi.sendUserMessage("Y luego resume", { deliverAs: "followUp" });
```

### Enviar mensaje personalizado

```typescript
pi.sendMessage({
  customType: "my-extension",
  content: "Mensaje de texto",
  display: true,
  details: { ... },
}, {
  triggerTurn: true,    // Disparar respuesta LLM si está idle
  deliverAs: "steer",   // "steer" | "followUp" | "nextTurn"
});
```

## 🛠️ Utilidades

### Ejecutar comandos shell

```typescript
const result = await pi.exec("git", ["status"], {
  signal, // AbortSignal
  timeout: 5000,
});

// result.stdout, result.stderr, result.code, result.killed
```

### Gestión de modelos

```typescript
// Obtener modelo actual
const model = ctx.model;

// Cambiar modelo
const newModel = ctx.modelRegistry.find("anthropic", "claude-sonnet-4-5");
if (newModel) {
  const success = await pi.setModel(newModel);
  if (!success) {
    ctx.ui.notify("No hay API key para este modelo", "error");
  }
}

// Escuchar cambios de modelo
pi.on("model_select", async (event, ctx) => {
  // event.model - nuevo modelo
  // event.previousModel - modelo anterior
  // event.source - "set" | "cycle" | "restore"
});
```

### Niveles de thinking

```typescript
// Obtener/establecer nivel
const level = pi.getThinkingLevel(); // "off" | "minimal" | "low" | "medium" | "high" | "xhigh"
pi.setThinkingLevel("high");
```

### Gestión de herramientas activas

```typescript
// Obtener herramientas activas/todas
const active = pi.getActiveTools(); // ["read", "bash", "edit", "write"]
const all = pi.getAllTools(); // [{ name, description, ... }, ...]

// Cambiar herramientas activas
pi.setActiveTools(["read", "bash"]); // Solo lectura
```

## 🔌 Recursos Dinámicos

### Cargar skills, prompts y themes

```typescript
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const baseDir = dirname(fileURLToPath(import.meta.url));

pi.on("resources_discover", () => {
  return {
    skillPaths: [join(baseDir, "SKILL.md")],
    promptPaths: [join(baseDir, "prompt.md")],
    themePaths: [join(baseDir, "theme.json")],
  };
});
```

## ⚡ Truncamiento de Salida

Las herramientas **DEBEN** truncar su salida para evitar desbordar el contexto:

```typescript
import {
  truncateHead,
  truncateTail,
  formatSize,
  DEFAULT_MAX_BYTES, // 50KB
  DEFAULT_MAX_LINES, // 2000
} from "@mariozechner/pi-coding-agent";

async execute(toolCallId, params, signal, onUpdate, ctx) {
  const output = await runCommand();

  const truncation = truncateHead(output, {
    maxLines: DEFAULT_MAX_LINES,
    maxBytes: DEFAULT_MAX_BYTES,
  });

  let result = truncation.content;

  if (truncation.truncated) {
    const tempFile = writeTempFile(output);
    result += `\n\n[Salida truncada: ${truncation.outputLines} de ${truncation.totalLines} líneas`;
    result += ` (${formatSize(truncation.outputBytes)} de ${formatSize(truncation.totalBytes)}).`;
    result += ` Salida completa en: ${tempFile}]`;
  }

  return { content: [{ type: "text", text: result }] };
}
```

## 🚨 Manejo de Errores

### Señalizar errores

```typescript
// ✅ CORRECTO - Lanzar error para marcar isError: true
async execute(toolCallId, params) {
  if (!isValid(params.input)) {
    throw new Error(`Input inválido: ${params.input}`);
  }
  return { content: [{ type: "text", text: "OK" }], details: {} };
}

// ❌ INCORRECTO - Retornar valor nunca establece isError
return {
  content: [{ type: "text", text: "Error" }],
  isError: true, // ¡Esto NO funciona!
};
```

## 📋 ExtensionContext

Propiedades disponibles en `ctx`:

| Propiedad               | Descripción                  |
| ----------------------- | ---------------------------- |
| `ctx.ui`                | Métodos de UI                |
| `ctx.hasUI`             | `false` en modo print/RPC    |
| `ctx.cwd`               | Directorio de trabajo actual |
| `ctx.sessionManager`    | Acceso read-only a la sesión |
| `ctx.modelRegistry`     | Registro de modelos          |
| `ctx.model`             | Modelo actual                |
| `ctx.isIdle()`          | ¿Está el agente idle?        |
| `ctx.abort()`           | Abortar operación actual     |
| `ctx.shutdown()`        | Cerrar pi ordenadamente      |
| `ctx.getContextUsage()` | Uso de contexto actual       |
| `ctx.compact()`         | Disparar compactación        |
| `ctx.getSystemPrompt()` | System prompt efectivo       |

## 🎯 Ejemplo Completo: Todo List

```typescript
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";

interface Todo {
  id: number;
  text: string;
  done: boolean;
}

export default function (pi: ExtensionAPI) {
  let todos: Todo[] = [];
  let nextId = 1;

  // Reconstruir estado
  pi.on("session_start", async (_event, ctx) => {
    for (const entry of ctx.sessionManager.getBranch()) {
      if (entry.type === "message" && entry.message.role === "toolResult") {
        if (entry.message.toolName === "todo") {
          todos = entry.message.details?.todos ?? [];
          nextId = entry.message.details?.nextId ?? 1;
        }
      }
    }
  });

  // Herramienta
  pi.registerTool({
    name: "todo",
    label: "Todo List",
    description: "Gestionar lista de tareas",
    parameters: Type.Object({
      action: Type.Union([
        Type.Literal("list"),
        Type.Literal("add"),
        Type.Literal("toggle"),
        Type.Literal("remove"),
      ]),
      text: Type.Optional(Type.String()),
      id: Type.Optional(Type.Number()),
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      switch (params.action) {
        case "list":
          break;
        case "add":
          if (!params.text) throw new Error("texto requerido");
          todos.push({ id: nextId++, text: params.text, done: false });
          break;
        case "toggle":
          const todo = todos.find((t) => t.id === params.id);
          if (!todo) throw new Error(`todo ${params.id} no encontrado`);
          todo.done = !todo.done;
          break;
        case "remove":
          todos = todos.filter((t) => t.id !== params.id);
          break;
      }

      const list =
        todos
          .map((t) => `${t.done ? "✓" : "○"} [${t.id}] ${t.text}`)
          .join("\n") || "(vacío)";

      return {
        content: [{ type: "text", text: list }],
        details: { todos, nextId },
      };
    },
  });

  // Comando
  pi.registerCommand("todos", {
    description: "Ver lista de tareas",
    handler: async (_args, ctx) => {
      const list =
        todos
          .map((t) => `${t.done ? "✓" : "○"} [${t.id}] ${t.text}`)
          .join("\n") || "(vacío)";

      ctx.ui.notify(list.split("\n").length + " tareas", "info");
    },
  });
}
```

## 📚 Referencias

- [Documentación de extensiones](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/extensions.md)
- [Ejemplos de extensiones](https://github.com/badlogic/pi-mono/tree/main/packages/coding-agent/examples/extensions)
- [TypeBox para esquemas](https://github.com/sinclairzx81/typebox)
- [Componentes TUI](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/tui.md)

---

**Recuerda:** Las extensiones se ejecutan con permisos completos del sistema. Solo instala extensiones de fuentes confiables.
