import { AdminDashboardData, DailyRevenuePoint, RevenuePoint } from "../types/admin";
import { api } from "./api";

export interface RentalRequest {
  id: string;
  item_id: string;
  renter_email: string;
  owner_email: string;
  status: string;
  start_date: string;
  end_date: string;
  total_amount: number;
  message?: string;
  created_date: string;
  updated_date?: string;
}

export const getPendingRequests = async (): Promise<RentalRequest[]> => {
  const all = await api.get('/rental-requests').then((r) => r.data?.data || r.data || []);
  return (Array.isArray(all) ? all : []).filter((r: RentalRequest) => r.status === 'pending');
};

export const updateRentalRequestStatus = async (
  id: string,
  status: 'approved' | 'rejected',
  note?: string
): Promise<void> => {
  // Backend uses 'declined' not 'rejected'
  const backendStatus = status === 'rejected' ? 'declined' : status;
  const data: any = { status: backendStatus };
  if (note?.trim()) {
    data.message = `[Admin Note: ${note}]`;
  }
  return api.put(`/rental-requests/${id}`, data).then((r) => r.data?.data || r.data);
};

export interface Dispute {
  id: string;
  rental_request_id: string;
  filed_by_email: string;
  against_email: string;
  reason: string;
  description: string;
  status: 'open' | 'under_review' | 'resolved' | 'closed';
  evidence_urls?: string[];
  resolution?: string;
  decision?: 'favor_renter' | 'favor_owner' | 'split';
  refund_to_renter?: number;
  charge_to_owner?: number;
  admin_notes?: string;
  created_date: string;
  resolved_date?: string;
}

export const getDisputes = async (): Promise<Dispute[]> => {
  return api.get('/disputes').then((r) => r.data?.data || r.data || []);
};

export const updateDispute = async (
  id: string,
  data: {
    status?: string;
    decision?: string;
    resolution?: string;
    admin_notes?: string;
    refund_to_renter?: number;
    charge_to_owner?: number;
    resolved_date?: string;
  }
): Promise<Dispute> => {
  return api.put(`/disputes/${id}`, data).then((r) => r.data?.data || r.data);
};

export interface UserReport {
  id: string;
  reporter_email: string;
  reported_email: string;
  reason: string;
  description: string;
  status: 'pending' | 'under_review' | 'resolved' | 'dismissed';
  evidence_urls?: string[];
  admin_notes?: string;
  action_taken?: 'none' | 'warning_sent' | 'user_suspended' | 'user_banned';
  created_date: string;
  created_at: string;
}

export const getUserReports = async (): Promise<UserReport[]> => {
  return api.get('/reports/user').then((r) => r.data?.data || r.data || []);
};

export const updateUserReport = async (
  id: string,
  data: {
    status?: string;
    admin_notes?: string;
    action_taken?: string;
  }
): Promise<void> => {
  return api.put(`/reports/user/${id}`, data).then((r) => r.data?.data || r.data);
};

export interface FraudReport {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'investigating' | 'resolved';
  details: string;
  reported_user_email?: string;
  reported_item_id?: string;
  reporter_email?: string;
  admin_notes?: string;
  created_date: string;
  created_at: string;
}

export const getFraudReports = async (): Promise<FraudReport[]> => {
  return api.get('/reports/fraud').then((r) => r.data?.data || r.data || []);
};

export const updateFraudReportStatus = async (
  id: string,
  status: 'investigating' | 'resolved',
  admin_note?: string
): Promise<void> => {
  return api.put(`/reports/fraud/${id}`, { status, admin_note }).then((r) => r.data?.data || r.data);
};

export interface ListingReport {
  id: string;
  item_id: string;
  reporter_email: string;
  reason: string;
  description: string;
  evidence_urls?: string[];
  status: 'pending' | 'investigating' | 'resolved' | 'dismissed';
  action_taken?: 'none' | 'warning_sent' | 'listing_removed' | 'user_suspended' | 'user_banned';
  admin_notes?: string;
  created_date: string;
}

export const getListingReports = async (): Promise<ListingReport[]> => {
  return api.get('/reports/listing').then((r) => r.data?.data || r.data || []);
};

