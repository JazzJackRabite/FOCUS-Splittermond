import React, { useState } from 'react';
import {
  FileCode,
  Copy,
  Check,
  Download,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  BookOpen,
  Layers,
  ArrowRight,
  ShieldAlert,
  Play,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  STARTER_MODULE_TEMPLATE,
  validateRulebookPackage,
  type ModuleValidationResult,
} from '../../types/rulebookSchema';
import { useGameResources } from '../../hooks/useGameResources';

export const DataModelSpecView: React.FC = () => {
  const { importModule } = useGameResources();
  const [copiedTemplate, setCopiedTemplate] = useState(false);
  const [activeSpecSection, setActiveSpecSection] = useState<'overview' | 'metadata' | 'spells' | 'masteries' | 'strengths' | 'template' | 'validator'>('overview');

  // Live validator state
  const [validatorInput, setValidatorInput] = useState(
    JSON.stringify(STARTER_MODULE_TEMPLATE, null, 2),
  );
  const [validationResult, setValidationResult] = useState<ModuleValidationResult | null>(null);

  const handleCopyTemplate = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(STARTER_MODULE_TEMPLATE, null, 2));
      setCopiedTemplate(true);
      toast.success('JSON-Vorlage in Zwischenablage kopiert!');
      setTimeout(() => setCopiedTemplate(false), 2500);
    } catch {
      toast.error('Kopieren fehlgeschlagen. Bitte manuell markieren.');
    }
  };

  const handleDownloadTemplate = () => {
    try {
      const dataStr = JSON.stringify(STARTER_MODULE_TEMPLATE, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'splittermond-modul-vorlage.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Vorlage heruntergeladen (splittermond-modul-vorlage.json)');
    } catch {
      toast.error('Download fehlgeschlagen.');
    }
  };

  const handleRunValidation = () => {
    if (!validatorInput.trim()) {
      toast.error('Bitte füge zuerst ein JSON ein.');
      return;
    }

    try {
      const parsed = JSON.parse(validatorInput);
      const result = validateRulebookPackage(parsed);
      setValidationResult(result);
      if (result.isValid) {
        toast.success(
          `Modul "${result.sanitizedPackage?.name}" ist valide! (${result.summary.spellsCount} Zauber, ${result.summary.masteriesCount} Meisterschaften)`,
        );
      } else {
        toast.error(`Validierung ergab ${result.errors.length} Fehler.`);
      }
    } catch (err) {
      setValidationResult({
        isValid: false,
        errors: [
          {
            field: 'syntax',
            message: `JSON-Syntaxfehler: ${err instanceof Error ? err.message : 'Ungültiges Format'}`,
            severity: 'error',
          },
        ],
        warnings: [],
        summary: { spellsCount: 0, masteriesCount: 0, strengthsCount: 0, weaknessesCount: 0, resourcesCount: 0, overridesCount: 0 },
      });
      toast.error('Ungültiges JSON!');
    }
  };

  const handleInstallValidatedModule = () => {
    if (!validationResult || !validationResult.isValid || !validationResult.sanitizedPackage) {
      toast.error('Bitte validiere zuerst ein gültiges Modul.');
      return;
    }

    const res = importModule(validationResult.sanitizedPackage);
    if (res.isValid) {
      toast.success(`Modul "${res.sanitizedPackage?.name}" wurde erfolgreich installiert und aktiviert!`);
    } else {
      toast.error('Installation fehlgeschlagen.');
    }
  };

  return (
    <div className="space-y-4 text-[#E6E1D3]">
      {/* Sub-Navigation for Specification */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-[#3A4258] pb-2 text-xs">
        <button
          type="button"
          onClick={() => setActiveSpecSection('overview')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeSpecSection === 'overview'
              ? 'bg-[#0f2340] text-[#f3e5cf] border border-[#C5A059]'
              : 'bg-[#242A3B] text-[#A3A096] hover:text-[#F5F2EA] hover:bg-[#2C3347] border border-[#3A4258]'
          }`}
        >
          <BookOpen size={14} className="text-[#C5A059]" />
          <span>Architektur & Übersicht</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSpecSection('metadata')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeSpecSection === 'metadata'
              ? 'bg-[#0f2340] text-[#f3e5cf] border border-[#C5A059]'
              : 'bg-[#242A3B] text-[#A3A096] hover:text-[#F5F2EA] hover:bg-[#2C3347] border border-[#3A4258]'
          }`}
        >
          <Layers size={14} className="text-[#C5A059]" />
          <span>Paket-Metadaten</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSpecSection('spells')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeSpecSection === 'spells'
              ? 'bg-[#0f2340] text-[#f3e5cf] border border-[#C5A059]'
              : 'bg-[#242A3B] text-[#A3A096] hover:text-[#F5F2EA] hover:bg-[#2C3347] border border-[#3A4258]'
          }`}
        >
          <Sparkles size={14} className="text-[#C5A059]" />
          <span>Zauber-Schema</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSpecSection('masteries')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeSpecSection === 'masteries'
              ? 'bg-[#0f2340] text-[#f3e5cf] border border-[#C5A059]'
              : 'bg-[#242A3B] text-[#A3A096] hover:text-[#F5F2EA] hover:bg-[#2C3347] border border-[#3A4258]'
          }`}
        >
          <FileCode size={14} className="text-[#C5A059]" />
          <span>Meisterschaften & Stärken</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSpecSection('template')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeSpecSection === 'template'
              ? 'bg-[#0f2340] text-[#f3e5cf] border border-[#C5A059]'
              : 'bg-[#242A3B] text-[#A3A096] hover:text-[#F5F2EA] hover:bg-[#2C3347] border border-[#3A4258]'
          }`}
        >
          <Download size={14} className="text-[#C5A059]" />
          <span>Muster-Vorlage (.json)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSpecSection('validator')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeSpecSection === 'validator'
              ? 'bg-[#332A19] text-[#FBEFCE] border border-[#C5A059] shadow-xs'
              : 'bg-[#242A3B] text-[#C5A059] border border-[#3A4258] hover:bg-[#332A19]/60'
          }`}
        >
          <Play size={14} />
          <span>Live-Validierer & Import</span>
        </button>
      </div>

      {/* SECTION: OVERVIEW */}
      {activeSpecSection === 'overview' && (
        <div className="space-y-3">
          <div className="bg-[#242A3B] p-4 rounded-xl border border-[#3A4258] shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-[#F5F2EA]">
              <BookOpen size={20} className="text-[#C5A059]" />
              <h3 className="font-bold text-base font-serif">
                Persistentes Datenmodell für modulare Splittermond-Regelwerke
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-[#D8D4C7] leading-relaxed">
              Dieses Datenmodell definiert eine standardisierte JSON-Spezifikation (Format:{' '}
              <code className="px-1.5 py-0.5 bg-[#161B26] border border-[#3A4258] rounded text-[#C5A059] font-mono text-xs">
                splittermond-module-v1
              </code>
              ), mit der neue Erweiterungen, Hausregeln, Abenteuerbände oder alternative Magie- und
              Kampfregelwerke importiert und dauerhaft im System betrieben werden können.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              <div className="p-3 bg-[#161B26] rounded-lg border border-[#3A4258] text-xs space-y-1">
                <span className="font-bold text-[#F5F2EA] flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-[#0f2340] border border-[#C5A059]/40 text-[#C5A059] flex items-center justify-center text-[10px] font-bold">
                    1
                  </span>
                  Ebene 1: Grundregelwerk (GRW)
                </span>
                <p className="text-[#A3A096] text-[11px]">
                  Unveränderliche kanonische Basis. Garantiert, dass der Spieltisch immer voll
                  funktionsfähig bleibt.
                </p>
              </div>

              <div className="p-3 bg-[#161B26] rounded-lg border border-[#3A4258] text-xs space-y-1">
                <span className="font-bold text-[#F5F2EA] flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-[#C5A059] text-[#1B365D] flex items-center justify-center text-[10px] font-bold">
                    2
                  </span>
                  Ebene 2: Aktive Module
                </span>
                <p className="text-[#A3A096] text-[11px]">
                  Importierte JSON-Erweiterungen. Fügen neue Zauber, Meisterschaften, Stärken oder
                  Ressourcen in alle Charakterbögen ein.
                </p>
              </div>

              <div className="p-3 bg-[#161B26] rounded-lg border border-[#3A4258] text-xs space-y-1">
                <span className="font-bold text-[#F5F2EA] flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center text-[10px] font-bold">
                    3
                  </span>
                  Ebene 3: Dauerhafte Overrides
                </span>
                <p className="text-[#A3A096] text-[11px]">
                  Im Admin-Menü editierte Texte und Regelbeschreibungen überschreiben präzise die
                  Standardtexte beider Ebenen.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-[#242A3B] p-4 rounded-xl border border-[#3A4258] shadow-xs space-y-3">
            <h4 className="font-bold text-xs sm:text-sm text-[#F5F2EA] uppercase tracking-wider">
              Anwendungsszenarien für eigene Module
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#D8D4C7]">
              <div className="p-2.5 bg-[#161B26] rounded-lg border border-[#3A4258]">
                <span className="font-bold text-[#C5A059] block mb-1">
                  🏰 Offizielle Quellenbände
                </span>
                Mondstahlklingen (Waffenmeisterschaften), Götter & Dämonen (Kulte & Priester),
                Bestienmeister oder Diener der Vorsehung als saubere Module.
              </div>
              <div className="p-2.5 bg-[#161B26] rounded-lg border border-[#3A4258]">
                <span className="font-bold text-[#C5A059] block mb-1">⚔️ Kampagnen-Hausregeln</span>
                Eigene Zauberschulen, regionale Kampfstile, spezifische Hintergrund-Ressourcen oder
                modifizierte Schwächen eurer Spielrunde.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION: METADATA */}
      {activeSpecSection === 'metadata' && (
        <div className="bg-[#242A3B] p-4 rounded-xl border border-[#3A4258] shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-[#F5F2EA]">
            <Layers size={18} className="text-[#C5A059]" />
            <h4 className="font-bold text-sm">Header- und Metadaten-Spezifikation</h4>
          </div>
          <p className="text-xs text-[#A3A096]">
            Jede Moduldatei muss ein JSON-Objekt auf oberster Ebene mit folgenden Metadatenfeldern sein:
          </p>

          <div className="overflow-x-auto rounded-lg border border-[#3A4258]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#161B26] text-[#F5F2EA] border-b border-[#3A4258]">
                  <th className="p-2.5 font-bold">Feld</th>
                  <th className="p-2.5 font-bold">Typ</th>
                  <th className="p-2.5 font-bold">Pflicht</th>
                  <th className="p-2.5 font-bold">Beispiel</th>
                  <th className="p-2.5 font-bold">Bedeutung</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#3A4258]/60 bg-[#1C2130]">
                <tr>
                  <td className="p-2 font-mono text-[#C5A059] font-bold">format</td>
                  <td className="p-2 font-mono text-[#A3A096]">string</td>
                  <td className="p-2 text-red-400 font-bold">Ja</td>
                  <td className="p-2 font-mono text-[11px] text-[#E6E1D3]">&quot;splittermond-module-v1&quot;</td>
                  <td className="p-2 text-[#A3A096]">Identifiziert das Dateiformat für den Parser.</td>
                </tr>
                <tr>
                  <td className="p-2 font-mono text-[#C5A059] font-bold">id</td>
                  <td className="p-2 font-mono text-[#A3A096]">string</td>
                  <td className="p-2 text-red-400 font-bold">Ja</td>
                  <td className="p-2 font-mono text-[11px] text-[#E6E1D3]">&quot;mondstahlklingen-kampf&quot;</td>
                  <td className="p-2 text-[#A3A096]">Eindeutige ID (Kebab-Case: klein, Bindestriche).</td>
                </tr>
                <tr>
                  <td className="p-2 font-mono text-[#C5A059] font-bold">name</td>
                  <td className="p-2 font-mono text-[#A3A096]">string</td>
                  <td className="p-2 text-red-400 font-bold">Ja</td>
                  <td className="p-2 font-mono text-[11px] text-[#E6E1D3]">&quot;Mondstahlklingen – Stile&quot;</td>
                  <td className="p-2 text-[#A3A096]">Vollständiger Anzeigetitel im Admin- und Auswahldialog.</td>
                </tr>
                <tr>
                  <td className="p-2 font-mono text-[#C5A059] font-bold">shortName</td>
                  <td className="p-2 font-mono text-[#A3A096]">string</td>
                  <td className="p-2 text-red-400 font-bold">Ja</td>
                  <td className="p-2 font-mono text-[11px] text-[#E6E1D3]">&quot;MSK&quot;</td>
                  <td className="p-2 text-[#A3A096]">Kurzkennung für Quellabzeichen auf dem Charakterbogen.</td>
                </tr>
                <tr>
                  <td className="p-2 font-mono text-[#C5A059] font-bold">version</td>
                  <td className="p-2 font-mono text-[#A3A096]">string</td>
                  <td className="p-2 text-[#A3A096]">Nein</td>
                  <td className="p-2 font-mono text-[11px] text-[#E6E1D3]">&quot;1.2.0&quot;</td>
                  <td className="p-2 text-[#A3A096]">Semantische Versionierung des Modulpakets.</td>
                </tr>
                <tr>
                  <td className="p-2 font-mono text-[#C5A059] font-bold">system</td>
                  <td className="p-2 font-mono text-[#A3A096]">string</td>
                  <td className="p-2 text-red-400 font-bold">Ja</td>
                  <td className="p-2 font-mono text-[11px] text-[#E6E1D3]">&quot;splittermond&quot;</td>
                  <td className="p-2 text-[#A3A096]">Systemkennung für Cross-System-Kompatibilität.</td>
                </tr>
                <tr>
                  <td className="p-2 font-mono text-[#C5A059] font-bold">author</td>
                  <td className="p-2 font-mono text-[#A3A096]">string</td>
                  <td className="p-2 text-[#A3A096]">Nein</td>
                  <td className="p-2 font-mono text-[11px] text-[#E6E1D3]">&quot;Uhrwerk Verlag / Spieler&quot;</td>
                  <td className="p-2 text-[#A3A096]">Autor oder Organisation.</td>
                </tr>
                <tr>
                  <td className="p-2 font-mono text-[#C5A059] font-bold">resources</td>
                  <td className="p-2 font-mono text-[#A3A096]">object</td>
                  <td className="p-2 text-red-400 font-bold">Ja</td>
                  <td className="p-2 font-mono text-[11px] text-[#E6E1D3]">&#123; spells: [], masteries: [] &#125;</td>
                  <td className="p-2 text-[#A3A096]">Container mit den eigentlichen Spielregeln.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION: SPELLS */}
      {activeSpecSection === 'spells' && (
        <div className="bg-[#242A3B] p-4 rounded-xl border border-[#3A4258] shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-[#F5F2EA]">
            <Sparkles size={18} className="text-[#C5A059]" />
            <h4 className="font-bold text-sm">Zauber-Spezifikation (resources.spells[])</h4>
          </div>
          <p className="text-xs text-[#A3A096]">
            Array von Zauberobjekten. Jeder Zauber wird automatisch in die Magieschulen-Listen des
            Charakterbogens und in den Zauberauswahl-Dialog integriert.
          </p>

          <div className="overflow-x-auto rounded-lg border border-[#3A4258]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#161B26] text-[#F5F2EA] border-b border-[#3A4258]">
                  <th className="p-2.5 font-bold">Eigenschaft</th>
                  <th className="p-2.5 font-bold">Typ</th>
                  <th className="p-2.5 font-bold">Erforderlich</th>
                  <th className="p-2.5 font-bold">Erlaubte Werte & Beschreibung</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#3A4258]/60 bg-[#1C2130]">
                <tr>
                  <td className="p-2 font-mono text-[#C5A059] font-bold">name</td>
                  <td className="p-2 font-mono text-[#A3A096]">string</td>
                  <td className="p-2 text-red-400 font-bold">Ja</td>
                  <td className="p-2 text-[#D8D4C7]">Name des Zaubers (z.B. &quot;Windschritt&quot;).</td>
                </tr>
                <tr>
                  <td className="p-2 font-mono text-[#C5A059] font-bold">school</td>
                  <td className="p-2 font-mono text-[#A3A096]">string</td>
                  <td className="p-2 text-red-400 font-bold">Ja</td>
                  <td className="p-2 text-[#D8D4C7]">
                    Eine der 19 Magieschulen (z.B. &quot;Feuermagie&quot;, &quot;Bewegungsmagie&quot;, &quot;Kampfmagie&quot;).
                  </td>
                </tr>
                <tr>
                  <td className="p-2 font-mono text-[#C5A059] font-bold">grade</td>
                  <td className="p-2 font-mono text-[#A3A096]">number</td>
                  <td className="p-2 text-red-400 font-bold">Ja</td>
                  <td className="p-2 text-[#D8D4C7]">Zaubergrad als Ganzzahl von 0 bis 5.</td>
                </tr>
                <tr>
                  <td className="p-2 font-mono text-[#C5A059] font-bold">cost</td>
                  <td className="p-2 font-mono text-[#A3A096]">string</td>
                  <td className="p-2 text-red-400 font-bold">Ja</td>
                  <td className="p-2 text-[#D8D4C7]">
                    Fokuskosten-Notation: &quot;K4V1&quot;, &quot;8V2&quot;, &quot;K8&quot;, &quot;1&quot; oder &quot;-&quot;.
                  </td>
                </tr>
                <tr>
                  <td className="p-2 font-mono text-[#C5A059] font-bold">castTime</td>
                  <td className="p-2 font-mono text-[#A3A096]">string</td>
                  <td className="p-2 text-[#A3A096]">Nein</td>
                  <td className="p-2 text-[#D8D4C7]">Zauberdauer (z.B. &quot;3 Ticks&quot;, &quot;5 Minuten&quot;).</td>
                </tr>
                <tr>
                  <td className="p-2 font-mono text-[#C5A059] font-bold">range</td>
                  <td className="p-2 font-mono text-[#A3A096]">string</td>
                  <td className="p-2 text-[#A3A096]">Nein</td>
                  <td className="p-2 text-[#D8D4C7]">Reichweite (z.B. &quot;Berührung&quot;, &quot;15 m&quot;, &quot;Zauberer&quot;).</td>
                </tr>
                <tr>
                  <td className="p-2 font-mono text-[#C5A059] font-bold">duration</td>
                  <td className="p-2 font-mono text-[#A3A096]">string</td>
                  <td className="p-2 text-[#A3A096]">Nein</td>
                  <td className="p-2 text-[#D8D4C7]">Wirkungsdauer (z.B. &quot;sofort&quot;, &quot;kanalisiert&quot;, &quot;10 Ticks&quot;).</td>
                </tr>
                <tr>
                  <td className="p-2 font-mono text-[#C5A059] font-bold">description</td>
                  <td className="p-2 font-mono text-[#A3A096]">string</td>
                  <td className="p-2 text-red-400 font-bold">Ja</td>
                  <td className="p-2 text-[#D8D4C7]">Vollständiger Regeltext mit Effekten, Probenmodifikatoren und Verstärkungen.</td>
                </tr>
                <tr>
                  <td className="p-2 font-mono text-[#C5A059] font-bold">damage</td>
                  <td className="p-2 font-mono text-[#A3A096]">string</td>
                  <td className="p-2 text-[#A3A096]">Nein</td>
                  <td className="p-2 text-[#D8D4C7]">Optionaler Schadenscode (z.B. &quot;2W6+3&quot;).</td>
                </tr>
                <tr>
                  <td className="p-2 font-mono text-[#C5A059] font-bold">page</td>
                  <td className="p-2 font-mono text-[#A3A096]">number</td>
                  <td className="p-2 text-[#A3A096]">Nein</td>
                  <td className="p-2 text-[#D8D4C7]">Seitenzahl im Regelbuch zur schnellen Quellenrecherche.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION: MASTERIES & OTHER */}
      {activeSpecSection === 'masteries' && (
        <div className="space-y-3">
          <div className="bg-[#242A3B] p-4 rounded-xl border border-[#3A4258] shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-[#F5F2EA]">
              <FileCode size={18} className="text-[#C5A059]" />
              <h4 className="font-bold text-sm">Meisterschaften (resources.masteries[])</h4>
            </div>
            <p className="text-xs text-[#A3A096]">
              Meisterschaften werden einer Fertigkeit (z.B. &quot;Klingenwaffen&quot;, &quot;Akrobatik&quot;)
              oder &quot;Allgemein&quot; (für allgemeine Kampfmeisterschaften) zugewiesen.
            </p>
            <div className="overflow-x-auto rounded-lg border border-[#3A4258]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#161B26] text-[#F5F2EA] border-b border-[#3A4258]">
                    <th className="p-2.5 font-bold">Feld</th>
                    <th className="p-2.5 font-bold">Typ</th>
                    <th className="p-2.5 font-bold">Pflicht</th>
                    <th className="p-2.5 font-bold">Bedeutung</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#3A4258]/60 bg-[#1C2130]">
                  <tr>
                    <td className="p-2 font-mono text-[#C5A059] font-bold">name</td>
                    <td className="p-2 font-mono text-[#A3A096]">string</td>
                    <td className="p-2 text-red-400 font-bold">Ja</td>
                    <td className="p-2 text-[#D8D4C7]">Name inkl. Stufe in Klammern, z.B. &quot;Klingenschatten (S1)&quot;.</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-mono text-[#C5A059] font-bold">skill</td>
                    <td className="p-2 font-mono text-[#A3A096]">string</td>
                    <td className="p-2 text-red-400 font-bold">Ja</td>
                    <td className="p-2 text-[#D8D4C7]">Zugehörige Fertigkeit oder &quot;Allgemein&quot;.</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-mono text-[#C5A059] font-bold">level</td>
                    <td className="p-2 font-mono text-[#A3A096]">number | string</td>
                    <td className="p-2 text-[#A3A096]">Nein</td>
                    <td className="p-2 text-[#D8D4C7]">Schwelle 1 bis 4 (z.B. 1 oder &quot;S1&quot;).</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-mono text-[#C5A059] font-bold">desc</td>
                    <td className="p-2 font-mono text-[#A3A096]">string</td>
                    <td className="p-2 text-red-400 font-bold">Ja</td>
                    <td className="p-2 text-[#D8D4C7]">Regeltext und Spielwirkung.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-[#242A3B] p-3.5 rounded-xl border border-[#3A4258] shadow-xs space-y-2 text-xs">
              <h5 className="font-bold text-[#F5F2EA]">Stärken (resources.strengths[])</h5>
              <ul className="space-y-1 text-[#D8D4C7] list-disc pl-4 text-[11px]">
                <li><code className="font-bold font-mono text-[#C5A059]">name</code>: Name der Stärke (Pflicht)</li>
                <li><code className="font-bold font-mono text-[#C5A059]">cost</code>: Punktekosten (number, meist 1 bis 3)</li>
                <li><code className="font-bold font-mono text-[#C5A059]">max</code>: Max. wählbar (Standard 1)</li>
                <li><code className="font-bold font-mono text-[#C5A059]">multi</code>: Mehrfach wählbar (boolean)</li>
                <li><code className="font-bold font-mono text-[#C5A059]">onlyCreation</code>: Nur bei Erschaffung (boolean)</li>
                <li><code className="font-bold font-mono text-[#C5A059]">desc</code>: Beschreibung und Effekt (Pflicht)</li>
              </ul>
            </div>

            <div className="bg-[#242A3B] p-3.5 rounded-xl border border-[#3A4258] shadow-xs space-y-2 text-xs">
              <h5 className="font-bold text-[#F5F2EA]">Schwächen & Ressourcen</h5>
              <ul className="space-y-1 text-[#D8D4C7] list-disc pl-4 text-[11px]">
                <li><code className="font-bold font-mono text-[#C5A059]">weaknesses[].name</code>: Name der Schwäche (Pflicht)</li>
                <li><code className="font-bold font-mono text-[#C5A059]">weaknesses[].desc</code>: Regelabzüge & Auswirkung</li>
                <li><code className="font-bold font-mono text-[#C5A059]">gameResources[].name</code>: Ressourcenname (Pflicht)</li>
                <li><code className="font-bold font-mono text-[#C5A059]">gameResources[].desc</code>: Stufeneffekte & Boni</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* SECTION: TEMPLATE JSON */}
      {activeSpecSection === 'template' && (
        <div className="bg-[#242A3B] p-4 rounded-xl border border-[#3A4258] shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[#F5F2EA]">
              <FileCode size={18} className="text-[#C5A059]" />
              <h4 className="font-bold text-sm">Vollständige Starter-Vorlage (JSON)</h4>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyTemplate}
                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-[#C5A059]/60 text-[#E6E1D3] bg-[#161B26] hover:bg-[#202636] hover:border-[#C5A059] flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                {copiedTemplate ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} className="text-[#C5A059]" />}
                <span>{copiedTemplate ? 'Kopiert!' : 'In Zwischenablage'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[#0f2340] text-[#f3e5cf] hover:bg-[#1B365D] border border-[#C5A059] flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
              >
                <Download size={14} className="text-[#C5A059]" />
                <span>Als .json herunterladen</span>
              </button>
            </div>
          </div>

          <p className="text-xs text-[#A3A096]">
            Nutze diese Vorlage als Ausgangspunkt für dein eigenes Regelmodul. Du kannst sie in einem
            beliebigen Texteditor anpassen und anschließend im Live-Validierer prüfen oder direkt importieren.
          </p>

          <pre className="p-3 bg-[#11141C] text-[#D8D4C7] rounded-lg text-xs font-mono overflow-x-auto max-h-[380px] custom-scrollbar border border-[#3A4258]">
            {JSON.stringify(STARTER_MODULE_TEMPLATE, null, 2)}
          </pre>
        </div>
      )}

      {/* SECTION: LIVE VALIDATOR & IMPORTER */}
      {activeSpecSection === 'validator' && (
        <div className="bg-[#242A3B] p-4 rounded-xl border border-[#3A4258] shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[#F5F2EA]">
              <Play size={18} className="text-[#C5A059]" />
              <h4 className="font-bold text-sm font-serif">
                Live Modul-Validierer & Sofort-Installer
              </h4>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setValidatorInput(JSON.stringify(STARTER_MODULE_TEMPLATE, null, 2))}
                className="px-2.5 py-1 text-xs font-medium rounded border border-[#3A4258] hover:bg-white/5 text-[#A3A096] hover:text-[#F5F2EA] cursor-pointer"
              >
                Muster laden
              </button>
              <button
                type="button"
                onClick={handleRunValidation}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[#332A19] border border-[#C5A059] text-[#FBEFCE] hover:bg-[#433722] flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
              >
                <Play size={14} className="text-[#C5A059]" />
                <span>Schema & Syntax prüfen</span>
              </button>
            </div>
          </div>

          <p className="text-xs text-[#A3A096]">
            Füge hier deinen Modul-JSON-Code ein. Der Validierer prüft Struktur, Pflichtfelder und Typen
            gemäß Spezifikation und erlaubt die direkte Installation.
          </p>

          <textarea
            value={validatorInput}
            onChange={(e) => setValidatorInput(e.target.value)}
            rows={10}
            className="w-full p-3 font-mono text-xs bg-[#161B26] border border-[#3A4258] focus:border-[#C5A059] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#C5A059] text-[#E6E1D3]"
            placeholder="JSON-Modulpaket hier einfügen..."
          />

          {/* Validation Feedback */}
          {validationResult && (
            <div
              className={`p-3 rounded-xl border text-xs ${
                validationResult.isValid
                  ? 'bg-emerald-950/40 border-emerald-800 text-emerald-200'
                  : 'bg-red-950/40 border-red-800 text-red-200'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 font-bold text-sm">
                  {validationResult.isValid ? (
                    <>
                      <CheckCircle2 className="text-emerald-400" size={18} />
                      <span className="text-emerald-300">Modul ist vollständig valide!</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="text-red-400" size={18} />
                      <span className="text-red-300">Validierungsfehler gefunden ({validationResult.errors.length})</span>
                    </>
                  )}
                </div>

                {validationResult.isValid && validationResult.sanitizedPackage && (
                  <button
                    type="button"
                    onClick={handleInstallValidatedModule}
                    className="px-3 py-1.5 font-bold rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <span>Jetzt als Modul installieren</span>
                    <ArrowRight size={14} />
                  </button>
                )}
              </div>

              {/* Summary Counts */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-2 pt-2 border-t border-white/10 text-[11px]">
                <div className="bg-[#161B26]/60 p-1.5 rounded border border-white/5">
                  <span className="font-semibold block text-[#A3A096]">Zauber:</span>
                  <span className="font-bold text-base text-[#F5F2EA]">{validationResult.summary.spellsCount}</span>
                </div>
                <div className="bg-[#161B26]/60 p-1.5 rounded border border-white/5">
                  <span className="font-semibold block text-[#A3A096]">Meisterschaften:</span>
                  <span className="font-bold text-base text-[#F5F2EA]">{validationResult.summary.masteriesCount}</span>
                </div>
                <div className="bg-[#161B26]/60 p-1.5 rounded border border-white/5">
                  <span className="font-semibold block text-[#A3A096]">Stärken:</span>
                  <span className="font-bold text-base text-[#F5F2EA]">{validationResult.summary.strengthsCount}</span>
                </div>
                <div className="bg-[#161B26]/60 p-1.5 rounded border border-white/5">
                  <span className="font-semibold block text-[#A3A096]">Schwächen:</span>
                  <span className="font-bold text-base text-[#F5F2EA]">{validationResult.summary.weaknessesCount}</span>
                </div>
                <div className="bg-[#161B26]/60 p-1.5 rounded border border-white/5">
                  <span className="font-semibold block text-[#A3A096]">Ressourcen:</span>
                  <span className="font-bold text-base text-[#F5F2EA]">{validationResult.summary.resourcesCount}</span>
                </div>
              </div>

              {/* Error messages if any */}
              {validationResult.errors.length > 0 && (
                <div className="mt-2 pt-2 border-t border-red-800/60 space-y-1">
                  <span className="font-bold text-red-300 flex items-center gap-1">
                    <ShieldAlert size={14} /> Behebe folgende Fehler:
                  </span>
                  <ul className="list-disc pl-5 space-y-0.5 text-red-300 text-[11px]">
                    {validationResult.errors.map((err, i) => (
                      <li key={i}>
                        <span className="font-mono font-semibold">[{err.field}]:</span> {err.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Warnings if any */}
              {validationResult.warnings.length > 0 && (
                <div className="mt-2 pt-2 border-t border-amber-800/60 space-y-1">
                  <span className="font-bold text-[#FBEFCE] flex items-center gap-1">
                    <AlertCircle size={14} className="text-[#C5A059]" /> Hinweise:
                  </span>
                  <ul className="list-disc pl-5 space-y-0.5 text-[#E6E1D3] text-[11px]">
                    {validationResult.warnings.map((w, i) => (
                      <li key={i}>
                        <span className="font-mono font-semibold">[{w.field}]:</span> {w.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
