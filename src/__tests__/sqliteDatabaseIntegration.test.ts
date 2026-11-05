import fs from 'fs';
import path from 'path';
import { describe, it, expect } from 'vitest';
import { SPELLS_DB } from '../data/spells';
import { MASTERIES_DB, GENERAL_COMBAT_MASTERIES, GENERAL_MAGIC_MASTERIES } from '../data/masteries';
import { STRENGTHS_DATA } from '../data/strengths';
import { WEAKNESSES_DATA, WEAKNESS_DESCRIPTIONS } from '../data/weaknesses';
import { PREDEFINED_RESOURCES, RESOURCE_DESCRIPTIONS } from '../data/resources';
import { WEAPONS_DATA, ARMORS_DATA, SHIELDS_DATA, ALL_EQUIPMENT } from '../data/equipment';
import {
  getSqliteDatabase,
  executeRawSql,
  getDatabaseMetadata,
  queryEntriesByCategory,
} from '../services/sqliteService';

const dbPath = path.resolve(process.cwd(), 'src/data/splittermond_grw.sqlite');
const sqliteExists = fs.existsSync(dbPath);

describe('Splittermond SQLite Database Integration', () => {
  it.skipIf(!sqliteExists)('connects to src/data/splittermond_grw.sqlite and queries metadata', async () => {
    const meta = await getDatabaseMetadata();
    expect(meta.format).toMatch(/splittermond-sqlite-v[12]/);
    expect(meta.catalogSchema).toBe('splittermond-catalog-v1');
    expect(meta.totalEntries).toBeGreaterThanOrEqual(1200);
    expect(meta.totalSources).toBeGreaterThanOrEqual(20000);

    // Verify prerequisites table exists
    const prereqTable = meta.tables.find((t) => t.name === 'prerequisites');
    expect(prereqTable).toBeDefined();
    expect(prereqTable?.count).toBeGreaterThanOrEqual(200);

    const categoriesMap = Object.fromEntries(meta.categories.map((c) => [c.category, c.count]));
    expect(categoriesMap['meisterschaften']).toBe(437);
    expect(categoriesMap['zauber']).toBe(278);
    expect(categoriesMap['staerken']).toBe(43);
    expect(categoriesMap['schwaechen']).toBe(20);
    expect(categoriesMap['ressourcen']).toBe(10);
    expect(categoriesMap['waffen']).toBe(67);
  });

  it.skipIf(!sqliteExists)('executes live SQL queries successfully via executeRawSql', async () => {
    const res = await executeRawSql(
      "SELECT name, category FROM entries WHERE category = 'waffen' ORDER BY name ASC LIMIT 5;"
    );
    expect(res.error).toBeUndefined();
    expect(res.rowCount).toBe(5);
    expect(res.columns).toEqual(['name', 'category']);
    expect(res.rows.length).toBe(5);
    expect(res.rows[0][1]).toBe('waffen');
  });

  it.skipIf(!sqliteExists)('queries entries by category with search filter', async () => {
    const fireSpells = await queryEntriesByCategory('zauber', 'Feuer', 10);
    expect(fireSpells.length).toBeGreaterThan(0);
    expect(fireSpells[0].category).toBe('zauber');
  });

  it('verifies complete dataset generated from SQLite database', () => {
    // Spells: 278 unique spells mapped across schools (419 instances)
    expect(SPELLS_DB.length).toBe(419);
    const uniqueSpellNames = new Set(SPELLS_DB.map((s) => s.name));
    expect(uniqueSpellNames.size).toBe(278);

    // Masteries: 437 masteries across skills and general combat/magic
    const skillMasteriesCount = Object.values(MASTERIES_DB).reduce((acc, list) => acc + list.length, 0);
    const totalMasteries = skillMasteriesCount + GENERAL_COMBAT_MASTERIES.length + GENERAL_MAGIC_MASTERIES.length;
    expect(totalMasteries).toBe(437);
    expect(GENERAL_COMBAT_MASTERIES.length).toBe(14);
    expect(GENERAL_MAGIC_MASTERIES.length).toBe(10);

    // Strengths: 43
    expect(STRENGTHS_DATA.length).toBe(43);

    // Weaknesses: 20
    expect(WEAKNESSES_DATA.length).toBe(20);
    expect(Object.keys(WEAKNESS_DESCRIPTIONS).length).toBe(20);

    // Resources: 10
    expect(PREDEFINED_RESOURCES.length).toBe(10);
    expect(Object.keys(RESOURCE_DESCRIPTIONS).length).toBe(10);

    // Equipment: 67 weapons, 10 armors, 5 shields
    expect(WEAPONS_DATA.length).toBe(67);
    expect(ARMORS_DATA.length).toBe(10);
    expect(SHIELDS_DATA.length).toBe(5);
    expect(ALL_EQUIPMENT.length).toBeGreaterThan(140);
  });
});
