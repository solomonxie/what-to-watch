import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

export interface TitleCardProps {
  title: string;
  posterPath?: string;
  ratingLabel?: string;
  onPress: () => void;
}

export function TitleCard({ title, posterPath, ratingLabel, onPress }: TitleCardProps) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      {posterPath ? (
        <Image source={{ uri: posterPath }} style={styles.poster} />
      ) : (
        <View style={[styles.poster, styles.posterPlaceholder]}>
          <Text style={styles.posterPlaceholderText} numberOfLines={3}>
            {title}
          </Text>
        </View>
      )}
      <Text style={styles.title} numberOfLines={2}>
        {title}
      </Text>
      {ratingLabel ? <Text style={styles.rating}>{ratingLabel}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 120,
    marginRight: 12,
  },
  poster: {
    width: 120,
    height: 180,
    borderRadius: 8,
    backgroundColor: '#222',
  },
  posterPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  posterPlaceholderText: {
    color: '#aaa',
    fontSize: 12,
    textAlign: 'center',
  },
  title: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '500',
  },
  rating: {
    fontSize: 12,
    color: '#666',
  },
});
