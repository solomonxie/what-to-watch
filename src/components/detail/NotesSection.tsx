import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { addNote, getNotesForTitle } from '../../db/repositories/notesRepo';

interface Note {
  id: number;
  body: string;
  updatedAt: number;
}

interface Props {
  titleId: string;
}

export function NotesSection({ titleId }: Props) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [draft, setDraft] = useState('');

  const reload = useCallback(async () => {
    const rows = await getNotesForTitle(titleId);
    setNotes(rows);
  }, [titleId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const onAdd = async () => {
    if (!draft.trim()) return;
    await addNote(titleId, draft.trim());
    setDraft('');
    reload();
  };

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>My Notes</Text>
      {notes.length === 0 ? (
        <Text style={styles.empty}>No notes yet.</Text>
      ) : (
        notes.map(note => (
          <Text key={note.id} style={styles.note}>
            {note.body}
          </Text>
        ))
      )}
      <TextInput
        style={styles.input}
        value={draft}
        onChangeText={setDraft}
        placeholder="Add a note..."
        multiline
      />
      <Pressable style={styles.button} onPress={onAdd}>
        <Text style={styles.buttonText}>Add note</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: 16, marginBottom: 20 },
  heading: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  empty: { color: '#888', fontSize: 13, marginBottom: 8 },
  note: { fontSize: 14, marginBottom: 6, backgroundColor: '#f5f5f5', padding: 8, borderRadius: 6 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 8, minHeight: 60, marginTop: 4 },
  button: { marginTop: 8, alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#333', borderRadius: 6 },
  buttonText: { color: 'white', fontWeight: '600' },
});
