import { mockListings } from "../data/listings";
import { mockUsers } from "../data/users";
import { AdminDashboardData, DailyRevenuePoint, RevenuePoint } from "../types/admin";

const DAY_MS = 24 * 60 * 60 * 1000;

const formatDateLabel = (date: Date) =>
  date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

const getRevenueSeries = (): RevenuePoint[] => {
  const now = new Date();
  const listingsByDay = new Map<string, number>();

  mockListings.forEach((listing) => {
    const created = new Date(listing.createdAt);
    const key = created.toISOString().slice(0, 10);
    const existing = listingsByDay.get(key) || 0;
    // Derived estimate while backend analytics is being wired.
    listingsByDay.set(key, existing + listing.pricePerDay * 2);
  });

  const points: RevenuePoint[] = [];
  for (let i = 29; i >= 0; i -= 1) {
    const date = new Date(now.getTime() - i * DAY_MS);
    const key = date.toISOString().slice(0, 10);
    points.push({
      date: formatDateLabel(date),
      value: Number((listingsByDay.get(key) || 0).toFixed(2)),
    });
  }
  return points;
};

const getDailyRevenueBreakdown = (): DailyRevenuePoint[] => {
  const now = new Date();
  const byDay = new Map<string, { revenue: number; rentals: number }>();

  mockListings.forEach((listing) => {
    const created = new Date(listing.createdAt);
    const key = created.toISOString().slice(0, 10);
    const existing = byDay.get(key) || { revenue: 0, rentals: 0 };
    byDay.set(key, {
      revenue: existing.revenue + listing.pricePerDay * 2,
      rentals: existing.rentals + 1,
    });
  });

  const points: DailyRevenuePoint[] = [];
  for (let i = 29; i >= 0; i -= 1) {
    const date = new Date(now.getTime() - i * DAY_MS);
    const key = date.toISOString().slice(0, 10);
    const row = byDay.get(key) || { revenue: 0, rentals: 0 };
    points.push({
      date: formatDateLabel(date),
      revenue: Number(row.revenue.toFixed(2)),
      rentals: row.rentals,
    });
  }

  return points;
};

const getCategoryPerformance = () => {
  const counts = new Map<string, number>();
  mockListings.forEach((listing) => {
    counts.set(listing.category, (counts.get(listing.category) || 0) + 1);
  });

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([category, items]) => ({
      category,
      items,
      // Temporary derived rental volume while real analytics is pending.
      rentals: Math.max(1, Math.round(items * 0.4)),
    }));
};

export const getAdminDashboardData = async (): Promise<AdminDashboardData> => {
  await new Promise((resolve) => setTimeout(resolve, 350));

  const revenueTrend = getRevenueSeries();
  const dailyRevenueBreakdown = getDailyRevenueBreakdown();
  const totalRevenue = revenueTrend.reduce((sum, point) => sum + point.value, 0);
  const thisMonthRevenue = dailyRevenueBreakdown
    .slice(-30)
    .reduce((sum, point) => sum + point.revenue, 0);
  const thisWeekRevenue = dailyRevenueBreakdown
    .slice(-7)
    .reduce((sum, point) => sum + point.revenue, 0);
  const pendingPayouts = 0;
  const paidOutAmount = 0;
  const previousWindowRevenue = Math.max(totalRevenue * 0.9, 1);
  const revenueChangePct =
    ((totalRevenue - previousWindowRevenue) / previousWindowRevenue) * 100;

  const avgRating =
    mockListings.reduce((sum, listing) => sum + listing.rating, 0) /
    Math.max(mockListings.length, 1);
  const totalReviews = mockListings.reduce(
    (sum, listing) => sum + listing.totalReviews,
    0,
  );

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  weekStart.setHours(0, 0, 0, 0);
  const usersJoinedThisMonth = mockUsers.filter(
    (user) => new Date(user.memberSince).getTime() >= monthStart.getTime(),
  ).length;
  const usersJoinedThisWeek = mockUsers.filter(
    (user) => new Date(user.memberSince).getTime() >= weekStart.getTime(),
  ).length;
  const verifiedUsers = mockUsers.filter((user) => user.isVerified).length;
  const userGrowthPct = 0;

  const categoryPerformance = getCategoryPerformance();
  const revenueByCategory = categoryPerformance.map((category) => ({
    category: category.category,
    items: category.items,
    rentals: Math.max(0, category.rentals - 1),
    revenue: Number((category.items * 2.5).toFixed(2)),
  }));
  const recentUsers = [...mockUsers]
    .sort(
      (a, b) =>
        new Date(b.memberSince).getTime() - new Date(a.memberSince).getTime(),
    )
    .slice(0, 3);
  const recentListings = [...mockListings]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3);

  const recentActivity = [
    ...recentUsers.map((user, idx) => ({
      id: `u-${idx}-${user.id}`,
      icon: "account-plus-outline",
      iconColor: "#2563EB",
      message: `${user.email} joined the platform`,
      timestamp: new Date(user.memberSince).toISOString(),
    })),
    ...recentListings.map((listing, idx) => ({
      id: `l-${idx}-${listing.id}`,
      icon: "cube-outline",
      iconColor: "#16A34A",
      message: `New item listed: ${listing.title}`,
      timestamp: new Date(listing.createdAt).toISOString(),
    })),
  ]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 8);

  const activeRentals = 0;
  const pendingModerationCount = 0;
  const userReportsCount = 0;
  const fraudReportsCount = 0;

  return {
    metrics: [
      {
        id: "revenue",
        label: "Total Revenue",
        value: `$${totalRevenue.toFixed(2)}`,
        subtitle: `$${(totalRevenue * 0.42).toFixed(2)} this month`,
        changeText: `${Math.abs(revenueChangePct).toFixed(1)}% ${
          revenueChangePct >= 0 ? "up" : "down"
        } vs last month`,
        color: "#16A34A",
      },
      {
        id: "users",
        label: "Total Users",
        value: String(mockUsers.length),
        subtitle: `${usersJoinedThisMonth} new this month`,
        changeText: "0% vs last month",
        color: "#2563EB",
      },
      {
        id: "rentals",
        label: "Active Rentals",
        value: String(activeRentals),
        subtitle: "0 completed",
        changeText: "0% vs last month",
        color: "#9333EA",
      },
      {
        id: "rating",
        label: "Platform Rating",
        value: avgRating.toFixed(1),
        subtitle: `${totalReviews} reviews`,
        changeText: "Stable",
        color: "#D97706",
      },
    ],
    revenueTrend,
    revenueByCategory,
    dailyRevenueBreakdown,
    totalRevenueAllTime: totalRevenue,
    revenueThisMonth: thisMonthRevenue,
    revenueThisWeek: thisWeekRevenue,
    pendingPayouts,
    paidOutAmount,
    categoryPerformance,
    recentActivity,
    usersJoinedThisMonth,
    usersJoinedThisWeek,
    verifiedUsers,
    userGrowthPct,
    userReportsCount,
    fraudReportsCount,
    pendingModerationCount,
    healthChecks: [
      { label: "API Uptime", value: "99.98%", tone: "good" },
      { label: "Response Time (p95)", value: "184ms", tone: "good" },
      { label: "Failed Jobs", value: "0", tone: "neutral" },
      { label: "Open Incidents", value: "0", tone: "good" },
    ],
  };
};
