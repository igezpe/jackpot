# MEMORY.md - Jackpot

Memoria del proyecto entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no aporte.

## Estado actual
- **6 pestañas**: Gramatical Jackpot, Conditionals Jackpot, Workplace Chat, Phrasal Verbs, Vocabulary, Orders & Requests.
- **Gramatical Jackpot** (antes «Jackpot Gramatical»): 4 rodillos (`Reel`). `npm run check` → 4536/4536.
- **Conditionals Jackpot**: 5 rodillos encadenados (`useConditionalSlotMachine`), valida las 4 estructuras; modal de config con export/import JSON.
- **Mazo de cartas** (Workplace Chat, Phrasal Verbs, Vocabulary, Orders & Requests): cada ítem tiene **una sola opción**, así que NO usan rodillos. Componente genérico `src/components/PlayingCard.tsx` (dorso rojo/negro, flip 3D con clic o Enter) sobre paño verde (`@utility felt`). Botón «Sacar otra carta» reparte boca abajo y **nunca repite la anterior**. Datos: `phrasalVerbsData.json` (pv_*) y `workplaceChatData.json` (chat_*) ampliados con más ítems.
- **Flujo por teclado** (6 secciones): respuesta **correcta** → foco a «Tirar»/«Sacar otra carta»; **incorrecta** → foco al input. Al repartir, el foco va a la carta; Enter la voltea y pasa el foco al input.
- **Reported Speech**: removido de Gramatical Jackpot (commit `e73351e`). `src/lib/reportedSpeech.ts` queda como código muerto, pendiente de una sección aparte.
- Auto-guardado con debounce (500 ms) vía `useReelsData`, `useConditionalsData`, `useWorkplaceChat`, `usePhrasalVerbs`, `useVocabulary`, `useOrdersRequests`.
- Validación tolerante por variantes en las 4 secciones de cartas; normalización compartida en `src/lib/answerText.ts` (expande contracciones: `I'll` = `I will`).
- Contador superior derecho (`solved / total`): lo alimenta `recordResult(correcto)` en `App.tsx`; lo usan las **6** secciones. **Persiste** en localStorage (`jackpot.stats.v1`).
- **PWA**: `public/manifest.webmanifest` + `public/sw.js` + íconos en `public/icons/`. SW solo en `PROD`. Script `npm run build:web` (= `vite build`, evita el `tsc` roto).

## Decisiones (y porqué)
- Datos de usuario en `localStorage` con **prioridad sobre el JSON**; claves `jackpot.<seccion>.v1`. "Restablecer" las borra.
- `Reel` se mantiene **solo** para las secciones que combinan opciones independientes (Gramatical y Conditionals). No tocar su animación.
- Cartas: la info que antes era el 2.º rodillo (categoría/contexto/tipo) vive **dentro de la cara** de la carta.
- Condicionales: el tipo (zero/first/second/third) guía la coherencia (filtros por `allowedSubjects`/`allowedConditions`/`compatibleResults`) y `buildConditionalSentence` debe pasar `validateConditionalAnswer`.
- El atajo global de `Espacio` (tirar) sólo actúa en `currentView === 'jackpot'`.

## Aprendizajes y errores a evitar
- `PlayingCard` expone `buttonRef` y `AnswerPanel` expone `inputRef` para manejar el foco desde el padre.
- Al repartir carta el foco se mueve en `requestAnimationFrame`: la `key={combo.id}` remonta el botón.
- `src/lib/reportedSpeech.ts` tiene **errores de tipos preexistentes** que hacen fallar `npm run build`. No modificar sin pedido explícito.
- JSX: no poner un ternario suelto tras `className`; usar template literal.
- `useRef(null)` sin tipo rompe asignaciones numéricas → `useRef<number | null>(null)`.
- Al automatizar ediciones, verificar el patrón exacto; un patrón mal escapado no coincide y deja el bug.

## Próximos pasos
- Deploy de la PWA a un host con HTTPS (Netlify/Vercel/GitHub Pages).
- Decidir qué hacer con `reportedSpeech.ts` (borrar o reutilizar en sección aparte) para dejar `npm run build` en verde.
- Arquitectura frontend + backend (login, sync de progreso, contenido centralizado).
