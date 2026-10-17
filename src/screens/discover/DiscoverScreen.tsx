import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PLATFORMS, DEFAULT_REGION } from '../../config/platforms';
import { useSettingsStore } from '../../state/settingsStore';
import {
  applyFilters,
  countActiveFilters,
  sortTitles,
  useFilterStore,
} from '../../state/filterStore';
import {
  fillCertifications,
  refreshSearchIndex,
} from '../../catalog/catalogService';
import { getTitlesByIds } from '../../db/repositories/titlesRepo';
import { isProviderActive } from '../../providers/providerRegistry';
import { hasTaste, usePrefsStore } from '../../prefs/prefsStore';
import { readRecsCache, recsNeedRefresh } from '../../recs/recsService';
import {
  Chip,
  ChipRow,
  EmptyState,
  FilterButton,
  BOTTOM_CLEARANCE,
  PosterGrid,
  SectionLabel,
} from '../../ui/components';
import { ago, joinMeta, mediaLabel, score10 } from '../../ui/format';
import { space, type, useColors } from '../../ui/theme';
import { hasServerFilters } from '../../catalog/filterQueries';
import {
  cachedPicks,
  filtered,
  freshPicks,
  popular,
  type Feed,
  type FeedItem,
} from './feed';
import type { DiscoverStackParamList } from '../../navigation/types';
import { t, tf } from '../../i18n';

type Props = NativeStackScreenProps<DiscoverStackParamList, 'DiscoverHome'>;
type Status = 'loading' | 'ready' | 'error' | 'noKey';

const ALL = 'all';

