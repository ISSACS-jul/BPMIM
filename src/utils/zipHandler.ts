import JSZip from "jszip";
import { Question, Quiz } from "../types/quiz";
import { getAllStoredImages, saveMultipleImages, dataUrlToBlob, fileToDataUrl } from "./imageStore";

/**
 * Empaqueta el banco de preguntas completo en un archivo .ZIP conteniendo:
 * - preguntas.json
 * - imagenes/ (todos los archivos de imagen adjuntos referenciados)
 */
export async function createBankZip(questions: Question[]): Promise<Blob> {
  const zip = new JSZip();

  // 1. Guardar el archivo JSON principal
  const jsonContent = JSON.stringify(questions, null, 2);
  zip.file("preguntas.json", jsonContent);

  // 2. Obtener todas las imágenes locales almacenadas
  const storedImages = await getAllStoredImages();

  // Detectar cuáles imágenes están realmente en uso en las preguntas
  const questionsText = JSON.stringify(questions);
  const imgFolder = zip.folder("imagenes");

  if (imgFolder) {
    for (const img of storedImages) {
      // Si la imagen está en el almacén, la adjuntamos si se menciona en el JSON
      // o si es un respaldo completo del usuario
      const isMentioned =
        questionsText.includes(img.name) ||
        questionsText.includes(`imagenes/${img.name}`) ||
        questionsText.includes(`images/${img.name}`);

      if (isMentioned || storedImages.length <= 50) {
        try {
          const blob = dataUrlToBlob(img.dataUrl);
          imgFolder.file(img.name, blob);
        } catch (e) {
          console.warn(`No se pudo agregar imagen ${img.name} al ZIP:`, e);
        }
      }
    }
  }

  return await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
}

/**
 * Desempaqueta un archivo ZIP del banco de preguntas:
 * - Extrae y valida preguntas.json
 * - Guarda todas las imágenes contenidas en la carpeta de imágenes en IndexedDB
 */
export async function extractBankZip(
  file: File | Blob
): Promise<{ questions: Question[]; imagesCount: number }> {
  const zip = await JSZip.loadAsync(file);

  // 1. Localizar el archivo JSON con las preguntas
  let jsonFile = zip.file("preguntas.json");
  if (!jsonFile) {
    // Buscar cualquier archivo .json en la raíz
    const jsonNames = Object.keys(zip.files).filter(
      (name) => name.endsWith(".json") && !name.includes("/")
    );
    if (jsonNames.length > 0) {
      jsonFile = zip.file(jsonNames[0]);
    }
  }

  if (!jsonFile) {
    throw new Error("El archivo ZIP no contiene ningún 'preguntas.json' válido.");
  }

  const jsonText = await jsonFile.async("string");
  const parsed = JSON.parse(jsonText);

  let questions: Question[] = [];
  if (Array.isArray(parsed)) {
    questions = parsed;
  } else if (parsed && Array.isArray(parsed.questions)) {
    questions = parsed.questions;
  } else {
    throw new Error("El archivo JSON del ZIP no contiene un arreglo de preguntas válido.");
  }

  // 2. Extraer y almacenar imágenes
  const imagesToStore: { name: string; dataUrl: string }[] = [];

  for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
    if (zipEntry.dir) continue;

    // Aceptar imágenes en imagenes/, images/ o cualquier extensión gráfica
    const isImage = /\.(png|jpe?g|webp|gif|svg)$/i.test(relativePath);
    if (isImage) {
      try {
        const blob = await zipEntry.async("blob");
        const dataUrl = await fileToDataUrl(blob);
        const fileName = relativePath.split("/").pop() || relativePath;
        imagesToStore.push({ name: fileName, dataUrl });
      } catch (err) {
        console.warn(`Error al extraer imagen ${relativePath}:`, err);
      }
    }
  }

  if (imagesToStore.length > 0) {
    await saveMultipleImages(imagesToStore);
  }

  return { questions, imagesCount: imagesToStore.length };
}

/**
 * Empaqueta un proyecto LaTeX completo para compilar en Overleaf o localmente:
 * - archivo .tex principal (ej: examen.tex o solucionario.tex)
 * - carpeta imagenes/ con todas las imágenes referenciadas en el examen
 */
export async function createLatexProjectZip(
  quiz: Quiz,
  latexCode: string,
  mode: "exam" | "solutions" = "exam"
): Promise<Blob> {
  const zip = new JSZip();

  const texFilename = mode === "solutions" ? "solucionario.tex" : "examen.tex";
  zip.file(texFilename, latexCode);

  // Buscar todas las imágenes vinculadas a las preguntas de este examen
  const quizQuestions = quiz.items.map((it) => it.question);
  const quizText = JSON.stringify(quizQuestions);

  const storedImages = await getAllStoredImages();
  const imgFolder = zip.folder("imagenes");

  if (imgFolder) {
    for (const img of storedImages) {
      const isReferenced =
        quizText.includes(img.name) ||
        quizText.includes(`imagenes/${img.name}`) ||
        quizText.includes(`images/${img.name}`) ||
        latexCode.includes(img.name);

      if (isReferenced) {
        try {
          const blob = dataUrlToBlob(img.dataUrl);
          imgFolder.file(img.name, blob);
        } catch (e) {
          console.warn(`No se pudo incluir imagen ${img.name} en el proyecto LaTeX:`, e);
        }
      }
    }
  }

  return await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
}
