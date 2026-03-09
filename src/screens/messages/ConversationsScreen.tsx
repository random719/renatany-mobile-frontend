import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { GlobalHeader } from '../../components/common/GlobalHeader';
import { colors } from '../../theme';

export const ConversationsScreen = () => {
    return (
        <View style={styles.container}>
            <GlobalHeader />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <View style={styles.titleRow}>
                        <Text variant="displaySmall" style={styles.title}>My Conversations</Text>
                        <TouchableOpacity style={styles.stripeBtn}>
                            <MaterialCommunityIcons name="alert-circle-outline" size={18} color={colors.accentBlue} />
                            <Text style={styles.stripeText}>Test Stripe</Text>
                        </TouchableOpacity>
                    </View>
                    <Text variant="bodyMedium" style={styles.subtitle}>
                        Active conversations only (last 7 days)
                    </Text>
                </View>

                <View style={styles.tabContainer}>
                    <View style={styles.tabs}>
                        <TouchableOpacity style={[styles.tab, styles.activeTab]}>
                            <MaterialCommunityIcons name="message-outline" size={18} color="#1E293B" />
                            <Text style={styles.activeTabText}>Sent (0)</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.tab}>
                            <MaterialCommunityIcons name="package-variant" size={18} color="#64748B" />
                            <Text style={styles.tabText}>Inbox (0)</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.emptyCard}>
                        <MaterialCommunityIcons name="message-text-outline" size={72} color="#CBD5E1" style={styles.emptyIcon} />
                        <Text variant="headlineSmall" style={styles.emptyTitle}>No active requests</Text>
                        <Text variant="bodyMedium" style={styles.emptySubtitle}>
                            You haven't sent any rental requests recently
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
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    title: {
        fontWeight: '800',
        color: '#0F172A',
        flex: 1,
    },
    stripeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 8,
        paddingHorizontal: 12,
        height: 40,
    },
    stripeText: {
        color: colors.accentBlue,
        fontWeight: '600',
        fontSize: 14,
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
