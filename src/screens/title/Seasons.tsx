import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { parseTitleId } from '../../catalog/catalogService';
import {
  getEpisodes,
  getSeasons,
  type TmdbEpisode,
  type TmdbSeason,
} from '../../providers/tmdbProvider';
import {
  episodeKey,
  getWatchedEpisodes,
  setEpisodesWatched,
  type EpisodeRef,
} from '../../db/repositories/episodeWatchesRepo';
import { SectionLabel } from '../../ui/components';
import { formatDate, joinMeta, year } from '../../ui/format';
import { space, type, useColors } from '../../ui/theme';

const today = () => new Date().toISOString().slice(0, 10);
const aired = (e: TmdbEpisode) => !!e.airDate && e.airDate <= today();

const NONE = new Set<string>();
const regularWatched = (set: Set<string>) =>
  [...set].filter(k => !k.startsWith('0:')).length;

type Mark = (episodes: EpisodeRef[], watched: boolean) => void;

// Loads after the page renders; episodes load when a season is opened.
export function Seasons({
  titleId,
  onProgress,
}: {
  titleId: string;
  /** Regular episodes watched vs aired; `touch` = the user just marked. */
  onProgress?: (watched: number, aired: number, touch: boolean) => void;
}) {
  const c = useColors();
  const tmdbId = parseTitleId(titleId)?.tmdbId;
  const [seasons, setSeasons] = useState<TmdbSeason[]>([]);
  const [airedEpisodes, setAiredEpisodes] = useState(0);
  const [watched, setWatched] = useState<Set<string>>();

  useEffect(() => {
    getWatchedEpisodes(titleId).then(setWatched);
  }, [titleId]);

  // Bring the stored status in line with marks made before it was derived.
  const reconciled = useRef(false);
  useEffect(() => {
    if (reconciled.current || !watched || !airedEpisodes) return;
    reconciled.current = true;
    const count = regularWatched(watched);
    if (count > 0) onProgress?.(count, airedEpisodes, false);
  }, [watched, airedEpisodes, onProgress]);

  const mark: Mark = useCallback(
    (episodes, value) => {
      const next = new Set(watched ?? NONE);
      episodes.forEach(e =>
        value ? next.add(episodeKey(e)) : next.delete(episodeKey(e)),
      );
      setWatched(next);
      setEpisodesWatched(titleId, episodes, value).then(() =>
        onProgress?.(regularWatched(next), airedEpisodes, true),
      );
    },
    [titleId, watched, airedEpisodes, onProgress],
  );

  useEffect(() => {
    if (!tmdbId) return;
    let live = true;
    getSeasons(tmdbId)
      .then(show => {
        if (!live) return;
        setSeasons(show.seasons);
        setAiredEpisodes(show.airedEpisodes);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [tmdbId]);

  if (!tmdbId || seasons.length === 0) return null;
  return (
    <>
      <View style={styles.sectionRow}>
        <SectionLabel>Seasons</SectionLabel>
        <Text style={[type.meta, styles.sectionCount, { color: c.tertiary }]}>
          {seasons.filter(s => s.number > 0).length}
        </Text>
      </View>
      {seasons.map(s => (
        <Season
          key={s.number}
          tmdbId={tmdbId}
          season={s}
          watched={watched ?? NONE}
          mark={mark}
        />
      ))}
    </>
  );
}

function Rating({ value }: { value?: number }) {
  const c = useColors();
  if (!value) return null;
  return (
    <Text style={[type.meta, { color: c.secondary }]}>
      <Text style={{ color: c.star }}>★ </Text>
      {value.toFixed(1)}
    </Text>
  );
}

function Chevron({ open }: { open: boolean }) {
  const c = useColors();
  return (
    <Text
      style={[
        styles.chevron,
        { color: c.tertiary },
        open && styles.chevronOpen,
      ]}
    >
      ›
    </Text>
  );
}

type CheckState = 'none' | 'some' | 'all';

function Check({
  state,
  onPress,
  label,
}: {
  state: CheckState;
  onPress: () => void;
  label: string;
}) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="checkbox"
      accessibilityState={{
        checked: state === 'some' ? 'mixed' : state === 'all',
      }}
      accessibilityLabel={label}
      style={[
        styles.check,
        state === 'all'
          ? { backgroundColor: c.accent, borderColor: c.accent }
          : { borderColor: state === 'some' ? c.accent : c.tertiary },
      ]}
    >
      {state === 'all' ? <Text style={styles.checkMark}>✓</Text> : null}
      {state === 'some' ? (
        <View style={[styles.checkDot, { backgroundColor: c.accent }]} />
      ) : null}
    </Pressable>
  );
}

function Season({
  tmdbId,
  season,
  watched,
  mark,
}: {
  tmdbId: string;
  season: TmdbSeason;
  watched: Set<string>;
  mark: Mark;
}) {
  const c = useColors();
  const [open, setOpen] = useState(false);
  const [episodes, setEpisodes] = useState<TmdbEpisode[]>();
  const [failed, setFailed] = useState(false);
  const [fullOverview, setFullOverview] = useState(false);

  const fetchEpisodes = () =>
    getEpisodes(tmdbId, season.number).then(list => {
      setEpisodes(list);
      return list;
    });

  const loadEpisodes = () => {
    setFailed(false);
    fetchEpisodes().catch(() => setFailed(true));
  };

  const seen = (episodes ?? []).filter(e =>
    watched.has(episodeKey({ season: season.number, episode: e.number })),
  ).length;
  const seenCount = episodes
    ? seen
    : [...watched].filter(k => k.startsWith(`${season.number}:`)).length;
  const total = episodes ? episodes.filter(aired).length : season.episodeCount;
  const state: CheckState =
    seenCount === 0 ? 'none' : seenCount >= total ? 'all' : 'some';

  const toggleSeason = async () => {
    try {
      const list = episodes ?? (await fetchEpisodes());
      const refs = list
        .filter(e => state === 'all' || aired(e))
        .map(e => ({ season: season.number, episode: e.number }));
      mark(refs, state !== 'all');
    } catch {
      setFailed(true);
    }
  };

  const toggle = () => {
    if (!open && !episodes) loadEpisodes();
    setOpen(o => !o);
  };

  return (
    <View style={[styles.season, { borderTopColor: c.separator }]}>
      <Pressable
        onPress={toggle}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      >
        <Check
          state={state}
          onPress={toggleSeason}
          label={`${season.name} watched`}
        />
        <View style={styles.rowText}>
          <Text style={[styles.seasonName, { color: c.text }]}>
            {season.name}
          </Text>
          <Text style={[type.meta, { color: c.secondary }]}>
            {joinMeta([
              year(season.airDate),
              `${season.episodeCount} episode${
                season.episodeCount === 1 ? '' : 's'
              }`,
              state === 'all'
                ? 'Watched'
                : state === 'some' && `${seenCount} watched`,
            ])}
          </Text>
        </View>
        <Rating value={season.rating} />
        <Chevron open={open} />
      </Pressable>

      {open ? (
        <View style={styles.body}>
          {season.overview ? (
            <Text
              onPress={() => setFullOverview(f => !f)}
              numberOfLines={fullOverview ? undefined : 3}
              style={[styles.overview, { color: c.secondary }]}
            >
              {season.overview}
            </Text>
          ) : null}
          {failed ? (
            <Pressable onPress={loadEpisodes} hitSlop={8}>
              <Text style={[type.meta, { color: c.accent }]}>
                Couldn't load episodes · Try again
              </Text>
            </Pressable>
          ) : !episodes ? (
            <ActivityIndicator style={styles.loading} />
          ) : (
            episodes.map(e => {
              const ref = { season: season.number, episode: e.number };
              return (
                <Episode
                  key={e.number}
                  episode={e}
                  watched={watched.has(episodeKey(ref))}
                  onToggle={value => mark([ref], value)}
                />
              );
            })
          )}
        </View>
      ) : null}
    </View>
  );
}

function Episode({
  episode,
  watched,
  onToggle,
}: {
  episode: TmdbEpisode;
  watched: boolean;
  onToggle: (watched: boolean) => void;
}) {
  const c = useColors();
  const [open, setOpen] = useState(false);
  const upcoming = !!episode.airDate && episode.airDate > today();
  const canOpen = !!episode.overview;
  return (
    <Pressable
      onPress={() => setOpen(o => !o)}
      disabled={!canOpen}
      style={({ pressed }) => [
        styles.episode,
        { borderTopColor: c.separator },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.row}>
        {upcoming && !watched ? (
          <View style={styles.checkSpace} />
        ) : (
          <Check
            state={watched ? 'all' : 'none'}
            onPress={() => onToggle(!watched)}
            label={`Episode ${episode.number} watched`}
          />
        )}
        <Text style={[styles.episodeNumber, { color: c.tertiary }]}>
          {episode.number}
        </Text>
        <View style={styles.rowText}>
          <Text
            style={[styles.episodeName, { color: c.text }]}
            numberOfLines={open ? undefined : 1}
          >
            {episode.name}
          </Text>
          <Text style={[type.meta, { color: c.secondary }]}>
            {joinMeta([
              episode.airDate &&
                `${upcoming ? 'Airs ' : ''}${formatDate(episode.airDate)}`,
              episode.runtime && `${episode.runtime} min`,
            ])}
          </Text>
        </View>
        <Rating value={episode.rating} />
        {canOpen ? <Chevron open={open} /> : null}
      </View>
      {open ? (
        <Text
          style={[
            styles.overview,
            styles.episodeOverview,
            { color: c.secondary },
          ]}
        >
          {episode.overview}
        </Text>
      ) : null}
    </Pressable>
  );
}

const CHECK = 22;

const styles = StyleSheet.create({
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  sectionCount: { paddingRight: space.l, marginBottom: space.s },
  season: {
    marginHorizontal: space.l,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s,
    paddingVertical: space.m,
  },
  rowText: { flex: 1, gap: 2 },
  pressed: { opacity: 0.6 },
  seasonName: { fontSize: 16, fontWeight: '600' },
  chevron: { fontSize: 22, width: 14, textAlign: 'center', marginTop: -2 },
  chevronOpen: { transform: [{ rotate: '90deg' }] },
  body: { paddingLeft: space.m, paddingBottom: space.s },
  overview: { fontSize: 14, lineHeight: 20, marginBottom: space.s },
  loading: { paddingVertical: space.m },
  episode: { borderTopWidth: StyleSheet.hairlineWidth },
  episodeNumber: {
    width: 22,
    fontSize: 15,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  episodeName: { fontSize: 15, fontWeight: '500' },
  episodeOverview: {
    marginLeft: CHECK + 22 + space.s * 2,
    marginTop: -space.xs,
  },
  check: {
    width: CHECK,
    height: CHECK,
    borderRadius: CHECK / 2,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkSpace: { width: CHECK },
  checkMark: { color: 'white', fontSize: 13, fontWeight: '700' },
  checkDot: { width: 8, height: 8, borderRadius: 4 },
});
