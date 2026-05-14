import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import AdminLayout from "@/layout/AdminLayout";
import Toast from "@/components/ui/toast/Toast";
import { apiGet } from "@/utils/api";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AdminUser {
  id: number;
  email: string | null;
  country_code: string;
  primary_phone: string;
  user_type: string;
  profile_completion_percent: number;
  is_verified_vendor: boolean;
  kyc_status: string;
  is_active: boolean;
  verification_date: string | null;
  rejection_reason: string | null;
  allow_to_resubmit: boolean;
  created_at: string;
  last_login_at: string | null;
  last_active_at: string | null;
  kyc_submitted_at: string | null;
  kyc_submission_time: string | null;
  business_profile: {
    first_name: string | null;
    last_name: string | null;
    business_name: string | null;
    legal_name: string | null;
    subscription_plan_id: number | null;
    subscription_status: string | null;
    subscription_expiry_date: string | null;
  } | null;
  user_kyc: {
    gstin: string | null;
    pan: string | null;
  } | null;
}

interface PaginatedUsers {
  count: number;
  next: string | null;
  previous: string | null;
  results: AdminUser[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const getUserName = (u: AdminUser) => {
  const bp = u.business_profile;
  const name = `${bp?.first_name ?? ""} ${bp?.last_name ?? ""}`.trim();
  return name || u.email || `User #${u.id}`;
};

const getCompanyName = (u: AdminUser) =>
  u.business_profile?.legal_name || u.business_profile?.business_name || null;

const formatDate = (value: string | null | undefined) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const formatRelative = (value: string | null | undefined) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

// ── Tabs ──────────────────────────────────────────────────────────────────────

type TabKey = "all" | "buyers" | "sellers" | "verified" | "unverified";

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "buyers", label: "Buyers" },
  { key: "sellers", label: "Sellers" },
  { key: "verified", label: "Verified" },
  { key: "unverified", label: "Unverified" },
];

// ── Badge components ──────────────────────────────────────────────────────────

const RoleBadge = ({ userType }: { userType: string }) => {
  if (userType === "1")
    return <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">Buyer</span>;
  if (userType === "2")
    return <span className="inline-flex rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">Seller</span>;
  return <span className="text-xs text-gray-400">—</span>;
};

const KycBadge = ({ user }: { user: AdminUser }) => {
  const status = user.kyc_status?.toLowerCase();
  if (user.is_verified_vendor || status === "admin_verified")
    return <span className="inline-flex rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">Verified</span>;
  if (status === "submitted" || status === "pending")
    return <span className="inline-flex rounded-full border border-yellow-200 bg-yellow-50 px-2 py-0.5 text-xs font-medium text-yellow-700">Pending</span>;
  if (status === "rejected")
    return <span className="inline-flex rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">Rejected</span>;
  return <span className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-500">Not submitted</span>;
};

const PlanBadge = ({ user }: { user: AdminUser }) => {
  const status = user.business_profile?.subscription_status?.toLowerCase();
  if (!status || status === "inactive" || status === "expired")
    return <span className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-500">Free</span>;
  return <span className="inline-flex rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">Pro</span>;
};

// ── Page ──────────────────────────────────────────────────────────────────────

