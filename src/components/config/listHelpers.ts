/**
 * Helpers de conversión entre los campos de texto del editor y las listas del JSON.
 *
 * En la UI los marcadores se escriben como "already, yet, ever" (cómodo de
 * editar) pero en el JSON se guardan como array de cadenas.
 */

/** Une una lista en el formato "a, b, c" que usan los campos de marcadores. */
export function listToText(list: string[] | undefined): string {
  return (list ?? []).join(', ')
}

/** Interpreta "a, b, c" (o "a; b; c") como lista de marcadores. */
export function textToList(text: string): string[] | undefined {
  const list = text
    .split(/[,;]/)
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.length > 0)
  return list.length > 0 ? list : undefined
}