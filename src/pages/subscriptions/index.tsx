import React, { useCallback, useEffect, useRef, useState } from "react";
import AdminLayout from "@/layout/AdminLayout";
import Toast from "@/components/ui/toast/Toast";
import { Modal } from "@/components/ui/modal";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/utils/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Stats {
  active_subscribers: number;
  free_plan_users: number;
  expiring_this_week: number;
  expiring_this_month: number;
  monthly_revenue: number;
  failed_payments?: number;
  revenue_growth_pct?: number;
}

interface Plan {
  id: number;
  name?: string;
  plan_name?: string;
  price?: number | string;
  amount?: number | string;
  features?: string[] | string;
  plan_type?: string;
  user_count?: number;
  users_count?: number;
  subscribers_count?: number;
}

interface Subscription {
  id?: number;
  subscription_id?: number;
  status?: string | null;
  subscription_status?: string | null;
  plan_name?: string | null;
  subscription_plan_name?: string | null;
  plan_id?: number | null;
  subscription_plan_id?: number | null;
  user_name?: string | null;
  customer_name?: string | null;
  user_id?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  expiry_date?: string | null;
  created_at?: string | null;
  company_name?: string | null;
  email?: string | null;
  amount?: number | null;
  amount_paid?: number | null;
  payment_status?: string | null;
  [key: string]: unknown;
}

type TabType = "all" | "active" | "expiring" | "expired" | "failed";

interface PlanFormData {
  name: string;
  price: string;
  plan_type: string;
  features: string;
  code: string;
  billing_cycle: string;
}

// ─── Standalone helpers ───────────────────────────────────────────────────────

const formatRevenue = (amount: number) => {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
  return `₹${amount}`;
};

const formatAmount = (amount: number | null | undefined) => {
  if (amount === null || amount === undefined) return "N/A";
  return `₹${amount.toLocaleString("en-IN")}/mo`;
};

const normalizeFeatures = (features: string[] | string | undefined): string[] => {
  if (!features) return [];
  if (Array.isArray(features)) return features.filter(Boolean);
  try {
    const parsed = JSON.parse(features);
    if (Array.isArray(parsed)) return parsed.filter(Boolean);
  } catch {
    // not JSON
  }
  return features.split("\n").filter((f) => f.trim());
};

const getPlanDisplayName = (plan: Plan) => plan.plan_name ?? plan.name ?? "Unnamed Plan";

const getPlanPrice = (plan: Plan): number | null => {
  const raw = plan.price ?? plan.amount;
  if (raw === null || raw === undefined) return null;
  const n = typeof raw === "string" ? parseFloat(raw) : raw;
  return isNaN(n) ? null : n;
};

const getPlanUserCount = (plan: Plan) =>
  plan.user_count ?? plan.users_count ?? plan.subscribers_count ?? 0;

const getPlanBadgeStyle = (planName: string) => {
  const n = planName.toLowerCase();
  if (n.includes("pro")) return "bg-purple-100 text-purple-700";
  if (n.includes("basic")) return "bg-blue-100 text-blue-700";
  return "bg-gray-100 text-gray-600";
};

// ─── Plan form sub-component ──────────────────────────────────────────────────

const PlanFormFields = ({
  form,
  onChange,
}: {
  form: PlanFormData;
  onChange: (f: PlanFormData) => void;
}) => (
  <div className="mb-5 space-y-4">
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
        Plan name
      </label>
      <input
        type="text"
        value={form.name}
        onChange={(e) => onChange({ ...form, name: e.target.value })}
        placeholder="e.g. Pro, Basic, Enterprise"
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-white/[0.05] dark:bg-white/[0.03] dark:text-gray-200"
      />
    </div>
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
        Plan Code
      </label>
      <input
        type="text"
        value={form.code}
        onChange={(e) => onChange({ ...form, code: e.target.value })}
        placeholder="e.g. PRO, BASIC, ENTERPRISE"
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-white/[0.05] dark:bg-white/[0.03] dark:text-gray-200"
      />
    </div>
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
        Price (₹/month, 0 for free)
      </label>
      <input
        type="number"
        value={form.price}
        onChange={(e) => onChange({ ...form, price: e.target.value })}
        placeholder="0"
        min="0"
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-white/[0.05] dark:bg-white/[0.03] dark:text-gray-200"
      />
    </div>
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
        Billing Cycle
      </label>
      <select
        value={form.billing_cycle}
        onChange={(e) => onChange({ ...form, billing_cycle: e.target.value })}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-white/[0.05] dark:bg-white/[0.03] dark:text-gray-200"
      >
        <option value="monthly">Monthly</option>
        <option value="yearly">Yearly</option>
        <option value="quarterly">Quarterly</option>
      </select>
    </div>
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
        Plan type
      </label>
      <select
        value={form.plan_type}
        onChange={(e) => onChange({ ...form, plan_type: e.target.value })}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-white/[0.05] dark:bg-white/[0.03] dark:text-gray-200"
      >
        <option value="free">Free</option>
        <option value="paid">Paid</option>
      </select>
    </div>
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
        Features (one per line)
      </label>
      <textarea
        value={form.features}
        onChange={(e) => onChange({ ...form, features: e.target.value })}
        rows={5}
        placeholder={"5 product listings\nView-only access to RFQs\nBasic profile"}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-white/[0.05] dark:bg-white/[0.03] dark:text-gray-200"
      />
    </div>
  </div>
);

