import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../theme';

interface FavoriteButtonProps {
  isLiked: boolean;
  likes: number;
  onPress: () => void;
  size?: number;
}

export const FavoriteButton = ({ isLiked, likes, onPress, size = 22 }: FavoriteButtonProps) => (
  <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
    <MaterialCommunityIcons
      name={isLiked ? 'heart' : 'heart-outline'}
      size={size}
      color={isLiked ? colors.accentCoral : colors.textSecondary}
    />
    <Text variant="labelSmall" style={[styles.count, isLiked && styles.countLiked]}>
      {likes}
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  count: {
    color: colors.textSecondary,
  },
  countLiked: {
    color: colors.accentCoral,
  },
});
