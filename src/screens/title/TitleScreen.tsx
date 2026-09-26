import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { imdbUrl, platformUrl, tmdbUrl } from '../../config/links';
import {
  getRatingsForTitle,
  getTitleById,
  getWatchProvidersForTitle,
} from '../../db/repositories/titlesRepo';
import {
  getWatchEntry,
  recordWatch,
} from '../../db/repositories/watchHistoryRepo';
import {
  getUserRatingForTitle,
  setUserRating,
} from '../../db/repositories/ratingsRepo';
import {
  addNote,
  deleteNote,
  getNotesForTitle,
} from '../../db/repositories/notesRepo';
import { fetchAndCacheTitle, parseTitleId } from '../../catalog/catalogService';
import { isProviderActive } from '../../providers/providerRegistry';
import { useSettingsStore } from '../../state/settingsStore';
import { DEFAULT_REGION } from '../../config/platforms';
import {
  EmptyState,
  Poster,
  SectionLabel,
  Segmented,
  FLOATING_CLEARANCE,
} from '../../ui/components';
import { joinMeta, mediaLabel, year } from '../../ui/format';
import { space, type, useColors } from '../../ui/theme';
import type { DiscoverStackParamList } from '../../navigation/types';
import type { WatchStatus } from '../../types/domain';

type Props = NativeStackScreenProps<DiscoverStackParamList, 'Title'>;
type Title = NonNullable<Awaited<ReturnType<typeof getTitleById>>>;
type Rating = Awaited<ReturnType<typeof getRatingsForTitle>>[number];
type Provider = Awaited<ReturnType<typeof getWatchProvidersForTitle>>[number];
type Entry = Awaited<ReturnType<typeof getWatchEntry>>;
type Note = Awaited<ReturnType<typeof getNotesForTitle>>[number];

const SOURCE: Record<string, string> = {
  tmdb: 'TMDB',
  imdb: 'IMDb',
  rotten_tomatoes: 'RT',
  metacritic: 'Metacritic',
};

const STATUSES: { value: WatchStatus; label: string }[] = [
  { value: 'toWatch', label: 'To watch' },
  { value: 'watching', label: 'Watching' },
  { value: 'completed', label: 'Watched' },
  { value: 'dropped', label: 'Dropped' },
];

