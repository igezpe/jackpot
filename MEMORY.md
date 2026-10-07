# MEMORY.md - Jackpot

Memoria del proyecto entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no aporte.

## Estado actual
- **Jackpot Gramatical**: funcionando. `npm run check` → 756/756.
- **Reported Speech** (paso 2 tras acertar): funciona (input prellenado `"Maria said that "`, validación y card de feedback). La lógica vive en `src/lib/reportedSpeech.ts`.
- **Conditionals Jackpot**: pestaña nueva con 5 rodillos (Usage → Subject → Condition → Result → Polarity), giro encadenado, validación de las 4 estructuras, card verde/roja y **pantalla de configuración** con exportar/importar JSON.
- Animación de condicionales: reutiliza `Reel` + hook `useConditionalSlotMachine` (misma cinta que el Jackpot Gramatical).
- Auto-guardado con debounce (500 ms) en `useReelsData`, `useConditionalsData`, `useWorkplaceChat`, `usePhrasalVerbs` y `useVocabulary`.
- **Workplace Chat**: pestaña (Slack/Teams/Email). 2 rodillos (frase ES + tono); validación tolerante por variantes; repetición ponderada; modal de config (CRUD, export/import, Reset Stats).
- **Phrasal Verbs**: pestaña con 2 rodillos (significado ES + categoría) y oración de contexto con hueco; se escribe el phrasal verb; validación tolerante (variantes + misma partícula con verbo conjugado); repetición ponderada; modal de config (CRUD, export/import, Reset Stats). Clave `jackpot.phrasalVerbs.v1`.
- **Vocabulary**: pestaña con 2 rodillos (término ES + categoría); se escribe la traducción; validación tolerante (principal + variantes/plurales); repetición ponderada; modal de config (CRUD, export/import, Reset Stats). Clave `jackpot.vocabulary.v1`.
- Normalización de respuestas compartida en `src/lib/answerText.ts` (expande contracciones: `I'll` = `I will`). La usan Workplace Chat, Phrasal Verbs y Vocabulary.
- Contador superior derecho (`solved / total`): lo alimenta `recordResult(correcto)` en `App.tsx`; lo usan las 5 secciones (gramática, condicionales, workplace chat, phrasal verbs y vocabulario). Reported Speech (paso 2 de gramática) NO lo actualiza.
- **PWA**: `public/manifest.webmanifest` + `public/sw.js` (propios, sin dependencias) + íconos en `public/icons/`. Registro del SW en `src/main.tsx` solo en `PROD`. Requiere HTTPS para instalarse/offline. Script `npm run build:web` (= `vite build`, evita el `tsc` roto).

## Decisiones (y porqué)
- Datos de usuario en `localStorage` con **prioridad sobre el JSON**: claves `jackpot.reelsData.v1` y `jackpot.conditionalsData.v1`. "Restablecer" las borra.
- Condicionales: el tipo (zero/first/second/third) guía la coherencia; R3 filtra por `allowedSubjects`/`allowedConditions`, R4 por `compatibleResults`.
- Workplace Chat: clave `jackpot.workplaceChat.v1`; las variantes que terminan en `...` se aceptan por prefijo (una contiene a la otra). El editor no permite borrar la última frase.
- Validación de condicionales: tolera escribir o no `"If"`; exige concordancia sujeto-verbo, participio en third, forma base tras will/would, y polaridad `[+/+]` o `[-/-]` **por cláusula**.
- `buildConditionalSentence` debe pasar `validateConditionalAnswer` (probado con 5000 giros). Si editas verbos/estructura, revisa ambos.

## Aprendizajes y errores a evitar
- JSX: no poner un ternario suelto tras `className`; usar template literal `` className={`... ${cond ? 'a' : 'b'}`} ``.
- `useRef(null)` sin tipo rompe asignaciones numéricas → usar `useRef<number | null>(null)`.
- `src/lib/reportedSpeech.ts` tiene **errores de tipos preexistentes** que hacen fallar `npm run build` (no afectan al dev server). No modificar su validación sin pedido explícito.
- Al automatizar ediciones, verificar el patrón exacto (comillas/espacios); un patrón mal escapado no coincide y deja el bug.

## Próximos pasos
- Deploy de la PWA a un host con HTTPS (Netlify/Vercel/GitHub Pages) para instalarla en Android.
- Prueba visual final de Vocabulary (tirada, foco en input, ponderación).
- Prueba visual final de Phrasal Verbs (tirada, contexto, foco en input).
- Prueba visual final del Workplace Chat (tirada, foco en el input, ponderación).
- Corregir los errores de tipos de `reportedSpeech.ts` para dejar `npm run build` en verde (pedir OK antes).
- Prueba visual final en navegador de la animación y la config de condicionales.
