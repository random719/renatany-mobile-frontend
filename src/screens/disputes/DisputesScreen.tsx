import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { GlobalHeader } from '../../components/common/GlobalHeader';
import { getDisputes } from '../../services/disputeService';
import { useAuthStore } from '../../store/authStore';
import { colors, typography } from '../../theme';
import { Dispute } from '../../types/models';
import { RootStackParamList } from '../../types/navigation';

export const DisputesScreen = () => {
    const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
    const { user } = useAuthStore();
    const [disputes, setDisputes] = useState<Dispute[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'filed' | 'against'>('filed');

    useEffect(() => {
        const fetchDisputes = async () => {
            if (!user?.email) {
                setIsLoading(false);
                return;
            }
            try {
                setIsLoading(true);
                const data = await getDisputes();
                setDisputes(data);
            } catch (error) {
                console.error('Error fetching disputes:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDisputes();
    }, [user?.email]);

    const filedByMe = disputes.filter(d => d.filed_by_email === user?.email);
    const againstMe = disputes.filter(d => d.against_email === user?.email);
    const displayedDisputes = activeTab === 'filed' ? filedByMe : againstMe;

    return (
        <View style={styles.container}>
            <GlobalHeader />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <View style={styles.titleRow}>
                        <Text variant="displaySmall" style={styles.title}>Disputes</Text>
                        <TouchableOpacity
                            style={styles.fileBtn}
                            onPress={() => navigation.navigate('DisputeDetail', { disputeId: 'new' })}
                        >
                            <MaterialCommunityIcons name="plus" size={16} color="#FFFFFF" />
                            <Text style={styles.fileBtnText}>File Dispute</Text>
                        </TouchableOpacity>
                    </View>
                    <Text variant="bodyMedium" style={styles.subtitle}>
                        Manage rental disputes and resolutions
                    </Text>
                </View>

                <View style={styles.tabContainer}>
                    <View style={styles.tabs}>
                        <TouchableOpacity 
                            style={[styles.tab, activeTab === 'filed' && styles.activeTab]}
                            onPress={() => setActiveTab('filed')}
                        >
                            <MaterialCommunityIcons name="file-document-outline" size={18} color={activeTab === 'filed' ? "#1E293B" : "#64748B"} />
                            <Text style={activeTab === 'filed' ? styles.activeTabText : styles.tabText}>Filed by Me ({filedByMe.length})</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.tab, activeTab === 'against' && styles.activeTab]}
                            onPress={() => setActiveTab('against')}
                        >
                            <MaterialCommunityIcons name="comment-alert-outline" size={18} color={activeTab === 'against' ? "#1E293B" : "#64748B"} />
                            <Text style={activeTab === 'against' ? styles.activeTabText : styles.tabText}>Against Me ({againstMe.length})</Text>
                        </TouchableOpacity>
                    </View>

                    {isLoading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={colors.primary} />
                        </View>
                    ) : displayedDisputes.length === 0 ? (
                        <View style={styles.emptyCard}>
                            <MaterialCommunityIcons name="alert-circle-outline" size={72} color="#CBD5E1" style={styles.emptyIcon} />
                            <Text variant="headlineSmall" style={styles.emptyTitle}>No disputes found</Text>
                            <Text variant="bodyMedium" style={styles.emptySubtitle}>
                                {activeTab === 'filed' ? "You haven't filed any disputes" : "No disputes filed against you"}
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.listContainer}>
                            {displayedDisputes.map(dispute => (
                                <TouchableOpacity
                                    key={dispute.id}
                                    style={styles.disputeCard}
                                    onPress={() => navigation.navigate('DisputeDetail', { disputeId: dispute.id })}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.disputeHeader}>
                                        <Text style={styles.disputeStatus}>{dispute.status.toUpperCase()}</Text>
                                        <Text style={styles.disputeDate}>{new Date(dispute.created_date).toLocaleDateString()}</Text>
                                    </View>
                                    <Text style={styles.disputeReason}>{dispute.reason}</Text>
                                    <Text style={styles.disputeDescription} numberOfLines={2}>{dispute.description}</Text>
                                    <View style={styles.viewDetails}>
                                        <Text style={styles.viewDetailsText}>View Details</Text>
                                        <MaterialCommunityIcons name="chevron-right" size={14} color={colors.accentBlue} />
                                    </View>
                                </TouchableOpacity>
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
        alignItems: 'center',
        marginBottom: 8,
    },
    title: {
        fontWeight: '800',
        color: '#0F172A',
    },
    fileBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: colors.primary,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 8,
    },
    fileBtnText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: typography.small,
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
    loadingContainer: {
        marginTop: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    listContainer: {
        paddingTop: 8,
        gap: 12,
    },
    disputeCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    disputeHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    disputeStatus: {
        fontSize: typography.small,
        fontWeight: '700',
        color: colors.primary,
        backgroundColor: colors.primary + '15',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        overflow: 'hidden',
    },
    disputeDate: {
        fontSize: typography.small,
        color: '#64748B',
    },
    disputeReason: {
        fontSize: typography.tabLabel,
        fontWeight: '600',
        color: '#1E293B',
        marginBottom: 4,
    },
    disputeDescription: {
        fontSize: typography.body,
        color: '#64748B',
        lineHeight: 20,
        marginBottom: 8,
    },
    viewDetails: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    viewDetailsText: {
        fontSize: typography.small,
        color: colors.accentBlue,
        fontWeight: '600',
    },
});
