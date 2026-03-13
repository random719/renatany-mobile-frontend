import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
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
  const navigation = useNavigation<any>();
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
        <>
          <View style={styles.metricsGrid}>
            <UsersMetricCard
              title="Open Disputes"
              value={String(dashboardData.openDisputesCount)}
              subtitle="Requiring attention"
              color="#DC2626"
            />
            <UsersMetricCard
              title="User Reports"
              value={String(dashboardData.userReportsCount)}
              subtitle="Pending review"
              color="#D97706"
            />
            <UsersMetricCard
              title="Fraud Alerts"
              value={String(dashboardData.fraudReportsCount)}
              subtitle="Pending review"
              color="#A855F7"
            />
            <UsersMetricCard
              title="Pending Requests"
              value={String(dashboardData.pendingRequestsCount)}
              subtitle="Awaiting approval"
              color="#2563EB"
            />
          </View>
          <View style={styles.userManagementCard}>
            <View style={styles.sectionHeaderRow}>
              <MaterialCommunityIcons name="alert-outline" size={iconSize.lg} color="#DC2626" />
              <Text style={styles.cardTitle}>Quick Actions</Text>
            </View>
            <View style={styles.quickActionsList}>
              <TouchableOpacity style={styles.quickActionBtn} onPress={() => navigation.navigate('AdminDisputes')}>
                <MaterialCommunityIcons name="alert-outline" size={iconSize.md} color="#DC2626" />
                <Text style={styles.quickActionText}>Review Disputes ({dashboardData.openDisputesCount})</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickActionBtn} onPress={() => navigation.navigate('AdminUserReports')}>
                <MaterialCommunityIcons name="account-group-outline" size={iconSize.md} color="#D97706" />
                <Text style={styles.quickActionText}>Review User Reports ({dashboardData.userReportsCount})</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickActionBtn} onPress={() => navigation.navigate('AdminFraudReports')}>
                <MaterialCommunityIcons name="shield-outline" size={iconSize.md} color="#A855F7" />
                <Text style={styles.quickActionText}>Review Fraud Reports ({dashboardData.fraudReportsCount})</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickActionBtn} onPress={() => navigation.navigate('AdminListingReports')}>
                <MaterialCommunityIcons name="package-variant-closed" size={iconSize.md} color="#0EA5E9" />
                <Text style={styles.quickActionText}>Review Listing Reports ({dashboardData.listingReportsCount || 0})</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickActionBtn} onPress={() => navigation.navigate('AdminModeration')}>
                <MaterialCommunityIcons name="clock-outline" size={iconSize.md} color="#2563EB" />
                <Text style={styles.quickActionText}>Review Pending Requests ({dashboardData.pendingRequestsCount})</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickActionBtn} onPress={() => navigation.navigate('CreateListing')}>
                <MaterialCommunityIcons name="plus-circle-outline" size={iconSize.md} color="#16A34A" />
                <Text style={styles.quickActionText}>Create New Listing</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.userManagementCard}>
            <View style={styles.sectionHeaderRow}>
              <MaterialCommunityIcons name="cube-outline" size={iconSize.lg} color="#2563EB" />
              <Text style={styles.cardTitle}>Platform Statistics</Text>
            </View>
            <View style={styles.statsList}>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Total Items</Text>
                <Text style={styles.statValue}>{dashboardData.totalItems}</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Active Items</Text>
                <Text style={[styles.statValue, { color: "#16A34A" }]}>{dashboardData.activeItems}</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Total Rentals</Text>
                <Text style={styles.statValue}>{dashboardData.totalRentals}</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Completed</Text>
                <Text style={[styles.statValue, { color: "#2563EB" }]}>{dashboardData.completedRentals}</Text>
              </View>
            </View>
          </View>
        </>
      );
    }

    return (
      <>
        {/* System Status: Critical */}
        <View style={[styles.healthCard, styles.healthCardCritical]}>
          <View style={styles.healthStatusHeader}>
            <View style={styles.criticalDot} />
            <Text style={styles.cardTitle}>System Status: Critical</Text>
          </View>
          <View style={styles.metricsGrid}>
             <View style={styles.healthSubCard}>
               <Text style={styles.healthSubTitle}>Uptime</Text>
               <Text style={[styles.healthSubValue, { color: "#16A34A" }]}>{dashboardData.uptime}%</Text>
               <Text style={styles.healthSubText}>Last 30 days</Text>
             </View>
          </View>
          <View style={styles.metricsGrid}>
             <View style={styles.healthSubCard}>
               <Text style={styles.healthSubTitle}>Rate Limit Issues</Text>
               <Text style={styles.healthSubValue}>{dashboardData.rateLimitIssues}</Text>
               <Text style={styles.healthSubText}>Last 24 hours</Text>
             </View>
          </View>
          <View style={styles.metricsGrid}>
             <View style={styles.healthSubCard}>
               <Text style={styles.healthSubTitle}>API Errors</Text>
               <Text style={styles.healthSubValue}>{dashboardData.apiErrors}</Text>
               <Text style={styles.healthSubText}>Recent errors</Text>
             </View>
          </View>

          {/* Page Load Times inside Critical container */}
          <View style={[styles.singlePaneCard, { marginTop: 14 }]}>
             <View style={styles.sectionHeaderRow}>
               <MaterialCommunityIcons name="clock-outline" size={iconSize.lg} color="#2563EB" />
               <Text style={styles.cardTitle}>Page Load Times</Text>
             </View>
             <View style={styles.pageLoadList}>
               {dashboardData.pageLoadTimes.map((item, idx) => (
                 <View key={idx} style={styles.pageLoadRow}>
                   <View style={styles.pageLoadLeft}>
                     <MaterialCommunityIcons 
                       name={
                         item.page === "Admin Dashboard" ? "pulse" : 
                         item.page === "My Conversations" ? "message-text-outline" :
                         item.page === "Home Page" ? "home-outline" :
                         item.page === "Profile Page" ? "account-outline" : "cube-outline"
                       } 
                       size={iconSize.md} 
                       color="#64748B" 
                     />
                     <Text style={styles.pageLoadName}>{item.page}</Text>
                   </View>
                   <View style={styles.pageLoadRight}>
                     {item.loadTime === null ? (
                       <Text style={styles.pageLoadNotMeasured}>Not measured</Text>
                     ) : (
                       <>
                         <Text style={styles.pageLoadTimeVal}>{item.loadTime}s</Text>
                         {item.loadTime < 2 ? (
                           <View style={styles.fastPill}>
                             <MaterialCommunityIcons name="checkbox-marked" size={14} color="#16A34A" />
                             <Text style={styles.fastPillText}>Fast</Text>
                           </View>
                         ) : null}
                       </>
                     )}
                   </View>
                 </View>
               ))}
             </View>
             <View style={styles.infoBox}>
               <Text style={styles.infoBoxText}>
                 <Text style={{ fontWeight: "700", color: "#1E3A8A" }}>Performance Targets:</Text> Fast: {"<2s"} | Acceptable: 2-5s | Needs Optimization: {">5s"}
               </Text>
             </View>
          </View>
        </View>

        {/* Slow Loading Pages */}
        <View style={styles.singlePaneCard}>
          <View style={styles.sectionHeaderRow}>
            <MaterialCommunityIcons name="clock-outline" size={iconSize.lg} color="#D97706" />
            <Text style={styles.cardTitle}>Slow Loading Pages</Text>
          </View>
          {dashboardData.slowPages.map((page, idx) => (
            <View key={idx} style={styles.slowPageCard}>
              <Text style={styles.slowPageName}>{page.page}</Text>
              <View style={styles.slowPageTimePill}>
                <Text style={styles.slowPageTimeText}>{page.time}s</Text>
              </View>
            </View>
          ))}
          <View style={styles.recommendationsBox}>
            <View style={styles.recommendationsHeader}>
              <MaterialCommunityIcons name="lightbulb-on" size={18} color="#D97706" style={{ marginTop: 2 }} />
              <Text style={styles.recommendationsTitle}>Recommendations:</Text>
            </View>
            {dashboardData.slowPageRecommendations.map((rec, idx) => (
              <Text key={idx} style={styles.recommendationItem}>• {rec}</Text>
            ))}
          </View>
        </View>

        {/* Recent API Errors */}
        <View style={styles.singlePaneCard}>
           <View style={styles.sectionHeaderRow}>
             <MaterialCommunityIcons name="alert-outline" size={iconSize.lg} color="#DC2626" />
             <Text style={styles.cardTitle}>Recent API Errors</Text>
           </View>
           <View style={styles.apiErrorsEmpty}>
             <MaterialCommunityIcons name="check-circle-outline" size={48} color="#16A34A" />
             <Text style={styles.apiErrorsTextMain}>No errors detected!</Text>
             <Text style={styles.apiErrorsTextSub}>System running smoothly</Text>
           </View>
        </View>

        {/* Performance Optimization Guide */}
        <View style={styles.singlePaneCard}>
          <View style={styles.sectionHeaderRow}>
             <MaterialCommunityIcons name="lightning-bolt" size={iconSize.lg} color="#D97706" />
             <Text style={styles.cardTitle}>Performance Optimization Guide</Text>
          </View>
          
          <View style={styles.performanceScoreBox}>
            <View style={styles.scoreRow}>
              <Text style={styles.scoreTitle}>Current Performance{"\n"}Score</Text>
              <Text style={styles.scoreValueBig}>
                <Text style={styles.scoreValueCurrent}>{dashboardData.performanceScore}</Text>
                <Text style={styles.scoreValueTotal}> /100</Text>
              </Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${dashboardData.performanceScore}%` }]} />
            </View>
            <Text style={styles.scoreSubtitle}>Based on load times, API efficiency, and user experience metrics</Text>
          </View>

          <View style={styles.alreadyOptimizedBox}>
            <View style={styles.alreadyOptimizedHeader}>
              <MaterialCommunityIcons name="check-circle-outline" size={24} color="#16A34A" />
              <View style={styles.alreadyOptimizedCheckWrap}>
                <MaterialCommunityIcons name="checkbox-marked" size={20} color="#16A34A" />
                <Text style={styles.alreadyOptimizedTitle}>Already Optimized</Text>
              </View>
            </View>
            <Text style={styles.alreadyOptimizedDesc}>Great news! Your app already has these performance features:</Text>
            <View style={styles.alreadyOptimizedList}>
              {dashboardData.alreadyOptimized.map((item, idx) => (
                <Text key={idx} style={styles.alreadyItemText}>
                  <Text style={styles.alreadyItemTitle}>• {item.title}</Text> - {item.description}
                </Text>
              ))}
            </View>
          </View>

          <View style={styles.recommendedGuideBox}>
            <View style={styles.recommendedHeaderRow}>
              <MaterialCommunityIcons name="rocket-launch-outline" size={22} color="#2563EB" />
              <Text style={styles.recommendedGuideTitle}>Recommended{"\n"}Improvements</Text>
            </View>
            <Text style={styles.recommendedGuideDesc}>Implement these to make your app even faster:</Text>
            
            <View style={styles.improvementsList}>
              {dashboardData.recommendedImprovements.map((item) => (
                <View key={item.id} style={styles.improvementCard}>
                  <View style={styles.improvementCardHeader}>
                    <View style={[styles.impactBadge, { backgroundColor: item.impactColor }]}>
                      <Text style={styles.impactBadgeText}>{item.impactLabel.replace(" ", "\n")}</Text>
                    </View>
                    <Text style={styles.improvementTitle}>{item.title}</Text>
                    <Text style={styles.speedIncreaseText}>{item.speedIncrease}</Text>
                  </View>
                  <Text style={styles.improvementDesc}>{item.description}</Text>
                  
                  {item.type === "code" && item.codeSnippet && (
                    <View style={styles.codeSnippetBox}>
                      <Text style={styles.codeComment}>{item.codeSnippet.beforeDesc}</Text>
                      <Text style={styles.codeLine}>{item.codeSnippet.beforeCode}</Text>
                      <Text style={styles.codeComment}>{item.codeSnippet.afterDesc}</Text>
                      <Text style={styles.codeLine}>{item.codeSnippet.afterCode}</Text>
                    </View>
                  )}

                  {item.type === "comparison" && item.comparisonBox && (
                    <View style={styles.comparisonFlexBox}>
                       <View style={styles.comparisonCurrent}>
                         <View style={styles.comparisonHeader}>
                           <MaterialCommunityIcons name="close" size={16} color="#DC2626" />
                           <Text style={styles.comparisonTitleRed}>{item.comparisonBox.currentLabel}</Text>
                         </View>
                         <Text style={styles.comparisonDescRed}>{item.comparisonBox.currentDesc}</Text>
                       </View>
                       <View style={styles.comparisonRecommended}>
                         <View style={styles.comparisonHeader}>
                           <MaterialCommunityIcons name="checkbox-marked" size={16} color="#16A34A" />
                           <Text style={styles.comparisonTitleGreen}>{item.comparisonBox.recommendedLabel}</Text>
                         </View>
                         <Text style={styles.comparisonDescGreen}>{item.comparisonBox.recommendedDesc}</Text>
                       </View>
                    </View>
                  )}

                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: item.actionButtonColor || "#2563EB" }]}>
                    <MaterialCommunityIcons name="lightning-bolt" size={18} color="#FFFFFF" />
                    <Text style={styles.actionBtnText}>{item.actionButtonText}</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Golden Rules for Fast & Reliable Apps */}
        <View style={styles.singlePaneCard}>
          <View style={styles.sectionHeaderRow}>
             <MaterialCommunityIcons name="shield-outline" size={iconSize.lg} color="#0F172A" />
             <Text style={styles.cardTitle}>Golden Rules for Fast &{"\n"}Reliable Apps</Text>
          </View>
          <View style={styles.goldenRulesList}>
            {dashboardData.goldenRules.map((rule, idx) => (
              <View 
                key={idx} 
                style={[
                  styles.goldenRuleCard, 
                  rule.type === "do" ? styles.goldenRuleDo : styles.goldenRuleDont
                ]}
              >
                <View style={styles.goldenRuleIconWrap}>
                  <MaterialCommunityIcons 
                    name={rule.type === "do" ? "checkbox-marked" : "close-circle"} 
                    size={28} 
                    color={rule.type === "do" ? "#16A34A" : "#DC2626"} 
                  />
                </View>
                <View style={styles.goldenRuleTextWrap}>
                  <Text 
                    style={[
                      styles.goldenRuleTitle, 
                      rule.type === "do" ? { color: "#0F172A" } : { color: "#991B1B" }
                    ]}
                  >
                    {rule.title}
                  </Text>
                  <Text 
                    style={[
                      styles.goldenRuleDesc, 
                      rule.type === "do" ? { color: "#64748B" } : { color: "#DC2626" }
                    ]}
                  >
                    {rule.description}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* How to Monitor Performance */}
        <View style={[styles.singlePaneCard, styles.monitorCard]}>
          <View style={styles.sectionHeaderRow}>
             <MaterialCommunityIcons name="pulse" size={iconSize.lg} color="#6B21A8" />
             <Text style={[styles.cardTitle, { color: "#6B21A8" }]}>How to Monitor{"\n"}Performance</Text>
          </View>
          <View style={styles.monitorList}>
            {dashboardData.monitoringSteps.map((step) => (
              <View key={step.id} style={styles.monitorRow}>
                <Text style={styles.monitorStepId}>{step.id}.</Text>
                <Text style={styles.monitorStepText}>
                  <Text style={styles.monitorStepTitle}>{step.title}: </Text>
                  {step.description}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Performance Quick Reference */}
        <View style={[styles.singlePaneCard, styles.quickReferenceCard]}>
          <View style={styles.sectionHeaderRow}>
             <MaterialCommunityIcons name="lightning-bolt" size={iconSize.lg} color="#FBBF24" />
             <Text style={[styles.cardTitle, { color: "#FFFFFF" }]}>Performance Quick{"\n"}Reference</Text>
          </View>
          
          <Text style={styles.quickRefSectionTitle}>Page Load Times:</Text>
          {dashboardData.quickReference.pageLoadTimes.map((item, idx) => (
            <Text key={`plt-${idx}`} style={styles.quickRefText}>{item}</Text>
          ))}

          <Text style={styles.quickRefSectionTitle}>Image Sizes:</Text>
          {dashboardData.quickReference.imageSizes.map((item, idx) => (
            <Text key={`is-${idx}`} style={styles.quickRefText}>{item}</Text>
          ))}

          <Text style={styles.quickRefSectionTitle}>API Best Practices:</Text>
          {dashboardData.quickReference.apiBestPractices.map((item, idx) => (
            <Text key={`abp-${idx}`} style={styles.quickRefText}>{item}</Text>
          ))}

          <Text style={styles.quickRefSectionTitle}>Data Loading:</Text>
          {dashboardData.quickReference.dataLoading.map((item, idx) => (
            <Text key={`dl-${idx}`} style={styles.quickRefText}>{item}</Text>
          ))}
        </View>

        {/* Common Issues & Solutions */}
        <View style={styles.singlePaneCard}>
          <View style={styles.sectionHeaderRow}>
             <MaterialCommunityIcons name="shield-outline" size={iconSize.lg} color="#2563EB" />
             <Text style={styles.cardTitle}>Common Issues & Solutions</Text>
          </View>
          <View style={styles.issuesList}>
            {dashboardData.commonIssues.map((issue) => (
              <View key={issue.id} style={styles.issueCard}>
                <View style={styles.issueHeaderRow}>
                  <View style={[styles.issueIconWrap, { backgroundColor: issue.iconBg }]}>
                    <MaterialCommunityIcons name={issue.icon as any} size={20} color={issue.iconColor} />
                  </View>
                  <Text style={styles.issueTitle}>{issue.title}</Text>
                </View>
                <Text style={styles.issueDesc}>{issue.description}</Text>
                <View style={styles.solutionBox}>
                  <View style={styles.solutionHeader}>
                    <MaterialCommunityIcons name="checkbox-marked" size={16} color="#16A34A" />
                    <Text style={styles.solutionTitle}>Solution:</Text>
                  </View>
                  {issue.solutions.map((sol, idx) => (
                    <Text key={idx} style={styles.solutionText}>• {sol}</Text>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Performance Best Practices */}
        <View style={[styles.singlePaneCard, styles.bestPracticesCard]}>
          <View style={styles.sectionHeaderRow}>
             <MaterialCommunityIcons name="lightning-bolt-outline" size={iconSize.lg} color="#4F46E5" />
             <Text style={styles.cardTitle}>Performance Best Practices</Text>
          </View>
          <View style={[styles.bestPracticesList, { backgroundColor: "#FFFFFF" }]}>
            <View style={styles.bestPracticeHeaderRow}>
              <MaterialCommunityIcons name="check-circle-outline" size={20} color="#16A34A" />
              <Text style={styles.bestPracticeHeader}>DO</Text>
            </View>
            {dashboardData.bestPractices.do.map((practice, idx) => (
              <View key={`do-${idx}`} style={styles.bestPracticeRow}>
                <View style={styles.bestPracticeIconWrap}>
                   <MaterialCommunityIcons name="checkbox-marked" size={20} color="#16A34A" />
                </View>
                <Text style={styles.bestPracticeText}>{practice}</Text>
              </View>
            ))}
          </View>

          <View style={[styles.bestPracticesList, { backgroundColor: "#FFFFFF" }]}>
            <View style={styles.bestPracticeHeaderRow}>
              <MaterialCommunityIcons name="close" size={20} color="#DC2626" />
              <Text style={styles.bestPracticeHeaderDont}>DON'T</Text>
            </View>
            {dashboardData.bestPractices.dont.map((practice, idx) => (
              <View key={`dont-${idx}`} style={styles.bestPracticeRow}>
                <View style={styles.bestPracticeIconWrap}>
                   <MaterialCommunityIcons name="close" size={20} color="#DC2626" />
                </View>
                <Text style={styles.bestPracticeText}>{practice}</Text>
              </View>
            ))}
          </View>
        </View>
      </>
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
  quickActionsList: {
    marginTop: 14,
    gap: 10,
  },
  quickActionBtn: {
    height: 48,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    alignItems: "center",
    paddingHorizontal: 16,
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#FFFFFF",
  },
  quickActionText: {
    color: "#111827",
    fontSize: typography.body,
    fontWeight: "600",
  },
  statsList: {
    marginTop: 18,
    gap: 12,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
  },
  statLabel: {
    fontSize: typography.body,
    color: "#475569",
    fontWeight: "500",
  },
  statValue: {
    fontSize: typography.bodyStrong,
    color: "#0F172A",
    fontWeight: "700",
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
  healthCard: {
    marginTop: 14,
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
    gap: 8,
  },
  healthCardCritical: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  healthStatusHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  criticalDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#EF4444",
  },
  healthSubCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    width: "100%",
    alignItems: "center",
  },
  healthSubTitle: {
    fontSize: typography.body,
    color: "#475569",
    fontWeight: "500",
  },
  healthSubValue: {
    fontSize: typography.valueL,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 4,
  },
  healthSubText: {
    fontSize: typography.caption,
    color: "#64748B",
    marginTop: 4,
  },
  pageLoadList: {
    marginTop: 12,
    gap: 8,
  },
  pageLoadRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  pageLoadLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  pageLoadName: {
    fontSize: typography.body,
    color: "#0F172A",
    fontWeight: "500",
  },
  pageLoadRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pageLoadTimeVal: {
    fontSize: typography.bodyStrong,
    color: "#0F172A",
    fontWeight: "700",
  },
  pageLoadNotMeasured: {
    fontSize: typography.bodyStrong,
    color: "#0F172A",
    fontWeight: "700",
  },
  fastPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  fastPillText: {
    fontSize: typography.caption,
    color: "#16A34A",
    fontWeight: "600",
  },
  infoBox: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  infoBoxText: {
    fontSize: typography.caption,
    color: "#1E3A8A",
    textAlign: "center",
    lineHeight: 18,
  },
  slowPageCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
    borderRadius: 12,
    padding: 16,
    marginTop: 14,
  },
  slowPageName: {
    fontSize: typography.bodyStrong,
    color: "#9A3412",
    fontWeight: "600",
  },
  slowPageTimePill: {
    backgroundColor: "#FFEDD5",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  slowPageTimeText: {
    fontSize: typography.caption,
    color: "#C2410C",
    fontWeight: "700",
  },
  recommendationsBox: {
    marginTop: 14,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 12,
    padding: 16,
  },
  recommendationsHeader: {
    flexDirection: "row",
    gap: 6,
    alignItems: "flex-start",
    marginBottom: 8,
  },
  recommendationsTitle: {
    fontSize: typography.bodyStrong,
    color: "#1E3A8A",
    fontWeight: "700",
  },
  recommendationItem: {
    fontSize: typography.body,
    color: "#1E40AF",
    lineHeight: 22,
    marginTop: 4,
    paddingLeft: 4,
  },
  apiErrorsEmpty: {
    alignItems: "center",
    paddingVertical: 24,
  },
  apiErrorsTextMain: {
    fontSize: typography.cardTitle,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 12,
  },
  apiErrorsTextSub: {
    fontSize: typography.body,
    color: "#64748B",
    marginTop: 4,
  },
  performanceScoreBox: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 12,
    padding: 20,
    marginTop: 14,
  },
  scoreRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  scoreTitle: {
    fontSize: typography.cardTitle,
    fontWeight: "800",
    color: "#0F172A",
    lineHeight: 24,
  },
  scoreValueBig: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  scoreValueCurrent: {
    fontSize: typography.valueXL,
    fontWeight: "800",
    color: "#DC2626",
  },
  scoreValueTotal: {
    fontSize: typography.body,
    color: "#64748B",
    fontWeight: "600",
  },
  progressBarBg: {
    height: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 4,
    marginTop: 16,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#EF4444",
  },
  scoreSubtitle: {
    fontSize: typography.caption,
    color: "#475569",
    marginTop: 12,
    lineHeight: 16,
  },
  alreadyOptimizedBox: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  alreadyOptimizedHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  alreadyOptimizedCheckWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 6,
  },
  alreadyOptimizedTitle: {
    fontSize: typography.bodyStrong,
    fontWeight: "700",
    color: "#166534",
  },
  alreadyOptimizedDesc: {
    fontSize: typography.body,
    color: "#166534",
    marginTop: 12,
    marginBottom: 8,
  },
  alreadyOptimizedList: {
    gap: 8,
    paddingLeft: 4,
  },
  alreadyItemText: {
    fontSize: typography.body,
    color: "#166534",
    lineHeight: 20,
  },
  alreadyItemTitle: {
    fontWeight: "700",
  },
  recommendedGuideBox: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  recommendedHeaderRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  recommendedGuideTitle: {
    fontSize: typography.cardTitle,
    fontWeight: "800",
    color: "#1E3A8A",
  },
  recommendedGuideDesc: {
    fontSize: typography.body,
    color: "#1E40AF",
    marginTop: 8,
    marginBottom: 16,
  },
  improvementsList: {
    gap: 12,
  },
  improvementCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 12,
    padding: 16,
  },
  improvementCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  impactBadge: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    width: 60,
  },
  impactBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 14,
  },
  improvementTitle: {
    flex: 1,
    fontSize: typography.bodyStrong,
    fontWeight: "700",
    color: "#0F172A",
  },
  speedIncreaseText: {
    fontSize: typography.caption,
    color: "#2563EB",
    fontWeight: "500",
  },
  improvementDesc: {
    fontSize: typography.body,
    color: "#475569",
    marginTop: 12,
    lineHeight: 20,
  },
  codeSnippetBox: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  codeComment: {
    fontSize: 12,
    color: "#16A34A",
    fontFamily: "monospace",
    marginTop: 4,
  },
  codeLine: {
    fontSize: 12,
    color: "#334155",
    fontFamily: "monospace",
    marginTop: 4,
    marginBottom: 4,
  },
  comparisonFlexBox: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  comparisonCurrent: {
    flex: 1,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 8,
    padding: 10,
  },
  comparisonRecommended: {
    flex: 1,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 8,
    padding: 10,
  },
  comparisonHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  comparisonTitleRed: {
    fontSize: typography.caption,
    fontWeight: "700",
    color: "#DC2626",
  },
  comparisonDescRed: {
    fontSize: typography.caption,
    color: "#991B1B",
  },
  comparisonTitleGreen: {
    fontSize: typography.caption,
    fontWeight: "700",
    color: "#16A34A",
  },
  comparisonDescGreen: {
    fontSize: typography.caption,
    color: "#166534",
  },
  actionBtn: {
    marginTop: 16,
    height: 44,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  actionBtnText: {
    color: "#FFFFFF",
    fontSize: typography.bodyStrong,
    fontWeight: "600",
  },
  goldenRulesList: {
    marginTop: 14,
    gap: 12,
  },
  goldenRuleCard: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: "flex-start",
  },
  goldenRuleDo: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
  },
  goldenRuleDont: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  goldenRuleIconWrap: {
    marginTop: 2,
  },
  goldenRuleTextWrap: {
    flex: 1,
  },
  goldenRuleTitle: {
    fontSize: typography.bodyStrong,
    fontWeight: "700",
  },
  goldenRuleDesc: {
    fontSize: typography.caption,
    marginTop: 4,
    lineHeight: 18,
  },
  monitorCard: {
    backgroundColor: "#FAF5FF",
    borderColor: "#E9D5FF",
  },
  monitorList: {
    marginTop: 14,
    gap: 12,
  },
  monitorRow: {
    flexDirection: "row",
    gap: 8,
    paddingRight: 10,
  },
  monitorStepId: {
    fontSize: typography.bodyStrong,
    color: "#6B21A8",
    fontWeight: "700",
    width: 20,
  },
  monitorStepText: {
    flex: 1,
    fontSize: typography.body,
    color: "#6B21A8",
    lineHeight: 22,
  },
  monitorStepTitle: {
    fontWeight: "700",
  },
  quickReferenceCard: {
    backgroundColor: "#0F172A",
    borderColor: "#1E293B",
  },
  quickRefSectionTitle: {
    fontSize: typography.bodyStrong,
    color: "#60A5FA",
    fontWeight: "700",
    marginTop: 16,
    marginBottom: 8,
  },
  quickRefText: {
    fontSize: typography.body,
    color: "#CBD5E1",
    lineHeight: 24,
  },
  issuesList: {
    marginTop: 14,
    gap: 16,
  },
  issueCard: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 16,
    backgroundColor: "#FFFFFF",
  },
  issueHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 8,
  },
  issueIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  issueTitle: {
    flex: 1,
    fontSize: typography.bodyStrong,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 4,
  },
  issueDesc: {
    fontSize: typography.body,
    color: "#64748B",
    marginBottom: 12,
    lineHeight: 20,
  },
  solutionBox: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    padding: 12,
  },
  solutionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  solutionTitle: {
    fontSize: typography.bodyStrong,
    fontWeight: "700",
    color: "#1E40AF",
  },
  solutionText: {
    fontSize: typography.body,
    color: "#1E40AF",
    lineHeight: 22,
    paddingLeft: 4,
  },
  bestPracticesCard: {
    backgroundColor: "#EEF2FF",
    borderColor: "#C7D2FE",
  },
  bestPracticesList: {
    marginTop: 14,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 16,
  },
  bestPracticeHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  bestPracticeHeader: {
    fontSize: typography.bodyStrong,
    fontWeight: "700",
    color: "#0F172A",
  },
  bestPracticeHeaderDont: {
    fontSize: typography.bodyStrong,
    fontWeight: "700",
    color: "#0F172A",
  },
  bestPracticeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 10,
  },
  bestPracticeIconWrap: {
    marginTop: 2,
  },
  bestPracticeText: {
    flex: 1,
    fontSize: typography.body,
    color: "#334155",
    lineHeight: 22,
  },
});
