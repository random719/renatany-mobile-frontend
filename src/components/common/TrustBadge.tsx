import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../theme';

interface TrustBadgeProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  subtitle: string;
  iconColor?: string;
}

export const TrustBadge = ({ icon, title, subtitle, iconColor = colors.accentEmerald }: TrustBadgeProps) => (
  <View style={styles.container}>
    <View style={styles.row}>
      <MaterialCommunityIcons name={icon} size={28} color={iconColor} />
      <MaterialCommunityIcons
        name="information-outline"
        size={16}
        color={colors.textSecondary}
        style={styles.infoIcon}
      />
    </View>
    <Text variant="labelLarge" style={styles.title}>
      {title}
    </Text>
    <Text variant="bodySmall" style={styles.subtitle}>
      {subtitle}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  infoIcon: {
    opacity: 0.6,
  },
  title: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  subtitle: {
    marginTop: 2,
    color: colors.textSecondary,
  },
});
