import React, { useState } from 'react';
import { Alert } from 'react-native';
import { keepLocalCopy, pick, types } from '@react-native-documents/picker';
import { parseImportCsv, type CsvFormat } from '../../libraryImport/formats';
import { runImport } from '../../libraryImport/importService';
import { isProviderActive } from '../../providers/providerRegistry';
import { Row } from '../../ui/components';
import { t, tf } from '../../i18n';

const isCancel = (e: unknown) =>
  (e as { code?: string })?.code === 'OPERATION_CANCELED' ||
  /cancel/i.test(String(e));

async function readCsv(): Promise<{ text: string; name: string }> {
  const [file] = await pick({ type: [types.csv, types.plainText] });
  const [copy] = await keepLocalCopy({
    files: [{ uri: file.uri, fileName: file.name ?? 'import.csv' }],
    destination: 'cachesDirectory',
  });
  if (copy.status !== 'success')
    throw new Error(t('Could not read the selected file'));
  return {
    text: await (await fetch(copy.localUri)).text(),
    name: file.name ?? '',
  };
}

export function CsvImportRow({
  label,
  hint,
  format,
  source,
}: {
  label: string;
  hint: string;
  format: CsvFormat;
  /** Name shown in the result. */
  source: string;
}) {
  const [progress, setProgress] = useState<string | null>(null);

  const run = async () => {
    try {
      if (!(await isProviderActive('tmdb')))
        throw new Error(t('Connect TMDB first — it is used to match titles.'));
      const file = await readCsv();
      setProgress(t('Reading…'));
      const parsed = parseImportCsv(file.text, file.name, format);
      if (parsed.entries.length === 0)
        throw new Error(t('Nothing to import in that file.'));
      const s = await runImport(parsed, (done, total) =>
        setProgress(`${done} / ${total}`),
      );
      const notFound = s.unmatched.length
        ? '\n\n' +
          tf('Not found ({0}): ', s.unmatched.length) +
          s.unmatched
            .slice(0, 10)
            .map(e => e.titles[0])
            .join(', ') +
          (s.unmatched.length > 10 ? '…' : '')
        : '';
      Alert.alert(
        tf('Imported from {0}', source),
        tf(
          'Added {0} of {1}: {2} watched, {3} to watch, {4} ratings.',
          s.imported,
          s.total,
          s.watched,
          s.toWatch,
          s.rated,
        ) +
          (s.episodes
            ? ' ' + tf('{0} single episodes marked watched.', s.episodes)
            : '') +
          (s.skipped
            ? ' ' + tf('{0} already in your library.', s.skipped)
            : '') +
          (s.ignored
            ? ' ' + tf('{0} skipped (not movies or shows).', s.ignored)
            : '') +
          notFound,
      );
    } catch (e) {
      if (!isCancel(e))
        Alert.alert(
          t('Import failed'),
          e instanceof Error ? e.message : String(e),
        );
    } finally {
      setProgress(null);
    }
  };

  return (
    <Row
      label={label}
      subtitle={hint}
      value={progress ?? undefined}
      onPress={progress ? undefined : run}
    />
  );
}
