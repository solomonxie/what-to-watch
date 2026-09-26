import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable,
} from 'react-native';
import { keepLocalCopy, pick, types } from '@react-native-documents/picker';
import { parseImportCsv } from '../../libraryImport/formats';
import { fetchFeed } from '../../libraryImport/rss';
import {
  runImport,
  type ImportSummary,
} from '../../libraryImport/importService';
import { isProviderActive } from '../../providers/providerRegistry';
import {
  FLOATING_CLEARANCE,
  GroupedSection,
  Row,
  SectionLabel,
} from '../../ui/components';
import { space, type, useColors } from '../../ui/theme';
import type { ParsedImport } from '../../libraryImport/types';

type Phase =
  | { kind: 'idle' }
  | { kind: 'reading' }
  | { kind: 'matching'; source: string; done: number; total: number }
  | { kind: 'done'; summary: ImportSummary }
  | { kind: 'error'; message: string };

const isCancel = (e: unknown) =>
  (e as { code?: string })?.code === 'OPERATION_CANCELED' ||
  /cancel/i.test(String(e));

export function ImportScreen() {
  const c = useColors();
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [link, setLink] = useState('');
  const busy = phase.kind === 'reading' || phase.kind === 'matching';

  const run = async (load: () => Promise<ParsedImport>) => {
    try {
      if (!(await isProviderActive('tmdb'))) {
        throw new Error(
          'Connect TMDB in Settings first — it is used to match titles.',
        );
      }
      setPhase({ kind: 'reading' });
      const parsed = await load();
      if (parsed.entries.length === 0)
        throw new Error('Nothing to import in that source.');
      setPhase({
        kind: 'matching',
        source: parsed.source,
        done: 0,
        total: parsed.entries.length,
      });
      const summary = await runImport(parsed, (done, total) =>
        setPhase({ kind: 'matching', source: parsed.source, done, total }),
      );
      setPhase({ kind: 'done', summary });
    } catch (e) {
      if (isCancel(e)) setPhase({ kind: 'idle' });
      else
        setPhase({
          kind: 'error',
          message: e instanceof Error ? e.message : String(e),
        });
    }
  };

  const fromFile = () =>
    run(async () => {
      const [file] = await pick({ type: [types.csv, types.plainText] });
      const [copy] = await keepLocalCopy({
        files: [{ uri: file.uri, fileName: file.name ?? 'import.csv' }],
        destination: 'cachesDirectory',
      });
      if (copy.status !== 'success')
        throw new Error('Could not read the selected file');
      const text = await (await fetch(copy.localUri)).text();
      return parseImportCsv(text, file.name ?? '');
    });

  return (
    <ScrollView
      style={{ backgroundColor: c.groupedBackground }}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.content}
    >
      <GroupedSection
        header="From a file"
        footer="Douban movie exports, IMDb ratings or watchlist, Letterboxd watched/ratings/watchlist/diary. The format is detected automatically."
      >
        <Row label="Choose CSV…" onPress={busy ? undefined : fromFile} />
      </GroupedSection>

      <SectionLabel style={styles.label}>From a link</SectionLabel>
      <View style={[styles.linkRow, { backgroundColor: c.card }]}>
        <TextInput
          style={[type.body, styles.input, { color: c.text }]}
          value={link}
          onChangeText={setLink}
          placeholder="letterboxd.com/you or douban.com/people/you"
          placeholderTextColor={c.tertiary}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
        <Pressable
          disabled={busy || !link.trim()}
          onPress={() => run(() => fetchFeed(link))}
          hitSlop={8}
        >
          <Text
            style={[
              type.body,
              { color: link.trim() && !busy ? c.accent : c.tertiary },
            ]}
          >
            Import
          </Text>
        </Pressable>
      </View>
      <Text style={[type.meta, styles.footer, { color: c.secondary }]}>
        Reads the public feed: Letterboxd gives your recent diary, Douban your
        latest marks (about 10). Use a file for your full history.
      </Text>

      <Status phase={phase} />
    </ScrollView>
  );
}

function Status({ phase }: { phase: Phase }) {
  const c = useColors();
  if (phase.kind === 'idle') return null;
  if (phase.kind === 'reading') {
    return (
      <Text style={[type.body, styles.status, { color: c.secondary }]}>
        Reading…
      </Text>
    );
  }
  if (phase.kind === 'error') {
    return (
      <Text style={[type.body, styles.status, { color: c.danger }]}>
        ⚠ {phase.message}
      </Text>
    );
  }
  if (phase.kind === 'matching') {
    const pct = phase.total ? phase.done / phase.total : 0;
    return (
      <View style={styles.status}>
        <Text style={[type.body, { color: c.text }]}>
          Matching {phase.source} titles · {phase.done} / {phase.total}
        </Text>
        <View style={[styles.track, { backgroundColor: c.chip }]}>
          <View
            style={[
              styles.bar,
              { backgroundColor: c.accent, width: `${pct * 100}%` },
            ]}
          />
        </View>
      </View>
    );
  }
  const s = phase.summary;
  return (
    <>
      <GroupedSection header={`Imported from ${s.source}`}>
        <Row label="Added" value={`${s.imported} of ${s.total}`} />
        <Row label="Watched" value={String(s.watched)} />
        <Row label="To watch" value={String(s.toWatch)} />
        {s.watching ? (
          <Row label="Watching" value={String(s.watching)} />
        ) : null}
        <Row label="Ratings" value={String(s.rated)} />
        {s.skipped ? (
          <Row label="Already in library" value={String(s.skipped)} />
        ) : null}
      </GroupedSection>
      {s.unmatched.length ? (
        <GroupedSection
          header={`Not found (${s.unmatched.length})`}
          footer="Search these by hand — titles or years didn't match TMDB closely enough."
        >
          {s.unmatched.slice(0, 50).map((e, i) => (
            <Row
              key={i}
              label={e.titles[0]}
              value={e.year ? String(e.year) : undefined}
            />
          ))}
        </GroupedSection>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: FLOATING_CLEARANCE },
  label: { paddingHorizontal: space.l * 2 },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: space.l,
    borderRadius: 12,
    paddingHorizontal: space.l,
    gap: space.m,
  },
  input: { flex: 1, paddingVertical: 12 },
  footer: {
    paddingHorizontal: space.l * 2,
    paddingTop: space.s,
    lineHeight: 18,
  },
  status: {
    paddingHorizontal: space.l * 2,
    paddingTop: space.xl,
    gap: space.s,
  },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  bar: { height: 6 },
});
