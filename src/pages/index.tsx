import Head from "next/head";
import AdminLayout from "@/layout/AdminLayout";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { apiGet, apiPost } from "@/utils/api";
import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

// ── Interfaces ────────────────────────────────────────────────────────────────

interface BannerCounts {
  kyc_pending?: number;
  disputes_open?: number;
  product_approvals_pending?: number;
  subscriptions_expiring_this_month?: number;
}

interface BannerData {
  text?: string;
  counts?: BannerCounts;
}

interface DashboardTotals {
  user_requests?: number;
  active_users?: number;
  approved_products?: number;
  orders?: number;
  subscriptions_amount?: number;
  social_media_requests?: number;
}

interface GraphPoint {
  month: number;
  label: string;
  count: number;
}

interface RecentOrder {
  id: number;
  buyer_name: string;
  seller_name: string;
  product_name: string;
  quantity: number;
  total_amount: string;
  currency: string;
  payment_status: string;
  status: string;
  created_at: string;
}

interface RecentUser {
  id: number;
  full_name: string;
  business_name: string | null;
  primary_phone: string;
  email: string | null;
  verification_date: string;
}

interface TodayActionItems {
  kyc_pending?: number;
  product_approvals_pending?: number;
  open_tickets?: number;
  expiring_subscriptions?: number;
  social_media_requests_pending?: number;
}

interface ExpiringSubscription {
  id?: number;
  user_name?: string;
  customer_name?: string;
  plan_name?: string;
  subscription_plan_name?: string;
  expiry_date?: string;
  end_date?: string;
  subscription_expiry_date?: string;
}

interface OpenDispute {
  id?: number;
  ticket_id?: number;
  subject?: string | null;
  title?: string | null;
  user_name?: string | null;
  status?: string | null;
  priority?: string | null;
  created_at?: string | null;
}

interface KycUser {
  id: number;
  primary_phone: string;
  email: string | null;
  profile_completion_percent: number;
  kyc_status: string;
  business_profile: {
    first_name: string | null;
    last_name: string | null;
    business_name: string | null;
    created_at: string;
  } | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const getWaitingTime = (dateStr: string) => {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days} day${days > 1 ? "s" : ""}`;
  return `${hours}h ago`;
};

const formatRevenue = (n: number) => {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n}`;
};

