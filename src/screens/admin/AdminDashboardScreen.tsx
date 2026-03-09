import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Text } from "react-native-paper";
import Svg, { Circle, Line, Polyline, Rect, Text as SvgText } from "react-native-svg";
import { GlobalHeader } from "../../components/common/GlobalHeader";
import { Footer } from "../../components/home/Footer";
import { getAdminDashboardData } from "../../services/adminService";
import {
  AdminDashboardData,
  AdminMetric,
  AdminTabKey,
  CategoryPerformanceItem,
  DailyRevenuePoint,
  RecentActivityItem,
  RevenueCategoryItem,
  RevenuePoint,
} from "../../types/admin";
import { colors, iconSize, typography } from "../../theme";

const TABS: { key: AdminTabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "users", label: "Users" },
  { key: "revenue", label: "Revenue" },
  { key: "moderation", label: "Moderation" },
  { key: "health", label: "Health" },
];

const CHART_W = 320;
const CHART_H = 170;
const CHART_PADDING = 22;
const CHART_AXIS_FONT_SIZE = typography.small;

const formatLastUpdated = (value: Date) =>
  value.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

const formatActivityTime = (iso: string) =>
  new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

const MetricCard = ({ metric }: { metric: AdminMetric }) => (
  <View style={styles.metricCard}>
    <View>
      <Text style={styles.metricTitle}>{metric.label}</Text>
      <Text style={styles.metricValue}>{metric.value}</Text>
      <Text style={styles.metricSubtext}>{metric.subtitle}</Text>
      <Text style={styles.metricChange}>{metric.changeText}</Text>
    </View>
    <View style={[styles.metricPill, { backgroundColor: metric.color }]} />
  </View>
);

const UsersMetricCard = ({
  title,
  value,
  subtitle,
  change,
  color,
  iconName,
}: {
  title: string;
  value: string;
  subtitle: string;
  change?: string;
  color: string;
  iconName?: keyof typeof MaterialCommunityIcons.glyphMap;
}) => (
  <View style={styles.metricCard}>
    <View>
      <Text style={styles.metricTitle}>{title}</Text>
      <Text style={styles.usersMetricValue}>{value}</Text>
      <Text style={styles.metricSubtext}>{subtitle}</Text>
      {change ? <Text style={styles.metricChange}>{change}</Text> : null}
    </View>
    <View style={[styles.metricPill, { backgroundColor: color }]}>
      {iconName ? (
        <MaterialCommunityIcons name={iconName} size={iconSize.md} color="#0F172A" />
      ) : null}
    </View>
  </View>
);

