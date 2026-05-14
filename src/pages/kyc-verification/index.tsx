import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import AdminLayout from "@/layout/AdminLayout";
import Toast from "@/components/ui/toast/Toast";
import { apiGet, apiPost } from "@/utils/api";

// ── Types ─────────────────────────────────────────────────────────────────────

interface UserKyc {
  gstin: string | null;
  pan: string | null;
  cin: string | null;
  iec: string | null;
  udhyam: string | null;
  gstin_status: boolean;
  pan_status: boolean;
  cin_status: boolean;
  iec_status: boolean;
  udhyam_status: boolean;
  partnership_deed_url: string | null;
  shop_registration_url: string | null;
  live_selfie_url?: string | null;
  live_selfie_status?: boolean;
  // USA-specific
  ein_letter_url?: string | null;
  ein_letter_status?: boolean;
  business_registration_url?: string | null;
  business_registration_status?: boolean;
  business_license_url?: string | null;
  business_license_status?: boolean;
  proof_of_business_address_url?: string | null;
  proof_of_business_address_status?: boolean;
  director_id_url?: string | null;
  director_id_status?: boolean;
}

interface BusinessProfile {
  first_name: string | null;
  last_name: string | null;
  business_name: string | null;
  legal_name: string | null;
  created_at: string;
}

interface KycUser {
  id: number;
  email: string | null;
  country_code: string;
  primary_phone: string;
  user_type: string;
  profile_completion_percent: number;
  is_verified_vendor: boolean;
  kyc_status: string;
  verification_date: string | null;
  rejection_reason: string | null;
  allow_to_resubmit: boolean;
  created_at: string;
  kyc_submitted_at: string | null;
  kyc_submission_time: string | null;
  kyc_region?: string;
  business_profile: BusinessProfile | null;
  user_kyc: UserKyc | null;
}

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

// ── Helpers ───────────────────────────────────────────────────────────────────

const getUserName = (u: KycUser) => {
  const bp = u.business_profile;
  const name = `${bp?.first_name ?? ""} ${bp?.last_name ?? ""}`.trim();
  return name || u.email || `User #${u.id}`;
};

const getCompanyName = (u: KycUser) =>
  u.business_profile?.legal_name ||
  u.business_profile?.business_name ||
  "—";

const getGstin = (u: KycUser) => u.user_kyc?.gstin ?? null;

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

type TabKey = "pending" | "approved" | "rejected" | "all";

const TABS: { key: TabKey; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "all", label: "All" },
];

const tabStyle = (tab: TabKey, active: TabKey) => {
  const isActive = tab === active;
  if (tab === "pending")
    return isActive
      ? "border border-red-400 bg-red-50 text-red-600 font-semibold"
      : "border border-red-200 bg-red-50/50 text-red-400 hover:bg-red-50 hover:text-red-500";
  if (tab === "approved")
    return isActive
      ? "border border-green-400 bg-green-50 text-green-700 font-semibold"
      : "border border-green-200 bg-green-50/50 text-green-500 hover:bg-green-50 hover:text-green-600";
  if (tab === "rejected")
    return isActive
      ? "border border-gray-400 bg-gray-100 text-gray-700 font-semibold"
      : "border border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-600";
  return isActive
    ? "border border-gray-700 bg-gray-700 text-white font-semibold"
    : "border border-gray-200 bg-gray-100 text-gray-600 hover:bg-gray-200";
};

// ── Doc Badges ────────────────────────────────────────────────────────────────

const DocBadge = ({ label, submitted, approved }: { label: string; submitted: boolean; approved: boolean }) => {
  if (!submitted)
    return (
      <span className="inline-flex items-center gap-0.5 rounded-md border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[11px] text-gray-400">
        {label}
      </span>
    );
  if (approved)
    return (
      <span className="inline-flex items-center gap-0.5 rounded-md border border-green-200 bg-green-50 px-1.5 py-0.5 text-[11px] text-green-700">
        {label} ✓
      </span>
    );
  return (
    <span className="inline-flex items-center gap-0.5 rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[11px] text-amber-700">
      {label} ?
    </span>
  );
};

