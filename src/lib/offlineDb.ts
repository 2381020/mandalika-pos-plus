const DB_NAME = "mandalika_offline";
const DB_VERSION = 2;
const STORE_NAME = "offline_transactions";
const MENU_STORE = "menu_items_cache";
const CATEGORIES_STORE = "menu_categories_cache";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "offline_id" });
      }
      if (!db.objectStoreNames.contains(MENU_STORE)) {
        db.createObjectStore(MENU_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(CATEGORIES_STORE)) {
        db.createObjectStore(CATEGORIES_STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export interface OfflineTransaction {
  offline_id: string;
  cashier_id: string;
  total: number;
  payment_method: string;
  amount_paid: number;
  change_amount: number;
  status?: "pending" | "completed" | "failed";
  items: {
    menu_item_id: string;
    menu_item_name: string;
    quantity: number;
    price: number;
    subtotal: number;
  }[];
  created_at: string;
}

export async function saveOfflineTransaction(tx: OfflineTransaction) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const t = db.transaction(STORE_NAME, "readwrite");
    t.objectStore(STORE_NAME).put(tx);
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

export async function getOfflineTransactions(): Promise<OfflineTransaction[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE_NAME, "readonly");
    const req = t.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteOfflineTransaction(offlineId: string) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const t = db.transaction(STORE_NAME, "readwrite");
    t.objectStore(STORE_NAME).delete(offlineId);
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

export async function updateOfflineTransactionStatus(
  offlineId: string,
  status: "pending" | "completed" | "failed"
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE_NAME, "readwrite");
    const store = t.objectStore(STORE_NAME);
    const req = store.get(offlineId);
    req.onsuccess = () => {
      const tx = req.result;
      if (!tx) return reject(new Error("Transaction not found"));
      store.put({ ...tx, status });
      resolve();
    };
    req.onerror = () => reject(req.error);
  });
}

// --- Menu cache helpers ---

export async function cacheMenuItems(items: any[]) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const t = db.transaction(MENU_STORE, "readwrite");
    const store = t.objectStore(MENU_STORE);
    store.clear();
    items.forEach((item) => store.put(item));
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

export async function getCachedMenuItems(): Promise<any[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(MENU_STORE, "readonly");
    const req = t.objectStore(MENU_STORE).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function cacheCategories(categories: any[]) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const t = db.transaction(CATEGORIES_STORE, "readwrite");
    const store = t.objectStore(CATEGORIES_STORE);
    store.clear();
    categories.forEach((c) => store.put(c));
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

export async function getCachedCategories(): Promise<any[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(CATEGORIES_STORE, "readonly");
    const req = t.objectStore(CATEGORIES_STORE).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