const RevenueTrendChart = ({ data }: { data: RevenuePoint[] }) => {
  if (!data.length) {
    return (
      <View style={styles.chartCard}>
        <View style={styles.sectionHeaderRow}>
          <MaterialCommunityIcons name="trending-up" size={iconSize.lg} color="#16A34A" />
          <Text style={styles.chartTitle}>Revenue Trend (Last 30 Days)</Text>
        </View>
        <Text style={styles.emptyChartText}>No revenue data available yet.</Text>
      </View>
    );
  }

  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const points = data.map((point, index) => {
    const x =
      CHART_PADDING +
      (index * (CHART_W - CHART_PADDING * 2)) / Math.max(data.length - 1, 1);
    const y =
      CHART_H -
      CHART_PADDING -
      (point.value / maxVal) * (CHART_H - CHART_PADDING * 2);
    return `${x},${y}`;
  });

  const axisLabels = [0, 1, 2, 3, 4];
  const xTicks = [0, 5, 10, 15, 20, 25, 29]
    .filter((idx) => idx < data.length)
    .map((idx) => ({ idx, label: data[idx].date }));

  return (
    <View style={styles.chartCard}>
      <View style={styles.sectionHeaderRow}>
        <MaterialCommunityIcons name="trending-up" size={iconSize.lg} color="#16A34A" />
        <Text style={styles.chartTitle}>Revenue Trend (Last 30 Days)</Text>
      </View>
      <Svg width="100%" height={CHART_H + 30} viewBox={`0 0 ${CHART_W} ${CHART_H + 30}`}>
        {axisLabels.map((tick) => {
          const y = CHART_H - CHART_PADDING - (tick / 4) * (CHART_H - CHART_PADDING * 2);
          return (
            <Line
              key={`grid-${tick}`}
              x1={CHART_PADDING}
              y1={y}
              x2={CHART_W - CHART_PADDING}
              y2={y}
              stroke="#D1D5DB"
              strokeDasharray="3,4"
              strokeWidth={1}
            />
          );
        })}
        <Line
          x1={CHART_PADDING}
          y1={CHART_PADDING}
          x2={CHART_PADDING}
          y2={CHART_H - CHART_PADDING}
          stroke="#9CA3AF"
          strokeWidth={1}
        />
        <Line
          x1={CHART_PADDING}
          y1={CHART_H - CHART_PADDING}
          x2={CHART_W - CHART_PADDING}
          y2={CHART_H - CHART_PADDING}
          stroke="#9CA3AF"
          strokeWidth={1}
        />
        <Polyline
          points={points.join(" ")}
          fill="none"
          stroke="#10B981"
          strokeWidth={2.5}
          strokeLinejoin="round"
        />
        {points.map((point, idx) => {
          const [cx, cy] = point.split(",").map(Number);
          return <Circle key={`dot-${idx}`} cx={cx} cy={cy} r={2.6} fill="#10B981" />;
        })}
        {axisLabels.map((tick) => {
          const y = CHART_H - CHART_PADDING - (tick / 4) * (CHART_H - CHART_PADDING * 2);
          return (
            <SvgText
              key={`ylbl-${tick}`}
              x={6}
              y={y + 3}
              fill="#6B7280"
              fontSize={CHART_AXIS_FONT_SIZE}
            >
              {tick}
            </SvgText>
          );
        })}
        {xTicks.map((tick) => {
          const x =
            CHART_PADDING +
            (tick.idx * (CHART_W - CHART_PADDING * 2)) / Math.max(data.length - 1, 1);
          return (
            <SvgText
              key={`xlbl-${tick.idx}`}
              x={x - 14}
              y={CHART_H + 12}
              fill="#6B7280"
              fontSize={CHART_AXIS_FONT_SIZE}
            >
              {tick.label}
            </SvgText>
          );
        })}
      </Svg>
      <Text style={styles.chartLegend}>-o Revenue ($)</Text>
    </View>
  );
};

