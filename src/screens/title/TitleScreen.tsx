import React, { useCallback, useEffect, useState } from 'react';
import {
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import {
  openDouban,
  openInSafari,
  prefetchDouban,
  imdbSearchUrl,
  imdbUrl,
  platformUrl,
  tmdbUrl,
  youtubeSearchUrl,
} from '../../config/links';
import {
  getRatingsForTitle,
  getTitleById,
  getWatchProvidersForTitle,
} from '../../db/repositories/titlesRepo';
import {
  getWatchEntry,
  setInterested,
  syncShowProgress,
} from '../../db/repositories/watchHistoryRepo';
import { getUserRatingForTitle } from '../../db/repositories/ratingsRepo';
import { fetchAndCacheTitle, parseTitleId } from '../../catalog/catalogService';
import { isProviderActive } from '../../providers/providerRegistry';
import { getReviews, type TmdbReview } from '../../providers/tmdbProvider';
import { Seasons } from './Seasons';
import { formatMarkDate, WatchMarks } from './WatchMarks';
import { StarRating } from './StarRating';
import {
  getMarksForTitle,
  onMarksChanged,
} from '../../db/repositories/marksRepo';
import { seasonRatings, titleRating } from '../../marks/derive';
import { useSettingsStore } from '../../state/settingsStore';
import { DEFAULT_REGION } from '../../config/platforms';
import {
  EmptyState,
  Poster,
  SectionLabel,
  BOTTOM_CLEARANCE,
} from '../../ui/components';
import { formatDate, joinMeta, mediaLabel, year } from '../../ui/format';
import { space, type, useColors } from '../../ui/theme';
import type {
  DiscoverStackParamList,
  RootStackParamList,
} from '../../navigation/types';

type Props = NativeStackScreenProps<DiscoverStackParamList, 'Title'>;
type Title = NonNullable<Awaited<ReturnType<typeof getTitleById>>>;
type Rating = Awaited<ReturnType<typeof getRatingsForTitle>>[number];
type Provider = Awaited<ReturnType<typeof getWatchProvidersForTitle>>[number];
type Entry = Awaited<ReturnType<typeof getWatchEntry>>;

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
    // A saved mark can finish a movie or drop a show.
    return onMarksChanged(id => id === titleId && reloadEntry());
  }, [reloadEntry, titleId]);
  const onEpisodeProgress = useCallback(
    async (watched: number, aired: number, touch: boolean) => {
      const rating = (await getUserRatingForTitle(titleId))?.rating;
      await syncShowProgress(titleId, watched, aired, { touch, rating });
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
      automaticallyAdjustKeyboardInsets
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
          {title.zhTitle && title.zhTitle !== title.title ? (
            <Text style={[type.meta, styles.zhTitle, { color: c.secondary }]}>
              {title.zhTitle}
            </Text>
          ) : null}
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
      <MyRating titleId={titleId} />

      {title.overview ? <Overview text={title.overview} /> : null}

      {title.mediaType === 'tv' ? (
        <Seasons
          titleId={titleId}
          completedAt={
            entry?.status === 'completed' ? entry.watchedAt : undefined
          }
          onProgress={onEpisodeProgress}
        />
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

      <WatchMarks titleId={titleId} />
    </ScrollView>
  );
}

function OpenIn({ title, providers }: { title: Title; providers: Provider[] }) {
  const c = useColors();
  const released = year(title.releaseDate);
  useEffect(() => {
    prefetchDouban(title.imdbId, title.title, released);
  }, [title.imdbId, title.title, released]);
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
    {
      key: 'imdb',
      label: 'IMDb',
      logo: null,
      url: title.imdbId
        ? imdbUrl(title.imdbId)
        : imdbSearchUrl(title.title, title.mediaType, released),
    },
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
    open: () => openDouban(title.imdbId, title.title, released),
  });
  const youtube = youtubeSearchUrl(title.title, title.mediaType, released);
  links.push({
    key: 'youtube',
    label: 'YouTube',
    logo: null,
    url: youtube,
    open: () => openInSafari(youtube),
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
                  {BADGE_LABEL[l.key] ?? l.label}
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
        {on ? '✓ Watch next' : '+ Watch next'}
      </Text>
    </Pressable>
  );
}

/**
 * My latest title-level rating and its date, with each season's latest after
 * it; a tap on the stars writes a new mark.
 */
function MyRating({ titleId }: { titleId: string }) {
  const c = useColors();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [latest, setLatest] = useState<{ rating: number; at: number }>();
  const [seasons, setSeasons] = useState<number[]>([]);

  useEffect(() => {
    const load = () =>
      getMarksForTitle(titleId).then(marks => {
        const m = titleRating(marks);
        setLatest(m ? { rating: m.rating!, at: m.markedAt } : undefined);
        setSeasons(seasonRatings(marks).map(s => Math.round(s.rating)));
      });
    load();
    return onMarksChanged(id => id === titleId && load());
  }, [titleId]);

  return (
    <>
      <SectionLabel>My rating</SectionLabel>
      <View style={styles.inset}>
        <StarRating
          value={latest?.rating ?? 0}
          onChange={rating =>
            navigation.navigate('WatchMark', { titleId, rating })
          }
        />
        {latest || seasons.length ? (
          <Text style={[type.meta, styles.ratedOn, { color: c.secondary }]}>
            {[
              latest && `Rated ${formatMarkDate(latest.at)}`,
              seasons.length && `Seasons (${seasons.join(', ')})`,
            ]
              .filter(Boolean)
              .join('  ·  ')}
          </Text>
        ) : null}
      </View>
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
  youtubeBadge: { backgroundColor: '#FF0000' },
  youtubeText: { color: '#FFFFFF' },
  linkLabel: { fontSize: 11 },
  fill: { flex: 1 },
  content: { paddingBottom: BOTTOM_CLEARANCE + 24 },
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
  ratedOn: { marginTop: space.xs },
  zhTitle: { fontSize: 15 },
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
});

const BADGE: Record<string, object> = {
  imdb: styles.imdbBadge,
  tmdb: styles.tmdbBadge,
  douban: styles.doubanBadge,
  youtube: styles.youtubeBadge,
};
const BADGE_LABEL: Record<string, string> = { douban: '豆瓣', youtube: '▶' };
const BADGE_TEXT: Record<string, object> = {
  imdb: styles.imdbText,
  tmdb: styles.tmdbText,
  douban: styles.doubanText,
  youtube: styles.youtubeText,
};
