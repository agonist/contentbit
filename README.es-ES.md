

<p align="center">
  <a href="https://contentbit.dev">
    <img src="./site/public/readme-flow.svg" alt="contentbit convierte contratos de páginas en breves para agentes y contenido SEO programático validado" width="760" />
  </a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/contentbit"><img src="https://img.shields.io/npm/v/contentbit?label=contentbit&color=10b981" alt="versión de npm de contentbit" /></a>
  <a href="https://www.npmjs.com/package/contentbit"><img src="https://img.shields.io/npm/dm/contentbit?label=downloads&color=0f766e" alt="descargas mensuales de contentbit" /></a>
  <a href="https://github.com/agonist/contentbit/actions/workflows/ci.yml"><img src="https://github.com/agonist/contentbit/actions/workflows/ci.yml/badge.svg" alt="estado de CI" /></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/node-%3E%3D22.18-339933" alt="Node >=22.18" /></a>
  <a href="https://pnpm.io"><img src="https://img.shields.io/badge/pnpm-11.5-F69220" alt="pnpm 11.5" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="licencia MIT" /></a>
</p>

<p align="center">
  <a href="https://contentbit.dev/programmatic-seo">SEO programático</a>
  ·
  <a href="https://contentbit.dev/docs">Documentación</a>
  ·
  <a href="https://contentbit.dev/playground">Playground</a>
  ·
  <a href="https://contentbit.dev/blocks">Bloques</a>
</p>

# contentbit

**Kit de herramientas SEO programático de código abierto para agentes de codificación.**

Define familias de páginas reutilizables, crea breves para escritores y agentes antes de que redacten, y
valida la estructura del contenido y los enlaces internos antes de publicar. El contenido permanece
como Markdown portable y se renderiza en React, Astro o Markdown plano.

- **Modela familias de páginas** con frontmatter, secciones, bloques y enlaces obligatorios.
- **Breve cada página** antes de que su archivo Markdown exista.
- **Proporciona reglas en vivo a los agentes** desde los mismos contratos y registro de bloques que valida el CLI.
- **Impulsa la calidad** con hallazgos clasificados por Doctor y códigos de salida estrictos de CI.
- **Publica en cualquier lugar** mediante adaptadores de React, Astro o Markdown plano.

## Inicio rápido

```bash
npx contentbit@latest init --seo
```

`init` detecta tu framework y administrador de paquetes, instala los paquetes correctos,
crea las configuraciones del proyecto y SEO, configura contenido inicial y una página
`/example` renderizada cuando sea posible, añade scripts de calidad, genera la guía en vivo para LLM
e instala las instrucciones para agentes. En proyectos Astro, el ejemplo es
autocontenido y deja las colecciones de contenido existentes sin tocar.

Planifica una página, entrega el breve a un escritor o agente y ejecuta la puerta de publicación:

```bash
contentbit brief <key-or-slug>       # contrato de escritura listo para agente
contentbit doctor --strict-seo       # puerta de contenido, estructura y enlaces
pnpm run studio                      # previsualiza breves, páginas, enlaces y hallazgos
```

O pide a la integración de agente de codificación instalada que ejecute el ciclo:

```text
escribe la página planificada <page-key> a partir de su breve de contentbit
```

¿Solo necesitas Markdown estructurado y renderizado? Ejecuta `contentbit init` sin
`--seo`.

