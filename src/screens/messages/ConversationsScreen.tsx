import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { GlobalHeader } from '../../components/common/GlobalHeader';
import { getRentalRequests } from '../../services/rentalService';
import { useAuthStore } from '../../store/authStore';
import { colors, typography } from '../../theme';
import { RentalRequest } from '../../types/models';

export const ConversationsScreen = () => {
    const { user } = useAuthStore();
    const [conversations, setConversations] = useState<RentalRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'sent' | 'inbox'>('sent');

    useEffect(() => {
        const fetchConversations = async () => {
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
                // Filter for active ('pending', 'approved', 'paid')
                const activeRentals = uniqueRentals.filter(r => ['pending', 'approved', 'paid'].includes(r.status));
                // Sort by updated_date descending
                activeRentals.sort((a, b) => new Date(b.updated_date).getTime() - new Date(a.updated_date).getTime());
                
                setConversations(activeRentals);
            } catch (error) {
                console.error('Error fetching conversations:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchConversations();
    }, [user?.email]);

    const sentByMe = conversations.filter(c => c.renter_email === user?.email);
    const inInbox = conversations.filter(c => c.owner_email === user?.email);
    const displayedConversations = activeTab === 'sent' ? sentByMe : inInbox;

    return (
        <View style={styles.container}>
            <GlobalHeader />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <View style={styles.titleRow}>
                        <Text variant="displaySmall" style={styles.title}>My{'\n'}Conversations</Text>
                        <View style={styles.actionButtons}>
                            <TouchableOpacity style={styles.loadingBtn} disabled>
                                <ActivityIndicator size={16} color={colors.primary} style={styles.loadingSpinner} />
                                <View>
                                    <Text style={styles.loadingText}>Loading</Text>
                                    <Text style={styles.loadingText}>details...</Text>
                                </View>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.stripeBtn}>
                                <MaterialCommunityIcons name="alert-circle-outline" size={18} color={colors.primary} />
                                <Text style={styles.stripeText}>Test Stripe</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                    <Text variant="bodyMedium" style={styles.subtitle}>
                        Active conversations only (last 7 days)
                    </Text>
                </View>

                <View style={styles.mainCard}>
                    <View style={styles.tabs}>
                        <TouchableOpacity 
                            style={[styles.tab, activeTab === 'sent' && styles.activeTab]}
                            onPress={() => setActiveTab('sent')}
                        >
                            <MaterialCommunityIcons name="message-outline" size={18} color={activeTab === 'sent' ? "#1E293B" : "#64748B"} />
                            <Text style={activeTab === 'sent' ? styles.activeTabText : styles.tabText}>Sent ({sentByMe.length})</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.tab, activeTab === 'inbox' && styles.activeTab]}
                            onPress={() => setActiveTab('inbox')}
                        >
                            <MaterialCommunityIcons name="package-variant" size={18} color={activeTab === 'inbox' ? "#1E293B" : "#64748B"} />
                            <Text style={activeTab === 'inbox' ? styles.activeTabText : styles.tabText}>Inbox ({inInbox.length})</Text>
                        </TouchableOpacity>
                    </View>

                    {isLoading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={colors.primary} />
                        </View>
                    ) : displayedConversations.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <MaterialCommunityIcons name="chat-outline" size={80} color="#94A3B8" style={styles.emptyIcon} />
                            <Text variant="titleLarge" style={styles.emptyTitle}>No active requests</Text>
                            <Text variant="bodyMedium" style={styles.emptySubtitle}>
                                {activeTab === 'sent' ? "You haven't sent any rental requests recently" : "You have no incoming rental requests"}
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.listContainer}>
                            {displayedConversations.map(conv => (
                                <View key={conv.id} style={styles.convCard}>
                                    <View style={styles.convHeader}>
                                        <Text style={styles.convStatus}>{conv.status.toUpperCase()}</Text>
                                        <Text style={styles.convDate}>{new Date(conv.updated_date).toLocaleDateString()}</Text>
                                    </View>
                                    <Text style={styles.convTitle}>Request for Item ID: {conv.item_id}</Text>
                                    <Text style={styles.convSubtitle}>
                                        {activeTab === 'sent' ? `To: ${conv.owner_email}` : `From: ${conv.renter_email}`}
                                    </Text>
                                    {conv.message && (
                                        <View style={styles.convMessageContainer}>
                                            <Text style={styles.convMessage} numberOfLines={2}>"{conv.message}"</Text>
                                        </View>
                                    )}
                                </View>
                            ))}
                        </View>
                    )}
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
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    title: {
        fontWeight: '800',
        color: '#0F172A',
        flex: 1,
        lineHeight: 40,
    },
    actionButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    loadingBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EFF6FF',
        borderWidth: 1,
        borderColor: '#DBEAFE',
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 6,
        gap: 8,
    },
    loadingSpinner: {
        marginRight: 4,
    },
    loadingText: {
        color: '#475569',
        fontSize: 10,
        fontWeight: '500',
        lineHeight: 12,
    },
    stripeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#DBEAFE',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    stripeText: {
        color: colors.primary,
        fontWeight: '600',
        fontSize: typography.body,
    },
    subtitle: {
        color: '#64748B',
    },
    mainCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        marginHorizontal: 16,
        paddingBottom: 48,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 2,
    },
    tabs: {
        flexDirection: 'row',
        backgroundColor: '#F8FAFC',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        padding: 8,
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
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    tabText: {
        color: '#64748B',
        fontWeight: '500',
    },
    activeTabText: {
        color: '#1E293B',
        fontWeight: '600',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 64,
        paddingHorizontal: 24,
    },
    emptyIcon: {
        marginBottom: 24,
    },
    emptyTitle: {
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 8,
    },
    emptySubtitle: {
        textAlign: 'center',
        color: '#64748B',
        lineHeight: 22,
        fontSize: typography.body,
    },
    loadingContainer: {
        marginTop: 64,
        alignItems: 'center',
        justifyContent: 'center',
    },
    listContainer: {
        padding: 16,
        gap: 12,
    },
    convCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    convHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    convStatus: {
        fontSize: typography.small,
        fontWeight: '700',
        color: colors.primary,
        backgroundColor: colors.primary + '15',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        overflow: 'hidden',
    },
    convDate: {
        fontSize: typography.small,
        color: '#64748B',
    },
    convTitle: {
        fontSize: typography.tabLabel,
        fontWeight: '600',
        color: '#1E293B',
        marginBottom: 4,
    },
    convSubtitle: {
        fontSize: typography.body,
        color: '#64748B',
        marginBottom: 8,
    },
    convMessageContainer: {
        backgroundColor: '#F8FAFC',
        padding: 12,
        borderRadius: 8,
        marginTop: 4,
    },
    convMessage: {
        fontSize: typography.body,
        fontStyle: 'italic',
        color: '#475569',
    },
});

