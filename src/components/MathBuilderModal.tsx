import React, { useState, useMemo, useEffect, useRef } from "react";
import katex from "katex";
import { X, Check, Sigma, Eraser, ChevronDown, ChevronUp, ArrowLeft, ArrowRight } from "lucide-react";

interface MathBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (latexWrapped: string) => void;
  initialLatex?: string;
  initialBlockMode?: boolean;
}

interface SymbolabTile {
  preview: string;
  title: string;
  /** LaTeX snippet using `{|}` for cursor placement or `{SEL}` for wrapped selection */
  snippet: string;
}

const SYMBOLAB_ROW_1: SymbolabTile[] = [
  { preview: "x^2", title: "Al cuadrado", snippet: "{SEL}^{2}" },
  { preview: "x^{\\square}", title: "Potencia", snippet: "{SEL}^{{|}}" },
  { preview: "\\log_{\\square}", title: "Logaritmo", snippet: "\\log_{{|}}()" },
  { preview: "\\sqrt{\\square}", title: "Raíz cuadrada", snippet: "\\sqrt{{|}}" },
  { preview: "\\sqrt[\\square]{\\square}", title: "Raíz n-ésima", snippet: "\\sqrt[{|}]{}" },
  { preview: "\\le", title: "Menor o igual", snippet: "\\le " },
  { preview: "\\ge", title: "Mayor o igual", snippet: "\\ge " },
  { preview: "\\frac{\\square}{\\square}", title: "Fracción", snippet: "\\frac{{|}}{}" },
  { preview: "\\cdot", title: "Multiplicación", snippet: "\\cdot " },
  { preview: "\\div", title: "División", snippet: "\\div " },
  { preview: "x^{\\circ}", title: "Grados", snippet: "^{\\circ}" },
  { preview: "\\pi", title: "Pi", snippet: "\\pi" },
];

const SYMBOLAB_ROW_2: SymbolabTile[] = [
  { preview: "(\\square)'", title: "Derivada prima", snippet: "({|})'" },
  { preview: "\\frac{d}{dx}", title: "Derivada d/dx", snippet: "\\frac{d}{dx}({|})" },
  { preview: "\\frac{\\partial}{\\partial x}", title: "Derivada parcial", snippet: "\\frac{\\partial}{\\partial x}({|})" },
  { preview: "\\int", title: "Integral", snippet: "\\int {|}\\,dx" },
  { preview: "\\int_{\\square}^{\\square}", title: "Integral definida", snippet: "\\int_{{|}}^{} \\,dx" },
  { preview: "\\lim", title: "Límite", snippet: "\\lim_{{|}\\to 0} " },
  { preview: "\\sum", title: "Sumatoria", snippet: "\\sum_{{|}=1}^{n} " },
  { preview: "\\infty", title: "Infinito", snippet: "\\infty" },
  { preview: "\\theta", title: "Theta", snippet: "\\theta" },
  { preview: "(f\\circ g)", title: "Composición", snippet: "(f\\circ g)({|})" },
  { preview: "f(x)", title: "Función f(x)", snippet: "f({|})" },
  {
    preview: "\\begin{pmatrix} \\square & \\square \\\\ \\square & \\square \\end{pmatrix}",
    title: "Matriz 2×2",
    snippet: "\\begin{pmatrix} {|} &  \\\\  &  \\end{pmatrix}",
  },
];

const EXTRA_TILES: SymbolabTile[] = [
  { preview: "x_{\\square}", title: "Subíndice", snippet: "{SEL}_{{|}}" },
  { preview: "\\pm", title: "Más / Menos", snippet: "\\pm " },
  { preview: "\\neq", title: "Diferente", snippet: "\\neq " },
  { preview: "\\approx", title: "Aproximado", snippet: "\\approx " },
  { preview: "\\times", title: "Por (×)", snippet: "\\times " },
  { preview: "\\vec{v}", title: "Vector", snippet: "\\vec{{|}}" },
  { preview: "\\Delta", title: "Delta", snippet: "\\Delta " },
  { preview: "\\alpha", title: "Alfa", snippet: "\\alpha" },
  { preview: "\\beta", title: "Beta", snippet: "\\beta" },
  { preview: "\\mu", title: "Mu", snippet: "\\mu" },
  { preview: "\\Omega", title: "Ohmios (Ω)", snippet: "\\Omega" },
  { preview: "\\implies", title: "Entonces (⇒)", snippet: "\\implies " },
  {
    preview: "\\begin{cases} \\square \\\\ \\square \\end{cases}",
    title: "Sistema de ecuaciones",
    snippet: "\\begin{cases} {|} \\\\  \\end{cases}",
  },
  { preview: "\\text{m/s}", title: "m/s", snippet: "\\,\\text{m/s}" },
  { preview: "\\text{m/s}^2", title: "m/s²", snippet: "\\,\\text{m/s}^2" },
  { preview: "|x|", title: "Valor absoluto", snippet: "|{|}|" },
];

