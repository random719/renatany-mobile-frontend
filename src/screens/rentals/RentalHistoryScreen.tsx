import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { GlobalHeader } from '../../components/common/GlobalHeader';
import { colors, typography } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { getRentalRequests } from '../../services/rentalService';
import { RentalRequest } from '../../types/models';

export const RentalHistoryScreen = () => {
    const { user } = useAuthStore();
    const [rentals, setRentals] = useState<RentalRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchRentals = async () => {
            if (!user?.email) {
                setIsLoading(false);
                return;
            }
            try {
                setIsLoading(true);
                const [asRenter, asOwner] = await Promise.all([
                    getRentalRequests({ renter_email: user.email }),
                    getRentalRequests({ owner_email: user.email })
                ]);
                
                const allRentals = [...asRenter, ...asOwner];
                // Deduplicate by ID
                const uniqueRentals = Array.from(new Map(allRentals.map(item => [item.id, item])).values());
                // Filter for completed rentals
                const completed = uniqueRentals.filter(r => r.status === 'completed');
                // Sort by end_date descending
                completed.sort((a, b) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime());
                
                setRentals(completed);
            } catch (error) {
                console.error('Error fetching rental history:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchRentals();
    }, [user?.email]);

    return (
        <View style={styles.container}>
            <GlobalHeader />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <Text variant="displaySmall" style={styles.title}>Rental History</Text>
                    <Text variant="bodyLarge" style={styles.subtitle}>
                        View all your completed rentals and download receipts
                    </Text>
                </View>

                <View style={styles.searchContainer}>
                    <View style={styles.searchBar}>
                        <MaterialCommunityIcons name="magnify" size={20} color={colors.textSecondary} />
                        <TextInput
                            placeholder="Search rentals..."
                            placeholderTextColor={colors.textSecondary}
                            style={styles.searchInput}
                        />
                    </View>

                    <TouchableOpacity style={styles.filterDropdown}>
                        <Text style={styles.filterText}>All Rentals</Text>
                        <MaterialCommunityIcons name="chevron-down" size={20} color={colors.textPrimary} />
                    </TouchableOpacity>
                </View>

                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                ) : rentals.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Text variant="bodyLarge" style={styles.emptyText}>No rental history found</Text>
                    </View>
                ) : (
                    <View style={styles.listContainer}>
                        {rentals.map((rental) => (
                            <View key={rental.id} style={styles.rentalCard}>
                                <View style={styles.rentalCardHeader}>
                                    <Text style={styles.rentalDate}>
                                        {new Date(rental.start_date).toLocaleDateString()} - {new Date(rental.end_date).toLocaleDateString()}
                                    </Text>
                                    <Text style={styles.rentalAmount}>${rental.total_amount?.toFixed(2)}</Text>
                                </View>
                                <Text style={styles.rentalItemId}>Item ID: {rental.item_id}</Text>
                                <Text style={styles.rentalRole}>
                                    {rental.renter_email === user?.email ? 'Rented from ' + rental.owner_email : 'Rented to ' + rental.renter_email}
                                </Text>
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    scrollContent: {
        paddingBottom: 40,
    },
    header: {
        paddingHorizontal: 24,
        paddingTop: 32,
        paddingBottom: 24,
    },
    title: {
        fontWeight: '800',
        color: '#0F172A',
        marginBottom: 8,
    },
    subtitle: {
        color: '#64748B',
        lineHeight: 24,
    },
    searchContainer: {
        paddingHorizontal: 24,
        gap: 16,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 52,
        gap: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: typography.tabLabel,
        color: '#1E293B',
    },
    filterDropdown: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 52,
    },
    filterText: {
        fontSize: typography.tabLabel,
        color: '#1E293B',
        fontWeight: '500',
    },
    emptyContainer: {
        marginTop: 80,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        color: '#94A3B8',
    },
    loadingContainer: {
        marginTop: 80,
        alignItems: 'center',
        justifyContent: 'center',
    },
    listContainer: {
        paddingHorizontal: 24,
        paddingTop: 24,
        gap: 16,
    },
    rentalCard: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    rentalCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    rentalDate: {
        fontSize: typography.body,
        fontWeight: '600',
        color: '#1E293B',
    },
    rentalAmount: {
        fontSize: typography.tabLabel,
        fontWeight: '700',
        color: colors.primary,
    },
    rentalItemId: {
        fontSize: typography.body,
        color: '#64748B',
        marginBottom: 4,
    },
    rentalRole: {
        fontSize: typography.body,
        color: '#64748B',
    },
});
