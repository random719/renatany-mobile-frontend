import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { GlobalHeader } from '../../components/common/GlobalHeader';
import { useI18n } from '../../i18n';
import {
  deleteNotification,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../../services/notificationService';
import { colors, typography } from '../../theme';
import { AppNotification } from '../../types/models';

const TYPE_ICON: Record<AppNotification['type'], string> = {
  booking_update: 'calendar-check',
  new_message: 'message',
  review: 'star',
  dispute: 'alert-circle',
  system: 'bell',
  promotion: 'tag',
};

const TYPE_COLOR: Record<AppNotification['type'], string> = {
  booking_update: '#2563EB',
  new_message: '#16A34A',
  review: '#D97706',
  dispute: '#DC2626',
  system: '#6B7280',
  promotion: '#9333EA',
};

const getLocale = (language: string) =>
  language === 'fr' ? 'fr-FR' : language === 'es' ? 'es-ES' : language === 'de' ? 'de-DE' : 'en-US';

const relativeTime = (
  iso: string,
  language: string,
  t: (key: string, params?: Record<string, string | number>) => string,
) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t('common.justNow');
  if (mins < 60) return t('notifications.minutesAgo', { count: mins });
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return t('notifications.hoursAgo', { count: hrs });
  const days = Math.floor(hrs / 24);
  if (days === 1) return t('common.yesterday');
  return new Date(iso).toLocaleDateString(getLocale(language), { month: 'short', day: 'numeric' });
};

const dayGroup = (iso: string, t: (key: string) => string) => {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 86400000) return t('common.today');
  if (diff < 172800000) return t('common.yesterday');
  return t('common.older');
};

type Section = { title: string; data: AppNotification[] };

const groupNotifications = (notifications: AppNotification[], t: (key: string) => string): Section[] => {
  const groups: Record<string, AppNotification[]> = {};
  notifications.forEach((n) => {
    const g = dayGroup(n.created_date, t);
    if (!groups[g]) groups[g] = [];
    groups[g].push(n);
  });
  const order = [t('common.today'), t('common.yesterday'), t('common.older')];
  return order.filter((g) => groups[g]).map((g) => ({ title: g, data: groups[g] }));
};

export const NotificationsScreen = () => {
  const navigation = useNavigation();
  const { language, t } = useI18n();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setIsLoading(true);
    try {
      const data = await getNotifications({ limit: 50 });
      setNotifications(data.sort((a, b) =>
        new Date(b.created_date).getTime() - new Date(a.created_date).getTime()
      ));
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleMarkRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    try { await markNotificationRead(id); } catch { /* ignore */ }
  };

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    try { await markAllNotificationsRead(); } catch { /* ignore */ }
  };

  const handleDelete = async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try { await deleteNotification(id); } catch { /* ignore */ }
  };

  const sections = groupNotifications(notifications, t as any);
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const renderItem = ({ item }: { item: AppNotification }) => {
    const iconName = TYPE_ICON[item.type] ?? 'bell';
    const iconColor = TYPE_COLOR[item.type] ?? '#6B7280';

    return (
      <TouchableOpacity
        style={[styles.notifCard, !item.is_read && styles.unreadCard]}
        onPress={() => handleMarkRead(item.id)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconCircle, { backgroundColor: iconColor + '18' }]}>
          <MaterialCommunityIcons name={iconName as keyof typeof MaterialCommunityIcons.glyphMap} size={22} color={iconColor} />
        </View>
        <View style={styles.notifBody}>
          <View style={styles.notifTitleRow}>
            <Text style={styles.notifTitle} numberOfLines={1}>{item.title}</Text>
            {!item.is_read && <View style={styles.unreadDot} />}
          </View>
          <Text style={styles.notifBodyText} numberOfLines={2}>{item.body}</Text>
          <Text style={styles.notifTime}>{relativeTime(item.created_date, language, t as any)}</Text>
        </View>
        <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialCommunityIcons name="close" size={16} color="#94A3B8" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = (title: string) => (
    <Text style={styles.sectionHeader}>{title}</Text>
  );

  type ListItem = AppNotification | { __section: string };

  const flatData: ListItem[] = sections.flatMap((s) => [
    { __section: s.title } as ListItem,
    ...s.data,
  ]);

  return (
    <View style={styles.container}>
      <GlobalHeader />

      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text variant="titleLarge" style={styles.title}>{t('notifications.title')}</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAllRead}>
            <Text style={styles.markAllText}>{t('notifications.markAllRead')}</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={flatData}
          keyExtractor={(item, idx) =>
            '__section' in item ? `section-${item.__section}` : (item as AppNotification).id ?? String(idx)
          }
          renderItem={({ item }) => {
            if ('__section' in item) return renderSectionHeader(item.__section as string);
            return renderItem({ item: item as AppNotification });
          }}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => { setIsRefreshing(true); load(true); }}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="bell-off-outline" size={64} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>{t('notifications.emptyTitle')}</Text>
              <Text style={styles.emptySubtitle}>{t('notifications.emptySubtitle')}</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  backBtn: {
    padding: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  title: { flex: 1, fontWeight: '700', color: '#0F172A' },
  markAllText: { color: colors.accentBlue, fontWeight: '600', fontSize: typography.body },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  sectionHeader: {
    fontWeight: '700',
    color: '#94A3B8',
    fontSize: typography.small,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 8,
  },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  unreadCard: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  notifBody: { flex: 1 },
  notifTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  notifTitle: { fontWeight: '700', color: '#0F172A', fontSize: typography.body, flex: 1 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#3B82F6', flexShrink: 0 },
  notifBodyText: { color: '#475569', fontSize: typography.body, lineHeight: 20, marginBottom: 6 },
  notifTime: { color: '#94A3B8', fontSize: typography.small },
  deleteBtn: { padding: 4 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12 },
  emptyTitle: { fontWeight: '700', color: '#475569', fontSize: typography.tabLabel },
  emptySubtitle: { color: '#94A3B8', fontSize: typography.body },
});
