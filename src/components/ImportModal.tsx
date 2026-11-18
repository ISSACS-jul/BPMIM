import React, { useState } from "react";
import { Question } from "../types/quiz";
import { extractBankZip } from "../utils/zipHandler";
import { X, Upload, FileText, Check, AlertCircle, PlusCircle, RefreshCw, Archive } from "lucide-react";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (questions: Question[], mode: "append" | "replace") => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
}) => {
  const [tab, setTab] = useState<"file" | "paste">("file");
  const [rawJson, setRawJson] = useState("");
  const [parsedQuestions, setParsedQuestions] = useState<Question[] | null>(null);
  const [fileDetails, setFileDetails] = useState<{ name: string; sizeKB: string; format: string } | null>(null);
  const [importedImagesCount, setImportedImagesCount] = useState<number>(0);
  const [importMode, setImportMode] = useState<"append" | "replace">("append");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  if (!isOpen) return null;

  const validateAndParseJson = (text: string, fileInfo?: { name: string; size: number }) => {
    try {
      setErrorMsg(null);
      const parsed = JSON.parse(text);
      let list: Question[] = [];

      if (Array.isArray(parsed)) {
        list = parsed;
      } else if (parsed && Array.isArray(parsed.questions)) {
        list = parsed.questions;
      } else {
        throw new Error("El archivo no contiene una lista de preguntas válida.");
      }

      if (list.length === 0) {
        throw new Error("El archivo contiene una lista vacía de preguntas.");
      }

      setParsedQuestions(list);
      setImportedImagesCount(0);

      if (fileInfo) {
        setFileDetails({
          name: fileInfo.name,
          sizeKB: (fileInfo.size / 1024).toFixed(1),
          format: "JSON (Solo texto)",
        });
      }
    } catch (e: any) {
      setParsedQuestions(null);
      setFileDetails(null);
      setErrorMsg(e.message || "Formato JSON inválido.");
    }
  };

  const processSelectedFile = async (file: File) => {
    setIsProcessing(true);
    setErrorMsg(null);
    setParsedQuestions(null);
    setFileDetails(null);

    const isZip =
      file.name.toLowerCase().endsWith(".zip") ||
      file.type.includes("zip");

    if (isZip) {
      try {
        const { questions, imagesCount } = await extractBankZip(file);
        setParsedQuestions(questions);
        setImportedImagesCount(imagesCount);
        setFileDetails({
          name: file.name,
          sizeKB: (file.size / 1024).toFixed(1),
          format: `ZIP (${imagesCount} imágenes adjuntas)`,
        });
      } catch (err: any) {
        console.error("Error al procesar archivo ZIP:", err);
        setErrorMsg(err.message || "No se pudo extraer el archivo ZIP.");
        setParsedQuestions(null);
        setFileDetails(null);
      } finally {
        setIsProcessing(false);
      }
    } else {
      // Archivo .json o similar
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setRawJson(content);
        validateAndParseJson(content, { name: file.name, size: file.size });
        setIsProcessing(false);
      };
      reader.onerror = () => {
        setErrorMsg("Error al leer el archivo seleccionado.");
        setIsProcessing(false);
      };
      reader.readAsText(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
    e.target.value = "";
  };

  // Soporte Drag and Drop nativo
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const handlePasteChange = (text: string) => {
    setRawJson(text);
    if (text.trim()) {
      validateAndParseJson(text);
      setFileDetails({
        name: "Texto pegado",
        sizeKB: (new Blob([text]).size / 1024).toFixed(1),
        format: "Texto directo",
      });
    } else {
      setParsedQuestions(null);
      setFileDetails(null);
      setErrorMsg(null);
    }
  };

  const handleConfirmImport = () => {
    if (!parsedQuestions || parsedQuestions.length === 0) return;
    onImport(parsedQuestions, importMode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-dark-850 border border-dark-700 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in duration-150">
        {/* Cabecera del modal */}
        <div className="px-6 py-4 border-b border-dark-700 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-brand-950/70 border border-brand-800/60 flex items-center justify-center text-brand-400">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Importar Banco de Preguntas</h2>
              <p className="text-xs text-slate-400">
                Arrastra o selecciona tu archivo de respaldo (.json o .zip con imágenes)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-dark-750 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pestañas de método */}
        <div className="px-6 pt-4 flex items-center space-x-2 border-b border-dark-750">
          <button
            onClick={() => setTab("file")}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              tab === "file"
                ? "border-brand-500 text-brand-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Archive className="w-3.5 h-3.5 text-emerald-400" />
            <span>Seleccionar o Arrastrar Archivo</span>
          </button>
          <button
            onClick={() => setTab("paste")}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              tab === "paste"
                ? "border-brand-500 text-brand-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Pegar Texto JSON Directo</span>
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6 space-y-4 flex-1 overflow-y-auto">
          {tab === "file" ? (
            <div>
              <label
                htmlFor="importFileInput"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  isDragging
                    ? "border-brand-400 bg-brand-950/40 scale-[1.01]"
                    : "border-dark-700 hover:border-brand-500 bg-dark-900/40 hover:bg-dark-900/70"
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-brand-600/10 text-brand-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-slate-200">
                  {isProcessing
                    ? "Procesando archivo..."
                    : isDragging
                    ? "¡Suelta tu archivo aquí!"
                    : "Haz clic para buscar o arrastra tu archivo aquí"}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Formatos admitidos: <strong>.json</strong> (texto) y <strong>.zip</strong> (banco completo con imágenes)
                </p>
                <input
                  id="importFileInput"
                  type="file"
                  accept=".json,.zip,application/json,application/zip,application/x-zip-compressed,text/plain"
                  onChange={handleFileInputChange}
                  className="hidden"
                  disabled={isProcessing}
                />
              </label>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300">
                Pega el código JSON de tu respaldo:
              </label>
              <textarea
                rows={6}
                value={rawJson}
                onChange={(e) => handlePasteChange(e.target.value)}
                placeholder='[ { "id": "...", "prompt": "...", "options": [...] } ]'
                className="w-full bg-dark-900 border border-dark-700 rounded-xl p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-brand-500"
              />
            </div>
          )}

          {/* Estado de error */}
          {errorMsg && (
            <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Tarjeta de Resumen con Detalles (Preguntas, Peso, Formato y Opciones) */}
          {parsedQuestions && (
            <div className="space-y-3 animate-in fade-in">
              {fileDetails && (
                <div className="bg-dark-900 border border-dark-750 rounded-xl p-3.5 grid grid-cols-3 gap-3 text-center">
                  <div>
                    <span className="block text-lg font-bold text-slate-100">
                      {parsedQuestions.length}
                    </span>
                    <span className="text-[11px] text-slate-400">Preguntas detectadas</span>
                  </div>
                  <div>
                    <span className="block text-lg font-bold text-brand-400">
                      {fileDetails.sizeKB} KB
                    </span>
                    <span className="text-[11px] text-slate-400">Peso del archivo</span>
                  </div>
                  <div>
                    <span className="block text-lg font-bold text-emerald-400 truncate px-1">
                      {fileDetails.format}
                    </span>
                    <span className="text-[11px] text-slate-400">Formato</span>
                  </div>
                </div>
              )}

              {/* Opciones de Integración al Banco */}
              <div className="p-4 bg-emerald-950/30 border border-emerald-800/50 rounded-xl space-y-3">
                <div className="flex items-center gap-2 font-semibold text-emerald-300 text-xs">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>¿Cómo deseas integrar estas preguntas a tu banco?</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <label
                    className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-2.5 ${
                      importMode === "append"
                        ? "bg-brand-950/60 border-brand-500 text-white"
                        : "bg-dark-900/80 border-dark-700 text-slate-300 hover:border-dark-600"
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      value="append"
                      checked={importMode === "append"}
                      onChange={() => setImportMode("append")}
                      className="mt-0.5 text-brand-500 bg-dark-900 border-dark-700"
                    />
                    <div>
                      <span className="text-xs font-semibold block flex items-center gap-1.5">
                        <PlusCircle className="w-3.5 h-3.5 text-brand-400" />
                        Añadir al banco actual
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5 block leading-tight">
                        Conserva tus preguntas actuales y agrega las nuevas sin duplicar por ID.
                      </span>
                    </div>
                  </label>

                  <label
                    className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-2.5 ${
                      importMode === "replace"
                        ? "bg-amber-950/60 border-amber-500 text-white"
                        : "bg-dark-900/80 border-dark-700 text-slate-300 hover:border-dark-600"
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      value="replace"
                      checked={importMode === "replace"}
                      onChange={() => setImportMode("replace")}
                      className="mt-0.5 text-amber-500 bg-dark-900 border-dark-700"
                    />
                    <div>
                      <span className="text-xs font-semibold block flex items-center gap-1.5 text-amber-300">
                        <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                        Reemplazar banco completo
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5 block leading-tight">
                        Sobrescribe el banco existente dejando únicamente las preguntas importadas.
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pie del modal */}
        <div className="px-6 py-3.5 bg-dark-850 border-t border-dark-700 flex items-center justify-between shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-dark-800 hover:bg-dark-750 border border-dark-700 rounded-lg transition-colors"
          >
            Cancelar
          </button>

          <button
            onClick={handleConfirmImport}
            disabled={!parsedQuestions || parsedQuestions.length === 0}
            className="px-5 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 rounded-lg shadow-sm transition-all hover:shadow-brand-500/20 active:scale-95 disabled:opacity-40"
          >
            {importMode === "append" ? "Añadir" : "Reemplazar con"}{" "}
            {parsedQuestions ? `${parsedQuestions.length} Preguntas` : ""}
          </button>
        </div>
      </div>
    </div>
  );
};
