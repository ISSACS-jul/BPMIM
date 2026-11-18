/**
 * Gestor de almacenamiento permanente para imágenes en BPMIM.
 * - Carga rápida al inicio
 * - Almacena en disco nativo (Tauri) + fallback IndexedDB
 * - Permite eliminar imágenes definitivamente tanto de memoria, IndexedDB como de disco.
 */

const DB_NAME = "BPMIM_ImagesDB_v1";
const STORE_NAME = "images";
const DB_VERSION = 1;

// Caché en memoria: nombre/ruta → dataUrl
const memoryCache = new Map<string, string>();

// Suscriptores que quieren ser notificados cuando el store se actualiza
const updateListeners = new Set<() => void>();

export function onImageStoreUpdate(cb: () => void): void {
  updateListeners.add(cb);
}
export function offImageStoreUpdate(cb: () => void): void {
  updateListeners.delete(cb);
}
function notifyListeners(): void {
  updateListeners.forEach((cb) => {
    try { cb(); } catch {}
  });
}

function isTauriEnv(): boolean {
  return (
    typeof window !== "undefined" &&
    (Boolean((window as any).__TAURI_INTERNALS__) ||
      Boolean((window as any).__TAURI__))
  );
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB no disponible"));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "name" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function normalizeImageName(filename: string): string {
  return filename
    .replace(/^(imagenes\/|images\/|\.\/imagenes\/|\.\/images\/)/, "")
    .trim();
}

function cacheImage(name: string, dataUrl: string): void {
  const clean = normalizeImageName(name);
  memoryCache.set(clean, dataUrl);
  memoryCache.set(`imagenes/${clean}`, dataUrl);
  memoryCache.set(`images/${clean}`, dataUrl);
}

function uncacheImage(name: string): void {
  const clean = normalizeImageName(name);
  memoryCache.delete(clean);
  memoryCache.delete(`imagenes/${clean}`);
  memoryCache.delete(`images/${clean}`);
}

/**
 * Inicializa el store de imágenes en background.
 */
export async function initImageStore(): Promise<void> {
  let loaded = 0;

  // 1. Cargar desde disco nativo (Tauri)
  if (isTauriEnv()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const diskRecords = await invoke<{ name: string; data: string }[]>("load_all_disk_images");
      if (diskRecords && diskRecords.length > 0) {
        diskRecords.forEach((rec) => {
          cacheImage(rec.name, rec.data);
          loaded++;
        });
      }
    } catch (err) {
      console.warn("No se pudieron cargar imágenes desde disco Tauri:", err);
    }
  }

  // 2. Cargar desde IndexedDB
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    await new Promise<void>((resolve) => {
      request.onsuccess = () => {
        const records: { name: string; data: string }[] = request.result || [];
        records.forEach((rec) => {
          const clean = normalizeImageName(rec.name);
          if (!memoryCache.has(clean)) {
            cacheImage(rec.name, rec.data);
            loaded++;
          }
        });
        resolve();
      };
      request.onerror = () => resolve();
    });
  } catch (err) {
    console.warn("No se pudo cargar desde IndexedDB:", err);
  }

  if (loaded > 0) {
    notifyListeners();
  }
}

/**
 * Guarda una imagen permanentemente (disco Tauri + IndexedDB) y actualiza la caché.
 */
export async function saveImage(name: string, dataUrl: string): Promise<string> {
  const cleanName = normalizeImageName(name);
  const relativePath = `imagenes/${cleanName}`;

  cacheImage(cleanName, dataUrl);

  if (isTauriEnv()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("save_disk_image", { name: cleanName, dataUrl });
    } catch (err) {
      console.warn("Error guardando en disco Tauri:", err);
    }
  }

  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put({ name: cleanName, data: dataUrl });
    await new Promise<void>((r) => { tx.oncomplete = () => r(); tx.onerror = () => r(); });
  } catch (err) {
    console.warn("Error guardando en IndexedDB:", err);
  }

  notifyListeners();
  return relativePath;
}

/**
 * Elimina una imagen definitivamente (disco Tauri, IndexedDB y memoria).
 */
export async function deleteImage(name: string): Promise<void> {
  const cleanName = normalizeImageName(name);
  uncacheImage(cleanName);

  if (isTauriEnv()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("delete_disk_image", { name: cleanName });
    } catch (err) {
      console.warn("Error eliminando imagen de disco Tauri:", err);
    }
  }

  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(cleanName);
    await new Promise<void>((r) => { tx.oncomplete = () => r(); tx.onerror = () => r(); });
  } catch (err) {
    console.warn("Error eliminando de IndexedDB:", err);
  }

  notifyListeners();
}

export function getImageSync(path: string): string | undefined {
  const clean = normalizeImageName(path);
  return memoryCache.get(clean) || memoryCache.get(path);
}

export async function getAllStoredImages(): Promise<{ name: string; dataUrl: string }[]> {
  const list: { name: string; dataUrl: string }[] = [];
  memoryCache.forEach((dataUrl, key) => {
    if (!key.includes("/")) {
      list.push({ name: key, dataUrl });
    }
  });
  return list;
}

export async function saveMultipleImages(images: { name: string; dataUrl: string }[]): Promise<void> {
  for (const img of images) {
    await saveImage(img.name, img.dataUrl);
  }
}

export async function getDataFolderPath(): Promise<string> {
  if (isTauriEnv()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      return await invoke<string>("get_data_folder_path");
    } catch (err) {
      console.warn("Error obteniendo ruta:", err);
    }
  }
  return "Navegador web (Almacenamiento IndexedDB local)";
}

export async function openDataFolderInOS(): Promise<boolean> {
  if (isTauriEnv()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("open_data_folder");
      return true;
    } catch (err) {
      console.warn("Error abriendo carpeta:", err);
    }
  }
  return false;
}

export function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(";base64,");
  const contentType = parts[0].replace("data:", "") || "image/png";
  const byteCharacters = atob(parts[1] || "");
  const byteArrays: Uint8Array[] = [];
  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    byteArrays.push(new Uint8Array(byteNumbers));
  }
  return new Blob(byteArrays, { type: contentType });
}