export const MathBuilderModal: React.FC<MathBuilderModalProps> = ({
  isOpen,
  onClose,
  onInsert,
  initialLatex = "",
  initialBlockMode = false,
}) => {
  const [latex, setLatex] = useState(initialLatex);
  const [displayMode, setDisplayMode] = useState<"inline" | "block">(
    initialBlockMode ? "block" : "inline"
  );
  const [showMoreTiles, setShowMoreTiles] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setLatex(initialLatex);
      setDisplayMode(initialBlockMode ? "block" : "inline");
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [isOpen, initialLatex, initialBlockMode]);

  const insertTileAtCursor = (tile: SymbolabTile) => {
    const el = inputRef.current;
    const start = el?.selectionStart ?? latex.length;
    const end = el?.selectionEnd ?? latex.length;
    const selected = latex.slice(start, end);

    let snippet = tile.snippet;
    if (snippet.includes("{SEL}")) {
      snippet = snippet.replace("{SEL}", selected || "");
    }

    const cursorMarker = "{|}";
    const markerIdx = snippet.indexOf(cursorMarker);
    const cleanSnippet = snippet.replace(cursorMarker, "");

    const next = latex.slice(0, start) + cleanSnippet + latex.slice(end);
    setLatex(next);

    const newCursorPos =
      markerIdx !== -1 ? start + markerIdx : start + cleanSnippet.length;

    setTimeout(() => {
      if (el) {
        el.focus();
        el.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  // Saltar al siguiente/anterior espacio `{}` en la fórmula
  const jumpBracketSlot = (direction: 1 | -1) => {
    const el = inputRef.current;
    if (!el) return;
    const pos = el.selectionStart ?? 0;
    if (direction === 1) {
      const nextBrace = latex.indexOf("{", pos);
      const target = nextBrace !== -1 ? nextBrace + 1 : latex.length;
      el.focus();
      el.setSelectionRange(target, target);
    } else {
      const prevBrace = latex.lastIndexOf("{", Math.max(0, pos - 2));
      const target = prevBrace !== -1 ? prevBrace + 1 : 0;
      el.focus();
      el.setSelectionRange(target, target);
    }
  };

  // Renderizado KaTeX en vivo (mostrando cuadritos □ donde falte rellenar un `{}`)
  const previewHtml = useMemo(() => {
    if (!latex.trim()) {
      return '<span class="text-slate-400 italic text-xs">Escribe números, letras o pulsa los botones de arriba...</span>';
    }
    try {
      // Reemplazar llaves vacías `{}` visualmente con `\square` solo en la vista previa
      const visualLatex = latex.replace(/\{\}/g, "{\\square}");
      return katex.renderToString(visualLatex, {
        displayMode: displayMode === "block",
        throwOnError: false,
      });
    } catch {
      return `<span class="text-rose-400 text-xs">${latex}</span>`;
    }
  }, [latex, displayMode]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    const clean = latex.trim();
    if (!clean) return;
    const wrapped = displayMode === "block" ? `\n$$${clean}$$\n` : `$${clean}$`;
    onInsert(wrapped);
    onClose();
  };

  const renderTileButton = (tile: SymbolabTile, idx: number) => {
    let rendered = tile.title;
    try {
      rendered = katex.renderToString(tile.preview, { throwOnError: false });
    } catch {}
    return (
      <button
        key={idx}
        type="button"
        onClick={() => insertTileAtCursor(tile)}
        title={tile.title}
        className="h-11 px-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-750 hover:border-sky-500/60 flex items-center justify-center transition-all active:scale-95"
      >
        <span
          className="text-sm text-slate-100 pointer-events-none"
          dangerouslySetInnerHTML={{ __html: rendered }}
        />
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-850 border border-slate-700 w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-750 bg-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center">
              <Sigma className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                {initialLatex ? "Editar Fórmula" : "Editor de Fórmulas (Estilo Symbolab)"}
              </h3>
              <p className="text-[11px] text-slate-400">
                Escribe directo con tu teclado o pulsa cualquier estructura matemática
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-750"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto max-h-[80vh]">
          {/* 1. Paleta Estilo Symbolab (2 filas principales + expandir) */}
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-750 space-y-1.5">
            <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
              {SYMBOLAB_ROW_1.map(renderTileButton)}
            </div>
            <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
              {SYMBOLAB_ROW_2.map(renderTileButton)}
            </div>

            {showMoreTiles && (
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 pt-1.5 border-t border-slate-800">
                {EXTRA_TILES.map(renderTileButton)}
              </div>
            )}

            <div className="flex justify-center pt-1">
              <button
                type="button"
                onClick={() => setShowMoreTiles(!showMoreTiles)}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-sky-400 px-3 py-0.5 rounded-full bg-slate-900 border border-slate-750 transition-colors"
              >
                {showMoreTiles ? (
                  <>
                    <ChevronUp className="w-3 h-3" /> Menos símbolos
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3 h-3" /> Más símbolos y unidades
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 2. Vista Previa en Vivo */}
          <div className="rounded-xl p-4 min-h-[88px] bg-slate-900 border border-slate-700 flex items-center justify-center overflow-x-auto text-slate-100">
            <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
          </div>

          {/* 3. Barra de Entrada Directa (Siempre visible, estilo Symbolab) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Escribe aquí números, letras y signos (ej. <code className="text-sky-400">2x + 5 = 11</code>):</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => jumpBracketSlot(-1)}
                  title="Ir al espacio anterior"
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 flex items-center gap-1"
                >
                  <ArrowLeft className="w-3 h-3" /> Espacio
                </button>
                <button
                  type="button"
                  onClick={() => jumpBracketSlot(1)}
                  title="Ir al siguiente espacio"
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 flex items-center gap-1"
                >
                  Espacio <ArrowRight className="w-3 h-3" />
                </button>
                {latex && (
                  <button
                    type="button"
                    onClick={() => {
                      setLatex("");
                      inputRef.current?.focus();
                    }}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-rose-950/40 border border-slate-700 text-slate-400 hover:text-rose-400 flex items-center gap-1"
                  >
                    <Eraser className="w-3 h-3" /> Limpiar
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={latex}
                onChange={(e) => setLatex(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleConfirm();
                  }
                }}
                placeholder="Ingrese la expresión matemática (ej. 2x + 1 = 0)..."
                className="flex-1 rounded-xl px-4 py-3 text-sm font-mono bg-slate-900 border-2 border-slate-700 focus:border-sky-500 text-slate-100 placeholder-slate-500"
              />
            </div>
          </div>

          {/* 4. Ubicación en el enunciado */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium">Ubicación:</span>
            <button
              type="button"
              onClick={() => setDisplayMode("inline")}
              className={`px-2.5 py-1 rounded-lg border font-medium ${
                displayMode === "inline"
                  ? "bg-sky-600/20 border-sky-500 text-sky-400"
                  : "bg-slate-800 border-slate-700 text-slate-400"
              }`}
            >
              En la misma línea
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode("block")}
              className={`px-2.5 py-1 rounded-lg border font-medium ${
                displayMode === "block"
                  ? "bg-sky-600/20 border-sky-500 text-sky-400"
                  : "bg-slate-800 border-slate-700 text-slate-400"
              }`}
            >
              Centrada en bloque
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-900 border-t border-slate-750 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 border border-slate-700 rounded-lg"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!latex.trim()}
            onClick={handleConfirm}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg disabled:opacity-40"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{initialLatex ? "Actualizar Fórmula" : "Insertar Fórmula"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
