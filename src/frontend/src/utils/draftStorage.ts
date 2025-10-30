// Minimal IndexedDB helper for saving and retrieving file blobs for drafts.
// This avoids pulling in extra dependencies and keeps the API small.

export async function openDraftDB() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open("service-drafts-db", 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("blobs")) {
        db.createObjectStore("blobs", { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveBlob(id: string, blob: Blob) {
  const db = await openDraftDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction("blobs", "readwrite");
    const store = tx.objectStore("blobs");
    const putReq = store.put({ id, blob });
    putReq.onsuccess = () => resolve();
    putReq.onerror = () => reject(putReq.error);
  });
}

export async function getBlob(id: string): Promise<Blob | null> {
  const db = await openDraftDB();
  return new Promise<Blob | null>((resolve, reject) => {
    const tx = db.transaction("blobs", "readonly");
    const store = tx.objectStore("blobs");
    const req = store.get(id);
    req.onsuccess = () => {
      const res = req.result;
      resolve(res ? (res.blob as Blob) : null);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function deleteBlob(id: string) {
  const db = await openDraftDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction("blobs", "readwrite");
    const store = tx.objectStore("blobs");
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function listBlobKeys(): Promise<string[]> {
  const db = await openDraftDB();
  return new Promise<string[]>((resolve, reject) => {
    const tx = db.transaction("blobs", "readonly");
    const store = tx.objectStore("blobs");
    const keys: string[] = [];
    const req = store.openKeyCursor();
    req.onsuccess = () => {
      const cursor = req.result;
      if (!cursor) {
        resolve(keys);
        return;
      }
      keys.push(cursor.primaryKey as string);
      cursor.continue();
    };
    req.onerror = () => reject(req.error);
  });
}

// Helpers that operate with a draftKey prefix
export async function saveFilesToIDB(
  draftKey: string,
  files: File[],
  prefix: string,
) {
  // prefix should be 'img' or 'cert'
  const promises = files.map((file, idx) =>
    saveBlob(`${draftKey}:${prefix}:${idx}`, file),
  );
  await Promise.all(promises);
}

export async function getFilesFromIDB(
  draftKey: string,
  prefix: string,
): Promise<string[]> {
  const keys = await listBlobKeys();
  const matched = keys.filter((k) => k.startsWith(`${draftKey}:${prefix}:`));
  const urls: string[] = [];
  for (const key of matched) {
    const blob = await getBlob(key);
    if (blob) urls.push(URL.createObjectURL(blob));
  }
  return urls;
}

export async function deleteDraftFromIDB(draftKey: string) {
  const keys = await listBlobKeys();
  const matched = keys.filter((k) => k.startsWith(`${draftKey}:`));
  await Promise.all(matched.map((k) => deleteBlob(k)));
}
