import { useUser } from '@clerk/expo';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { FAB, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography } from '../../theme';

type NavKey = 'home' | 'search' | 'list' | 'favorites' | 'profile' | 'none';

interface AppBottomNavBarProps {
  activeKey?: NavKey;
}

const ADMIN_EMAILS = new Set(['collegeworks0910@gmail.com', 'admin@rentany.fr']);

export const AppBottomNavBar = ({ activeKey = 'none' }: AppBottomNavBarProps) => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { user: clerkUser } = useUser();
  const primaryEmail = clerkUser?.primaryEmailAddress?.emailAddress?.toLowerCase() || '';
  const metadataRole = typeof clerkUser?.publicMetadata?.role === 'string'
    ? clerkUser.publicMetadata.role.toLowerCase()
    : '';
  const isAdmin = metadataRole === 'admin' || ADMIN_EMAILS.has(primaryEmail);

  const navigateToMainTab = (screen: string) => {
    navigation.navigate('Main', { screen });
  };

  const renderItem = (
    key: NavKey,
    label: string,
    icon: string,
    onPress: () => void
  ) => {
    const active = activeKey === key;

    return (
      <TouchableOpacity
        key={key}
        style={styles.navItem}
        activeOpacity={0.8}
        onPress={onPress}
      >
        <MaterialCommunityIcons
          name={icon as any}
          size={22}
          color={active ? colors.primary : colors.textSecondary}
        />
        <Text style={[styles.navLabel, active && styles.navLabelActive]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.inner}>
        {renderItem('home', 'Home', 'home', () => navigateToMainTab('HomeTab'))}
        {renderItem('search', 'Search', 'magnify', () => navigateToMainTab('SearchTab'))}

        {isAdmin ? (
          renderItem('profile', 'Profile', 'account-outline', () => navigateToMainTab('ProfileTab'))
        ) : (
          <>
            <View style={styles.fabSlot}>
              <TouchableOpacity activeOpacity={0.9} onPress={() => navigateToMainTab('ListItemTab')}>
                <FAB icon="plus" size="small" style={styles.fab} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            {renderItem('favorites', 'Favorites', 'heart-outline', () => navigateToMainTab('FavoritesTab'))}
            {renderItem('profile', 'Profile', 'account-outline', () => navigateToMainTab('ProfileTab'))}
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.cardLight,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  inner: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 4,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  navLabel: {
    fontSize: typography.small,
    color: colors.textSecondary,
  },
  navLabelActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  fabSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    backgroundColor: colors.primary,
    borderRadius: 28,
  },
});