export const updateListingReportStatus = async (
  id: string,
  data: {
    status: 'investigating' | 'resolved' | 'dismissed';
    admin_notes?: string;
    action_taken?: string;
  }
): Promise<void> => {
  return api.put(`/reports/listing/${id}`, data).then((r) => r.data?.data || r.data);
};

export interface SecuritySettings {
  kyc_amount_threshold: number;
  kyc_high_risk_categories: string[];
}

export interface SecurityItem {
  id: string;
  title: string;
  category: string;
  daily_rate?: number;
  high_risk_override?: boolean;
}

export const getSecuritySettings = async (): Promise<SecuritySettings> => {
  return api.get('/security/settings').then((r) => r.data?.data || r.data);
};

export const updateSecuritySettings = async (data: SecuritySettings): Promise<SecuritySettings> => {
  return api.put('/security/settings', data).then((r) => r.data?.data || r.data);
};

export const getSecurityItems = async (params?: {
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<SecurityItem[]> => {
  return api.get('/security/items', { params }).then((r) => r.data?.data || r.data || []);
};

export const updateSecurityItemOverride = async (
  id: string,
  high_risk_override: boolean
): Promise<SecurityItem> => {
  return api.put(`/security/items/${id}`, { high_risk_override }).then((r) => r.data?.data || r.data);
};

const DAY_MS = 24 * 60 * 60 * 1000;

const formatDateLabel = (date: Date) =>
  date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

export const getAdminDashboardData = async (): Promise<AdminDashboardData> => {
  // Try dedicated /admin/dashboard endpoint first
  try {
    const res = await api.get('/admin/dashboard');
    const data = res.data.data || res.data;
    if (data && typeof data === 'object' && Array.isArray(data.metrics)) {
      return data as AdminDashboardData;
    }
  } catch {
    // endpoint not yet available, derive from individual endpoints
  }

  // Fetch from real endpoints in parallel
  const [usersRes, itemsRes, statsRes, rentalsRes, disputesRes, userReportsRes, fraudReportsRes, listingReportsRes] =
    await Promise.allSettled([
      api.get('/users'),
      api.get('/items', { params: { limit: 100 } }),
      api.get('/items/stats'),
      api.get('/rental-requests'),
      api.get('/disputes'),
      api.get('/reports/user'),
      api.get('/reports/fraud'),
      api.get('/reports/listing'),
    ]);

  const users: any[] = usersRes.status === 'fulfilled' ? (usersRes.value.data.data || usersRes.value.data || []) : [];
  const items: any[] = itemsRes.status === 'fulfilled' ? (itemsRes.value.data.data || itemsRes.value.data || []) : [];
  const stats: any = statsRes.status === 'fulfilled' ? (statsRes.value.data.data || statsRes.value.data || {}) : {};
  const allRentals: any[] = rentalsRes.status === 'fulfilled' ? (rentalsRes.value.data.data || rentalsRes.value.data || []) : [];
  const disputes: any[] = disputesRes.status === 'fulfilled' ? (disputesRes.value.data.data || disputesRes.value.data || []) : [];
  const userReports: any[] = userReportsRes.status === 'fulfilled' ? (userReportsRes.value.data.data || userReportsRes.value.data || []) : [];
  const fraudReports: any[] = fraudReportsRes.status === 'fulfilled' ? (fraudReportsRes.value.data.data || fraudReportsRes.value.data || []) : [];
  const listingReports: any[] = listingReportsRes.status === 'fulfilled' ? (listingReportsRes.value.data.data || listingReportsRes.value.data || []) : [];

  const totalUsers: number = users.length;
  const verifiedUsers: number = users.filter((u: any) => u.verification_status === 'verified').length;
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * DAY_MS);
  const oneMonthAgo = new Date(now.getTime() - 30 * DAY_MS);
  const usersJoinedThisWeek = users.filter((u: any) => new Date(u.created_at || u.created_date) >= oneWeekAgo).length;
  const usersJoinedThisMonth = users.filter((u: any) => new Date(u.created_at || u.created_date) >= oneMonthAgo).length;

  const totalItems: number = stats.total_available ?? items.length;
  const activeItems: number = items.filter((i: any) => i.status === 'active').length || totalItems;
  const pendingRentals = allRentals.filter((r: any) => r.status === 'pending');
  const completedRentalsList = allRentals.filter((r: any) => r.status === 'completed');
  const openDisputes = disputes.filter((d: any) => ['pending', 'open', 'under_review'].includes(d.status));

  // Revenue calculations from real rental data
  const completedAndPaidRentals = allRentals.filter((r: any) => ['completed', 'paid'].includes(r.status));
  const totalRevenueAllTime = completedAndPaidRentals.reduce((sum: number, r: any) =>
    sum + (typeof r.platform_fee === 'number' ? r.platform_fee : (r.total_amount * 0.15)), 0);
  const revenueThisMonth = completedAndPaidRentals
    .filter((r: any) => new Date(r.created_date || r.created_at) >= oneMonthAgo)
    .reduce((sum: number, r: any) => sum + (typeof r.platform_fee === 'number' ? r.platform_fee : (r.total_amount * 0.15)), 0);
  const revenueThisWeek = completedAndPaidRentals
    .filter((r: any) => new Date(r.created_date || r.created_at) >= oneWeekAgo)
    .reduce((sum: number, r: any) => sum + (typeof r.platform_fee === 'number' ? r.platform_fee : (r.total_amount * 0.15)), 0);
  const twoMonthsAgo = new Date(now.getTime() - 60 * DAY_MS);
  const revenueLastMonth = completedAndPaidRentals
    .filter((r: any) => {
      const d = new Date(r.created_date || r.created_at);
      return d >= twoMonthsAgo && d < oneMonthAgo;
    })
    .reduce((sum: number, r: any) => sum + (typeof r.platform_fee === 'number' ? r.platform_fee : (r.total_amount * 0.15)), 0);
  const revenueGrowth = revenueLastMonth > 0
    ? parseFloat(((revenueThisMonth - revenueLastMonth) / revenueLastMonth * 100).toFixed(1))
    : 0;

  // Category performance from real items + rentals
  const catStats = new Map<string, { items: number; rentals: number; revenue: number }>();
  items.forEach((item: any) => {
    const cat = item.category || 'Other';
    if (!catStats.has(cat)) catStats.set(cat, { items: 0, rentals: 0, revenue: 0 });
    catStats.get(cat)!.items++;
  });
  completedAndPaidRentals.forEach((r: any) => {
    const item = items.find((i: any) => i.id === r.item_id);
    if (item) {
      const cat = item.category || 'Other';
      if (!catStats.has(cat)) catStats.set(cat, { items: 0, rentals: 0, revenue: 0 });
      catStats.get(cat)!.rentals++;
      catStats.get(cat)!.revenue += (typeof r.platform_fee === 'number' ? r.platform_fee : (r.total_amount * 0.15));
    }
  });
  const categoryPerformance = [...catStats.entries()]
    .sort((a, b) => b[1].items - a[1].items)
    .slice(0, 5)
    .map(([category, data]) => ({
      category,
      items: data.items,
      rentals: data.rentals,
    }));
  const revenueByCategory = [...catStats.entries()]
    .sort((a, b) => b[1].items - a[1].items)
    .slice(0, 5)
    .map(([category, data]) => ({
      category,
      items: data.items,
      rentals: data.rentals,
      revenue: Number(data.revenue.toFixed(2)),
    }));

  // Recent activity from real data
  const recentUsers = [...users]
    .sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
    .slice(0, 3);
  const recentItems = [...items]
    .sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
    .slice(0, 5);
  const recentRentals = [...allRentals]
    .sort((a: any, b: any) => new Date(b.created_date || 0).getTime() - new Date(a.created_date || 0).getTime())
    .slice(0, 3);
  const recentActivity = [
    ...recentUsers.map((u: any, idx: number) => ({
      id: `user-${idx}-${u.id || idx}`,
      icon: 'account-plus-outline',
      iconColor: '#6366F1',
      message: `${u.full_name || u.email} joined the platform`,
      timestamp: u.created_at || new Date().toISOString(),
    })),
    ...recentItems.map((item: any, idx: number) => ({
      id: `item-${idx}-${item.id || idx}`,
      icon: 'cube-outline',
      iconColor: '#16A34A',
      message: `New item listed: ${item.title || 'Untitled'}`,
      timestamp: item.created_at || new Date().toISOString(),
    })),
    ...recentRentals.map((r: any, idx: number) => ({
      id: `rental-${idx}-${r.id || idx}`,
      icon: 'calendar-check-outline',
      iconColor: '#2563EB',
      message: `Rental request from ${r.renter_email || 'Unknown'}`,
      timestamp: r.created_date || new Date().toISOString(),
    })),
  ]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 8);

  // Revenue trend from real rental data (last 30 days)
  const revenueTrend: RevenuePoint[] = Array.from({ length: 30 }, (_, i) => {
    const date = new Date(now.getTime() - (29 - i) * DAY_MS);
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayEnd = new Date(dayStart.getTime() + DAY_MS);
    const dayRevenue = completedAndPaidRentals
      .filter((r: any) => {
        const d = new Date(r.created_date || r.created_at);
        return d >= dayStart && d < dayEnd;
      })
      .reduce((sum: number, r: any) => sum + (typeof r.platform_fee === 'number' ? r.platform_fee : (r.total_amount * 0.15)), 0);
    return { date: formatDateLabel(date), value: Number(dayRevenue.toFixed(2)) };
  });
  const dailyRevenueBreakdown: DailyRevenuePoint[] = Array.from({ length: 30 }, (_, i) => {
    const date = new Date(now.getTime() - (29 - i) * DAY_MS);
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayEnd = new Date(dayStart.getTime() + DAY_MS);
    const dayRentals = completedAndPaidRentals.filter((r: any) => {
      const d = new Date(r.created_date || r.created_at);
      return d >= dayStart && d < dayEnd;
    });
    const dayRevenue = dayRentals.reduce((sum: number, r: any) =>
      sum + (typeof r.platform_fee === 'number' ? r.platform_fee : (r.total_amount * 0.15)), 0);
    return { date: formatDateLabel(date), revenue: Number(dayRevenue.toFixed(2)), rentals: dayRentals.length };
  });

  return {
    metrics: [
      {
        id: 'users',
        label: 'Total Users',
        value: String(totalUsers),
        subtitle: `${verifiedUsers} verified`,
        changeText: 'Live data',
        color: '#6366F1',
      },
      {
        id: 'items',
        label: 'Total Items',
        value: String(totalItems),
        subtitle: `${activeItems} active`,
        changeText: 'Live data',
        color: '#16A34A',
      },
      {
        id: 'rentals',
        label: 'Rental Requests',
        value: String(allRentals.length),
        subtitle: `${pendingRentals.length} pending`,
        changeText: 'Live data',
        color: '#2563EB',
      },
      {
        id: 'disputes',
        label: 'Open Disputes',
        value: String(openDisputes.length),
        subtitle: `${disputes.length} total`,
        changeText: 'Live data',
        color: '#9333EA',
      },
      {
        id: 'reports',
        label: 'Reports',
        value: String(userReports.length + fraudReports.length + listingReports.length),
        subtitle: `${listingReports.length} listing, ${userReports.length} user`,
        changeText: 'Live data',
        color: '#D97706',
      },
    ],
    revenueTrend,
    revenueByCategory,
    dailyRevenueBreakdown,
    totalRevenueAllTime,
    revenueThisMonth,
    revenueThisWeek,
    pendingPayouts: 0,
    paidOutAmount: 0,
    categoryPerformance,
    recentActivity,
    usersJoinedThisMonth,
    usersJoinedThisWeek,
    verifiedUsers,
    userGrowthPct: totalUsers > 0 ? Math.round((usersJoinedThisMonth / totalUsers) * 100) : 0,
    revenueGrowth,
    userReportsCount: userReports.length,
    fraudReportsCount: fraudReports.length,
    listingReportsCount: listingReports.length,
    pendingModerationCount: pendingRentals.length,
    openDisputesCount: openDisputes.length,
    pendingRequestsCount: pendingRentals.length,
    totalItems,
    activeItems,
    totalRentals: allRentals.length,
    completedRentals: completedRentalsList.length,
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
