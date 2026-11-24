import React from "react";
import { Question } from "../types/quiz";
import { renderMarkdownWithMath } from "../utils/markdownRenderer";
import { Plus, Edit2, Trash2, Tag, CheckCircle2, Square, CheckSquare } from "lucide-react";

interface QuestionCardProps {
  question: Question;
  onAddToQuiz?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  isSelectedInQuiz?: boolean;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  onAddToQuiz,
  onEdit,
  onDelete,
  isSelectedInQuiz = false,
}) => {
  const renderedPrompt = React.useMemo(() => {
    return renderMarkdownWithMath(question.prompt);
  }, [question.prompt]);

  const isOpenType = question.type === "open";
  const optionLabels = ["A", "B", "C", "D", "E", "F"];

  // Estilos de dificultad
  const diffClass: Record<string, string> = {
    Fácil:   "bg-emerald-950/30 text-emerald-400 border-emerald-800/50",
    Media:   "bg-amber-950/30 text-amber-400 border-amber-800/50",
    Difícil: "bg-rose-950/30 text-rose-400 border-rose-800/50",
  };

  return (
    <div
      className="group relative cell-appear flex flex-col justify-between rounded-xl transition-all duration-200 bg-slate-850 border border-slate-700/80 border-l-[3.5px] border-l-slate-600 hover:border-l-sky-500 overflow-hidden shadow-sm hover:shadow-md"
    >
      {/* ── Cell Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 bg-slate-900 border-b border-slate-750">
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Tipo badge */}
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1 font-mono border ${
              isOpenType
                ? "bg-amber-950/30 text-amber-400 border-amber-800/50"
                : "bg-indigo-950/30 text-indigo-400 border-indigo-800/50"
            }`}
          >
            {isOpenType ? <Square className="w-2.5 h-2.5" /> : <CheckSquare className="w-2.5 h-2.5" />}
            {isOpenType ? "Abierta" : "Opción Múltiple"}
          </span>

          {/* Curso */}
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-sky-500/15 text-sky-400 border border-sky-500/30">
            {question.course}
          </span>

          {/* Tema */}
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-800 text-slate-200 border border-slate-700">
            {question.topic}
          </span>

          {/* Subtema */}
          {question.subtopic && (
            <span className="text-[11px] px-1.5 py-0.5 rounded text-slate-400 bg-slate-900 border border-slate-750">
              {question.subtopic}
            </span>
          )}

          {/* Dificultad */}
          <span
            className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${
              diffClass[question.difficulty] || "bg-slate-800 text-slate-400 border-slate-700"
            }`}
          >
            {question.difficulty}
          </span>
        </div>

        {/* Acciones (edit / delete) */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onEdit && (
            <button
              onClick={onEdit}
              title="Editar pregunta"
              className="p-1.5 rounded-md text-slate-400 hover:text-sky-400 hover:bg-slate-750 transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              title="Eliminar pregunta"
              className="p-1.5 rounded-md text-slate-400 hover:text-rose-400 hover:bg-slate-750 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Cell Body ── */}
      <div className="px-4 pt-3.5 pb-2">
        {/* Enunciado con LaTeX */}
        <div
          className="prose prose-sm max-w-none text-xs leading-relaxed mb-3 break-words text-slate-200 [&>p]:mb-2 [&_img]:max-h-56 [&_img]:rounded-lg [&_img]:my-2 [&_img]:border [&_img]:border-slate-700"
          dangerouslySetInnerHTML={{ __html: renderedPrompt }}
        />

        {/* Opciones / Respuesta abierta */}
        {isOpenType ? (
          <div className="mb-3 p-3 rounded-md text-[11px] italic bg-slate-900 border border-slate-750 border-l-[3.5px] border-l-amber-500 text-slate-400">
            [Espacio para respuesta escrita del estudiante: {question.openResponseHeight || 3.5} cm]
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mb-3">
            {question.options.map((opt, i) => {
              const renderedOpt = renderMarkdownWithMath(opt.text);
              return (
                <div
                  key={opt.id || i}
                  className={`flex items-start gap-2 text-xs p-2 rounded-lg transition-colors border ${
                    opt.isCorrect
                      ? "bg-emerald-950/25 border-emerald-800/40 text-emerald-300"
                      : "bg-slate-900 border-slate-750 text-slate-300"
                  }`}
                >
                  <span
                    className={`font-bold shrink-0 text-[11px] px-1 rounded font-mono ${
                      opt.isCorrect ? "text-emerald-400" : "text-slate-400"
                    }`}
                  >
                    {optionLabels[i]}.
                  </span>
                  <div
                    className="flex-1 break-words [&>p]:inline"
                    dangerouslySetInnerHTML={{ __html: renderedOpt }}
                  />
                  {opt.isCorrect && (
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-400" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Cell Footer ── */}
      <div className="px-3.5 py-2 flex items-center justify-between gap-2 border-t border-slate-750 bg-slate-900">
        {/* Tags */}
        <div className="flex flex-wrap items-center gap-1 overflow-hidden">
          {question.tags.map((t, idx) => (
            <span
              key={idx}
              className="text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 font-mono text-slate-400 bg-slate-800 border border-slate-700"
            >
              <Tag className="w-2.5 h-2.5 opacity-60" />
              {t}
            </span>
          ))}
        </div>

        {/* Botón Agregar */}
        {onAddToQuiz && (
          <button
            onClick={onAddToQuiz}
            disabled={isSelectedInQuiz}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all shrink-0 active:scale-95 ${
              isSelectedInQuiz
                ? "bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed"
                : "bg-sky-600 hover:bg-sky-500 text-white shadow-sm hover:shadow-sky-500/20"
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isSelectedInQuiz ? "En el examen" : "Agregar"}</span>
          </button>
        )}
      </div>
    </div>
  );
};
