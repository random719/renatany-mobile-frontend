import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useCallback, useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { colors, typography } from '../../theme';

interface HomeSearchFilterProps {
    onSearch: (query: string) => void;
}

export const HomeSearchFilter = ({ onSearch }: HomeSearchFilterProps) => {
    const [query, setQuery] = useState('');
    const [location, setLocation] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');

    const handleSearch = useCallback(() => {
        if (query.trim()) {
            onSearch(query.trim());
        }
    }, [query, onSearch]);

    return (
        <View style={styles.container}>
            {/* Title & Save Search Row */}
            <View style={styles.headerTitleRow}>
                <Text variant="headlineSmall" style={styles.headerTitle}>
                    Search & Filter
                </Text>
                <TouchableOpacity style={styles.saveBtn}>
                    <MaterialCommunityIcons name="bookmark-outline" size={18} color={colors.textPrimary} />
                    <Text style={styles.saveBtnText}>Save Search</Text>
                </TouchableOpacity>
            </View>

            {/* Inputs */}
            <View style={styles.inputWrapper}>
                <MaterialCommunityIcons name="magnify" size={20} color="#9CA3AF" />
                <TextInput
                    style={styles.input}
                    placeholder="Search items..."
                    placeholderTextColor="#9CA3AF"
                    value={query}
                    onChangeText={setQuery}
                    onSubmitEditing={handleSearch}
                />
            </View>

            <View style={styles.inputWrapper}>
                <MaterialCommunityIcons name="map-marker-outline" size={20} color="#9CA3AF" />
                <TextInput
                    style={styles.input}
                    placeholder="Location..."
                    placeholderTextColor="#9CA3AF"
                    value={location}
                    onChangeText={setLocation}
                />
            </View>

            {/* Categories Dropdown Fake Button */}
            <TouchableOpacity style={styles.dropdownBtn}>
                <Text style={styles.dropdownText}>All Categories</Text>
                <MaterialCommunityIcons name="chevron-down" size={20} color="#6B7280" />
            </TouchableOpacity>

            {/* Advanced Filters & Relevance Row */}
            <View style={styles.filtersRow}>
                <TouchableOpacity style={styles.actionBtnRow}>
                    <MaterialCommunityIcons name="tune-variant" size={18} color={colors.textPrimary} />
                    <Text style={styles.actionBtnText}>Advanced Filters</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionBtnRow}>
                    <MaterialCommunityIcons name="swap-vertical" size={18} color={colors.textPrimary} />
                    <Text style={styles.actionBtnText}>Relevance</Text>
                    <MaterialCommunityIcons name="chevron-down" size={18} color="#6B7280" style={styles.chevronIcon} />
                </TouchableOpacity>
            </View>

            {/* View Toggle */}
            <View style={styles.viewToggleGroup}>
                <TouchableOpacity
                    style={[styles.viewToggleBtn, viewMode === 'grid' && styles.viewToggleBtnActive]}
                    onPress={() => setViewMode('grid')}
                >
                    <MaterialCommunityIcons
                        name="grid"
                        size={20}
                        color={viewMode === 'grid' ? '#111827' : '#6B7280'}
                    />
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.viewToggleBtn, viewMode === 'map' && styles.viewToggleBtnActive]}
                    onPress={() => setViewMode('map')}
                >
                    <MaterialCommunityIcons
                        name="map-outline"
                        size={20}
                        color={viewMode === 'map' ? '#111827' : '#6B7280'}
                    />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingTop: 32, // Padding above the Search & Filter section
        paddingBottom: 24,
        backgroundColor: '#FAFAFA', // Match background slightly off-white
    },
    headerTitleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    headerTitle: {
        color: '#111827',
        fontWeight: '700',
        fontSize: typography.title,
    },
    saveBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    saveBtnText: {
        fontSize: typography.caption,
        fontWeight: '500',
        color: '#111827',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        paddingHorizontal: 14,
        height: 48,
        marginBottom: 12,
        backgroundColor: '#FFFFFF',
    },
    input: {
        flex: 1,
        marginLeft: 10,
        fontSize: typography.label,
        color: '#111827',
    },
    dropdownBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        paddingHorizontal: 14,
        height: 48,
        marginBottom: 16,
        backgroundColor: '#FFFFFF',
    },
    dropdownText: {
        fontSize: typography.label,
        color: '#111827',
    },
    filtersRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
    },
    actionBtnRow: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        height: 44,
        backgroundColor: '#FFFFFF',
    },
    actionBtnText: {
        fontSize: typography.body,
        fontWeight: '500',
        color: '#111827',
    },
    chevronIcon: {
        marginLeft: 8,
    },
    viewToggleGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#FFFFFF',
    },
    viewToggleBtn: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: '#FFFFFF',
    },
    viewToggleBtnActive: {
        backgroundColor: '#F3F4F6',
    },
});
