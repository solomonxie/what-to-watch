// op-sqlite v18 API over node:sqlite, so DB code runs under Jest.
const { DatabaseSync } = require('node:sqlite');

const bind = params => (params ?? []).map(p => (p === undefined ? null : p));

// Kept per name, so closing and reopening a database finds its data again.
const files = new Map();

function open({ name } = {}) {
  const key = name ?? ':memory:';
  if (!files.has(key)) files.set(key, new DatabaseSync(':memory:'));
  const db = files.get(key);
  const run = (query, params) => {
    const stmt = db.prepare(query);
    if (stmt.columns().length === 0) {
      const info = stmt.run(...bind(params));
      return {
        rows: [],
        rowsAffected: Number(info.changes),
        insertId: Number(info.lastInsertRowid),
      };
    }
    const rows = stmt.all(...bind(params)).map(r => ({ ...r }));
    return { rows, rowsAffected: 0 };
  };
  const runRaw = (query, params) => {
    const stmt = db.prepare(query);
    const columnNames = stmt.columns().map(c => c.name);
    if (columnNames.length === 0) {
      const info = stmt.run(...bind(params));
      return { rawRows: [], columnNames, rowsAffected: Number(info.changes) };
    }
    stmt.setReturnArrays(true);
    return { rawRows: stmt.all(...bind(params)), columnNames, rowsAffected: 0 };
  };
  return {
    execute: async (q, p) => run(q, p),
    executeSync: run,
    executeRaw: async (q, p) => runRaw(q, p),
    executeRawSync: runRaw,
    close: () => {},
    delete: () => {
      files.delete(key);
      db.close();
    },
  };
}

module.exports = { open };
