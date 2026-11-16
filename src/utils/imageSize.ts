/**
 * Parsea la sintaxis extendida de imágenes Markdown:
 *   ![descripción|50%](imagenes/foto.png)
 *   ![descripción|pequeña](imagenes/foto.png)
 *   ![descripción](imagenes/foto.png)  → 50% por defecto
 *
 * Retorna { alt, widthPercent }
 */
export function parseImageAlt(raw: string): { alt: string; widthPercent: number } {
  const pipeIdx = raw.lastIndexOf("|");
  if (pipeIdx === -1) {
    return { alt: raw, widthPercent: 50 };
  }

  const before = raw.substring(0, pipeIdx).trim();
  const after = raw.substring(pipeIdx + 1).trim().toLowerCase();

  // Named sizes
  const namedSizes: Record<string, number> = {
    pequeña: 25, pequena: 25, chica: 25, small: 25, s: 25,
    mediana: 50, medium: 50, m: 50,
    grande: 70, large: 70, l: 70,
    completa: 90, full: 90, xl: 90,
  };

  if (namedSizes[after] !== undefined) {
    return { alt: before, widthPercent: namedSizes[after] };
  }

  // Percentage: "50%", "75", "30%"
  const numMatch = after.match(/^(\d+)%?$/);
  if (numMatch) {
    const pct = Math.min(100, Math.max(10, Number(numMatch[1])));
    return { alt: before, widthPercent: pct };
  }

  return { alt: raw, widthPercent: 50 };
}

/**
 * Genera la cadena Markdown para una imagen con su tamaño.
 *   buildImageMarkdown("Diagrama", "imagenes/foto.png", 50)
 *   → "![Diagrama|50%](imagenes/foto.png)"
 */
export function buildImageMarkdown(alt: string, path: string, widthPercent: number): string {
  return `\n![${alt}|${widthPercent}%](${path})\n`;
}
