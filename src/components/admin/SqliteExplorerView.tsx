import React, { useState, useEffect, useCallback } from 'react';
import {
  Database as DbIcon,
  Play,
  RotateCcw,
  Search,
  CheckCircle2,
  Clock,
  BookOpen,
  Layers,
  ChevronRight,
  FileCode,
  Sparkles,
  Info,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  executeRawSql,
  getDatabaseMetadata,
  queryEntriesByCategory,
  isDatabaseReady,
  type SqlQueryResult,
  type SqliteDbMetadata,
} from '../../services/sqliteService';

const PRESET_QUERIES = [
  {
    name: 'Kategorien-Übersicht',
    sql: 'SELECT category AS Kategorie, count(*) AS Anzahl FROM entries GROUP BY category ORDER BY Anzahl DESC;',
  },
  {
    name: 'Voraussetzungen (Prerequisites)',
    sql: "SELECT e.name AS Eintrag, e.category AS Kategorie, json_extract(e.data_json, '$.schwelle') AS Schwelle, p.original AS Voraussetzung, p.status AS Status FROM prerequisites p JOIN entries e ON p.entry_id = e.id LIMIT 20;",
  },
  {
    name: 'Schwellen (Meisterschaften S1-S4)',
    sql: "SELECT json_extract(data_json, '$.schwelle') AS Schwelle, count(*) AS Anzahl, CASE json_extract(data_json, '$.schwelle') WHEN 1 THEN 'FW >= 6' WHEN 2 THEN 'FW >= 9' WHEN 3 THEN 'FW >= 12' WHEN 4 THEN 'FW >= 15' END AS Schwellenvoraussetzung FROM entries WHERE category = 'meisterschaften' GROUP BY Schwelle ORDER BY Schwelle ASC;",
  },
  {
    name: 'Waffen (Auszug)',
    sql: "SELECT name AS Waffe, json_extract(data_json, '$.fertigkeit') AS Fertigkeit, json_extract(data_json, '$.felder.schaden') AS Schaden, json_extract(data_json, '$.wgs') AS WGS, json_extract(data_json, '$.felder.preis') AS Preis FROM entries WHERE category = 'waffen' LIMIT 15;",
  },
  {
    name: 'Rüstungen & Schilde',
    sql: "SELECT name AS Name, category AS Typ, json_extract(data_json, '$.vtd_bonus') AS VTD_Plus, json_extract(data_json, '$.sr') AS SR, json_extract(data_json, '$.behinderung') AS Behinderung FROM entries WHERE category IN ('ruestungen', 'schilde');",
  },
  {
    name: 'Zauber-Auszug',
    sql: "SELECT name AS Zauber, json_extract(data_json, '$.felder.schulen') AS Schulen, json_extract(data_json, '$.felder.kosten') AS Kosten, json_extract(data_json, '$.felder.zauberdauer') AS Dauer FROM entries WHERE category = 'zauber' LIMIT 15;",
  },
  {
    name: 'Quellennachweise (Buchseite & PDF)',
    sql: 'SELECT e.name AS Eintrag, e.category AS Kategorie, s.book_page AS Buchseite, s.pdf_page AS PDF_Seite FROM entries e JOIN sources s ON e.id = s.entry_id GROUP BY e.id LIMIT 20;',
  },
];

