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
import { doubanUrl, imdbUrl, platformUrl, tmdbUrl } from '../../config/links';
import {
  getRatingsForTitle,
  getTitleById,
  getWatchProvidersForTitle,
} from '../../db/repositories/titlesRepo';
import {
  applyShowRating,
  getWatchEntry,
  markFinished,
  setInterested,
  syncShowProgress,
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
import { getReviews, type TmdbReview } from '../../providers/tmdbProvider';
import { Seasons } from './Seasons';
import { useSettingsStore } from '../../state/settingsStore';
import { DEFAULT_REGION } from '../../config/platforms';
import {
  EmptyState,
  Poster,
  SectionLabel,
  FLOATING_CLEARANCE,
} from '../../ui/components';
import { formatDate, joinMeta, mediaLabel, year } from '../../ui/format';
import { space, type, useColors } from '../../ui/theme';
import type { DiscoverStackParamList } from '../../navigation/types';

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

function formatRating(r: Rating): string {
  if (r.scale === 'percent') return `${Math.round(r.rawValue)}%`;
  if (r.scale === '0-100') return String(Math.round(r.rawValue));
  return r.rawValue.toFixed(1);
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

  // Status is derived: episodes drive shows, a rating finishes a movie.
  const [entry, setEntry] = useState<Entry>();
  const reloadEntry = useCallback(
    () => getWatchEntry(titleId).then(setEntry),
    [titleId],
  );
  useEffect(() => {
    reloadEntry();
  }, [reloadEntry]);
  const onEpisodeProgress = useCallback(
    async (watched: number, aired: number, touch: boolean) => {
      const rating = (await getUserRatingForTitle(titleId))?.rating;
      await syncShowProgress(titleId, watched, aired, { touch, rating });
      reloadEntry();
    },
    [titleId, reloadEntry],
  );
  const onRated = useCallback(
    async (rating: number) => {
      if (parseTitleId(titleId)?.mediaType === 'movie')
        await markFinished(titleId);
      else await applyShowRating(titleId, rating);
      reloadEntry();
    },
    [titleId, reloadEntry],
  );

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

      <WatchState titleId={titleId} entry={entry} onChange={reloadEntry} />
      <MyRating titleId={titleId} onRated={onRated} />

      {title.overview ? <Overview text={title.overview} /> : null}

      {title.mediaType === 'tv' ? (
        <Seasons titleId={titleId} onProgress={onEpisodeProgress} />
      ) : null}

      {title.castNames?.length ? (
        <>
          <SectionLabel>Cast</SectionLabel>
          <Text style={[styles.paragraph, styles.inset, { color: c.text }]}>
            {title.castNames.join(' · ')}
          </Text>
        </>
      ) : null}

      <Reviews titleId={titleId} />

      <Notes titleId={titleId} />
    </ScrollView>
  );
}