const formatAmount = (amount: string, currency: string) => {
  const num = parseFloat(amount);
  if (currency === "INR") {
    if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`;
    if (num >= 1000) return `₹${(num / 1000).toFixed(1)}K`;
    return `₹${num.toLocaleString("en-IN")}`;
  }
  return `${currency} ${num.toLocaleString()}`;
};

const formatExpiry = (s: string) =>
  new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

const isUrgent = (s: string) => {
  const diff = new Date(s).getTime() - Date.now();
  return diff > 0 && diff < 7 * 86400000;
};

const paymentStatusStyle = (status: string) => {
  if (status === "fully_paid") return "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400";
  if (status === "partial") return "bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400";
  return "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400";
};

const orderStatusStyle = (status: string) => {
  if (status === "delivered") return "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400";
  if (status === "confirmed") return "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400";
  if (status === "cancelled") return "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400";
  return "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400";
};

// ── StatCard ──────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  badge,
  badgeColor,
}: {
  label: string;
  value: string;
  badge?: string;
  badgeColor?: "green" | "orange" | "yellow" | "red" | "purple" | "teal";
}) {
  const badgeColors: Record<string, string> = {
    green: "bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400",
    orange: "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400",
    yellow: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
    red: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
    purple: "bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400",
    teal: "bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400",
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-4 dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="flex items-center justify-between gap-1">
        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{label}</p>
        {badge && (
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
              badgeColors[badgeColor ?? "blue"]
            }`}
          >
            {badge}
          </span>
        )}
      </div>
      <p className="mt-2 text-2xl font-bold text-gray-800 dark:text-white/90">{value}</p>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<BannerData | null>(null);
  const [todayItems, setTodayItems] = useState<TodayActionItems | null>(null);
  const [expiringSubs, setExpiringSubs] = useState<ExpiringSubscription[]>([]);
  const [openDisputes, setOpenDisputes] = useState<OpenDispute[]>([]);
  const [kycUsers, setKycUsers] = useState<KycUser[]>([]);
  const [dashTotals, setDashTotals] = useState<DashboardTotals | null>(null);
  const [ordersGraph, setOrdersGraph] = useState<GraphPoint[]>([]);
  const [usersGraph, setUsersGraph] = useState<GraphPoint[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [dashYear, setDashYear] = useState<number>(new Date().getFullYear());
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedKycUser, setSelectedKycUser] = useState<KycUser | null>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [allowToResubmit, setAllowToResubmit] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      const [bannerRes, todayRes, subsRes, kycRes, dashRes, disputesRes] = await Promise.allSettled([
        apiGet("/users/admin/action-banner/"),
        apiGet("/users/admin/today-action-items/"),
        apiGet("/users/admin/expiring-subscriptions/?days=30"),
        apiGet("/users/admin/unverified-users/"),
        apiGet("/users/admin/dashboard/"),
        apiGet("/users/admin/open-disputes/"),
      ]);

      if (bannerRes.status === "fulfilled") {
        const d = bannerRes.value.data?.data ?? bannerRes.value.data;
        setBanner(d);
      }
      if (todayRes.status === "fulfilled") {
        const d = todayRes.value.data?.data ?? todayRes.value.data;
        setTodayItems(d);
      }
      if (subsRes.status === "fulfilled") {
        const d = subsRes.value.data?.data ?? subsRes.value.data;
        setExpiringSubs(Array.isArray(d) ? d : (d?.results ?? []));
      }
      if (kycRes.status === "fulfilled") {
        const d = kycRes.value.data?.data ?? kycRes.value.data;
        const list: KycUser[] = Array.isArray(d) ? d : (d?.results ?? []);
        setKycUsers(list.filter((u) => u.profile_completion_percent === 100).slice(0, 5));
      }
      if (dashRes.status === "fulfilled") {
        const d = dashRes.value.data?.data ?? dashRes.value.data;
        setDashTotals(d?.totals ?? null);
        setOrdersGraph(d?.orders_graph ?? []);
        setUsersGraph(d?.users_graph ?? []);
        setRecentOrders(d?.recent_orders ?? []);
        setRecentUsers(d?.recent_users_approved ?? []);
        if (d?.year) setDashYear(d.year);
      }
      if (disputesRes.status === "fulfilled") {
        const d = disputesRes.value.data?.data ?? disputesRes.value.data;
        setOpenDisputes(Array.isArray(d) ? d : (d?.results ?? []));
      }

      setLoading(false);
    };

    fetchAll();
  }, []);

  const openApproveModal = (user: KycUser) => {
    setSelectedKycUser(user);
    setShowApproveModal(true);
  };

  const openRejectModal = (user: KycUser) => {
    setSelectedKycUser(user);
    setRejectionReason("");
    setAllowToResubmit(false);
    setShowRejectModal(true);
  };

  const handleApprove = async () => {
    if (!selectedKycUser) return;
    setActionLoading(true);
    try {
      await apiPost(`/users/admin/users/${selectedKycUser.id}/verify-vendor/`);
      setKycUsers((prev) => prev.filter((u) => u.id !== selectedKycUser.id));
      setShowApproveModal(false);
      setSelectedKycUser(null);
    } catch {
      router.push(`/unverified-users/${selectedKycUser.id}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedKycUser) return;
    if (!rejectionReason.trim()) return;
    setActionLoading(true);
    try {
      await apiPost(`/users/admin/users/${selectedKycUser.id}/reject/`, {
        rejection_reason: rejectionReason,
        allow_to_resubmit: allowToResubmit,
      });
      setKycUsers((prev) => prev.filter((u) => u.id !== selectedKycUser.id));
      setShowRejectModal(false);
      setSelectedKycUser(null);
      setRejectionReason("");
    } catch {
      router.push(`/unverified-users/${selectedKycUser.id}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Derived counts
  const c = banner?.counts ?? {};
  const totalUsers = dashTotals?.user_requests ?? 0;
  const activeUsers = dashTotals?.active_users ?? 0;
  const kycPending = c.kyc_pending ?? kycUsers.length;
  const openDisputesCount = c.disputes_open ?? 0;
  const expiringPlans = c.subscriptions_expiring_this_month ?? 0;
  const activeListings = dashTotals?.approved_products ?? 0;
  const subRevenue = dashTotals?.subscriptions_amount ?? 0;
  const openTickets = todayItems?.open_tickets ?? 0;
  const totalOrders = dashTotals?.orders ?? 0;
  const socialMediaReqs = dashTotals?.social_media_requests ?? 0;
  const bannerText = banner?.text ?? "";
  const hasBanner = !!(bannerText || kycPending || openDisputesCount);

  const tdKyc = todayItems?.kyc_pending ?? kycPending;
  const tdProducts = todayItems?.product_approvals_pending ?? c.product_approvals_pending ?? 0;
  const tdTickets = todayItems?.open_tickets ?? 0;
  const tdExpiring = todayItems?.expiring_subscriptions ?? expiringPlans;
  const tdSocial = todayItems?.social_media_requests_pending ?? 0;

  // Chart options
  const ordersChartOptions: ApexOptions = {
    colors: ["#465fff"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "bar",
      height: 230,
      toolbar: { show: false },
      background: "transparent",
    },
    plotOptions: {
      bar: { horizontal: false, columnWidth: "45%", borderRadius: 4, borderRadiusApplication: "end" },
    },
    dataLabels: { enabled: false },
    stroke: { show: true, width: 4, colors: ["transparent"] },
    xaxis: {
      categories: ordersGraph.map((g) => g.label),
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { colors: "#94a3b8", fontSize: "13px" } },
    },
    yaxis: { labels: { style: { colors: "#94a3b8", fontSize: "13px" } } },
    grid: { borderColor: "#f1f5f9", yaxis: { lines: { show: true } } },
    fill: { opacity: 1 },
    tooltip: { y: { formatter: (val) => `${val} orders` } },
  };

  const usersChartOptions: ApexOptions = {
    colors: ["#10b981"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "area",
      height: 230,
      toolbar: { show: false },
      background: "transparent",
    },
    dataLabels: { enabled: false },
    stroke: { curve: "smooth", width: 2 },
    fill: {
      type: "gradient",
      gradient: { shadeIntensity: 1, opacityFrom: 0.3, opacityTo: 0.05 },
    },
    xaxis: {
      categories: usersGraph.map((g) => g.label),
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { colors: "#94a3b8", fontSize: "13px" } },
    },
    yaxis: { labels: { style: { colors: "#94a3b8", fontSize: "13px" } } },
    grid: { borderColor: "#f1f5f9", yaxis: { lines: { show: true } } },
    tooltip: { y: { formatter: (val) => `${val} users` } },
  };

  return (
    <AdminLayout>
      <Head>
        <title>Dashboard — TradeClover Admin</title>
      </Head>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">Dashboard</h1>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-5">

          {/* Action Banner */}
          {hasBanner && (
            <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-5 py-3.5 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-red-500" />
              <span>
                <span className="font-semibold">Action needed right now: </span>
                {bannerText ||
                  [
                    kycPending ? `${kycPending} KYC pending` : null,
                    openDisputesCount ? `${openDisputesCount} disputes open` : null,
                    expiringPlans ? `${expiringPlans} subscriptions expiring this month` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
              </span>
            </div>
          )}

          {/* Stats Row — 10 cards, 5 per row on desktop */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard
              label="Total users"
              value={totalUsers.toLocaleString()}
              badge={activeUsers > 0 ? `${activeUsers} active` : undefined}
              badgeColor="green"
            />
            <StatCard
              label="KYC pending"
              value={String(kycPending)}
              badge="urgent"
              badgeColor="orange"
            />
            <StatCard
              label="Products pending"
              value={String(tdProducts)}
              badge="pending approval"
              badgeColor="yellow"
            />
            <StatCard label="Active listings" value={activeListings.toLocaleString()} />
            <StatCard
              label="Open disputes"
              value={String(openDisputesCount)}
              badge="open"
              badgeColor="red"
            />
            <StatCard
              label="Subscription revenue"
              value={formatRevenue(subRevenue)}
              // badge="month"
              // badgeColor="teal"
            />
            <StatCard label="Open tickets" value={String(openTickets)} />
            <StatCard
              label="Expiring plans"
              value={String(expiringPlans)}
              // badge="this month"
              // badgeColor="purple"
            />
            <StatCard label="Total orders" value={String(totalOrders)} />
            <StatCard
              label="Social media requests"
              value={String(socialMediaReqs)}
             
            />
          </div>

         

          {/* Action Tables Row */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

            {/* Left Column */}
            <div className="space-y-5">

              {/* KYC Pending Table */}
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
                <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-white/[0.05]">
                  <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
                    KYC pending — action needed
                  </h3>
                  <button
                    onClick={() => router.push("/unverified-users")}
                    className="text-sm text-blue-500 hover:text-blue-600"
                  >
                    See all →
                  </button>
                </div>
                {kycUsers.length === 0 ? (
                  <div className="flex h-28 items-center justify-center text-sm text-gray-400">
                    No KYC pending
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[520px] text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-white/[0.05]">
                          <th className="px-5 py-3 text-left text-xs font-medium text-gray-400">User</th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-400">Company</th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-400">Waiting</th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-400">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                        {kycUsers.map((u) => {
                          const name =
                            [u.business_profile?.first_name, u.business_profile?.last_name]
                              .filter(Boolean)
                              .join(" ") || u.primary_phone;
                          const company = u.business_profile?.business_name ?? "—";
                          const waiting = u.business_profile?.created_at
                            ? getWaitingTime(u.business_profile.created_at)
                            : "—";
                          return (
                            <tr key={u.id}>
                              <td className="px-5 py-3 font-medium text-gray-700 dark:text-gray-300">{name}</td>
                              <td className="max-w-[120px] truncate px-3 py-3 text-gray-500">{company}</td>
                              <td className="whitespace-nowrap px-3 py-3 text-gray-500">{waiting}</td>
                              <td className="px-3 py-3">
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => openApproveModal(u)}
                                    className="whitespace-nowrap rounded bg-green-500 px-2.5 py-1 text-xs font-medium text-white hover:bg-green-600"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => openRejectModal(u)}
                                    className="whitespace-nowrap rounded border border-red-300 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400"
                                  >
                                    Reject
                                  </button>
                                  <button
                                    onClick={() => router.push(`/unverified-users/${u.id}`)}
                                    className="whitespace-nowrap rounded border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300"
                                  >
                                    Review
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Subscriptions Expiring Table */}
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
                <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-white/[0.05]">
                  <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
                    Subscriptions expiring this month
                  </h3>
                  <button
                    onClick={() => router.push("/subscriptions")}
                    className="text-sm text-blue-500 hover:text-blue-600"
                  >
                    See all →
                  </button>
                </div>
                {expiringSubs.length === 0 ? (
                  <div className="flex h-28 items-center justify-center text-sm text-gray-400">
                    No subscriptions expiring
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                  <table className="w-full min-w-[480px] text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-white/[0.05]">
                        <th className="px-5 py-3 text-left text-xs font-medium text-gray-400">User</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-400">Plan</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-400">Expires</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-400">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                      {expiringSubs.slice(0, 5).map((sub, i) => {
                        const expiryDate = sub.expiry_date ?? sub.end_date ?? sub.subscription_expiry_date ?? "";
                        const userName = sub.user_name ?? sub.customer_name ?? "—";
                        const planName = sub.plan_name ?? sub.subscription_plan_name ?? "—";
                        return (
                          <tr key={sub.id ?? i}>
                            <td className="px-5 py-3 font-medium text-gray-700 dark:text-gray-300">{userName}</td>
                            <td className="px-3 py-3">
                              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                                {planName}
                              </span>
                            </td>
                            <td className={`px-3 py-3 font-medium ${expiryDate && isUrgent(expiryDate) ? "text-red-500" : "text-gray-500"}`}>
                              {expiryDate ? formatExpiry(expiryDate) : "—"}
                            </td>
                            <td className="px-3 py-3">
                              <button className="rounded border border-blue-400 px-2.5 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:border-blue-500/30 dark:text-blue-400">
                                Push to NeoDove
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  </div>
                )}
              </div>

              {/* Open Disputes Table */}
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
                <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-white/[0.05]">
                  <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
                    Open disputes
                  </h3>
                  <button
                    onClick={() => router.push("/support-tickets")}
                    className="text-sm text-blue-500 hover:text-blue-600"
                  >
                    See all →
                  </button>
                </div>
                {openDisputes.length === 0 ? (
                  <div className="flex h-28 items-center justify-center text-sm text-gray-400">
                    No open disputes
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-white/[0.05]">
                        <th className="px-5 py-3 text-left text-xs font-medium text-gray-400">#</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-400">Subject</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-400">User</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-400">Status</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-400">Opened</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                      {openDisputes.slice(0, 5).map((d, i) => {
                        const ticketId = d.id ?? d.ticket_id ?? i + 1;
                        const subject = d.subject ?? d.title ?? "—";
                        const userName = d.user_name ?? "—";
                        const status = d.status ?? "open";
                        const statusCls =
                          status === "open"
                            ? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
                            : "bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400";
                        return (
                          <tr
                            key={ticketId}
                            onClick={() => router.push(`/support-tickets/${ticketId}`)}
                            className="cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                          >
                            <td className="px-5 py-3 font-semibold text-gray-500">#{ticketId}</td>
                            <td className="max-w-[160px] truncate px-3 py-3 font-medium text-gray-700 dark:text-gray-300">
                              {subject}
                            </td>
                            <td className="px-3 py-3 text-gray-500">{userName}</td>
                            <td className="px-3 py-3">
                              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusCls}`}>
                                {status}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-gray-400">
                              {d.created_at ? formatDate(d.created_at) : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  </div>
                )}
              </div>

            </div>

            {/* Right Column */}
            <div className="space-y-5">

              {/* Today's Action Items */}
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
                <div className="border-b border-gray-100 px-5 py-4 dark:border-white/[0.05]">
                  <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
                    Today&apos;s action items
                  </h3>
                </div>
                <div className="overflow-x-auto">
                <table className="w-full min-w-[320px] text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-white/[0.05]">
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-400">Task</th>
                      <th className="px-3 py-3 text-right text-xs font-medium text-gray-400">Count</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                    {[
                      { label: "KYC reviews pending", count: tdKyc, href: "/unverified-users" },
                      { label: "Products to approve", count: tdProducts, href: "/products" },
                      { label: "Open tickets", count: tdTickets, href: "/support-tickets" },
                      { label: "Plans expiring soon", count: tdExpiring, href: "/subscriptions" },
                      { label: "Social media requests", count: tdSocial, href: "/social-media-requests" },
                    ].map((item) => (
                      <tr
                        key={item.label}
                        onClick={() => router.push(item.href)}
                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                      >
                        <td className="px-5 py-3.5 text-gray-700 dark:text-gray-300">{item.label}</td>
                        <td className="px-3 py-3.5 text-right">
                          <span className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-full bg-gray-100 px-2 text-sm font-semibold text-gray-700 dark:bg-white/10 dark:text-gray-300">
                            {item.count ?? 0}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>

              {/* Recently Approved Users */}
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
                <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-white/[0.05]">
                  <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
                    Recently approved users
                  </h3>
                  <button
                    onClick={() => router.push("/verified-users")}
                    className="text-sm text-blue-500 hover:text-blue-600"
                  >
                    See all →
                  </button>
                </div>
                {recentUsers.length === 0 ? (
                  <div className="flex h-28 items-center justify-center text-sm text-gray-400">
                    No recently approved users
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                    {recentUsers.map((u) => (
                      <div
                        key={u.id}
                        onClick={() => router.push(`/verified-users/${u.id}`)}
                        className="flex cursor-pointer items-center gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                          {(u.full_name?.charAt(0) ?? "?").toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-gray-800 dark:text-white/90">
                            {u.full_name || "—"}
                          </p>
                          <p className="truncate text-sm text-gray-400">
                            {u.business_name ?? u.email ?? u.primary_phone}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-600 dark:bg-green-500/10 dark:text-green-400">
                            Approved
                          </span>
                          <p className="mt-0.5 text-xs text-gray-400">
                            {formatDate(u.verification_date)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>

           {/* Charts Row */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {/* Orders Chart */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
                    Monthly Orders
                  </h3>
                  <p className="mt-0.5 text-sm text-gray-400">{dashYear}</p>
                </div>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                  {totalOrders} total
                </span>
              </div>
              <div className="overflow-x-auto">
                <div className="min-w-[380px]">
                  <ReactApexChart
                    options={ordersChartOptions}
                    series={[{ name: "Orders", data: ordersGraph.map((g) => g.count) }]}
                    type="bar"
                    height={230}
                  />
                </div>
              </div>
            </div>

            {/* Users Chart */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
                    Monthly User Signups
                  </h3>
                  <p className="mt-0.5 text-sm text-gray-400">{dashYear}</p>
                </div>
                <span className="rounded-full bg-green-50 px-3 py-1 text-sm font-medium text-green-600 dark:bg-green-500/10 dark:text-green-400">
                  {activeUsers} active
                </span>
              </div>
              <div className="overflow-x-auto">
                <div className="min-w-[380px]">
                  <ReactApexChart
                    options={usersChartOptions}
                    series={[{ name: "Users", data: usersGraph.map((g) => g.count) }]}
                    type="area"
                    height={230}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Recent Orders — full width */}
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-white/[0.05]">
              <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
                Recent orders
              </h3>
              <button
                onClick={() => router.push("/orders")}
                className="text-sm text-blue-500 hover:text-blue-600"
              >
                See all →
              </button>
            </div>
            {recentOrders.length === 0 ? (
              <div className="flex h-28 items-center justify-center text-sm text-gray-400">
                No recent orders
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-white/[0.05]">
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-400">Order #</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-400">Buyer</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-400">Seller</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-400">Product</th>
                      <th className="px-3 py-3 text-right text-xs font-medium text-gray-400">Qty</th>
                      <th className="px-3 py-3 text-right text-xs font-medium text-gray-400">Amount</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-400">Payment</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-400">Status</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-400">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                    {recentOrders.map((order) => (
                      <tr
                        key={order.id}
                        onClick={() => router.push(`/orders/order-detail?id=${order.id}`)}
                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                      >
                        <td className="px-5 py-3 font-semibold text-gray-700 dark:text-gray-300">
                          #{order.id}
                        </td>
                        <td className="px-3 py-3 text-gray-600 dark:text-gray-400">{order.buyer_name}</td>
                        <td className="px-3 py-3 text-gray-600 dark:text-gray-400">{order.seller_name}</td>
                        <td className="max-w-[140px] truncate px-3 py-3 text-gray-600 dark:text-gray-400">
                          {order.product_name}
                        </td>
                        <td className="px-3 py-3 text-right text-gray-600 dark:text-gray-400">
                          {order.quantity.toLocaleString()}
                        </td>
                        <td className="px-3 py-3 text-right font-medium text-gray-700 dark:text-gray-300">
                          {formatAmount(order.total_amount, order.currency)}
                        </td>
                        <td className="px-3 py-3">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${paymentStatusStyle(order.payment_status)}`}>
                            {order.payment_status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${orderStatusStyle(order.status)}`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-gray-500">{formatDate(order.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* Approve Confirmation Modal */}
      <Modal
        isOpen={showApproveModal}
        onClose={() => setShowApproveModal(false)}
        className="max-w-sm"
      >
        <div className="p-6">
          <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
            Confirm User Approval
          </h3>
          <p className="mb-1 text-sm text-gray-600 dark:text-gray-400">
            Are you sure you want to approve{" "}
            <span className="font-medium text-gray-800 dark:text-white">
              {[selectedKycUser?.business_profile?.first_name, selectedKycUser?.business_profile?.last_name]
                .filter(Boolean)
                .join(" ") || selectedKycUser?.primary_phone}
            </span>
            ?
          </p>
          <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
            The user will be moved to the verified users list.
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setShowApproveModal(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleApprove}
              disabled={actionLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {actionLoading ? "Processing..." : "Confirm Approval"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        className="max-w-md"
      >
        <div className="p-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Reject User
          </h3>
          <div className="mb-6 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Rejection Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                placeholder="Enter the reason for rejection..."
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={allowToResubmit}
                onChange={(e) => setAllowToResubmit(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Allow user to resubmit documents
              </span>
            </label>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setShowRejectModal(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleReject}
              disabled={actionLoading || !rejectionReason.trim()}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-50"
            >
              {actionLoading ? "Processing..." : "Confirm Rejection"}
            </Button>
          </div>
        </div>
      </Modal>

    </AdminLayout>
  );
}
