import katex from "katex";
import { marked } from "marked";
import { getImageSync } from "./imageStore";
import { parseImageAlt } from "./imageSize";

export interface RenderOptions {
  showBlankAnswers?: boolean; // Si true, muestra la respuesta dentro del hueco (Solucionario)
}

/**
 * Extrae el ID de un video de YouTube si la URL corresponde a YouTube.
 */
export function extractYouTubeId(url: string): string | null {
  const trimmed = (url || "").trim();
  const ytMatch = trimmed.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,})/
  );
  return ytMatch ? ytMatch[1] : null;
}

/**
 * Extrae información de embed de YouTube, Vimeo o video directo.
 */
export function parseVideoUrl(url: string): { kind: "youtube" | "vimeo" | "direct"; embedUrl: string; youtubeId?: string } {
  const trimmed = (url || "").trim();
  const ytId = extractYouTubeId(trimmed);
  if (ytId) {
    return { kind: "youtube", embedUrl: `https://www.youtube.com/embed/${ytId}`, youtubeId: ytId };
  }
  // Vimeo
  const vimeoMatch = trimmed.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch) {
    return { kind: "vimeo", embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}` };
  }
  return { kind: "direct", embedUrl: trimmed };
}

/**
 * Procesa un texto que contiene Markdown, tablas GFM, huecos {{respuesta}} y fórmulas LaTeX ($...$, $$...$$).
 */
export function renderMarkdownWithMath(text: string, options: RenderOptions = {}): string {
  if (!text) return "";

  // 1. Reemplazar rutas de imágenes relativas (imagenes/...) por su dataUrl en caché y formatear el tamaño
  let resolvedText = text.replace(
    /!\[(.*?)\]\(((?:imagenes\/|images\/|\.\/imagenes\/)[^)\s]+)\)/g,
    (_, altRaw, path) => {
      const cached = getImageSync(path);
      const { alt, widthPercent } = parseImageAlt(altRaw);
      const imgSrc = cached || path;
      return `<img src="${imgSrc}" alt="${alt}" style="max-width: ${widthPercent}%; height: auto; margin: 0.75rem auto; display: block; border-radius: 0.5rem;" />`;
    }
  );

  // Imágenes directas con dataUrl o http que tengan |width%
  resolvedText = resolvedText.replace(
    /!\[(.*?\|(?:\d+%?|pequeña|pequena|mediana|grande|completa))\]\((data:image\/[^)\s]+|https?:\/\/[^)\s]+)\)/gi,
    (_, altRaw, src) => {
      const { alt, widthPercent } = parseImageAlt(altRaw);
      return `<img src="${src}" alt="${alt}" style="max-width: ${widthPercent}%; height: auto; margin: 0.75rem auto; display: block; border-radius: 0.5rem;" />`;
    }
  );

  // 2. Proteger huecos de completar espacios: {{respuesta}} o [hueco]
  const blanks: string[] = [];
  resolvedText = resolvedText.replace(/\{\{([^}]+?)\}\}/g, (_, ans) => {
    const clean = ans.trim();
    if (options.showBlankAnswers) {
      blanks.push(
        `<span class="inline-block px-2 py-0.5 mx-0.5 rounded bg-emerald-600/20 border border-emerald-500/50 text-emerald-400 font-semibold text-[0.92em]">${clean}</span>`
      );
    } else {
      const minW = Math.max(5, Math.min(18, clean.length + 2));
      blanks.push(
        `<span class="inline-block border-b-2 border-sky-400/70 bg-sky-500/10 rounded-t px-1.5 mx-0.5 text-transparent select-none" style="min-width:${minW}ch;">${clean}</span>`
      );
    }
    return `%%BLANK_TOKEN_${blanks.length - 1}%%`;
  });

  resolvedText = resolvedText.replace(/\[hueco\]/gi, () => {
    blanks.push(
      `<span class="inline-block border-b-2 border-sky-400/70 bg-sky-500/10 rounded-t px-2 mx-0.5 text-transparent select-none" style="min-width:8ch;">____</span>`
    );
    return `%%BLANK_TOKEN_${blanks.length - 1}%%`;
  });

  // 3. Reemplazar bloques matemáticos $$...$$ por un marcador temporal
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

  // 4. Reemplazar fórmulas en línea $...$
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

  // 5. Renderizar Markdown con Marked (incluye soporte GFM para tablas)
  let html = marked.parse(processed, {
    gfm: true,
    breaks: true,
  }) as string;

  // 6. Restaurar los bloques, fórmulas y huecos
  html = html.replace(/%%MATH_BLOCK_(\d+)%%/g, (_, index) => {
    return `<div class="katex-display-wrapper my-2 overflow-x-auto">${mathBlocks[Number(index)]}</div>`;
  });

  html = html.replace(/%%MATH_INLINE_(\d+)%%/g, (_, index) => {
    return mathInlines[Number(index)] || "";
  });

  html = html.replace(/%%BLANK_TOKEN_(\d+)%%/g, (_, index) => {
    return blanks[Number(index)] || "";
  });

  return html;
}