function OpenIn({ title, providers }: { title: Title; providers: Provider[] }) {
  const c = useColors();
  const douban = doubanUrl(title.imdbId, title.title, year(title.releaseDate));
  const unique = Array.from(
    new Map(
      providers
        .filter(
          p =>
            p.availabilityType === 'flatrate' || p.availabilityType === 'free',
        )
        .map(p => [p.platformId, p]),
    ).values(),
  );
  // Drop tiers and channels of a service already listed, e.g. "Netflix Standard with Ads".
  const streaming = unique.filter(
    p =>
      !unique.some(
        o => o !== p && p.platformName.startsWith(`${o.platformName} `),
      ),
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
  ]
    .filter(l => l.url)
    .map(l => ({ ...l, open: () => Linking.openURL(l.url!) }));
  links.push({
    key: 'douban',
    label: 'Douban',
    logo: null,
    url: null,
    open: async () => Linking.openURL(await douban),
  });

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
            onPress={l.open}
            style={({ pressed }) => [styles.link, pressed && styles.pressed]}
          >
            {l.logo ? (
              <Image source={{ uri: l.logo }} style={styles.logo} />
            ) : (
              <View style={[styles.logo, styles.badge, BADGE[l.key]]}>
                <Text style={[styles.badgeText, BADGE_TEXT[l.key]]}>
                  {l.key === 'douban' ? '豆瓣' : l.label}
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

function WatchState({
  titleId,
  entry,
  onChange,
}: {
  titleId: string;
  entry?: Entry;
  onChange: () => void;
}) {
  const c = useColors();
  const isMovie = parseTitleId(titleId)?.mediaType === 'movie';
  const status = entry?.status;
  if (entry && status && status !== 'toWatch') {
    const date = formatDate(entry.watchedAt);
    const line =
      status === 'watching' && !isMovie
        ? `Watching · last activity ${date}`
        : status === 'dropped'
        ? `Dropped · scored low · ${date}`
        : `✓ Watched · ${date}`;
    return (
      <Text style={[type.meta, styles.stateLine, { color: c.secondary }]}>
        {line}
      </Text>
    );
  }
  const on = status === 'toWatch';
  return (
    <Pressable
      onPress={async () => {
        await setInterested(titleId, !on);
        onChange();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      style={({ pressed }) => [
        styles.interested,
        on
          ? { backgroundColor: c.text, borderColor: c.text }
          : { borderColor: c.separator },
        pressed && styles.pressed,
      ]}
    >
      <Text
        style={[styles.interestedText, { color: on ? c.background : c.text }]}
      >
        {on ? '✓ Interested' : '+ Interested'}
      </Text>
    </Pressable>
  );
}

const STAR = 32;

/** Five stars in half steps; each half star is one point of a 10-point score. */
function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const c = useColors();
  return (
    <View style={styles.starsRow}>
      {[0, 1, 2, 3, 4].map(i => {
        const fill = Math.min(Math.max(value - i * 2, 0), 2) / 2;
        return (
          <Pressable
            key={i}
            accessibilityLabel={`${i + 1} star${i ? 's' : ''}`}
            onPress={e =>
              onChange(i * 2 + (e.nativeEvent.locationX < STAR / 2 ? 1 : 2))
            }
            style={styles.starBox}
          >
            <Text style={[styles.star, { color: c.placeholder }]}>★</Text>
            <View style={[styles.starFill, { width: STAR * fill }]}>
              <Text style={[styles.star, { color: c.star }]}>★</Text>
            </View>
          </Pressable>
        );
      })}
      <Text style={[type.meta, styles.ratingValue, { color: c.secondary }]}>
        {value ? `${value} / 10` : ''}
      </Text>
    </View>
  );
}

function MyRating({
  titleId,
  onRated,
}: {
  titleId: string;
  onRated: (rating: number) => void;
}) {
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

  const save = async (value: number, text: string) => {
    if (!value) return;
    await setUserRating(titleId, value, text.trim() || undefined);
    onRated(value);
  };

  return (
    <>
      <SectionLabel>My rating</SectionLabel>
      <StarRating
        value={rating}
        onChange={v => {
          setRating(v);
          save(v, review);
        }}
      />
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

const REVIEWS_SHOWN = 3;

// Fetched on its own after the page renders; stays hidden until it has any.
function Reviews({ titleId }: { titleId: string }) {
  const c = useColors();
  const [data, setData] = useState<{ reviews: TmdbReview[]; total: number }>();
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const ref = parseTitleId(titleId);
    if (!ref) return;
    let live = true;
    getReviews(ref.tmdbId, ref.mediaType)
      .then(d => live && setData(d))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [titleId]);

  if (!data?.reviews.length) return null;
  const ref = parseTitleId(titleId)!;
  const shown = showAll ? data.reviews : data.reviews.slice(0, REVIEWS_SHOWN);
  const more = data.reviews.length - shown.length;
  return (
    <>
      <View style={styles.sectionRow}>
        <SectionLabel>Reviews</SectionLabel>
        <Text style={[type.meta, styles.sectionCount, { color: c.tertiary }]}>
          {data.total}
        </Text>
      </View>
      {shown.map(r => (
        <Review key={r.id} review={r} />
      ))}
      {more > 0 ? (
        <Pressable onPress={() => setShowAll(true)} hitSlop={8}>
          <Text
            style={[styles.inset, styles.reviewAction, { color: c.accent }]}
          >
            {`Show all ${data.reviews.length}`}
          </Text>
        </Pressable>
      ) : data.total > data.reviews.length ? (
        <Pressable
          onPress={() =>
            Linking.openURL(`${tmdbUrl(ref.mediaType, ref.tmdbId)}/reviews`)
          }
          hitSlop={8}
        >
          <Text
            style={[styles.inset, styles.reviewAction, { color: c.accent }]}
          >
            {`All ${data.total} on TMDB ›`}
          </Text>
        </Pressable>
      ) : null}
    </>
  );
}

function Review({ review }: { review: TmdbReview }) {
  const c = useColors();
  const [expanded, setExpanded] = useState(false);
  const [long, setLong] = useState(false);
  return (
    <Pressable
      onPress={() => setExpanded(e => !e)}
      style={[styles.review, { borderTopColor: c.separator }]}
    >
      <Text style={[type.meta, { color: c.secondary }]}>
        {review.rating ? (
          <Text style={{ color: c.star }}>{`★ ${review.rating}  `}</Text>
        ) : null}
        {joinMeta([review.author, formatDate(review.createdAt)])}
      </Text>
      <Text
        style={[styles.reviewBody, { color: c.text }]}
        numberOfLines={expanded ? undefined : 4}
        onTextLayout={e => {
          if (!expanded) setLong(e.nativeEvent.lines.length >= 4);
        }}
      >
        {review.content}
      </Text>
      {long && !expanded ? (
        <Text style={[type.meta, styles.more, { color: c.accent }]}>More</Text>
      ) : null}
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
  doubanBadge: { backgroundColor: '#2E963D' },
  doubanText: { color: '#FFFFFF' },
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
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: space.l,
  },
  starBox: { width: STAR, height: STAR, justifyContent: 'center' },
  star: { fontSize: 30, width: STAR, textAlign: 'center' },
  starFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  stateLine: { paddingHorizontal: space.l, marginTop: space.xl },
  interested: {
    alignSelf: 'flex-start',
    marginHorizontal: space.l,
    marginTop: space.xl,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
  },
  interestedText: { fontSize: 15, fontWeight: '600' },
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
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  sectionCount: { paddingRight: space.l, marginBottom: space.s },
  review: {
    marginHorizontal: space.l,
    paddingVertical: space.m,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  reviewBody: { fontSize: 15, lineHeight: 21 },
  reviewAction: { fontSize: 15, fontWeight: '600', paddingVertical: space.s },
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

const BADGE: Record<string, object> = {
  imdb: styles.imdbBadge,
  tmdb: styles.tmdbBadge,
  douban: styles.doubanBadge,
};
const BADGE_TEXT: Record<string, object> = {
  imdb: styles.imdbText,
  tmdb: styles.tmdbText,
  douban: styles.doubanText,
};
