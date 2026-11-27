import React from "react";
import { Question, QUESTION_TYPE_LABELS } from "../types/quiz";
import { renderMarkdownWithMath } from "../utils/markdownRenderer";
import { getImageSync } from "../utils/imageStore";
import { getShuffledMatchingRight } from "../utils/matchingHelper";
import { VideoEmbedList } from "./VideoEmbedList";
import {
  Plus,
  Edit2,
  Trash2,
  Tag,
  CheckCircle2,
  Square,
  CheckSquare,
  Link2,
  ListOrdered,
  Hash,
  Type,
  Layers,
  Check,
  Video,
} from "lucide-react";

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
    return renderMarkdownWithMath(question.prompt, { showBlankAnswers: true });
  }, [question.prompt]);

  const optionLabels = ["A", "B", "C", "D", "E", "F"];
  const isChoiceType =
    question.type === "multiple_choice" ||
    question.type === "multiple_response" ||
    question.type === "true_false";

  const diffClass: Record<string, string> = {
    Fácil: "bg-emerald-950/30 text-emerald-400 border-emerald-800/50",
    Media: "bg-amber-950/30 text-amber-400 border-amber-800/50",
    Difícil: "bg-rose-950/30 text-rose-400 border-rose-800/50",
  };

  const getTypeIcon = () => {
    switch (question.type) {
      case "open":
        return <Square className="w-2.5 h-2.5" />;
      case "matching":
        return <Link2 className="w-2.5 h-2.5" />;
      case "ordering":
        return <ListOrdered className="w-2.5 h-2.5" />;
      case "numeric":
        return <Hash className="w-2.5 h-2.5" />;
      case "fill_blanks":
        return <Type className="w-2.5 h-2.5" />;
      case "stimulus":
        return <Layers className="w-2.5 h-2.5" />;
      case "video_quiz":
        return <Video className="w-2.5 h-2.5" />;
      case "true_false":
        return <Check className="w-2.5 h-2.5" />;
      default:
        return <CheckSquare className="w-2.5 h-2.5" />;
    }
  };

  const layoutClass =
    question.optionLayout === "horizontal"
      ? "grid grid-cols-2 sm:grid-cols-4 gap-1.5"
      : question.optionLayout === "vertical"
      ? "flex flex-col gap-1.5"
      : "grid grid-cols-1 sm:grid-cols-2 gap-1.5";

  return (
    <div
      className={`group relative cell-appear flex flex-col justify-between rounded-xl transition-all duration-200 border border-l-[3.5px] overflow-hidden shadow-sm hover:shadow-md ${
        question.type === "stimulus"
          ? "bg-amber-500/5 border-amber-500/30 border-l-amber-500"
          : "bg-slate-850 border-slate-700/80 border-l-slate-600 hover:border-l-sky-500"
      }`}
    >
      {/* ── Cell Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 bg-slate-900 border-b border-slate-750">
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Tipo badge */}
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1 font-mono border ${
              question.type === "open" || question.type === "stimulus"
                ? "bg-amber-950/30 text-amber-400 border-amber-800/50"
                : "bg-indigo-950/30 text-indigo-400 border-indigo-800/50"
            }`}
          >
            {getTypeIcon()}
            {QUESTION_TYPE_LABELS[question.type] || question.type}
          </span>

          {/* Curso */}
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-sky-500/15 text-sky-400 border border-sky-500/30">
            {question.course}
          </span>

          {/* Tema */}
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-800 text-slate-200 border border-slate-700">
            {question.topic}
          </span>

          {question.subtopic && (
            <span className="text-[11px] px-1.5 py-0.5 rounded text-slate-400 bg-slate-900 border border-slate-750">
              {question.subtopic}
            </span>
          )}

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
        {question.type === "stimulus" && question.stimulusTitle && (
          <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wide mb-1.5">
            {question.stimulusTitle} {question.stimulusRangeNote ? `(${question.stimulusRangeNote})` : ""}
          </div>
        )}

        {/* Enunciado con LaTeX / Tablas / Huecos */}
        <div
          className="prose prose-sm max-w-none text-xs leading-relaxed mb-3 break-words text-slate-200 [&>p]:mb-2 [&_img]:max-h-56 [&_img]:rounded-lg [&_img]:my-2 [&_img]:border [&_img]:border-slate-700"
          dangerouslySetInnerHTML={{ __html: renderedPrompt }}
        />

        {/* Videos si existen */}
        <VideoEmbedList videos={question.videos} compact />

        {/* Visualización por tipo */}
        {question.type === "open" && (
          <div className="mb-3 p-3 rounded-md text-[11px] italic bg-slate-900 border border-slate-750 border-l-[3.5px] border-l-amber-500 text-slate-400">
            [Espacio para respuesta escrita del estudiante: {question.openResponseHeight || 3.5} cm]
          </div>
        )}

        {isChoiceType && (
          <div className={`${layoutClass} mb-3`}>
            {question.options.map((opt, i) => {
              const renderedOpt = renderMarkdownWithMath(opt.text);
              const optImg = opt.image
                ? opt.image.startsWith("imagenes/") || opt.image.startsWith("images/")
                  ? getImageSync(opt.image) || opt.image
                  : opt.image
                : null;
              return (
                <div
                  key={opt.id || i}
                  className={`flex flex-col gap-1 text-xs p-2 rounded-lg transition-colors border ${
                    opt.isCorrect
                      ? "bg-emerald-950/25 border-emerald-800/40 text-emerald-300"
                      : "bg-slate-900 border-slate-750 text-slate-300"
                  }`}
                >
                  <div className="flex items-start gap-2">
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
                  {optImg && (
                    <img
                      src={optImg}
                      alt={`Opción ${optionLabels[i]}`}
                      style={{ maxWidth: `${opt.imageWidth || 80}%` }}
                      className="rounded max-h-24 object-contain mx-auto border border-slate-700"
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {question.type === "matching" && question.matchingPairs && (() => {
          const rightCol = getShuffledMatchingRight(question);
          return (
            <div className="mb-3 space-y-1 text-[11px]">
              {question.matchingPairs.map((p, idx) => (
                <div
                  key={p.id || idx}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-slate-900 border border-slate-750 text-slate-300"
                >
                  <span className="font-mono text-sky-400 font-bold">{idx + 1}.</span>
                  <span className="flex-1 truncate">{p.left}</span>
                  <span className="text-slate-500">↔</span>
                  <span className="flex-1 truncate text-amber-300">
                    {rightCol[idx] ? `${String.fromCharCode(65 + idx)}. ${rightCol[idx].text}` : "—"}
                  </span>
                </div>
              ))}
            </div>
          );
        })()}

        {question.type === "ordering" && question.orderingItems && (
          <div className="mb-3 space-y-1 text-[11px]">
            {question.orderingItems.map((o, idx) => (
              <div
                key={o.id || idx}
                className="flex items-center gap-2 px-2.5 py-1 rounded bg-slate-900 border border-slate-750 text-slate-300"
              >
                <span className="font-mono text-sky-400 font-bold">{idx + 1}.</span>
                <span className="truncate">{o.text}</span>
              </div>
            ))}
          </div>
        )}

        {question.type === "numeric" && (
          <div className="mb-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-750 text-xs">
            <span className="text-slate-400">Respuesta esperada:</span>
            <strong className="font-mono text-emerald-400">
              {question.numericAnswer || "—"} {question.numericUnit || ""}
            </strong>
          </div>
        )}
      </div>

      {/* ── Cell Footer ── */}
      <div className="px-3.5 py-2 flex items-center justify-between gap-2 border-t border-slate-750 bg-slate-900">
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
