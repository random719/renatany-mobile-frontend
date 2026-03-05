import React, { useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, ActivityIndicator, Chip, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRoute, RouteProp } from '@react-navigation/native';
import { ImageCarousel } from '../../components/listing/ImageCarousel';
import { FavoriteButton } from '../../components/listing/FavoriteButton';
import { useListingStore } from '../../store/listingStore';
import { HomeStackParamList } from '../../types/navigation';
import { colors } from '../../theme';

type Route = RouteProp<HomeStackParamList, 'ListingDetail'>;

export const ListingDetailScreen = () => {
  const route = useRoute<Route>();
  const { listingId } = route.params;
  const { selectedListing: listing, isLoading, fetchListingById, toggleLike } =
    useListingStore();

  useEffect(() => {
    fetchListingById(listingId);
  }, [listingId, fetchListingById]);

  if (isLoading || !listing) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <ImageCarousel images={listing.images} />

      <View style={styles.content}>
        {/* Category + Favorite */}
        <View style={styles.topRow}>
          <Chip style={styles.categoryChip}>{listing.category}</Chip>
          <FavoriteButton
            isLiked={listing.isLiked}
            likes={listing.likes}
            onPress={() => toggleLike(listing.id)}
            size={26}
          />
        </View>

        {/* Title */}
        <Text variant="headlineSmall" style={styles.title}>
          {listing.title}
        </Text>

        {/* Rating */}
        <View style={styles.ratingRow}>
          <MaterialCommunityIcons name="star" size={18} color={colors.warning} />
          <Text variant="bodyMedium" style={styles.rating}>
            {listing.rating}
          </Text>
          <Text variant="bodyMedium" style={styles.reviews}>
            ({listing.totalReviews} reviews)
          </Text>
        </View>

        {/* Price */}
        <View style={styles.priceRow}>
          <Text variant="headlineMedium" style={styles.price}>
            €{listing.pricePerDay}
          </Text>
          <Text variant="bodyLarge" style={styles.perDay}>
            / day
          </Text>
        </View>

        <Divider style={styles.divider} />

        {/* Description */}
        <Text variant="titleSmall" style={styles.sectionLabel}>
          Description
        </Text>
        <Text variant="bodyMedium" style={styles.description}>
          {listing.description}
        </Text>

        {/* Features */}
        {listing.features.length > 0 && (
          <>
            <Text variant="titleSmall" style={styles.sectionLabel}>
              Features
            </Text>
            <View style={styles.chipRow}>
              {listing.features.map((f) => (
                <Chip key={f} style={styles.featureChip} textStyle={styles.featureText}>
                  {f}
                </Chip>
              ))}
            </View>
          </>
        )}

        {/* Rules */}
        {listing.rules.length > 0 && (
          <>
            <Text variant="titleSmall" style={styles.sectionLabel}>
              Rules
            </Text>
            {listing.rules.map((rule) => (
              <View key={rule} style={styles.ruleRow}>
                <MaterialCommunityIcons
                  name="alert-circle-outline"
                  size={16}
                  color={colors.warning}
                />
                <Text variant="bodyMedium" style={styles.ruleText}>
                  {rule}
                </Text>
              </View>
            ))}
          </>
        )}

        {/* Location */}
        <Text variant="titleSmall" style={styles.sectionLabel}>
          Location
        </Text>
        <View style={styles.locationRow}>
          <MaterialCommunityIcons name="map-marker-outline" size={18} color={colors.textSecondary} />
          <Text variant="bodyMedium" style={styles.locationText}>
            {listing.location.address}, {listing.location.city}
          </Text>
        </View>

        <Divider style={styles.divider} />

        {/* Action Buttons */}
        <View style={styles.actions}>
          <Button
            mode="contained"
            style={styles.rentBtn}
            labelStyle={styles.rentBtnLabel}
            icon="cart-outline"
          >
            Rent Now
          </Button>
          <Button
            mode="outlined"
            style={styles.chatBtn}
            icon="chat-outline"
          >
            Chat with Owner
          </Button>
        </View>
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryChip: {
    backgroundColor: '#EFF6FF',
  },
  title: {
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  rating: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  reviews: {
    color: colors.textSecondary,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  price: {
    color: colors.accentBlue,
    fontWeight: '700',
  },
  perDay: {
    color: colors.textSecondary,
  },
  divider: {
    marginVertical: 16,
  },
  sectionLabel: {
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 8,
  },
  description: {
    color: colors.textSecondary,
    lineHeight: 22,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  featureChip: {
    backgroundColor: '#F0FDF4',
  },
  featureText: {
    color: colors.accentEmerald,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  ruleText: {
    color: colors.textSecondary,
    flex: 1,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationText: {
    color: colors.textSecondary,
  },
  actions: {
    gap: 12,
  },
  rentBtn: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 4,
  },
  rentBtnLabel: {
    fontSize: 16,
  },
  chatBtn: {
    borderColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 4,
  },
  bottomSpacer: {
    height: 32,
  },
});
