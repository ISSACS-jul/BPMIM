import { saveImage, fileToDataUrl } from "./imageStore";
import { buildImageMarkdown } from "./imageSize";

/**
 * Procesa un archivo de imagen, lo guarda en el almacén de BPMIM (disco + indexedDB)
 * y devuelve la etiqueta Markdown con el tamaño seleccionado: ![alt|50%](imagenes/archivo.png)
 */
export async function processAndSaveImage(
  file: File | Blob,
  customName?: string,
  widthPercent: number = 50
): Promise<{ markdownTag: string; path: string }> {
  const dataUrl = await fileToDataUrl(file);
  const ext = (file as File).name?.split(".").pop() || "png";
  const timestamp = Date.now();
  const filename = customName
    ? `${customName}.${ext}`
    : `img_${timestamp}.${ext}`;

  const relativePath = await saveImage(filename, dataUrl);
  const altText = `Figura_${timestamp.toString().slice(-4)}`;
  const markdownTag = buildImageMarkdown(altText, relativePath, widthPercent);

  return { markdownTag, path: relativePath };
}

/**
 * Intercepta eventos de pegado (Ctrl+V) en áreas de texto o inputs.
 * Si contiene una imagen, la guarda en BPMIM y añade la etiqueta Markdown con su tamaño.
 */
export function handleClipboardImage(
  event: React.ClipboardEvent<HTMLTextAreaElement>,
  currentText: string,
  setText: (newText: string) => void,
  onImageInserted?: (info: string) => void,
  widthPercent: number = 50
): boolean {
  const items = event.clipboardData?.items;
  if (!items) return false;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.type.indexOf("image") !== -1) {
      event.preventDefault();
      const blob = item.getAsFile();
      if (!blob) return false;

      processAndSaveImage(blob, undefined, widthPercent)
        .then(({ markdownTag, path }) => {
          const textarea = event.target as HTMLTextAreaElement;
          const start = textarea.selectionStart || currentText.length;
          const end = textarea.selectionEnd || currentText.length;

          const updatedText =
            currentText.substring(0, start) +
            markdownTag +
            currentText.substring(end);
          setText(updatedText);

          if (onImageInserted) {
            onImageInserted(`Imagen agregada al banco (${widthPercent}%): ${path}`);
          }
        })
        .catch((err) => {
          console.error("Error al procesar imagen del portapapeles:", err);
        });

      return true;
    }
  }

  return false;
}
