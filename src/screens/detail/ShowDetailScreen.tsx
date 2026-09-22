import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getTitleById } from '../../db/repositories/titlesRepo';
import { MetadataSection } from '../../components/detail/MetadataSection';
import { NotesSection } from '../../components/detail/NotesSection';
import { UserRatingReviewSection } from '../../components/detail/UserRatingReviewSection';
import { ExternalReviewsSection } from '../../components/detail/ExternalReviewsSection';
import { SupplementarySection } from '../../components/detail/SupplementarySection';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ShowDetail'>;
type CachedTitle = Awaited<ReturnType<typeof getTitleById>>;

export function ShowDetailScreen({ route }: Props) {
  const { titleId } = route.params;
  const [title, setTitle] = useState<CachedTitle | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const row = await getTitleById(titleId);
      setTitle(row);
      setLoading(false);
    })();
  }, [titleId]);

  if (loading) {
    return <Text style={styles.loading}>Loading...</Text>;
  }

  if (!title) {
    return <Text style={styles.loading}>Title not found in cache.</Text>;
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <MetadataSection
        title={title.title}
        overview={title.overview}
        posterPath={title.posterPath}
        releaseDate={title.releaseDate}
        runtimeMinutes={title.runtimeMinutes}
        genres={title.genres}
      />
      <NotesSection titleId={titleId} />
      <UserRatingReviewSection titleId={titleId} />
      <ExternalReviewsSection titleId={titleId} />
      <SupplementarySection titleId={titleId} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 16 },
  loading: { padding: 24, textAlign: 'center', color: '#888' },
});
