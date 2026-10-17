import { useState } from 'react';
import { Alert } from 'react-native';
import {
  exportCopy,
  importPayload,
  pickBackupFile,
} from '../../backup/backupService';
import { useSettingsStore } from '../../state/settingsStore';
import { t, tf } from '../../i18n';

function isCancel(error: unknown) {
  const code = (error as { code?: string })?.code;
  return code === 'OPERATION_CANCELED' || /cancel/i.test(String(error));
}

const message = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

export function useImportExport() {
  const [busy, setBusy] = useState(false);
  const loadSettings = useSettingsStore(s => s.load);

  const onExport = async () => {
    setBusy(true);
    try {
      await exportCopy();
    } catch (error) {
      Alert.alert(t('Export failed'), message(error));
    } finally {
      setBusy(false);
    }
  };

  const onImport = async () => {
    setBusy(true);
    try {
      const payload = await pickBackupFile();
      Alert.alert(
        t('Replace your data with this file?'),
        t(
          'Your current data is saved first to Files → On My iPhone → What to Watch.',
        ),
        [
          { text: t('Cancel'), style: 'cancel' },
          {
            text: t('Replace'),
            style: 'destructive',
            onPress: async () => {
              try {
                const n = await importPayload(payload);
                await loadSettings();
                Alert.alert(
                  t('Imported'),
                  tf(
                    '{0} ratings, {1} reviews, {2} watched',
                    n.rated,
                    n.notes,
                    n.watched,
                  ),
                );
              } catch (error) {
                Alert.alert(t('Import failed'), message(error));
              }
            },
          },
        ],
      );
    } catch (error) {
      if (!isCancel(error)) Alert.alert(t('Import failed'), message(error));
    } finally {
      setBusy(false);
    }
  };

  return { exportCopy: onExport, importFile: onImport, busy };
}
