/**
 * Utilidades de texto: normalización, tokenización y expansión de contracciones.
 *
 * El motor de validación trabaja sobre una lista de tokens en minúsculas. Todas
 * las formas negativas se reducen a la secuencia `[auxiliar] + not + [verbo]`
 * (`doesn't` → `does not`), lo que simplifica enormemente el emparejamiento.
 */

const APOSTROPHES = /[\u2018\u2019\u02BC\uFF07]/g

/**
 * Contracciones relevantes para la gramática England-inglés. Sólo expandimos las
 * que afectan a la negación y a los auxiliares; el resto (`it's`, `I'm`…) se deja
 * intacto para no romper la detección de sujetos.
 */
const CONTRACTIONS: Record<string, string> = {
  "don't": 'do not',
  "doesn't": 'does not',
  "didn't": 'did not',
  "isn't": 'is not',
  "aren't": 'are not',
  "wasn't": 'was not',
  "weren't": 'were not',
  "haven't": 'have not',
  "hasn't": 'has not',
  "hadn't": 'had not',
  "won't": 'will not',
  "shalln't": 'shall not',
  "i'm": 'i am',
  "wouldn't": 'would not',
  "can't": 'can not',
  "cannot": 'can not',
  "couldn't": 'could not',
  "shouldn't": 'should not',
  "mustn't": 'must not',
}

const TOKEN_RE = /[a-z0-9]+(?:'[a-z0-9]+)?/gi

/** Limpia comillas tipográficas y espacios múltiples. */
export function normalizeText(input: string): string {
  return input
    .replace(APOSTROPHES, "'")
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Divide en palabras normalizadas, sin expandir contracciones. */
export function rawTokens(text: string): string[] {
  return normalizeText(text).toLowerCase().match(TOKEN_RE) ?? []
}

/** Sustituye cada contracción por su forma completa. */
export function expandContractions(tokens: readonly string[]): string[] {
  const out: string[] = []
  for (const token of tokens) {
    const replacement = CONTRACTIONS[token]
    if (replacement) out.push(...replacement.split(' '))
    else out.push(token)
  }
  return out
}

/** Pipeline completo: normaliza, divide y expande. */
export function tokenize(text: string): string[] {
  return expandContractions(rawTokens(text))
}

/** Tokens de una frase, sin expansión de contracciones. */
export function phraseTokens(phrase: string): string[] {
  return rawTokens(phrase)
}

/**
 * Busca `phrase` como secuencia **contigua** dentro de `tokens`.
 * Devuelve el índice del primer token o `-1` si no aparece.
 */
export function findPhrase(tokens: readonly string[], phrase: string): number {
  const needle = phraseTokens(phrase)
  if (needle.length === 0) return -1
  if (needle.length > tokens.length) return -1

  outer: for (let i = 0; i <= tokens.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (tokens[i + j] !== needle[j]) continue outer
    }
    return i
  }
  return -1
}

/** Variante de `findPhrase` que acepta tokens ya calculados. */
export function findTokenPhrase(tokens: readonly string[], needle: readonly string[]): number {
  if (needle.length === 0 || needle.length > tokens.length) return -1
  outer: for (let i = 0; i <= tokens.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (tokens[i + j] !== needle[j]) continue outer
    }
    return i
  }
  return -1
}

/** Primer índice de cualquiera de las palabras dadas, o `-1`. */
export function findAnyWord(tokens: readonly string[], words: readonly string[]): number {
  let best = -1
  for (const word of words) {
    const idx = tokens.indexOf(word)
    if (idx !== -1 && (best === -1 || idx < best)) best = idx
  }
  return best
}

/** ¿Contiene `tokens` al menos una de las frases dadas? */
export function containsAnyPhrase(tokens: readonly string[], phrases: readonly string[]): boolean {
  return phrases.some((phrase) => findPhrase(tokens, phrase) !== -1)
}