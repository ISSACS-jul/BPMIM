/**
 * Abre el diálogo nativo de "Guardar como..." del sistema operativo (Arch Linux / GTK / Windows)
 * para que el usuario pueda elegir libremente en qué carpeta guardar el archivo (texto o binario).
 */

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function saveFileWithDialog(
  defaultFilename: string,
  content: string | Blob,
  filterName: string = "Archivo JSON (*.json)",
  filterExt: string = "json"
): Promise<{ success: boolean; path?: string; canceled?: boolean }> {
  const isBinary = content instanceof Blob;

  // 1. Intentar mediante el comando nativo de Tauri
  try {
    const isTauri =
      typeof window !== "undefined" &&
      (Boolean((window as any).__TAURI_INTERNALS__) ||
        Boolean((window as any).__TAURI__));

    if (isTauri) {
      const { invoke } = await import("@tauri-apps/api/core");

      if (isBinary) {
        const base64Data = await blobToBase64(content as Blob);
        const savedPath = await invoke<string | null>("save_binary_file_native", {
          defaultFilename,
          dataBase64: base64Data,
          filterName,
          filterExt,
        });
        if (savedPath) return { success: true, path: savedPath };
        return { success: false, canceled: true };
      } else {
        const savedPath = await invoke<string | null>("save_file_native", {
          defaultFilename,
          content: content as string,
          filterName,
          filterExt,
        });
        if (savedPath) return { success: true, path: savedPath };
        return { success: false, canceled: true };
      }
    }
  } catch (tauriError) {
    console.warn("Tauri native save dialog not available, trying browser API:", tauriError);
  }

  // 2. Intentar mediante la File System Access API del navegador (showSaveFilePicker)
  try {
    if ("showSaveFilePicker" in window) {
      const mime =
        filterExt === "json"
          ? "application/json"
          : filterExt === "zip"
          ? "application/zip"
          : filterExt === "tex"
          ? "text/plain"
          : "application/octet-stream";

      const handle = await (window as any).showSaveFilePicker({
        suggestedName: defaultFilename,
        types: [
          {
            description: filterName,
            accept: { [mime]: [`.${filterExt}`] },
          },
        ],
      });

      const writable = await handle.createWritable();
      if (isBinary) {
        await writable.write(content as Blob);
      } else {
        await writable.write(content as string);
      }
      await writable.close();
      return { success: true, path: handle.name };
    }
  } catch (pickerError: any) {
    if (pickerError.name === "AbortError") {
      return { success: false, canceled: true };
    }
    console.warn("showSaveFilePicker failed, falling back to download:", pickerError);
  }

  // 3. Fallback estándar mediante descarga clásica del navegador
  try {
    let blob: Blob;
    if (isBinary) {
      blob = content as Blob;
    } else {
      const mimeType = filterExt === "json" ? "application/json" : "text/plain";
      blob = new Blob([content as string], { type: `${mimeType};charset=utf-8` });
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = defaultFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return { success: true };
  } catch (fallbackError) {
    console.error("All save methods failed:", fallbackError);
    return { success: false };
  }
}