const CategoryChart = ({ data }: { data: CategoryPerformanceItem[] }) => {
  if (!data.length) {
    return (
      <View style={styles.chartCard}>
        <View style={styles.sectionHeaderRow}>
          <MaterialCommunityIcons name="cube-outline" size={iconSize.lg} color="#2563EB" />
          <Text style={styles.chartTitle}>Category Performance</Text>
        </View>
        <Text style={styles.emptyChartText}>No category data available yet.</Text>
      </View>
    );
  }

  const maxVal = Math.max(...data.flatMap((d) => [d.items, d.rentals]), 1);
  const barWidth = 18;
  const groupGap = 12;
  const innerGap = 5;

  return (
    <View style={styles.chartCard}>
      <View style={styles.sectionHeaderRow}>
        <MaterialCommunityIcons name="cube-outline" size={iconSize.lg} color="#2563EB" />
        <Text style={styles.chartTitle}>Category Performance</Text>
      </View>
      <Svg width="100%" height={CHART_H + 34} viewBox={`0 0 ${CHART_W} ${CHART_H + 34}`}>
        {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
          const y = CHART_H - CHART_PADDING - tick * (CHART_H - CHART_PADDING * 2);
          return (
            <Line
              key={`c-grid-${tick}`}
              x1={CHART_PADDING}
              y1={y}
              x2={CHART_W - CHART_PADDING}
              y2={y}
              stroke="#D1D5DB"
              strokeDasharray="3,4"
              strokeWidth={1}
            />
          );
        })}
        <Line
          x1={CHART_PADDING}
          y1={CHART_PADDING}
          x2={CHART_PADDING}
          y2={CHART_H - CHART_PADDING}
          stroke="#9CA3AF"
          strokeWidth={1}
        />
        <Line
          x1={CHART_PADDING}
          y1={CHART_H - CHART_PADDING}
          x2={CHART_W - CHART_PADDING}
          y2={CHART_H - CHART_PADDING}
          stroke="#9CA3AF"
          strokeWidth={1}
        />

        {data.map((item, idx) => {
          const itemsBarHeight = (item.items / maxVal) * (CHART_H - CHART_PADDING * 2);
          const rentalsBarHeight = (item.rentals / maxVal) * (CHART_H - CHART_PADDING * 2);
          const groupX =
            CHART_PADDING + 16 + idx * (barWidth * 2 + innerGap + groupGap);
          const itemsY = CHART_H - CHART_PADDING - itemsBarHeight;
          const rentalsY = CHART_H - CHART_PADDING - rentalsBarHeight;
          return (
            <React.Fragment key={item.category}>
              <Rect
                x={groupX}
                y={itemsY}
                width={barWidth}
                height={Math.max(itemsBarHeight, 1.5)}
                fill="#3B82F6"
                rx={4}
              />
              <Rect
                x={groupX + barWidth + innerGap}
                y={rentalsY}
                width={barWidth}
                height={Math.max(rentalsBarHeight, 1.5)}
                fill="#10B981"
                rx={4}
              />
              <SvgText
                x={groupX + 2}
                y={CHART_H + 13}
                fill="#6B7280"
                fontSize={CHART_AXIS_FONT_SIZE}
              >
                {item.category.slice(0, 5)}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
      <View style={styles.categoryLegendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: "#3B82F6" }]} />
          <Text style={styles.chartLegend}>Items</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: "#10B981" }]} />
          <Text style={styles.chartLegend}>Rentals</Text>
        </View>
      </View>
    </View>
  );
};

const ActivityFeed = ({ items }: { items: RecentActivityItem[] }) => (
  <View style={styles.activityCard}>
    <View style={styles.sectionHeaderRow}>
      <MaterialCommunityIcons name="history" size={iconSize.lg} color="#2563EB" />
      <Text style={styles.cardTitle}>Recent Activity</Text>
    </View>
    {items.slice(0, 5).map((item) => (
      <View key={item.id} style={styles.activityItem}>
        <View style={styles.activityIconWrap}>
          <MaterialCommunityIcons name={item.icon as never} size={17} color={item.iconColor} />
        </View>
        <View style={styles.activityTextWrap}>
          <Text style={styles.activityMessage}>{item.message}</Text>
          <Text style={styles.activityTime}>{formatActivityTime(item.timestamp)}</Text>
        </View>
      </View>
    ))}
  </View>
);

const RevenueByCategoryCard = ({ data }: { data: RevenueCategoryItem[] }) => (
  <View style={styles.chartCard}>
    <View style={styles.sectionHeaderRow}>
      <MaterialCommunityIcons name="currency-usd" size={iconSize.lg} color="#16A34A" />
      <Text style={styles.cardTitle}>Revenue by Category</Text>
    </View>
    {data.slice(0, 4).map((item) => (
      <View key={item.category} style={styles.revenueCategoryRow}>
        <View style={styles.revenueCategoryIcon}>
          <MaterialCommunityIcons name="cube-outline" size={iconSize.md} color="#3B82F6" />
        </View>
        <View style={styles.revenueCategoryText}>
          <Text style={styles.revenueCategoryTitle}>{item.category}</Text>
          <Text style={styles.revenueCategoryMeta}>
            {item.items} items • {item.rentals} rentals
          </Text>
        </View>
        <View style={styles.revenueCategoryAmount}>
          <Text style={styles.revenueCategoryValue}>${item.revenue.toFixed(2)}</Text>
          <Text style={styles.revenueCategoryLabel}>Revenue</Text>
        </View>
      </View>
    ))}
  </View>
);

