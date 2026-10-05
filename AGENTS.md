# AGENTS.md

Juego web de práctica de tiempos verbales en inglés con 4 rodillos. React 19 + TypeScript + Vite 8 + Tailwind v4. Sin backend: todo el estado vive en `localStorage`.

`README.md` es la plantilla de Vite sin modificar. **No lo tomes como referencia.**

## Comandos

```bash
npm run dev      # servidor de desarrollo
npm run build    # tsc -b && vite build  (el typecheck es parte del build)
npm run lint     # oxlint
npm run check    # suite de tests del validador (ver abajo)
```

No hay framework de tests. `npm run check` **es** la suite: ejecuta `scripts/check-validator.ts` con `tsx` y falla con `process.exit(1)`.

Orden útil antes de cerrar un cambio en el validador: `npm run lint && npm run check && npm run build`.

## Memoria
- Al empezar, lee `MEMORY.md` para conocer el estado del proyecto y las decisiones tomadas.
- Al terminar una tarea, actualízalo: estado actual, decisiones importantes (con su porqué) y errores a evitar.
- Mantenlo breve (máximo ~50 líneas): resume o elimina lo que ya no aporte.
- Si algo se convierte en una regla permanente, propón moverlo a `AGENTS.md` en lugar de dejarlo en la memoria.
- No guardes nunca datos sensibles (claves, tokens, datos personales).

## Restricciones del compilador (rompen cambios silenciosamente)

`tsconfig.app.json` activa estas opciones; incumplirlas rompe el build:

- `verbatimModuleSyntax` → obligatorio `import type { X }` para tipos. Un `import { X }` de un tipo falla.
- `erasableSyntaxOnly` → nada de `enum`, ni parameter properties, ni namespaces.
- `noUnusedLocals` / `noUnusedParameters` → un import o parámetro sin usar es error.
- `moduleResolution: bundler` + `allowImportingTsExtensions`.

`scripts/` **no está en ningún `include` de tsconfig** (solo `src` y `vite.config.ts`), así que `tsc -b` no lo typechequea. Por eso `scripts/check-validator.ts` importa de `src` con extensión explícita (`.ts`), que tsx exige; el código de `src` importa sin extensión.

## Invariante central del proyecto

`buildExample(combo)` (en `src/lib/validator.ts`) genera la oración de ejemplo que se muestra con el botón "Ver ejemplo". Esa oración **tiene que pasar** `validate()`. `npm run check` recorre las 756 combinaciones posibles y falla si alguna no valida.

Si cambias la gramática esperada (auxiliar, forma verbal, conectores), cambia `buildExample` en el mismo commit o el botón empezará a mentir.

## Función Reported Speech

La función Reported Speech se desbloquea después de contestar correctamente la consigna primaria. Su comportamiento:

- **Desbloqueo**: Aparece después de `setIsPrimaryValid(true)` en la función `check()` cuando `outcome.valid` es true
- **Input auto-prellenado**: Un `useEffect` sincroniza `reportedSpeechInput` a `"Maria said that "` cuando `isPrimaryValid` becomes true
- **Validación exhaustiva**: `validateReportedSpeech(reportedSpeechInput, combo)` verifica:
  - El prefijo `"Maria said that"`
  - Backshift (cambio de tiempo verbal): present → past (is → was, am/are → was, have/has → had)
  - Pronombres: I → she, he; my → her, his; me → her, him
  - Conectores obligatorios: that, if, whether
- **Feedback**: Muestra "¡Correcto!" o el primer error encontrado

**Archivos clave:**
- `src/lib/reportedSpeech.ts`: Lógica de transformación y validación exhaustiva
- `src/App.tsx`: Estado (`isPrimaryValid`, `reportedSpeechInput`, `isReportedValid`, `reportedFeedbackMessage`) y UI dinámica
- `src/lib/validator.ts`: Motor de validación principal

**Para desarrollar sobre Reported Speech:**
- Si añades nuevos tiempos verbales, actualiza `planAux` y `buildExample` en `src/lib/validator.ts` (igual que la invariante central)
- Los `switch` en `buildExample`, `planAux` y `verbFormMessage` son exhaustivos sin `default`
- `buildExample(combo)` debe siempre pasar `validate()` - inspeccionado por `npm run check` sobre 756 combinaciones
- El `useEffect` de sincronización del input (`src/App.tsx`) depende de `[isPrimaryValid, reportedSpeechInput]`
- Los mensajes de error van en `mustPass[]` y `mustFail[]` lists al final de `scripts/check-validator.ts`

