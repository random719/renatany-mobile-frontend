import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useI18n } from '../../i18n';
import { colors, typography } from '../../theme';
import { GlobalHeader } from '../common/GlobalHeader';

interface HeroBannerProps {
  availableCount: number | null;
  onMenuPress?: () => void;
  onNotificationPress?: () => void;
  onItemsAvailablePress?: () => void;
  onGrowingCommunityPress?: () => void;
}

export const HeroBanner = ({ 
  availableCount, 
  onMenuPress, 
  onNotificationPress,
  onItemsAvailablePress,
  onGrowingCommunityPress
}: HeroBannerProps) => {
  const { t } = useI18n();

  return (
  <View style={styles.container}>
    <GlobalHeader onMenuPress={onMenuPress} onNotificationPress={onNotificationPress} />

    {/* Hero Text Region */}
    <View style={styles.heroSection}>
      <View style={styles.heroContent}>
        <Text variant="displaySmall" style={styles.headline}>
          {t('hero.line1')}
        </Text>
        <Text variant="displaySmall" style={styles.coralText}>
          {t('hero.line2')}
        </Text>
        <Text variant="displaySmall" style={styles.pinkishText}>
          {t('hero.line3')}
        </Text>
        <Text variant="bodyLarge" style={styles.subtitle}>
          {t('hero.subtitle')}
        </Text>

        {/* Stat Badges */}
        <View style={styles.statsRow}>
          <TouchableOpacity style={styles.statBadge} onPress={onItemsAvailablePress}>
            <MaterialCommunityIcons name="creation" size={20} color="#FFFFFF" />
            <Text variant="labelLarge" style={styles.statText}>
              {availableCount !== null ? t('hero.itemsAvailable', { count: availableCount }) : t('header.loading')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statBadge} onPress={onGrowingCommunityPress}>
            <MaterialCommunityIcons name="trending-up" size={20} color="#FFFFFF" />
            <Text variant="labelLarge" style={styles.statText}>
              {t('hero.growingCommunity')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Privacy & Contact links (Moved from HomeScreen) */}
      <View style={styles.linksRow}>
        <TouchableOpacity>
          <Text variant="bodySmall" style={styles.link}>
            {t('footer.privacyPolicy')}
          </Text>
        </TouchableOpacity>
        <Text variant="bodySmall" style={styles.linkDot}>
          {' \u2022 '}
        </Text>
        <TouchableOpacity>
          <Text variant="bodySmall" style={styles.link}>
            {t('footer.contactUs')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
);
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.cardLight,
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
    fontSize: typography.caption,
  },
  linkDot: {
    color: '#9CA3AF',
    marginHorizontal: 8,
    fontSize: typography.caption,
  },
});
