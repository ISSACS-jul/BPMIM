import React, { useState, useEffect, useMemo, useRef } from "react";
import katex from "katex";
import {
  Question,
  Option,
  QuestionType,
  OptionLayout,
  MatchingPair,
  OrderingItem,
  VideoEmbed,
  VideoFeedbackMode,
  OpenSubtype,
  QUESTION_TYPE_LABELS,
} from "../types/quiz";
import { renderMarkdownWithMath } from "../utils/markdownRenderer";
import { handleClipboardImage, processAndSaveImage } from "../utils/clipboardImage";
import { getImageSync } from "../utils/imageStore";
import { buildShuffledMatchingOrder } from "../utils/matchingHelper";
import { MathBuilderModal } from "./MathBuilderModal";
import { TableBuilderModal } from "./TableBuilderModal";
import { VideoEmbedList, formatSeconds, parseTimeInput } from "./VideoEmbedList";
import {
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  Image as ImageIcon,
  CheckSquare,
  Square,
  Sigma,
  Table as TableIcon,
  Video,
  Link2,
  ListOrdered,
  Hash,
  Type,
  Columns,
  Rows,
  LayoutGrid,
  ChevronUp,
  ChevronDown,
  Layers,
  Bold,
  Italic,
  List,
  Save,
  Eye,
  Sparkles,
  Check,
  Clock,
  Pause,
} from "lucide-react";

interface QuestionStudioProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (question: Question) => void;
  questionToEdit?: Question | null;
}

interface ParsedPromptImage {
  fullMatch: string;
  alt: string;
  widthPercent: number;
  src: string;
  resolvedSrc: string;
}

function extractPromptImages(prompt: string): ParsedPromptImage[] {
  const regex = /!\[(.*?)\]\(([^)\s]+)\)/g;
  const results: ParsedPromptImage[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(prompt)) !== null) {
    const rawAlt = match[1] || "";
    const src = match[2] || "";
    const pipeIdx = rawAlt.lastIndexOf("|");
    let alt = rawAlt;
    let widthPercent = 50;
    if (pipeIdx !== -1) {
      alt = rawAlt.slice(0, pipeIdx);
      const sizeNum = parseInt(rawAlt.slice(pipeIdx + 1).replace("%", ""), 10);
      if (!isNaN(sizeNum) && sizeNum > 0) widthPercent = sizeNum;
    }
    const resolvedSrc = src.startsWith("imagenes/") || src.startsWith("images/")
      ? getImageSync(src) || src
      : src;
    results.push({
      fullMatch: match[0],
      alt,
      widthPercent,
      src,
      resolvedSrc,
    });
  }
  return results;
}

interface ParsedPromptFormula {
  fullMatch: string;
  latex: string;
  isBlock: boolean;
  renderedHtml: string;
}

function extractPromptFormulas(prompt: string): ParsedPromptFormula[] {
  const results: ParsedPromptFormula[] = [];
  const regex = /\$\$([\s\S]+?)\$\$|(?<!\\)\$([^\$\n]+?)\$/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(prompt)) !== null) {
    const isBlock = match[1] !== undefined;
    const latex = (isBlock ? match[1] : match[2]).trim();
    let renderedHtml = latex;
    try {
      renderedHtml = katex.renderToString(latex, { throwOnError: false });
    } catch {}
    results.push({
      fullMatch: match[0],
      latex,
      isBlock,
      renderedHtml,
    });
  }
  return results;
}

interface ParsedPromptTable {
  fullMatch: string;
  cells: string[][];
}

function extractPromptTables(prompt: string): ParsedPromptTable[] {
  const results: ParsedPromptTable[] = [];
  const tableRegex = /(?:^|\n)(\|[^\n]+\|\n\|[\s:\-|]+\|\n(?:\|[^\n]+\|(?:\n|$))+)/g;
  let match: RegExpExecArray | null;
  while ((match = tableRegex.exec(prompt)) !== null) {
    const rawTable = match[1].trim();
    const lines = rawTable.split("\n").filter((l) => l.trim().startsWith("|"));
    if (lines.length < 3) continue;
    const parseRow = (line: string) =>
      line
        .trim()
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((c) => c.trim());
    const header = parseRow(lines[0]);
    const body = lines.slice(2).map(parseRow);
    results.push({
      fullMatch: rawTable,
      cells: [header, ...body],
    });
  }
  return results;
}

const TYPE_OPTIONS: {
  type: QuestionType;
  label: string;
  shortDesc: string;
  icon: React.ReactNode;
  group: "closed" | "short" | "open" | "context";
}[] = [
  {
    type: "multiple_choice",
    label: "Opción Múltiple",
    shortDesc: "Única respuesta (A, B, C, D)",
    icon: <CheckSquare className="w-4 h-4" />,
    group: "closed",
  },
  {
    type: "multiple_response",
    label: "Múltiple Respuesta",
    shortDesc: "Varias opciones correctas",
    icon: <CheckCircle2 className="w-4 h-4" />,
    group: "closed",
  },
  {
    type: "true_false",
    label: "Verdadero / Falso",
    shortDesc: "Con justificación opcional",
    icon: <Check className="w-4 h-4" />,
    group: "closed",
  },
  {
    type: "matching",
    label: "Emparejamiento",
    shortDesc: "Conectar dos columnas",
    icon: <Link2 className="w-4 h-4" />,
    group: "closed",
  },
  {
    type: "ordering",
    label: "Ordenamiento",
    shortDesc: "Secuencia lógica de pasos",
    icon: <ListOrdered className="w-4 h-4" />,
    group: "closed",
  },
  {
    type: "fill_blanks",
    label: "Completar Espacios",
    shortDesc: "Huecos en texto o tablas",
    icon: <Type className="w-4 h-4" />,
    group: "short",
  },
  {
    type: "numeric",
    label: "Respuesta Numérica",
    shortDesc: "Valor exacto y unidad",
    icon: <Hash className="w-4 h-4" />,
    group: "short",
  },
  {
    type: "open",
    label: "Abierta / Desarrollo",
    shortDesc: "Procedimiento, análisis o ensayo",
    icon: <Square className="w-4 h-4" />,
    group: "open",
  },
  {
    type: "video_quiz",
    label: "Video Interactivo",
    shortDesc: "Pausas con preguntas y fragmento",
    icon: <Video className="w-4 h-4" />,
    group: "context",
  },
  {
    type: "stimulus",
    label: "Estímulo Compartido",
    shortDesc: "Imagen/texto para varias preguntas",
    icon: <Layers className="w-4 h-4" />,
    group: "context",
  },
];

