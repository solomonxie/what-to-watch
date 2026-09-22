import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

interface Props {
  title: string;
  overview: string | null;
  posterPath: string | null;
  releaseDate: string | null;
  runtimeMinutes: number | null;
  genres: string[];
}

export function MetadataSection({
  title,
  overview,
  posterPath,
  releaseDate,
  runtimeMinutes,
  genres,
}: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {posterPath ? (
          <Image source={{ uri: posterPath }} style={styles.poster} />
        ) : (
          <View style={[styles.poster, styles.posterPlaceholder]} />
        )}
        <View style={styles.infoCol}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.meta}>
            {[releaseDate?.slice(0, 4), runtimeMinutes ? `${runtimeMinutes} min` : null]
              .filter(Boolean)
              .join(' · ')}
          </Text>
          <Text style={styles.meta}>{genres.join(', ')}</Text>
        </View>
      </View>
      {overview ? <Text style={styles.overview}>{overview}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, marginBottom: 20 },
  row: { flexDirection: 'row' },
  poster: { width: 100, height: 150, borderRadius: 8, backgroundColor: '#222' },
  posterPlaceholder: {},
  infoCol: { flex: 1, marginLeft: 12, justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '700' },
  meta: { fontSize: 13, color: '#666', marginTop: 4 },
  overview: { marginTop: 12, fontSize: 14, lineHeight: 20 },
});
