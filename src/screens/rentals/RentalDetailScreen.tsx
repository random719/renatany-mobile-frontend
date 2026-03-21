import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { useUser } from '@clerk/expo';
import { getConditionReports } from '../../services/conditionReportService';
import { getListingById } from '../../services/listingService';
import { api } from '../../services/api';
import { getRentalRequestById } from '../../services/rentalService';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../../store/toastStore';
import { colors, typography } from '../../theme';
import { ConditionReport, PublicUserProfile, RentalRequest } from '../../types/models';
import { RootStackParamList } from '../../types/navigation';
import { parseRentalBoundaryDate } from '../../utils/rentalDates';
import { useI18n } from '../../i18n';

type Nav = StackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'RentalDetail'>;

interface ItemInfo {
  title: string;
  description?: string;
  images?: string[];
  category?: string;
  condition?: string;
  daily_rate?: number;
  deposit?: number;
  location?: { address?: string; city?: string } | string;
}

const STATUS_META: Record<string, { bg: string; text: string }> = {
  pending: { bg: '#FEF3C7', text: '#92400E' },
  approved: { bg: '#DBEAFE', text: '#1D4ED8' },
  paid: { bg: '#F3E8FF', text: '#7C3AED' },
  completed: { bg: '#DCFCE7', text: '#166534' },
  cancelled: { bg: '#E2E8F0', text: '#475569' },
  rejected: { bg: '#FEE2E2', text: '#B91C1C' },
  declined: { bg: '#FEE2E2', text: '#B91C1C' },
  inquiry: { bg: '#E0F2FE', text: '#075985' },
};

const AGREEMENT_TERMS = [
  'The renter agrees to return the item in the same condition as received, accounting for normal wear and tear.',
  'Any damages beyond normal wear will be the responsibility of the renter and may result in charges.',
  'The security deposit will be refunded within 7 days after successful return of the item.',
  "Late returns may incur additional fees as per the platform's late return policy.",
  "Both parties agree to resolve any disputes through Rentany's mediation process.",
  'Payment is held securely until the rental is completed and both parties confirm satisfaction.',
];

const CONDITION_REPORT_META = {
  pickup: {
    cardBg: '#EFF6FF',
    cardBorder: '#BFDBFE',
    icon: '#2563EB',
    badgeBg: '#DBEAFE',
    badgeText: '#1D4ED8',
    title: 'Pickup Inspection',
  },
  return: {
    cardBg: '#F5F3FF',
    cardBorder: '#DDD6FE',
    icon: '#7C3AED',
    badgeBg: '#EDE9FE',
    badgeText: '#6D28D9',
    title: 'Return Inspection',
  },
} as const;

const SectionCard = ({
  icon,
  title,
  children,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  children: React.ReactNode;
}) => (
  <View style={styles.sectionCard}>
    <View style={styles.sectionHeader}>
      <MaterialCommunityIcons name={icon} size={20} color="#0F172A" />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
    {children}
  </View>
);

const DetailRow = ({
  label,
  value,
  emphasized = false,
  valueColor,
}: {
  label: string;
  value: string;
  emphasized?: boolean;
  valueColor?: string;
}) => (
  <View style={styles.detailRow}>
    <Text style={[styles.detailLabel, emphasized && styles.detailLabelStrong]}>{label}</Text>
    <Text
      style={[
        styles.detailValue,
        emphasized && styles.detailValueStrong,
        valueColor ? { color: valueColor } : null,
      ]}
    >
      {value}
    </Text>
  </View>
);

