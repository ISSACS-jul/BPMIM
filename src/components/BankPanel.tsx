import React, { useState, useMemo } from "react";
import { Question } from "../types/quiz";
import { QuestionCard } from "./QuestionCard";
import { Search, Filter, X, Layers, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

interface BankPanelProps {
  questions: Question[];
  onAddToQuiz: (q: Question) => void;
  onEditQuestion: (q: Question) => void;
  onDeleteQuestion: (id: string) => void;
  quizQuestionIds: Set<string>;
  pageSize: number;
}

export const BankPanel: React.FC<BankPanelProps> = ({
  questions,
  onAddToQuiz,
  onEditQuestion,
  onDeleteQuestion,
  quizQuestionIds,
  pageSize = 50,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("all");
  const [selectedTopic, setSelectedTopic] = useState("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState("all");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  // Listas únicas de cursos y temas para los filtros
  const courses = useMemo(() => {
    return Array.from(new Set(questions.map((q) => q.course))).filter(Boolean);
  }, [questions]);

  const topics = useMemo(() => {
    const list =
      selectedCourse === "all"
        ? questions.map((q) => q.topic)
        : questions.filter((q) => q.course === selectedCourse).map((q) => q.topic);
    return Array.from(new Set(list)).filter(Boolean);
  }, [questions, selectedCourse]);

  const allTags = useMemo(() => {
    const tagsSet = new Set<string>();
    questions.forEach((q) => q.tags?.forEach((t) => tagsSet.add(t)));
    return Array.from(tagsSet);
  }, [questions]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
    setCurrentPage(1);
  };

  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      // Búsqueda por texto en enunciado y opciones
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesPrompt = q.prompt.toLowerCase().includes(term);
        const matchesOptions = q.options.some((opt) => opt.text.toLowerCase().includes(term));
        const matchesTags = q.tags.some((t) => t.toLowerCase().includes(term));
        if (!matchesPrompt && !matchesOptions && !matchesTags) return false;
      }

      // Filtro de Curso
      if (selectedCourse !== "all" && q.course !== selectedCourse) return false;

      // Filtro de Tema
      if (selectedTopic !== "all" && q.topic !== selectedTopic) return false;

      // Filtro de Dificultad
      if (selectedDifficulty !== "all" && q.difficulty !== selectedDifficulty) return false;

      // Filtro de Etiquetas
      if (selectedTags.length > 0) {
        const hasAllTags = selectedTags.every((t) => q.tags.includes(t));
        if (!hasAllTags) return false;
      }

      return true;
    });
  }, [questions, searchTerm, selectedCourse, selectedTopic, selectedDifficulty, selectedTags]);

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCourse("all");
    setSelectedTopic("all");
    setSelectedDifficulty("all");
    setSelectedTags([]);
    setCurrentPage(1);
  };

  const hasActiveFilters =
    searchTerm ||
    selectedCourse !== "all" ||
    selectedTopic !== "all" ||
    selectedDifficulty !== "all" ||
    selectedTags.length > 0;

  // Paginación (20, 50, 100)
  const totalPages = Math.max(1, Math.ceil(filteredQuestions.length / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);

  const paginatedQuestions = useMemo(() => {
    const start = (validCurrentPage - 1) * pageSize;
    return filteredQuestions.slice(start, start + pageSize);
  }, [filteredQuestions, validCurrentPage, pageSize]);

  return (
    <div className="h-full flex flex-col bg-dark-900 border-r border-dark-750 overflow-hidden">
      {/* Barra de Búsqueda y Filtros */}
      <div className="p-3 bg-dark-850/70 border-b border-dark-750 space-y-2.5">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por fórmula, enunciado, tema o etiqueta..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-dark-900 border border-dark-700 focus:border-brand-500 rounded-lg pl-9 pr-8 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none transition-colors"
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm("");
                setCurrentPage(1);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Desplegables de filtros */}
        <div className="grid grid-cols-3 gap-2">
          {/* Selector de Cursos */}
          <div className="relative">
            <select
              value={selectedCourse}
              onChange={(e) => {
                setSelectedCourse(e.target.value);
                setSelectedTopic("all");
                setCurrentPage(1);
              }}
              style={{ backgroundColor: "#101622", color: "#e2e8f0" }}
              className="w-full appearance-none bg-dark-850 hover:bg-dark-800 border border-dark-700 hover:border-dark-600 rounded-lg pl-2.5 pr-7 py-1.5 text-xs font-medium focus:outline-none focus:border-brand-500 transition-colors cursor-pointer truncate"
            >
              <option value="all" style={{ backgroundColor: "#101622", color: "#e2e8f0" }}>
                Todos los Cursos
              </option>
              {courses.map((c) => (
                <option key={c} value={c} style={{ backgroundColor: "#101622", color: "#e2e8f0" }}>
                  {c}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Selector de Temas */}
          <div className="relative">
            <select
              value={selectedTopic}
              onChange={(e) => {
                setSelectedTopic(e.target.value);
                setCurrentPage(1);
              }}
              style={{ backgroundColor: "#101622", color: "#e2e8f0" }}
              className="w-full appearance-none bg-dark-850 hover:bg-dark-800 border border-dark-700 hover:border-dark-600 rounded-lg pl-2.5 pr-7 py-1.5 text-xs font-medium focus:outline-none focus:border-brand-500 transition-colors cursor-pointer truncate"
            >
              <option value="all" style={{ backgroundColor: "#101622", color: "#e2e8f0" }}>
                Todos los Temas
              </option>
              {topics.map((t) => (
                <option key={t} value={t} style={{ backgroundColor: "#101622", color: "#e2e8f0" }}>
                  {t}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Selector de Dificultad */}
          <div className="relative">
            <select
              value={selectedDifficulty}
              onChange={(e) => {
                setSelectedDifficulty(e.target.value);
                setCurrentPage(1);
              }}
              style={{ backgroundColor: "#101622", color: "#e2e8f0" }}
              className="w-full appearance-none bg-dark-850 hover:bg-dark-800 border border-dark-700 hover:border-dark-600 rounded-lg pl-2.5 pr-7 py-1.5 text-xs font-medium focus:outline-none focus:border-brand-500 transition-colors cursor-pointer truncate"
            >
              <option value="all" style={{ backgroundColor: "#101622", color: "#e2e8f0" }}>
                Dificultad
              </option>
              <option value="Fácil" style={{ backgroundColor: "#101622", color: "#e2e8f0" }}>
                Fácil
              </option>
              <option value="Media" style={{ backgroundColor: "#101622", color: "#e2e8f0" }}>
                Media
              </option>
              <option value="Difícil" style={{ backgroundColor: "#101622", color: "#e2e8f0" }}>
                Difícil
              </option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Chips de Etiquetas seleccionables */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 max-h-16 overflow-y-auto pt-1">
            <span className="text-[10px] text-slate-500 flex items-center gap-1 mr-1">
              <Filter className="w-3 h-3" /> Tags:
            </span>
            {allTags.map((tag) => {
              const active = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ${
                    active
                      ? "bg-brand-600 border-brand-500 text-white font-medium"
                      : "bg-dark-800 border-dark-700 text-slate-400 hover:text-slate-200 hover:border-dark-600"
                  }`}
                >
                  #{tag}
                </button>
              );
            })}
          </div>
        )}

        {/* Contador, paginación y botón de limpiar */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
          <span>
            Mostrando <strong>{filteredQuestions.length}</strong> de{" "}
            <strong>{questions.length}</strong> preguntas
          </span>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-brand-400 hover:underline flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Lista scrolleable de Celdas del Banco con Paginación */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        {paginatedQuestions.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <Layers className="w-10 h-10 mb-2 stroke-1 opacity-50" />
            <p className="text-sm font-medium text-slate-400">No se encontraron preguntas</p>
            <p className="text-xs text-slate-500 mt-1 max-w-xs">
              Prueba cambiando o limpiando los filtros o añade una nueva pregunta al banco.
            </p>
          </div>
        ) : (
          paginatedQuestions.map((q) => (
            <QuestionCard
              key={q.id}
              question={q}
              isSelectedInQuiz={quizQuestionIds.has(q.id)}
              onAddToQuiz={() => onAddToQuiz(q)}
              onEdit={() => onEditQuestion(q)}
              onDelete={() => onDeleteQuestion(q.id)}
            />
          ))
        )}
      </div>

      {/* Barra de Paginación Inferior (si hay más de 1 página) */}
      {totalPages > 1 && (
        <div className="p-2.5 bg-dark-850 border-t border-dark-750 flex items-center justify-between text-xs text-slate-300 shrink-0">
          <span className="text-[11px] text-slate-400">
            Página <strong>{validCurrentPage}</strong> de <strong>{totalPages}</strong> ({pageSize}/pág)
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={validCurrentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none rounded hover:bg-dark-800 transition-colors"
              title="Página anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 py-0.5 rounded bg-dark-800 border border-dark-700 text-brand-400 font-semibold text-xs">
              {validCurrentPage}
            </span>
            <button
              type="button"
              disabled={validCurrentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none rounded hover:bg-dark-800 transition-colors"
              title="Página siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
