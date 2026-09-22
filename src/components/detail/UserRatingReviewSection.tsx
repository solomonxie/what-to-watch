import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { getUserRatingForTitle, setUserRating } from '../../db/repositories/ratingsRepo';

interface Props {
  titleId: string;
}

const STAR_VALUES = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

export function UserRatingReviewSection({ titleId }: Props) {
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');

  useEffect(() => {
    (async () => {
      const existing = await getUserRatingForTitle(titleId);
      if (existing) {
        setRating(existing.rating);
        setReviewText(existing.reviewText ?? '');
      }
    })();
  }, [titleId]);

  const onSave = async () => {
    await setUserRating(titleId, rating, reviewText.trim() || undefined);
  };

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>My Rating &amp; Review</Text>
      <View style={styles.starsRow}>
        {STAR_VALUES.map(value => (
          <Pressable key={value} onPress={() => setRating(value)} hitSlop={4}>
            <Text style={[styles.star, value <= rating && styles.starFilled]}>
              {value % 1 === 0 ? '★' : '½'}
            </Text>
          </Pressable>
        ))}
        <Text style={styles.ratingValue}>{rating ? rating.toFixed(1) : '-'}</Text>
      </View>
      <TextInput
        style={styles.input}
        value={reviewText}
        onChangeText={setReviewText}
        placeholder="Write a review..."
        multiline
      />
      <Pressable style={styles.button} onPress={onSave}>
        <Text style={styles.buttonText}>Save rating</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: 16, marginBottom: 20 },
  heading: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  starsRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  star: { fontSize: 20, color: '#ccc' },
  starFilled: { color: '#f5a623' },
  ratingValue: { marginLeft: 8, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 8, minHeight: 60 },
  button: { marginTop: 8, alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#333', borderRadius: 6 },
  buttonText: { color: 'white', fontWeight: '600' },
});
