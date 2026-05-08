# Multi-Agent Code Reviewer

Tres agentes de IA especializados revisan tu código en paralelo — seguridad, rendimiento y mantenibilidad — y un supervisor sintetiza un reporte con puntuación de 0 a 100.

> **Demo en vivo:** [multi-agent-code-reviewer-sable.vercel.app](https://multi-agent-code-reviewer-sable.vercel.app)  
> **GitHub:** [github.com/NeryC/multi-agent-code-reviewer](https://github.com/NeryC/multi-agent-code-reviewer)

<!--
![Workflow in progress](docs/screenshot-workflow.png)
![Review report](docs/screenshot-report.png)
-->

---

## ¿Qué hace este proyecto?

El Multi-Agent Code Reviewer demuestra una arquitectura de **orquestación multi-agente**: en lugar de usar un único modelo de lenguaje para hacer todo, se usan cuatro agentes especializados con responsabilidades distintas:

1. **Agente de Seguridad** — detecta vulnerabilidades: inyección SQL, XSS, secretos hardcodeados, validación de inputs, autenticación defectuosa
2. **Agente de Rendimiento** — detecta problemas de eficiencia: queries N+1, bucles ineficientes, memory leaks, operaciones bloqueantes innecesarias
3. **Agente de Mantenibilidad** — evalúa calidad de código: complejidad, nombres de variables, duplicación, cobertura de tests, documentación
4. **Supervisor** — consolida los hallazgos de los 3 agentes, elimina duplicados, los prioriza por severidad, escribe un resumen ejecutivo y asigna una puntuación global de 0–100

Los 3 agentes especialistas corren **en paralelo** vía `Promise.all`, minimizando el tiempo total de análisis. Los resultados llegan al navegador como eventos SSE en tiempo real conforme cada agente termina.

---

## Tutorial paso a paso

### Paso 1: Abre la aplicación

Ve a [multi-agent-code-reviewer-sable.vercel.app](https://multi-agent-code-reviewer-sable.vercel.app). Verás un panel con dos opciones de entrada: **snippet** (pegar código directamente) y **GitHub URL** (analizar un archivo de un repositorio público).

### Paso 2: Pega tu código o ingresa una URL de GitHub

**Opción A — Snippet** (pega código directamente en el editor):

```python
import sqlite3

def get_user(username, password):
    conn = sqlite3.connect("users.db")
    cursor = conn.cursor()
    # Concatenación directa — vulnerable a SQL injection
    query = f"SELECT * FROM users WHERE username = '{username}' AND password = '{password}'"
    cursor.execute(query)
    return cursor.fetchone()
```

**Opción B — GitHub URL** (analizar un archivo de un repo público):

```
https://github.com/usuario/repositorio/blob/main/src/api/auth.py
```

La aplicación convierte automáticamente la URL a `raw.githubusercontent.com` para obtener el contenido.

### Paso 3: Haz clic en "Review"

Una vez que envías el código, verás una **línea de tiempo de progreso** en vivo:

```
✓ Input parsed          → código válido detectado (Python, 12 líneas)
✓ Metadata extracted    → complejidad: low

🔄 Security agent       → analizando...
🔄 Performance agent    → analizando...
🔄 Maintainability agent → analizando...

✓ Security agent        → 2 findings
✓ Maintainability agent → 3 findings
✓ Performance agent     → 1 finding

🔄 Supervisor           → consolidando...
✓ Supervisor            → reporte listo

Score: 42/100
```

Los 3 agentes se ejecutan en paralelo — notarás que pueden completarse en cualquier orden.

### Paso 4: Lee el reporte

El reporte final tiene:

- **Gauge visual** mostrando la puntuación (0–100) con color: rojo (<50), naranja (50–70), amarillo (70–85), verde (85+)
- **Resumen ejecutivo** de 2-3 oraciones sobre qué hace el código y su calidad general
- **Recomendación principal** — lo más importante a arreglar primero
- **Tabs por categoría** — Seguridad / Rendimiento / Mantenibilidad con sus hallazgos
- **Cards expandibles** por cada finding, con:
  - Badge de severidad (critical / high / medium / low / info)
  - Descripción del problema
  - Sugerencia de corrección
  - Diff de código (antes/después) cuando el agente lo generó

### Ejemplo de hallazgo

Para el código Python de arriba, el agente de seguridad generaría algo así:

```
🔴 CRITICAL — SQL Injection Vulnerability

Línea 7
La consulta construye SQL concatenando directamente inputs del usuario sin sanitización.
Un atacante puede usar: username = "' OR 1=1 --" para acceder a todos los usuarios.

Sugerencia: Usar consultas parametrizadas.

Antes:
  query = f"SELECT * FROM users WHERE username = '{username}' AND password = '{password}'"

Después:
  query = "SELECT * FROM users WHERE username = ? AND password = ?"
  cursor.execute(query, (username, password))
```

---

## Demostración: flujo interno completo

```
Usuario pega código y hace click en "Review"
         │
         ▼
┌────────────────────────────────────────────────────┐
│  Browser — reviewer-client.tsx                     │
│  POST /api/review                                  │
│  Body: { inputType: "snippet", value: "..." }      │
│  Abre EventSource → escucha eventos SSE            │
└──────────────────────┬─────────────────────────────┘
                       │
                       ▼
┌────────────────────────────────────────────────────┐
│  /api/review/route.ts                              │
│                                                    │
│  1. Rate limit: 3 reviews/IP/hora                  │
│  2. Valida body: inputType + value presentes       │
│  3. Crea ReadableStream SSE                        │
│  4. Llama orchestrate(send, body)                  │
└──────────────────────┬─────────────────────────────┘
                       │
                       ▼
┌────────────────────────────────────────────────────────────────────────────┐
│  lib/workflow/orchestrate.ts — el director de orquesta                     │
│                                                                            │
│  1. send({ type: 'started', jobId })                                       │
│                                                                            │
│  2. Paso "parseInput":                                                     │
│     - Si inputType === 'github-url': fetchGitHubFile(url)                  │
│       → convierte URL de GitHub a raw.githubusercontent.com                │
│       → hace fetch del contenido crudo                                     │
│     - Si inputType === 'snippet': usa el código directamente               │
│     send({ type: 'step', name: 'parseInput', status: 'done' })            │
│                                                                            │
│  3. Paso "extractMetadata":                                                │
│     - Detecta lenguaje (Python, JS, Go...) por extensión y keywords        │
│     - Cuenta líneas                                                        │
│     - Estima complejidad (low/medium/high)                                 │
│     send({ type: 'step', name: 'extractMetadata', status: 'done' })       │
│                                                                            │
│  4. Anuncia los 3 agentes como "running" ANTES de awaitar                 │
│     send({ type: 'agent', name: 'security', status: 'running' })          │
│     send({ type: 'agent', name: 'performance', status: 'running' })       │
│     send({ type: 'agent', name: 'maintainability', status: 'running' })   │
│                                                                            │
│  5. Promise.all — los 3 agentes en paralelo:                               │
│                                                                            │
│     ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────┐  │
│     │  securityAgent       │  │  performanceAgent    │  │  maintAgent  │  │
│     │  generateObject(     │  │  generateObject(     │  │  generateObj │  │
│     │    claude-sonnet-4.6 │  │    claude-sonnet-4.6 │  │    sonnet    │  │
│     │    FindingArraySchema│  │    FindingArraySchema│  │    Finding.. │  │
│     │  )                   │  │  )                   │  │  )           │  │
│     └──────────┬───────────┘  └──────────┬───────────┘  └──────┬───────┘  │
│               done                      done                  done        │
│                │                          │                     │          │
│           send(agent done)          send(agent done)       send(done)     │
│                                                                            │
│  6. Supervisor (secuencial, después de los 3):                             │
│     runSupervisorAgent(allFindings, meta)                                  │
│     → claude-haiku-4.5 + ReviewReportSchema                               │
│     → deduplica, prioriza, escribe summary, asigna score                  │
│     send({ type: 'report', report })                                       │
│     send({ type: 'done' })                                                 │
└────────────────────────────────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│  Browser recibe eventos SSE en tiempo real          │
│  useReviewStream hook actualiza el estado de React   │
│  WorkflowProgress muestra la línea de tiempo        │
│  ReportSummary renderiza el reporte final           │
└─────────────────────────────────────────────────────┘
```

---

## Arquitectura del código

### Estructura de carpetas

```
multi-agent-code-reviewer/
├── app/
│   ├── page.tsx                    # Shell del servidor (importa el client component)
│   ├── reviewer-client.tsx         # 'use client' — layout, useReviewStream, estado
│   └── api/review/
│       └── route.ts                # Endpoint SSE — rate limit + orquestación
├── lib/
│   ├── schemas.ts                  # Esquemas Zod: Finding, CodeMetadata, ReviewReport
│   ├── metadata.ts                 # extractMetadata() — detección de lenguaje y complejidad
│   ├── github.ts                   # fetchGitHubFile() — convierte URL de GitHub a contenido
│   ├── rate-limit.ts               # Rate limiter en memoria (IP-based)
│   ├── agent/
│   │   ├── model.ts                # REVIEW_MODEL y SUPERVISOR_MODEL
│   │   ├── security.ts             # runSecurityAgent()
│   │   ├── performance.ts          # runPerformanceAgent()
│   │   ├── maintainability.ts      # runMaintainabilityAgent()
│   │   └── supervisor.ts           # runSupervisorAgent()
│   └── workflow/
│       └── orchestrate.ts          # orchestrate() — el director de todos los agentes
└── components/reviewer/
    ├── code-input.tsx              # Editor de código + tab de GitHub URL
    ├── workflow-progress.tsx        # Línea de tiempo de agentes en tiempo real
    ├── finding-card.tsx            # Card expandible con diff de código
    └── report-summary.tsx          # Gauge de puntuación + tabs por categoría
```

### Archivo por archivo: qué hace cada uno

#### `lib/schemas.ts` — Los tipos de datos de toda la aplicación

```typescript
// Un hallazgo individual de cualquier agente
export const FindingSchema = z.object({
  severity: z.enum(['critical', 'high', 'medium', 'low', 'info']),
  category: z.enum(['security', 'performance', 'maintainability']),
  title: z.string(),
  line: z.number().int().positive().optional(),   // Número de línea del problema
  description: z.string(),                         // Descripción del problema
  suggestion: z.string(),                          // Cómo arreglarlo
  codeExample: z.object({                          // Diff antes/después (opcional)
    before: z.string(),
    after: z.string(),
  }).optional(),
});

// El reporte final que produce el supervisor
export const ReviewReportSchema = z.object({
  score: z.number().int().min(0).max(100),          // Puntuación global
  summary: z.string(),                               // Resumen ejecutivo (2-3 frases)
  recommendation: z.string(),                        // Lo más importante a hacer
  findings: FindingArraySchema,                      // Todos los hallazgos consolidados
});
```

Estos esquemas son los contratos entre los agentes y la UI. `generateObject` de AI SDK v6 valida automáticamente que la salida del modelo cumple con el esquema antes de devolverla.

---

#### `lib/agent/security.ts` — El agente de seguridad

```typescript
const SYSTEM = `You are a security code reviewer. Analyze the provided code and identify security vulnerabilities.

Focus on:
- SQL injection, command injection, XSS vulnerabilities
- Hardcoded secrets, API keys, passwords
- Insecure deserialization or eval usage
- Missing input validation at system boundaries
- Dangerous use of user-controlled data
- Authentication or authorization flaws

Return a list of findings. If the code is secure, return an empty array.
For each finding with a code fix, include a codeExample with before/after.
Be concise: title max 10 words, description max 50 words, suggestion max 50 words.`;

export async function runSecurityAgent(code: string, meta: CodeMetadata): Promise<Finding[]> {
  const { object } = await generateObject({
    model: REVIEW_MODEL,              // claude-sonnet-4.6
    schema: FindingArraySchema,       // ← el modelo DEBE devolver JSON que cumpla este esquema
    system: SYSTEM,
    prompt: `Language: ${meta.lang}\nLines: ${meta.lines}\n\nCode:\n\`\`\`${meta.lang}\n${code}\n\`\`\``,
  });
  return object; // Ya está validado y tipado: Finding[]
}
```

Los agentes de Rendimiento y Mantenibilidad tienen exactamente la misma estructura — solo cambia el `SYSTEM` prompt con el enfoque de cada especialista.

---

#### `lib/agent/supervisor.ts` — El supervisor que consolida todo

```typescript
const SYSTEM = `You are a senior engineering lead synthesizing findings from 3 specialized code reviewers.

Your job:
1. Deduplicate findings that cover the same underlying issue (keep the most specific one)
2. Reprioritize: security > performance > maintainability when severity is equal
3. Write a 2-3 sentence executive summary
4. Write a 1-sentence actionable recommendation
5. Assign a score 0-100:
   90+ = production-ready
   70-89 = minor issues
   50-69 = needs work before shipping
   <50 = significant problems`;

