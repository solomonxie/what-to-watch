import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { searchIndex } from '../../search/fuseIndex';
import { fetchAndCacheTitle, searchOnline } from '../../catalog/catalogService';
import { isProviderActive } from '../../providers/providerRegistry';
import { EmptyState, Poster, SectionLabel } from '../../ui/components';
import { joinMeta, mediaLabel, score10, year } from '../../ui/format';
import { space, type, useColors } from '../../ui/theme';
import type { ProviderSearchResult } from '../../types/domain';

const DEBOUNCE_MS = 350;

type Online =
  | { kind: 'noKey' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; results: ProviderSearchResult[] };

interface Props {
  query: string;
  region: string;
  onOpen: (titleId: string) => void;
}

export function SearchResults({ query, region, onOpen }: Props) {
  const c = useColors();
  const local = searchIndex(query).slice(0, 8);
  const [online, setOnline] = useState<Online>({ kind: 'loading' });
  const [opening, setOpening] = useState<string | null>(null);
  const [openError, setOpenError] = useState<{
    key: string;
    message: string;
  } | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setOnline({ kind: 'loading' });
    const timer = setTimeout(async () => {
      try {
        if (!(await isProviderActive('tmdb'))) {
          if (!cancelled) setOnline({ kind: 'noKey' });
          return;
        }
        const results = await searchOnline(query);
        if (!cancelled) setOnline({ kind: 'ready', results });
      } catch (e) {
        if (!cancelled) setOnline({ kind: 'error', message: String(e) });
      }
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, attempt]);

  const localIds = new Set(local.map(t => t.id));
  const remote =
    online.kind === 'ready'
      ? online.results.filter(
          r => !localIds.has(`${r.mediaType}:${r.externalId}`),
        )
      : [];

  const openRemote = async (r: ProviderSearchResult) => {
    const key = `${r.mediaType}:${r.externalId}`;
    setOpening(key);
    setOpenError(null);
    try {
      onOpen(await fetchAndCacheTitle(r.externalId, r.mediaType, region));
    } catch (e) {
      setOpenError({
        key,
        message: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setOpening(null);
    }
  };

  const nothing =
    local.length === 0 && online.kind === 'ready' && remote.length === 0;

  return (
    <ScrollView
      style={{ backgroundColor: c.background }}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      {nothing ? <EmptyState message={`No results for "${query}"`} /> : null}

      {local.length > 0 ? <SectionLabel>In your library</SectionLabel> : null}
      {local.map(t => (
        <ResultRow
          key={t.id}
          title={t.title}
          posterPath={t.posterPath}
          meta={joinMeta([
            year(t.releaseDate),
            t.mediaType && mediaLabel(t.mediaType),
            score10(t.primaryRatingScore) &&
              `★ ${score10(t.primaryRatingScore)}`,
          ])}
          onPress={() => onOpen(t.id)}
        />
      ))}

      {nothing ? null : <SectionLabel>On TMDB</SectionLabel>}
      {online.kind === 'noKey' ? (
        <Text style={[styles.note, { color: c.secondary }]}>
          Connect TMDB to search everything.
        </Text>
      ) : online.kind === 'loading' ? (
        <ActivityIndicator style={styles.spinner} />
      ) : online.kind === 'error' ? (
        <Pressable onPress={() => setAttempt(a => a + 1)}>
          <Text style={[styles.note, { color: c.danger }]}>
            ⚠ {online.message} · Retry
          </Text>
        </Pressable>
      ) : (
        remote.map(r => {
          const key = `${r.mediaType}:${r.externalId}`;
          return (
            <ResultRow
              key={key}
              title={r.title}
              posterPath={r.posterPath}
              meta={joinMeta([
                r.year && String(r.year),
                mediaLabel(r.mediaType),
              ])}
              busy={opening === key}
              error={openError?.key === key ? openError.message : undefined}
              disabled={opening !== null}
              onPress={() => openRemote(r)}
            />
          );
        })
      )}
    </ScrollView>
  );
}

function ResultRow({
  title,
  posterPath,
  meta,
  busy,
  error,
  disabled,
  onPress,
}: {
  title: string;
  posterPath?: string | null;
  meta: string;
  busy?: boolean;
  error?: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.row,
        pressed && { backgroundColor: c.chip },
      ]}
    >
      <Poster uri={posterPath} title="" width={44} radius={6} />
      <View style={styles.rowText}>
        <Text style={[type.body, { color: c.text }]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={[type.meta, { color: c.secondary }]}>{meta}</Text>
        {error ? (
          <Text style={[type.meta, { color: c.danger }]} numberOfLines={2}>
            {error}
          </Text>
        ) : null}
      </View>
      {busy ? (
        <ActivityIndicator />
      ) : (
        <Text style={[styles.chevron, { color: c.tertiary }]}>›</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.m,
    paddingHorizontal: space.l,
    paddingVertical: space.s,
  },
  rowText: { flex: 1, gap: 2 },
  chevron: { fontSize: 24 },
  note: { paddingHorizontal: space.l, fontSize: 15 },
  spinner: { marginTop: space.l },
});
