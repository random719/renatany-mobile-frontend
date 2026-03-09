export type AdminTabKey =
  | "overview"
  | "users"
  | "revenue"
  | "moderation"
  | "health";

export interface AdminMetric {
  id: string;
  label: string;
  value: string;
  subtitle: string;
  changeText: string;
  color: string;
}

export interface RevenuePoint {
  date: string;
  value: number;
}

export interface CategoryPerformanceItem {
  category: string;
  items: number;
  rentals: number;
}

export interface RecentActivityItem {
  id: string;
  icon: string;
  iconColor: string;
  message: string;
  timestamp: string;
}

export interface HealthItem {
  label: string;
  value: string;
  tone: "good" | "warn" | "neutral";
}

export interface RevenueCategoryItem {
  category: string;
  items: number;
  rentals: number;
  revenue: number;
}

export interface DailyRevenuePoint {
  date: string;
  rentals: number;
  revenue: number;
}

export interface AdminDashboardData {
  metrics: AdminMetric[];
  revenueTrend: RevenuePoint[];
  revenueByCategory: RevenueCategoryItem[];
  dailyRevenueBreakdown: DailyRevenuePoint[];
  totalRevenueAllTime: number;
  revenueThisMonth: number;
  revenueThisWeek: number;
  pendingPayouts: number;
  paidOutAmount: number;
  categoryPerformance: CategoryPerformanceItem[];
  recentActivity: RecentActivityItem[];
  usersJoinedThisMonth: number;
  usersJoinedThisWeek: number;
  verifiedUsers: number;
  userGrowthPct: number;
  userReportsCount: number;
  fraudReportsCount: number;
  pendingModerationCount: number;
  healthChecks: HealthItem[];
}
