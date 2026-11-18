import katex from "katex";
import { marked } from "marked";
import { getImageSync } from "./imageStore";
import { parseImageAlt } from "./imageSize";

/**
 * Procesa un texto que contiene Markdown y fórmulas LaTeX ($...$ para inline, $$...$$ para bloque).
 * Renderiza las fórmulas con KaTeX de forma instantánea y resuelve las rutas de imagenes/ a dataURLs en memoria
 * aplicando el tamaño de imagen configurado (ej: 25%, 50%, 75%, 100%).
 */
export function renderMarkdownWithMath(text: string): string {
  if (!text) return "";

  // 1. Reemplazar rutas de imágenes relativas (imagenes/...) por su dataUrl en caché y formatear el tamaño
  let resolvedText = text.replace(
    /!\[(.*?)\]\(((?:imagenes\/|images\/|\.\/imagenes\/)[^)\s]+)\)/g,
    (match, altRaw, path) => {
      const cached = getImageSync(path);
      const { alt, widthPercent } = parseImageAlt(altRaw);
      const imgSrc = cached || path;
      return `<img src="${imgSrc}" alt="${alt}" style="max-width: ${widthPercent}%; height: auto; margin: 0.75rem auto; display: block; border-radius: 0.5rem;" />`;
    }
  );

  // Si tiene imágenes directas con dataUrl o http que tengan |width%
  resolvedText = resolvedText.replace(
    /!\[(.*?\|(?:\d+%?|pequeña|pequena|mediana|grande|completa))\]\((data:image\/[^)\s]+|https?:\/\/[^)\s]+)\)/gi,
    (_, altRaw, src) => {
      const { alt, widthPercent } = parseImageAlt(altRaw);
      return `<img src="${src}" alt="${alt}" style="max-width: ${widthPercent}%; height: auto; margin: 0.75rem auto; display: block; border-radius: 0.5rem;" />`;
    }
  );

  // 2. Reemplazar bloques matemáticos $$...$$ por un marcador temporal
  const mathBlocks: string[] = [];
  let processed = resolvedText.replace(/\$\$([\s\S]+?)\$\$/g, (_, math) => {
    try {
      const rendered = katex.renderToString(math.trim(), {
        displayMode: true,
        throwOnError: false,
      });
      mathBlocks.push(rendered);
      return `%%MATH_BLOCK_${mathBlocks.length - 1}%%`;
    } catch {
      return `$$${math}$$`;
    }
  });

  // 3. Reemplazar fórmulas en línea $...$
  const mathInlines: string[] = [];
  processed = processed.replace(/(?<!\\)\$([^\$\n]+?)\$/g, (_, math) => {
    try {
      const rendered = katex.renderToString(math.trim(), {
        displayMode: false,
        throwOnError: false,
      });
      mathInlines.push(rendered);
      return `%%MATH_INLINE_${mathInlines.length - 1}%%`;
    } catch {
      return `$${math}$`;
    }
  });

  // 4. Renderizar Markdown con Marked
  let html = marked.parse(processed, {
    gfm: true,
    breaks: true,
  }) as string;

  // 5. Restaurar los bloques y fórmulas matemáticas ya renderizados
  html = html.replace(/%%MATH_BLOCK_(\d+)%%/g, (_, index) => {
    return `<div class="katex-display-wrapper my-2 overflow-x-auto">${mathBlocks[Number(index)]}</div>`;
  });

  html = html.replace(/%%MATH_INLINE_(\d+)%%/g, (_, index) => {
    return mathInlines[Number(index)] || "";
  });

  return html;
}
