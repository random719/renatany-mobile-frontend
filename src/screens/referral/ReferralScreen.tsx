import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useUser } from '@clerk/expo';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as Clipboard from 'expo-clipboard';
import React, { useState } from 'react';
import {
  Alert,
  Platform,
  Share,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Text } from 'react-native-paper';
import { ScreenLayout } from '../../components/common/ScreenLayout';
import { colors } from '../../theme';
import { RootStackParamList } from '../../types/navigation';

type Nav = StackNavigationProp<RootStackParamList>;

const STEPS = [
  {
    icon: 'link-variant' as const,
    title: 'Share Your Link',
    description: 'Copy your unique referral link and share it with friends.',
  },
  {
    icon: 'account-plus' as const,
    title: 'Friend Signs Up',
    description: 'Your friend creates an account using your referral link.',
  },
  {
    icon: 'gift' as const,
    title: 'Both Benefit',
    description: 'You and your friend both enjoy the Rentany platform!',
  },
];

export const ReferralScreen = () => {
  const navigation = useNavigation<Nav>();
  const { user: clerkUser } = useUser();
  const userEmail = clerkUser?.emailAddresses?.[0]?.emailAddress;
  const userId = clerkUser?.id;

  const [copied, setCopied] = useState(false);

  const referralCode = userId ? userId.slice(-8).toUpperCase() : 'RENTANY';
  const referralLink = `https://rentany.com/signup?ref=${referralCode}`;

  const handleCopy = async () => {
    await Clipboard.setStringAsync(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join me on Rentany — the best way to rent anything! Use my referral link: ${referralLink}`,
        title: 'Join Rentany',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <ScreenLayout showBottomNav bottomNavActiveKey="none">
        <View style={styles.contentWrapper}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#0F172A" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          {/* Hero */}
          <View style={styles.heroCard}>
            <View style={styles.heroIcon}>
              <MaterialCommunityIcons name="account-group" size={40} color="#FFFFFF" />
            </View>
            <Text style={styles.heroTitle}>Invite Friends to Rentany</Text>
            <Text style={styles.heroSubtitle}>
              Share the joy of renting! Invite your friends and grow the community.
            </Text>
          </View>

          {/* Referral Link */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Referral Link</Text>
            <View style={styles.linkCard}>
              <View style={styles.linkRow}>
                <Text style={styles.linkText} numberOfLines={1}>{referralLink}</Text>
                <TouchableOpacity style={styles.copyBtn} onPress={handleCopy}>
                  <MaterialCommunityIcons
                    name={copied ? 'check' : 'content-copy'}
                    size={18}
                    color={copied ? '#10B981' : '#6B7280'}
                  />
                  <Text style={[styles.copyBtnText, copied && { color: '#10B981' }]}>
                    {copied ? 'Copied!' : 'Copy'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.codeRow}>
                <Text style={styles.codeLabel}>Your code:</Text>
                <View style={styles.codeBadge}>
                  <Text style={styles.codeText}>{referralCode}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Share Buttons */}
          <View style={styles.shareRow}>
            <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
              <MaterialCommunityIcons name="share-variant" size={22} color="#FFFFFF" />
              <Text style={styles.shareBtnText}>Share Link</Text>
            </TouchableOpacity>
          </View>

          {/* How It Works */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>How It Works</Text>
            {STEPS.map((step, index) => (
              <View key={index} style={styles.stepCard}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                </View>
                <View style={styles.stepContent}>
                  <View style={styles.stepHeader}>
                    <MaterialCommunityIcons name={step.icon} size={20} color={colors.primary} />
                    <Text style={styles.stepTitle}>{step.title}</Text>
                  </View>
                  <Text style={styles.stepDescription}>{step.description}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScreenLayout>
    </View>
  );
};

const styles = StyleSheet.create({
  contentWrapper: { flex: 1, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 48, maxWidth: 768, width: '100%', alignSelf: 'center' },
  backButton: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backText: { fontSize: 16, fontWeight: '500', color: '#0F172A', marginLeft: 6 },
  // Hero
  heroCard: { backgroundColor: colors.primary, borderRadius: 16, padding: 28, alignItems: 'center', marginBottom: 28 },
  heroIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  heroTitle: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF', textAlign: 'center', marginBottom: 8 },
  heroSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', textAlign: 'center', lineHeight: 20 },
  // Section
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#0F172A', marginBottom: 12 },
  // Link
  linkCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  linkText: { flex: 1, fontSize: 14, color: '#374151', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#F3F4F6' },
  copyBtnText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  codeLabel: { fontSize: 13, color: '#6B7280' },
  codeBadge: { backgroundColor: '#EEF2FF', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6 },
  codeText: { fontSize: 15, fontWeight: '700', color: '#4F46E5', letterSpacing: 1 },
  // Share
  shareRow: { marginBottom: 28 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#3B82F6', paddingVertical: 14, borderRadius: 12 },
  shareBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  // Steps
  stepCard: { flexDirection: 'row', gap: 14, marginBottom: 16 },
  stepNumber: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  stepNumberText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  stepContent: { flex: 1 },
  stepHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  stepTitle: { fontSize: 15, fontWeight: '600', color: '#0F172A' },
  stepDescription: { fontSize: 14, color: '#6B7280', lineHeight: 20 },
});
