import { useUser } from '@clerk/expo';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, HelperText, Text, TextInput } from 'react-native-paper';
import { ScreenLayout } from '../../components/common/ScreenLayout';
import { useI18n } from '../../i18n';
import { api } from '../../services/api';
import { getRentalRequests } from '../../services/rentalService';
import { toast } from '../../store/toastStore';
import { colors, typography } from '../../theme';
import { Listing } from '../../types/listing';
import { RentalRequest } from '../../types/models';
import { RootStackParamList } from '../../types/navigation';

const getLocale = (language: string) =>
    language === 'fr' ? 'fr-FR' : language === 'es' ? 'es-ES' : language === 'de' ? 'de-DE' : 'en-US';

export const ConversationsScreen = () => {
    const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
    const { language, t } = useI18n();
    const { user } = useUser();
    const locale = getLocale(language);
    const userEmail = user?.emailAddresses?.[0]?.emailAddress;
    const [conversations, setConversations] = useState<RentalRequest[]>([]);
    const [itemsMap, setItemsMap] = useState<Record<string, Listing>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'sent' | 'inbox'>('sent');
    const [reportModalVisible, setReportModalVisible] = useState(false);
    const [reportUserEmail, setReportUserEmail] = useState('');
    const [reportComment, setReportComment] = useState('');
    const [isSubmittingReport, setIsSubmittingReport] = useState(false);

    const fetchConversations = useCallback(async () => {
        if (!userEmail) {
            setIsLoading(false);
            return;
        }
        try {
            setIsLoading(true);
            const [asRenter, asOwner] = await Promise.all([
                getRentalRequests({ renter_email: userEmail }),
                getRentalRequests({ owner_email: userEmail })
            ]);

            const allRentals = [...asRenter, ...asOwner];
            const uniqueRentals = Array.from(new Map(allRentals.map(r => [r.id, r])).values());
            const activeRentals = uniqueRentals.filter(r => ['pending', 'approved', 'paid', 'inquiry', 'pending_verification'].includes(r.status));
            activeRentals.sort((a, b) => new Date(b.updated_date).getTime() - new Date(a.updated_date).getTime());
            setConversations(activeRentals);

            const uniqueItemIds = [...new Set(activeRentals.map(r => r.item_id))];
            const itemEntries = await Promise.all(
                uniqueItemIds.map(async id => {
                    try {
                        const res = await api.get(`/items/${id}`);
                        const data = res.data.data || res.data;
                        const item = data.item || data;
                        return [id, item] as [string, Listing];
                    } catch {
                        return null;
                    }
                })
            );
            const map: Record<string, Listing> = {};
            itemEntries.forEach(entry => { if (entry) map[entry[0]] = entry[1]; });
            setItemsMap(map);
        } catch (error) {
            console.error('Error fetching conversations:', error);
        } finally {
            setIsLoading(false);
        }
    }, [userEmail]);

    useFocusEffect(
        useCallback(() => {
            fetchConversations();
        }, [fetchConversations])
    );

    const sentByMe = conversations.filter(c => c.renter_email?.toLowerCase() === userEmail?.toLowerCase());
    const inInbox = conversations.filter(c => c.owner_email?.toLowerCase() === userEmail?.toLowerCase());
    const displayedConversations = activeTab === 'sent' ? sentByMe : inInbox;
    const totalActive = conversations.length;

    const openReportUserModal = (email: string) => {
        if (!email || email === userEmail) return;
        setReportUserEmail(email);
        setReportComment('');
        setReportModalVisible(true);
    };

    const closeReportUserModal = (force = false) => {
        if (isSubmittingReport && !force) return;
        setReportModalVisible(false);
        setReportUserEmail('');
        setReportComment('');
    };

    const handleSubmitUserReport = async () => {
        if (!userEmail || !reportUserEmail || !reportComment.trim()) return;

        try {
            setIsSubmittingReport(true);
            await api.post('/reports/user', {
                reporter_email: userEmail,
                reported_email: reportUserEmail,
                reason: 'other',
                description: reportComment.trim(),
            });
            closeReportUserModal(true);
            toast.success(t('conversations.reportSubmitted'));
        } catch (error: any) {
            const message = error?.response?.data?.error || error?.message || t('conversations.reportFailed');
            toast.error(message);
        } finally {
            setIsSubmittingReport(false);
        }
    };

    const renderCard = (conv: RentalRequest) => {
        const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
            pending:   { label: t('conversations.status.pending'),   bg: '#FEF9C3', text: '#854D0E' },
            approved:  { label: t('conversations.status.approved'),  bg: '#DCFCE7', text: '#166534' },
            paid:      { label: t('conversations.status.paid'),      bg: '#F3E8FF', text: '#6B21A8' },
            inquiry:   { label: t('conversations.status.inquiry'),   bg: '#E0F2FE', text: '#075985' },
            completed: { label: t('conversations.status.completed'), bg: '#F1F5F9', text: '#334155' },
            declined:  { label: t('conversations.status.declined'),  bg: '#FEE2E2', text: '#991B1B' },
            cancelled: { label: t('conversations.status.cancelled'), bg: '#F1F5F9', text: '#64748B' },
        };
        const item = itemsMap[conv.item_id];
        const status = STATUS_CONFIG[conv.status] ?? { label: conv.status.toUpperCase(), bg: '#F1F5F9', text: '#334155' };
        const otherEmail = activeTab === 'sent' ? conv.owner_email : conv.renter_email;
        const isInquiry = conv.status === 'inquiry';

        const rentalCost = conv.total_amount || 0;
        const platformFee = typeof conv.platform_fee === 'number' ? conv.platform_fee : rentalCost * 0.15;
        const securityDeposit = typeof conv.security_deposit === 'number' ? conv.security_deposit : 0;
        const totalPaid = typeof conv.total_paid === 'number' ? conv.total_paid : rentalCost + platformFee + securityDeposit;

        const itemImage = item?.images?.[0] || item?.videos?.[0];

        return (
            <View key={conv.id} style={styles.convCard}>
                {/* Card header: image + title/meta */}
                <View style={styles.cardTop}>
                    <View style={styles.thumbContainer}>
                        {itemImage ? (
                            <Image source={{ uri: itemImage }} style={styles.thumb} resizeMode="cover" />
                        ) : (
                            <View style={[styles.thumb, styles.thumbPlaceholder]}>
                                <MaterialCommunityIcons name="image-outline" size={24} color="#CBD5E1" />
                            </View>
                        )}
                    </View>

                    <View style={styles.cardMeta}>
                        <View style={styles.cardTitleRow}>
                            <Text style={styles.cardTitle} numberOfLines={2}>
                                {item ? (item.title || t('conversations.untitledItem')) : t('common.loading')}
                            </Text>
                            <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                                <Text style={[styles.statusText, { color: status.text }]}>{status.label}</Text>
                            </View>
                        </View>

                        <View style={styles.cardInfoRow}>
                            <MaterialCommunityIcons name="account-outline" size={13} color="#64748B" />
                            <Text style={styles.cardInfoText} numberOfLines={1}>
                                {activeTab === 'sent' ? t('conversations.to') : t('conversations.from')}
                                <Text style={styles.cardInfoBold}>{otherEmail}</Text>
                            </Text>
                        </View>

                        {!isInquiry && (
                            <>
                                <View style={styles.cardInfoRow}>
                                    <MaterialCommunityIcons name="calendar-outline" size={13} color="#64748B" />
                                    <Text style={styles.cardInfoText}>
                                        {new Date(conv.start_date).toLocaleDateString(locale, { month: 'short', day: 'numeric' })} – {new Date(conv.end_date).toLocaleDateString(locale, { month: 'short', day: 'numeric' })}
                                    </Text>
                                </View>
                                <View style={styles.cardInfoRow}>
                                    <MaterialCommunityIcons name="currency-usd" size={13} color="#64748B" />
                                    <View>
                                        <Text style={[styles.cardInfoText, styles.cardInfoBold]}>
                                            ${totalPaid.toFixed(2)}
                                        </Text>
                                        <Text style={styles.cardAmountBreakdown}>
                                            {t('conversations.rental')} ${rentalCost.toFixed(2)} · {t('conversations.fee')} ${platformFee.toFixed(2)} · {t('conversations.deposit')} ${securityDeposit.toFixed(2)}
                                        </Text>
                                    </View>
                                </View>
                            </>
                        )}
                    </View>
                </View>

                {/* Message preview */}
                {conv.message ? (
                    <View style={styles.messageBox}>
                        <Text style={styles.messageText} numberOfLines={3}>"{conv.message}"</Text>
                    </View>
                ) : null}

                {/* Actions */}
                <View style={styles.actions}>
                    <TouchableOpacity
                        style={styles.btnOutline}
                        onPress={() => navigation.navigate('Chat', {
                            rentalRequestId: conv.id,
                            otherUserEmail: otherEmail,
                            itemId: conv.item_id,
                        })}
                        activeOpacity={0.7}
                    >
                        <MaterialCommunityIcons name="message-outline" size={15} color="#475569" />
                        <Text style={styles.btnOutlineText}>{t('conversations.openChat')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.btnOutline, styles.btnAgreement]}
                        onPress={() => navigation.navigate('RentalDetail', { rentalId: conv.id })}
                        activeOpacity={0.7}
                    >
                        <MaterialCommunityIcons name="file-document-outline" size={15} color="#1D4ED8" />
                        <Text style={[styles.btnOutlineText, styles.btnAgreementText]}>{t('conversations.viewAgreement')}</Text>
                    </TouchableOpacity>

                    {otherEmail !== userEmail ? (
                        <TouchableOpacity
                            style={[styles.btnOutline, styles.btnReport]}
                            onPress={() => openReportUserModal(otherEmail)}
                            activeOpacity={0.7}
                        >
                            <MaterialCommunityIcons name="flag-outline" size={15} color="#B91C1C" />
                            <Text style={[styles.btnOutlineText, styles.btnReportText]}>{t('conversations.reportUser')}</Text>
                        </TouchableOpacity>
                    ) : null}
                </View>

                {/* Submitted date */}
                <Text style={styles.submittedDate}>
                    {t('conversations.submitted', { date: new Date(conv.created_date).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' }) })}
                </Text>
            </View>
        );
    };

    return (
        <ScreenLayout showBottomNav bottomNavActiveKey="none">
                <View style={styles.contentWrapper}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                        <MaterialCommunityIcons name="arrow-left" size={20} color="#475569" />
                        <Text style={styles.backBtnText}>{t('common.back')}</Text>
                    </TouchableOpacity>

                    <View style={styles.titleRow}>
                        <MaterialCommunityIcons name="message-text-outline" size={32} color="#2563EB" />
                        <Text style={styles.title}>{t('conversations.title')}</Text>
                    </View>
                    <View style={styles.subtitleRow}>
                        <Text style={styles.subtitle}>{t('conversations.subtitle')}</Text>
                        {totalActive > 0 && (
                            <View style={styles.activeBadge}>
                                <MaterialCommunityIcons name="clock-outline" size={12} color="#475569" />
                                <Text style={styles.activeBadgeText}>{t('conversations.activeCount', { count: totalActive })}</Text>
                            </View>
                        )}
                    </View>

                <View style={styles.mainCard}>
                    <View style={styles.tabs}>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'sent' && styles.activeTab]}
                            onPress={() => setActiveTab('sent')}
                        >
                            <MaterialCommunityIcons name="message-outline" size={16} color={activeTab === 'sent' ? '#1E293B' : '#64748B'} />
                            <Text style={activeTab === 'sent' ? styles.activeTabText : styles.tabText}>
                                {t('conversations.myRequests', { count: sentByMe.length })}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'inbox' && styles.activeTab]}
                            onPress={() => setActiveTab('inbox')}
                        >
                            <MaterialCommunityIcons name="package-variant" size={16} color={activeTab === 'inbox' ? '#1E293B' : '#64748B'} />
                            <Text style={activeTab === 'inbox' ? styles.activeTabText : styles.tabText}>
                                {t('conversations.received', { count: inInbox.length })}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {isLoading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={colors.primary} />
                        </View>
                    ) : displayedConversations.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <MaterialCommunityIcons
                                name={activeTab === 'sent' ? 'chat-outline' : 'package-variant'}
                                size={64}
                                color="#94A3B8"
                                style={styles.emptyIcon}
                            />
                            <Text variant="titleLarge" style={styles.emptyTitle}>{t('conversations.noActiveRequests')}</Text>
                            <Text variant="bodyMedium" style={styles.emptySubtitle}>
                                {activeTab === 'sent'
                                    ? t('conversations.noSentRequests')
                                    : t('conversations.noReceivedRequests')}
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.listContainer}>
                            {displayedConversations.map(renderCard)}
                        </View>
                    )}
                </View>
                </View>

                <Modal
                    visible={reportModalVisible}
                    transparent
                    animationType="fade"
                    onRequestClose={() => closeReportUserModal()}
                >
                    <View style={styles.modalOverlay}>
                        <Pressable style={styles.modalBackdrop} onPress={() => closeReportUserModal()} />
                        <View style={styles.modalCard}>
                            <Text style={styles.modalTitle}>{t('conversations.reportUser')}</Text>
                            <Text style={styles.modalSubtitle}>
                                {t('conversations.reportingUser', { email: reportUserEmail })}
                            </Text>

                            <Text style={styles.modalLabel}>{t('conversations.reportReason')}</Text>
                            <TextInput
                                mode="outlined"
                                multiline
                                value={reportComment}
                                onChangeText={setReportComment}
                                placeholder={t('conversations.reportPlaceholder')}
                                outlineStyle={styles.modalInputOutline}
                                style={styles.modalInput}
                                contentStyle={styles.modalInputContent}
                                numberOfLines={5}
                                disabled={isSubmittingReport}
                            />
                            <HelperText type="error" visible={!reportComment.trim() && reportComment.length > 0}>
                                {t('conversations.reportReasonRequired')}
                            </HelperText>

                            <View style={styles.modalActions}>
                                <Button
                                    mode="text"
                                    onPress={() => closeReportUserModal()}
                                    disabled={isSubmittingReport}
                                    textColor="#64748B"
                                >
                                    {t('common.cancel')}
                                </Button>
                                <Button
                                    mode="contained"
                                    onPress={handleSubmitUserReport}
                                    loading={isSubmittingReport}
                                    disabled={isSubmittingReport || !reportComment.trim()}
                                    buttonColor="#B91C1C"
                                >
                                    {t('conversations.submitReport')}
                                </Button>
                            </View>
                        </View>
                    </View>
                </Modal>
        </ScreenLayout>
    );
};