// ─── Main page ────────────────────────────────────────────────────────────────

const SubscriptionsPage = () => {
  // Data
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);

  // Loading
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [plansLoading, setPlansLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // Filters
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [selectedPlanFilter, setSelectedPlanFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const PAGE_SIZE = 20;

  // Modals
  const [extendModal, setExtendModal] = useState(false);
  const [discountModal, setDiscountModal] = useState(false);
  const [addPlanModal, setAddPlanModal] = useState(false);
  const [editPlanModal, setEditPlanModal] = useState(false);
  const [deletePlanModal, setDeletePlanModal] = useState(false);
  const [viewModal, setViewModal] = useState(false);
  const [viewData, setViewData] = useState<Subscription | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  // Form values
  const [extendDays, setExtendDays] = useState("30");
  const [discountPct, setDiscountPct] = useState("10");
  const [planForm, setPlanForm] = useState<PlanFormData>({
    name: "",
    price: "",
    plan_type: "paid",
    features: "",
    code: "",
    billing_cycle: "monthly",
  });

  // Toast
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
    isVisible: boolean;
  }>({ message: "", type: "success", isVisible: false });

  const showToast = (message: string, type: "success" | "error" | "info") =>
    setToast({ message, type, isVisible: true });
  const closeToast = () => setToast((p) => ({ ...p, isVisible: false }));

  // ── Field helpers (kept from original) ──────────────────────────────────────

  const getNestedRecord = (value: unknown) =>
    value && typeof value === "object" ? (value as Record<string, unknown>) : undefined;

  const getNumericValue = (value: unknown): number | null => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const p = Number(value);
      return Number.isFinite(p) ? p : null;
    }
    return null;
  };

  const getFullName = (record?: Record<string, unknown>) => {
    if (!record) return "";
    const first = typeof record.first_name === "string" ? record.first_name.trim() : "";
    const last = typeof record.last_name === "string" ? record.last_name.trim() : "";
    return `${first} ${last}`.trim();
  };

  const getUserId = (sub: Subscription) => {
    const u = getNestedRecord(sub.user);
    const nu = getNestedRecord(u?.user);
    return (
      getNumericValue(sub.user_id) ??
      getNumericValue(sub["customer_id"]) ??
      getNumericValue(sub["subscriber_id"]) ??
      getNumericValue(u?.id) ??
      getNumericValue(nu?.id) ??
      null
    );
  };

  const getPlanId = (sub: Subscription) => {
    const p = getNestedRecord(sub["plan"]);
    const sp = getNestedRecord(sub["subscription_plan"]);
    return (
      getNumericValue(sub.plan_id) ??
      getNumericValue(sub.subscription_plan_id) ??
      getNumericValue(sub["subscription_plan"]) ??
      getNumericValue(sub["plan"]) ??
      getNumericValue(p?.id) ??
      getNumericValue(sp?.id) ??
      null
    );
  };

  const extractUserName = (value: unknown): string | null => {
    const user = getNestedRecord(value);
    if (!user) return null;
    if (typeof user.name === "string" && user.name.trim()) return user.name;
    const bp = getNestedRecord(user.business_profile);
    const bpName = getFullName(bp);
    if (bpName) return bpName;
    return getFullName(user) || null;
  };

  const extractCompanyName = (value: unknown): string | null => {
    const user = getNestedRecord(value);
    if (!user) return null;
    const bp = getNestedRecord(user.business_profile);
    if (bp) {
      for (const key of ["business_name", "company_name", "name"]) {
        const v = bp[key];
        if (typeof v === "string" && v.trim()) return v;
      }
    }
    return null;
  };

  const extractEmail = (value: unknown): string | null => {
    const user = getNestedRecord(value);
    if (!user) return null;
    if (typeof user.email === "string") return user.email;
    const inner = getNestedRecord(user.user);
    if (inner && typeof inner.email === "string") return inner.email;
    return null;
  };

  const extractPlanName = (value: unknown): string | null => {
    const plan = getNestedRecord(value);
    if (!plan) return null;
    for (const key of ["plan_name", "name", "title"]) {
      const v = plan[key];
      if (typeof v === "string" && v.trim()) return v;
    }
    return null;
  };

  const extractPlanPrice = (value: unknown): number | null => {
    const plan = getNestedRecord(value);
    if (!plan) return null;
    for (const key of ["price", "amount", "monthly_price"]) {
      const v = getNumericValue(plan[key]);
      if (v !== null) return v;
    }
    return null;
  };

  // ── Data getters for display ─────────────────────────────────────────────────

  const getSubscriptionId = (sub: Subscription) =>
    Number(sub.id ?? sub.subscription_id ?? 0);

  const getStatus = (sub: Subscription) =>
    String(sub.status ?? sub.subscription_status ?? "N/A");

  const getPlanName = (sub: Subscription) =>
    String(
      sub.plan_name ??
        sub.subscription_plan_name ??
        extractPlanName(sub.plan) ??
        extractPlanName(sub.subscription_plan) ??
        "N/A"
    );

  const getCustomerName = (sub: Subscription) => {
    const direct = sub.user_name ?? sub.customer_name;
    if (direct) return String(direct);
    return extractUserName(sub.user) ?? "N/A";
  };

  const getCompanyName = (sub: Subscription) => {
    if (sub.company_name) return String(sub.company_name);
    return extractCompanyName(sub.user) ?? "N/A";
  };

  const getEmail = (sub: Subscription) => {
    if (sub.email) return String(sub.email);
    return extractEmail(sub.user) ?? "";
  };

  const getAmountPaid = (sub: Subscription): number | null => {
    const direct = sub.amount_paid ?? sub.amount;
    if (direct !== null && direct !== undefined) return Number(direct);
    return extractPlanPrice(getNestedRecord(sub.plan ?? sub.subscription_plan));
  };

  const getPaymentStatus = (sub: Subscription): string | null => {
    if (sub.payment_status) return String(sub.payment_status);
    const s = getStatus(sub).toLowerCase();
    if (s.includes("past_due") || s.includes("failed")) return "Failed";
    if (s === "active") return "Paid";
    return null;
  };

  const getSubscriptionStatus = (sub: Subscription): string => {
    return getStatus(sub) || "N/A";
  };

  const formatDate = (value: unknown) => {
    if (!value || typeof value !== "string") return "N/A";
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  const getDateValue = (sub: Subscription, keys: string[]) => {
    for (const key of keys) {
      const v = sub[key];
      if (typeof v === "string" && v.trim()) return v;
    }
    return null;
  };

  const isExpiringSoon = (sub: Subscription) => {
    const d = getDateValue(sub, ["end_date", "expiry_date"]);
    if (!d) return false;
    const date = new Date(d);
    if (isNaN(date.getTime())) return false;
    const diff = Math.floor((date.getTime() - Date.now()) / 86400000);
    return diff >= 0 && diff <= 30;
  };

  // ── Remote data fetchers ─────────────────────────────────────────────────────

  const fetchUserDetails = async (userId: number) => {
    for (const ep of [`/users/admin/users/${userId}/`, `/admin/users/${userId}/`]) {
      try {
        return (await apiGet(ep)).data;
      } catch {
        // try next
      }
    }
    return null;
  };

  const fetchPlanDetails = async (planId: number) => {
    for (const ep of [
      `/cms/admin/plans/${planId}/`,
      `/users/admin/subscription-plans/${planId}/`,
    ]) {
      try {
        return (await apiGet(ep)).data;
      } catch {
        // try next
      }
    }
    return null;
  };

  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const res = await apiGet("/users/admin/subscriptions/stats/");
      setStats(res.data);
    } catch (e) {
      console.error("Fetch stats error:", e);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchPlans = useCallback(async () => {
    try {
      setPlansLoading(true);
      const res = await apiGet("/cms/admin/plans/");
      const d = res.data;
      setPlans(Array.isArray(d) ? d : (d?.results ?? []));
    } catch (e) {
      console.error("Fetch plans error:", e);
    } finally {
      setPlansLoading(false);
    }
  }, []);

  const fetchSubscriptions = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (activeTab === "active") params.set("status", "active");
      else if (activeTab === "expired") params.set("status", "expired");
      else if (activeTab === "failed") params.set("status", "past_due");
      else if (activeTab === "expiring") {
        params.set("status", "active");
        params.set("expiring", "true");
      }
      if (selectedPlanFilter) params.set("plan_id", selectedPlanFilter);
      if (searchQuery) params.set("search", searchQuery);
      params.set("page", String(currentPage));
      params.set("page_size", String(PAGE_SIZE));

      const q = params.toString();
      const res = await apiGet(`/users/admin/subscriptions/${q ? `?${q}` : ""}`);
      const data = res.data;
      const raw: Subscription[] = Array.isArray(data) ? data : (data?.results ?? []);
      if (data?.count !== undefined) setTotalCount(data.count);

      const enriched = await Promise.all(
        raw.map(async (sub) => {
          const next = { ...sub };
          if (!extractUserName(next.user)) {
            const uid = getUserId(next);
            if (uid) {
              const ud = await fetchUserDetails(uid);
              if (ud) next.user = ud;
            }
          }
          const existing =
            next.plan_name ??
            next.subscription_plan_name ??
            extractPlanName(next.plan) ??
            extractPlanName(next.subscription_plan);
          if (!existing) {
            const pid = getPlanId(next);
            if (pid) {
              const pd = await fetchPlanDetails(pid);
              if (pd) {
                next.plan = pd;
                next.plan_name = extractPlanName(pd);
              }
            }
          }
          return next;
        })
      );
      setSubscriptions(enriched);
    } catch (e) {
      console.error("Fetch subscriptions error:", e);
      showToast("Failed to fetch subscriptions", "error");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedPlanFilter, searchQuery, currentPage]);

  useEffect(() => {
    fetchStats();
    fetchPlans();
  }, [fetchStats, fetchPlans]);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, selectedPlanFilter, searchQuery]);

  const handleSearchChange = (val: string) => {
    setSearchInput(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setSearchQuery(val), 400);
  };

  // ── Subscription actions ─────────────────────────────────────────────────────

  const handleExportCSV = async () => {
    try {
      const params = new URLSearchParams();
      if (activeTab === "active") params.set("status", "active");
      else if (activeTab === "expired") params.set("status", "expired");
      else if (activeTab === "failed") params.set("status", "past_due");
      if (selectedPlanFilter) params.set("plan_id", selectedPlanFilter);
      if (searchQuery) params.set("search", searchQuery);
      const q = params.toString();
      const res = await apiGet(`/users/admin/subscriptions/export-csv/${q ? `?${q}` : ""}`);
      const csv =
        typeof res.data === "string" ? res.data : JSON.stringify(res.data);
      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.setAttribute("download", "subscriptions.csv");
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Export CSV error:", e);
      showToast("Failed to export CSV", "error");
    }
  };

  const handleExtend = async () => {
    if (!selectedSubscription) return;
    try {
      setActionLoading(getSubscriptionId(selectedSubscription));
      await apiPost(
        `/users/admin/subscriptions/${getSubscriptionId(selectedSubscription)}/extend/`,
        { days: parseInt(extendDays) }
      );
      showToast("Subscription extended successfully", "success");
      setExtendModal(false);
      setSelectedSubscription(null);
      fetchSubscriptions();
      fetchStats();
    } catch (e) {
      console.error("Extend error:", e);
      showToast("Failed to extend subscription", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDiscount = async () => {
    if (!selectedSubscription) return;
    try {
      setActionLoading(getSubscriptionId(selectedSubscription));
      await apiPost(
        `/users/admin/subscriptions/${getSubscriptionId(selectedSubscription)}/discount/`,
        { discount_percentage: parseInt(discountPct) }
      );
      showToast("Discount applied successfully", "success");
      setDiscountModal(false);
      setSelectedSubscription(null);
      fetchSubscriptions();
    } catch (e) {
      console.error("Discount error:", e);
      showToast("Failed to apply discount", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleNeoDovePush = async (sub: Subscription) => {
    try {
      setActionLoading(getSubscriptionId(sub));
      await apiPost(
        `/users/admin/subscriptions/${getSubscriptionId(sub)}/neodove-push/`,
        {}
      );
      showToast("NeoDove push sent successfully", "success");
    } catch (e) {
      console.error("NeoDove push error:", e);
      showToast("Failed to send NeoDove push", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleViewSubscription = async (sub: Subscription) => {
    const subId = getSubscriptionId(sub);
    try {
      setViewLoading(true);
      setViewData(null);
      setViewModal(true);
      const res = await apiGet(`/users/admin/subscriptions/${subId}/`);
      setViewData(res.data?.subscription ?? res.data);
    } catch (e) {
      console.error("View subscription error:", e);
      showToast("Failed to load subscription details", "error");
      setViewModal(false);
    } finally {
      setViewLoading(false);
    }
  };

  const handleRetryPayment = async (sub: Subscription) => {
    try {
      setActionLoading(getSubscriptionId(sub));
      await apiPost(
        `/users/admin/subscriptions/${getSubscriptionId(sub)}/retry-payment/`,
        {}
      );
      showToast("Payment retry initiated", "success");
      fetchSubscriptions();
      fetchStats();
    } catch (e) {
      console.error("Retry payment error:", e);
      showToast("Failed to retry payment", "error");
    } finally {
      setActionLoading(null);
    }
  };

  // ── Plan actions ─────────────────────────────────────────────────────────────

  const handleAddPlan = async () => {
    try {
      const features = planForm.features.split("\n").filter((f) => f.trim());
      await apiPost("/cms/admin/plans/", {
        name: planForm.name,
        code: planForm.code,
        price: parseFloat(planForm.price) || 0,
        billing_cycle: planForm.billing_cycle,
        plan_type: planForm.plan_type,
        features,
      });
      showToast("Plan added successfully", "success");
      setAddPlanModal(false);
      setPlanForm({ name: "", price: "", plan_type: "paid", features: "", code: "", billing_cycle: "monthly" });
      fetchPlans();
    } catch (e) {
      console.error("Add plan error:", e);
      showToast("Failed to add plan", "error");
    }
  };

  const handleEditPlan = async () => {
    if (!selectedPlan) return;
    try {
      const features = planForm.features.split("\n").filter((f) => f.trim());
      await apiPatch(`/cms/admin/plans/${selectedPlan.id}/`, {
        name: planForm.name,
        code: planForm.code,
        price: parseFloat(planForm.price) || 0,
        billing_cycle: planForm.billing_cycle,
        plan_type: planForm.plan_type,
        features,
      });
      showToast("Plan updated successfully", "success");
      setEditPlanModal(false);
      setSelectedPlan(null);
      fetchPlans();
    } catch (e) {
      console.error("Edit plan error:", e);
      showToast("Failed to update plan", "error");
    }
  };

  const handleDeletePlan = async () => {
    if (!selectedPlan) return;
    try {
      await apiDelete(`/cms/admin/plans/${selectedPlan.id}/`);
      showToast("Plan deleted successfully", "success");
      setDeletePlanModal(false);
      setSelectedPlan(null);
      fetchPlans();
    } catch (e) {
      console.error("Delete plan error:", e);
      showToast("Failed to delete plan. It may have active subscribers.", "error");
    }
  };

  const openEditPlan = (plan: Plan) => {
    setSelectedPlan(plan);
    const price = getPlanPrice(plan);
    setPlanForm({
      name: getPlanDisplayName(plan),
      price: price !== null ? String(price) : "",
      plan_type: plan.plan_type ?? "paid",
      features: normalizeFeatures(plan.features).join("\n"),
      code: (plan as any).code || "",
      billing_cycle: (plan as any).billing_cycle || "monthly",
    });
    setEditPlanModal(true);
  };

  // ── Tab config ───────────────────────────────────────────────────────────────

  const tabs: { id: TabType; label: string; count?: number; activeClass: string; defaultClass: string }[] = [
    { id: "all", label: "All", activeClass: "bg-gray-800 text-white", defaultClass: "bg-gray-100 text-gray-800" },
    {
      id: "active",
      label: "Active",
      count: stats?.active_subscribers,
      activeClass: "bg-emerald-500 text-white",
      defaultClass: "bg-emerald-100 text-emerald-700",
    },
    {
      id: "expiring",
      label: "Expiring",
      count: stats?.expiring_this_month,
      activeClass: "bg-amber-500 text-white",
      defaultClass: "bg-amber-100 text-amber-700",
    },
    { id: "expired", label: "Expired", activeClass: "bg-gray-500 text-white", defaultClass: "bg-gray-100 text-gray-700" },
    {
      id: "failed",
      label: "Failed payment",
      count: stats?.failed_payments,
      activeClass: "bg-red-500 text-white",
      defaultClass: "bg-red-100 text-red-700",
    },
  ];

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <AdminLayout>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-title-md font-bold text-gray-800 dark:text-white/90">
          Subscriptions
        </h1>
      </div>
      {/* Info Banner */}
      <div className="mb-6 flex items-start gap-3 rounded-xl border-l-4 border-emerald-500 bg-white px-5 py-3 text-sm text-gray-600 shadow-sm dark:bg-white/[0.03] dark:text-gray-400">
        <span className="font-semibold text-emerald-600">TradeClover</span>
        &nbsp;earns only from subscriptions — no commission on deals. This is your entire
        revenue tracker. See every subscriber, who&apos;s expiring, and manage your plans.
      </div>

      {/* Stats Cards */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {/* Active subscribers */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03]">
          <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">Active subscribers</p>
          <p className="text-2xl font-bold text-gray-800 dark:text-white">
            {statsLoading ? "—" : (stats?.active_subscribers ?? 0)}
          </p>
        </div>

        {/* Expiring this week */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="mb-1 flex flex-wrap items-center gap-1">
            <p className="text-xs text-gray-500 dark:text-gray-400">Expiring this week</p>
            <span className="rounded-[50px] bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-600">
              call now
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-800 dark:text-white">
            {statsLoading ? "—" : (stats?.expiring_this_week ?? 0)}
          </p>
        </div>

        {/* Expiring this month */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="mb-1 flex flex-wrap items-center gap-1">
            <p className="text-xs text-gray-500 dark:text-gray-400">Expiring this month</p>
            <span className="rounded-[50px] bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-600">
              follow up
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-800 dark:text-white">
            {statsLoading ? "—" : (stats?.expiring_this_month ?? 0)}
          </p>
        </div>

        {/* Failed payments */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="mb-1 flex flex-wrap items-center gap-1">
            <p className="text-xs text-gray-500 dark:text-gray-400">Failed payments</p>
            <span className="rounded-[50px] bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-600">
              retry
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-800 dark:text-white">
            {statsLoading ? "—" : (stats?.failed_payments ?? 0)}
          </p>
        </div>

        {/* Revenue */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="mb-1 flex flex-wrap items-center gap-1">
            <p className="text-xs text-gray-500 dark:text-gray-400">Monthly revenue</p>
            {stats?.revenue_growth_pct !== undefined && (
              <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-600">
                ↑{stats.revenue_growth_pct}%
              </span>
            )}
          </div>
          <p className="text-2xl font-bold text-gray-800 dark:text-white">
            {statsLoading ? "—" : formatRevenue(stats?.monthly_revenue ?? 0)}
          </p>
        </div>

        {/* Free plan users */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03]">
          <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">Free plan users</p>
          <p className="text-2xl font-bold text-gray-800 dark:text-white">
            {statsLoading ? "—" : (stats?.free_plan_users ?? 0)}
          </p>
        </div>
      </div>

      {/* Subscription List Card */}
      <div className="mb-8 rounded-xl border border-gray-200 bg-white shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03]">
        {/* Filter bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-white/[0.05]">
          {/* Tabs */}
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                    isActive
                      ? tab.activeClass
                      : tab.defaultClass
                  }`}
                >
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span
                      className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs ${
                        isActive ? "bg-white/30 text-inherit" : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Right: plan filter + export */}
          <div className="flex items-center gap-2">
            <select
              value={selectedPlanFilter}
              onChange={(e) => setSelectedPlanFilter(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 focus:outline-none dark:border-white/[0.05] dark:bg-white/[0.03] dark:text-gray-300"
            >
              <option value="">All plans</option>
              {plans.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {getPlanDisplayName(p)}
                </option>
              ))}
            </select>
            <button
              onClick={handleExportCSV}
              className="rounded-lg border border-gray-200 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/[0.05] dark:bg-white/[0.03] dark:text-gray-300"
            >
              Export CSV
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="border-b border-gray-100 px-5 py-3 dark:border-white/[0.05]">
          <input
            type="text"
            placeholder="Search by user name or email..."
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full bg-transparent text-sm text-gray-700 placeholder-gray-400 focus:outline-none dark:text-gray-300"
          />
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                {[
                  "User",
                  "Company",
                  "Plan",
                  "Start",
                  "Expiry",
                  // "Amount paid",
                  "Subscription Status",
                  "Actions",
                ].map((h) => (
                  <TableCell
                    key={h}
                    isHeader
                    className="whitespace-nowrap px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400"
                  >
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {loading ? (
                <TableRow>
                  <td
                    colSpan={8}
                    className="py-12 text-center text-sm text-gray-400 dark:text-gray-500"
                  >
                    Loading subscriptions...
                  </td>
                </TableRow>
              ) : subscriptions.length === 0 ? (
                <TableRow>
                  <td
                    colSpan={8}
                    className="py-12 text-center text-sm text-gray-400 dark:text-gray-500"
                  >
                    No subscriptions found
                  </td>
                </TableRow>
              ) : (
                subscriptions.map((sub, idx) => {
                  const subId = getSubscriptionId(sub);
                  const name = getCustomerName(sub);
                  const email = getEmail(sub);
                  const company = getCompanyName(sub);
                  const plan = getPlanName(sub);
                  const startDate = getDateValue(sub, ["start_date", "created_at"]);
                  const endDate = getDateValue(sub, ["end_date", "expiry_date"]);
                  const amount = getAmountPaid(sub);
                  const subscriptionStatus = getSubscriptionStatus(sub);
                  const expiring = isExpiringSoon(sub);
                  const isFailed = subscriptionStatus?.toLowerCase() === "failed" || subscriptionStatus?.toLowerCase() === "past_due";
                  const isLoading = actionLoading === subId;

                  return (
                    <TableRow
                      key={`${subId}-${idx}`}
                      className="hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                    >
                      {/* User */}
                      <TableCell className="px-5 py-3.5">
                        <div className="text-sm font-medium text-gray-800 dark:text-white/90">
                          {name}
                        </div>
                        {email && (
                          <div className="text-xs text-gray-400">{email}</div>
                        )}
                      </TableCell>

                      {/* Company */}
                      <TableCell className="px-5 py-3.5 text-sm text-gray-600 dark:text-gray-400">
                        {company}
                      </TableCell>

                      {/* Plan */}
                      <TableCell className="px-5 py-3.5">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${getPlanBadgeStyle(plan)}`}
                        >
                          {plan}
                        </span>
                      </TableCell>

                      {/* Start */}
                      <TableCell className="px-5 py-3.5 text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(startDate)}
                      </TableCell>

                      {/* Expiry */}
                      <TableCell className="px-5 py-3.5">
                        <span
                          className={`text-sm ${
                            expiring
                              ? "font-medium text-amber-600"
                              : "text-gray-600 dark:text-gray-400"
                          }`}
                        >
                          {formatDate(endDate)}
                          {expiring && <span className="ml-1">⚠</span>}
                        </span>
                      </TableCell>

                      {/* Amount paid */}
                      {/* <TableCell className="px-5 py-3.5 text-sm text-gray-600 dark:text-gray-400">
                        {formatAmount(amount)}
                      </TableCell> */}

                      {/* Subscription Status */}
                      <TableCell className="px-5 py-3.5">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            isFailed
                              ? "bg-red-100 text-red-600"
                              : subscriptionStatus === "active"
                              ? "bg-green-100 text-green-700"
                              : subscriptionStatus === "expired"
                              ? "bg-gray-100 text-gray-700"
                              : subscriptionStatus === "pending_approval"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {subscriptionStatus}
                        </span>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="px-5 py-3.5">
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            onClick={() => handleViewSubscription(sub)}
                            className="rounded-[50px] border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100"
                          >
                            View
                          </button>
                          {!isFailed && (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedSubscription(sub);
                                  setExtendModal(true);
                                }}
                                disabled={isLoading}
                                className="rounded-[50px] bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-200 disabled:opacity-50"
                              >
                                Extend
                              </button>
                              {/* <button
                                onClick={() => {
                                  setSelectedSubscription(sub);
                                  setDiscountModal(true);
                                }}
                                disabled={isLoading}
                                className="rounded-[50px] bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700 transition-colors hover:bg-green-200 disabled:opacity-50"
                              >
                                Give discount
                              </button> */}
                            </>
                          )}
                          {isFailed && (
                            <button
                              onClick={() => handleRetryPayment(sub)}
                              disabled={isLoading}
                              className="rounded-[50px] bg-red-100 px-2.5 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-200 disabled:opacity-50"
                            >
                              Retry payment
                            </button>
                          )}
                          {/* <button
                            onClick={() => handleNeoDovePush(sub)}
                            disabled={isLoading}
                            className="rounded-[50px] bg-gray-900 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-50"
                          >
                            NeoDove
                          </button> */}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3 dark:border-white/[0.05]">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Page {currentPage} of {totalPages} &mdash; {totalCount} total
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="rounded-[50px] border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 dark:border-white/[0.05] dark:text-gray-400"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="rounded-[50px] border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 dark:border-white/[0.05] dark:text-gray-400"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Subscription Plans Section */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-white/[0.05]">
          <h2 className="text-base font-semibold text-gray-800 dark:text-white">
            Subscription plans
          </h2>
          <button
            onClick={() => {
              setPlanForm({ name: "", price: "", plan_type: "paid", features: "", code: "", billing_cycle: "monthly" });
              setAddPlanModal(true);
            }}
            className="rounded-lg border border-emerald-500 px-4 py-1.5 text-sm font-medium text-emerald-600 transition-colors hover:bg-emerald-50"
          >
            + Add new plan
          </button>
        </div>

        <div className="p-5">
          {plansLoading ? (
            <p className="py-8 text-center text-sm text-gray-400">Loading plans...</p>
          ) : plans.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">No plans found</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {plans.map((plan) => {
                const name = getPlanDisplayName(plan);
                const price = getPlanPrice(plan);
                const userCount = getPlanUserCount(plan);
                const features = normalizeFeatures(plan.features);

                return (
                  <div
                    key={plan.id}
                    className="rounded-xl border border-gray-200 p-5 dark:border-white/[0.05]"
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-base font-semibold text-gray-800 dark:text-white">
                          {name}
                        </h3>
                        <p className="text-xs text-gray-400">{userCount} users</p>
                      </div>
                      <span className="shrink-0 text-sm font-bold text-emerald-500">
                        {price !== null && price > 0
                          ? `₹${price.toLocaleString("en-IN")}/month`
                          : "₹0/month"}
                      </span>
                    </div>

                    {features.length > 0 && (
                      <ul className="mb-4 space-y-1.5">
                        {features.map((feat, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400"
                          >
                            <span className="mt-0.5 text-emerald-500">✓</span>
                            {feat}
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditPlan(plan)}
                        className="flex-1 rounded-lg border border-blue-300 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50"
                      >
                        Edit plan
                      </button>
                      <button
                        onClick={() => {
                          setSelectedPlan(plan);
                          setDeletePlanModal(true);
                        }}
                        className="flex-1 rounded-lg border border-red-300 py-2 text-sm font-medium text-red-500 transition-colors hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ── */}

      {/* Extend */}
      <Modal
        isOpen={extendModal}
        onClose={() => {
          setExtendModal(false);
          setSelectedSubscription(null);
        }}
        className="max-w-sm"
      >
        <div className="p-6">
          <h2 className="mb-2 text-center text-lg font-bold text-gray-800 dark:text-white">
            Extend Subscription
          </h2>
          <p className="mb-5 text-center text-sm text-gray-500 dark:text-gray-400">
            Extend for{" "}
            <b>{selectedSubscription ? getCustomerName(selectedSubscription) : ""}</b>
          </p>
          <div className="mb-5">
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Number of days
            </label>
            <input
              type="number"
              value={extendDays}
              onChange={(e) => setExtendDays(e.target.value)}
              min="1"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-white/[0.05] dark:bg-white/[0.03] dark:text-gray-200"
            />
          </div>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => {
                setExtendModal(false);
                setSelectedSubscription(null);
              }}
              className="rounded-[50px] border border-gray-200 px-5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleExtend}
              className="rounded-[50px] bg-amber-500 px-5 py-2 text-sm font-medium text-white hover:bg-amber-600"
            >
              Extend
            </button>
          </div>
        </div>
      </Modal>

      {/* Give Discount */}
      <Modal
        isOpen={discountModal}
        onClose={() => {
          setDiscountModal(false);
          setSelectedSubscription(null);
        }}
        className="max-w-sm"
      >
        <div className="p-6">
          <h2 className="mb-2 text-center text-lg font-bold text-gray-800 dark:text-white">
            Give Discount
          </h2>
          <p className="mb-5 text-center text-sm text-gray-500 dark:text-gray-400">
            Apply discount for{" "}
            <b>{selectedSubscription ? getCustomerName(selectedSubscription) : ""}</b>
          </p>
          <div className="mb-5">
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Discount percentage (%)
            </label>
            <input
              type="number"
              value={discountPct}
              onChange={(e) => setDiscountPct(e.target.value)}
              min="1"
              max="100"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-white/[0.05] dark:bg-white/[0.03] dark:text-gray-200"
            />
          </div>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => {
                setDiscountModal(false);
                setSelectedSubscription(null);
              }}
              className="rounded-[50px] border border-gray-200 px-5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDiscount}
              className="rounded-[50px] bg-emerald-500 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-600"
            >
              Apply Discount
            </button>
          </div>
        </div>
      </Modal>

      {/* Add Plan */}
      <Modal isOpen={addPlanModal} onClose={() => setAddPlanModal(false)} className="max-w-md">
        <div className="p-6">
          <h2 className="mb-5 text-lg font-bold text-gray-800 dark:text-white">Add New Plan</h2>
          <PlanFormFields form={planForm} onChange={setPlanForm} />
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setAddPlanModal(false)}
              className="rounded-[50px] border border-gray-200 px-5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleAddPlan}
              className="rounded-[50px] bg-emerald-500 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-600"
            >
              Add Plan
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Plan */}
      <Modal
        isOpen={editPlanModal}
        onClose={() => {
          setEditPlanModal(false);
          setSelectedPlan(null);
        }}
        className="max-w-md"
      >
        <div className="p-6">
          <h2 className="mb-5 text-lg font-bold text-gray-800 dark:text-white">Edit Plan</h2>
          <PlanFormFields form={planForm} onChange={setPlanForm} />
          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setEditPlanModal(false);
                setSelectedPlan(null);
              }}
              className="rounded-[50px] border border-gray-200 px-5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleEditPlan}
              className="rounded-[50px] bg-blue-500 px-5 py-2 text-sm font-medium text-white hover:bg-blue-600"
            >
              Save Changes
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Plan */}
      <Modal
        isOpen={deletePlanModal}
        onClose={() => {
          setDeletePlanModal(false);
          setSelectedPlan(null);
        }}
        className="max-w-sm"
      >
        <div className="p-6">
          <h2 className="mb-3 text-center text-lg font-bold text-gray-800 dark:text-white">
            Delete Plan
          </h2>
          <p className="mb-6 text-center text-sm text-gray-500 dark:text-gray-400">
            Delete the{" "}
            <b>{selectedPlan ? getPlanDisplayName(selectedPlan) : ""}</b> plan?
            This will fail if active subscribers exist.
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => {
                setDeletePlanModal(false);
                setSelectedPlan(null);
              }}
              className="rounded-[50px] border border-gray-200 px-5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDeletePlan}
              className="rounded-[50px] bg-red-500 px-5 py-2 text-sm font-medium text-white hover:bg-red-600"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>

      {/* View Subscription */}
      <Modal
        isOpen={viewModal}
        onClose={() => { setViewModal(false); setViewData(null); }}
        className="max-w-lg"
      >
        <div className="p-6">
          <h2 className="mb-5 text-lg font-bold text-gray-800 dark:text-white">
            Subscription Details
          </h2>

          {viewLoading ? (
            <p className="py-8 text-center text-sm text-gray-400">Loading...</p>
          ) : viewData ? (() => {
            const v = viewData;
            const plan = v.plan && typeof v.plan === "object" ? (v.plan as Record<string, unknown>) : null;
            const str = (val: unknown) => (val ? String(val) : "—");
            const rows: { label: string; value: string }[] = [
              { label: "Subscriber", value: str(v.user_name) },
              { label: "Email", value: str(v.user_email) },
              { label: "Phone", value: str(v.user_phone) },
              { label: "Company", value: str(v.company_name) },
              { label: "Plan", value: plan ? str(plan.name) : "—" },
              { label: "Plan type", value: plan ? str(plan.plan_type) : "—" },
              { label: "Billing cycle", value: plan ? str(plan.billing_cycle) : "—" },
              { label: "Status", value: str(v.status) },
              { label: "Source", value: str(v.source) },
              { label: "Start date", value: formatDate(v.start_date) },
              { label: "End date", value: formatDate(v.end_date) },
              { label: "Next billing", value: formatDate(v.next_billing_date) },
              {
                label: "Amount",
                value: v.amount !== undefined ? `₹${v.amount} ${v.currency ?? "INR"}` : "—",
              },
              { label: "Auto renew", value: v.auto_renew ? "Yes" : "No" },
              { label: "Current plan", value: v.is_current ? "Yes" : "No" },
            ];
            return (
              <div className="space-y-2">
                {rows.map(({ label, value }) => (
                  <div
                    key={label}
                    className="flex items-start gap-3 rounded-lg bg-gray-50 px-4 py-2.5 dark:bg-white/[0.03]"
                  >
                    <span className="w-36 shrink-0 text-xs font-medium text-gray-500 dark:text-gray-400">
                      {label}
                    </span>
                    <span className="text-sm text-gray-800 dark:text-white/90">{value}</span>
                  </div>
                ))}
              </div>
            );
          })() : null}

          <div className="mt-6 flex justify-end">
            <button
              onClick={() => { setViewModal(false); setViewData(null); }}
              className="rounded-[50px] border border-gray-200 px-5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={closeToast}
      />
    </AdminLayout>
  );
};

export default SubscriptionsPage;
