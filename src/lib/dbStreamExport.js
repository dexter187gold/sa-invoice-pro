import versionInfo from '../../version.json' with { type: 'json' }
import { STORES, openDB, getAll } from './dbCore.js'

export async function downloadBackupStreaming({ onProgress, signal } = {}) {
  const excluded = new Set(['users', 'autoBackups', 'accountWorkspaces', 'importStaging']);
  const keys = Object.keys(STORES).filter((key) => !excluded.has(key));
  const metadata = {
    exportedAt: new Date().toISOString(),
    version: versionInfo.version,
    app: 'SA Invoice Pro Lab',
    format: 'sa-invoice-pro-workspace-v2',
  };
  let writable = null;
  let opfsWritable = null;
  let opfsDirectory = null;
  let opfsFileName = null;
  let parts = [];
  let bytesWritten = 0;
  const encoder = new TextEncoder();
  const write = async (value) => {
    if (signal?.aborted) throw new DOMException('Backup export cancelled', 'AbortError');
    const chunk = encoder.encode(value);
    if (writable) await writable.write(chunk);
    else if (opfsWritable) await opfsWritable.write(chunk);
    else parts.push(chunk);
    bytesWritten += chunk.byteLength;
  };
  const report = (percent, message, rows) => {
    try { onProgress?.({ percent, message, rows, bytes: bytesWritten }); } catch {}
  };

  if (typeof window !== 'undefined' && typeof window.showSaveFilePicker === 'function') {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: `sa-invoice-backup-${new Date().toISOString().slice(0, 10)}.json`,
        types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }],
      });
      writable = await handle.createWritable();
    } catch (error) {
      if (error?.name === 'AbortError') throw error;
      console.warn('[backup] File System Access unavailable', error);
    }
  }

  if (!writable && typeof navigator !== 'undefined' && navigator.storage?.getDirectory) {
    try {
      opfsDirectory = await navigator.storage.getDirectory();
      opfsFileName = `sa-invoice-backup-${Date.now()}.json`;
      const handle = await opfsDirectory.getFileHandle(opfsFileName, { create: true });
      opfsWritable = await handle.createWritable();
    } catch (error) {
      console.warn('[backup] OPFS unavailable; using memory fallback', error);
      opfsWritable = null;
      opfsDirectory = null;
      opfsFileName = null;
    }
  }

  try {
    await write('{');
    let firstMeta = true;
    for (const [k, v] of Object.entries(metadata)) {
      if (!firstMeta) await write(',');
      await write(JSON.stringify(k) + ':' + JSON.stringify(v));
      firstMeta = false;
    }
    let totalRows = 0;
    let storesDone = 0;
    for (const key of keys) {
      await write(',' + JSON.stringify(key) + ':[');
      let first = true;
      let lastKey = null;
      for (;;) {
        if (signal?.aborted) throw new DOMException('Backup export cancelled', 'AbortError');
        const batch = [];
        const primaryKeys = [];
        await new Promise((resolve, reject) => {
          openDB().then((database) => {
            const t = database.transaction(STORES[key], 'readonly');
            const store = t.objectStore(STORES[key]);
            const req = lastKey == null ? store.openCursor() : store.openCursor(IDBKeyRange.lowerBound(lastKey, true));
            let count = 0;
            req.onsuccess = () => {
              const cursor = req.result;
              if (!cursor || count >= 100) return;
              batch.push(cursor.value);
              primaryKeys.push(cursor.primaryKey);
              count++;
              cursor.continue();
            };
            t.oncomplete = resolve;
            t.onerror = () => reject(t.error || new Error('Export cursor failed'));
          }).catch(reject);
        });
        for (const row of batch) {
          if (!first) await write(',');
          await write(JSON.stringify(row));
          first = false;
          totalRows++;
        }
        if (!primaryKeys.length) break;
        lastKey = primaryKeys[primaryKeys.length - 1];
        if (batch.length < 100) break;
      }
      await write(']');
      storesDone++;
      report(5 + Math.round((storesDone / keys.length) * 90), `Exporting ${key}`, totalRows);
    }
    await write('}');
    if (writable) {
      await writable.close();
      report(100, 'Backup saved successfully', totalRows);
      return { rows: totalRows, bytes: bytesWritten, streamed: true, fileSystemWriter: true, storage: 'file-system-access' };
    }
    if (opfsWritable) {
      await opfsWritable.close();
      opfsWritable = null;
      const handle = await opfsDirectory.getFileHandle(opfsFileName);
      const file = await handle.getFile();
      const url = URL.createObjectURL(file);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `sa-invoice-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => {
        URL.revokeObjectURL(url);
        opfsDirectory.removeEntry(opfsFileName).catch(() => {});
      }, 60_000);
      report(100, 'Backup downloaded successfully', totalRows);
      return { rows: totalRows, bytes: bytesWritten, streamed: true, fileSystemWriter: false, storage: 'opfs' };
    }
    const blob = new Blob(parts, { type: 'application/json;charset=utf-8' });
    parts = [];
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `sa-invoice-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    report(100, 'Backup downloaded successfully', totalRows);
    return { rows: totalRows, bytes: bytesWritten, streamed: true, fileSystemWriter: false };
  } catch (error) {
    if (writable) {
      try { await writable.abort() } catch {}
    }
    if (opfsWritable) {
      try { await opfsWritable.abort() } catch {}
    }
    if (opfsDirectory && opfsFileName) {
      try { await opfsDirectory.removeEntry(opfsFileName) } catch {}
    }
    parts = [];
    throw error;
  }
}
