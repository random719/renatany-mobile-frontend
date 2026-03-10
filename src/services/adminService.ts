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
  const openDisputesCount = 0;
  const pendingRequestsCount = 0;
  const totalItems = mockListings.length;
  const activeItems = mockListings.length; // Assuming all mock listings are active for now
  const totalRentals = 0;
  const completedRentals = 0;

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
    openDisputesCount,
    pendingRequestsCount,
    totalItems,
    activeItems,
    totalRentals,
    completedRentals,
    healthChecks: [
      { label: "API Uptime", value: "99.98%", tone: "good" },
      { label: "Response Time (p95)", value: "184ms", tone: "good" },
      { label: "Failed Jobs", value: "0", tone: "neutral" },
      { label: "Open Incidents", value: "0", tone: "good" },
    ],
    systemStatus: "Critical",
    uptime: 99.9,
    rateLimitIssues: 0,
    apiErrors: 0,
    pageLoadTimes: [
      { page: "Admin Dashboard", loadTime: 1.35 },
      { page: "My Conversations", loadTime: 10.04 },
      { page: "Home Page", loadTime: null },
      { page: "Profile Page", loadTime: 2.35 },
      { page: "Item Details", loadTime: 1.69 },
    ],
    slowPages: [
      { page: "My Conversations", time: 10.04 },
    ],
    slowPageRecommendations: [
      "Load data progressively instead of all at once",
      "Add delays between API calls (500-1000ms)",
      "Implement caching for frequently accessed data",
      "Use pagination for large datasets",
    ],
    performanceScore: 45,
    alreadyOptimized: [
      {
        title: "Infinite Scroll",
        description: "Home page loads 20 items at a time instead of 100+",
      },
      {
        title: "Smart Conversations",
        description: "Only loads active chats (90% less data)",
      },
      {
        title: "Image Compression",
        description: "Automatically resizes photos before upload",
      },
      {
        title: "Lazy Background Loading",
        description: "Non-critical data loads after page appears",
      },
      {
        title: "Rate Limit Protection",
        description: "2-3 second delays between API calls",
      },
    ],
    recommendedImprovements: [
      {
        id: "caching",
        title: "Enable Caching",
        impactLabel: "High Impact",
        impactColor: "#2563EB",
        speedIncrease: "+25% faster",
        description: "Cache frequently accessed data like user profiles and item details. Instead of fetching the same data repeatedly, store it temporarily.",
        type: "code",
        codeSnippet: {
          beforeDesc: "// Before: Fetches every time",
          beforeCode: "const user = await User.me();",
          afterDesc: "// After: Cache for 5 minutes",
          afterCode: "const user = getCached('user', User.me, 300);",
        },
        actionButtonText: "Implement Caching Now",
        actionButtonColor: "#2563EB",
      },
      {
        id: "pagination",
        title: "Pagination for Admin Dashboard",
        impactLabel: "Medium Impact",
        impactColor: "#9333EA",
        speedIncrease: "+40% faster",
        description: "Admin dashboard loads ALL rentals, reviews, and disputes. Add pagination to load 50 at a time.",
        type: "comparison",
        comparisonBox: {
          currentLabel: "Current:",
          currentDesc: "Loads 0 rentals simultaneously",
          recommendedLabel: "Recommended:",
          recommendedDesc: "Load 50 per page with \"Load More\" button",
        },
        actionButtonText: "Enable Pagination Now",
        actionButtonColor: "#9333EA",
      },
      {
        id: "images",
        title: "Optimize Image Thumbnails",
        impactLabel: "Quick Win",
        impactColor: "#16A34A",
        speedIncrease: "+15% faster",
        description: "Item cards show full-size images. Create smaller thumbnails for listing pages.",
        type: "comparison",
        comparisonBox: {
          currentLabel: "Current",
          currentDesc: "2MB per image\n1920x1080 pixels",
          recommendedLabel: "Optimized",
          recommendedDesc: "100KB per thumbnail\n400x300 pixels",
        },
        actionButtonText: "Optimize Images Now",
        actionButtonColor: "#16A34A",
      },
      {
        id: "debounce",
        title: "Debounce Search Input",
        impactLabel: "Best Practice",
        impactColor: "#4F46E5",
        speedIncrease: "Reduces API calls by 80%",
        description: "Wait 500ms after user stops typing before calling the search API.",
        type: "text",
        actionButtonText: "Enable Debouncing Now",
        actionButtonColor: "#4F46E5",
      },
    ],
    goldenRules: [
      {
        type: "do",
        title: "DO: Load Essential Data First",
        description: "Show the page with basic info, then load extras in background",
      },
      {
        type: "do",
        title: "DO: Add 1-2 Second Delays Between API Calls",
        description: "Prevents rate limiting and database overload",
      },
      {
        type: "do",
        title: "DO: Use Pagination/Infinite Scroll",
        description: "Never load 100+ items at once. Load 20-50 at a time.",
      },
      {
        type: "do",
        title: "DO: Compress Images Before Upload",
        description: "Resize to 1920x1920 max, 85% quality. Saves bandwidth & storage.",
      },
      {
        type: "dont",
        title: "DON'T: Make Multiple API Calls Simultaneously",
        description: "Causes rate limiting. Use delays or fetch only what you need.",
      },
      {
        type: "dont",
        title: "DON'T: Auto-Refresh Every Few Seconds",
        description: "Use 2-5 minute intervals or manual refresh buttons instead.",
      },
      {
        type: "dont",
        title: "DON'T: Load Data Users Don't See",
        description: "If it's not visible on screen, don't load it yet.",
      },
    ],
    monitoringSteps: [
      {
        id: 1,
        title: "Check Load Times",
        description: "This dashboard shows if pages load slowly (red flag if > 5 seconds)",
      },
      {
        id: 2,
        title: "Watch Browser Console",
        description: "Open DevTools (F12) to see API calls and timing",
      },
      {
        id: 3,
        title: "Monitor Rate Limits",
        description: "This dashboard alerts you if you're hitting limits",
      },
      {
        id: 4,
        title: "Test on Slow Networks",
        description: 'Chrome DevTools → Network → Throttle to "Fast 3G"',
      },
      {
        id: 5,
        title: "Regular Audits",
        description: "Check this dashboard weekly to catch issues early",
      },
    ],
    quickReference: {
      pageLoadTimes: [
        "< 2s = Excellent 🎉",
        "2-5s = Good ✅",
        "5-10s = Slow ⚠️",
        "> 10s = Critical 🔴",
      ],
      imageSizes: [
        "Thumbnails: < 100KB",
        "Full images: < 500KB",
        "Max resolution: 1920x1920",
        "Format: JPEG/WebP",
      ],
      apiBestPractices: [
        "Delay between calls: 1-2s",
        "Max items per page: 20-50",
        "Cache duration: 2-5 min",
        "Auto-refresh: 2+ minutes",
      ],
      dataLoading: [
        "Critical data: < 1s",
        "Secondary data: < 3s",
        "Background data: < 10s",
        "Show UI ASAP",
      ],
    },
    commonIssues: [
      {
        id: "rate-limiting",
        title: "Rate Limiting on Conversations Page",
        description: 'The "My Conversations" page tries to load Messages, Reviews, Condition Reports, and Extensions all at once, causing rate limit errors.',
        icon: "alert-outline",
        iconColor: "#DC2626",
        iconBg: "#FEF2F2",
        solutions: [
          "Load essential data first (messages only)",
          "Load additional data in background with delays",
          "Use 2-minute auto-refresh instead of constant polling",
          "Pause auto-refresh when user is actively typing/using forms",
        ],
      },
      {
        id: "large-files",
        title: "Large File Upload Timeouts",
        description: "Uploading images larger than 3MB causes database timeout errors.",
        icon: "clock-outline",
        iconColor: "#D97706",
        iconBg: "#FFFBEB",
        solutions: [
          "Automatically compress images before upload",
          "Resize to max 1920x1920px",
          "Reduce quality to 85% (still looks great!)",
          "Show compression progress to users",
        ],
      },
      {
        id: "home-page",
        title: "Home Page Loading All Items",
        description: "Loading all items at once (100+) slows down the homepage significantly.",
        icon: "cube-outline",
        iconColor: "#9333EA",
        iconBg: "#FAF5FF",
        solutions: [
          "Implement infinite scroll (load 20 items at a time)",
          "Optimize images with smaller thumbnails",
          "Load more as user scrolls down",
          "Much faster initial page load!",
        ],
      },
    ],
    bestPractices: {
      do: [
        "Load critical data first",
        "Add delays between API calls (500ms+)",
        "Compress images before upload",
        "Use pagination/infinite scroll",
        "Show loading states to users",
        "Handle errors gracefully",
      ],
      dont: [
        "Load all data at once",
        "Make multiple API calls simultaneously",
        "Upload large files without compression",
        "Poll data every few seconds",
        "Load data users don't need",
        "Ignore rate limit warnings",
      ],
    },
  };
};
