# pi-commander

Extensión para [pi](https://github.com/badlogic/pi-mono) que carga comandos personalizados desde archivos markdown con frontmatter.

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

### Crear un comando

Crea un archivo `.md` en cualquiera de estas ubicaciones:

- `~/.pi/agent/commands/` - Comandos del sistema
- `~/.pi/commands/` - Comandos del usuario
- `.pi/commands/` - Comandos del proyecto

### Formato

```markdown
---
name: mi-comando
model: claude-sonnet-4
thinking: high
description: Descripción del comando
---

Tu prompt aquí. {args} se reemplazará con los argumentos pasados al comando.
```

### Frontmatter opcional

| Campo | Descripción | Valores |
|-------|-------------|---------|
| `name` | Nombre del comando (por defecto: nombre del archivo) | string |
| `model` | Modelo a usar | `claude-sonnet-4`, `claude-opus-4`, etc. |
| `thinking` | Nivel de razonamiento | `off`, `minimal`, `low`, `medium`, `high`, `xhigh` |
| `description` | Descripción mostrada en `/help` | string |

### Ejecutar

```bash
/mi-comando argumentos adicionales
```

## Comandos incluidos

| Comando | Descripción |
|---------|-------------|
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
