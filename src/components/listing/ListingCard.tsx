import React from 'react';
import { View, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Text, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Listing } from '../../types/listing';
import { FavoriteButton } from './FavoriteButton';
import { colors } from '../../theme';

interface ListingCardProps {
  listing: Listing;
  onPress: () => void;
  onToggleLike: () => void;
}

export const ListingCard = ({ listing, onPress, onToggleLike }: ListingCardProps) => (
  <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.8}>
    <View style={styles.imageWrapper}>
      <Image source={{ uri: listing.images[0] }} style={styles.image} />
      <Chip style={styles.categoryBadge} textStyle={styles.categoryText}>
        {listing.category}
      </Chip>
      <View style={styles.favoriteWrapper}>
        <FavoriteButton isLiked={listing.isLiked} likes={listing.likes} onPress={onToggleLike} />
      </View>
    </View>
    <View style={styles.info}>
      <Text variant="titleSmall" numberOfLines={1} style={styles.title}>
        {listing.title}
      </Text>
      <View style={styles.row}>
        <View style={styles.ratingRow}>
          <MaterialCommunityIcons name="star" size={14} color={colors.warning} />
          <Text variant="bodySmall" style={styles.rating}>
            {listing.rating}
          </Text>
          <Text variant="bodySmall" style={styles.reviews}>
            ({listing.totalReviews})
          </Text>
        </View>
        <Text variant="titleSmall" style={styles.price}>
          €{listing.pricePerDay}
          <Text variant="bodySmall" style={styles.perDay}>
            /day
          </Text>
        </Text>
      </View>
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.cardLight,
    borderRadius: 12,
    overflow: 'hidden',
    width: 200,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  imageWrapper: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 140,
    backgroundColor: '#E5E7EB',
  },
  categoryBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(31, 41, 55, 0.85)',
    height: 28,
  },
  categoryText: {
    color: '#FFFFFF',
    fontSize: 11,
  },
  favoriteWrapper: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
    padding: 4,
  },
  info: {
    padding: 10,
  },
  title: {
    color: colors.textPrimary,
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  rating: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  reviews: {
    color: colors.textSecondary,
  },
  price: {
    color: colors.accentBlue,
    fontWeight: '700',
  },
  perDay: {
    color: colors.textSecondary,
    fontWeight: '400',
  },
});
