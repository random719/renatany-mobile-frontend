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
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../../services/notificationService';
import { colors, typography } from '../../theme';
import { AppNotification } from '../../types/models';

const NOTIFICATION_EMOJI: Record<string, string> = {
  listing_report_action: '⚠️',
  user_report_action: '⚠️',
  report_outcome: '✅',
  rental_request: '📦',
  booking_update: '📦',
  message: '💬',
  new_message: '💬',
  payment: '💰',
  review: '⭐',
  dispute: '⚠️',
  promotion: '🏷️',
  system: '🔔',
};

const getNotificationEmoji = (type: string) => NOTIFICATION_EMOJI[type] ?? '🔔';

const getLocale = (language: string) =>
  language === 'fr' ? 'fr-FR' : language === 'es' ? 'es-ES' : language === 'de' ? 'de-DE' : 'en-US';

const formatTimestamp = (iso: string, language: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(getLocale(language), {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
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
      setNotifications(
        [...data].sort(
          (a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime(),
        ),
      );
    } catch {
      setNotifications([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleMarkRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === id ? { ...notification, is_read: true } : notification,
      ),
    );
    try {
      await markNotificationRead(id);
    } catch {
      // optimistic update only
    }
  };

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((notification) => ({ ...notification, is_read: true })));
    try {
      await markAllNotificationsRead();
    } catch {
      // optimistic update only
    }
  };

  const unreadCount = notifications.filter((notification) => !notification.is_read).length;

  const renderItem = ({ item }: { item: AppNotification }) => (
    <TouchableOpacity
      style={[styles.notificationRow, !item.is_read && styles.unreadRow]}
      onPress={() => handleMarkRead(item.id)}
      activeOpacity={0.75}
    >
      <View style={styles.emojiWrap}>
        <Text style={styles.emoji}>{getNotificationEmoji(item.type)}</Text>
      </View>

      <View style={styles.notificationBody}>
        <View style={styles.titleRow}>
          <Text style={styles.notificationTitle} numberOfLines={1}>
            {item.title}
          </Text>
          {!item.is_read ? (
            <TouchableOpacity
              onPress={() => handleMarkRead(item.id)}
              style={styles.markReadButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialCommunityIcons name="check" size={16} color="#0F172A" />
            </TouchableOpacity>
          ) : null}
        </View>

        {item.body ? (
          <Text style={styles.notificationMessage} numberOfLines={3}>
            {item.body}
          </Text>
        ) : null}

        <Text style={styles.notificationTime}>{formatTimestamp(item.created_date, language)}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <GlobalHeader />

      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text variant="titleLarge" style={styles.title}>
          {t('notifications.title')}
        </Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={handleMarkAllRead}>
            <Text style={styles.markAllText}>{t('notifications.markAllRead')}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <View style={styles.panel}>
          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            contentContainerStyle={notifications.length === 0 ? styles.emptyList : undefined}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={() => {
                  setIsRefreshing(true);
                  load(true);
                }}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="bell-off-outline" size={52} color="#CBD5E1" />
                <Text style={styles.emptyTitle}>{t('notifications.emptyTitle')}</Text>
                <Text style={styles.emptySubtitle}>{t('notifications.emptySubtitle')}</Text>
              </View>
            }
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
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
  title: {
    flex: 1,
    fontWeight: '700',
    color: '#0F172A',
  },
  markAllText: {
    color: colors.accentBlue,
    fontWeight: '600',
    fontSize: typography.body,
  },
  headerSpacer: {
    width: 88,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panel: {
    flex: 1,
    marginHorizontal: 16,
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  unreadRow: {
    backgroundColor: '#EFF6FF80',
  },
  emojiWrap: {
    width: 30,
    alignItems: 'center',
    paddingTop: 2,
  },
  emoji: {
    fontSize: 22,
  },
  notificationBody: {
    flex: 1,
    gap: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  notificationTitle: {
    flex: 1,
    color: '#0F172A',
    fontSize: typography.body,
    fontWeight: '700',
  },
  markReadButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  notificationMessage: {
    color: '#64748B',
    fontSize: typography.small,
    lineHeight: 19,
  },
  notificationTime: {
    color: '#94A3B8',
    fontSize: 12,
  },
  separator: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginLeft: 58,
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 10,
  },
  emptyTitle: {
    color: '#0F172A',
    fontSize: typography.tabLabel,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySubtitle: {
    color: '#64748B',
    fontSize: typography.body,
    textAlign: 'center',
  },
});
