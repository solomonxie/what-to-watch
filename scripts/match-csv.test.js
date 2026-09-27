/**
 * Pins every row of an import CSV to a TMDB id, using the app's own parser
 * and matcher against live TMDB. Nothing is imported. Writes <out> with
 * `tmdb` and `type` filled, plus <out>.unmatched.csv for rows still unresolved.
 *
 *   MATCH_CSV=~/Downloads/douban-movies.csv MATCH_OUT=~/Downloads/douban-matched.csv \
 *     npx jest scripts/match-csv.test.js
 *
 * TMDB key from TMDB_API_KEY or .env.local. Skipped when MATCH_CSV is unset.
 */
jest.mock('../src/secureStorage/apiKeyStore', () => ({
  getApiKey: async id => require('../test-support/liveKeys')[id] ?? null,
}));

import { readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { parseCsv } from '../src/libraryImport/csv';
import { parseImportCsv } from '../src/libraryImport/formats';
import { resolveEntry } from '../src/libraryImport/resolve';

const expand = p => p?.replace(/^~(?=\/)/, homedir());
const input = expand(process.env.MATCH_CSV);
const output =
  expand(process.env.MATCH_OUT) ?? input?.replace(/\.csv$/, '-matched.csv');
const CONCURRENCY = 6;

const cell = v => {
  const s = v == null ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const toCsv = (rows, columns) =>
  '﻿' +
  [columns, ...rows.map(r => columns.map(c => r[c]))]
    .map(line => line.map(cell).join(','))
    .join('\n') +
  '\n';

(input ? it : it.skip)(
  'matches every row to TMDB',
  async () => {
    const text = readFileSync(input, 'utf8');
    const [header, ...cells] = parseCsv(text);
    const headers = header.map(h => h.trim());
    const rows = cells.map(c =>
      Object.fromEntries(headers.map((h, i) => [h, c[i] ?? ''])),
    );
    const { entries } = parseImportCsv(text);
    if (entries.length !== rows.length)
      throw new Error(`Parsed ${entries.length} of ${rows.length} rows`);

    const out = rows.map(r => ({ ...r }));
    let next = 0;
    let done = 0;
    const worker = async () => {
      for (let i = next++; i < entries.length; i = next++) {
        const match = await resolveEntry(entries[i]).catch(() => null);
        if (match) {
          out[i].tmdb = match.details.externalId;
          out[i].type = match.details.mediaType;
          out[i].matched_title = match.details.title;
          out[i].matched_year = match.details.releaseDate?.slice(0, 4) ?? '';
        }
        if (++done % 100 === 0)
          process.stdout.write(`  ${done}/${entries.length}\n`);
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));

    const columns = Array.from(
      new Set([...headers, 'tmdb', 'type', 'matched_title', 'matched_year']),
    );
    const unmatched = out.filter(r => !r.tmdb);
    writeFileSync(output, toCsv(out, columns));
    writeFileSync(
      output.replace(/\.csv$/, '.unmatched.csv'),
      toCsv(unmatched, headers),
    );
    console.log(
      `${out.length - unmatched.length}/${out.length} matched → ${output}\n` +
        `${unmatched.length} unmatched → ${output.replace(
          /\.csv$/,
          '.unmatched.csv',
        )}`,
    );
  },
  60 * 60 * 1000,
);
