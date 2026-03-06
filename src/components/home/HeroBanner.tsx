import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
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
        <MaterialCommunityIcons name="menu" size={24} color={colors.textPrimary} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.langSelector}>
        <MaterialCommunityIcons name="web" size={18} color={colors.textPrimary} />
        <Text variant="labelMedium" style={styles.langText}>
          GB English
        </Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onNotificationPress} style={styles.bellBtn}>
        <MaterialCommunityIcons name="bell-outline" size={24} color={colors.textPrimary} />
      </TouchableOpacity>
    </View>

    {/* Hero Text Region */}
    <View style={styles.heroSection}>
      <View style={styles.heroContent}>
        <Text variant="displaySmall" style={styles.headline}>
          Don't use it?
        </Text>
        <Text variant="displaySmall" style={styles.coralText}>
          Don't waste it.
        </Text>
        <Text variant="displaySmall" style={styles.pinkishText}>
          Rent it.
        </Text>
        <Text variant="bodyLarge" style={styles.subtitle}>
          Discover thousands of items from your neighbors. From power tools to designer clothes, find
          what you need without buying it.
        </Text>

        {/* Stat Badges */}
        <View style={styles.statsRow}>
          <TouchableOpacity style={styles.statBadge}>
            <MaterialCommunityIcons name="creation" size={20} color="#FFFFFF" />
            <Text variant="labelLarge" style={styles.statText}>
              {itemCount} items available
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statBadge}>
            <MaterialCommunityIcons name="trending-up" size={20} color="#FFFFFF" />
            <Text variant="labelLarge" style={styles.statText}>
              Growing community
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Privacy & Contact links (Moved from HomeScreen) */}
      <View style={styles.linksRow}>
        <TouchableOpacity>
          <Text variant="bodySmall" style={styles.link}>
            Privacy Policy
          </Text>
        </TouchableOpacity>
        <Text variant="bodySmall" style={styles.linkDot}>
          {' \u2022 '}
        </Text>
        <TouchableOpacity>
          <Text variant="bodySmall" style={styles.link}>
            Contact Us
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.cardLight,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
    backgroundColor: colors.cardLight, // White header
  },
  menuBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  langText: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  bellBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroSection: {
    backgroundColor: '#1E232F', // Darker blueish grey to match screenshot
    paddingBottom: 40,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  heroContent: {
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 32,
    alignItems: 'center',
  },
  headline: {
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
  },
  coralText: {
    color: '#E88264', // Matching the orange/coral shade
    fontWeight: '700',
    textAlign: 'center',
  },
  pinkishText: {
    color: '#D16C7A', // Matching the pink/coral shade
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    color: '#D1D5DB',
    marginTop: 24,
    lineHeight: 24,
    textAlign: 'center',
  },
  statsRow: {
    marginTop: 32,
    gap: 16,
    width: '100%',
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#303643', // slightly lighter than background
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4B5563',
    paddingVertical: 18,
    paddingHorizontal: 20,
    gap: 12,
    width: '100%',
  },
  statText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  linksRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 32,
  },
  link: {
    color: '#E5E7EB', // Using light color on dark background
    fontSize: 13,
  },
  linkDot: {
    color: '#9CA3AF',
    marginHorizontal: 8,
    fontSize: 13,
  },
});
