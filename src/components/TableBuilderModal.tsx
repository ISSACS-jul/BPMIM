import React, { useState, useEffect } from "react";
import { X, Table as TableIcon, Check, Sparkles } from "lucide-react";

interface TableBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (markdownTable: string) => void;
  initialCells?: string[][] | null;
}

export const TableBuilderModal: React.FC<TableBuilderModalProps> = ({
  isOpen,
  onClose,
  onInsert,
  initialCells = null,
}) => {
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  const [cells, setCells] = useState<string[][]>(() => [
    ["Magnitud", "Símbolo", "Unidad"],
    ["Masa", "$m$", "{{kg}}"],
    ["Fuerza", "$F$", "{{N}}"],
  ]);

  useEffect(() => {
    if (isOpen && initialCells && initialCells.length >= 2) {
      setRows(initialCells.length);
      setCols(initialCells[0]?.length || 2);
      setCells(initialCells.map((r) => [...r]));
    } else if (isOpen && !initialCells) {
      setRows(3);
      setCols(3);
      setCells([
        ["Magnitud", "Símbolo", "Unidad"],
        ["Masa", "$m$", "{{kg}}"],
        ["Fuerza", "$F$", "{{N}}"],
      ]);
    }
  }, [isOpen, initialCells]);

  if (!isOpen) return null;

  const resizeGrid = (newR: number, newC: number) => {
    const r = Math.max(2, Math.min(8, newR));
    const c = Math.max(2, Math.min(6, newC));
    setRows(r);
    setCols(c);
    setCells((prev) => {
      const next: string[][] = [];
      for (let i = 0; i < r; i++) {
        const row: string[] = [];
        for (let j = 0; j < c; j++) {
          row.push(prev[i]?.[j] ?? (i === 0 ? `Columna ${j + 1}` : ""));
        }
        next.push(row);
      }
      return next;
    });
  };

  const updateCell = (rIdx: number, cIdx: number, val: string) => {
    setCells((prev) =>
      prev.map((row, ri) => (ri === rIdx ? row.map((v, ci) => (ci === cIdx ? val : v)) : row))
    );
  };

  const makeBlankCell = (rIdx: number, cIdx: number) => {
    const current = cells[rIdx]?.[cIdx] || "";
    if (current.startsWith("{{") && current.endsWith("}}")) return;
    const content = current.trim() || "respuesta";
    updateCell(rIdx, cIdx, `{{${content}}}`);
  };

  const handleInsert = () => {
    const header = `| ${cells[0].map((c) => c.trim() || " ").join(" | ")} |`;
    const sep = `| ${cells[0].map(() => "---").join(" | ")} |`;
    const body = cells
      .slice(1)
      .map((row) => `| ${row.map((c) => c.trim() || " ").join(" | ")} |`)
      .join("\n");
    onInsert(`\n${header}\n${sep}\n${body}\n`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-850 border border-slate-700 w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-750 bg-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center">
              <TableIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Constructor Visual de Tablas</h3>
              <p className="text-[11px] text-slate-400">
                Crea tablas comparativas, de datos o para completar espacios ({`{{respuesta}}`})
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

        <div className="p-5 space-y-4 overflow-y-auto max-h-[75vh]">
          {/* Dimensiones */}
          <div className="flex flex-wrap items-center gap-4 text-xs bg-slate-900/60 p-3 rounded-xl border border-slate-750">
            <div className="flex items-center gap-2">
              <span className="text-slate-300 font-semibold">Filas:</span>
              <input
                type="number"
                min={2}
                max={8}
                value={rows}
                onChange={(e) => resizeGrid(Number(e.target.value), cols)}
                className="w-16 px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-100 text-center"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-300 font-semibold">Columnas:</span>
              <input
                type="number"
                min={2}
                max={6}
                value={cols}
                onChange={(e) => resizeGrid(rows, Number(e.target.value))}
                className="w-16 px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-100 text-center"
              />
            </div>
            <span className="text-[11px] text-slate-400 ml-auto">
              Tip: Pulsa el ícono ✨ en una celda para convertirla en espacio para completar.
            </span>
          </div>

          {/* Grilla editable */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <tbody>
                {cells.map((row, rIdx) => (
                  <tr key={rIdx}>
                    {row.map((val, cIdx) => (
                      <td key={cIdx} className="p-1">
                        <div className="relative flex items-center">
                          <input
                            type="text"
                            value={val}
                            onChange={(e) => updateCell(rIdx, cIdx, e.target.value)}
                            placeholder={rIdx === 0 ? `Encabezado ${cIdx + 1}` : "Valor..."}
                            className={`w-full px-2.5 py-1.5 pr-7 rounded-lg text-xs border ${
                              rIdx === 0
                                ? "bg-sky-500/10 border-sky-500/30 font-bold text-sky-300"
                                : "bg-slate-900 border-slate-700 text-slate-200"
                            }`}
                          />
                          {rIdx > 0 && (
                            <button
                              type="button"
                              onClick={() => makeBlankCell(rIdx, cIdx)}
                              title="Convertir en hueco para completar"
                              className="absolute right-1.5 text-slate-400 hover:text-amber-400 p-0.5"
                            >
                              <Sparkles className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

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
            onClick={handleInsert}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Insertar Tabla</span>
          </button>
        </div>
      </div>
    </div>
  );
};