const PartyCard = ({
  title,
  profile,
  email,
  navigation,
}: {
  title: string;
  profile: PublicUserProfile | null;
  email: string;
  navigation: Nav;
}) => {
  const displayName = profile?.full_name || profile?.username || (title === 'Item Owner' ? 'Owner' : 'Renter');

  return (
    <TouchableOpacity
      style={styles.partyCard}
      activeOpacity={0.85}
      onPress={() => navigation.navigate('PublicProfile', { userEmail: email })}
    >
      <Text style={styles.partyCardLabel}>{title}</Text>
      <View style={styles.partyCardContent}>
        <View style={styles.partyAvatarWrap}>
          {profile?.profile_picture ? (
            <Image source={{ uri: profile.profile_picture }} style={styles.partyAvatar} />
          ) : (
            <View style={[styles.partyAvatar, styles.partyAvatarPlaceholder]}>
              <MaterialCommunityIcons name="account-outline" size={22} color="#475569" />
            </View>
          )}
        </View>
        <View style={styles.partyTextBlock}>
          <Text style={styles.partyName} numberOfLines={1}>
            {displayName}
          </Text>
          {profile?.username ? (
            <Text style={styles.partyHandle} numberOfLines={1}>
              @{profile.username}
            </Text>
          ) : null}
          <Text style={styles.partyEmail} numberOfLines={1}>
            {email}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

export const RentalDetailScreen = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { rentalId } = route.params;
  const { language, t } = useI18n();
  const { user: clerkUser } = useUser();
  const { user } = useAuthStore();
  const userEmail = clerkUser?.emailAddresses?.[0]?.emailAddress ?? user?.email;
  const locale = language === 'fr' ? 'fr-FR' : language === 'es' ? 'es-ES' : language === 'de' ? 'de-DE' : 'en-US';

  const [rental, setRental] = useState<RentalRequest | null>(null);
  const [itemInfo, setItemInfo] = useState<ItemInfo | null>(null);
  const [renterProfile, setRenterProfile] = useState<PublicUserProfile | null>(null);
  const [ownerProfile, setOwnerProfile] = useState<PublicUserProfile | null>(null);
  const [conditionReports, setConditionReports] = useState<ConditionReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    const loadData = async () => {
      try {
        const [requestData, reports] = await Promise.all([
          getRentalRequestById(rentalId),
          getConditionReports({ rental_request_id: rentalId }),
        ]);

        if (isCancelled) return;

        setRental(requestData);
        setConditionReports(reports);

        const [itemResult, renterResult, ownerResult] = await Promise.allSettled([
          requestData?.item_id ? getListingById(requestData.item_id) : Promise.resolve(undefined),
          api.get('/users/by-email', { params: { email: requestData.renter_email } }),
          api.get('/users/by-email', { params: { email: requestData.owner_email } }),
        ]);

        if (isCancelled) return;

        if (itemResult.status === 'fulfilled' && itemResult.value) {
          const result = itemResult.value;
          setItemInfo({
            title: result.listing.title,
            description: result.listing.description,
            images: result.listing.images,
            category: result.listing.category,
            condition: result.listing.condition,
            daily_rate: result.listing.pricePerDay ?? result.listing.daily_rate,
            deposit: result.listing.deposit,
            location: result.listing.location,
          });

          if (result.owner?.email?.toLowerCase() === requestData.owner_email.toLowerCase()) {
            setOwnerProfile((prev) => prev || {
              id: result.owner?.email || requestData.owner_email,
              email: result.owner?.email || requestData.owner_email,
              username: result.owner?.username,
              full_name: result.owner?.full_name,
              profile_picture: result.owner?.profile_picture,
            });
          }
        }

        if (renterResult.status === 'fulfilled') {
          const data = renterResult.value.data?.data || renterResult.value.data;
          setRenterProfile(data || null);
        }

        if (ownerResult.status === 'fulfilled') {
          const data = ownerResult.value.data?.data || ownerResult.value.data;
          setOwnerProfile(data || null);
        }
      } catch (error) {
        console.error('Error loading rental agreement:', error);
        toast.error(t('rentalDetail.notFound'), () => navigation.goBack());
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [navigation, rentalId, t]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!rental) {
    return (
      <View style={styles.centered}>
        <Text style={styles.notFoundText}>{t('rentalDetail.notFound')}</Text>
      </View>
    );
  }

  const startBoundary = parseRentalBoundaryDate(rental.start_date);
  const endBoundary = parseRentalBoundaryDate(rental.end_date);
  const hasDateRange =
    rental.status !== 'inquiry' &&
    !Number.isNaN(startBoundary.getTime()) &&
    !Number.isNaN(endBoundary.getTime());

  const startDate = hasDateRange
    ? startBoundary.toLocaleDateString(locale, { month: 'long', day: 'numeric', year: 'numeric' })
    : null;
  const endDate = hasDateRange
    ? endBoundary.toLocaleDateString(locale, { month: 'long', day: 'numeric', year: 'numeric' })
    : null;
  const createdAtLabel = new Date(rental.created_date).toLocaleString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  const totalDays = hasDateRange
    ? Math.max(1, Math.ceil((endBoundary.getTime() - startBoundary.getTime()) / 86400000) + 1)
    : 0;
  const rentalCost = rental.total_amount ?? 0;
  const platformFee = typeof rental.platform_fee === 'number' ? rental.platform_fee : rentalCost * 0.15;
  const securityDeposit =
    typeof rental.security_deposit === 'number' ? rental.security_deposit : itemInfo?.deposit ?? 0;
  const totalPaid =
    typeof rental.total_paid === 'number' ? rental.total_paid : rentalCost + platformFee + securityDeposit;
  const ownerPayout = rentalCost;
  const statusMeta = STATUS_META[rental.status] ?? { bg: '#E2E8F0', text: '#334155' };
  const itemImage = itemInfo?.images?.[0];
  const locationLabel = itemInfo?.location
    ? typeof itemInfo.location === 'string'
      ? itemInfo.location
      : [itemInfo.location.address, itemInfo.location.city].filter(Boolean).join(', ')
    : '';
  const pickupReports = conditionReports.filter((report) => report.report_type === 'pickup');
  const returnReports = conditionReports.filter((report) => report.report_type === 'return');

  const renderConditionReportCard = (report: ConditionReport) => {
    const reportMeta = CONDITION_REPORT_META[report.report_type];

    return (
      <View
        key={report.id}
        style={[
          styles.reportCard,
          { backgroundColor: reportMeta.cardBg, borderColor: reportMeta.cardBorder },
        ]}
      >
        <View style={styles.reportCardHeader}>
          <View style={styles.reportHeaderMeta}>
            <MaterialCommunityIcons name="camera-outline" size={18} color={reportMeta.icon} />
            <View style={styles.reportHeaderText}>
              <Text style={styles.reportHeaderTitle}>{reportMeta.title}</Text>
              <Text style={styles.reportMetaText}>by {report.reported_by_email}</Text>
            </View>
          </View>
          <View style={[styles.reportDateBadge, { backgroundColor: reportMeta.badgeBg }]}>
            <Text style={[styles.reportDateBadgeText, { color: reportMeta.badgeText }]}>
              {new Date(report.created_date).toLocaleString(locale, {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </Text>
          </View>
        </View>

        {report.notes ? (
          <Text style={styles.reportNotes}>{report.notes}</Text>
        ) : null}

        {report.damages_reported?.length ? (
          <View style={styles.reportDamageAlert}>
            <View style={styles.reportDamageAlertHeader}>
              <MaterialCommunityIcons name="alert-outline" size={16} color="#DC2626" />
              <Text style={styles.reportDamageAlertTitle}>
                {report.damages_reported.length} Damage(s) Reported
              </Text>
            </View>
            {report.damages_reported.map((damage, index) => (
              <Text key={`${report.id}-damage-${index}`} style={styles.damageDescription}>
                <Text style={styles.damageSeverityInline}>{damage.severity}: </Text>
                {damage.description}
              </Text>
            ))}
          </View>
        ) : null}

        {report.condition_photos?.length ? (
          <View style={styles.reportTextBlock}>
            <Text style={styles.reportBlockLabel}>Photos</Text>
            <View style={styles.photoGrid}>
              {report.condition_photos.map((url, index) => (
                <Image
                  key={`${report.id}-photo-${index}`}
                  source={{ uri: url }}
                  style={styles.reportPhoto}
                  resizeMode="cover"
                />
              ))}
            </View>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={20} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Rental Agreement</Text>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroTitleRow}>
            <MaterialCommunityIcons name="file-document-outline" size={24} color="#FFFFFF" />
            <Text style={styles.heroTitle}>Rental Agreement</Text>
          </View>
          <Text style={styles.heroMeta}>Agreement ID: {rental.id}</Text>
          <Text style={styles.heroMetaSecondary}>Created: {createdAtLabel}</Text>
        </View>

        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Status:</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusMeta.bg }]}>
            <Text style={[styles.statusBadgeText, { color: statusMeta.text }]}>
              {rental.status.replace(/_/g, ' ').toUpperCase()}
            </Text>
          </View>
        </View>

        {itemInfo ? (
          <SectionCard icon="package-variant-closed" title="Rental Item">
            <View style={styles.itemContent}>
              {itemImage ? (
                <Image source={{ uri: itemImage }} style={styles.itemImage} resizeMode="cover" />
              ) : (
                <View style={[styles.itemImage, styles.itemImagePlaceholder]}>
                  <MaterialCommunityIcons name="image-outline" size={28} color="#94A3B8" />
                </View>
              )}
              <View style={styles.itemDetails}>
                <Text style={styles.itemTitle}>{itemInfo.title}</Text>
                {itemInfo.description ? (
                  <Text style={styles.itemDescription} numberOfLines={3}>
                    {itemInfo.description}
                  </Text>
                ) : null}

                <View style={styles.pillWrap}>
                  {itemInfo.category ? (
                    <View style={styles.outlinePill}>
                      <Text style={styles.outlinePillText}>{itemInfo.category}</Text>
                    </View>
                  ) : null}
                  {itemInfo.condition ? (
                    <View style={styles.outlinePill}>
                      <Text style={styles.outlinePillText}>{itemInfo.condition} condition</Text>
                    </View>
                  ) : null}
                  {locationLabel ? (
                    <View style={styles.outlinePill}>
                      <MaterialCommunityIcons name="map-marker-outline" size={12} color="#475569" />
                      <Text style={styles.outlinePillText}>{locationLabel}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>
          </SectionCard>
        ) : null}

        <SectionCard icon="account-outline" title="Parties Involved">
          <View style={styles.partiesGrid}>
            <PartyCard
              title="Item Owner"
              profile={ownerProfile}
              email={rental.owner_email}
              navigation={navigation}
            />
            <PartyCard
              title="Renter"
              profile={renterProfile}
              email={rental.renter_email}
              navigation={navigation}
            />
          </View>
        </SectionCard>

        {hasDateRange ? (
          <SectionCard icon="calendar-range" title="Rental Period">
            <DetailRow label="Start Date" value={startDate || '-'} />
            <DetailRow label="End Date" value={endDate || '-'} />
            <View style={styles.sectionDivider} />
            <DetailRow
              label="Total Duration"
              value={`${totalDays} ${totalDays === 1 ? 'day' : 'days'}`}
              emphasized
            />
          </SectionCard>
        ) : null}

        {rental.status !== 'inquiry' ? (
          <SectionCard icon="currency-usd" title="Pricing Details">
            {itemInfo?.daily_rate !== undefined ? (
              <DetailRow label="Daily Rate" value={`${formatCurrency(itemInfo.daily_rate)}/day`} />
            ) : null}
            {hasDateRange ? <DetailRow label="Number of Days" value={String(totalDays)} /> : null}
            <DetailRow label="Base Rental Cost" value={formatCurrency(rentalCost)} />
            <DetailRow label="Platform Fee (15%)" value={formatCurrency(platformFee)} />
            {securityDeposit > 0 ? (
              <DetailRow label="Security Deposit" value={formatCurrency(securityDeposit)} />
            ) : null}
            <View style={styles.sectionDivider} />
            <DetailRow
              label="Total Paid by Renter"
              value={formatCurrency(totalPaid)}
              emphasized
              valueColor="#16A34A"
            />
            <View style={styles.ownerPayoutCard}>
              <Text style={styles.ownerPayoutText}>
                <Text style={styles.ownerPayoutStrong}>Owner Payout:</Text> {formatCurrency(ownerPayout)}
              </Text>
              <Text style={styles.ownerPayoutSubtext}>(platform fee is paid by renter)</Text>
            </View>
          </SectionCard>
        ) : null}

        {rental.message ? (
          <SectionCard icon="message-text-outline" title="Initial Request Message">
            <View style={styles.messageCard}>
              <Text style={styles.messageText}>"{rental.message}"</Text>
            </View>
          </SectionCard>
        ) : null}

        {conditionReports.length > 0 ? (
          <SectionCard icon="clipboard-check-outline" title="Condition Reports">
            {pickupReports.length > 0 ? (
              <View style={styles.reportGroup}>
                <Text style={styles.reportGroupTitle}>
                  Pre-Rental Condition ({pickupReports.length} of 2)
                </Text>
                {pickupReports.map(renderConditionReportCard)}
              </View>
            ) : null}

            {returnReports.length > 0 ? (
              <View style={styles.reportGroup}>
                <Text style={styles.reportGroupTitle}>
                  Return Condition ({returnReports.length} of 2)
                </Text>
                {returnReports.map(renderConditionReportCard)}
              </View>
            ) : null}
          </SectionCard>
        ) : null}

        <SectionCard icon="shield-check-outline" title="Terms & Conditions">
          <View style={styles.termsList}>
            {AGREEMENT_TERMS.map((term) => (
              <View key={term} style={styles.termRow}>
                <MaterialCommunityIcons name="check-circle" size={16} color="#16A34A" style={styles.termIcon} />
                <Text style={styles.termText}>{term}</Text>
              </View>
            ))}
          </View>
        </SectionCard>

        <View style={styles.footerCard}>
          <Text style={styles.footerText}>
            This agreement is governed by Rentany's Terms of Service and Privacy Policy.
          </Text>
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
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 40,
    gap: 14,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 2,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  topBarTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  heroCard: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    padding: 20,
    marginTop: 4,
  },
  heroTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  heroMeta: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '500',
  },
  heroMetaSecondary: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  itemContent: {
    flexDirection: 'row',
    gap: 14,
  },
  itemImage: {
    width: 96,
    height: 96,
    borderRadius: 14,
    backgroundColor: '#E2E8F0',
  },
  itemImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemDetails: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  itemDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: '#475569',
    marginBottom: 10,
  },
  pillWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  outlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#F8FAFC',
  },
  outlinePillText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  partiesGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  partyCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  partyCardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  partyCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  partyAvatarWrap: {
    flexShrink: 0,
  },
  partyAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  partyAvatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E2E8F0',
  },
  partyTextBlock: {
    flex: 1,
  },
  partyName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  partyHandle: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
  },
  partyEmail: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    gap: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: '#64748B',
    flex: 1,
  },
  detailLabelStrong: {
    color: '#334155',
    fontWeight: '700',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    textAlign: 'right',
    flex: 1,
  },
  detailValueStrong: {
    fontSize: 18,
    fontWeight: '800',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 6,
  },
  ownerPayoutCard: {
    marginTop: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    padding: 12,
  },
  ownerPayoutText: {
    color: '#1E3A8A',
    fontSize: 12,
  },
  ownerPayoutStrong: {
    fontWeight: '700',
  },
  ownerPayoutSubtext: {
    color: '#2563EB',
    fontSize: 11,
    marginTop: 4,
  },
  messageCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#475569',
    fontStyle: 'italic',
  },
  reportGroup: {
    gap: 10,
    marginBottom: 14,
  },
  reportGroupTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  reportCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    padding: 14,
  },
  reportCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 10,
  },
  reportHeaderMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  reportHeaderText: {
    flex: 1,
  },
  reportHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  reportDateBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  reportDateBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  reportMetaText: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
  },
  reportNotes: {
    fontSize: 13,
    lineHeight: 20,
    color: '#475569',
    marginBottom: 10,
  },
  reportTextBlock: {
    marginTop: 10,
  },
  reportBlockLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  reportDamageAlert: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 12,
    marginTop: 2,
  },
  reportDamageAlertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  reportDamageAlertTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7F1D1D',
  },
  damageDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: '#991B1B',
    marginTop: 4,
  },
  damageSeverityInline: {
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reportPhoto: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
  },
  termsList: {
    gap: 12,
  },
  termRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  termIcon: {
    marginTop: 2,
  },
  termText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    color: '#475569',
  },
  footerCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    color: '#64748B',
  },
  notFoundText: {
    color: '#94A3B8',
    fontSize: typography.body,
  },
});