const UsersPage = () => {
  const router = useRouter();

  // Stats
  const [statTotal, setStatTotal] = useState<number | null>(null);
  const [statVerified, setStatVerified] = useState<number | null>(null);
  const [statKycPending, setStatKycPending] = useState<number | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // List
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sort, setSort] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 50;

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info"; isVisible: boolean }>({
    message: "", type: "success", isVisible: false,
  });

  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info") =>
    setToast({ message, type, isVisible: true });
  const closeToast = () => setToast((p) => ({ ...p, isVisible: false }));

  // ── Fetch stats ──────────────────────────────────────────────────────────────

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    const [totalRes, verifiedRes, bannerRes] = await Promise.allSettled([
      apiGet("/users/admin/users/?page_size=1"),
      apiGet("/users/admin/users/?status=verified&page_size=1"),
      apiGet("/users/admin/action-banner/"),
    ]);
    if (totalRes.status === "fulfilled") setStatTotal(totalRes.value.data?.count ?? null);
    if (verifiedRes.status === "fulfilled") setStatVerified(verifiedRes.value.data?.count ?? null);
    if (bannerRes.status === "fulfilled") setStatKycPending(bannerRes.value.data?.counts?.kyc_pending ?? null);
    setStatsLoading(false);
  }, []);

  // ── Fetch users list ─────────────────────────────────────────────────────────

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (activeTab === "buyers") params.set("user_type", "buyer");
      else if (activeTab === "sellers") params.set("user_type", "seller");
      else if (activeTab === "verified") params.set("status", "verified");
      else if (activeTab === "unverified") params.set("status", "unverified");

      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);
      params.set("sort", sort);
      params.set("page", String(currentPage));
      params.set("page_size", String(PAGE_SIZE));

      const response = await apiGet(`/users/admin/users/?${params.toString()}`);
      const data = response.data as PaginatedUsers;
      setUsers(Array.isArray(data.results) ? data.results : Array.isArray(data) ? (data as unknown as AdminUser[]) : []);
      setTotalCount(typeof data.count === "number" ? data.count : Array.isArray(data) ? (data as unknown as AdminUser[]).length : 0);
    } catch {
      showToast("Failed to load users", "error");
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchQuery, dateFrom, dateTo, sort, currentPage]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // ── Search debounce ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      setSearchQuery(search);
      setCurrentPage(1);
    }, 300);
    return () => { if (searchDebounce.current) clearTimeout(searchDebounce.current); };
  }, [search]);

  // Reset page on tab/filter change
  useEffect(() => { setCurrentPage(1); }, [activeTab, dateFrom, dateTo, sort]);

  // ── Export CSV ───────────────────────────────────────────────────────────────

  const handleExport = async () => {
    try {
      const response = await apiGet("/users/admin/users/export-csv/", { responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `users-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast("Export not available", "error");
    }
  };

  // ── Pagination ────────────────────────────────────────────────────────────────

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const pageStart = (currentPage - 1) * PAGE_SIZE + 1;
  const pageEnd = Math.min(currentPage * PAGE_SIZE, totalCount);

  const getPaginationPages = () => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (currentPage <= 3) return [1, 2, 3, null, totalPages];
    if (currentPage >= totalPages - 2) return [1, null, totalPages - 2, totalPages - 1, totalPages];
    return [1, null, currentPage - 1, currentPage, currentPage + 1, null, totalPages];
  };

  // ── Unverified count for tab badge ────────────────────────────────────────────

  const unverifiedCount = statKycPending;

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <AdminLayout>
      <h1 className="mb-5 text-title-md font-bold text-gray-800 dark:text-white/90">
        Users
      </h1>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        {[
          {
            label: "Total users",
            value: statsLoading ? "—" : (statTotal ?? "—"),
            badge: null,
            valueColor: "text-gray-800 dark:text-white/90",
          },
          {
            label: "Verified",
            value: statsLoading ? "—" : (statVerified ?? "—"),
            badge: { text: "active", cls: "bg-green-100 text-green-600" },
            valueColor: "text-green-600",
          },
          {
            label: "KYC pending",
            value: statsLoading ? "—" : (statKycPending ?? 0),
            badge: { text: "review", cls: "bg-red-100 text-red-500" },
            valueColor: "text-amber-600",
          },
        ].map((card) => (
          <div
            key={card.label}
            className="flex flex-col gap-1 rounded-2xl border border-gray-100 bg-white px-4 py-4 shadow-sm sm:px-5 dark:border-white/[0.06] dark:bg-white/[0.03]"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">{card.label}</span>
              {card.badge && (
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${card.badge.cls}`}>
                  {card.badge.text}
                </span>
              )}
            </div>
            <span className={`text-3xl font-bold ${card.valueColor}`}>{card.value}</span>
          </div>
        ))}
      </div>

      {/* Tabs row + actions */}
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="overflow-x-auto">
          <div className="flex min-w-max items-center gap-1.5 pb-1">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              const count = tab.key === "unverified" ? unverifiedCount : null;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`whitespace-nowrap rounded-full border px-4 py-1.5 text-sm transition-colors ${
                    isActive
                      ? tab.key === "unverified"
                        ? "border-red-400 bg-red-50 text-red-600 font-semibold"
                        : tab.key === "verified"
                          ? "border-green-400 bg-green-50 text-green-700 font-semibold"
                          : "border-gray-700 bg-gray-700 text-white font-semibold"
                      : tab.key === "unverified"
                        ? "border-red-200 bg-red-50/40 text-red-400 hover:bg-red-50 hover:text-red-500"
                        : tab.key === "verified"
                          ? "border-green-200 bg-green-50/40 text-green-500 hover:bg-green-50 hover:text-green-600"
                          : "border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  {tab.label}
                  {count !== null && count !== undefined && (
                    <span className="ml-1.5 text-xs">({count})</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:ml-auto">
          <button
            onClick={handleExport}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-white/[0.1] dark:bg-white/[0.03] dark:text-gray-300"
          >
            Export CSV
          </button>
          <button
            onClick={() => showToast("Add user feature coming soon", "info")}
            className="rounded-xl border border-green-500 bg-green-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-600"
          >
            + Add user manually
          </button>
        </div>
      </div>

      {/* Search + date + sort */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, phone, company, GSTIN, PAN…"
            className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-white/[0.1] dark:bg-white/[0.05] dark:text-gray-200"
          />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-white/[0.1] dark:bg-white/[0.05] dark:text-gray-300"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-white/[0.1] dark:bg-white/[0.05] dark:text-gray-300"
          />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-white/[0.1] dark:bg-white/[0.05] dark:text-gray-300"
          >
            <option value="newest">Sort: Newest</option>
            <option value="oldest">Sort: Oldest</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03]">
        {loading ? (
          <div className="flex h-48 items-center justify-center text-sm text-gray-400">
            Loading users…
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-gray-100 dark:border-white/[0.05]">
                  {["User", "Email & Phone", "Role", "KYC", "Plan", "Joined", "Last active", "Actions"].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-white/[0.04]">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-10 text-center text-sm text-gray-400">
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((user) => {
                    const company = getCompanyName(user);
                    const kycPending =
                      !user.is_verified_vendor &&
                      (user.kyc_status === "pending" || user.kyc_status === "submitted");
                    return (
                      <tr
                        key={user.id}
                        className="transition-colors hover:bg-gray-50/60 dark:hover:bg-white/[0.02]"
                      >
                        {/* User */}
                        <td className="px-5 py-4">
                          <div className="text-sm font-semibold text-gray-800 dark:text-white/90">
                            {getUserName(user)}
                          </div>
                          {company && (
                            <div className="text-xs text-gray-400 dark:text-gray-500">{company}</div>
                          )}
                        </td>

                        {/* Email & Phone */}
                        <td className="px-5 py-4">
                          <div className="text-sm text-gray-600 dark:text-gray-300">{user.email ?? "—"}</div>
                          <div className="text-xs text-gray-400 dark:text-gray-500">
                            {user.country_code} {user.primary_phone}
                          </div>
                        </td>

                        {/* Role */}
                        <td className="px-5 py-4">
                          <RoleBadge userType={user.user_type} />
                        </td>

                        {/* KYC */}
                        <td className="px-5 py-4">
                          <KycBadge user={user} />
                        </td>

                        {/* Plan */}
                        <td className="px-5 py-4">
                          <PlanBadge user={user} />
                        </td>

                        {/* Joined */}
                        <td className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(user.created_at)}
                        </td>

                        {/* Last active */}
                        <td className="px-5 py-4 text-sm text-gray-400 dark:text-gray-500">
                          {formatRelative(user.last_active_at ?? user.last_login_at)}
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              onClick={() =>
                                router.push(
                                  user.is_verified_vendor
                                    ? `/verified-users/${user.id}`
                                    : `/unverified-users/${user.id}`
                                )
                              }
                              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 dark:border-white/[0.1] dark:text-gray-300"
                            >
                              View &amp; Edit
                            </button>
                            {kycPending && (
                              <button
                                onClick={() => router.push(`/kyc-verification`)}
                                className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-100"
                              >
                                KYC →
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && totalCount > 0 && (
        <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Showing {pageStart}–{pageEnd} of {totalCount.toLocaleString()} users
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-white/[0.1] dark:text-gray-300"
            >
              ← Prev
            </button>
            {getPaginationPages().map((page, i) =>
              page === null ? (
                <span key={`ellipsis-${i}`} className="px-2 text-gray-400">…</span>
              ) : (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page as number)}
                  className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                    currentPage === page
                      ? "border-blue-500 bg-blue-500 font-semibold text-white"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-white/[0.1] dark:text-gray-300"
                  }`}
                >
                  {page}
                </button>
              )
            )}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-white/[0.1] dark:text-gray-300"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={closeToast}
      />
    </AdminLayout>
  );
};

export default UsersPage;
