import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Image, StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';
import { colors, typography } from '../../theme';
import { Listing } from '../../types/listing';
import { FavoriteButton } from './FavoriteButton';

interface ListingCardProps {
  listing: Listing;
  onPress: () => void;
  onToggleLike: () => void;
  style?: ViewStyle;
}

export const ListingCard = ({ listing, onPress, onToggleLike, style }: ListingCardProps) => (
  <TouchableOpacity style={[styles.container, style]} onPress={onPress} activeOpacity={0.8}>
    <View style={styles.imageWrapper}>
      <Image source={{ uri: listing.images[0] }} style={styles.image} />

      {/* Pink Category Badge */}
      <View style={styles.categoryBadge}>
        <Text style={styles.categoryText}>{listing.category}</Text>
      </View>

      <View style={styles.favoriteWrapper}>
        <FavoriteButton isLiked={listing.isLiked} likes={listing.likes} onPress={onToggleLike} />
      </View>
    </View>

    <View style={styles.info}>
      <Text variant="titleMedium" numberOfLines={1} style={styles.title}>
        {listing.title}
      </Text>

      <View style={styles.locationRow}>
        <MaterialCommunityIcons name="map-marker-outline" size={14} color={colors.textSecondary} />
        <Text variant="bodySmall" style={styles.locationText}>
          {listing.location?.address || 'Location Unavailable'}
        </Text>
      </View>

      <Text variant="titleMedium" style={styles.price}>
        €{listing.pricePerDay}
        <Text variant="bodySmall" style={styles.perDay}>
          /day
        </Text>
      </Text>

      {/* View Button */}
      <View style={styles.viewButton}>
        <MaterialCommunityIcons name="eye-outline" size={16} color="#FFFFFF" />
        <Text style={styles.viewButtonText}>View</Text>
      </View>
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    width: '100%', // Use 100% width so it fits within flexible grid parents without overflowing
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6', // Very subtle border
  },
  imageWrapper: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 280, // Taller image for the square apperance
    backgroundColor: '#E5E7EB',
  },
  categoryBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#FCE7F3', // Light pink
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    color: '#BE185D', // Dark pink text
    fontSize: typography.small,
    fontWeight: '700',
  },
  favoriteWrapper: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  info: {
    padding: 16,
  },
  title: {
    color: '#111827',
    fontWeight: '700',
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  locationText: {
    color: colors.textSecondary,
  },
  price: {
    color: '#111827', // Darker text for price
    fontWeight: '800',
    marginBottom: 16,
  },
  perDay: {
    color: '#6B7280',
    fontWeight: '400',
    fontSize: typography.small,
  },
  viewButton: {
    flexDirection: 'row',
    backgroundColor: '#2A3441', // Dark slate blue
    borderRadius: 8,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  viewButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: typography.body,
  },
});
