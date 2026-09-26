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
import { TitleCard } from '../title/TitleCard';
import type { ProviderSearchResult } from '../../types/domain';

const DEBOUNCE_MS = 400;

type OnlineState =
  | { kind: 'noKey' }
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'ready'; results: ProviderSearchResult[] };

interface Props {
  query: string;
  region: string;
  onSelectTitle: (titleId: string) => void;
}

export function SearchResultsOverlay({ query, region, onSelectTitle }: Props) {
  const local = searchIndex(query);
  const [online, setOnline] = useState<OnlineState>({ kind: 'loading' });
  const [openingKey, setOpeningKey] = useState<string | null>(null);
  const [openError, setOpenError] = useState<{
    key: string;
    message: string;
  } | null>(null);

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
      } catch {
        if (!cancelled) setOnline({ kind: 'error' });
      }
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const openOnline = async (result: ProviderSearchResult) => {
    const key = `${result.mediaType}:${result.externalId}`;
    setOpeningKey(key);
    setOpenError(null);
    try {
      const id = await fetchAndCacheTitle(
        result.externalId,
        result.mediaType,
        region,
      );
      onSelectTitle(id);
    } catch (error) {
      setOpenError({
        key,
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setOpeningKey(null);
    }
  };

  const nothing =
    local.length === 0 &&
    online.kind === 'ready' &&
    online.results.length === 0;

  return (
    <View style={styles.overlay}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        {nothing ? (
          <Text style={styles.empty}>No results for "{query}"</Text>
        ) : null}

        {local.length > 0 ? (
          <>
            <Text style={styles.heading}>IN YOUR LIBRARY</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {local.map(item => (
                <TitleCard
                  key={item.id}
                  title={item.title}
                  posterPath={item.posterPath ?? undefined}
                  onPress={() => onSelectTitle(item.id)}
                />
              ))}
            </ScrollView>
          </>
        ) : null}

        {nothing ? null : <Text style={styles.heading}>ONLINE (TMDB)</Text>}
        {online.kind === 'noKey' ? (
          <Text style={styles.hint}>
            Add a TMDB API key in Settings to search online.
          </Text>
        ) : online.kind === 'loading' ? (
          <View style={styles.inline}>
            <ActivityIndicator size="small" />
            <Text style={styles.hint}>Searching TMDB…</Text>
          </View>
        ) : online.kind === 'error' ? (
          <Text style={styles.hint}>⚠ Online search failed.</Text>
        ) : (
          online.results.map(result => {
            const key = `${result.mediaType}:${result.externalId}`;
            return (
              <View key={key} style={styles.rowWrap}>
                <Pressable
                  style={styles.row}
                  disabled={openingKey !== null}
                  onPress={() => openOnline(result)}
                >
                  <Text style={styles.rowText} numberOfLines={1}>
                    {result.title}
                    <Text style={styles.rowMeta}>
                      {result.year ? ` · ${result.year}` : ''} ·{' '}
                      {result.mediaType === 'tv' ? 'TV' : 'Movie'}
                    </Text>
                  </Text>
                  {openingKey === key ? (
                    <ActivityIndicator size="small" />
                  ) : openError?.key === key ? (
                    <Text style={styles.error}>⚠ Retry</Text>
                  ) : (
                    <Text style={styles.chevron}>›</Text>
                  )}
                </Pressable>
                {openError?.key === key ? (
                  <Text style={styles.errorDetail} selectable>
                    {openError.message}
                  </Text>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: 'white' },
  content: { padding: 16 },
  heading: {
    fontSize: 12,
    fontWeight: '700',
    color: '#666',
    marginTop: 12,
    marginBottom: 8,
  },
  hint: { color: '#888', fontSize: 13 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  empty: { color: '#888', fontSize: 14, marginTop: 24, textAlign: 'center' },
  rowWrap: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  errorDetail: { color: '#c00', fontSize: 12, paddingBottom: 10 },
  rowText: { flex: 1, fontSize: 15, fontWeight: '500' },
  rowMeta: { color: '#888', fontWeight: '400' },
  chevron: { color: '#bbb', fontSize: 20 },
  error: { color: '#c00', fontSize: 13 },
});
