import React, { useState, useEffect } from "react";
import { Question } from "../types/quiz";
import {
  getAllStoredImages,
  deleteImage,
  getDataFolderPath,
  openDataFolderInOS,
} from "../utils/imageStore";
import {
  TEMAS_INFO,
  ESCALAS_UI,
  TemaVisual,
} from "../utils/theme";
import {
  X,
  Settings,
  Image as ImageIcon,
  Trash2,
  FolderOpen,
  Maximize2,
  Palette,
  Upload,
  Download,
  Check,
  AlertTriangle,
  Info,
} from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  questions: Question[];
  uiScale: number;
  onScaleChange: (newScale: number) => void;
  temaVisual: TemaVisual;
  onThemeChange: (newTheme: TemaVisual) => void;
  pageSize: number;
  onPageSizeChange: (newPageSize: number) => void;
  onOpenImport: () => void;
  onOpenExport: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  questions,
  uiScale,
  onScaleChange,
  temaVisual,
  onThemeChange,
  pageSize,
  onPageSizeChange,
  onOpenImport,
  onOpenExport,
}) => {
  const [activeTab, setActiveTab] = useState<"general" | "images">("general");
  const [images, setImages] = useState<{ name: string; dataUrl: string }[]>([]);
  const [storagePath, setStoragePath] = useState<string>("");
  const [selectedImageToDelete, setSelectedImageToDelete] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadImagesList();
      getDataFolderPath().then(setStoragePath);
      setSelectedImageToDelete(null);
      setNotice(null);
    }
  }, [isOpen]);

  const loadImagesList = async () => {
    const list = await getAllStoredImages();
    setImages(list);
  };

  if (!isOpen) return null;

  // Analizar a qué preguntas está vinculada cada imagen
  const getImageLinks = (imageName: string) => {
    const clean = imageName.replace(/^(imagenes\/|images\/)/, "");
    return questions.filter((q) => {
      const qText = q.prompt + " " + (q.explanation || "") + " " + q.options.map((o) => o.text).join(" ");
      return (
        qText.includes(clean) ||
        qText.includes(`imagenes/${clean}`) ||
        qText.includes(`images/${clean}`)
      );
    });
  };

  const handleDeleteImage = async (imageName: string) => {
    await deleteImage(imageName);
    await loadImagesList();
    setSelectedImageToDelete(null);
    setNotice(`Imagen "${imageName}" eliminada del banco de datos.`);
    setTimeout(() => setNotice(null), 3500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-850 border border-slate-700 w-full max-w-4xl max-h-[88vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in duration-150">
        {/* Cabecera del modal */}
        <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between shrink-0 bg-slate-900/50">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center shadow-sm">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Opciones & Configuración
              </h2>
              <p className="text-xs text-slate-400">
                Personaliza la apariencia, temas ergonómicos, escala de interfaz y archivos
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-750 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pestañas */}
        <div className="px-6 pt-3 flex items-center space-x-2 border-b border-slate-750 bg-slate-900/60">
          <button
            onClick={() => setActiveTab("general")}
            className={`pb-2.5 px-3.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "general"
                ? "border-sky-500 text-sky-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>General & Apariencia</span>
          </button>
          <button
            onClick={() => setActiveTab("images")}
            className={`pb-2.5 px-3.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "images"
                ? "border-sky-500 text-sky-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Gestor de Imágenes del Banco ({images.length})</span>
          </button>
        </div>

        {/* Notificación temporal */}
        {notice && (
          <div className="mx-6 mt-4 p-3 bg-emerald-950/50 border border-emerald-800/60 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{notice}</span>
          </div>
        )}

        {/* Contenido según pestaña */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          {activeTab === "general" ? (
            <div className="space-y-6">
              {/* Sección 1: Tema Visual y Escala de Interfaz */}
              <div className="bg-slate-900/60 border border-slate-700/80 rounded-2xl p-4 sm:p-5 space-y-5">
                <div className="flex items-center gap-2 border-b border-slate-750/70 pb-3">
                  <Palette className="w-4 h-4 text-sky-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Tema Visual y Escala de Interfaz
                  </h3>
                </div>

                {/* Selector de Temas Ergonómicos */}
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <label className="text-xs font-semibold text-slate-300 block">
                      Temas de Color Ergonómicos (Bajo Cansancio Visual):
                    </label>
                    <span className="text-[11px] text-slate-400">
                      Selecciona tu paleta favorita
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {TEMAS_INFO.map((t) => {
                      const seleccionado = temaVisual === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => onThemeChange(t.id)}
                          className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                            seleccionado
                              ? "bg-sky-500/15 border-sky-500 ring-2 ring-sky-500/30 shadow-md"
                              : "bg-slate-800/80 border-slate-700 hover:border-slate-500 hover:bg-slate-800"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2.5">
                              {/* Paleta de colores muestra */}
                              <div className="flex items-center -space-x-1">
                                <span
                                  className="w-4 h-4 rounded-full border border-black/40 shadow-sm"
                                  style={{ backgroundColor: t.previewBg }}
                                  title="Fondo principal"
                                />
                                <span
                                  className="w-4 h-4 rounded-full border border-black/40 shadow-sm"
                                  style={{ backgroundColor: t.previewCard }}
                                  title="Superficie de tarjetas"
                                />
                                <span
                                  className="w-4 h-4 rounded-full border border-white/40 shadow-sm"
                                  style={{ backgroundColor: t.previewAccent }}
                                  title="Acentos y botones"
                                />
                              </div>
                              <span
                                className={`text-xs font-bold ${
                                  seleccionado ? "text-sky-300" : "text-slate-200"
                                }`}
                              >
                                {t.nombre}
                              </span>
                            </div>
                            {seleccionado && (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-sky-400 bg-sky-500/20 px-2 py-0.5 rounded-full border border-sky-500/30">
                                <Check className="w-3 h-3" /> Activo
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 leading-snug">
                            {t.descripcion}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Selector de Escala de UI Vectorial */}
                <div className="pt-4 border-t border-slate-750/70">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <Maximize2 className="w-3.5 h-3.5 text-sky-400" />
                      <label className="text-xs font-semibold text-slate-300">
                        Escala de UI (Tamaño global de la interfaz sin zoom):
                      </label>
                    </div>
                    <span className="text-[11px] font-bold text-sky-400 bg-sky-500/15 border border-sky-500/30 px-2 py-0.5 rounded-md">
                      x{uiScale} ({ESCALAS_UI.find((e) => e.factor === uiScale)?.desc || "Personalizada"})
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mb-3">
                    Escala matemáticamente las fuentes, botones, campos y planillas de forma vectorial y nítida.
                  </p>
                  <div className="grid grid-cols-5 gap-2">
                    {ESCALAS_UI.map((e) => {
                      const activo = uiScale === e.factor;
                      return (
                        <button
                          key={e.factor}
                          type="button"
                          onClick={() => onScaleChange(e.factor)}
                          className={`py-2 px-1.5 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center ${
                            activo
                              ? "bg-sky-600 text-white shadow-md ring-2 ring-sky-400/40"
                              : "bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-750 hover:text-white"
                          }`}
                        >
                          <span className="text-sm">{e.label}</span>
                          <span
                            className={`text-[10px] font-normal ${
                              activo ? "text-sky-100" : "text-slate-400"
                            }`}
                          >
                            {e.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Preguntas por página */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-750/70">
                  <div>
                    <span className="text-xs font-semibold text-slate-200 block">
                      Cantidad de Preguntas por Página
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Paginación del banco en el panel izquierdo (20, 50 o 100 por vista)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {[20, 50, 100].map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => onPageSizeChange(size)}
                        className={`text-xs px-3.5 py-1.5 rounded-lg border font-medium transition-all ${
                          pageSize === size
                            ? "bg-sky-600 border-sky-500 text-white shadow-sm font-bold"
                            : "bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600"
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sección 2: Carpeta de Almacenamiento */}
              <div className="bg-slate-900/60 border border-slate-700/80 rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Ubicación de Datos en Disco
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Carpeta nativa donde BPMIM almacena las imágenes y caché local
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openDataFolderInOS()}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-sky-400 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 rounded-lg transition-colors"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>Abrir en Explorador</span>
                  </button>
                </div>
                <div className="p-2.5 bg-slate-950 border border-slate-750 rounded-lg text-xs font-mono text-slate-300 break-all select-all">
                  {storagePath || "Cargando ruta..."}
                </div>
              </div>

              {/* Sección 3: Respaldo e Importación */}
              <div className="bg-slate-900/60 border border-slate-700/80 rounded-2xl p-4 sm:p-5 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Gestión del Banco de Preguntas
                </h3>
                <p className="text-xs text-slate-400">
                  Exporta una copia de seguridad o incorpora preguntas existentes desde tus archivos.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenExport();
                    }}
                    className="flex items-center justify-between p-3.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-emerald-500/50 rounded-xl transition-all group text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
                        <Download className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-slate-100 block">
                          Respaldar Banco
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Descargar archivo JSON con preguntas
                        </span>
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenImport();
                    }}
                    className="flex items-center justify-between p-3.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-sky-500/50 rounded-xl transition-all group text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-sky-600/20 text-sky-400 flex items-center justify-center">
                        <Upload className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-slate-100 block">
                          Importar Banco
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Cargar preguntas desde archivo o texto
                        </span>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Pestaña: Gestor de Imágenes */
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>
                  Total de imágenes almacenadas: <strong>{images.length}</strong>
                </span>
                <span className="text-[11px] text-slate-500">
                  Puedes borrar imágenes que ya no utilices para liberar espacio
                </span>
              </div>

              {images.length === 0 ? (
                <div className="p-12 text-center bg-slate-900/40 border border-dashed border-slate-750 rounded-2xl">
                  <ImageIcon className="w-12 h-12 text-slate-600 mx-auto mb-3 stroke-1" />
                  <p className="text-sm font-medium text-slate-300">
                    No hay imágenes almacenadas en el banco
                  </p>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Cuando pegues o insertes imágenes en las preguntas, aparecerán listadas aquí con su vinculación.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {images.map((img) => {
                    const linkedQuestions = getImageLinks(img.name);
                    const isLinked = linkedQuestions.length > 0;

                    return (
                      <div
                        key={img.name}
                        className="p-3.5 bg-slate-900 border border-slate-750 rounded-xl flex items-start gap-3.5 hover:border-slate-600 transition-colors"
                      >
                        {/* Miniatura */}
                        <div className="w-20 h-20 bg-slate-950 border border-slate-700 rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
                          <img
                            src={img.dataUrl}
                            alt={img.name}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        {/* Detalles */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between h-full">
                          <div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-mono font-medium text-slate-200 truncate" title={img.name}>
                                {img.name}
                              </span>
                              <button
                                type="button"
                                onClick={() => setSelectedImageToDelete(img.name)}
                                className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded transition-colors"
                                title="Borrar esta imagen del banco de datos"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Vinculación */}
                            <div className="mt-1.5">
                              {isLinked ? (
                                <div className="space-y-1">
                                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-950/70 border border-emerald-800/60 text-emerald-400 inline-flex items-center gap-1">
                                    <Check className="w-2.5 h-2.5" />
                                    Vinculada a {linkedQuestions.length}{" "}
                                    {linkedQuestions.length === 1 ? "pregunta" : "preguntas"}
                                  </span>
                                  <p className="text-[10px] text-slate-400 line-clamp-2 mt-0.5">
                                    {linkedQuestions.map((q) => q.prompt.slice(0, 40) + "...").join(", ")}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-950/70 border border-amber-800/60 text-amber-400 inline-flex items-center gap-1">
                                  <Info className="w-2.5 h-2.5" />
                                  Huérfana (Sin vincular a ninguna pregunta)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal de confirmación para eliminar imagen */}
        {selectedImageToDelete && (
          <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4">
            <div className="bg-slate-850 border border-rose-900/60 max-w-md w-full rounded-2xl p-6 space-y-4 shadow-2xl animate-in fade-in">
              <div className="flex items-center gap-3 text-rose-400">
                <AlertTriangle className="w-6 h-6" />
                <h3 className="text-base font-bold text-slate-100">
                  ¿Eliminar imagen del banco?
                </h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Esta acción eliminará el archivo <strong className="text-white font-mono">{selectedImageToDelete}</strong> permanentemente del almacenamiento de datos y del disco.
              </p>
              {getImageLinks(selectedImageToDelete).length > 0 && (
                <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-xl text-xs text-amber-300">
                  ⚠️ Atención: Esta imagen está actualmente vinculada a{" "}
                  <strong>{getImageLinks(selectedImageToDelete).length} pregunta(s)</strong>. Si la borras, en dichas preguntas dejará de mostrarse.
                </div>
              )}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedImageToDelete(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteImage(selectedImageToDelete)}
                  className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-sm"
                >
                  Sí, eliminar imagen
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Pie del modal */}
        <div className="px-6 py-3.5 bg-slate-850 border-t border-slate-700 flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
