import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { GlobalHeader } from '../../components/common/GlobalHeader';
import { colors } from '../../theme';

export const RentalHistoryScreen = () => {
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

                <View style={styles.emptyContainer}>
                    <Text variant="bodyLarge" style={styles.emptyText}>No rental history found</Text>
                </View>
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
        fontSize: 16,
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
        fontSize: 16,
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
});