export const SqliteExplorerView: React.FC = () => {
  const [metadata, setMetadata] = useState<SqliteDbMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [queryInput, setQueryInput] = useState<string>(PRESET_QUERIES[0].sql);
  const [queryResult, setQueryResult] = useState<SqlQueryResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  // Category browse state
  const [selectedCategory, setSelectedCategory] = useState<string>('meisterschaften');
  const [categorySearch, setCategorySearch] = useState<string>('');
  const [categoryEntries, setCategoryEntries] = useState<any[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<any | null>(null);

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      setDbError(null);
      const meta = await getDatabaseMetadata();
      setMetadata(meta);
      const entries = await queryEntriesByCategory(selectedCategory, categorySearch, 40);
      setCategoryEntries(entries);
      if (entries.length > 0) setSelectedEntry(entries[0]);
    } catch (err: any) {
      console.warn('SQLite Explorer konnte nicht geladen werden:', err);
      setDbError(err?.message || 'Datenbank konnte nicht initialisiert werden.');
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, categorySearch]);

  // Load database metadata on mount
  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Run initial query
  useEffect(() => {
    handleRunQuery(PRESET_QUERIES[0].sql);
  }, []);

  const handleRunQuery = useCallback(async (sqlToRun?: string) => {
    const sql = (sqlToRun || queryInput).trim();
    if (!sql) return;
    setIsExecuting(true);
    try {
      const res = await executeRawSql(sql);
      setQueryResult(res);
      if (res.error) {
        toast.error(`SQL-Fehler: ${res.error}`);
      }
    } catch (err: any) {
      toast.error(`Abfragefehler: ${err?.message || err}`);
    } finally {
      setIsExecuting(false);
    }
  }, [queryInput]);

  return (
    <div className="space-y-6">
      {/* Top Banner: Database Source Info */}
      <div className="p-4 rounded-xl bg-[#0f2340] border-2 border-[#C5A059] text-[#f3e5cf] shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#C5A059] text-[#1B365D] rounded-lg shrink-0">
            <DbIcon size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg text-[#C5A059] fantasy-font">
                Splittermond Grundregelwerk SQLite-Datenbank
              </h3>
              <span className="bg-green-700/80 text-green-100 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 size={12} /> Aktiv
              </span>
            </div>
            <p className="text-xs text-gray-300 font-mono mt-0.5">
              Quelle: <span className="text-[#C5A059]">src/data/splittermond_grw.sqlite</span> (19.2 MB)
            </p>
          </div>
        </div>

        {metadata && (
          <div className="flex flex-wrap gap-2 text-xs">
            <div className="bg-[#1B365D] px-3 py-1.5 rounded border border-[#C5A059]/40 flex flex-col items-center">
              <span className="text-[10px] uppercase text-gray-400">Einträge</span>
              <span className="font-bold text-[#f3e5cf]">{metadata.totalEntries.toLocaleString('de-DE')}</span>
            </div>
            <div className="bg-[#1B365D] px-3 py-1.5 rounded border border-[#C5A059]/40 flex flex-col items-center">
              <span className="text-[10px] uppercase text-gray-400">Quellbelege</span>
              <span className="font-bold text-[#f3e5cf]">{metadata.totalSources.toLocaleString('de-DE')}</span>
            </div>
            <div className="bg-[#1B365D] px-3 py-1.5 rounded border border-[#C5A059]/40 flex flex-col items-center">
              <span className="text-[10px] uppercase text-gray-400">Schema</span>
              <span className="font-bold text-[#f3e5cf]">{metadata.format}</span>
            </div>
          </div>
        )}
      </div>

      {/* Database Error Banner if any */}
      {dbError && (
        <div className="p-3 bg-amber-50 border border-amber-300 text-amber-900 rounded-lg text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info size={16} className="text-amber-700 shrink-0" />
            <span>{dbError}</span>
          </div>
          <button
            type="button"
            onClick={() => loadAll()}
            className="px-2.5 py-1 bg-amber-200 hover:bg-amber-300 text-amber-900 font-bold rounded cursor-pointer text-xs"
          >
            Erneut versuchen
          </button>
        </div>
      )}

      {/* SQL Query Console */}
      <div className="bg-white/80 p-4 rounded-xl border border-gray-300 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCode size={18} className="text-[#1B365D]" />
            <h4 className="font-bold text-sm text-[#1B365D]">Interaktive SQL-Konsole</h4>
          </div>
          <span className="text-xs text-gray-500">Live-Abfragen auf sql.js WebAssembly</span>
        </div>

        {/* Preset query buttons */}
        <div className="flex flex-wrap gap-1.5 text-xs">
          <span className="text-gray-500 font-medium py-1 mr-1">Beispiele:</span>
          {PRESET_QUERIES.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setQueryInput(preset.sql);
                handleRunQuery(preset.sql);
              }}
              className="px-2.5 py-1 bg-[#1B365D]/10 hover:bg-[#1B365D] hover:text-white text-[#1B365D] rounded font-medium transition cursor-pointer border border-[#1B365D]/20 text-[11px]"
            >
              {preset.name}
            </button>
          ))}
        </div>

        {/* Query Input & Run Button */}
        <div className="relative">
          <textarea
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            rows={3}
            placeholder="SELECT * FROM entries LIMIT 10;"
            className="w-full font-mono text-xs p-3 rounded-lg border border-gray-300 bg-gray-900 text-green-400 focus:outline-none focus:ring-2 focus:ring-[#C5A059] shadow-inner resize-y"
          />
          <button
            type="button"
            onClick={() => handleRunQuery()}
            disabled={isExecuting}
            className="absolute bottom-3 right-3 bg-[#C5A059] hover:bg-[#D9B563] text-[#1B365D] px-3.5 py-1.5 rounded-md font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition disabled:opacity-50"
          >
            <Play size={14} className={isExecuting ? 'animate-spin' : ''} />
            {isExecuting ? 'Ausführen...' : 'SQL Ausführen'}
          </button>
        </div>

        {/* Query Results */}
        {queryResult && (
          <div className="space-y-2 mt-3">
            <div className="flex justify-between items-center text-xs text-gray-600 px-1">
              <span className="font-semibold">
                Ergebnis: <span className="text-[#1B365D] font-bold">{queryResult.rowCount}</span> Zeilen
              </span>
              <span className="flex items-center gap-1 text-gray-500 font-mono">
                <Clock size={12} /> {queryResult.executionTimeMs} ms
              </span>
            </div>

            {queryResult.error ? (
              <div className="p-3 bg-red-100 border border-red-300 text-red-800 rounded-lg text-xs font-mono">
                {queryResult.error}
              </div>
            ) : queryResult.rows.length === 0 ? (
              <div className="p-4 text-center text-gray-500 italic text-xs border border-gray-200 rounded-lg bg-gray-50">
                Keine Zeilen zurückgegeben.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-60 border border-gray-300 rounded-lg shadow-inner bg-white">
                <table className="w-full text-left text-xs border-collapse font-mono">
                  <thead>
                    <tr className="bg-[#1B365D] text-[#f3e5cf] sticky top-0 shadow-xs">
                      {queryResult.columns.map((col, idx) => (
                        <th key={idx} className="p-2 px-3 border-b border-[#C5A059]/30 font-bold whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {queryResult.rows.map((row, rIdx) => (
                      <tr
                        key={rIdx}
                        className={`border-b border-gray-200 hover:bg-yellow-50/50 transition-colors ${
                          rIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        }`}
                      >
                        {row.map((val, cIdx) => (
                          <td key={cIdx} className="p-2 px-3 whitespace-nowrap max-w-xs truncate" title={String(val)}>
                            {val === null || val === undefined ? (
                              <span className="text-gray-400 italic">null</span>
                            ) : typeof val === 'object' ? (
                              JSON.stringify(val)
                            ) : (
                              String(val)
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Category Explorer */}
      <div className="bg-white/80 p-4 rounded-xl border border-gray-300 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div className="flex items-center gap-2">
            <Layers size={18} className="text-[#1B365D]" />
            <h4 className="font-bold text-sm text-[#1B365D]">Datenbank-Katalog Durchsuchen</h4>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-white border border-gray-300 text-[#1B365D] font-bold text-xs rounded-lg p-2 focus:ring-2 focus:ring-[#C5A059]"
            >
              {metadata?.categories.map((cat) => (
                <option key={cat.category} value={cat.category}>
                  {cat.category} ({cat.count})
                </option>
              )) || (
                <>
                  <option value="meisterschaften">Meisterschaften</option>
                  <option value="zauber">Zauber</option>
                  <option value="waffen">Waffen</option>
                  <option value="ruestungen">Rüstungen</option>
                  <option value="schilde">Schilde</option>
                  <option value="staerken">Stärken</option>
                  <option value="schwaechen">Schwächen</option>
                  <option value="ressourcen">Ressourcen</option>
                  <option value="ausruestung">Ausrüstung</option>
                  <option value="alchemika">Alchemika</option>
                </>
              )}
            </select>

            <div className="relative flex-1 sm:w-48">
              <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
              <input
                type="text"
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                placeholder="Filtern..."
                className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
              />
            </div>
          </div>
        </div>

        {/* Two-column layout: Entry list & Entry detail */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Entries list */}
          <div className="border border-gray-200 rounded-lg overflow-y-auto max-h-96 bg-white divide-y divide-gray-100">
            {loadingEntries ? (
              <div className="p-8 text-center text-xs text-gray-500">Lade Einträge aus SQLite...</div>
            ) : categoryEntries.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400 italic">Keine Einträge gefunden.</div>
            ) : (
              categoryEntries.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedEntry(item)}
                  className={`w-full text-left p-2.5 px-3 flex justify-between items-center transition-colors cursor-pointer ${
                    selectedEntry?.id === item.id ? 'bg-[#1B365D] text-white' : 'hover:bg-yellow-50'
                  }`}
                >
                  <div className="truncate pr-2">
                    <div className="font-bold text-xs truncate">{item.name}</div>
                    <div
                      className={`text-[10px] truncate ${
                        selectedEntry?.id === item.id ? 'text-gray-300' : 'text-gray-500'
                      }`}
                    >
                      {item.data?.fertigkeit || item.data?.gruppe || item.data?.art || item.category}
                    </div>
                  </div>
                  {item.bookPage && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono shrink-0 ${
                        selectedEntry?.id === item.id
                          ? 'bg-white/20 text-[#C5A059]'
                          : 'bg-gray-100 text-gray-600 border border-gray-200'
                      }`}
                    >
                      S. {item.bookPage}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>

          {/* Entry Details */}
          <div className="border border-gray-200 rounded-lg p-4 bg-white/90 overflow-y-auto max-h-96 text-xs space-y-3">
            {selectedEntry ? (
              <>
                <div className="border-b border-gray-200 pb-2">
                  <div className="flex justify-between items-start">
                    <h5 className="font-bold text-sm text-[#1B365D] fantasy-font">{selectedEntry.name}</h5>
                    {selectedEntry.bookPage && (
                      <span className="bg-[#1B365D] text-[#C5A059] px-2 py-0.5 rounded font-bold text-[10px]">
                        Buch S. {selectedEntry.bookPage}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-gray-500 font-mono mt-0.5">ID: {selectedEntry.id}</div>
                </div>

                {/* Primary Description or Rule Text */}
                {(selectedEntry.data?.beschreibung || selectedEntry.data?.felder?.wirkung) && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400">Regeltext / Wirkung:</span>
                    <p className="text-gray-800 mt-1 whitespace-pre-wrap leading-relaxed">
                      {selectedEntry.data?.beschreibung || selectedEntry.data?.felder?.wirkung}
                    </p>
                  </div>
                )}

                {/* Enhancements / Erfolgsgrade */}
                {selectedEntry.data?.felder?.erfolgsgrade && (
                  <div className="bg-yellow-50/60 p-2.5 rounded border border-yellow-200/80">
                    <span className="text-[10px] uppercase font-bold text-[#8D6B26]">Erfolgsgrade:</span>
                    <p className="text-gray-800 mt-1 whitespace-pre-wrap leading-relaxed text-[11px]">
                      {selectedEntry.data.felder.erfolgsgrade}
                    </p>
                  </div>
                )}

                {/* Key-Value Fields */}
                <div className="bg-gray-50 p-2.5 rounded border border-gray-200 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-gray-500">Felder & Attribute:</span>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-1 font-mono text-[11px]">
                    {Object.entries(selectedEntry.data?.felder || {}).map(([k, v]) => {
                      if (k === 'wirkung' || k === 'erfolgsgrade') return null;
                      return (
                        <div key={k} className="truncate">
                          <span className="text-gray-500">{k}:</span> <span className="font-semibold text-gray-900">{String(v)}</span>
                        </div>
                      );
                    })}
                    {selectedEntry.data?.schwelle && (
                      <div>
                        <span className="text-gray-500">Schwelle:</span> <span className="font-bold text-[#1B365D]">S{selectedEntry.data.schwelle}</span>
                      </div>
                    )}
                    {selectedEntry.data?.manoever && (
                      <div className="text-amber-800 font-semibold">
                        Manöver: Ja
                      </div>
                    )}
                    {selectedEntry.data?.voraussetzungen && (
                      <div className="col-span-2">
                        <span className="text-gray-500">Voraussetzung:</span> <span className="font-medium text-gray-800">{selectedEntry.data.voraussetzungen}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Raw JSON Toggle */}
                <details className="mt-2">
                  <summary className="text-[10px] text-gray-500 hover:text-gray-800 cursor-pointer font-bold">
                    Rohes JSON anzeigen
                  </summary>
                  <pre className="mt-2 p-2 bg-gray-900 text-green-400 font-mono text-[10px] rounded overflow-x-auto max-h-40">
                    {JSON.stringify(selectedEntry.data, null, 2)}
                  </pre>
                </details>
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 italic">
                Wähle einen Eintrag aus der linken Liste.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
