const DB_NAME = "mandalika_offline";
const DB_VERSION = 1;
const STORE_NAME = "offline_transactions";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "offline_id" });
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