export function DiscoverScreen({ navigation }: Props) {
  const c = useColors();
  const { settings, load: loadSettings } = useSettingsStore();
  const { filters, sort, resetFilters } = useFilterStore();
  const [scopeId, setScopeId] = useState<string>(ALL);
  const [feed, setFeed] = useState<Feed | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [checkingAges, setCheckingAges] = useState(false);
  const [matches, setMatches] = useState<FeedItem[] | null>(null);
  const [matching, setMatching] = useState(false);
  const request = useRef(0);

  const region = settings?.defaultRegion ?? DEFAULT_REGION;
  const platforms = useMemo(
    () => PLATFORMS.filter(p => settings?.enabledPlatformIds.includes(p.id)),
    [settings?.enabledPlatformIds],
  );
  const scope = platforms.find(p => p.id === scopeId) ?? null;
  const activeFilters =
    countActiveFilters(filters) + (sort.key !== 'popularity' ? 1 : 0);

  useEffect(() => {
    loadSettings();
    refreshSearchIndex().catch(() => {});
  }, [loadSettings]);

  const load = useCallback(
    async (force = false) => {
      if (!settings) return;
      const id = ++request.current;
      const current = () => id === request.current;
      if (!(await isProviderActive('tmdb'))) {
        setStatus('noKey');
        return;
      }
      const prefs = await usePrefsStore.getState().load();

      if (!hasTaste(prefs)) {
        try {
          const next = await popular(scope, platforms, region, force);
          if (current()) {
            setFeed(next);
            setStatus('ready');
          }
        } catch {
          if (current()) setStatus('error');
        }
        return;
      }

      // Picks: show what's cached at once, refresh behind it when stale.
      const cached = await cachedPicks(scope);
      if (!current()) return;
      if (cached) {
        setFeed(cached);
        setStatus('ready');
      }
      const stale =
        force ||
        !cached ||
        (await recsNeedRefresh(await readRecsCache(scope), prefs, scope));
      if (!stale || !current()) return;
      setUpdating(true);
      setUpdateError(false);
      try {
        const fresh = await freshPicks(scope);
        if (current()) {
          setFeed(fresh);
          setStatus('ready');
        }
      } catch {
        if (current()) {
          if (cached) setUpdateError(true);
          else setStatus('error');
        }
      } finally {
        if (current()) setUpdating(false);
      }
    },
    [settings, scope, platforms, region],
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // Ratings/rankings lack certifications; fetch them only once an age filter needs them.
  const needsAges =
    (filters.ages.length > 0 || filters.certifications.length > 0) &&
    [...(feed?.items ?? []), ...(matches ?? [])].some(
      i => i.title.certification == null,
    );
  useEffect(() => {
    if (!needsAges || !feed) return;
    let live = true;
    setCheckingAges(true);
    const titles = [...feed.items, ...(matches ?? [])].map(i => i.title);
    fillCertifications(titles, region)
      .then(async () => {
        const fresh = new Map(
          (await getTitlesByIds(titles.map(ti => ti.id))).map(ti => [
            ti.id,
            ti,
          ]),
        );
        if (!live) return;
        const withCert = (i: FeedItem): FeedItem => ({
          ...i,
          title: {
            ...i.title,
            certification: fresh.get(i.title.id)?.certification ?? '',
          },
        });
        setFeed({ ...feed, items: feed.items.map(withCert) });
        if (matches) setMatches(matches.map(withCert));
      })
      .finally(() => live && setCheckingAges(false));
    return () => {
      live = false;
    };
  }, [needsAges, feed, matches, region]);

  // Filters narrow more than the loaded feed holds; fetch matches from TMDB too.
  const serverFilters = status === 'ready' && hasServerFilters(filters);
  useEffect(() => {
    setMatches(null);
    if (!serverFilters) return;
    let live = true;
    setMatching(true);
    const timer = setTimeout(() => {
      filtered(filters, scope, platforms, region)
        .then(found => live && setMatches(found))
        .catch(() => {})
        .finally(() => live && setMatching(false));
    }, 400);
    return () => {
      live = false;
      clearTimeout(timer);
      setMatching(false);
    };
  }, [serverFilters, filters, scope, platforms, region]);

  const selectScope = (id: string) => {
    if (id === scopeId) return;
    setFeed(null);
    setStatus('loading');
    setScopeId(id);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  };

  const items = useMemo(() => {
    if (!feed) return [];
    const seen = new Set(feed.items.map(i => i.title.id));
    const all = [
      ...feed.items,
      ...(matches ?? []).filter(i => !seen.has(i.title.id)),
    ];
    const withMeta = all.map(i => ({
      title: { ...i.title, rank: i.rank, reasons: i.reasons },
      watchCount: 0,
    }));
    return sortTitles(applyFilters(withMeta, filters), sort).map(
      ({ title }) => ({
        id: title.id,
        title: title.title,
        posterPath: title.posterPath,
        badge: title.rank ? String(title.rank) : undefined,
        meta: title.reasons?.length
          ? title.reasons.join(' · ')
          : joinMeta([
              score10(title.primaryRatingScore) &&
                `★ ${score10(title.primaryRatingScore)}`,
              mediaLabel(title.mediaType),
            ]),
      }),
    );
  }, [feed, matches, filters, sort]);

  const openTitle = (titleId: string) =>
    navigation.navigate('Title', { titleId });
  const goSettings = (screen: 'ApiKey' | 'SettingsHome') =>
    navigation.getParent()?.navigate('Settings', {
      screen,
      params: screen === 'ApiKey' ? { providerId: 'tmdb' } : undefined,
    });

  const scopeName = scope?.name ?? t('your services');
  let body: React.ReactNode;
  if (platforms.length === 0) {
    body = (
      <EmptyState
        message={t('Pick your services in Settings.')}
        action={t('Choose')}
        onAction={() => goSettings('SettingsHome')}
      />
    );
  } else if (status === 'noKey') {
    body = (
      <EmptyState
        message={t("Connect TMDB to see what's streaming.")}
        action={t('Connect')}
        onAction={() => goSettings('ApiKey')}
      />
    );
  } else if (
    status === 'loading' ||
    (!feed && updating) ||
    ((checkingAges || matching) && items.length === 0)
  ) {
    body = <EmptyState loading />;
  } else if (status === 'error') {
    body = (
      <EmptyState
        message={tf("Couldn't load {0}.", scopeName)}
        action={t('Try again')}
        onAction={() => load(true)}
      />
    );
  } else if (items.length === 0) {
    body =
      feed && feed.items.length > 0 ? (
        <EmptyState
          message={t('Nothing matches your filters.')}
          action={t('Clear filters')}
          onAction={resetFilters}
        />
      ) : (
        <EmptyState
          message={t(
            'Nothing matched your taste here. Try more genres in Settings → Taste.',
          )}
          action={t('Edit taste')}
          onAction={() =>
            navigation.getParent()?.navigate('Settings', { screen: 'Taste' })
          }
        />
      );
  } else {
    body = <PosterGrid items={items} onPress={openTitle} />;
  }

  const label =
    feed?.kind === 'picks'
      ? t('Picked for you') + (scope ? ` · ${scope.name}` : '')
      : tf('Most popular · {0}', region);
  const note = checkingAges
    ? t('Checking age ratings…')
    : feed?.kind !== 'picks'
    ? null
    : updating
    ? t('Updating…')
    : updateError
    ? t("Couldn't update · showing saved picks")
    : feed.generatedAt
    ? tf('Updated {0}', ago(feed.generatedAt))
    : null;

  return (
    <ScrollView
      style={{ backgroundColor: c.background }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {platforms.length > 0 ? (
        <View style={styles.scopeRow}>
          <FilterButton
            count={activeFilters}
            onPress={() => navigation.navigate('Filters')}
          />
          <View style={[styles.divider, { backgroundColor: c.separator }]} />
          <View style={styles.scopeChips}>
            <ChipRow scroll>
              <Chip
                label={t('All')}
                selected={!scope}
                onPress={() => selectScope(ALL)}
              />
              {platforms.map(p => (
                <Chip
                  key={p.id}
                  label={p.name}
                  selected={p.id === scope?.id}
                  onPress={() => selectScope(p.id)}
                />
              ))}
            </ChipRow>
          </View>
        </View>
      ) : null}
      {feed ? (
        <View style={styles.labelRow}>
          <SectionLabel style={styles.label}>{label}</SectionLabel>
          {note ? (
            <Text
              style={[
                type.meta,
                { color: updateError ? c.danger : c.tertiary },
              ]}
            >
              {note}
            </Text>
          ) : null}
        </View>
      ) : null}
      {body}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: BOTTOM_CLEARANCE },
  scopeRow: { flexDirection: 'row', alignItems: 'center' },
  divider: {
    width: StyleSheet.hairlineWidth,
    height: 24,
    marginLeft: space.l,
  },
  scopeChips: { flex: 1 },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingRight: space.l,
  },
  label: { flexShrink: 1 },
});
