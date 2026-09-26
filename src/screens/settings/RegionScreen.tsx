import React from 'react';
import { ScrollView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSettingsStore } from '../../state/settingsStore';
import { GroupedSection, Row } from '../../ui/components';
import { useColors } from '../../ui/theme';
import type { SettingsStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<SettingsStackParamList, 'Region'>;

const REGIONS: [string, string][] = [
  ['US', 'United States'],
  ['GB', 'United Kingdom'],
  ['CA', 'Canada'],
  ['AU', 'Australia'],
  ['IE', 'Ireland'],
  ['NZ', 'New Zealand'],
  ['DE', 'Germany'],
  ['FR', 'France'],
  ['ES', 'Spain'],
  ['IT', 'Italy'],
  ['NL', 'Netherlands'],
  ['SE', 'Sweden'],
  ['JP', 'Japan'],
  ['KR', 'South Korea'],
  ['HK', 'Hong Kong'],
  ['TW', 'Taiwan'],
  ['SG', 'Singapore'],
  ['IN', 'India'],
  ['BR', 'Brazil'],
  ['MX', 'Mexico'],
];

export function RegionScreen({ navigation }: Props) {
  const c = useColors();
  const { settings, setRegion } = useSettingsStore();
  const current = settings?.defaultRegion;
  return (
    <ScrollView
      style={{ backgroundColor: c.groupedBackground }}
      contentInsetAdjustmentBehavior="automatic"
    >
      <GroupedSection footer="Sets which catalogue rankings and availability come from.">
        {REGIONS.map(([code, name]) => (
          <Row
            key={code}
            label={name}
            value={code === current ? '✓' : undefined}
            onPress={async () => {
              await setRegion(code);
              navigation.goBack();
            }}
            chevron={false}
          />
        ))}
      </GroupedSection>
    </ScrollView>
  );
}
