import React, { useState, useMemo, useEffect } from "react";
import { Quiz } from "../types/quiz";
import { X, Filter, CheckSquare, Square, FileCode, FileText, Globe, Printer } from "lucide-react";

interface SelectiveExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  quiz: Quiz;
  onExportLatex: (filteredQuiz: Quiz) => void;
  onExportWord: (filteredQuiz: Quiz) => void;
  onExportHtml: (filteredQuiz: Quiz) => void;
  onExportPdf: () => void;
}

export const SelectiveExportModal: React.FC<SelectiveExportModalProps> = ({
  isOpen,
  onClose,
  quiz,
  onExportLatex,
  onExportWord,
  onExportHtml,
  onExportPdf,
}) => {
  const [filterMode, setFilterMode] = useState<"tags" | "custom">("custom");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedInstanceIds, setSelectedInstanceIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      setSelectedInstanceIds(new Set(quiz.items.map((it) => it.instanceId)));
      setSelectedTags([]);
    }
  }, [isOpen, quiz.items]);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    quiz.items.forEach((it) => it.question.tags?.forEach((t) => s.add(t)));
    return Array.from(s);
  }, [quiz.items]);

  const filteredItems = useMemo(() => {
    if (filterMode === "tags") {
      if (selectedTags.length === 0) return [];
      return quiz.items.filter((it) =>
        it.question.tags?.some((t) => selectedTags.includes(t))
      );
    }
    return quiz.items.filter((it) => selectedInstanceIds.has(it.instanceId));
  }, [quiz.items, filterMode, selectedTags, selectedInstanceIds]);

  if (!isOpen) return null;

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const toggleItem = (id: string) => {
    setSelectedInstanceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const buildFilteredQuiz = (): Quiz => ({
    ...quiz,
    items: filteredItems,
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-850 border border-slate-700 w-full max-w-2xl max-h-[88vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in duration-150">
        <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center">
              <Filter className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Exportación Selectiva del Examen</h2>
              <p className="text-xs text-slate-400">
                Elige preguntas específicas o filtra por etiqueta antes de exportar
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-750"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => setFilterMode("custom")}
                className={`px-3 py-1.5 rounded-lg border font-medium ${
                  filterMode === "custom"
                    ? "bg-sky-600 border-sky-500 text-white"
                    : "bg-slate-800 border-slate-700 text-slate-300"
                }`}
              >
                Seleccionar Preguntas
              </button>
              <button
                type="button"
                onClick={() => setFilterMode("tags")}
                className={`px-3 py-1.5 rounded-lg border font-medium ${
                  filterMode === "tags"
                    ? "bg-sky-600 border-sky-500 text-white"
                    : "bg-slate-800 border-slate-700 text-slate-300"
                }`}
              >
                Filtrar por Etiqueta (Tag)
              </button>
            </div>
            <span className="text-xs font-semibold text-sky-400">
              {filteredItems.length} de {quiz.items.length} incluidas
            </span>
          </div>

          {filterMode === "tags" ? (
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-750 flex flex-wrap gap-2">
              {allTags.length === 0 ? (
                <span className="text-xs text-slate-400 italic">
                  Las preguntas de este examen no tienen etiquetas asignadas.
                </span>
              ) : (
                allTags.map((tag) => {
                  const active = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`text-xs px-3 py-1 rounded-full border font-mono transition-all ${
                        active
                          ? "bg-sky-500/20 border-sky-500 text-sky-300 font-bold"
                          : "bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      #{tag}
                    </button>
                  );
                })
              )}
            </div>
          ) : (
            <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
              {quiz.items.map((it, idx) => {
                const checked = selectedInstanceIds.has(it.instanceId);
                return (
                  <button
                    key={it.instanceId}
                    type="button"
                    onClick={() => toggleItem(it.instanceId)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border text-left text-xs transition-colors ${
                      checked
                        ? "bg-sky-500/15 border-sky-500/50 text-slate-100"
                        : "bg-slate-900 border-slate-750 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {checked ? (
                      <CheckSquare className="w-4 h-4 text-sky-400 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-500 shrink-0" />
                    )}
                    <span className="font-mono text-[11px] text-sky-400 font-bold shrink-0">
                      #{idx + 1}
                    </span>
                    <span className="truncate flex-1">
                      {it.question.prompt.replace(/\n/g, " ").slice(0, 75)}
                    </span>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {it.question.topic}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Botones de formato de exportación */}
          <div className="pt-2 border-t border-slate-750 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              Exportar selección como:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                disabled={filteredItems.length === 0}
                onClick={() => {
                  onClose();
                  onExportLatex(buildFilteredQuiz());
                }}
                className="flex flex-col items-center justify-center gap-1 p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-emerald-500/50 text-xs font-semibold text-slate-200 disabled:opacity-40"
              >
                <FileCode className="w-4 h-4 text-emerald-400" />
                <span>LaTeX (.tex)</span>
              </button>
              <button
                type="button"
                disabled={filteredItems.length === 0}
                onClick={() => {
                  onClose();
                  onExportWord(buildFilteredQuiz());
                }}
                className="flex flex-col items-center justify-center gap-1 p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-sky-500/50 text-xs font-semibold text-slate-200 disabled:opacity-40"
              >
                <FileText className="w-4 h-4 text-sky-400" />
                <span>Word (.docx)</span>
              </button>
              <button
                type="button"
                disabled={filteredItems.length === 0}
                onClick={() => {
                  onClose();
                  onExportHtml(buildFilteredQuiz());
                }}
                className="flex flex-col items-center justify-center gap-1 p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-indigo-500/50 text-xs font-semibold text-slate-200 disabled:opacity-40"
              >
                <Globe className="w-4 h-4 text-indigo-400" />
                <span>Web (HTML5)</span>
              </button>
              <button
                type="button"
                disabled={filteredItems.length === 0}
                onClick={() => {
                  onClose();
                  onExportPdf();
                }}
                className="flex flex-col items-center justify-center gap-1 p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-rose-500/50 text-xs font-semibold text-slate-200 disabled:opacity-40"
              >
                <Printer className="w-4 h-4 text-rose-400" />
                <span>Imprimir / PDF</span>
              </button>
            </div>
          </div>
        </div>

        <div className="px-6 py-3 bg-slate-900/50 border-t border-slate-700 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 border border-slate-700 rounded-lg"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
