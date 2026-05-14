import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import AdminLayout from "@/layout/AdminLayout";
import Toast from "@/components/ui/toast/Toast";
import { apiGet } from "@/utils/api";

interface ProductDetail {
  id: number;
  product_code: string;
  product_name: string;
  slug: string;
  product_images: string[];
  unit_price: string;
  price_on_request: boolean;
  currency: string;
  status: string;
  category: { id: number; name: string };
}

interface Order {
  id: number;
  buyer: number;
  buyer_name: string;
  seller: number;
  seller_name: string;
  product_id: number;
  product_detail: ProductDetail;
  quantity: number;
  price: string;
  total_amount: string;
  paid_amount: string;
  currency: string;
  delivery_date: string | null;
  payment_status: string;
  status: string;
  proof_of_delivery: string[];
  proof_of_payment: string[];
  created_at: string;
}

interface Stats {
  total_orders: number;
  confirmed_orders: number;
  cancelled_orders: number;
}

const PAGE_SIZE = 20;

const STATUS_TABS = [
  { value: "", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "confirmed", label: "Confirmed" },
  { value: "out_for_delivery", label: "Out for Delivery" },
  { value: "delivered", label: "Delivered" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const statusTabStyle = (tab: string, active: string) => {
  const isActive = tab === active;
  if (tab === "draft")
    return isActive
      ? "border border-amber-400 bg-amber-50 text-amber-700 font-semibold"
      : "border border-amber-200 bg-amber-50/50 text-amber-500 hover:bg-amber-50 hover:text-amber-600";
  if (tab === "confirmed")
    return isActive
      ? "border border-green-400 bg-green-50 text-green-700 font-semibold"
      : "border border-green-200 bg-green-50/50 text-green-500 hover:bg-green-50 hover:text-green-600";
  if (tab === "out_for_delivery")
    return isActive
      ? "border border-indigo-400 bg-indigo-50 text-indigo-700 font-semibold"
      : "border border-indigo-200 bg-indigo-50/50 text-indigo-400 hover:bg-indigo-50 hover:text-indigo-600";
  if (tab === "delivered")
    return isActive
      ? "border border-teal-400 bg-teal-50 text-teal-700 font-semibold"
      : "border border-teal-200 bg-teal-50/50 text-teal-500 hover:bg-teal-50 hover:text-teal-600";
  if (tab === "completed")
    return isActive
      ? "border border-blue-400 bg-blue-50 text-blue-700 font-semibold"
      : "border border-blue-200 bg-blue-50/50 text-blue-400 hover:bg-blue-50 hover:text-blue-600";
  if (tab === "cancelled")
    return isActive
      ? "border border-red-400 bg-red-50 text-red-600 font-semibold"
      : "border border-red-200 bg-red-50/50 text-red-400 hover:bg-red-50 hover:text-red-500";
  return isActive
    ? "border border-gray-700 bg-gray-700 text-white font-semibold"
    : "border border-gray-200 bg-gray-100 text-gray-600 hover:bg-gray-200";
};

const statusBadge = (s: string) => {
  if (s === "confirmed") return "bg-green-50 text-green-700 border border-green-200";
  if (s === "completed") return "bg-blue-50 text-blue-700 border border-blue-200";
  if (s === "delivered") return "bg-teal-50 text-teal-700 border border-teal-200";
  if (s === "out_for_delivery") return "bg-indigo-50 text-indigo-700 border border-indigo-200";
  if (s === "cancelled") return "bg-red-50 text-red-600 border border-red-200";
  if (s === "draft") return "bg-amber-50 text-amber-700 border border-amber-200";
  return "bg-gray-100 text-gray-600 border border-gray-200";
};

const paymentBadge = (s: string) => {
  if (s === "fully_paid") return "bg-green-50 text-green-700";
  if (s === "partially_paid") return "bg-amber-50 text-amber-700";
  if (s === "unpaid") return "bg-red-50 text-red-600";
  return "bg-gray-100 text-gray-600";
};

const statusLabel = (s: string) =>
  s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

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
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const formatDate = (value: string | null | undefined) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
};

const OrdersPage = () => {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<Stats>({ total_orders: 0, confirmed_orders: 0, cancelled_orders: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("");
  const [search, setSearch] = useState("");
  const [exportLoading, setExportLoading] = useState(false);
  const [pagination, setPagination] = useState({
    count: 0,
    next: null as string | null,
    previous: null as string | null,
    currentPage: 1,
    totalPages: 1,
  });
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
    isVisible: boolean;
  }>({ message: "", type: "success", isVisible: false });
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info") =>
    setToast({ message, type, isVisible: true });
  const closeToast = () => setToast((prev) => ({ ...prev, isVisible: false }));

  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const res = await apiGet("/orders/admin/stats/");
      setStats(res.data);
    } catch {
      // non-critical
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchOrders = useCallback(async (page: number, status: string, searchVal: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page) });
      if (status) params.set("status", status);
      if (searchVal.trim()) params.set("search", searchVal.trim());
      const res = await apiGet(`/orders/admin/?${params.toString()}`);
      const data = res.data;
      setOrders(Array.isArray(data.results) ? data.results : []);
      const count = data.count ?? 0;
      setPagination({
        count,
        next: data.next ?? null,
        previous: data.previous ?? null,
        currentPage: page,
        totalPages: Math.max(1, Math.ceil(count / PAGE_SIZE)),
      });
    } catch {
      showToast("Failed to fetch orders", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      fetchOrders(1, activeTab, search);
    }, 400);
    return () => {
      if (searchDebounce.current) clearTimeout(searchDebounce.current);
    };
  }, [fetchOrders, search, activeTab]);

  const goToPage = (page: number) => fetchOrders(page, activeTab, search);

  const handleExportCSV = async () => {
    try {
      setExportLoading(true);
      const params = new URLSearchParams();
      if (activeTab) params.set("status", activeTab);
      if (search.trim()) params.set("search", search.trim());
      const res = await apiGet(`/orders/admin/export-csv/?${params.toString()}`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `orders-${Date.now()}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      showToast("Export failed", "error");
    } finally {
      setExportLoading(false);
    }
  };

  const statCards = [
    { label: "Total orders", value: statsLoading ? "—" : stats.total_orders, valueColor: "text-gray-800 dark:text-white/90" },
    { label: "Confirmed", value: statsLoading ? "—" : stats.confirmed_orders, valueColor: "text-green-600" },
    { label: "Cancelled", value: statsLoading ? "—" : stats.cancelled_orders, valueColor: "text-red-500" },
  ];

  return (
    <AdminLayout>
      <h1 className="mb-6 text-title-md font-bold text-gray-800 dark:text-white/90">Orders</h1>

      {/* Stats */}
      <div className="mb-6 flex flex-wrap gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="flex min-w-[150px] flex-col gap-1 rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm dark:border-white/[0.06] dark:bg-white/[0.03]"
          >
            <span className="text-sm text-gray-500 dark:text-gray-400">{card.label}</span>
            <span className={`text-3xl font-bold ${card.valueColor}`}>{card.value}</span>
          </div>
        ))}
      </div>

      {/* Export CSV */}
      <div className="mb-3 flex justify-end">
        <button
          onClick={handleExportCSV}
          disabled={exportLoading}
          className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {exportLoading ? "Exporting…" : "Export CSV"}
        </button>
      </div>

      {/* Status tabs */}
      <div className="mb-4 overflow-x-auto">
        <div className="flex min-w-max items-center gap-2 pb-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm transition-colors ${statusTabStyle(tab.value, activeTab)}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative w-full min-w-0 sm:flex-1 sm:max-w-lg">
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
            placeholder="Search by order ID, buyer, seller name…"
            className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-white/[0.1] dark:bg-white/[0.05] dark:text-gray-200"
          />
        </div>

        {search && (
          <button
            onClick={() => setSearch("")}
            className="text-xs text-gray-400 underline hover:text-gray-600 dark:hover:text-gray-200"
          >
            Clear
          </button>
        )}

        <span className="ml-auto text-sm text-gray-400 dark:text-gray-500">
          {pagination.count} order{pagination.count !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03]">
        {loading ? (
          <div className="flex h-48 items-center justify-center text-sm text-gray-400">
            Loading orders…
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px]">
              <thead>
                <tr className="border-b border-gray-100 dark:border-white/[0.05]">
                  {["Order ID", "Buyer", "Seller", "Product", "Qty", "Amount", "Status", "Date", "Actions"].map((h) => (
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
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-10 text-center text-sm text-gray-400 dark:text-gray-500">
                      No orders found
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => {
                    const thumb = order.product_detail?.product_images?.[0];
                    return (
                      <tr
                        key={order.id}
                        className="transition-colors hover:bg-gray-50/60 dark:hover:bg-white/[0.02]"
                      >
                        {/* Order ID */}
                        <td className="px-5 py-4">
                          <span className="text-sm font-semibold text-gray-700 dark:text-white/80">
                            #TC-{String(order.id).padStart(4, "0")}
                          </span>
                        </td>

                        {/* Buyer */}
                        <td className="px-5 py-4">
                          <div className="text-sm font-medium text-gray-800 dark:text-white/90">
                            {order.buyer_name || "—"}
                          </div>
                        </td>

                        {/* Seller */}
                        <td className="px-5 py-4">
                          <div className="text-sm text-gray-600 dark:text-gray-300">
                            {order.seller_name || "—"}
                          </div>
                        </td>

                        {/* Product */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-gray-100 bg-gray-50 text-[10px] font-semibold text-gray-400 dark:border-white/[0.08] dark:bg-white/[0.05]">
                              {thumb ? (
                                <img src={thumb} alt={order.product_detail?.product_name} className="h-full w-full object-cover" />
                              ) : "IMG"}
                            </div>
                            <span className="text-sm text-gray-700 dark:text-white/80">
                              {order.product_detail?.product_name || "—"}
                            </span>
                          </div>
                        </td>

                        {/* Qty */}
                        <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
                          {order.quantity}
                        </td>

                        {/* Amount */}
                        <td className="px-5 py-4">
                          <div className="text-sm font-medium text-gray-800 dark:text-white/90">
                            ₹{Number(order.total_amount).toLocaleString("en-IN")}
                          </div>
                          <div className={`mt-0.5 inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium ${paymentBadge(order.payment_status)}`}>
                            {statusLabel(order.payment_status)}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusBadge(order.status)}`}>
                            {statusLabel(order.status)}
                          </span>
                        </td>

                        {/* Date */}
                        <td className="px-5 py-4 text-sm text-gray-400 dark:text-gray-500">
                          {formatRelative(order.created_at)}
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => router.push(`/orders/order-detail?id=${order.id}`)}
                              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 dark:border-white/[0.1] dark:text-gray-300"
                            >
                              View
                            </button>
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
      {pagination.totalPages > 1 && (
        <div className="mt-5 flex items-center justify-center gap-1">
          <button
            onClick={() => goToPage(pagination.currentPage - 1)}
            disabled={!pagination.previous}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/[0.1] dark:text-gray-300"
          >
            ← Prev
          </button>
          {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
            .filter(
              (p) =>
                p === 1 ||
                p === pagination.totalPages ||
                Math.abs(p - pagination.currentPage) <= 1
            )
            .reduce<(number | "…")[]>((acc, p, idx, arr) => {
              if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("…");
              acc.push(p);
              return acc;
            }, [])
            .map((p, idx) =>
              p === "…" ? (
                <span key={`e-${idx}`} className="px-2 text-gray-400">…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => goToPage(p as number)}
                  className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                    p === pagination.currentPage
                      ? "border-blue-500 bg-blue-500 text-white"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-white/[0.1] dark:text-gray-300"
                  }`}
                >
                  {p}
                </button>
              )
            )}
          <button
            onClick={() => goToPage(pagination.currentPage + 1)}
            disabled={!pagination.next}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/[0.1] dark:text-gray-300"
          >
            Next →
          </button>
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

export default OrdersPage;
