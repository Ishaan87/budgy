"use client";

const DB_NAME = "budgy-offline";
const STORE_NAME = "pending-transactions";
const DB_VERSION = 1;

export type QueuedTransaction = {
  id: string;
  rawInput: string;
  payload: {
    type: "expense" | "income" | "transfer";
    amount: number;
    accountId: string;
    toAccountId: string | null;
    categoryId: string | null;
    occurredAt: string;
    merchant?: string;
    note?: string;
    tags: string[];
  };
  modelUsed: string | null;
  confidence: number;
  queuedAt: string;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function enqueueTransaction(item: QueuedTransaction): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function listQueuedTransactions(): Promise<QueuedTransaction[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result as QueuedTransaction[]);
    request.onerror = () => reject(request.error);
  });
}

export async function removeQueuedTransaction(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