// ── Status badge ─────────────────────────────────────────────────────────────

const statusCfg = (user: KycUser) => {
  if (user.is_verified_vendor)
    return { label: "Approved", cls: "bg-green-50 text-green-700 border border-green-200" };
  if (user.kyc_status === "rejected" && user.allow_to_resubmit)
    return { label: "Waiting", cls: "bg-amber-50 text-amber-700 border border-amber-200" };
  if (user.kyc_status === "rejected")
    return { label: "Rejected", cls: "bg-red-50 text-red-600 border border-red-200" };
  return { label: "Pending", cls: "bg-gray-100 text-gray-600 border border-gray-200" };
};

// ── Page ──────────────────────────────────────────────────────────────────────

const KycVerificationPage = () => {
  const router = useRouter();

  const [allUsers, setAllUsers] = useState<KycUser[]>([]);
  const [banner, setBanner] = useState<BannerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [bannerLoading, setBannerLoading] = useState(true);
  const [approvedToday, setApprovedToday] = useState<number | null>(null);
  const [rejectedThisWeek, setRejectedThisWeek] = useState<number | null>(null);

  const [activeTab, setActiveTab] = useState<TabKey>("pending");
  const [pendingFilter, setPendingFilter] = useState<"all" | "complete" | "incomplete">("all");
  const [search, setSearch] = useState("");

  const [approveModal, setApproveModal] = useState<{ open: boolean; user: KycUser | null }>({
    open: false,
    user: null,
  });
  const [rejectModal, setRejectModal] = useState<{
    open: boolean;
    user: KycUser | null;
    reason: string;
    allowResubmit: boolean;
  }>({ open: false, user: null, reason: "", allowResubmit: false });

  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
    isVisible: boolean;
  }>({ message: "", type: "success", isVisible: false });

  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const showToast = (message: string, type: "success" | "error" | "info") =>
    setToast({ message, type, isVisible: true });
  const closeToast = () => setToast((p) => ({ ...p, isVisible: false }));

  // ── Fetch ────────────────────────────────────────────────────────────────────

  const fetchBanner = useCallback(async () => {
    try {
      setBannerLoading(true);
      const res = await apiGet("/users/admin/action-banner/");
      setBanner(res.data);
    } catch {
      // non-critical
    } finally {
      setBannerLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const [unverRes, verRes] = await Promise.allSettled([
        apiGet("/users/admin/unverified-users/"),
        apiGet("/users/admin/verified-users/"),
      ]);
      const unver: KycUser[] =
        unverRes.status === "fulfilled"
          ? Array.isArray(unverRes.value.data)
            ? unverRes.value.data
            : []
          : [];
      const ver: KycUser[] =
        verRes.status === "fulfilled"
          ? Array.isArray(verRes.value.data)
            ? verRes.value.data
            : []
          : [];
      setAllUsers([...unver, ...ver]);
    } catch {
      showToast("Failed to load users", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchKycStats = useCallback(async () => {
    const [todayRes, weekRes] = await Promise.allSettled([
      apiGet("/users/admin/approved-today/"),
      apiGet("/users/admin/rejected-this-week/"),
    ]);
    if (todayRes.status === "fulfilled") {
      const d = todayRes.value.data;
      setApprovedToday(d?.approved_today ?? d?.count ?? d?.total ?? 0);
    }
    if (weekRes.status === "fulfilled") {
      const d = weekRes.value.data;
      setRejectedThisWeek(d?.rejected_this_week ?? d?.count ?? d?.total ?? 0);
    }
  }, []);

  useEffect(() => {
    fetchBanner();
    fetchUsers();
    fetchKycStats();
  }, [fetchBanner, fetchUsers, fetchKycStats]);

  // ── Search debounce ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => setSearchQuery(search), 300);
    return () => { if (searchDebounce.current) clearTimeout(searchDebounce.current); };
  }, [search]);

  // ── Derived data ─────────────────────────────────────────────────────────────

  const pendingUsers = allUsers.filter((u) => !u.is_verified_vendor);
  const approvedUsers = allUsers.filter((u) => u.is_verified_vendor);
  const rejectedUsers = allUsers.filter(
    (u) => !u.is_verified_vendor && u.kyc_status === "rejected" && !u.allow_to_resubmit
  );

  const tabUsers: Record<TabKey, KycUser[]> = {
    pending: pendingUsers,
    approved: approvedUsers,
    rejected: rejectedUsers,
    all: allUsers,
  };

  const tabCounts: Record<TabKey, number> = {
    pending: pendingUsers.length,
    approved: approvedUsers.length,
    rejected: rejectedUsers.length,
    all: allUsers.length,
  };

  const filtered = tabUsers[activeTab].filter((u) => {
    if (activeTab === "pending") {
      if (pendingFilter === "complete" && u.profile_completion_percent < 100) return false;
      if (pendingFilter === "incomplete" && u.profile_completion_percent === 100) return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      getUserName(u).toLowerCase().includes(q) ||
      (u.email ?? "").toLowerCase().includes(q) ||
      u.primary_phone.includes(q) ||
      getCompanyName(u).toLowerCase().includes(q) ||
      (getGstin(u) ?? "").toLowerCase().includes(q)
    );
  });

  // ── Stats ─────────────────────────────────────────────────────────────────────

  const pendingCount = banner?.counts?.kyc_pending ?? pendingUsers.length;

  // ── Actions ───────────────────────────────────────────────────────────────────

  const handleApproveConfirm = async () => {
    const user = approveModal.user;
    if (!user) return;
    setApproveModal({ open: false, user: null });
    try {
      setActionLoading(user.id);
      await apiPost(`/users/admin/users/${user.id}/approve-all/`, {});
      showToast(`${getUserName(user)} approved — all documents verified`, "success");
      fetchUsers();
      fetchBanner();
      fetchKycStats();
    } catch {
      showToast("Failed to approve user", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectSubmit = async () => {
    const user = rejectModal.user;
    if (!user) return;
    try {
      setActionLoading(user.id);
      await apiPost(`/users/admin/users/${user.id}/reject/`, {
        rejection_reason: rejectModal.reason.trim() || undefined,
        allow_to_resubmit: rejectModal.allowResubmit,
      });
      showToast(
        rejectModal.allowResubmit
          ? `Info requested from ${getUserName(user)}`
          : `${getUserName(user)} rejected`,
        "success"
      );
      setRejectModal({ open: false, user: null, reason: "", allowResubmit: false });
      fetchUsers();
      fetchBanner();
      fetchKycStats();
    } catch {
      showToast("Failed to process action", "error");
    } finally {
      setActionLoading(null);
    }
  };

  // ── Oldest pending ────────────────────────────────────────────────────────────

  const oldestPending = pendingUsers.reduce<KycUser | null>((oldest, u) => {
    if (!oldest) return u;
    return new Date(u.created_at) < new Date(oldest.created_at) ? u : oldest;
  }, null);

  const oldestDays = oldestPending
    ? Math.floor((Date.now() - new Date(oldestPending.created_at).getTime()) / 86400000)
    : 0;

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <AdminLayout>
      <h1 className="mb-5 text-title-md font-bold text-gray-800 dark:text-white/90">
        KYC Verification
      </h1>

      {/* Alert banner */}
      {!bannerLoading && pendingCount > 0 && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3.5 dark:border-amber-700/40 dark:bg-amber-900/10">
          <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
          <p className="text-sm text-amber-800 dark:text-amber-300">
            <span className="font-semibold">{pendingCount} user{pendingCount !== 1 ? "s" : ""} waiting.</span>
            {oldestDays > 0 && (
              <> Oldest is {oldestDays} day{oldestDays !== 1 ? "s" : ""} old — they should be reviewed first.</>
            )}{" "}
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {[
          {
            label: "Awaiting review",
            value: loading ? "—" : pendingCount,
            badge: { text: "now", cls: "bg-red-100 text-red-500" },
            valueColor: "text-amber-600",
          },
          {
            label: "Waiting for profile completion",
            value: loading ? "—" : pendingUsers.filter((u) => u.profile_completion_percent < 100).length,
            badge: { text: "waiting", cls: "bg-amber-100 text-amber-600" },
            valueColor: "text-amber-600",
          },
          {
            label: "Approved today",
            value: approvedToday ?? 0,
            badge: { text: "done", cls: "bg-green-100 text-green-600" },
            valueColor: "text-green-600",
          },
          {
            label: "Rejected this week",
            value: rejectedThisWeek ?? 0,
            badge: null,
            valueColor: "text-red-500",
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

      {/* Tabs + search */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="overflow-x-auto sm:py-0 py-5">
          <div className="flex min-w-max items-center gap-2 pb-1">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); setPendingFilter("all"); }}
                className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm transition-colors ${tabStyle(tab.key, activeTab)}`}
              >
                {tab.label}
                {tabCounts[tab.key] > 0 && (
                  <span className="ml-1.5 text-xs">({tabCounts[tab.key]})</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="relative w-full sm:ml-auto sm:w-56">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search user…"
            className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-white/[0.1] dark:bg-white/[0.05] dark:text-gray-200"
          />
        </div>
      </div>

      {activeTab === "pending" && (
        <div className="mb-4 flex flex-wrap items-center gap-1.5">
          {(
            [
              { key: "all", label: "All" },
              { key: "complete", label: "100% Complete" },
              { key: "incomplete", label: "Incomplete" },
            ] as { key: "all" | "complete" | "incomplete"; label: string }[]
          ).map((f) => (
            <button
              key={f.key}
              onClick={() => setPendingFilter(f.key)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${pendingFilter === f.key
                  ? f.key === "complete"
                    ? "border-blue-400 bg-blue-50 text-blue-700"
                    : f.key === "incomplete"
                      ? "border-amber-400 bg-amber-50 text-amber-700"
                      : "border-gray-700 bg-gray-700 text-white"
                  : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03]">
        {loading ? (
          <div className="flex h-48 items-center justify-center text-sm text-gray-400">
            Loading users…
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px]">
              <thead>
                <tr className="border-b border-gray-100 dark:border-white/[0.05]">
                  {["User", "Company", "Docs submitted", "KYC Submitted", "Status", "Actions"].map((h) => (
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
                {(() => {
                  const renderRow = (user: KycUser) => {
                    const kyc = user.user_kyc;
                    const hasGstin = !!kyc?.gstin;
                    const hasPan = !!kyc?.pan;
                    const { label: statusLabel, cls: statusCls } = statusCfg(user);
                    return (
                      <tr key={user.id} className="transition-colors hover:bg-gray-50/60 dark:hover:bg-white/[0.02]">
                        <td className="px-5 py-4">
                          <div className="text-sm font-medium text-gray-800 dark:text-white/90">{getUserName(user)}</div>
                          <div className="text-xs text-gray-400 dark:text-gray-500">{user.email ?? `${user.country_code} ${user.primary_phone}`}</div>
                          {user.email && <div className="text-xs text-gray-400 dark:text-gray-500">{user.country_code} {user.primary_phone}</div>}
                        </td>
                        <td className="px-5 py-4">
                          <div className="text-sm font-medium text-gray-700 dark:text-white/80">{getCompanyName(user)}</div>
                          {getGstin(user) && <div className="text-xs font-mono text-gray-400 dark:text-gray-500">{getGstin(user)}</div>}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-1">
                            {user.kyc_region === 'usa' ? (
                              <>
                                <DocBadge label="EIN" submitted={!!kyc?.ein_letter_url} approved={kyc?.ein_letter_status ?? false} />
                                <DocBadge label="Biz Reg" submitted={!!kyc?.business_registration_url} approved={kyc?.business_registration_status ?? false} />
                                <DocBadge label="License" submitted={!!kyc?.business_license_url} approved={kyc?.business_license_status ?? false} />
                                <DocBadge label="Address" submitted={!!kyc?.proof_of_business_address_url} approved={kyc?.proof_of_business_address_status ?? false} />
                                <DocBadge label="Dir ID" submitted={!!kyc?.director_id_url} approved={kyc?.director_id_status ?? false} />
                                <DocBadge label="Selfie" submitted={!!kyc?.live_selfie_url} approved={kyc?.live_selfie_status ?? false} />
                              </>
                            ) : (
                              <>
                                <DocBadge label="GST" submitted={hasGstin} approved={kyc?.gstin_status ?? false} />
                                <DocBadge label="PAN" submitted={hasPan} approved={kyc?.pan_status ?? false} />
                              </>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          {user.kyc_submission_time ? (
                            <div>
                              <span className="text-sm font-medium text-gray-700 dark:text-white/80">{user.kyc_submission_time}</span>
                              <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">ago</div>
                            </div>
                          ) : (
                            <div>
                              <span className="text-xs text-gray-400 dark:text-gray-500">Not submitted</span>
                              <div className="text-xs text-gray-300 dark:text-gray-600 mt-0.5">Joined {formatRelative(user.created_at)}</div>
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusCls}`}>{statusLabel}</span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              onClick={() => router.push(user.is_verified_vendor ? `/verified-users/${user.id}` : `/unverified-users/${user.id}`)}
                              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 dark:border-white/[0.1] dark:text-gray-300"
                            >
                              Review
                            </button>
                            {!user.is_verified_vendor && (
                              <>
                                <button
                                  onClick={() => router.push(`/unverified-users/${user.id}#documents`)}
                                  className="rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 transition-colors hover:bg-purple-100"
                                >
                                  Upload Docs
                                </button>
                                <button
                                  onClick={() => setApproveModal({ open: true, user })}
                                  disabled={actionLoading === user.id}
                                  className="rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 transition-colors hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {actionLoading === user.id ? "…" : "Approve all"}
                                </button>
                                <button
                                  onClick={() => setRejectModal({ open: true, user, reason: "", allowResubmit: false })}
                                  disabled={actionLoading === user.id}
                                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  };

                  if (filtered.length === 0) {
                    return (
                      <tr>
                        <td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-400 dark:text-gray-500">No users found</td>
                      </tr>
                    );
                  }
                  return <>{filtered.map(renderRow)}</>;
                })()}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Approve confirmation modal */}
      {approveModal.open && approveModal.user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <h3 className="mb-1 text-base font-semibold text-gray-800 dark:text-white/90">
              Approve user
            </h3>
            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
              Are you sure you want to approve{" "}
              <span className="font-medium text-gray-700 dark:text-white/80">
                {getUserName(approveModal.user)}
              </span>
              ? All submitted documents will be marked as verified.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setApproveModal({ open: false, user: null })}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-white/[0.1] dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleApproveConfirm}
                className="rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-600"
              >
                Confirm Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject / Request info modal */}
      {rejectModal.open && rejectModal.user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <h3 className="mb-1 text-base font-semibold text-gray-800 dark:text-white/90">
              {rejectModal.allowResubmit ? "Request more info" : "Reject user"}
            </h3>
            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
              {getUserName(rejectModal.user)}
            </p>
            <textarea
              value={rejectModal.reason}
              onChange={(e) => setRejectModal((p) => ({ ...p, reason: e.target.value }))}
              placeholder={
                rejectModal.allowResubmit
                  ? "Describe what additional information is needed…"
                  : "Rejection reason (optional)"
              }
              rows={3}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-300 dark:border-white/[0.1] dark:bg-white/[0.05] dark:text-gray-200"
            />
            <label className="mt-3 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <input
                type="checkbox"
                checked={rejectModal.allowResubmit}
                onChange={(e) => setRejectModal((p) => ({ ...p, allowResubmit: e.target.checked }))}
                className="h-4 w-4 rounded accent-amber-500"
              />
              Allow user to resubmit documents
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setRejectModal({ open: false, user: null, reason: "", allowResubmit: false })}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-white/[0.1] dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectSubmit}
                disabled={actionLoading !== null}
                className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 ${rejectModal.allowResubmit
                    ? "bg-amber-500 hover:bg-amber-600"
                    : "bg-red-500 hover:bg-red-600"
                  }`}
              >
                {actionLoading !== null
                  ? "Processing…"
                  : rejectModal.allowResubmit
                    ? "Send request"
                    : "Confirm Reject"}
              </button>
            </div>
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

export default KycVerificationPage;