const DailyRevenueBreakdownChart = ({ data }: { data: DailyRevenuePoint[] }) => {
  const visibleData = data.slice(-30);
  const maxRentals = Math.max(...visibleData.map((d) => d.rentals), 1);
  const maxRevenue = Math.max(...visibleData.map((d) => d.revenue), 1);
  const barWidth = 6;
  const gap = 4;
  const startX = CHART_PADDING + 8;

  return (
    <View style={styles.chartCard}>
      <Text style={styles.cardTitle}>Daily Revenue Breakdown</Text>
      <Svg width="100%" height={CHART_H + 34} viewBox={`0 0 ${CHART_W} ${CHART_H + 34}`}>
        {[0, 1, 2, 3, 4].map((tick) => {
          const y = CHART_H - CHART_PADDING - (tick / 4) * (CHART_H - CHART_PADDING * 2);
          return (
            <Line
              key={`dr-grid-${tick}`}
              x1={CHART_PADDING}
              y1={y}
              x2={CHART_W - CHART_PADDING}
              y2={y}
              stroke="#D1D5DB"
              strokeDasharray="3,4"
              strokeWidth={1}
            />
          );
        })}
        <Line
          x1={CHART_PADDING}
          y1={CHART_PADDING}
          x2={CHART_PADDING}
          y2={CHART_H - CHART_PADDING}
          stroke="#9CA3AF"
          strokeWidth={1}
        />
        <Line
          x1={CHART_PADDING}
          y1={CHART_H - CHART_PADDING}
          x2={CHART_W - CHART_PADDING}
          y2={CHART_H - CHART_PADDING}
          stroke="#9CA3AF"
          strokeWidth={1}
        />
        {visibleData.map((point, idx) => {
          const rentalsH = (point.rentals / maxRentals) * (CHART_H - CHART_PADDING * 2);
          const x = startX + idx * (barWidth + gap);
          const y = CHART_H - CHART_PADDING - rentalsH;
          return (
            <Rect
              key={`dr-bar-${idx}`}
              x={x}
              y={y}
              width={barWidth}
              height={Math.max(rentalsH, 1.5)}
              fill="#3B82F6"
              rx={2}
            />
          );
        })}
        <Polyline
          points={visibleData
            .map((point, idx) => {
              const x = startX + idx * (barWidth + gap) + barWidth / 2;
              const y =
                CHART_H -
                CHART_PADDING -
                (point.revenue / maxRevenue) * (CHART_H - CHART_PADDING * 2);
              return `${x},${y}`;
            })
            .join(" ")}
          fill="none"
          stroke="#10B981"
          strokeWidth={2}
        />
        {[0, 7, 14, 21, 28].map((idx) => {
          if (!visibleData[idx]) return null;
          const x = startX + idx * (barWidth + gap) - 8;
          return (
            <SvgText
              key={`dr-x-${idx}`}
              x={x}
              y={CHART_H + 12}
              fill="#6B7280"
              fontSize={CHART_AXIS_FONT_SIZE}
            >
              {visibleData[idx].date}
            </SvgText>
          );
        })}
        {[0, 1, 2, 3, 4].map((tick) => {
          const y = CHART_H - CHART_PADDING - (tick / 4) * (CHART_H - CHART_PADDING * 2);
          return (
            <SvgText
              key={`dr-y-${tick}`}
              x={6}
              y={y + 3}
              fill="#6B7280"
              fontSize={CHART_AXIS_FONT_SIZE}
            >
              {tick}
            </SvgText>
          );
        })}
      </Svg>
      <View style={styles.categoryLegendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: "#3B82F6" }]} />
          <Text style={styles.chartLegend}># Rentals</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: "#10B981" }]} />
          <Text style={styles.chartLegend}>Revenue ($)</Text>
        </View>
      </View>
    </View>
  );
};

