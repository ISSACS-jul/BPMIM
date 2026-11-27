import { MatchingPair, Question } from "../types/quiz";

export interface MatchingRightItem {
  text: string;
  pairId?: string;
}

/**
 * Construye una lista mezclada aleatoriamente de la Columna B (respuestas + distractores),
 * garantizando que no quede en el orden trivial 1->A, 2->B cuando hay 2 o más pares.
 */
export function buildShuffledMatchingOrder(
  pairs: MatchingPair[],
  distractors: string[] = []
): MatchingRightItem[] {
  const items: MatchingRightItem[] = [
    ...pairs.map((p) => ({ text: p.right, pairId: p.id })),
    ...distractors.filter((d) => d.trim()).map((d) => ({ text: d.trim() })),
  ];

  if (items.length <= 1) return items;

  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // Evitar que todos queden en la misma posición original si hay >= 2 pares
  const allSame =
    pairs.length >= 2 &&
    pairs.every((p, idx) => shuffled[idx]?.pairId === p.id);
  if (allSame) {
    [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
  }

  return shuffled;
}

/**
 * Obtiene la Columna B en su orden mezclado (usando matchingRightOrder si existe,
 * o generando un orden mezclado determinista basado en el ID de la pregunta).
 */
export function getShuffledMatchingRight(q: Question): MatchingRightItem[] {
  const pairs = q.matchingPairs || [];
  const distractors = q.matchingDistractors || [];

  if (q.matchingRightOrder && q.matchingRightOrder.length > 0) {
    return q.matchingRightOrder;
  }

  const items: MatchingRightItem[] = [
    ...pairs.map((p) => ({ text: p.right, pairId: p.id })),
    ...distractors.filter((d) => d.trim()).map((d) => ({ text: d.trim() })),
  ];

  if (items.length <= 1) return items;

  // Mezcla determinista (rotación + intercambio) para que nunca sea 1->A, 2->B por defecto
  const seed = q.id.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const rotated = items.map((_, idx) => items[(idx + (seed % (items.length - 1)) + 1) % items.length]);
  return rotated;
}
