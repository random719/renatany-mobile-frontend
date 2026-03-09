import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { GlobalHeader } from '../../components/common/GlobalHeader';

export const DisputesScreen = () => {
    return (
        <View style={styles.container}>
            <GlobalHeader />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <Text variant="displaySmall" style={styles.title}>Disputes</Text>
                    <Text variant="bodyMedium" style={styles.subtitle}>
                        Manage rental disputes and resolutions
                    </Text>
                </View>

                <View style={styles.tabContainer}>
                    <View style={styles.tabs}>
                        <TouchableOpacity style={[styles.tab, styles.activeTab]}>
                            <MaterialCommunityIcons name="file-document-outline" size={18} color="#1E293B" />
                            <Text style={styles.activeTabText}>Filed by Me (0)</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.tab}>
                            <MaterialCommunityIcons name="comment-alert-outline" size={18} color="#64748B" />
                            <Text style={styles.tabText}>Against Me (0)</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.emptyCard}>
                        <MaterialCommunityIcons name="alert-circle-outline" size={72} color="#CBD5E1" style={styles.emptyIcon} />
                        <Text variant="headlineSmall" style={styles.emptyTitle}>No disputes filed</Text>
                        <Text variant="bodyMedium" style={styles.emptySubtitle}>
                            You haven't filed any disputes
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
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
    },
    tabContainer: {
        paddingHorizontal: 16,
    },
    tabs: {
        flexDirection: 'row',
        backgroundColor: '#F1F5F9',
        borderRadius: 12,
        padding: 4,
        marginBottom: 16,
        gap: 4,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: 40,
        borderRadius: 8,
    },
    activeTab: {
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    tabText: {
        color: '#64748B',
        fontWeight: '500',
    },
    activeTabText: {
        color: '#1E293B',
        fontWeight: '600',
    },
    emptyCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 48,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    emptyIcon: {
        marginBottom: 24,
    },
    emptyTitle: {
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 12,
    },
    emptySubtitle: {
        textAlign: 'center',
        color: '#64748B',
        lineHeight: 20,
    },
});
