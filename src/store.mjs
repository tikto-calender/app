import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
const dataDirectory = path.resolve(moduleDirectory, "../data");
const storePath = path.join(dataDirectory, "store.json");
const temporaryStorePath = path.join(dataDirectory, "store.json.tmp");
const emptyStore = () => ({ tasks: [], events: [] });

let writeQueue = Promise.resolve();

export async function readStore() {
  try {
    const data = JSON.parse(await readFile(storePath, "utf8"));
    return {
      tasks: Array.isArray(data.tasks) ? data.tasks : [],
      events: Array.isArray(data.events) ? data.events : [],
    };
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }

    await saveStore(emptyStore());
    return emptyStore();
  }
}

export function saveStore(store) {
  writeQueue = writeQueue.then(async () => {
    await mkdir(dataDirectory, { recursive: true });
    await writeFile(temporaryStorePath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
    await rename(temporaryStorePath, storePath);
  });

  return writeQueue;
}

export async function updateStore(update) {
  const store = await readStore();
  const result = await update(store);
  await saveStore(store);
  return result;
}
