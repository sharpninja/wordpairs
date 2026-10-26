/** A read/write IndexedDB transaction serializes first entry across tabs. */
export function guestCredential(): Promise<string> {
  return new Promise((resolve, reject) => {
    const opening = indexedDB.open("wordpairs-browser", 1);
    opening.onupgradeneeded = () =>
      opening.result.createObjectStore("identity");
    opening.onerror = () => reject(new Error("Browser storage unavailable"));
    opening.onblocked = () => reject(new Error("Browser storage unavailable"));
    opening.onsuccess = () => {
      const database = opening.result;
      const transaction = database.transaction("identity", "readwrite");
      const store = transaction.objectStore("identity");
      const read = store.get("guest");
      let credential: string;
      read.onsuccess = () => {
        if (
          typeof read.result === "string" &&
          /^[A-Za-z0-9_-]{43}$/.test(read.result)
        )
          credential = read.result;
        else {
          const bytes = crypto.getRandomValues(new Uint8Array(32));
          credential = btoa(String.fromCharCode(...bytes))
            .replaceAll("+", "-")
            .replaceAll("/", "_")
            .replaceAll("=", "");
          store.put(credential, "guest");
        }
      };
      transaction.oncomplete = () => {
        database.close();
        resolve(credential);
      };
      transaction.onabort = transaction.onerror = () => {
        database.close();
        reject(new Error("Browser storage unavailable"));
      };
    };
  });
}