export const QuestionStudio: React.FC<QuestionStudioProps> = ({
  isOpen,
  onClose,
  onSave,
  questionToEdit,
}) => {
  // Metadatos y tipo
  const [type, setType] = useState<QuestionType>("multiple_choice");
  const [course, setCourse] = useState("Física 10°");
  const [topic, setTopic] = useState("");
  const [subtopic, setSubtopic] = useState("");
  const [difficulty, setDifficulty] = useState<"Fácil" | "Media" | "Difícil">("Media");
  const [tagsInput, setTagsInput] = useState("");

  // Contenido principal
  const [prompt, setPrompt] = useState("");
  const [explanation, setExplanation] = useState("");
  const [imageSizePercent, setImageSizePercent] = useState<number>(50);
  const [videos, setVideos] = useState<VideoEmbed[]>([]);
  const [videoUrlInput, setVideoUrlInput] = useState("");
  const [videoCaptionInput, setVideoCaptionInput] = useState("");
  const [showVideoInput, setShowVideoInput] = useState(false);

  // Opciones (multiple_choice, multiple_response, true_false)
  const [options, setOptions] = useState<Option[]>([
    { id: "a", text: "", isCorrect: true },
    { id: "b", text: "", isCorrect: false },
    { id: "c", text: "", isCorrect: false },
    { id: "d", text: "", isCorrect: false },
  ]);
  const [optionLayout, setOptionLayout] = useState<OptionLayout>("grid-2");
  const [requireJustification, setRequireJustification] = useState(false);

  // Emparejamiento
  const [matchingPairs, setMatchingPairs] = useState<MatchingPair[]>([
    { id: "m1", left: "", right: "" },
    { id: "m2", left: "", right: "" },
    { id: "m3", left: "", right: "" },
  ]);
  const [matchingDistractors, setMatchingDistractors] = useState<string[]>([]);

  // Ordenamiento
  const [orderingItems, setOrderingItems] = useState<OrderingItem[]>([
    { id: "o1", text: "" },
    { id: "o2", text: "" },
    { id: "o3", text: "" },
  ]);

  // Numérica
  const [numericAnswer, setNumericAnswer] = useState("");
  const [numericUnit, setNumericUnit] = useState("");
  const [numericTolerance, setNumericTolerance] = useState("");

  // Abierta
  const [openResponseHeight, setOpenResponseHeight] = useState<number>(3.5);
  const [openSubtype, setOpenSubtype] = useState<OpenSubtype>("step_by_step");

  // Estímulo compartido
  const [stimulusTitle, setStimulusTitle] = useState("Con base en la siguiente información, responda:");
  const [stimulusRangeNote, setStimulusRangeNote] = useState("Preguntas siguientes");

  // Modales auxiliares del estudio
  const [mathTarget, setMathTarget] = useState<{
    kind: "prompt" | "explanation" | "option" | "edit_formula";
    optIndex?: number;
    editFormula?: ParsedPromptFormula;
  } | null>(null);
  const [tableModalState, setTableModalState] = useState<{
    isOpen: boolean;
    editTable?: ParsedPromptTable | null;
  }>({ isOpen: false, editTable: null });
  const [clipboardNotice, setClipboardNotice] = useState<string | null>(null);

  // Refs
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const promptFileRef = useRef<HTMLInputElement>(null);
  const optionFileRefs = useRef<Record<number, HTMLInputElement | null>>({});

  useEffect(() => {
    if (!isOpen) return;
    if (questionToEdit) {
      setType(questionToEdit.type || "multiple_choice");
      setCourse(questionToEdit.course || "Física 10°");
      setTopic(questionToEdit.topic || "");
      setSubtopic(questionToEdit.subtopic || "");
      setDifficulty(questionToEdit.difficulty || "Media");
      setTagsInput(questionToEdit.tags?.join(", ") || "");
      setPrompt(questionToEdit.prompt || "");
      setExplanation(questionToEdit.explanation || "");
      setVideos(questionToEdit.videos || []);
      setOptionLayout(questionToEdit.optionLayout || "grid-2");
      setRequireJustification(!!questionToEdit.requireJustification);
      setOpenResponseHeight(questionToEdit.openResponseHeight || 3.5);
      setOpenSubtype(questionToEdit.openSubtype || "step_by_step");
      setNumericAnswer(questionToEdit.numericAnswer || "");
      setNumericUnit(questionToEdit.numericUnit || "");
      setNumericTolerance(questionToEdit.numericTolerance || "");
      setStimulusTitle(questionToEdit.stimulusTitle || "Con base en la siguiente información, responda:");
      setStimulusRangeNote(questionToEdit.stimulusRangeNote || "Preguntas siguientes");
      setMatchingPairs(
        questionToEdit.matchingPairs?.length
          ? questionToEdit.matchingPairs
          : [
              { id: "m1", left: "", right: "" },
              { id: "m2", left: "", right: "" },
              { id: "m3", left: "", right: "" },
            ]
      );
      setMatchingDistractors(questionToEdit.matchingDistractors || []);
      setOrderingItems(
        questionToEdit.orderingItems?.length
          ? questionToEdit.orderingItems
          : [
              { id: "o1", text: "" },
              { id: "o2", text: "" },
              { id: "o3", text: "" },
            ]
      );
      setOptions(
        questionToEdit.options?.length
          ? questionToEdit.options
          : [
              { id: "a", text: "", isCorrect: true },
              { id: "b", text: "", isCorrect: false },
              { id: "c", text: "", isCorrect: false },
              { id: "d", text: "", isCorrect: false },
            ]
      );
    } else {
      setType("multiple_choice");
      setCourse("Física 10°");
      setTopic("");
      setSubtopic("");
      setDifficulty("Media");
      setTagsInput("");
      setPrompt("");
      setExplanation("");
      setVideos([]);
      setOptionLayout("grid-2");
      setRequireJustification(false);
      setOpenResponseHeight(3.5);
      setOpenSubtype("step_by_step");
      setNumericAnswer("");
      setNumericUnit("");
      setNumericTolerance("");
      setStimulusTitle("Con base en la siguiente información, responda:");
      setStimulusRangeNote("Preguntas siguientes");
      setMatchingPairs([
        { id: "m1", left: "", right: "" },
        { id: "m2", left: "", right: "" },
        { id: "m3", left: "", right: "" },
      ]);
      setMatchingDistractors([]);
      setOrderingItems([
        { id: "o1", text: "" },
        { id: "o2", text: "" },
        { id: "o3", text: "" },
      ]);
      setOptions([
        { id: "a", text: "", isCorrect: true },
        { id: "b", text: "", isCorrect: false },
        { id: "c", text: "", isCorrect: false },
        { id: "d", text: "", isCorrect: false },
      ]);
    }
    setShowVideoInput(false);
    setClipboardNotice(null);
  }, [questionToEdit, isOpen]);

  // Cambiar a Verdadero/Falso preconfigura las opciones si están vacías o distintas
  const handleSelectType = (newType: QuestionType) => {
    setType(newType);
    if (newType === "video_quiz" && videos.length === 0) {
      setShowVideoInput(true);
    }
    if (newType === "true_false") {
      const isAlreadyTF =
        options.length === 2 &&
        options[0].text === "Verdadero" &&
        options[1].text === "Falso";
      if (!isAlreadyTF) {
        setOptions([
          { id: "v", text: "Verdadero", isCorrect: true },
          { id: "f", text: "Falso", isCorrect: false },
        ]);
        setOptionLayout("horizontal");
      }
    } else if (
      (newType === "multiple_choice" || newType === "multiple_response") &&
      options.length === 2 &&
      options[0].text === "Verdadero"
    ) {
      setOptions([
        { id: "a", text: "", isCorrect: true },
        { id: "b", text: "", isCorrect: false },
        { id: "c", text: "", isCorrect: false },
        { id: "d", text: "", isCorrect: false },
      ]);
      setOptionLayout("grid-2");
    }
  };

  const showNotice = (msg: string) => {
    setClipboardNotice(msg);
    setTimeout(() => setClipboardNotice(null), 3500);
  };

  const insertIntoPrompt = (snippet: string) => {
    const el = promptRef.current;
    if (!el) {
      setPrompt((p) => (p ? `${p}${snippet}` : snippet));
      return;
    }
    const start = el.selectionStart ?? prompt.length;
    const end = el.selectionEnd ?? prompt.length;
    const next = prompt.slice(0, start) + snippet + prompt.slice(end);
    setPrompt(next);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + snippet.length, start + snippet.length);
    }, 0);
  };

  const wrapPromptSelection = (prefix: string, suffix: string, placeholder: string) => {
    const el = promptRef.current;
    if (!el) {
      setPrompt((p) => `${p}${prefix}${placeholder}${suffix}`);
      return;
    }
    const start = el.selectionStart ?? prompt.length;
    const end = el.selectionEnd ?? prompt.length;
    const selected = prompt.slice(start, end) || placeholder;
    const next = prompt.slice(0, start) + prefix + selected + suffix + prompt.slice(end);
    setPrompt(next);
  };

  // Pegar imagen desde portapapeles en enunciado
  const handlePromptPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    handleClipboardImage(
      e,
      prompt,
      setPrompt,
      (info) => showNotice(info),
      imageSizePercent
    );
  };

  const handlePromptImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { markdownTag } = await processAndSaveImage(file, undefined, imageSizePercent);
    if (markdownTag) {
      insertIntoPrompt(`\n${markdownTag}\n`);
      showNotice(`Imagen "${file.name}" añadida al enunciado.`);
    }
    e.target.value = "";
  };

  // Imágenes, fórmulas y tablas extraídas del enunciado para gestor visual
  const promptImages = useMemo(() => extractPromptImages(prompt), [prompt]);
  const promptFormulas = useMemo(() => extractPromptFormulas(prompt), [prompt]);
  const promptTables = useMemo(() => extractPromptTables(prompt), [prompt]);

  const updatePromptImageSize = (img: ParsedPromptImage, newPercent: number) => {
    const updatedTag = `![${img.alt || "imagen"}|${newPercent}%](${img.src})`;
    setPrompt((prev) => prev.replace(img.fullMatch, updatedTag));
  };

  const removePromptImage = (img: ParsedPromptImage) => {
    setPrompt((prev) => prev.replace(img.fullMatch, "").replace(/\n{3,}/g, "\n\n").trim());
  };

  // Videos
  const handleAddVideo = () => {
    if (!videoUrlInput.trim()) return;
    setVideos((prev) => [
      ...prev,
      {
        id: `vid-${Date.now()}`,
        url: videoUrlInput.trim(),
        caption: videoCaptionInput.trim() || undefined,
        playbackScope: "full",
        feedbackMode: "at_end",
        cuePoints: [],
      },
    ]);
    setVideoUrlInput("");
    setVideoCaptionInput("");
    setShowVideoInput(false);
  };

  // Opciones
  const handleOptionChange = (index: number, text: string) => {
    setOptions((prev) => prev.map((o, i) => (i === index ? { ...o, text } : o)));
  };

  const handleToggleOptionCorrect = (index: number) => {
    if (type === "multiple_response") {
      setOptions((prev) =>
        prev.map((o, i) => (i === index ? { ...o, isCorrect: !o.isCorrect } : o))
      );
    } else {
      setOptions((prev) => prev.map((o, i) => ({ ...o, isCorrect: i === index })));
    }
  };

  const handleOptionImageUpload = async (index: number, file: File) => {
    const { path } = await processAndSaveImage(file, undefined, 100);
    if (path) {
      setOptions((prev) =>
        prev.map((o, i) => (i === index ? { ...o, image: path, imageWidth: 80 } : o))
      );
      showNotice(`Imagen añadida a la opción ${String.fromCharCode(65 + index)}.`);
    }
  };

  const handleOptionPaste = async (index: number, e: React.ClipboardEvent<HTMLInputElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) await handleOptionImageUpload(index, file);
        return;
      }
    }
  };

  const handleAddOption = () => {
    if (options.length >= 6) return;
    const nextChar = String.fromCharCode(97 + options.length);
    setOptions((prev) => [...prev, { id: nextChar, text: "", isCorrect: false }]);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) return;
    setOptions((prev) => prev.filter((_, i) => i !== index));
  };

  // Emparejamiento
  const addMatchingPair = () => {
    setMatchingPairs((prev) => [
      ...prev,
      { id: `m-${Date.now()}`, left: "", right: "" },
    ]);
  };

  // Ordenamiento
  const addOrderingItem = () => {
    setOrderingItems((prev) => [
      ...prev,
      { id: `o-${Date.now()}`, text: "" },
    ]);
  };

  const moveOrderingItem = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= orderingItems.length) return;
    setOrderingItems((prev) => {
      const copy = [...prev];
      [copy[idx], copy[target]] = [copy[target], copy[idx]];
      return copy;
    });
  };

  // Preview renderizado en tiempo real
  const renderedPromptPreview = useMemo(
    () => renderMarkdownWithMath(prompt || "*Escribe el enunciado en el panel izquierdo para ver la vista previa en vivo...*"),
    [prompt]
  );

  const renderedExplanationPreview = useMemo(
    () => (explanation ? renderMarkdownWithMath(explanation) : ""),
    [explanation]
  );

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() && type !== "stimulus") {
      showNotice("Por favor escribe el enunciado de la pregunta.");
      return;
    }

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const newQuestion: Question = {
      id: questionToEdit?.id || `q-${Date.now()}`,
      type,
      course: course.trim() || "General",
      topic: topic.trim() || (type === "stimulus" ? "Contexto" : "General"),
      subtopic: subtopic.trim() || undefined,
      difficulty,
      tags,
      prompt: prompt.trim() || stimulusTitle,
      options:
        type === "multiple_choice" || type === "multiple_response" || type === "true_false"
          ? options
          : [],
      optionLayout:
        type === "multiple_choice" || type === "multiple_response" || type === "true_false"
          ? optionLayout
          : undefined,
      requireJustification: type === "true_false" ? requireJustification : undefined,
      matchingPairs:
        type === "matching"
          ? matchingPairs.filter((p) => p.left.trim() || p.right.trim())
          : undefined,
      matchingDistractors:
        type === "matching"
          ? matchingDistractors.map((d) => d.trim()).filter(Boolean)
          : undefined,
      matchingRightOrder:
        type === "matching"
          ? buildShuffledMatchingOrder(
              matchingPairs.filter((p) => p.left.trim() || p.right.trim()),
              matchingDistractors.map((d) => d.trim()).filter(Boolean)
            )
          : undefined,
      orderingItems:
        type === "ordering"
          ? orderingItems.filter((o) => o.text.trim())
          : undefined,
      numericAnswer: type === "numeric" ? numericAnswer.trim() : undefined,
      numericUnit: type === "numeric" ? numericUnit.trim() || undefined : undefined,
      numericTolerance: type === "numeric" ? numericTolerance.trim() || undefined : undefined,
      openResponseHeight: type === "open" ? openResponseHeight : undefined,
      openSubtype: type === "open" ? openSubtype : undefined,
      stimulusTitle: type === "stimulus" ? stimulusTitle.trim() : undefined,
      stimulusRangeNote: type === "stimulus" ? stimulusRangeNote.trim() : undefined,
      videos: videos.length > 0 ? videos : undefined,
      explanation: explanation.trim() || undefined,
      createdAt: questionToEdit?.createdAt || new Date().toISOString(),
    };

    onSave(newQuestion);
    onClose();
  };

  const optionLabels = ["A", "B", "C", "D", "E", "F"];
  const layoutGridClass =
    optionLayout === "horizontal"
      ? "grid grid-cols-2 sm:grid-cols-4 gap-2"
      : optionLayout === "vertical"
      ? "flex flex-col gap-2"
      : "grid grid-cols-1 sm:grid-cols-2 gap-2";

  return (
    <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col overflow-hidden animate-in fade-in duration-150">
      {/* ── Barra Superior Exclusiva del Estudio ── */}
      <header className="h-14 shrink-0 bg-slate-950 border-b border-slate-750 px-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-sky-600/20 border border-sky-500/40 text-sky-400 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100">
              {questionToEdit ? "Editar Pregunta" : "Estudio de Creación de Preguntas"}
            </h2>
            <p className="text-[11px] text-slate-400">
              {QUESTION_TYPE_LABELS[type]} &bull; Vista previa en tiempo real
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {clipboardNotice && (
            <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-medium">
              {clipboardNotice}
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="flex items-center gap-1.5 px-5 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg shadow-sm transition-all active:scale-95"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{questionToEdit ? "Guardar Cambios" : "Guardar Pregunta"}</span>
          </button>
        </div>
      </header>

      {/* ── Contenido Dividido: Izquierda Editor / Derecha Vista Previa ── */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* PANEL IZQUIERDO: Editor Asistido */}
        <form
          onSubmit={handleSubmit}
          className="w-full lg:w-[56%] h-full overflow-y-auto p-5 space-y-5 border-b lg:border-b-0 lg:border-r border-slate-750 bg-slate-900"
        >
          {/* 1. Selector Visual de Tipo de Pregunta */}
          <section className="bg-slate-850 border border-slate-750 rounded-2xl p-4 space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              1. Tipo de Pregunta o Bloque
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {TYPE_OPTIONS.map((t) => {
                const active = type === t.type;
                return (
                  <button
                    key={t.type}
                    type="button"
                    onClick={() => handleSelectType(t.type)}
                    className={`p-2.5 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                      active
                        ? "bg-sky-500/15 border-sky-500 ring-1 ring-sky-500/40 text-sky-300"
                        : "bg-slate-900/70 border-slate-750 text-slate-300 hover:border-slate-600 hover:bg-slate-800"
                    }`}
                  >
                    <div className={`mt-0.5 shrink-0 ${active ? "text-sky-400" : "text-slate-400"}`}>
                      {t.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate">{t.label}</div>
                      <div className="text-[10px] text-slate-400 leading-tight mt-0.5">
                        {t.shortDesc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 2. Metadatos */}
          <section className="bg-slate-850 border border-slate-750 rounded-2xl p-4 space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              2. Clasificación en el Banco
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Curso / Materia</label>
                <input
                  type="text"
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                  placeholder="Ej: Física 10°"
                  className="w-full rounded-lg px-2.5 py-1.5 bg-slate-900 border border-slate-700 text-slate-100"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Tema</label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Ej: Cinemática"
                  className="w-full rounded-lg px-2.5 py-1.5 bg-slate-900 border border-slate-700 text-slate-100"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Subtema</label>
                <input
                  type="text"
                  value={subtopic}
                  onChange={(e) => setSubtopic(e.target.value)}
                  placeholder="Opcional"
                  className="w-full rounded-lg px-2.5 py-1.5 bg-slate-900 border border-slate-700 text-slate-100"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Dificultad</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as any)}
                  className="w-full rounded-lg px-2.5 py-1.5 bg-slate-900 border border-slate-700 text-slate-100"
                >
                  <option value="Fácil">Fácil</option>
                  <option value="Media">Media</option>
                  <option value="Difícil">Difícil</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-slate-400 text-xs block mb-1">Etiquetas (separadas por coma)</label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="ej: vectores, gráfica, saber-11"
                className="w-full rounded-lg px-2.5 py-1.5 text-xs bg-slate-900 border border-slate-700 text-slate-100"
              />
            </div>
          </section>

          {/* Campos especiales si es Estímulo Compartido */}
          {type === "stimulus" && (
            <section className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
                <Layers className="w-4 h-4" />
                <span>Configuración de Estímulo / Contexto Compartido</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-slate-300 block mb-1">Encabezado del grupo:</label>
                  <input
                    type="text"
                    value={stimulusTitle}
                    onChange={(e) => setStimulusTitle(e.target.value)}
                    placeholder="Ej: Responda las preguntas 2 a 6 con la siguiente imagen:"
                    className="w-full rounded-lg px-2.5 py-1.5 bg-slate-900 border border-slate-700 text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Rango / Nota (opcional):</label>
                  <input
                    type="text"
                    value={stimulusRangeNote}
                    onChange={(e) => setStimulusRangeNote(e.target.value)}
                    placeholder="Ej: Preguntas 2 a 6"
                    className="w-full rounded-lg px-2.5 py-1.5 bg-slate-900 border border-slate-700 text-slate-100"
                  />
                </div>
              </div>
            </section>
          )}

          {/* 3. Editor Enriquecido del Enunciado */}
          <section className="bg-slate-850 border border-slate-750 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                3. {type === "stimulus" ? "Contenido del Estímulo (Texto, Imagen, Tabla o Video)" : "Enunciado de la Pregunta"}
              </label>
              <span className="text-[11px] text-slate-400">
                Puedes pegar imágenes directo con <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono">Ctrl+V</kbd>
              </span>
            </div>

            {/* Barra de herramientas visual (sin necesidad de saber LaTeX/Markdown) */}
            <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl bg-slate-900 border border-slate-750">
              <button
                type="button"
                onClick={() => wrapPromptSelection("**", "**", "texto en negrita")}
                title="Negrita"
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => wrapPromptSelection("*", "*", "texto en cursiva")}
                title="Cursiva"
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertIntoPrompt("\n- Elemento 1\n- Elemento 2\n")}
                title="Lista con viñetas"
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200"
              >
                <List className="w-3.5 h-3.5" />
              </button>

              <div className="h-5 w-px bg-slate-750 mx-0.5" />

              {/* Constructor Visual de Fórmulas */}
              <button
                type="button"
                onClick={() => setMathTarget({ kind: "prompt" })}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/40 text-sky-300 text-xs font-semibold transition-colors"
              >
                <Sigma className="w-3.5 h-3.5" />
                <span>Insertar Fórmula</span>
              </button>

              {/* Constructor Visual de Tablas */}
              <button
                type="button"
                onClick={() => setTableModalState({ isOpen: true, editTable: null })}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 text-xs font-medium transition-colors"
              >
                <TableIcon className="w-3.5 h-3.5 text-sky-400" />
                <span>Insertar Tabla</span>
              </button>

              {/* Insertar Hueco (para completar oraciones/tablas) */}
              {type === "fill_blanks" && (
                <button
                  type="button"
                  onClick={() => wrapPromptSelection("{{", "}}", "respuesta")}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-semibold transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Insertar Espacio en Blanco</span>
                </button>
              )}

              <div className="h-5 w-px bg-slate-750 mx-0.5" />

              {/* Subir Imagen */}
              <input
                ref={promptFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePromptImageUpload}
              />
              <button
                type="button"
                onClick={() => promptFileRef.current?.click()}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-medium transition-colors"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Imagen</span>
              </button>

              {/* Añadir Video */}
              <button
                type="button"
                onClick={() => setShowVideoInput(!showVideoInput)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/40 text-indigo-300 text-xs font-medium transition-colors"
              >
                <Video className="w-3.5 h-3.5" />
                <span>Video</span>
              </button>
            </div>

            {/* Textarea principal */}
            <textarea
              ref={promptRef}
              rows={6}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onPaste={handlePromptPaste}
              placeholder={
                type === "fill_blanks"
                  ? "Escribe la oración o tabla y usa {{respuesta}} para crear espacios. Ej: La unidad de fuerza en el SI es el {{newton}}."
                  : "Escribe aquí el enunciado... Usa los botones de arriba para fórmulas, tablas, imágenes o videos."
              }
              className="w-full rounded-xl p-3 text-xs leading-relaxed bg-slate-900 border border-slate-700 text-slate-100 focus:border-sky-500"
            />

            {/* Gestor Visual de Imágenes Adjuntas (Miniaturas reales + Tamaño con un clic) */}
            {promptImages.length > 0 && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                    Imágenes en el enunciado ({promptImages.length})
                  </span>
                  <span>Ajusta el tamaño visualmente sin tocar código:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {promptImages.map((img, idx) => (
                    <div
                      key={`${img.src}-${idx}`}
                      className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-900 border border-slate-700"
                    >
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-950 border border-slate-750 shrink-0 flex items-center justify-center">
                        <img
                          src={img.resolvedSrc}
                          alt={img.alt}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-medium text-slate-200 truncate">
                            {img.alt || `Imagen ${idx + 1}`}
                          </span>
                          <button
                            type="button"
                            onClick={() => removePromptImage(img)}
                            title="Quitar imagen del enunciado"
                            className="p-1 text-slate-400 hover:text-rose-400 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex items-center gap-1">
                          {[25, 50, 75, 100].map((pct) => (
                            <button
                              key={pct}
                              type="button"
                              onClick={() => {
                                setImageSizePercent(pct);
                                updatePromptImageSize(img, pct);
                              }}
                              className={`text-[10px] px-1.5 py-0.5 rounded font-semibold transition-all ${
                                img.widthPercent === pct
                                  ? "bg-sky-600 text-white"
                                  : "bg-slate-800 text-slate-400 hover:text-slate-200"
                              }`}
                            >
                              {pct}%
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Gestor Visual de Fórmulas (Clic para editar estilo Word sin código) */}
            {promptFormulas.length > 0 && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <Sigma className="w-3.5 h-3.5 text-sky-400" />
                    Fórmulas en el enunciado ({promptFormulas.length}) — haz clic para editar
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {promptFormulas.map((f, idx) => (
                    <div
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-sky-500/60 transition-colors"
                    >
                      <button
                        type="button"
                        onClick={() => setMathTarget({ kind: "edit_formula", editFormula: f })}
                        title="Haz clic para editar esta fórmula visualmente"
                        className="text-xs text-slate-100 hover:text-sky-300"
                        dangerouslySetInnerHTML={{ __html: f.renderedHtml }}
                      />
                      <button
                        type="button"
                        onClick={() => setPrompt((prev) => prev.replace(f.fullMatch, ""))}
                        title="Eliminar fórmula"
                        className="text-slate-500 hover:text-rose-400 ml-1"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Gestor Visual de Tablas (Clic para editar celdas como en Excel/Word) */}
            {promptTables.length > 0 && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <TableIcon className="w-3.5 h-3.5 text-sky-400" />
                    Tablas en el enunciado ({promptTables.length})
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {promptTables.map((tbl, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700"
                    >
                      <div className="text-xs">
                        <span className="font-semibold text-slate-200">Tabla {idx + 1}</span>
                        <span className="text-[11px] text-slate-400 ml-2">
                          ({tbl.cells.length} filas × {tbl.cells[0]?.length || 0} cols)
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setTableModalState({ isOpen: true, editTable: tbl })}
                          className="px-2.5 py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/40 text-sky-300 text-[11px] font-semibold"
                        >
                          Editar Tabla
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setPrompt((prev) =>
                              prev.replace(tbl.fullMatch, "").replace(/\n{3,}/g, "\n\n").trim()
                            )
                          }
                          title="Eliminar tabla"
                          className="p-1 text-slate-400 hover:text-rose-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Formulario rápido para añadir Video */}
            {showVideoInput && (
              <div className="p-3 rounded-xl bg-slate-900 border border-indigo-500/40 space-y-2.5 text-xs">
                <div className="font-semibold text-indigo-300 flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5" />
                  <span>Adjuntar Video (YouTube, Vimeo o enlace directo MP4)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={videoUrlInput}
                    onChange={(e) => setVideoUrlInput(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="rounded-lg px-2.5 py-1.5 bg-slate-850 border border-slate-700 text-slate-100"
                  />
                  <input
                    type="text"
                    value={videoCaptionInput}
                    onChange={(e) => setVideoCaptionInput(e.target.value)}
                    placeholder="Título o descripción (opcional)"
                    className="rounded-lg px-2.5 py-1.5 bg-slate-850 border border-slate-700 text-slate-100"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowVideoInput(false)}
                    className="px-3 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleAddVideo}
                    className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
                  >
                    Añadir Video
                  </button>
                </div>
              </div>
            )}

            {/* Lista de Videos adjuntos + Puntos de Pausa Interactivos */}
            {videos.length > 0 && (
              <div className="space-y-2.5">
                {videos.map((v) => (
                  <div
                    key={v.id}
                    className="p-3 rounded-xl bg-slate-900 border border-slate-700 text-xs space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Video className="w-4 h-4 text-indigo-400 shrink-0" />
                        <span className="text-slate-100 font-semibold truncate">
                          {v.caption || v.url}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            const nextTime = ((v.cuePoints?.length || 0) + 1) * 30;
                            setVideos((prev) =>
                              prev.map((item) =>
                                item.id === v.id
                                  ? {
                                      ...item,
                                      cuePoints: [
                                        ...(item.cuePoints || []),
                                        {
                                          id: `cp-${Date.now()}`,
                                          timeSeconds: nextTime,
                                          prompt: "",
                                          options: [
                                            { id: "a", text: "", isCorrect: true },
                                            { id: "b", text: "", isCorrect: false },
                                            { id: "c", text: "", isCorrect: false },
                                            { id: "d", text: "", isCorrect: false },
                                          ],
                                        },
                                      ],
                                    }
                                  : item
                              )
                            );
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-[11px] font-semibold"
                        >
                          <Pause className="w-3 h-3" />
                          <span>+ Pausa con Pregunta</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setVideos((prev) => prev.filter((item) => item.id !== v.id))
                          }
                          className="text-slate-400 hover:text-rose-400 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Configuración de Fragmento y Retroalimentación */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-2.5 rounded-lg bg-slate-950/60 border border-slate-750 text-[11px]">
                      {/* Rango de reproducción */}
                      <div className="space-y-1.5">
                        <span className="font-semibold text-slate-300 block">
                          Reproducción del video:
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              setVideos((prev) =>
                                prev.map((item) =>
                                  item.id === v.id
                                    ? { ...item, playbackScope: "full" }
                                    : item
                                )
                              )
                            }
                            className={`px-2.5 py-1 rounded-md border font-medium ${
                              (v.playbackScope || "full") === "full"
                                ? "bg-sky-600 border-sky-500 text-white"
                                : "bg-slate-800 border-slate-700 text-slate-300"
                            }`}
                          >
                            Completo
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setVideos((prev) =>
                                prev.map((item) =>
                                  item.id === v.id
                                    ? {
                                        ...item,
                                        playbackScope: "clip",
                                        startSeconds: item.startSeconds ?? 0,
                                        endSeconds: item.endSeconds ?? 60,
                                      }
                                    : item
                                )
                              )
                            }
                            className={`px-2.5 py-1 rounded-md border font-medium ${
                              v.playbackScope === "clip"
                                ? "bg-sky-600 border-sky-500 text-white"
                                : "bg-slate-800 border-slate-700 text-slate-300"
                            }`}
                          >
                            Solo una parte
                          </button>
                        </div>

                        {v.playbackScope === "clip" && (
                          <div className="flex items-center gap-2 pt-1">
                            <span className="text-slate-400">Desde:</span>
                            <input
                              type="text"
                              defaultValue={formatSeconds(v.startSeconds || 0)}
                              onBlur={(e) => {
                                const sec = parseTimeInput(e.target.value);
                                setVideos((prev) =>
                                  prev.map((item) =>
                                    item.id === v.id ? { ...item, startSeconds: sec } : item
                                  )
                                );
                              }}
                              placeholder="0:00"
                              className="w-16 px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-100 font-mono text-center"
                            />
                            <span className="text-slate-400">Hasta:</span>
                            <input
                              type="text"
                              defaultValue={formatSeconds(v.endSeconds || 60)}
                              onBlur={(e) => {
                                const sec = parseTimeInput(e.target.value);
                                setVideos((prev) =>
                                  prev.map((item) =>
                                    item.id === v.id ? { ...item, endSeconds: sec } : item
                                  )
                                );
                              }}
                              placeholder="1:00"
                              className="w-16 px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-100 font-mono text-center"
                            />
                          </div>
                        )}
                      </div>

                      {/* Modo de retroalimentación */}
                      <div className="space-y-1.5">
                        <span className="font-semibold text-slate-300 block">
                          Mostrar respuestas correctas:
                        </span>
                        <select
                          value={v.feedbackMode || "at_end"}
                          onChange={(e) =>
                            setVideos((prev) =>
                              prev.map((item) =>
                                item.id === v.id
                                  ? {
                                      ...item,
                                      feedbackMode: e.target.value as VideoFeedbackMode,
                                      feedbackAtSeconds:
                                        e.target.value === "at_timestamp"
                                          ? item.feedbackAtSeconds ?? 60
                                          : item.feedbackAtSeconds,
                                    }
                                  : item
                              )
                            )
                          }
                          className="w-full rounded-lg px-2 py-1 bg-slate-900 border border-slate-700 text-slate-100 text-[11px]"
                        >
                          <option value="at_end">Al finalizar el video / fragmento</option>
                          <option value="at_timestamp">En un punto específico del video</option>
                          <option value="immediate">Al instante al responder cada pausa</option>
                        </select>

                        {v.feedbackMode === "at_timestamp" && (
                          <div className="flex items-center gap-2 pt-1">
                            <span className="text-slate-400">Mostrar en el minuto:</span>
                            <input
                              type="text"
                              defaultValue={formatSeconds(v.feedbackAtSeconds || 60)}
                              onBlur={(e) => {
                                const sec = parseTimeInput(e.target.value);
                                setVideos((prev) =>
                                  prev.map((item) =>
                                    item.id === v.id
                                      ? { ...item, feedbackAtSeconds: sec }
                                      : item
                                  )
                                );
                              }}
                              placeholder="1:00"
                              className="w-16 px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-100 font-mono text-center"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Puntos de pausa configurados */}
                    {v.cuePoints && v.cuePoints.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-slate-800">
                        {v.cuePoints.map((cp, cpIdx) => (
                          <div
                            key={cp.id}
                            className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-750 space-y-2"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded border border-amber-500/30">
                                <Clock className="w-3 h-3" /> Pausa #{cpIdx + 1}
                              </span>
                              <label className="text-[11px] text-slate-400">
                                Segundo (ej. 30 o 1:15):
                              </label>
                              <input
                                type="text"
                                defaultValue={formatSeconds(cp.timeSeconds)}
                                onBlur={(e) => {
                                  const raw = e.target.value.trim();
                                  let sec = 0;
                                  if (raw.includes(":")) {
                                    const [m, s] = raw.split(":").map(Number);
                                    sec = (m || 0) * 60 + (s || 0);
                                  } else {
                                    sec = Math.max(0, Number(raw) || 0);
                                  }
                                  setVideos((prev) =>
                                    prev.map((item) =>
                                      item.id === v.id
                                        ? {
                                            ...item,
                                            cuePoints: item.cuePoints?.map((c) =>
                                              c.id === cp.id ? { ...c, timeSeconds: sec } : c
                                            ),
                                          }
                                        : item
                                    )
                                  );
                                }}
                                className="w-20 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-100 font-mono text-[11px] text-center"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setVideos((prev) =>
                                    prev.map((item) =>
                                      item.id === v.id
                                        ? {
                                            ...item,
                                            cuePoints: item.cuePoints?.filter(
                                              (c) => c.id !== cp.id
                                            ),
                                          }
                                        : item
                                    )
                                  )
                                }
                                className="ml-auto text-slate-500 hover:text-rose-400 p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <input
                              type="text"
                              value={cp.prompt}
                              onChange={(e) =>
                                setVideos((prev) =>
                                  prev.map((item) =>
                                    item.id === v.id
                                      ? {
                                          ...item,
                                          cuePoints: item.cuePoints?.map((c) =>
                                            c.id === cp.id ? { ...c, prompt: e.target.value } : c
                                          ),
                                        }
                                      : item
                                  )
                                )
                              }
                              placeholder="Pregunta que aparece al pausarse el video en ese momento..."
                              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs"
                            />

                            {/* Modo de respuesta de la pausa + Opciones (2 a 6) */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-[11px]">
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setVideos((prev) =>
                                        prev.map((item) =>
                                          item.id === v.id
                                            ? {
                                                ...item,
                                                cuePoints: item.cuePoints?.map((c) =>
                                                  c.id === cp.id
                                                    ? {
                                                        ...c,
                                                        options:
                                                          c.options && c.options.length > 0
                                                            ? c.options
                                                            : [
                                                                { id: "a", text: "", isCorrect: true },
                                                                { id: "b", text: "", isCorrect: false },
                                                                { id: "c", text: "", isCorrect: false },
                                                                { id: "d", text: "", isCorrect: false },
                                                              ],
                                                      }
                                                    : c
                                                ),
                                              }
                                            : item
                                        )
                                      )
                                    }
                                    className={`px-2 py-0.5 rounded border font-medium ${
                                      cp.options && cp.options.length > 0
                                        ? "bg-sky-600/20 border-sky-500 text-sky-300"
                                        : "bg-slate-800 border-slate-700 text-slate-400"
                                    }`}
                                  >
                                    Opción múltiple
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setVideos((prev) =>
                                        prev.map((item) =>
                                          item.id === v.id
                                            ? {
                                                ...item,
                                                cuePoints: item.cuePoints?.map((c) =>
                                                  c.id === cp.id ? { ...c, options: [] } : c
                                                ),
                                              }
                                            : item
                                        )
                                      )
                                    }
                                    className={`px-2 py-0.5 rounded border font-medium ${
                                      !cp.options || cp.options.length === 0
                                        ? "bg-sky-600/20 border-sky-500 text-sky-300"
                                        : "bg-slate-800 border-slate-700 text-slate-400"
                                    }`}
                                  >
                                    Respuesta abierta
                                  </button>
                                </div>

                                {cp.options && cp.options.length > 0 && cp.options.length < 6 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setVideos((prev) =>
                                        prev.map((item) =>
                                          item.id === v.id
                                            ? {
                                                ...item,
                                                cuePoints: item.cuePoints?.map((c) =>
                                                  c.id === cp.id
                                                    ? {
                                                        ...c,
                                                        options: [
                                                          ...(c.options || []),
                                                          {
                                                            id: String.fromCharCode(97 + (c.options?.length || 0)),
                                                            text: "",
                                                            isCorrect: false,
                                                          },
                                                        ],
                                                      }
                                                    : c
                                                ),
                                              }
                                            : item
                                        )
                                      )
                                    }
                                    className="flex items-center gap-1 text-sky-400 hover:text-sky-300 font-semibold"
                                  >
                                    <Plus className="w-3 h-3" /> Añadir opción
                                  </button>
                                )}
                              </div>

                              {cp.options && cp.options.length > 0 && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                  {cp.options.map((opt, optI) => (
                                    <div key={opt.id || optI} className="flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setVideos((prev) =>
                                            prev.map((item) =>
                                              item.id === v.id
                                                ? {
                                                    ...item,
                                                    cuePoints: item.cuePoints?.map((c) =>
                                                      c.id === cp.id
                                                        ? {
                                                            ...c,
                                                            options: c.options?.map((o, oi) => ({
                                                              ...o,
                                                              isCorrect: oi === optI,
                                                            })),
                                                          }
                                                        : c
                                                    ),
                                                  }
                                                : item
                                            )
                                          )
                                        }
                                        className={`shrink-0 ${
                                          opt.isCorrect ? "text-emerald-400" : "text-slate-500"
                                        }`}
                                        title="Marcar como correcta"
                                      >
                                        {opt.isCorrect ? (
                                          <CheckCircle2 className="w-4 h-4" />
                                        ) : (
                                          <Circle className="w-4 h-4" />
                                        )}
                                      </button>
                                      <input
                                        type="text"
                                        value={opt.text}
                                        onChange={(e) =>
                                          setVideos((prev) =>
                                            prev.map((item) =>
                                              item.id === v.id
                                                ? {
                                                    ...item,
                                                    cuePoints: item.cuePoints?.map((c) =>
                                                      c.id === cp.id
                                                        ? {
                                                            ...c,
                                                            options: c.options?.map((o, oi) =>
                                                              oi === optI
                                                                ? { ...o, text: e.target.value }
                                                                : o
                                                            ),
                                                          }
                                                        : c
                                                    ),
                                                  }
                                                : item
                                            )
                                          )
                                        }
                                        placeholder={`Opción ${String.fromCharCode(65 + optI)}`}
                                        className="flex-1 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-[11px] text-slate-200"
                                      />
                                      {cp.options!.length > 2 && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setVideos((prev) =>
                                              prev.map((item) =>
                                                item.id === v.id
                                                  ? {
                                                      ...item,
                                                      cuePoints: item.cuePoints?.map((c) =>
                                                        c.id === cp.id
                                                          ? {
                                                              ...c,
                                                              options: c.options?.filter(
                                                                (_, oi) => oi !== optI
                                                              ),
                                                            }
                                                          : c
                                                      ),
                                                    }
                                                  : item
                                              )
                                            )
                                          }
                                          title="Eliminar opción"
                                          className="text-slate-500 hover:text-rose-400 p-0.5 shrink-0"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 4. Editor Específico de Respuestas según el Tipo */}
          {(type === "multiple_choice" || type === "multiple_response" || type === "true_false") && (
            <section className="bg-slate-850 border border-slate-750 rounded-2xl p-4 space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  4. Opciones de Respuesta & Distribución
                </label>

                {/* Selector de Distribución de Opciones */}
                <div className="flex items-center gap-1 bg-slate-900 border border-slate-750 rounded-lg p-1 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setOptionLayout("grid-2")}
                    className={`flex items-center gap-1 px-2 py-1 rounded-md font-medium transition-colors ${
                      optionLayout === "grid-2"
                        ? "bg-sky-600 text-white"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                    title="2 Columnas (Cuadrícula)"
                  >
                    <LayoutGrid className="w-3 h-3" />
                    <span>2 Cols</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOptionLayout("vertical")}
                    className={`flex items-center gap-1 px-2 py-1 rounded-md font-medium transition-colors ${
                      optionLayout === "vertical"
                        ? "bg-sky-600 text-white"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                    title="Todas en Vertical (1 columna)"
                  >
                    <Rows className="w-3 h-3" />
                    <span>Vertical</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOptionLayout("horizontal")}
                    className={`flex items-center gap-1 px-2 py-1 rounded-md font-medium transition-colors ${
                      optionLayout === "horizontal"
                        ? "bg-sky-600 text-white"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                    title="Todas en Horizontal (fila)"
                  >
                    <Columns className="w-3 h-3" />
                    <span>Horizontal</span>
                  </button>
                </div>
              </div>

              {type === "true_false" && (
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer bg-slate-900/70 p-2.5 rounded-xl border border-slate-750">
                  <input
                    type="checkbox"
                    checked={requireJustification}
                    onChange={(e) => setRequireJustification(e.target.checked)}
                    className="rounded border-slate-600 bg-slate-800 text-sky-500"
                  />
                  <span>Incluir espacio para que el estudiante justifique su respuesta</span>
                </label>
              )}

              <div className="space-y-2.5">
                {options.map((opt, idx) => {
                  const optImgSrc = opt.image
                    ? opt.image.startsWith("imagenes/") || opt.image.startsWith("images/")
                      ? getImageSync(opt.image) || opt.image
                      : opt.image
                    : null;

                  return (
                    <div
                      key={opt.id || idx}
                      className={`p-2.5 rounded-xl border transition-all space-y-2 ${
                        opt.isCorrect
                          ? "bg-emerald-950/20 border-emerald-600/50"
                          : "bg-slate-900/80 border-slate-750"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleOptionCorrect(idx)}
                          title={opt.isCorrect ? "Marcada como correcta" : "Marcar como correcta"}
                          className={`shrink-0 ${
                            opt.isCorrect ? "text-emerald-400" : "text-slate-500 hover:text-slate-300"
                          }`}
                        >
                          {opt.isCorrect ? (
                            <CheckCircle2 className="w-5 h-5" />
                          ) : (
                            <Circle className="w-5 h-5" />
                          )}
                        </button>

                        <span className="text-xs font-bold text-slate-400 w-5 font-mono">
                          {optionLabels[idx]}.
                        </span>

                        <input
                          type="text"
                          value={opt.text}
                          onChange={(e) => handleOptionChange(idx, e.target.value)}
                          onPaste={(e) => handleOptionPaste(idx, e)}
                          placeholder={`Opción ${optionLabels[idx]} (puedes pegar una imagen aquí)...`}
                          className="flex-1 rounded-lg px-2.5 py-1.5 text-xs bg-slate-900 border border-slate-700 text-slate-100"
                        />

                        {/* Fórmula rápida en opción */}
                        <button
                          type="button"
                          onClick={() => setMathTarget({ kind: "option", optIndex: idx })}
                          title="Insertar fórmula en esta opción"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 text-sky-400"
                        >
                          <Sigma className="w-3.5 h-3.5" />
                        </button>

                        {/* Subir imagen a esta opción */}
                        <input
                          ref={(el) => {
                            optionFileRefs.current[idx] = el;
                          }}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleOptionImageUpload(idx, f);
                            e.target.value = "";
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => optionFileRefs.current[idx]?.click()}
                          title="Añadir imagen a esta opción"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 text-emerald-400"
                        >
                          <ImageIcon className="w-3.5 h-3.5" />
                        </button>

                        {type !== "true_false" && options.length > 2 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveOption(idx)}
                            title="Eliminar opción"
                            className="p-1.5 text-slate-400 hover:text-rose-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Miniatura de la imagen en la opción si existe */}
                      {optImgSrc && (
                        <div className="flex items-center gap-3 pl-7 pt-1">
                          <div className="w-14 h-14 rounded-lg overflow-hidden bg-slate-950 border border-slate-700 shrink-0 flex items-center justify-center">
                            <img src={optImgSrc} alt={`Opción ${optionLabels[idx]}`} className="w-full h-full object-contain" />
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px]">
                            <span className="text-slate-400">Ancho:</span>
                            {[40, 60, 80, 100].map((w) => (
                              <button
                                key={w}
                                type="button"
                                onClick={() =>
                                  setOptions((prev) =>
                                    prev.map((o, i) => (i === idx ? { ...o, imageWidth: w } : o))
                                  )
                                }
                                className={`px-1.5 py-0.5 rounded font-semibold ${
                                  (opt.imageWidth || 80) === w
                                    ? "bg-sky-600 text-white"
                                    : "bg-slate-800 text-slate-400"
                                }`}
                              >
                                {w}%
                              </button>
                            ))}
                            <button
                              type="button"
                              onClick={() =>
                                setOptions((prev) =>
                                  prev.map((o, i) => (i === idx ? { ...o, image: undefined } : o))
                                )
                              }
                              className="ml-2 text-rose-400 hover:underline"
                            >
                              Quitar imagen
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {type !== "true_false" && options.length < 6 && (
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="flex items-center gap-1.5 text-xs font-semibold text-sky-400 hover:text-sky-300"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Añadir otra opción</span>
                </button>
              )}
            </section>
          )}

          {/* Editor de Emparejamiento / Relación de Columnas */}
          {type === "matching" && (
            <section className="bg-slate-850 border border-slate-750 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  4. Pares para Conectar (Columna A ↔ Columna B)
                </label>
                <button
                  type="button"
                  onClick={addMatchingPair}
                  className="flex items-center gap-1 text-xs font-semibold text-sky-400 hover:text-sky-300"
                >
                  <Plus className="w-3.5 h-3.5" /> Añadir par
                </button>
              </div>
              <div className="space-y-2">
                {matchingPairs.map((pair, idx) => (
                  <div key={pair.id} className="flex items-center gap-2 text-xs">
                    <span className="font-mono font-bold text-slate-400 w-5">{idx + 1}.</span>
                    <input
                      type="text"
                      value={pair.left}
                      onChange={(e) =>
                        setMatchingPairs((prev) =>
                          prev.map((p, i) => (i === idx ? { ...p, left: e.target.value } : p))
                        )
                      }
                      placeholder="Concepto / Premisa"
                      className="flex-1 rounded-lg px-2.5 py-1.5 bg-slate-900 border border-slate-700 text-slate-100"
                    />
                    <span className="text-sky-400 font-bold">↔</span>
                    <input
                      type="text"
                      value={pair.right}
                      onChange={(e) =>
                        setMatchingPairs((prev) =>
                          prev.map((p, i) => (i === idx ? { ...p, right: e.target.value } : p))
                        )
                      }
                      placeholder="Definición / Pareja correcta"
                      className="flex-1 rounded-lg px-2.5 py-1.5 bg-slate-900 border border-slate-700 text-slate-100"
                    />
                    {matchingPairs.length > 2 && (
                      <button
                        type="button"
                        onClick={() =>
                          setMatchingPairs((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="p-1 text-slate-400 hover:text-rose-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Distractores opcionales */}
              <div className="pt-2 border-t border-slate-750 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">
                    Distractores extra en Columna B (evita que acierten la última por descarte):
                  </span>
                  <button
                    type="button"
                    onClick={() => setMatchingDistractors((prev) => [...prev, ""])}
                    className="text-sky-400 hover:text-sky-300 font-semibold"
                  >
                    + Distractor
                  </button>
                </div>
                {matchingDistractors.map((dist, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs">
                    <input
                      type="text"
                      value={dist}
                      onChange={(e) =>
                        setMatchingDistractors((prev) =>
                          prev.map((d, i) => (i === idx ? e.target.value : d))
                        )
                      }
                      placeholder={`Distractor extra ${idx + 1}`}
                      className="flex-1 rounded-lg px-2.5 py-1.5 bg-slate-900 border border-slate-700 text-slate-100"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setMatchingDistractors((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="p-1 text-slate-400 hover:text-rose-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Editor de Ordenamiento / Secuenciación */}
          {type === "ordering" && (
            <section className="bg-slate-850 border border-slate-750 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  4. Pasos en el Orden Correcto
                </label>
                <button
                  type="button"
                  onClick={addOrderingItem}
                  className="flex items-center gap-1 text-xs font-semibold text-sky-400 hover:text-sky-300"
                >
                  <Plus className="w-3.5 h-3.5" /> Añadir paso
                </button>
              </div>
              <div className="space-y-2">
                {orderingItems.map((item, idx) => (
                  <div key={item.id} className="flex items-center gap-2 text-xs">
                    <span className="font-mono font-bold text-sky-400 w-6 text-center bg-sky-500/10 rounded py-1 border border-sky-500/30">
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      value={item.text}
                      onChange={(e) =>
                        setOrderingItems((prev) =>
                          prev.map((o, i) => (i === idx ? { ...o, text: e.target.value } : o))
                        )
                      }
                      placeholder={`Paso o etapa #${idx + 1}`}
                      className="flex-1 rounded-lg px-2.5 py-1.5 bg-slate-900 border border-slate-700 text-slate-100"
                    />
                    <button
                      type="button"
                      onClick={() => moveOrderingItem(idx, -1)}
                      disabled={idx === 0}
                      className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveOrderingItem(idx, 1)}
                      disabled={idx === orderingItems.length - 1}
                      className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    {orderingItems.length > 2 && (
                      <button
                        type="button"
                        onClick={() =>
                          setOrderingItems((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="p-1 text-slate-400 hover:text-rose-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Editor de Respuesta Numérica */}
          {type === "numeric" && (
            <section className="bg-slate-850 border border-slate-750 rounded-2xl p-4 space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                4. Respuesta Numérica Esperada
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Valor exacto:</label>
                  <input
                    type="text"
                    value={numericAnswer}
                    onChange={(e) => setNumericAnswer(e.target.value)}
                    placeholder="Ej: 9.81"
                    className="w-full rounded-lg px-2.5 py-1.5 bg-slate-900 border border-slate-700 text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Unidad (opcional):</label>
                  <input
                    type="text"
                    value={numericUnit}
                    onChange={(e) => setNumericUnit(e.target.value)}
                    placeholder="Ej: m/s², N, kg"
                    className="w-full rounded-lg px-2.5 py-1.5 bg-slate-900 border border-slate-700 text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Tolerancia (opcional):</label>
                  <input
                    type="text"
                    value={numericTolerance}
                    onChange={(e) => setNumericTolerance(e.target.value)}
                    placeholder="Ej: ± 0.05"
                    className="w-full rounded-lg px-2.5 py-1.5 bg-slate-900 border border-slate-700 text-slate-100"
                  />
                </div>
              </div>
            </section>
          )}

          {/* Editor de Respuesta Abierta */}
          {type === "open" && (
            <section className="bg-slate-850 border border-slate-750 rounded-2xl p-4 space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                4. Configuración de Respuesta Abierta / Desarrollo
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Enfoque pedagógico:</label>
                  <select
                    value={openSubtype}
                    onChange={(e) => setOpenSubtype(e.target.value as OpenSubtype)}
                    className="w-full rounded-lg px-2.5 py-1.5 bg-slate-900 border border-slate-700 text-slate-100"
                  >
                    <option value="step_by_step">Resolución de problemas paso a paso</option>
                    <option value="error_detection">Detección y corrección de errores</option>
                    <option value="comparison">Comparación y contraste</option>
                    <option value="hypothetical">Pregunta hipotética ("¿Qué pasaría si...?")</option>
                    <option value="essay">Ensayo corto o argumentación</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Altura del cuadro en examen impreso:</label>
                  <select
                    value={openResponseHeight}
                    onChange={(e) => setOpenResponseHeight(Number(e.target.value))}
                    className="w-full rounded-lg px-2.5 py-1.5 bg-slate-900 border border-slate-700 text-slate-100"
                  >
                    <option value={2.5}>2.5 cm (Corta - 4 líneas)</option>
                    <option value={3.5}>3.5 cm (Estándar - 6 líneas)</option>
                    <option value={4.5}>4.5 cm (Media - 8 líneas)</option>
                    <option value={6.0}>6.0 cm (Amplia - 12 líneas)</option>
                    <option value={8.0}>8.0 cm (Media página)</option>
                  </select>
                </div>
              </div>
            </section>
          )}

          {/* 5. Explicación / Solucionario */}
          <section className="bg-slate-850 border border-slate-750 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                5. Solución / Rúbrica / Justificación (Opcional)
              </label>
              <button
                type="button"
                onClick={() => setMathTarget({ kind: "explanation" })}
                className="flex items-center gap-1 text-[11px] font-semibold text-sky-400 hover:text-sky-300"
              >
                <Sigma className="w-3 h-3" /> Insertar Fórmula
              </button>
            </div>
            <textarea
              rows={2}
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Se mostrará únicamente en el Modo Solucionario..."
              className="w-full rounded-xl p-2.5 text-xs bg-slate-900 border border-slate-700 text-slate-100"
            />
          </section>
        </form>

        {/* PANEL DERECHO: Vista Previa Real en Vivo */}
        <div className="w-full lg:w-[44%] h-full overflow-y-auto p-6 bg-slate-950/50 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-750 pb-2.5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-400">
              <Eye className="w-4 h-4" />
              <span>Vista Previa en Vivo (Cómo la verá el estudiante)</span>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
              {QUESTION_TYPE_LABELS[type]}
            </span>
          </div>

          <div
            className={`rounded-2xl p-5 border space-y-4 ${
              type === "stimulus"
                ? "bg-amber-500/5 border-amber-500/40"
                : "bg-slate-850 border-slate-750"
            }`}
          >
            {type === "stimulus" && (
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-amber-500/30">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wide">
                  {stimulusTitle || "Contexto Compartido"}
                </span>
                {stimulusRangeNote && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    {stimulusRangeNote}
                  </span>
                )}
              </div>
            )}

            {/* Enunciado renderizado */}
            <div
              className="prose prose-sm max-w-none text-xs leading-relaxed text-slate-100 break-words [&>p]:mb-2"
              dangerouslySetInnerHTML={{ __html: renderedPromptPreview }}
            />

            {/* Videos */}
            <VideoEmbedList videos={videos} />

            {/* Opciones de respuesta */}
            {(type === "multiple_choice" || type === "multiple_response" || type === "true_false") && (
              <div className="space-y-3">
                <div className={layoutGridClass}>
                  {options.map((opt, idx) => {
                    const renderedOpt = renderMarkdownWithMath(opt.text || `Opción ${optionLabels[idx]}`);
                    const optImg = opt.image
                      ? opt.image.startsWith("imagenes/") || opt.image.startsWith("images/")
                        ? getImageSync(opt.image) || opt.image
                        : opt.image
                      : null;
                    return (
                      <div
                        key={opt.id || idx}
                        className={`p-2.5 rounded-xl border text-xs flex flex-col gap-1.5 ${
                          opt.isCorrect
                            ? "bg-emerald-950/25 border-emerald-700/50 text-emerald-200"
                            : "bg-slate-900 border-slate-750 text-slate-200"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <span className="font-bold font-mono text-slate-400 shrink-0">
                            {optionLabels[idx]}.
                          </span>
                          <div
                            className="flex-1 break-words [&>p]:inline"
                            dangerouslySetInnerHTML={{ __html: renderedOpt }}
                          />
                        </div>
                        {optImg && (
                          <img
                            src={optImg}
                            alt={`Opción ${optionLabels[idx]}`}
                            style={{ maxWidth: `${opt.imageWidth || 80}%` }}
                            className="rounded-lg mx-auto border border-slate-700"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
                {type === "true_false" && requireJustification && (
                  <div className="p-3 rounded-lg border border-slate-700 border-l-[3.5px] border-l-amber-500 bg-slate-900/60 text-[11px] text-slate-400 italic">
                    Justifique su respuesta: ____________________________________________
                  </div>
                )}
              </div>
            )}

            {/* Vista previa Emparejamiento */}
            {type === "matching" && (
              <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-750">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-stretch text-xs">
                  <div className="flex flex-col h-full">
                    <div className="font-bold text-slate-400 uppercase text-[10px] tracking-wider mb-2 text-center">
                      Columna A (Premisas)
                    </div>
                    <div className="flex-1 flex flex-col justify-evenly gap-2">
                      {matchingPairs.map((p, i) => (
                        <div
                          key={p.id}
                          className="p-2.5 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-between gap-2"
                        >
                          <span className="flex-1">
                            <strong className="text-sky-400 font-mono mr-1.5">{i + 1}.</strong>
                            {p.left || `Premisa ${i + 1}`}
                          </span>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-slate-400 font-mono bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                              [ &nbsp; ]
                            </span>
                            <span className="w-2 h-2 rounded-full bg-sky-400/70 hidden sm:inline-block" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col h-full">
                    <div className="font-bold text-slate-400 uppercase text-[10px] tracking-wider mb-2 text-center">
                      Columna B (Respuestas)
                    </div>
                    <div className="flex-1 flex flex-col justify-evenly gap-2">
                      {buildShuffledMatchingOrder(matchingPairs, matchingDistractors).map((itemB, i) => (
                        <div
                          key={i}
                          className="p-2.5 rounded-lg bg-slate-900 border border-slate-700 flex items-center gap-2"
                        >
                          <span className="w-2 h-2 rounded-full bg-amber-400/70 shrink-0 hidden sm:inline-block" />
                          <span className="flex-1">
                            <strong className="text-amber-400 font-mono mr-1.5">
                              {String.fromCharCode(65 + i)}.
                            </strong>
                            {itemB.text || `Opción ${String.fromCharCode(65 + i)}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Vista previa Ordenamiento */}
            {type === "ordering" && (
              <div className="space-y-2 text-xs">
                {orderingItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-lg bg-slate-900 border border-slate-750 flex items-center gap-3"
                  >
                    <span className="w-6 h-6 rounded bg-slate-800 border border-slate-700 text-center leading-6 font-mono text-slate-400">
                      &nbsp;
                    </span>
                    <span className="flex-1 text-slate-200">{item.text || `Paso ${idx + 1}`}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Vista previa Respuesta Numérica */}
            {type === "numeric" && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-900 border border-slate-750 text-xs">
                <span className="text-slate-400 font-semibold">Respuesta:</span>
                <div className="w-36 h-8 rounded-lg border-b-2 border-sky-500 bg-slate-850 flex items-center justify-center font-mono text-emerald-400">
                  {numericAnswer || "________"}
                </div>
                {numericUnit && (
                  <span className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-200 font-semibold">
                    {numericUnit}
                  </span>
                )}
              </div>
            )}

            {/* Vista previa Abierta */}
            {type === "open" && (
              <div
                style={{ height: `${openResponseHeight * 24}px`, minHeight: "64px" }}
                className="p-3 rounded-lg bg-slate-900/80 border border-slate-700 border-l-[3.5px] border-l-amber-500 text-[11px] text-slate-400 italic"
              >
                [Espacio de respuesta ({openResponseHeight} cm)]
              </div>
            )}

            {/* Solucionario */}
            {renderedExplanationPreview && (
              <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-800/40 text-xs text-emerald-200">
                <strong className="text-emerald-400 block mb-1">Solución / Justificación:</strong>
                <div dangerouslySetInnerHTML={{ __html: renderedExplanationPreview }} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modales internos: Constructor de Fórmulas y Constructor de Tablas */}
      <MathBuilderModal
        isOpen={mathTarget !== null}
        onClose={() => setMathTarget(null)}
        initialLatex={mathTarget?.editFormula?.latex || ""}
        initialBlockMode={mathTarget?.editFormula?.isBlock || false}
        onInsert={(wrapped) => {
          if (!mathTarget) return;
          if (mathTarget.kind === "edit_formula" && mathTarget.editFormula) {
            setPrompt((prev) => prev.replace(mathTarget.editFormula!.fullMatch, wrapped.trim()));
          } else if (mathTarget.kind === "prompt") {
            insertIntoPrompt(wrapped);
          } else if (mathTarget.kind === "explanation") {
            setExplanation((prev) => (prev ? `${prev} ${wrapped}` : wrapped));
          } else if (mathTarget.kind === "option" && mathTarget.optIndex !== undefined) {
            const idx = mathTarget.optIndex;
            setOptions((prev) =>
              prev.map((o, i) => (i === idx ? { ...o, text: o.text ? `${o.text} ${wrapped}` : wrapped } : o))
            );
          }
        }}
      />

      <TableBuilderModal
        isOpen={tableModalState.isOpen}
        onClose={() => setTableModalState({ isOpen: false, editTable: null })}
        initialCells={tableModalState.editTable?.cells || null}
        onInsert={(mdTable) => {
          if (tableModalState.editTable) {
            setPrompt((prev) =>
              prev.replace(tableModalState.editTable!.fullMatch, mdTable.trim())
            );
          } else {
            insertIntoPrompt(mdTable);
          }
        }}
      />
    </div>
  );
};