const styles = StyleSheet.create({
    contentWrapper: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 32,
        paddingBottom: 48,
        maxWidth: 768,
        width: '100%',
        alignSelf: 'center',
    },
    backBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 28,
    },
    backBtnText: {
        color: '#475569',
        fontSize: 15,
        fontWeight: '500',
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 8,
    },
    title: {
        fontSize: 30,
        fontWeight: 'bold',
        color: '#0F172A',
        letterSpacing: -0.5,
    },
    subtitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 24,
    },
    subtitle: {
        color: '#64748B',
        fontSize: 16,
    },
    activeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    activeBadgeText: {
        fontSize: 11,
        color: '#475569',
        fontWeight: '500',
    },
    mainCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        paddingBottom: 24,
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
        gap: 6,
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
        fontSize: typography.small,
    },
    activeTabText: {
        color: '#1E293B',
        fontWeight: '600',
        fontSize: typography.small,
    },
    loadingContainer: {
        marginTop: 64,
        marginBottom: 64,
        alignItems: 'center',
    },
    emptyContainer: {
        alignItems: 'center',
        paddingTop: 48,
        paddingBottom: 48,
        paddingHorizontal: 24,
    },
    emptyIcon: {
        marginBottom: 16,
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
    listContainer: {
        padding: 16,
        gap: 12,
    },
    // Card
    convCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 1,
        marginBottom: 4,
    },
    cardTop: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 10,
    },
    thumbContainer: {
        flexShrink: 0,
    },
    thumb: {
        width: 72,
        height: 72,
        borderRadius: 8,
    },
    thumbPlaceholder: {
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardMeta: {
        flex: 1,
        gap: 4,
    },
    cardTitleRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 8,
        marginBottom: 4,
    },
    cardTitle: {
        flex: 1,
        fontSize: typography.tabLabel,
        fontWeight: '600',
        color: '#1E293B',
        lineHeight: 20,
    },
    statusBadge: {
        borderRadius: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
        flexShrink: 0,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '700',
    },
    cardInfoRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 4,
    },
    cardInfoText: {
        fontSize: 12,
        color: '#64748B',
        flex: 1,
    },
    cardInfoBold: {
        fontWeight: '600',
        color: '#334155',
    },
    cardAmountBreakdown: {
        fontSize: 10,
        color: '#94A3B8',
        marginTop: 1,
    },
    messageBox: {
        backgroundColor: '#F8FAFC',
        borderRadius: 8,
        padding: 10,
        marginBottom: 10,
    },
    messageText: {
        fontSize: typography.body,
        fontStyle: 'italic',
        color: '#475569',
        lineHeight: 18,
    },
    actions: {
        gap: 8,
        marginBottom: 8,
    },
    btnOutline: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        borderWidth: 1,
        borderColor: '#CBD5E1',
        borderRadius: 8,
        paddingVertical: 10,
    },
    btnOutlineText: {
        fontSize: typography.body,
        fontWeight: '500',
        color: '#475569',
    },
    btnAgreement: {
        borderColor: '#93C5FD',
        backgroundColor: '#EFF6FF',
    },
    btnAgreementText: {
        color: '#1D4ED8',
    },
    btnReport: {
        borderColor: '#FECACA',
        backgroundColor: '#FEF2F2',
    },
    btnReportText: {
        color: '#B91C1C',
    },
    submittedDate: {
        fontSize: 10,
        color: '#94A3B8',
        marginTop: 4,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.4)',
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    modalCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 18,
        elevation: 8,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 4,
    },
    modalSubtitle: {
        fontSize: 13,
        color: '#64748B',
        marginBottom: 16,
    },
    modalLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#334155',
        marginBottom: 8,
    },
    modalInput: {
        backgroundColor: '#FFFFFF',
    },
    modalInputOutline: {
        borderRadius: 12,
        borderColor: '#CBD5E1',
    },
    modalInputContent: {
        minHeight: 96,
        textAlignVertical: 'top',
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: 8,
        marginTop: 8,
    },
});
