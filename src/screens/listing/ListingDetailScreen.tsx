import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect } from 'react';
import { Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Avatar, Button, Text } from 'react-native-paper';
import { GlobalHeader } from '../../components/common/GlobalHeader';
import { Footer } from '../../components/home/Footer';
import { useListingStore } from '../../store/listingStore';
import { colors } from '../../theme';
import { HomeStackParamList } from '../../types/navigation';

type Route = RouteProp<HomeStackParamList, 'ListingDetail'>;

export const ListingDetailScreen = () => {
  const route = useRoute<Route>();
  const navigation = useNavigation();
  const { listingId } = route.params;
  const { selectedListing: listing, isLoading, fetchListingById } = useListingStore();

  useEffect(() => {
    fetchListingById(listingId);
  }, [listingId, fetchListingById]);

  if (isLoading || !listing) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.mainContainer}>
      <GlobalHeader />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Secondary Header */}
        <View style={styles.secondaryHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.titleContainer}>
            <Text variant="headlineSmall" style={styles.listingTitle}>
              {listing.title}
            </Text>
            <View style={styles.locationContainer}>
              <MaterialCommunityIcons name="map-marker-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.locationText}>
                {listing.location.city}, Japan
              </Text>
            </View>
          </View>

          <View style={styles.actionIcons}>
            <TouchableOpacity style={styles.headerIconButton}>
              <MaterialCommunityIcons name="share-variant-outline" size={20} color={colors.textPrimary} />
              <Text style={styles.headerIconText}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.reportButton}>
              <MaterialCommunityIcons name="alert-outline" size={20} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Hero Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: listing.images[0] }}
            style={styles.heroImage}
            resizeMode="cover"
          />
        </View>

        {/* Pricing & Quick Info Card */}
        <View style={styles.pricingCard}>
          <View style={styles.priceRow}>
            <View style={styles.priceContainer}>
              <Text variant="displaySmall" style={styles.priceAmount}>
                ${listing.pricePerDay}
              </Text>
              <Text style={styles.priceUnit}>/day</Text>
            </View>
            <View style={styles.tagsContainer}>
              <View style={[styles.tag, { backgroundColor: '#FDF2F8' }]}>
                <Text style={[styles.tagText, { color: '#DB2777' }]}>fashion</Text>
              </View>
              <View style={[styles.tag, { backgroundColor: '#EFF6FF' }]}>
                <Text style={[styles.tagText, { color: '#2563EB' }]}>good</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.askQuestionBtn}>
            <MaterialCommunityIcons name="chat-outline" size={20} color={colors.textPrimary} />
            <Text style={styles.askQuestionText}>Ask a Question</Text>
          </TouchableOpacity>

          <View style={styles.infoGrid}>
            <View style={styles.infoRow}>
              <View style={styles.infoLabelContainer}>
                <MaterialCommunityIcons name="shield-outline" size={18} color={colors.textSecondary} />
                <Text style={styles.infoLabel}>Security Deposit</Text>
              </View>
              <Text style={styles.infoValue}>$60</Text>
            </View>
            <View style={styles.infoRow}>
              <View style={styles.infoLabelContainer}>
                <MaterialCommunityIcons name="clock-outline" size={18} color={colors.textSecondary} />
                <Text style={styles.infoLabel}>Min/Max Days</Text>
              </View>
              <Text style={styles.infoValue}>1 - 30 days</Text>
            </View>
          </View>

          <View style={styles.deliverySection}>
            <Text style={styles.deliveryTitle}>Delivery Options:</Text>
            <View style={styles.deliveryBadge}>
              <MaterialCommunityIcons name="map-marker" size={14} color="#EF4444" />
              <Text style={styles.deliveryText}>Pickup at location</Text>
            </View>
          </View>
        </View>

        {/* About Section */}
        <View style={styles.sectionCard}>
          <Text variant="titleLarge" style={styles.sectionTitle}>About this item</Text>
          <Text style={styles.descriptionText}>{listing.description}</Text>
        </View>

        {/* Owner Section */}
        <View style={styles.sectionCard}>
          <View style={styles.ownerRow}>
            <Avatar.Image
              size={48}
              source={{ uri: 'https://i.pravatar.cc/150?img=12' }}
            />
            <View style={styles.ownerInfo}>
              <Text variant="titleMedium" style={styles.ownerName}>Owner</Text>
              <Text style={styles.ownerHandle}>@renter1</Text>
            </View>
          </View>
        </View>

        {/* Connect Card To Rent Section */}
        <View style={styles.sectionCard}>
          <View style={styles.connectHeader}>
            <View style={styles.infoIconContainer}>
              <MaterialCommunityIcons name="information-outline" size={24} color="#3B82F6" />
            </View>
            <Text variant="titleLarge" style={styles.connectTitle}>Connect card to rent</Text>
            <Text style={styles.connectDescription}>
              Connect your payment card to make rental payments and start renting items.
            </Text>
          </View>

          <View style={styles.statusBadges}>
            <View style={styles.statusBadge}>
              <MaterialCommunityIcons name="shield-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.statusBadgeText}>Card not connected</Text>
            </View>
            <View style={styles.statusBadge}>
              <MaterialCommunityIcons name="shield-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.statusBadgeText}>Bank not connected</Text>
            </View>
          </View>

          <Text style={styles.connectPrompt}>Connect your card to rent this item</Text>

          <View style={styles.blueInfoBox}>
            <Text style={styles.blueInfoText}>
              Connect your card to make rental payments.
            </Text>
          </View>

          <Button
            mode="contained"
            style={styles.connectCardBtn}
            icon="shield-outline"
          >
            Connect Card (to Rent)
          </Button>

          <Button
            mode="outlined"
            style={styles.connectBankBtn}
            icon="shield-outline"
          >
            Connect Bank Account (to Lend)
          </Button>

          <Text style={styles.stripeDisclaimer}>
            We use Stripe to securely process payments. Your payment information is encrypted and securely handled by Stripe.
          </Text>
        </View>

        <Footer />
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab}>
        <View style={styles.fabGradient}>
          <MaterialCommunityIcons name="robot" size={24} color="#FFFFFF" />
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  secondaryHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#F8FAFC',
  },
  backButton: {
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  titleContainer: {
    flex: 1,
    marginLeft: 16,
  },
  listingTitle: {
    fontWeight: '800',
    color: '#0F172A',
    fontSize: 28,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  locationText: {
    color: '#64748B',
    fontSize: 15,
  },
  actionIcons: {
    flexDirection: 'row',
    gap: 8,
  },
  headerIconButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  headerIconText: {
    fontWeight: '600',
    fontSize: 14,
  },
  reportButton: {
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    justifyContent: 'center',
  },
  imageContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  heroImage: {
    width: '100%',
    height: 300,
    borderRadius: 24,
  },
  pricingCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceAmount: {
    fontWeight: '800',
    color: '#0F172A',
  },
  priceUnit: {
    fontSize: 18,
    color: '#64748B',
    marginLeft: 4,
  },
  tagsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tagText: {
    fontWeight: '700',
    fontSize: 12,
  },
  askQuestionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
    marginBottom: 20,
  },
  askQuestionText: {
    fontWeight: '600',
    fontSize: 16,
    color: '#0F172A',
  },
  infoGrid: {
    gap: 12,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoLabel: {
    color: '#64748B',
    fontSize: 15,
  },
  infoValue: {
    fontWeight: '700',
    color: '#0F172A',
    fontSize: 15,
  },
  deliverySection: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 16,
  },
  deliveryTitle: {
    color: '#64748B',
    fontSize: 14,
    marginBottom: 12,
  },
  deliveryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  deliveryText: {
    fontWeight: '600',
    fontSize: 13,
    color: '#0F172A',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
  },
  sectionTitle: {
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  descriptionText: {
    color: '#4B5563',
    lineHeight: 24,
    fontSize: 15,
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  ownerInfo: {
    flex: 1,
  },
  ownerName: {
    fontWeight: '700',
    color: '#111827',
  },
  ownerHandle: {
    color: '#6B7280',
    fontSize: 14,
  },
  connectHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  infoIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  connectTitle: {
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  connectDescription: {
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    fontSize: 14,
  },
  statusBadges: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  connectPrompt: {
    textAlign: 'center',
    color: '#64748B',
    marginBottom: 16,
    fontSize: 14,
  },
  blueInfoBox: {
    backgroundColor: '#EFF6FF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  blueInfoText: {
    color: '#1E40AF',
    textAlign: 'center',
    fontSize: 14,
  },
  connectCardBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 4,
    marginBottom: 12,
  },
  connectBankBtn: {
    borderColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 4,
    marginBottom: 20,
  },
  stripeDisclaimer: {
    color: '#94A3B8',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 30, // Positioned above footer if scrolled to bottom
    shadowColor: '#5856D6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