Para una implementación de Astro lista para producción, usa
[`astro-speedrun-seo`](https://github.com/agonist/astro-speedrun-seo). Es la
plantilla de referencia separada para SEO programático multilingüe, mientras que los pequeños
inicios en este repositorio permanecen como fixtures de compatibilidad para CI de paquetes.

¿Prefieres los componentes? Instala los paquetes centrales y un renderizador:

```bash
pnpm add @contentbit/core @contentbit/blocks @contentbit/react
```

## ¿Por qué Contentbit

El contenido programático se desvía cuando el plan vive en una hoja de cálculo, las reglas de escritura
viven en un prompt y las verificaciones de calidad ocurren durante la revisión. Contentbit
pone esas reglas en la base de código para que humanos, agentes, Studio y CI usen el mismo
contrato.

```ts
import { defineSeoConfig } from '@contentbit/core'

export default defineSeoConfig({
  pageTypes: {
    alternative: {
      requiredSections: ['Overview', 'Comparison', 'FAQ'],
      requiredBlocks: ['comparison'],
      recommendedBlocks: ['faq'],
      minOutgoingLinks: 2,
    },
  },
  pages: {
    'semrush-alternatives': {
      type: 'alternative',
      slug: 'semrush-alternatives',
      intent: 'commercial comparison',
      keywords: { primary: 'semrush alternatives' },
      linksTo: ['seo-tools-comparison'],
    },
  },
})
```

La página puede tener un breve antes de que exista. Una vez escrita, Doctor verifica el archivo en vivo
contra el plan e informa exactamente qué necesita reparación.

## Markdown estructurado por debajo

Markdown permanece como el formato de autoría. Los bloques directivos tipados añaden estructura
donde la prosa ordinaria no es suficiente:

```md
:::comparison{left="Basic" right="Pro"}
- Price | Free | $12/mo
- Support | Community | Priority
:::
```

Cada bloque tiene un esquema. El contenido inválido falla con diagnósticos que un humano o
modelo puede corregir:

```text
article.md:12:1 error CB_PROPS_INVALID
:::callout props invalid: type must be one of note|tip|warning|important|tldr.
hint: Did you mean type="warning"?
```

El mismo registro escribe las reglas de autoría que ve el agente, por lo que los bloques personalizados,
validación, documentación y prompts permanecen juntos.

## Ciclo de agentes

Después de `init --seo`, tu agente tiene un ciclo de escritura corto y repetible:

1. Lee `contentbit.config.ts` para el glob de contenido, registro, enlaces y configuración SEO.
2. Ejecuta `contentbit brief <key-or-slug>` para el contrato de la página objetivo.
3. Ejecuta `contentbit instructions --audience llm` para la guía en vivo de bloques.
4. Escribe Markdown plano, usando bloques solo cuando la guía indique que encajan.
5. Ejecuta `contentbit doctor --strict-seo` y repara hallazgos hasta que salga con código 0.

Actualiza o añade la integración en cualquier momento:

```bash
contentbit agents
```

Los archivos de agente instalados no contienen esquemas. Leen del CLI en tiempo de ejecución, por lo que
los bloques personalizados se recogen automáticamente. Consulta la
[guía de agentes LLM](https://contentbit.dev/docs/guides/agents).

## Lo que obtienes

| Archivo o comando       | Por qué importa                                                     |
| --------------------- | ------------------------------------------------------------------ |
| `content/example.md`  | Contenido inicial con bloques integrados y un bloque personalizado          |
| `blocks/registry.ts`  | Esquemas de bloques compartidos para validación, renderizadores, docs y agentes   |
| `contentbit.config.ts` | Glob de contenido compartido, registro, enlaces y valores predeterminados de comandos SEO    |
| `contentbit.seo.config.ts` | Contratos de familia de páginas y planes para páginas existentes o futuras |
| `contentbit-guide.md` | Reglas de autoría generadas para LLMs                                 |
| `AGENTS.md`           | Instrucciones compactas para Codex, Cursor, Copilot y otros agentes  |
| `.claude/skills/*`    | Habilidades de autoría/auditoría de Claude Code cuando está presente `.claude`          |
| `content:check`       | Valida contenido con el glob y registro correctos                 |
| `content:doctor`      | Clasifica problemas de validación, enlaces, secciones finas y alt de imágenes         |
| `contentbit brief`    | Imprime un breve SEO listo para agente para una página existente o planificada    |
| `contentbit snapshot` | Imprime un modelo de lectura de proyecto portable y seguro para JSON para adaptadores remotos |
| `studio`              | Explorador de solo lectura para previsualizaciones, estadísticas, enlaces, palabras clave y estado |
| `/example`            | Ruta renderizada cuando el framework detectado lo admite             |

## Renderiza en cualquier lugar

contentbit trata el Markdown estructurado como el formato de contenido portable. Usa tu
propia tubería de prosa para Markdown entre bloques, luego elige la superficie:

- `@contentbit/react` para componentes React con valores predeterminados headless accesibles.
- `@contentbit/astro` para componentes `.astro` con anulaciones por bloque.
- `renderToMarkdown()` para retrocesos a Markdown plano.

Los paquetes React y Astro estilizados se distribuyen a través de un registro shadcn:

```bash
pnpm dlx shadcn@latest add @contentbit/generic-pack
```

URL del registro: `https://contentbit.dev/r/{name}.json`.

## Grafos de contenido

Usa frontmatter para declarar relaciones y deja que contentbit mantenga los enlaces honestos:

```yaml
---
slug: beginner-pizza-dough
linksTo:
  - cold-fermentation-pizza
aliases:
  - intro-pizza-dough
---
```

`contentbit links "content/**/*.md"` genera `.contentbit/link-index.json` con
enlaces resueltos y backlinks. `contentbit validate` ejecuta verificaciones de enlaces cuando los archivos
declaran slugs, y `contentbit links --fix` puede reescribir referencias de alias desactualizadas.
Lee la [guía de enlazado interno](https://contentbit.dev/docs/guides/internal-linking).

## Contratos SEO programáticos

Crea `contentbit.seo.config.ts` con contratos de tipo de página reutilizables y páginas
planificadas, o deja que `contentbit init --seo` cree una estructura inicial. Cuando ese archivo exista,
`contentbit doctor` incorpora los hallazgos del contrato SEO en el plan de reparación normal,
Studio muestra una vista de Breve de solo lectura para cada página planificada o existente, y
`contentbit brief <key-or-slug>` imprime la estructura, enlaces, bloques requeridos,
y controles de aceptación que un agente debe satisfacer antes de publicar. Consulta el
[flujo de trabajo SEO programático](https://contentbit.dev/docs/guides/programmatic-seo).

Sin un agente, el mismo ciclo es una escritura ordinaria asistida por CLI: imprime el
breve, escribe el Markdown, ejecuta Doctor, inspecciona la página en Studio y publica.

## Paquetes

| Paquete                                                                         | Propósito                                                        |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| [`@contentbit/core`](https://www.npmjs.com/package/@contentbit/core)            | Analizador, AST, diagnósticos, registro, validación, salida Markdown |
| [`@contentbit/blocks`](https://www.npmjs.com/package/@contentbit/blocks)        | Bloques genéricos: llamada, pasos, comparación, pestañas, faq y más |
| [`@contentbit/react`](https://www.npmjs.com/package/@contentbit/react)          | Renderizador React                                                 |
| [`@contentbit/astro`](https://www.npmjs.com/package/@contentbit/astro)          | Renderizador Astro                                                 |
| [`@contentbit/studio`](https://www.npmjs.com/package/@contentbit/studio)        | Estudio de contenido local de solo lectura                                 |
| [`contentbit`](https://www.npmjs.com/package/contentbit)                        | CLI: init, validate, doctor, studio, stats, links, render       |

## Explora

- [Documentación](https://contentbit.dev/docs) con ejemplos renderizados en vivo
- [Todos los bloques](https://contentbit.dev/blocks) del paquete genérico
- [Playground](https://contentbit.dev/playground) con validación en vivo
- [Blog](https://contentbit.dev/blog) escrito como documentos contentbit validados
- [Registro de cambios](https://contentbit.dev/docs/changelog) para notas de lanzamiento
- [llms.txt](https://contentbit.dev/llms.txt) y la
  [guía de autoría](https://contentbit.dev/contentbit-guide.md) para contexto LLM

## Desarrollo

```bash
pnpm install
pnpm -r build
pnpm -r test
pnpm lint && pnpm fmt:check
```

Consulta [CONTRIBUTING.md](./CONTRIBUTING.md) para la estructura del repositorio y las directrices.

## Licencia

[MIT](./LICENSE)
