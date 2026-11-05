import initSqlJs, { Database, QueryExecResult } from 'sql.js';
import { getSqlWasmBinary } from './sqlWasmBinary';

export interface SqlQueryResult {
  columns: string[];
  rows: any[][];
  executionTimeMs: number;
  rowCount: number;
  error?: string;
}

export interface SqliteDbMetadata {
  format: string;
  catalogSchema: string;
  totalEntries: number;
  totalSources: number;
  totalFindings: number;
  totalReviews: number;
  fileSizeBytes: number;
  categories: { category: string; count: number }[];
  tables: { name: string; count: number }[];
}

let dbInstance: Database | null = null;
let initPromise: Promise<Database> | null = null;
let isInitializing = false;

/**
 * Initializes and returns the in-memory SQLite database instance powered by sql.js WebAssembly.
 * Loads the authentic Splittermond GRW database from public/splittermond_grw.sqlite
 */
export async function getSqliteDatabase(): Promise<Database> {
  if (dbInstance) return dbInstance;
  if (initPromise) return initPromise;

  isInitializing = true;
  initPromise = (async () => {
    try {
      // 1. Initialize sql.js directly with embedded WebAssembly binary.
      // This eliminates all fetch/MIME-type/iframe-cookie/CORS failures.
      const wasmBinary = getSqlWasmBinary();
      const SQL = await initSqlJs({ wasmBinary });

      let buffer: ArrayBuffer;
      const isTestOrNode =
        typeof process !== 'undefined' &&
        (process.env?.NODE_ENV === 'test' || Boolean(process.env?.VITEST) || typeof window === 'undefined');

      if (isTestOrNode) {
        // Node / Vitest test environment: read from disk directly
        const fs = await import('fs');
        const path = await import('path');
        const dbPath = path.resolve(process.cwd(), 'src/data/splittermond_grw.sqlite');
        if (!fs.existsSync(dbPath)) {
          throw new Error(`SQLite-Datei nicht gefunden: ${dbPath}`);
        }
        const nodeBuffer = fs.readFileSync(dbPath);
        buffer = nodeBuffer.buffer.slice(nodeBuffer.byteOffset, nodeBuffer.byteOffset + nodeBuffer.byteLength);
      } else {
        // Browser environment: fetch sqlite file from public/
        const response = await fetch('/splittermond_grw.sqlite');
        if (!response.ok) {
          throw new Error(`Konnte SQLite-Datenbank nicht abrufen: HTTP ${response.status} ${response.statusText}`);
        }
        buffer = await response.arrayBuffer();

        // Validate SQLite header to ensure no HTML error page / redirect was returned
        const header = new TextDecoder().decode(new Uint8Array(buffer.slice(0, 15)));
        if (!header.startsWith('SQLite format 3')) {
          throw new Error(`Ungültige SQLite-Datei empfangen. Header: '${header}'`);
        }
      }

      const inst = new SQL.Database(new Uint8Array(buffer)) as Database;
      dbInstance = inst;
      isInitializing = false;
      return inst;
    } catch (err) {
      isInitializing = false;
      initPromise = null;
      console.error('Fehler bei der Initialisierung der Splittermond SQLite-Datenbank:', err);
      throw err;
    }
  })();

  const currentPromise = initPromise;
  if (!currentPromise) {
    throw new Error('Database initialization failed to start');
  }
  return currentPromise;
}

export function isDatabaseReady(): boolean {
  return dbInstance !== null;
}

export function isDatabaseLoading(): boolean {
  return isInitializing;
}

/**
 * Executes a raw SQL query directly against the Splittermond SQLite database.
 */
