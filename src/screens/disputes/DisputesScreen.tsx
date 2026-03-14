import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import { ActivityIndicator, Button, Text } from 'react-native-paper';
import { useUser } from '@clerk/expo';
import * as ImagePicker from 'expo-image-picker';
import { ScreenLayout } from '../../components/common/ScreenLayout';
import { getDisputes } from '../../services/disputeService';
import { api } from '../../services/api';
import { colors, typography } from '../../theme';
import { Dispute } from '../../types/models';
import { RootStackParamList } from '../../types/navigation';

type Nav = StackNavigationProp<RootStackParamList>;

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    open: { bg: '#FEE2E2', text: '#991B1B', border: '#FECACA' },
    under_review: { bg: '#FEF9C3', text: '#854D0E', border: '#FDE68A' },
    resolved: { bg: '#DCFCE7', text: '#166534', border: '#BBF7D0' },
    closed: { bg: '#F3F4F6', text: '#374151', border: '#E5E7EB' },
};

interface ItemInfo {
    id: string;
    title: string;
    images?: string[];
}

interface RentalRequestInfo {
    id: string;
    item_id: string;
    renter_email: string;
    owner_email: string;
}

interface UserInfo {
    email: string;
    full_name?: string;
    username?: string;
}

export const DisputesScreen = () => {
    const navigation = useNavigation<Nav>();
    const { user: clerkUser } = useUser();
    const userEmail = clerkUser?.emailAddresses?.[0]?.emailAddress;

    const [disputes, setDisputes] = useState<Dispute[]>([]);
    const [items, setItems] = useState<Record<string, ItemInfo>>({});
    const [requests, setRequests] = useState<Record<string, RentalRequestInfo>>({});
    const [usersMap, setUsersMap] = useState<Record<string, UserInfo>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<'filed' | 'against'>('filed');

    // Evidence upload state
    const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
    const [showEvidenceModal, setShowEvidenceModal] = useState(false);
    const [newEvidenceUrls, setNewEvidenceUrls] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);

    // Zoom image
    const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        if (!userEmail) return;
        try {
            // Fetch disputes
            const allDisputes = await getDisputes();
            const userDisputes = allDisputes.filter(
                (d: Dispute) => d.filed_by_email === userEmail || d.against_email === userEmail
            );
            setDisputes(userDisputes);

            // Fetch rental requests for context
            const [renterRes, ownerRes] = await Promise.all([
                api.get('/rental-requests', { params: { renter_email: userEmail } }).catch(() => ({ data: { data: [] } })),
                api.get('/rental-requests', { params: { owner_email: userEmail } }).catch(() => ({ data: { data: [] } })),
            ]);
            const renterReqs = renterRes.data?.data || [];
            const ownerReqs = ownerRes.data?.data || [];
            const allReqs = [...renterReqs, ...ownerReqs];
            const uniqueReqs = Array.from(new Map(allReqs.map((r: any) => [r.id, r])).values()) as RentalRequestInfo[];
            const reqMap: Record<string, RentalRequestInfo> = {};
            uniqueReqs.forEach((r) => { reqMap[r.id] = r; });
            setRequests(reqMap);

            // Fetch items referenced in requests
            const itemIds = [...new Set(uniqueReqs.map((r) => r.item_id).filter(Boolean))];
            if (itemIds.length > 0) {
                const itemsRes = await api.get('/items', { params: { ids: itemIds.join(',') } }).catch(() => ({ data: { data: [] } }));
                const fetchedItems = itemsRes.data?.data || [];
                const itemMap: Record<string, ItemInfo> = {};
                fetchedItems.forEach((item: any) => { itemMap[item.id] = item; });
                setItems(itemMap);
            }

            // Fetch user info for involved parties
            const emails = new Set<string>();
            userDisputes.forEach((d: Dispute) => {
                emails.add(d.filed_by_email);
                emails.add(d.against_email);
            });
            const usersData: Record<string, UserInfo> = {};
            for (const email of Array.from(emails)) {
                try {
                    const res = await api.get(`/users/chat?email=${encodeURIComponent(email)}`);
                    if (res.data?.data?.user) {
                        usersData[email] = res.data.data.user;
                    } else {
                        usersData[email] = { email };
                    }
                } catch {
                    usersData[email] = { email };
                }
            }
            setUsersMap(usersData);
        } catch (error) {
            console.error('Error loading disputes:', error);
        }
    }, [userEmail]);

    useEffect(() => {
        setIsLoading(true);
        loadData().finally(() => setIsLoading(false));
    }, [loadData]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    }, [loadData]);

    const filedByMe = disputes.filter((d) => d.filed_by_email === userEmail);
    const againstMe = disputes.filter((d) => d.against_email === userEmail);
    const displayedDisputes = activeTab === 'filed' ? filedByMe : againstMe;

    // Evidence upload
    const handlePickEvidence = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            quality: 0.8,
        });
        if (result.canceled || !result.assets?.length) return;

        setIsUploading(true);
        try {
            const uploadedUrls: string[] = [];
            for (const asset of result.assets) {
                const formData = new FormData();
                formData.append('file', {
                    uri: asset.uri,
                    name: asset.fileName || 'evidence.jpg',
                    type: asset.mimeType || 'image/jpeg',
                } as any);
                const res = await api.post('/file/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                const url = res.data?.file_url || res.data?.data?.file_url;
                if (url) uploadedUrls.push(url);
            }
            setNewEvidenceUrls((prev) => [...prev, ...uploadedUrls]);
        } catch {
            Alert.alert('Error', 'Failed to upload images.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleSubmitEvidence = async () => {
        if (!selectedDispute || newEvidenceUrls.length === 0) return;
        setIsUploading(true);
        try {
            const updatedUrls = [...(selectedDispute.evidence_urls || []), ...newEvidenceUrls];
            await api.put(`/disputes/${selectedDispute.id}`, { evidence_urls: updatedUrls });
            setShowEvidenceModal(false);
            setNewEvidenceUrls([]);
            setSelectedDispute(null);
            Alert.alert('Success', 'Evidence added successfully!');
            await loadData();
        } catch {
            Alert.alert('Error', 'Failed to add evidence.');
        } finally {
            setIsUploading(false);
        }
    };

    const getItemTitle = (dispute: Dispute) => {
        const req = requests[dispute.rental_request_id];
        if (req) {
            const item = items[req.item_id];
            if (item) return item.title;
        }
        return 'Item not found';
    };

    const getOtherUser = (dispute: Dispute, type: 'filed' | 'against') => {
        const email = type === 'filed' ? dispute.against_email : dispute.filed_by_email;
        return usersMap[email];
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const renderDisputeCard = (dispute: Dispute, type: 'filed' | 'against') => {
        const statusStyle = STATUS_COLORS[dispute.status] || STATUS_COLORS.open;
        const otherUser = getOtherUser(dispute, type);
        const itemTitle = getItemTitle(dispute);

        return (
            <View key={dispute.id} style={styles.disputeCard}>
                {/* Header: title + status */}
                <View style={styles.disputeHeader}>
                    <View style={styles.disputeTitleRow}>
                        <MaterialCommunityIcons name="alert-circle" size={18} color="#EF4444" />
                        <Text style={styles.disputeItemTitle} numberOfLines={1}>{itemTitle}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg, borderColor: statusStyle.border }]}>
                        <Text style={[styles.statusText, { color: statusStyle.text }]}>
                            {dispute.status.replace('_', ' ')}
                        </Text>
                    </View>
                </View>

                {/* Reason + Description */}
                <View style={styles.reasonBox}>
                    <Text style={styles.reasonLabel}>Reason: {dispute.reason.replace(/_/g, ' ')}</Text>
                    <Text style={styles.reasonDesc} numberOfLines={3}>{dispute.description}</Text>
                </View>

                {/* View Details button */}
                <TouchableOpacity
                    style={styles.viewDetailsBtn}
                    onPress={() => navigation.navigate('DisputeDetail', { disputeId: dispute.id })}
                >
                    <MaterialCommunityIcons name="file-document-outline" size={16} color="#1D4ED8" />
                    <Text style={styles.viewDetailsBtnText}>View Details</Text>
                </TouchableOpacity>

                {/* Evidence images */}
                {dispute.evidence_urls && dispute.evidence_urls.length > 0 && (
                    <View style={styles.evidenceSection}>
                        <View style={styles.evidenceHeader}>
                            <Text style={styles.evidenceLabel}>Evidence ({dispute.evidence_urls.length}):</Text>
                            {type === 'filed' && dispute.status === 'open' && (
                                <TouchableOpacity
                                    style={styles.addMoreBtn}
                                    onPress={() => {
                                        setSelectedDispute(dispute);
                                        setNewEvidenceUrls([]);
                                        setShowEvidenceModal(true);
                                    }}
                                >
                                    <MaterialCommunityIcons name="plus" size={14} color="#6366F1" />
                                    <Text style={styles.addMoreText}>Add More</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.evidenceScroll}>
                            {dispute.evidence_urls.map((url, idx) => (
                                <TouchableOpacity key={idx} onPress={() => setZoomImageUrl(url)}>
                                    <Image source={{ uri: url }} style={styles.evidenceImage} />
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* No evidence yet — allow adding for filed+open */}
                {(!dispute.evidence_urls || dispute.evidence_urls.length === 0) && type === 'filed' && dispute.status === 'open' && (
                    <TouchableOpacity
                        style={styles.addEvidenceBtn}
                        onPress={() => {
                            setSelectedDispute(dispute);
                            setNewEvidenceUrls([]);
                            setShowEvidenceModal(true);
                        }}
                    >
                        <MaterialCommunityIcons name="camera-plus-outline" size={16} color="#6366F1" />
                        <Text style={styles.addMoreText}>Add Evidence</Text>
                    </TouchableOpacity>
                )}

                {/* Resolution */}
                {dispute.resolution && (
                    <View style={styles.resolutionBox}>
                        <Text style={styles.resolutionLabel}>Resolution:</Text>
                        <Text style={styles.resolutionText}>{dispute.resolution}</Text>
                    </View>
                )}

                {/* Footer: date + other user */}
                <View style={styles.disputeFooter}>
                    <Text style={styles.disputeDate}>Filed {formatDate(dispute.created_date)}</Text>
                    {otherUser && (
                        <View style={styles.otherUserRow}>
                            <Text style={styles.otherUserLabel}>{type === 'filed' ? 'Against:' : 'From:'}</Text>
                            <MaterialCommunityIcons name="account" size={14} color="#0F172A" />
                            <Text style={styles.otherUserName}>
                                {otherUser.username ? `@${otherUser.username}` : otherUser.full_name || otherUser.email}
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        );
    };

    return (
        <View style={{ flex: 1 }}>
            <ScreenLayout onRefresh={onRefresh} refreshing={refreshing} showBottomNav bottomNavActiveKey="none">
                <View style={styles.contentWrapper}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                        <MaterialCommunityIcons name="arrow-left" size={20} color="#475569" />
                        <Text style={styles.backBtnText}>Back</Text>
                    </TouchableOpacity>

                    <View style={styles.titleRow}>
                        <MaterialCommunityIcons name="alert-decagram-outline" size={32} color="#EF4444" />
                        <Text style={styles.title}>Disputes</Text>
                    </View>
                    <Text style={styles.subtitle}>Manage rental disputes and resolutions</Text>

                    <TouchableOpacity
                        style={styles.fileBtn}
                        onPress={() => navigation.navigate('DisputeDetail', { disputeId: 'new' })}
                    >
                        <MaterialCommunityIcons name="plus" size={16} color="#FFFFFF" />
                        <Text style={styles.fileBtnText}>File Dispute</Text>
                    </TouchableOpacity>

                    <View>
                    <View style={styles.tabs}>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'filed' && styles.activeTab]}
                            onPress={() => setActiveTab('filed')}
                        >
                            <MaterialCommunityIcons name="file-document-outline" size={18} color={activeTab === 'filed' ? '#1E293B' : '#64748B'} />
                            <Text style={activeTab === 'filed' ? styles.activeTabText : styles.tabText}>Filed by Me ({filedByMe.length})</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'against' && styles.activeTab]}
                            onPress={() => setActiveTab('against')}
                        >
                            <MaterialCommunityIcons name="comment-alert-outline" size={18} color={activeTab === 'against' ? '#1E293B' : '#64748B'} />
                            <Text style={activeTab === 'against' ? styles.activeTabText : styles.tabText}>Against Me ({againstMe.length})</Text>
                        </TouchableOpacity>
                    </View>

                    {isLoading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={colors.primary} />
                        </View>
                    ) : displayedDisputes.length === 0 ? (
                        <View style={styles.emptyCard}>
                            <MaterialCommunityIcons name="alert-circle-outline" size={56} color="#CBD5E1" />
                            <Text style={styles.emptyTitle}>
                                {activeTab === 'filed' ? 'No disputes filed' : 'No disputes received'}
                            </Text>
                            <Text style={styles.emptySubtitle}>
                                {activeTab === 'filed' ? "You haven't filed any disputes" : 'No one has filed a dispute against you'}
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.listContainer}>
                            {displayedDisputes.map((dispute) => renderDisputeCard(dispute, activeTab === 'filed' ? 'filed' : 'against'))}
                        </View>
                    )}
                    </View>
                </View>
            </ScreenLayout>

            {/* Add Evidence Modal */}
            <Modal visible={showEvidenceModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Add More Evidence</Text>
                            <TouchableOpacity onPress={() => { setShowEvidenceModal(false); setNewEvidenceUrls([]); setSelectedDispute(null); }}>
                                <MaterialCommunityIcons name="close" size={24} color="#64748B" />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.modalDesc}>
                            Upload additional evidence to support your dispute. This will be reviewed by the admin team.
                        </Text>

                        <TouchableOpacity style={styles.pickBtn} onPress={handlePickEvidence} disabled={isUploading}>
                            <MaterialCommunityIcons name="upload" size={18} color="#475569" />
                            <Text style={styles.pickBtnText}>{isUploading ? 'Uploading...' : 'Select Images'}</Text>
                        </TouchableOpacity>

                        {newEvidenceUrls.length > 0 && (
                            <View>
                                <Text style={styles.evidenceCountText}>{newEvidenceUrls.length} file(s) ready:</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                                    {newEvidenceUrls.map((url, idx) => (
                                        <Image key={idx} source={{ uri: url }} style={styles.evidencePreview} />
                                    ))}
                                </ScrollView>
                            </View>
                        )}

                        <View style={styles.modalFooter}>
                            <Button
                                mode="outlined"
                                onPress={() => { setShowEvidenceModal(false); setNewEvidenceUrls([]); setSelectedDispute(null); }}
                                disabled={isUploading}
                                style={styles.modalCancelBtn}
                            >
                                Cancel
                            </Button>
                            <Button
                                mode="contained"
                                onPress={handleSubmitEvidence}
                                disabled={isUploading || newEvidenceUrls.length === 0}
                                loading={isUploading}
                                style={styles.modalSubmitBtn}
                            >
                                Add Evidence
                            </Button>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Image Zoom Modal */}
            <Modal visible={!!zoomImageUrl} transparent animationType="fade">
                <TouchableOpacity style={styles.zoomOverlay} activeOpacity={1} onPress={() => setZoomImageUrl(null)}>
                    {zoomImageUrl && (
                        <Image source={{ uri: zoomImageUrl }} style={styles.zoomImage} resizeMode="contain" />
                    )}
                    <TouchableOpacity style={styles.zoomCloseBtn} onPress={() => setZoomImageUrl(null)}>
                        <MaterialCommunityIcons name="close" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    contentWrapper: {
        flex: 1, paddingHorizontal: 20, paddingTop: 32, paddingBottom: 48,
        maxWidth: 768, width: '100%', alignSelf: 'center',
    },
    backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 28 },
    backBtnText: { color: '#475569', fontSize: 15, fontWeight: '500' },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
    title: { fontSize: 30, fontWeight: 'bold', color: '#0F172A', letterSpacing: -0.5 },
    subtitle: { color: '#64748B', fontSize: 16, marginBottom: 20 },
    fileBtn: {
        flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6,
        backgroundColor: '#111827', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 8, marginBottom: 24,
    },
    fileBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
    tabs: {
        flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 12, padding: 4, marginBottom: 16, gap: 4,
    },
    tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 40, borderRadius: 8 },
    activeTab: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
    tabText: { color: '#64748B', fontWeight: '500', fontSize: 13 },
    activeTabText: { color: '#1E293B', fontWeight: '600', fontSize: 13 },
    loadingContainer: { marginTop: 40, alignItems: 'center', justifyContent: 'center' },
    emptyCard: {
        backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0',
        paddingVertical: 56, paddingHorizontal: 24, alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
    },
    emptyTitle: { fontSize: 20, fontWeight: '500', color: '#64748B', marginTop: 24, marginBottom: 12, textAlign: 'center' },
    emptySubtitle: { textAlign: 'center', color: '#94A3B8', fontSize: 15, lineHeight: 24 },
    listContainer: { gap: 12 },

    // Dispute Card
    disputeCard: {
        backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#E2E8F0',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
    },
    disputeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    disputeTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, marginRight: 8 },
    disputeItemTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A', flex: 1 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
    statusText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },

    reasonBox: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: 10, padding: 12, marginBottom: 12 },
    reasonLabel: { fontSize: 13, fontWeight: '600', color: '#7F1D1D', marginBottom: 4 },
    reasonDesc: { fontSize: 13, color: '#991B1B', lineHeight: 18 },

    viewDetailsBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        borderWidth: 1, borderColor: '#BFDBFE', borderRadius: 8, paddingVertical: 8, marginBottom: 12,
        backgroundColor: '#EFF6FF',
    },
    viewDetailsBtnText: { fontSize: 13, fontWeight: '600', color: '#1D4ED8' },

    evidenceSection: { marginBottom: 12 },
    evidenceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    evidenceLabel: { fontSize: 13, fontWeight: '600', color: '#475569' },
    addMoreBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 6 },
    addMoreText: { fontSize: 12, fontWeight: '600', color: '#6366F1' },
    evidenceScroll: { flexDirection: 'row' },
    evidenceImage: { width: 80, height: 80, borderRadius: 8, marginRight: 8 },

    addEvidenceBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, paddingVertical: 8, marginBottom: 12,
    },

    resolutionBox: { backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0', borderRadius: 10, padding: 12, marginBottom: 12 },
    resolutionLabel: { fontSize: 13, fontWeight: '600', color: '#166534', marginBottom: 4 },
    resolutionText: { fontSize: 13, color: '#15803D', lineHeight: 18 },

    disputeFooter: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9',
    },
    disputeDate: { fontSize: 12, color: '#94A3B8' },
    otherUserRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    otherUserLabel: { fontSize: 12, color: '#64748B' },
    otherUserName: { fontSize: 12, fontWeight: '600', color: '#0F172A' },

    // Evidence Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '70%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    modalTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
    modalDesc: { fontSize: 13, color: '#64748B', lineHeight: 18, marginBottom: 16 },
    pickBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10,
        borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, alignSelf: 'flex-start', marginBottom: 16,
    },
    pickBtnText: { fontSize: 14, color: '#475569', fontWeight: '500' },
    evidenceCountText: { fontSize: 13, fontWeight: '600', color: '#0F172A' },
    evidencePreview: { width: 72, height: 72, borderRadius: 8, marginRight: 8 },
    modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 20 },
    modalCancelBtn: { borderColor: '#E2E8F0', borderRadius: 10 },
    modalSubmitBtn: { backgroundColor: colors.primary, borderRadius: 10 },

    // Zoom
    zoomOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
    zoomImage: { width: '90%', height: '80%' },
    zoomCloseBtn: { position: 'absolute', top: 50, right: 20, padding: 8 },
});