export const AdminDashboardScreen = () => {
  const [activeTab, setActiveTab] = useState<AdminTabKey>("overview");
  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const loadDashboard = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const data = await getAdminDashboardData();
      setDashboardData(data);
      setLastUpdated(new Date());
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const metrics = useMemo(() => dashboardData?.metrics || [], [dashboardData]);

  const renderTabContent = () => {
    if (!dashboardData) {
      return (
        <View style={styles.placeholderState}>
          <Text style={styles.placeholderText}>Loading dashboard...</Text>
        </View>
      );
    }

    if (activeTab === "overview") {
      return (
        <>
          <View style={styles.metricsGrid}>
            {metrics.map((metric) => (
              <MetricCard key={metric.id} metric={metric} />
            ))}
          </View>
          <RevenueTrendChart data={dashboardData.revenueTrend} />
          <CategoryChart data={dashboardData.categoryPerformance} />
          <ActivityFeed items={dashboardData.recentActivity} />
        </>
      );
    }

    if (activeTab === "users") {
      const totalUsers = Number(metrics.find((m) => m.id === "users")?.value || 0);
      const verifiedPct =
        totalUsers > 0 ? (dashboardData.verifiedUsers / totalUsers) * 100 : 0;

      return (
        <>
          <View style={styles.metricsGrid}>
            <UsersMetricCard
              title="Total Users"
              value={metrics.find((m) => m.id === "users")?.value || "0"}
              subtitle={`${dashboardData.usersJoinedThisWeek} joined this week`}
              color="#2563EB"
            />
            <UsersMetricCard
              title="Verified Users"
              value={String(dashboardData.verifiedUsers)}
              subtitle={`${verifiedPct.toFixed(1)}% verified`}
              color="#16A34A"
            />
            <UsersMetricCard
              title="New This Month"
              value={String(dashboardData.usersJoinedThisMonth)}
              subtitle="User growth"
              change={`${dashboardData.userGrowthPct.toFixed(0)}% vs last month`}
              color="#9333EA"
            />
          </View>
          <View style={styles.userManagementCard}>
            <Text style={styles.cardTitle}>User Management</Text>
            <View style={styles.userActionRow}>
              <TouchableOpacity style={styles.userActionBtn}>
                <MaterialCommunityIcons name="alert-outline" size={iconSize.md} color="#111827" />
                <Text style={styles.userActionText}>
                  User Reports ({dashboardData.userReportsCount})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.userActionBtn}>
                <MaterialCommunityIcons
                  name="shield-alert-outline"
                  size={iconSize.md}
                  color="#111827"
                />
                <Text style={styles.userActionText}>
                  Fraud Reports ({dashboardData.fraudReportsCount})
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      );
    }

    if (activeTab === "revenue") {
      return (
        <>
          <View style={styles.metricsGrid}>
            <UsersMetricCard
              title="Total Revenue"
              value={`$${dashboardData.totalRevenueAllTime.toFixed(2)}`}
              subtitle="All time"
              color="#16A34A"
            />
            <UsersMetricCard
              title="This Month"
              value={`$${dashboardData.revenueThisMonth.toFixed(2)}`}
              subtitle="Platform fees"
              change="0% vs last month"
              color="#10B981"
              iconName="trending-up"
            />
            <UsersMetricCard
              title="This Week"
              value={`$${dashboardData.revenueThisWeek.toFixed(2)}`}
              subtitle="Last 7 days"
              color="#2563EB"
            />
            <UsersMetricCard
              title="Pending Payouts"
              value={`$${dashboardData.pendingPayouts.toFixed(2)}`}
              subtitle={`$${dashboardData.paidOutAmount.toFixed(2)} paid`}
              color="#D97706"
            />
          </View>
          <RevenueByCategoryCard data={dashboardData.revenueByCategory} />
          <DailyRevenueBreakdownChart data={dashboardData.dailyRevenueBreakdown} />
        </>
      );
    }

    if (activeTab === "moderation") {
      return (
        <View style={styles.singlePaneCard}>
          <Text style={styles.cardTitle}>Moderation Queue</Text>
          <Text style={styles.tabBigValue}>{dashboardData.pendingModerationCount}</Text>
          <Text style={styles.metricSubtext}>Pending reports for review</Text>
          <View style={styles.divider} />
          <Text style={styles.inlineActivity}>• Disputes: 0</Text>
          <Text style={styles.inlineActivity}>• Reported listings: 0</Text>
          <Text style={styles.inlineActivity}>• Flagged users: 0</Text>
        </View>
      );
    }

    return (
      <View style={styles.singlePaneCard}>
        <Text style={styles.cardTitle}>Platform Health</Text>
        {dashboardData.healthChecks.map((item) => (
          <View key={item.label} style={styles.healthRow}>
            <Text style={styles.healthLabel}>{item.label}</Text>
            <Text
              style={[
                styles.healthValue,
                item.tone === "good" && styles.healthGood,
                item.tone === "warn" && styles.healthWarn,
              ]}
            >
              {item.value}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <GlobalHeader />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={loadDashboard} />}
      >
        <View style={styles.headerBlock}>
          <View style={styles.titleRow}>
            <MaterialCommunityIcons name="pulse" size={iconSize.hero} color="#2563EB" />
            <Text style={styles.pageTitle}>Admin Dashboard</Text>
          </View>
          <Text style={styles.subtitle}>Complete platform overview and management</Text>
          <Text style={styles.updatedAt}>Last updated: {formatLastUpdated(lastUpdated)}</Text>
          <TouchableOpacity style={styles.refreshBtn} onPress={loadDashboard}>
            <MaterialCommunityIcons
              name={isRefreshing ? "loading" : "refresh"}
              size={iconSize.md}
              color="#111827"
            />
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContainer}
        >
          {TABS.map((tab) => {
            const active = tab.key === activeTab;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tabPill, active && styles.tabPillActive]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.contentWrap}>
          <View style={styles.sectionHeaderRow}>
            <MaterialCommunityIcons
              name="lightning-bolt-outline"
              size={iconSize.lg}
              color="#D97706"
            />
            <Text style={styles.sectionTitle}>Key Metrics</Text>
          </View>
          {renderTabContent()}
        </View>

        <Footer />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  headerBlock: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  pageTitle: {
    fontSize: typography.pageTitle,
    fontWeight: "800",
    color: "#0F172A",
  },
  subtitle: {
    marginTop: 6,
    fontSize: typography.label,
    color: "#475569",
  },
  updatedAt: {
    marginTop: 18,
    fontSize: typography.body,
    color: "#64748B",
  },
  refreshBtn: {
    marginTop: 14,
    height: 48,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  refreshText: {
    fontSize: typography.tabLabel,
    fontWeight: "700",
    color: "#111827",
  },
  tabsContainer: {
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 6,
    gap: 8,
  },
  tabPill: {
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#F1F5F9",
  },
  tabPillActive: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  tabText: {
    fontSize: typography.tabLabel,
    color: "#475569",
    fontWeight: "600",
  },
  tabTextActive: {
    color: "#0F172A",
  },
  contentWrap: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 22,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: typography.sectionTitle,
    fontWeight: "800",
    color: "#0F172A",
  },
  metricsGrid: {
    marginTop: 14,
    gap: 12,
  },
  metricCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 18,
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  metricTitle: {
    fontSize: typography.label,
    color: "#475569",
  },
  metricValue: {
    marginTop: 6,
    fontSize: typography.valueXL,
    fontWeight: "800",
    color: "#0F172A",
  },
  usersMetricValue: {
    marginTop: 6,
    fontSize: typography.valueL,
    fontWeight: "800",
    color: "#0F172A",
  },
  metricSubtext: {
    marginTop: 8,
    fontSize: typography.body,
    color: "#64748B",
  },
  metricChange: {
    marginTop: 5,
    fontSize: typography.caption,
    fontWeight: "700",
    color: "#334155",
  },
  metricPill: {
    width: 48,
    height: 48,
    borderRadius: 14,
    marginTop: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  chartCard: {
    marginTop: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 18,
    padding: 16,
  },
  cardTitle: {
    fontSize: typography.cardTitle,
    fontWeight: "800",
    color: "#0F172A",
  },
  chartTitle: {
    fontSize: typography.cardTitle,
    fontWeight: "800",
    color: "#0F172A",
  },
  chartLegend: {
    textAlign: "center",
    color: "#10B981",
    fontSize: typography.body,
    marginTop: -4,
    marginBottom: 4,
  },
  emptyChartText: {
    marginTop: 12,
    textAlign: "center",
    fontSize: typography.body,
    color: "#64748B",
  },
  categoryLegendRow: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendSwatch: {
    width: 14,
    height: 10,
  },
  activityCard: {
    marginTop: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 18,
    padding: 16,
  },
  activityItem: {
    marginTop: 12,
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    gap: 10,
  },
  activityIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  activityTextWrap: {
    flex: 1,
  },
  activityMessage: {
    fontSize: typography.tabLabel,
    color: "#0F172A",
    fontWeight: "600",
  },
  activityTime: {
    marginTop: 4,
    fontSize: typography.caption,
    color: "#64748B",
  },
  revenueCategoryRow: {
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  revenueCategoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  revenueCategoryText: {
    flex: 1,
  },
  revenueCategoryTitle: {
    fontSize: typography.tabLabel,
    color: "#0F172A",
    fontWeight: "700",
  },
  revenueCategoryMeta: {
    marginTop: 2,
    fontSize: typography.body,
    color: "#64748B",
  },
  revenueCategoryAmount: {
    alignItems: "flex-end",
  },
  revenueCategoryValue: {
    fontSize: typography.title,
    color: "#16A34A",
    fontWeight: "800",
  },
  revenueCategoryLabel: {
    fontSize: typography.caption,
    color: "#64748B",
  },
  singlePaneCard: {
    marginTop: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 18,
    padding: 18,
    gap: 8,
  },
  userManagementCard: {
    marginTop: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 18,
    padding: 18,
  },
  userActionRow: {
    marginTop: 14,
    flexDirection: "row",
    gap: 10,
  },
  userActionBtn: {
    flex: 1,
    height: 36,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    backgroundColor: "#FFFFFF",
  },
  userActionText: {
    color: "#111827",
    fontSize: typography.body,
    fontWeight: "600",
  },
  tabBigValue: {
    fontSize: typography.valueL,
    fontWeight: "800",
    color: "#0F172A",
  },
  divider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 8,
  },
  inlineActivity: {
    fontSize: typography.body,
    color: "#334155",
    marginBottom: 6,
  },
  healthRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  healthLabel: {
    fontSize: typography.body,
    color: "#334155",
  },
  healthValue: {
    fontSize: typography.bodyStrong,
    fontWeight: "700",
    color: "#334155",
  },
  healthGood: {
    color: "#16A34A",
  },
  healthWarn: {
    color: "#D97706",
  },
  placeholderState: {
    marginTop: 20,
    paddingVertical: 24,
    alignItems: "center",
  },
  placeholderText: {
    color: "#64748B",
    fontSize: typography.cardTitle,
  },
});
