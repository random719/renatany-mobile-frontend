import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { colors, typography } from '../../theme';

interface TrustBadgeProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  subtitle: string;
  iconColor?: string;
}

export const TrustBadge = ({ icon, title, subtitle, iconColor = colors.accentEmerald }: TrustBadgeProps) => (
  <View style={styles.container}>
    <View style={styles.iconContainer}>
      <MaterialCommunityIcons name={icon} size={24} color={iconColor} />
    </View>
    <View style={styles.textContainer}>
      <View style={styles.titleRow}>
        <Text variant="labelLarge" style={styles.title}>
          {title}
        </Text>
        <MaterialCommunityIcons
          name="information-outline"
          size={14}
          color={colors.textSecondary}
          style={styles.infoIcon}
        />
      </View>
      <Text variant="bodySmall" style={styles.subtitle}>
        {subtitle}
      </Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#ECFDF5', // Light green background matches screenshot
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  title: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: typography.body,
  },
  infoIcon: {
    opacity: 0.6,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.small,
  },
});
