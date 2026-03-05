import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../theme';

interface HeroBannerProps {
  itemCount: number;
  onMenuPress?: () => void;
  onNotificationPress?: () => void;
}

export const HeroBanner = ({ itemCount, onMenuPress, onNotificationPress }: HeroBannerProps) => (
  <View style={styles.container}>
    {/* Top Header Bar */}
    <View style={styles.headerBar}>
      <TouchableOpacity onPress={onMenuPress} style={styles.menuBtn}>
        <MaterialCommunityIcons name="menu" size={22} color={colors.primary} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.langSelector}>
        <MaterialCommunityIcons name="web" size={18} color="#9CA3AF" />
        <Text variant="labelMedium" style={styles.langText}>
          GB <Text style={styles.langBold}>English</Text>
        </Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onNotificationPress} style={styles.bellBtn}>
        <MaterialCommunityIcons name="bell-outline" size={22} color="#9CA3AF" />
      </TouchableOpacity>
    </View>

    {/* Hero Text */}
    <View style={styles.heroContent}>
      <Text variant="displaySmall" style={styles.headline}>
        Don't use it?
      </Text>
      <Text variant="displaySmall" style={styles.coralText}>
        Don't waste it.
      </Text>
      <Text variant="displaySmall" style={styles.emeraldText}>
        Rent it.
      </Text>
      <Text variant="bodyLarge" style={styles.subtitle}>
        Discover thousands of items from your neighbors. From power tools to designer clothes, find
        what you need without buying it.
      </Text>

      {/* Stat Badges */}
      <View style={styles.statsRow}>
        <View style={styles.statBadge}>
          <MaterialCommunityIcons name="creation" size={20} color={colors.accentBlue} />
          <Text variant="labelLarge" style={styles.statText}>
            {itemCount} items available
          </Text>
        </View>
        <View style={styles.statBadge}>
          <MaterialCommunityIcons name="trending-up" size={20} color={colors.accentEmerald} />
          <Text variant="labelLarge" style={styles.statText}>
            Growing community
          </Text>
        </View>
      </View>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.primary,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
  },
  menuBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  langText: {
    color: '#9CA3AF',
  },
  langBold: {
    fontWeight: '700',
    color: '#D1D5DB',
  },
  bellBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
  },
  headline: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  coralText: {
    color: colors.accentCoral,
    fontWeight: '700',
  },
  emeraldText: {
    color: colors.accentEmerald,
    fontWeight: '700',
  },
  subtitle: {
    color: '#D1D5DB',
    marginTop: 16,
    lineHeight: 24,
  },
  statsRow: {
    marginTop: 24,
    gap: 12,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#374151',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4B5563',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 10,
  },
  statText: {
    color: '#FFFFFF',
  },
});