export async function executeRawSql(sql: string, params: any[] = []): Promise<SqlQueryResult> {
  const startTime = performance.now();
  try {
    const db = await getSqliteDatabase();
    const results: QueryExecResult[] = db.exec(sql, params);
    const duration = performance.now() - startTime;

    if (!results || results.length === 0) {
      return {
        columns: [],
        rows: [],
        rowCount: 0,
        executionTimeMs: Math.round(duration * 100) / 100,
      };
    }

    const firstResult = results[0];
    return {
      columns: firstResult.columns,
      rows: firstResult.values,
      rowCount: firstResult.values.length,
      executionTimeMs: Math.round(duration * 100) / 100,
    };
  } catch (error: any) {
    const duration = performance.now() - startTime;
    return {
      columns: [],
      rows: [],
      rowCount: 0,
      executionTimeMs: Math.round(duration * 100) / 100,
      error: error?.message || String(error),
    };
  }
}

/**
 * Retrieves database statistics, table counts, and metadata from the SQLite database.
 */
export async function getDatabaseMetadata(): Promise<SqliteDbMetadata> {
  const db = await getSqliteDatabase();

  // 1. Get metadata table
  let format = 'splittermond-sqlite-v1';
  let catalogSchema = 'splittermond-catalog-v1';
  try {
    const metaRes = db.exec("SELECT key, value_json FROM metadata WHERE key IN ('format', 'catalog_schema');");
    if (metaRes[0]) {
      for (const row of metaRes[0].values) {
        if (row[0] === 'format') format = JSON.parse(String(row[1]));
        if (row[0] === 'catalog_schema') catalogSchema = JSON.parse(String(row[1]));
      }
    }
  } catch (e) {
    console.warn('Metadata query failed', e);
  }

  // 2. Count tables
  const tables = ['entries', 'sources', 'findings', 'reviews', 'prerequisites', 'prerequisite_links', 'documents', 'metadata'];
  const tableCounts: { name: string; count: number }[] = [];
  let totalEntries = 0;
  let totalSources = 0;
  let totalFindings = 0;
  let totalReviews = 0;

  for (const table of tables) {
    try {
      const res = db.exec(`SELECT count(*) FROM ${table};`);
      const cnt = (res[0]?.values[0]?.[0] as number) || 0;
      tableCounts.push({ name: table, count: cnt });
      if (table === 'entries') totalEntries = cnt;
      if (table === 'sources') totalSources = cnt;
      if (table === 'findings') totalFindings = cnt;
      if (table === 'reviews') totalReviews = cnt;
    } catch {
      tableCounts.push({ name: table, count: 0 });
    }
  }

  // 3. Category breakdown
  const categories: { category: string; count: number }[] = [];
  try {
    const catRes = db.exec('SELECT category, count(*) FROM entries GROUP BY category ORDER BY count(*) DESC;');
    if (catRes[0]) {
      for (const row of catRes[0].values) {
        categories.push({ category: String(row[0]), count: Number(row[1]) });
      }
    }
  } catch (e) {
    console.warn('Categories query failed', e);
  }

  return {
    format,
    catalogSchema,
    totalEntries,
    totalSources,
    totalFindings,
    totalReviews,
    fileSizeBytes: 20803584, // ~20.8 MB
    categories,
    tables: tableCounts,
  };
}

/**
 * Searches entries in the SQLite database by category and search keyword.
 */
export async function queryEntriesByCategory(
  category?: string,
  search?: string,
  limit: number = 50,
): Promise<{ id: string; category: string; name: string; data: any; bookPage?: number }[]> {
  const db = await getSqliteDatabase();
  let sql = 'SELECT id, category, name, data_json FROM entries WHERE 1=1';
  const params: any[] = [];

  if (category) {
    sql += ' AND category = ?';
    params.push(category);
  }
  if (search && search.trim()) {
    sql += ' AND (name LIKE ? OR data_json LIKE ?)';
    const term = `%${search.trim()}%`;
    params.push(term, term);
  }

  sql += ' ORDER BY name ASC LIMIT ?';
  params.push(limit);

  const res = db.exec(sql, params);
  if (!res[0]) return [];

  return res[0].values.map((row) => {
    let parsed: any = {};
    try {
      parsed = JSON.parse(String(row[3]));
    } catch {
      // ignore
    }
    const pages = parsed.buch_seiten || [];
    return {
      id: String(row[0]),
      category: String(row[1]),
      name: String(row[2]),
      data: parsed,
      bookPage: pages[0],
    };
  });
}
