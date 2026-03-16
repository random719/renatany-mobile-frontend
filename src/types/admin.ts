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

export interface PageLoadTime {
  page: string;
  loadTime: number | null; // null for 'Not measured'
}

export interface RecommendationList {
  text: string;
}

export interface RecommendedImprovement {
  id: string;
  title: string;
  impactLabel: string;
  impactColor: string;
  speedIncrease: string;
  description: string;
  type: 'code' | 'comparison' | 'text';
  codeSnippet?: {
    beforeDesc: string;
    beforeCode: string;
    afterDesc: string;
    afterCode: string;
  };
  comparisonBox?: {
    currentLabel: string;
    currentDesc: string;
    recommendedLabel: string;
    recommendedDesc: string;
  };
  actionButtonText: string;
  actionButtonColor?: string;
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
  revenueGrowth: number;
  userReportsCount: number;
  fraudReportsCount: number;
  listingReportsCount: number;
  pendingModerationCount: number;
  openDisputesCount: number;
  pendingRequestsCount: number;
  totalItems: number;
  activeItems: number;
  totalRentals: number;
  completedRentals: number;
  healthChecks: HealthItem[];
  systemStatus: "Critical" | "Healthy" | "Warning";
  uptime: number;
  rateLimitIssues: number;
  apiErrors: number;
  pageLoadTimes: PageLoadTime[];
  slowPages: { page: string; time: number }[];
  slowPageRecommendations: string[];
  performanceScore: number;
  alreadyOptimized: { title: string; description: string }[];
  recommendedImprovements: RecommendedImprovement[];
  goldenRules: { type: "do" | "dont"; title: string; description: string }[];
  monitoringSteps: { id: number; title: string; description: string }[];
  quickReference: {
    pageLoadTimes: string[];
    imageSizes: string[];
    apiBestPractices: string[];
    dataLoading: string[];
  };
  commonIssues: {
    id: string;
    title: string;
    description: string;
    icon: string;
    iconColor: string;
    iconBg: string;
    solutions: string[];
  }[];
  bestPractices: {
    do: string[];
    dont: string[];
  };
}
