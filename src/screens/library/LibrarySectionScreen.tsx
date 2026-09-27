import React, { useCallback, useLayoutEffect, useState } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  EmptyState,
  FLOATING_CLEARANCE,
  GRID_COLUMNS,
  PosterTile,
  type GridItem,
} from '../../ui/components';
import { space, useColors } from '../../ui/theme';
import { loadSections } from './LibraryScreen';
import type { LibraryStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<LibraryStackParamList, 'LibrarySection'>;

/** Every title in one Library section, as a grid. */
export function LibrarySectionScreen({ navigation, route }: Props) {
  const { title } = route.params;
  const c = useColors();
  const [items, setItems] = useState<GridItem[] | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({ title });
  }, [navigation, title]);

  // Reloaded on focus: rating or marking a title here can move it elsewhere.
  useFocusEffect(
    useCallback(() => {
      loadSections().then(sections =>
        setItems(sections.find(s => s.title === title)?.items ?? []),
      );
    }, [title]),
  );

  if (items === null) return <EmptyState loading />;
  return (
    <FlatList
      style={{ backgroundColor: c.background }}
      contentInsetAdjustmentBehavior="automatic"
      data={items}
      keyExtractor={item => item.id}
      numColumns={GRID_COLUMNS}
      columnWrapperStyle={styles.row}
      contentContainerStyle={styles.content}
      initialNumToRender={18}
      windowSize={7}
      ListEmptyComponent={<EmptyState message="Nothing here any more." />}
      renderItem={({ item }) => (
        <PosterTile
          item={item}
          onPress={() => navigation.navigate('Title', { titleId: item.id })}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: space.l,
    paddingTop: space.s,
    paddingBottom: FLOATING_CLEARANCE,
  },
  row: { gap: space.m },
});