function formatRating(r: Rating): string {
  if (r.scale === 'percent') return `${Math.round(r.rawValue)}%`;
  if (r.scale === '0-100') return String(Math.round(r.rawValue));
  return r.rawValue.toFixed(1);
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function TitleScreen({ route }: Props) {
  const { titleId } = route.params;
  const c = useColors();
  const region = useSettingsStore(
    s => s.settings?.defaultRegion ?? DEFAULT_REGION,
  );
  const [title, setTitle] = useState<Title | null | undefined>(undefined);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [error, setError] = useState(false);

  const readCache = useCallback(async () => {
    const [t, r, p] = await Promise.all([
      getTitleById(titleId),
      getRatingsForTitle(titleId),
      getWatchProvidersForTitle(titleId),
    ]);
    setTitle(t ?? null);
    setRatings(r);
    setProviders(p.filter(x => x.region === region));
    return { title: t, missingLogos: p.some(x => !x.logoPath) };
  }, [titleId, region]);

  const load = useCallback(async () => {
    setError(false);
    const { title: cached, missingLogos } = await readCache();
    // Titles from rankings lack cast/availability until fetched once.
    const ref = parseTitleId(titleId);
    if (cached && cached.castNames != null && !missingLogos) return;
    if (!ref || !(await isProviderActive('tmdb'))) {
      if (!cached) setError(true);
      return;
    }
    try {
      await fetchAndCacheTitle(ref.tmdbId, ref.mediaType, region);
      await readCache();
    } catch {
      if (!cached) setError(true);
    }
  }, [titleId, region, readCache]);

  useEffect(() => {
    load();
  }, [load]);

  if (!title) {
    return (
      <View style={[styles.fill, { backgroundColor: c.background }]}>
        {error ? (
          <EmptyState
            message="Couldn't load this title."
            action="Try again"
            onAction={load}
          />
        ) : (
          <EmptyState loading />
        )}
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: c.background }}
      contentInsetAdjustmentBehavior="automatic"
      keyboardDismissMode="interactive"
      contentContainerStyle={styles.content}
    >
      <View style={styles.hero}>
        <Poster
          uri={title.posterPath}
          title={title.title}
          width={120}
          radius={12}
        />
        <View style={styles.heroText}>
          <Text style={[type.title, { color: c.text }]}>{title.title}</Text>
          <Text style={[type.meta, { color: c.secondary }]}>
            {joinMeta([
              year(title.releaseDate),
              mediaLabel(title.mediaType),
              title.runtimeMinutes && `${title.runtimeMinutes} min`,
            ])}
          </Text>
          {title.genres.length ? (
            <Text style={[type.meta, { color: c.secondary }]}>
              {title.genres.join(' · ')}
            </Text>
          ) : null}
          <Text style={[type.meta, { color: c.secondary }]}>
            {joinMeta([
              ...(title.originCountries ?? []),
              title.originalLanguage?.toUpperCase(),
            ])}
          </Text>
        </View>
      </View>

      {ratings.length ? (
        <View style={styles.stats}>
          {ratings.map(r => (
            <View key={r.source}>
              <Text style={[styles.statValue, { color: c.text }]}>
                {formatRating(r)}
              </Text>
              <Text style={[type.meta, { color: c.secondary }]}>
                {SOURCE[r.source] ?? r.source}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <OpenIn title={title} providers={providers} />

      <WatchStatus titleId={titleId} />
      <MyRating titleId={titleId} />

      {title.overview ? <Overview text={title.overview} /> : null}

      {title.castNames?.length ? (
        <>
          <SectionLabel>Cast</SectionLabel>
          <Text style={[styles.paragraph, styles.inset, { color: c.text }]}>
            {title.castNames.join(' · ')}
          </Text>
        </>
      ) : null}

      <Notes titleId={titleId} />
    </ScrollView>
  );
}

function OpenIn({ title, providers }: { title: Title; providers: Provider[] }) {
  const c = useColors();
  const streaming = Array.from(
    new Map(
      providers
        .filter(
          p =>
            p.availabilityType === 'flatrate' || p.availabilityType === 'free',
        )
        .map(p => [p.platformId, p]),
    ).values(),
  );
  const ref = parseTitleId(title.id);
  const links = [
    ...streaming.map(p => ({
      key: p.platformId,
      label: p.platformName,
      logo: p.logoPath,
      url: platformUrl(p.platformId, title.title, p.link),
    })),
    ...(title.imdbId
      ? [{ key: 'imdb', label: 'IMDb', logo: null, url: imdbUrl(title.imdbId) }]
      : []),
    ...(ref
      ? [
          {
            key: 'tmdb',
            label: 'TMDB',
            logo: null,
            url: tmdbUrl(ref.mediaType, ref.tmdbId),
          },
        ]
      : []),
  ].filter(l => l.url);

  if (links.length === 0) return null;
  return (
    <>
      <SectionLabel>{streaming.length ? 'Watch on' : 'More on'}</SectionLabel>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.links}
      >
        {links.map(l => (
          <Pressable
            key={l.key}
            onPress={() => Linking.openURL(l.url!)}
            style={({ pressed }) => [styles.link, pressed && styles.pressed]}
          >
            {l.logo ? (
              <Image source={{ uri: l.logo }} style={styles.logo} />
            ) : (
              <View
                style={[
                  styles.logo,
                  styles.badge,
                  l.key === 'imdb' ? styles.imdbBadge : styles.tmdbBadge,
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    l.key === 'imdb' ? styles.imdbText : styles.tmdbText,
                  ]}
                >
                  {l.label}
                </Text>
              </View>
            )}
            <Text
              style={[styles.linkLabel, { color: c.secondary }]}
              numberOfLines={1}
            >
              {l.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </>
  );
}

function WatchStatus({ titleId }: { titleId: string }) {
  const c = useColors();
  const [entry, setEntry] = useState<Entry | undefined>(undefined);

  const reload = useCallback(
    () => getWatchEntry(titleId).then(e => setEntry(e)),
    [titleId],
  );
  useEffect(() => {
    reload();
  }, [reload]);

  const mark = async (status: WatchStatus) => {
    if (entry?.status === status) return;
    await recordWatch(titleId, status);
    reload();
  };

  return (
    <View style={styles.block}>
      <Segmented
        options={STATUSES}
        value={(entry?.status as WatchStatus | undefined) ?? null}
        onChange={mark}
      />
      {entry?.status === 'completed' ? (
        <View style={styles.watchedLine}>
          <Text style={[type.meta, { color: c.secondary }]}>
            {`Watched ${entry.rewatchCount}× · ${formatDate(entry.watchedAt)}`}
          </Text>
          <Pressable
            hitSlop={8}
            onPress={async () => {
              await recordWatch(titleId, 'completed');
              reload();
            }}
          >
            <Text style={[type.meta, { color: c.accent }]}>Watched again</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function MyRating({ titleId }: { titleId: string }) {
  const c = useColors();
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');

  useEffect(() => {
    getUserRatingForTitle(titleId).then(r => {
      if (!r) return;
      setRating(r.rating);
      setReview(r.reviewText ?? '');
    });
  }, [titleId]);

  const save = (value: number, text: string) =>
    value ? setUserRating(titleId, value, text.trim() || undefined) : undefined;

  return (
    <>
      <SectionLabel>My rating</SectionLabel>
      <View style={styles.starsRow}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map(v => (
          <Pressable
            key={v}
            hitSlop={3}
            onPress={() => {
              setRating(v);
              save(v, review);
            }}
          >
            <Text
              style={[
                styles.star,
                { color: v <= rating ? c.star : c.placeholder },
              ]}
            >
              ★
            </Text>
          </Pressable>
        ))}
        <Text style={[type.meta, styles.ratingValue, { color: c.secondary }]}>
          {rating ? `${rating} / 10` : ''}
        </Text>
      </View>
      {rating ? (
        <TextInput
          style={[styles.input, { backgroundColor: c.chip, color: c.text }]}
          placeholder="Add a review…"
          placeholderTextColor={c.secondary}
          multiline
          value={review}
          onChangeText={setReview}
          onBlur={() => save(rating, review)}
        />
      ) : null}
    </>
  );
}

function Overview({ text }: { text: string }) {
  const c = useColors();
  const [expanded, setExpanded] = useState(false);
  return (
    <Pressable onPress={() => setExpanded(e => !e)} style={styles.overview}>
      <Text
        style={[styles.paragraph, { color: c.text }]}
        numberOfLines={expanded ? undefined : 4}
      >
        {text}
      </Text>
      {expanded ? null : (
        <Text style={[type.meta, styles.more, { color: c.accent }]}>More</Text>
      )}
    </Pressable>
  );
}

function Notes({ titleId }: { titleId: string }) {
  const c = useColors();
  const [notes, setNotes] = useState<Note[]>([]);
  const [draft, setDraft] = useState('');

  const reload = useCallback(
    () => getNotesForTitle(titleId).then(setNotes),
    [titleId],
  );
  useEffect(() => {
    reload();
  }, [reload]);

  const add = async () => {
    if (!draft.trim()) return;
    await addNote(titleId, draft.trim());
    setDraft('');
    reload();
  };

  const remove = (note: Note) =>
    Alert.alert('Delete note?', note.body, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteNote(note.id);
          reload();
        },
      },
    ]);

  return (
    <>
      <SectionLabel>Notes</SectionLabel>
      {notes.map(n => (
        <Pressable key={n.id} onLongPress={() => remove(n)}>
          <Text style={[styles.paragraph, styles.note, { color: c.text }]}>
            {n.body}
          </Text>
        </Pressable>
      ))}
      <View style={[styles.noteInput, { backgroundColor: c.chip }]}>
        <TextInput
          style={[styles.noteField, { color: c.text }]}
          placeholder="Add a note…"
          placeholderTextColor={c.secondary}
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={add}
          returnKeyType="done"
        />
        {draft.trim() ? (
          <Pressable onPress={add} hitSlop={8}>
            <Text style={[styles.addText, { color: c.accent }]}>Add</Text>
          </Pressable>
        ) : null}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  links: { paddingHorizontal: space.l, gap: space.l },
  link: { alignItems: 'center', width: 60, gap: 6 },
  pressed: { opacity: 0.6 },
  logo: { width: 52, height: 52, borderRadius: 12 },
  badge: { alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 13, fontWeight: '800' },
  imdbBadge: { backgroundColor: '#F5C518' },
  tmdbBadge: { backgroundColor: '#0D253F' },
  imdbText: { color: '#000000' },
  tmdbText: { color: '#01B4E4' },
  linkLabel: { fontSize: 11 },
  fill: { flex: 1 },
  content: { paddingBottom: FLOATING_CLEARANCE + 24 },
  hero: {
    flexDirection: 'row',
    gap: space.l,
    paddingHorizontal: space.l,
    paddingTop: space.s,
  },
  heroText: { flex: 1, gap: 6, justifyContent: 'flex-end' },
  stats: {
    flexDirection: 'row',
    gap: space.xl,
    paddingHorizontal: space.l,
    marginTop: space.xl,
  },
  statValue: { fontSize: 20, fontWeight: '700' },
  block: { marginTop: space.xl },
  watchedLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: space.l,
    marginTop: space.s,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: space.l,
  },
  star: { fontSize: 26 },
  ratingValue: { marginLeft: space.s },
  input: {
    marginHorizontal: space.l,
    marginTop: space.m,
    borderRadius: 10,
    padding: space.m,
    minHeight: 72,
    fontSize: 16,
  },
  overview: { paddingHorizontal: space.l, marginTop: space.xl },
  paragraph: { fontSize: 16, lineHeight: 23 },
  inset: { paddingHorizontal: space.l },
  more: { marginTop: 4 },
  note: { paddingHorizontal: space.l, paddingVertical: space.xs },
  noteInput: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: space.l,
    marginTop: space.s,
    borderRadius: 10,
    paddingHorizontal: space.m,
  },
  noteField: { flex: 1, paddingVertical: 10, fontSize: 16 },
  addText: { fontSize: 16, fontWeight: '600' },
});
