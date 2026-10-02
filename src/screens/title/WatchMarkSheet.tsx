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
  getNotesForTitle,
  updateMark,
} from '../../db/repositories/notesRepo';
import { applyRatingToStatus } from '../../db/repositories/watchHistoryRepo';
import { space, useColors } from '../../ui/theme';
import { StarRating } from './StarRating';
import { formatMarkDate } from './WatchMarks';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'WatchMark'>;

/** Half-height sheet to write or edit one watch mark: rating, date, review. */
export function WatchMarkSheet({ navigation, route }: Props) {
  const { titleId, markId } = route.params;
  const c = useColors();
  const [rating, setRating] = useState(route.params.rating ?? 0);
  const [markedAt, setMarkedAt] = useState(Date.now());
  const [body, setBody] = useState('');
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    if (markId === undefined) return;
    getNotesForTitle(titleId).then(marks => {
      const mark = marks.find(m => m.id === markId);
      if (!mark) return;
      setRating(mark.rating ?? 0);
      setMarkedAt(mark.markedAt);
      setBody(mark.body);
    });
  }, [titleId, markId]);

  const close = () => navigation.goBack();
  const save = async () => {
    if (!rating) return;
    const mark = { rating, body: body.trim(), markedAt };
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
          await applyRatingToStatus(titleId);
          close();
        },
      },
    ]);

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
        <Pressable onPress={save} disabled={!rating} hitSlop={10}>
          <Text
            style={[
              styles.action,
              styles.bold,
              { color: rating ? c.accent : c.tertiary },
            ]}
          >
            Save
          </Text>
        </Pressable>
      </View>
      <View style={styles.stars}>
        <StarRating value={rating} onChange={setRating} size={40} />
      </View>
      <Pressable
        onPress={() => {
          Keyboard.dismiss();
          setPicking(!picking);
        }}
        style={[styles.row, { borderColor: c.separator }]}
      >
        <Text style={[styles.label, { color: c.text }]}>Date</Text>
        <Text
          style={[styles.label, { color: picking ? c.accent : c.secondary }]}
        >
          {formatMarkDate(markedAt)}
        </Text>
      </Pressable>
      {picking ? (
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
        value={body}
        onChangeText={setBody}
        onFocus={() => setPicking(false)}
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

const styles = StyleSheet.create({
  sheet: { padding: space.l, gap: space.l },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontSize: 17, fontWeight: '600' },
  action: { fontSize: 17 },
  bold: { fontWeight: '600' },
  stars: { alignItems: 'center' },
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
    textAlignVertical: 'top',
  },
  delete: { alignSelf: 'center' },
});