## `npm run check` en detalle

Además de las 756 combinaciones, el script mantiene dos listas manuales al final del fichero:

- `mustFail[]` — frases mal formadas que el motor debe rechazar, cada una con el `code` de error esperado. Si añades una forma de error nueva, añádela aquí.
- `mustPass[]` — frases correctas que el motor no debe marcar (mayúscula opcional, comas, apostrofos tipográficos).

Estos casos se eligen a ojo al escribirlos, así que si cambias `src/data/reelsData.json` revisa que los índices del helper `find()` (`find('He', 0, 'neg', 'habit')` = sujeto, verbo, tipo, momento) siguen apuntando al verbo y momento correctos.

## Añadir un tiempo verbal nuevo

Los `switch` de `buildExample`, `planAux` y `verbFormMessage` son exhaustivos sin `default`, así que TypeScript señala los huecos. Para un `Tense` nuevo hay que tocar:

1. La unión `Tense` en `src/types.ts`.
2. `TENSE_INFO` en `src/lib/grammar.ts` (obligatorio: `carrier`, `verbForm`, `verbFormAfterDo`, `formula`).
3. `planAux` y `buildExample` en `src/lib/validator.ts`.
4. Opcional: `TENSE_MARKER_RULES` (mensajes "usaste el tiempo verbal equivocado").

`carrier` decide el auxiliar esperado; `verbFormAfterDo` la forma del verbo cuando el auxiliar ya carga la marca (`didn't buy`, no `didn't bought`). Esa distinción es el corazón del motor.

## Configuración de los rodillos

- `src/data/reelsData.json` es el estado inicial, importado como módulo en `src/lib/storage.ts`.
- Cualquier edición del usuario se guarda en `localStorage` bajo `jackpot.reelsData.v1` y **tiene prioridad sobre el JSON**.

Consecuencia para desarrollo: tras editar `reelsData.json` verás la versión antigua hasta que pulses "Restablecer" en el modal de configuración (borra la clave) o limpies el almacenamiento del navegador.

`sanitizeData()` en `src/lib/storage.ts` normaliza cualquier JSON importado: descarta campos desconocidos, fuerza `tense` a un valor conocido de `TENSE_INFO` y a `type` a una polaridad válida. `validateSchema()` da los mensajes de error del importador; ambos toleran campos ausentes, no los exige.

## Animación de los rodillos

Dos constantes acopladas manualmente en `src/components/Reel.tsx`:

- `ITEM_HEIGHT = 96` debe coincidir con la clase `h-24` de la celda. Si cambias la altura, cambia ambas.
- `TOTAL_SPIN_MS` en `src/hooks/useSlotMachine.ts` debe ser ≥ `REEL_STAGGER_MS * 3 + REEL_DURATION_MS`, o la máquina se marca como detenida antes de que el último rodillo termine.

`useSlotMachine` mantiene separados `combo` (confirmado, el que hay que responder) y `pending` (destino de la tirada en curso). `pending` sólo pasa a `combo` al final del temporizador. No los unifiques: la animación usa el valor viejo como primer fotograma de la cinta.

`Reel` no sincroniza con efectos: en reposo ignora la cinta y renderiza `current`. El ajuste de estado se hace durante el render (patrón oficial de React) para no provocar renders intermedios. Si añades un `useEffect` de sincronización, rompes la continuidad visual.

## Tailwind v4

No hay `tailwind.config.js`. Todo el tema vive en el bloque `@theme` y las utilidades en `@utility` dentro de `src/index.css`. Colores disponibles: `night-950…600`, `gold-200…600`, `neon-300…500`, `candy-300…500`, `grape-400…500`. Animaciones: `animate-pop`, `animate-rise`, `animate-shake`, `animate-pulse-ring`, `animate-float`, `animate-marquee`. Utilidades propias: `panel`, `field`, `text-gold-gradient`, `marquee-track`.

## Lint

`oxlint` con plugins `react`, `typescript`, `oxc`; `typeAware` desactivado. Dos reglas que condicionan la estructura:

- `react/only-export-components` → un componente debe vivir en su propio fichero. Los helpers que comparte van a un módulo hermano sin componentes (`src/components/config/listHelpers.ts` existe por eso; `fields.tsx` se separó por el mismo motivo).
- `react/set-state-in-effect` en `src/components/Reel.tsx` es un aviso **esperado**: es el arranque de la animación con `requestAnimationFrame`. No lo "arregles" moviéndolo a un refactor; romperías la cinta.
