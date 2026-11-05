import { useState, useEffect, useCallback } from 'react';
import {
  getModules,
  saveModules,
  toggleModuleActive,
  removeModule,
  importRulebookModule,
  exportModuleAsJson,
  getPackageById,
  getCustomPackages,
  getOverrides,
  saveOverride,
  resetOverride,
  resetAllOverrides,
  getOverridesCount,
  getResolvedSpells,
  getResolvedMasteries,
  getResolvedStrengths,
  getResolvedWeaknesses,
  getResolvedResources,
  type GameModule,
  type ResourceCategory,
  type ResourceOverride,
} from '../utils/gameResourceManager';
import type { RulebookModulePackage } from '../types/rulebookSchema';

export function useGameResources() {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const handleUpdate = () => {
      setVersion((v) => v + 1);
    };
    window.addEventListener('splittermond-resources-changed', handleUpdate);
    return () => window.removeEventListener('splittermond-resources-changed', handleUpdate);
  }, []);

  const modules = getModules();
  const overrides = getOverrides();
  const counts = getOverridesCount();
  const customPackages = getCustomPackages();

  const handleSaveOverride = useCallback(
    (type: ResourceCategory, name: string, description: string, secondaryKey?: string) => {
      saveOverride(type, name, description, secondaryKey);
    },
    [],
  );

  const handleResetOverride = useCallback(
    (type: ResourceCategory, name: string, secondaryKey?: string) => {
      resetOverride(type, name, secondaryKey);
    },
    [],
  );

  const handleResetAllOverrides = useCallback(() => {
    resetAllOverrides();
  }, []);

  const handleToggleModule = useCallback((moduleId: string) => {
    toggleModuleActive(moduleId);
  }, []);

  const handleImportModule = useCallback((raw: unknown) => {
    return importRulebookModule(raw);
  }, []);

  const handleRemoveModule = useCallback((moduleId: string) => {
    return removeModule(moduleId);
  }, []);

  const handleExportModule = useCallback((moduleId: string) => {
    return exportModuleAsJson(moduleId);
  }, []);

  return {
    version,
    modules,
    overrides,
    counts,
    customPackages,
    saveOverride: handleSaveOverride,
    resetOverride: handleResetOverride,
    resetAllOverrides: handleResetAllOverrides,
    toggleModule: handleToggleModule,
    importModule: handleImportModule,
    removeModule: handleRemoveModule,
    exportModule: handleExportModule,
    getPackageById,
    getResolvedSpells,
    getResolvedMasteries,
    getResolvedStrengths,
    getResolvedWeaknesses,
    getResolvedResources,
  };
}
