/**
 * Normalización de respuestas de texto libre para comparar variantes.
 *
 * Expande contracciones (para que «I'll» y «I will» cuenten igual) y elimina
 * puntuación, mayúsculas y espacios sobrantes. La usan Workplace Chat y
 * Phrasal Verbs.
 */
export const ANSWER_CONTRACTIONS: Record<string, string> = {
  "i'm": 'i am',
  "i'll": 'i will',
  "i've": 'i have',
  "i'd": 'i would',
  "you're": 'you are',
  "you'll": 'you will',
  "you've": 'you have',
  "you'd": 'you would',
  "we're": 'we are',
  "we'll": 'we will',
  "we've": 'we have',
  "we'd": 'we would',
  "they're": 'they are',
  "they'll": 'they will',
  "they've": 'they have',
  "they'd": 'they would',
  "he's": 'he is',
  "he'll": 'he will',
  "he'd": 'he would',
  "she's": 'she is',
  "she'll": 'she will',
  "she'd": 'she would',
  "it's": 'it is',
  "it'll": 'it will',
  "it'd": 'it would',
  "that's": 'that is',
  "what's": 'what is',
  "let's": 'let us',
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
  "wouldn't": 'would not',
  "can't": 'can not',
  cannot: 'can not',
  "couldn't": 'could not',
  "shouldn't": 'should not',
  "mustn't": 'must not',
}

/** Minúsculas + expansión de contracciones + sin puntuación ni espacios extra. */
export function normalizeAnswerText(input: string): string {
  const lowered = input.toLowerCase().replace(/[\u2018\u2019\u02BC\uFF07]/g, "'")
  const expanded = lowered.replace(/[a-z]+(?:'[a-z]+)?/g, (token) => ANSWER_CONTRACTIONS[token] ?? token)
  return expanded
    .replace(/\u00A0/g, ' ')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