export async function runSupervisorAgent(findings: Finding[], meta: CodeMetadata): Promise<ReviewReport> {
  const { object } = await generateObject({
    model: SUPERVISOR_MODEL,          // claude-haiku-4.5 (más barato, tarea mecánica)
    schema: ReviewReportSchema,       // Finding[] + score + summary + recommendation
    system: SYSTEM,
    prompt: `Metadata: ${meta.lang}, ${meta.lines} lines\n\nFindings:\n${JSON.stringify(findings, null, 2)}`,
  });
  return object;
}
```

**¿Por qué Haiku para el supervisor?** La tarea del supervisor es mecánica: ordenar, deduplicar, contar, resumir. No requiere el razonamiento profundo que necesitan los especialistas para detectar vulnerabilidades sutiles. Usar Haiku aquí reduce costos sin sacrificar calidad.

---

#### `lib/workflow/orchestrate.ts` — El director de orquesta

```typescript
export async function orchestrate(send: SendEvent, input: ReviewInput): Promise<void> {
  const jobId = crypto.randomUUID();
  send({ type: 'started', jobId });

  // Paso 1: Obtener el código
  const code = input.inputType === 'github-url'
    ? await fetchGitHubFile(input.value)  // Descarga desde GitHub
    : input.value;                         // O usa el snippet directamente

  // Paso 2: Extraer metadatos
  const meta = extractMetadata(code);     // lang, lines, estimatedComplexity

  // Paso 3: Anunciar los 3 agentes ANTES de esperarlos
  // (esto hace que la UI los muestre como "running" simultáneamente)
  send({ type: 'agent', name: 'security', status: 'running' });
  send({ type: 'agent', name: 'performance', status: 'running' });
  send({ type: 'agent', name: 'maintainability', status: 'running' });

  // Paso 4: Ejecutar los 3 en paralelo
  const [secFindings, perfFindings, maintFindings] = await Promise.all([
    runSecurityAgent(code, meta).then((findings) => {
      send({ type: 'agent', name: 'security', status: 'done', findings });
      return findings;
    }),
    runPerformanceAgent(code, meta).then((findings) => {
      send({ type: 'agent', name: 'performance', status: 'done', findings });
      return findings;
    }),
    runMaintainabilityAgent(code, meta).then((findings) => {
      send({ type: 'agent', name: 'maintainability', status: 'done', findings });
      return findings;
    }),
  ]);

  // Paso 5: Supervisor (secuencial — necesita los resultados de todos)
  const report = await runSupervisorAgent(
    [...secFindings, ...perfFindings, ...maintFindings],
    meta,
  );

  send({ type: 'report', report });
  send({ type: 'done' });
}
```

**El truco del SSE:** En vez de hacer polling desde el cliente ("¿ya terminó?"), el cliente abre una conexión SSE y el servidor empuja eventos conforme ocurren. Esto da una UX de progreso en tiempo real sin complejidad adicional.

---

#### `app/api/review/route.ts` — El endpoint SSE

```typescript
export async function POST(req: Request) {
  // Rate limit: 3 reviews/IP/hora
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const limit = rateLimit(ip, { max: 3, windowMs: 60 * 60 * 1000 });
  if (!limit.allowed) return new Response('Rate limit exceeded', { status: 429 });

  const body = await req.json() as ReviewInput;

  // Crea un ReadableStream que enviará eventos SSE
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: object) => {
        // Formato SSE: "data: <json>\n\n"
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      try {
        await orchestrate(send, body);
      } catch (err) {
        send({ type: 'error', message: String(err) });
      } finally {
        controller.close(); // Cierra la conexión SSE
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',  // ← Indica al browser que es SSE
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

---

### Cómo funciona `generateObject` — el corazón de los agentes

`generateObject` es la función de AI SDK v6 que:
1. Llama al modelo de lenguaje
2. Le pide que responda en formato JSON siguiendo un esquema Zod específico
3. Valida automáticamente la respuesta contra ese esquema
4. Lanza un error si el modelo no cumple el esquema (o reintenta, dependiendo de la config)

```typescript
const { object } = await generateObject({
  model: REVIEW_MODEL,
  schema: FindingArraySchema,  // Zod schema = el contrato
  system: "Eres un revisor de seguridad...",
  prompt: `Código:\n${code}`,
});
// object es Finding[] — completamente tipado, sin parsing manual
```

**¿Por qué esto es mejor que parsear texto libre?** Si el modelo devuelve markdown con hallazgos en texto, necesitas regex o lógica de parsing frágil. Con `generateObject`, el modelo está obligado a devolver JSON estructurado y si no lo hace, el SDK lo rechaza. Cero parsing, cero casos edge.

---

## Stack tecnológico

| Capa | Tecnología | ¿Por qué? |
|------|-----------|-----------|
| Framework | Next.js 16 App Router | Server Components, Route Handlers, deploy en Vercel |
| AI SDK | Vercel AI SDK v6 | `generateObject` con Zod, streaming nativo |
| Modelos | `claude-sonnet-4.6` (especialistas) + `claude-haiku-4.5` (supervisor) | Sonnet para análisis profundo, Haiku para síntesis mecánica |
| Gateway | Vercel AI Gateway | Una sola API key para todos los modelos |
| Schemas | Zod v4 | Contratos entre agentes y UI, validación automática |
| Streaming | SSE (Server-Sent Events) nativo | Sin dependencias externas, compatible con cualquier cliente |
| UI | Tailwind v4 | Componentes del reviewer construidos desde cero |
| Deploy | Vercel (Hobby, 120s timeout) | Suficiente para análisis de la mayoría de archivos |

---

## Setup local

```bash
git clone https://github.com/NeryC/multi-agent-code-reviewer
cd multi-agent-code-reviewer
npm install
```

Crea `.env.local`:
```env
AI_GATEWAY_API_KEY=tu_clave_de_vercel_ai_gateway
```

```bash
npm run dev    # → http://localhost:3000
npm test       # → tests de schemas, metadata, rate-limit
```

---

## Decisiones técnicas explicadas

### ¿Por qué un único endpoint SSE en vez de POST + polling?

La arquitectura alternativa sería:
1. `POST /api/review/start` → devuelve un `jobId`
2. `GET /api/review/status?jobId=xxx` → el cliente hace polling cada segundo
3. Necesitas almacenamiento compartido (Vercel KV, Redis) para que el estado del job persista

Con un endpoint SSE único, el POST mismo es el stream. El cliente abre la conexión y el servidor empuja eventos mientras los agentes trabajan. Elimina la necesidad de almacenamiento externo manteniendo exactamente la misma UX de progreso en tiempo real.

### ¿Por qué paralelo + supervisor en vez de un solo agente?

Un solo agente que revisa seguridad, rendimiento y mantenibilidad al mismo tiempo tiende a:
- Olvidar categorías si el código es largo
- No ser tan sistemático como un especialista enfocado
- Producir hallazgos desequilibrados (muchos de una categoría, pocos de otras)

Con agentes especializados, cada uno tiene su propio system prompt con criterios detallados de su dominio. El supervisor recibe los resultados consolidados y solo tiene que ordenar, deduplicar y resumir — tarea para la que Haiku es más que suficiente.

### ¿Por qué `Promise.all` en vez de secuencial?

Los 3 agentes especialistas son completamente independientes entre sí — el agente de seguridad no necesita los resultados del de rendimiento ni viceversa. Ejecutarlos en paralelo reduce el tiempo total de ~45s (secuencial) a ~15s (paralelo). El supervisor sí necesita los 3 resultados, por lo que se ejecuta después de que `Promise.all` resuelve.

---

## Límites

| Límite | Valor | Razón |
|--------|-------|-------|
| Reviews por IP/hora | 3 | Cada review hace 4 llamadas a LLMs (costoso) |
| Timeout máximo | 120 segundos | Límite del plan Vercel Hobby |
| GitHub repos | Solo públicos | No hay OAuth implementado |
| Tamaño de código | Sin límite duro | Archivos muy grandes pueden alcanzar el timeout |
