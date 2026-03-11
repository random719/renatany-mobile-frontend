import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { GlobalHeader } from '../../components/common/GlobalHeader';
import { Footer } from '../../components/home/Footer';
import { ListingCard } from '../../components/listing/ListingCard';
import { useListingStore } from '../../store/listingStore';
import { colors, typography } from '../../theme';
import { FavoritesStackParamList } from '../../types/navigation';

type Nav = StackNavigationProp<FavoritesStackParamList, 'Favorites'>;

export const FavoritesScreen = () => {
    const navigation = useNavigation<Nav>();
    const { listings, toggleLike } = useListingStore();

    const [page, setPage] = useState(1);
    const ITEMS_PER_PAGE = 20;

    const favoriteListings = useMemo(() => {
        return listings.filter((l) => l.isLiked);
    }, [listings]);

    const paginatedData = useMemo(() => {
        return favoriteListings.slice(0, page * ITEMS_PER_PAGE);
    }, [favoriteListings, page]);

    const handleLoadMore = () => {
        if (page * ITEMS_PER_PAGE < favoriteListings.length) {
            setPage((prev) => prev + 1);
        }
    };

    return (
        <View style={styles.container}>
            <GlobalHeader />
            <FlatList
                data={paginatedData}
                keyExtractor={(item) => item.id}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                ListHeaderComponent={
                    <>
                        <View style={styles.headerSection}>
                            <TouchableOpacity
                                style={styles.backBtn}
                                onPress={() => navigation.goBack()}
                            >
                                <MaterialCommunityIcons name="arrow-left" size={20} color={colors.textSecondary} />
                                <Text style={styles.backBtnText}>Back to Browse</Text>
                            </TouchableOpacity>

                            <View style={styles.titleRow}>
                                <Text variant="displaySmall" style={styles.heartIcon}>
                                    ❤️
                                </Text>
                                <Text variant="displaySmall" style={styles.title}>
                                    My Favorites
                                </Text>
                            </View>

                            <Text variant="bodyLarge" style={styles.countText}>
                                {favoriteListings.length} {favoriteListings.length === 1 ? 'item' : 'items'} saved
                            </Text>
                        </View>
                    </>
                }
                renderItem={({ item }) => (
                    <View style={styles.cardWrapper}>
                        <ListingCard
                            listing={item}
                            onPress={() => navigation.navigate('ListingDetail', { listingId: item.id })}
                            onToggleLike={() => toggleLike(item.id)}
                        />
                    </View>
                )}
                ListFooterComponent={
                    <>
                        {page * ITEMS_PER_PAGE < favoriteListings.length && (
                            <ActivityIndicator style={{ paddingVertical: 20 }} color={colors.primary} />
                        )}
                        <Footer />
                    </>
                }
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    listContent: {
        paddingBottom: 24,
    },
    headerSection: {
        paddingHorizontal: 24,
        paddingTop: 32,
        paddingBottom: 32,
    },
    backBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 32,
    },
    backBtnText: {
        color: '#334155',
        fontSize: typography.body,
        fontWeight: '500',
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 8,
    },
    heartIcon: {
        fontSize: typography.displayXL,
    },
    title: {
        fontWeight: '800',
        color: '#111827',
    },
    countText: {
        color: '#64748B',
        fontSize: typography.tabLabel,
    },
    cardWrapper: {
        paddingHorizontal: 16,
        marginBottom: 20,
    },
});
