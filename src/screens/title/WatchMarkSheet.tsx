import React, { useEffect, useState } from 'react';
import {
  Alert,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  addMark,
  deleteMark,
  getMarksForTitle,
  updateMark,
} from '../../db/repositories/marksRepo';
import { applyRatingToStatus } from '../../db/repositories/watchHistoryRepo';
import {
  parseTitleId,
  seasonEpisodes,
  showSeasons,
} from '../../catalog/catalogService';
import type { MarkStatus } from '../../marks/derive';
import { formatMarkDate, STATUS_LABELS } from '../../marks/labels';
import type { TmdbEpisode, TmdbSeason } from '../../providers/tmdbProvider';
import { ChipGrid } from '../../ui/components';
import { space, useColors } from '../../ui/theme';
import { StarRating } from './StarRating';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'WatchMark'>;
type Row = 'date' | 'status' | 'season' | 'episode';

const STATUSES = Object.entries(STATUS_LABELS) as [MarkStatus, string][];

/** Half-height sheet for one mark: place, status, rating, date, review — all optional. */
export function WatchMarkSheet({ navigation, route }: Props) {
  const { titleId, markId } = route.params;
  const c = useColors();
  const ref = parseTitleId(titleId);
  const isShow = ref?.mediaType === 'tv';
  const [rating, setRating] = useState(route.params.rating ?? 0);
  const [status, setStatus] = useState<MarkStatus | null>(null);
  const [season, setSeason] = useState<number | null>(null);
  const [episode, setEpisode] = useState<number | null>(null);
  const [markedAt, setMarkedAt] = useState(Date.now());
  const [review, setReview] = useState('');
  const [open, setOpen] = useState<Row | null>(null);
  const [seasons, setSeasons] = useState<TmdbSeason[]>([]);
  const [episodes, setEpisodes] = useState<TmdbEpisode[]>([]);

  const toggle = (row: Row) => {
    Keyboard.dismiss();
    setOpen(open === row ? null : row);
  };

  useEffect(() => {
    if (markId === undefined) return;
    getMarksForTitle(titleId).then(marks => {
      const m = marks.find(x => x.id === markId);
      if (!m) return;
      setRating(m.rating ?? 0);
      setStatus(m.status as MarkStatus | null);
      setSeason(m.season);
      setEpisode(m.episode);
      setMarkedAt(m.markedAt);
      setReview(m.review);
    });
  }, [titleId, markId]);

  useEffect(() => {
    if (!isShow || !ref) return;
    showSeasons(ref.tmdbId)
      .then(show => setSeasons(show.seasons))
      .catch(() => {});
  }, [isShow, ref?.tmdbId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setEpisodes([]);
    if (!isShow || !ref || season === null) return;
    seasonEpisodes(ref.tmdbId, season)
      .then(setEpisodes)
      .catch(() => {});
  }, [isShow, ref?.tmdbId, season]); // eslint-disable-line react-hooks/exhaustive-deps

  const close = () => navigation.goBack();
  const save = async () => {
    const mark = {
      season,
      episode: season === null ? null : episode,
      // Rating a movie means it was watched.
      status:
        status ??
        (!isShow && rating && markId === undefined ? 'watched' : null),
      rating: rating || null,
      review: review.trim(),
      markedAt,
    };
    if (markId === undefined) await addMark(titleId, mark);
    else await updateMark(markId, mark);
    await applyRatingToStatus(titleId);
    close();
  };
  const remove = () =>
    Alert.alert('Delete this mark?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteMark(markId!);
          close();
        },
      },
    ]);

  const seasonName = (n: number) =>
    seasons.find(s => s.number === n)?.name ?? `Season ${n}`;

  return (
    <ScrollView
      style={{ backgroundColor: c.background }}
      contentContainerStyle={styles.sheet}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.bar}>
        <Pressable onPress={close} hitSlop={10}>
          <Text style={[styles.action, { color: c.accent }]}>Cancel</Text>
        </Pressable>
        <Text style={[styles.title, { color: c.text }]}>
          {markId === undefined ? 'New watch mark' : 'Watch mark'}
        </Text>
        <Pressable onPress={save} hitSlop={10}>
          <Text style={[styles.action, styles.bold, { color: c.accent }]}>
            Save
          </Text>
        </Pressable>
      </View>
      <View style={styles.stars}>
        {/* Optional: tapping the current score again clears it. */}
        <StarRating
          value={rating}
          onChange={v => setRating(v === rating ? 0 : v)}
          size={40}
        />
      </View>

      {seasons.length ? (
        <>
          <DropdownRow
            label="Season"
            value={season === null ? 'Whole show' : seasonName(season)}
            open={open === 'season'}
            onPress={() => toggle('season')}
          />
          {open === 'season' ? (
            <ChipGrid
              options={[
                { value: 'all', label: 'Whole show' },
                ...seasons.map(s => ({
                  value: String(s.number),
                  label: s.name,
                })),
              ]}
              isSelected={v => v === (season === null ? 'all' : String(season))}
              onPress={v => {
                setSeason(v === 'all' ? null : Number(v));
                setEpisode(null);
                setOpen(null);
              }}
            />
          ) : null}
        </>
      ) : null}
      {season !== null && episodes.length ? (
        <>
          <DropdownRow
            label="Episode"
            value={episode === null ? 'Whole season' : `Episode ${episode}`}
            open={open === 'episode'}
            onPress={() => toggle('episode')}
          />
          {open === 'episode' ? (
            <ChipGrid
              options={[
                { value: 'all', label: 'Whole season' },
                ...episodes.map(e => ({
                  value: String(e.number),
                  label: `E${e.number}`,
                })),
              ]}
              isSelected={v =>
                v === (episode === null ? 'all' : String(episode))
              }
              onPress={v => {
                setEpisode(v === 'all' ? null : Number(v));
                setOpen(null);
              }}
            />
          ) : null}
        </>
      ) : null}

      <DropdownRow
        label="Status"
        value={status ? STATUS_LABELS[status] : 'None'}
        open={open === 'status'}
        onPress={() => toggle('status')}
      />
      {open === 'status' ? (
        <ChipGrid
          options={[
            { value: 'none', label: 'None' },
            ...STATUSES.map(([value, label]) => ({ value, label })),
          ]}
          isSelected={v => v === (status ?? 'none')}
          onPress={v => {
            setStatus(v === 'none' ? null : (v as MarkStatus));
            setOpen(null);
          }}
        />
      ) : null}

      <DropdownRow
        label="Date"
        value={formatMarkDate(markedAt)}
        open={open === 'date'}
        onPress={() => toggle('date')}
      />
      {open === 'date' ? (
        <DateTimePicker
          value={new Date(markedAt)}
          mode="date"
          display="spinner"
          maximumDate={new Date()}
          onValueChange={(_, date) => setMarkedAt(date.getTime())}
        />
      ) : null}

      <TextInput
        style={[styles.field, { color: c.text, backgroundColor: c.chip }]}
        placeholder="Review (optional)"
        placeholderTextColor={c.secondary}
        value={review}
        onChangeText={setReview}
        onFocus={() => setOpen(null)}
        multiline
      />
      {markId !== undefined ? (
        <Pressable onPress={remove} hitSlop={8} style={styles.delete}>
          <Text style={[styles.action, { color: c.danger }]}>Delete mark</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

function DropdownRow({
  label,
  value,
  open,
  onPress,
}: {
  label: string;
  value: string;
  open: boolean;
  onPress: () => void;
}) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.row, { borderColor: c.separator }]}
    >
      <Text style={[styles.label, { color: c.text }]}>{label}</Text>
      <Text style={[styles.label, { color: open ? c.accent : c.secondary }]}>
        {value} {open ? '▴' : '▾'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sheet: { padding: space.l, gap: space.m },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontSize: 17, fontWeight: '600' },
  action: { fontSize: 17 },
  bold: { fontWeight: '600' },
  stars: { alignItems: 'center', paddingVertical: space.s },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: space.m,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  label: { fontSize: 17 },
  field: {
    fontSize: 17,
    minHeight: 96,
    borderRadius: 10,
    padding: space.m,
    marginTop: space.s,
    textAlignVertical: 'top',
  },
  delete: { alignSelf: 'center', marginTop: space.s },
});
