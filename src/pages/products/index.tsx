import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import AdminLayout from "@/layout/AdminLayout";
import Toast from "@/components/ui/toast/Toast";
import { apiGet, apiPost } from "@/utils/api";

interface Product {
  id: number;
  slug: string;
  product_name: string;
  product_code: string;
  category: string;
  subcategory: string;
  product_images: string[];
  unit_price: string | null;
  price_on_request: boolean;
  currency: string;
  minimum_order_quantity: number;
  location: string | null;
  status: string;
  created_at: string;
}

interface Category {
  id: number;
  name: string;
}

interface Stats {
  pending: number;
  approved: number;
  rejected: number;
}

const PAGE_SIZE = 10;

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

const ProductsPage = () => {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState<Stats>({ pending: 0, approved: 0, rejected: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
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
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [approveModal, setApproveModal] = useState<{
    open: boolean;
    product: Product | null;
  }>({ open: false, product: null });
  const [bulkApproveModal, setBulkApproveModal] = useState(false);
  const [rejectModal, setRejectModal] = useState<{
    open: boolean;
    productId: number | null;
    productName: string;
    reason: string;
  }>({ open: false, productId: null, productName: "", reason: "" });
  const [bulkRejectModal, setBulkRejectModal] = useState({ open: false, reason: "" });

  const showToast = (message: string, type: "success" | "error" | "info") =>
    setToast({ message, type, isVisible: true });
  const closeToast = () => setToast((prev) => ({ ...prev, isVisible: false }));

  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const [pendingRes, approvedRes, rejectedRes] = await Promise.allSettled([
        apiGet("/products/admin/stats/pending-approval/"),
        apiGet("/products/admin/stats/approved-live/"),
        apiGet("/products/admin/stats/rejected/"),
      ]);
      setStats({
        pending:
          pendingRes.status === "fulfilled"
            ? (pendingRes.value.data?.pending_approval_count ?? 0)
            : 0,
        approved:
          approvedRes.status === "fulfilled"
            ? (approvedRes.value.data?.approved_live_count ?? 0)
            : 0,
        rejected:
          rejectedRes.status === "fulfilled"
            ? (rejectedRes.value.data?.rejected_count ?? 0)
            : 0,
      });
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchProducts = useCallback(
    async (page: number, searchVal: string, category: string) => {
      try {
        setLoading(true);
        const params = new URLSearchParams({ page: String(page) });
        if (searchVal.trim()) params.set("search", searchVal.trim());
        if (category) params.set("category_id", category);
        const response = await apiGet(`/products/admin/list/?${params.toString()}`);
        const data = response.data;
        setProducts(Array.isArray(data.results) ? data.results : []);
        const count = data.count ?? 0;
        setPagination({
          count,
          next: data.next ?? null,
          previous: data.previous ?? null,
          currentPage: page,
          totalPages: Math.max(1, Math.ceil(count / PAGE_SIZE)),
        });
      } catch {
        showToast("Failed to fetch products", "error");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const fetchCategories = useCallback(async () => {
    try {
      const res = await apiGet("/products/categories-list/");
      setCategories(Array.isArray(res.data) ? res.data : []);
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchCategories();
  }, [fetchStats, fetchCategories]);

  // Debounce search, immediate on category change
  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      fetchProducts(1, search, categoryFilter);
    }, 400);
    return () => {
      if (searchDebounce.current) clearTimeout(searchDebounce.current);
    };
  }, [fetchProducts, search, categoryFilter]);

  const goToPage = (page: number) => fetchProducts(page, search, categoryFilter);

  const handleApproveConfirm = async () => {
    const product = approveModal.product;
    if (!product) return;
    setApproveModal({ open: false, product: null });
    try {
      setActionLoading(product.id);
      await apiPost(`/products/admin/${product.id}/review/`, { action: "active" });
      showToast("Product approved successfully", "success");
      fetchProducts(pagination.currentPage, search, categoryFilter);
      fetchStats();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string; error?: string; detail?: string } } })
          ?.response?.data?.message ||
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      showToast(msg || "Failed to approve product", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectModal.productId) return;
    try {
      setActionLoading(rejectModal.productId);
      const payload: { action: string; reason?: string } = { action: "rejected" };
      if (rejectModal.reason.trim()) payload.reason = rejectModal.reason.trim();
      await apiPost(`/products/admin/${rejectModal.productId}/review/`, payload);
      showToast("Product rejected", "success");
      setRejectModal({ open: false, productId: null, productName: "", reason: "" });
      fetchProducts(pagination.currentPage, search, categoryFilter);
      fetchStats();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string; error?: string; detail?: string } } })
          ?.response?.data?.message ||
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      showToast(msg || "Failed to reject product", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const allPageIds = products.map((p) => p.id);
  const allSelected = allPageIds.length > 0 && allPageIds.every((id) => selectedIds.has(id));
  const someSelected = allPageIds.some((id) => selectedIds.has(id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        allPageIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => new Set([...prev, ...allPageIds]));
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const extractApiError = (err: unknown) => {
    const e = err as { response?: { data?: { message?: string; error?: string; detail?: string } } };
    return e?.response?.data?.message || e?.response?.data?.error || e?.response?.data?.detail;
  };

  const handleBulkApprove = async () => {
    setBulkApproveModal(false);
    const ids = [...selectedIds];
    if (!ids.length) return;
    try {
      setBulkLoading(true);
      const res = await apiPost("/products/admin/bulk-review/", { product_ids: ids, action: "active" });
      const { processed_count, skipped_count } = res.data;
      showToast(
        `Approved ${processed_count} product${processed_count !== 1 ? "s" : ""}${skipped_count ? ` · ${skipped_count} skipped` : ""}`,
        "success"
      );
      setSelectedIds(new Set());
      fetchProducts(pagination.currentPage, search, categoryFilter);
      fetchStats();
    } catch (err) {
      showToast(extractApiError(err) || "Bulk approve failed", "error");
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkRejectSubmit = async () => {
    const ids = [...selectedIds];
    if (!ids.length) return;
    try {
      setBulkLoading(true);
      const payload: { product_ids: number[]; action: string; reason?: string } = {
        product_ids: ids,
        action: "rejected",
      };
      if (bulkRejectModal.reason.trim()) payload.reason = bulkRejectModal.reason.trim();
      const res = await apiPost("/products/admin/bulk-review/", payload);
      const { processed_count, skipped_count } = res.data;
      showToast(
        `Rejected ${processed_count} product${processed_count !== 1 ? "s" : ""}${skipped_count ? ` · ${skipped_count} skipped` : ""}`,
        "success"
      );
      setBulkRejectModal({ open: false, reason: "" });
      setSelectedIds(new Set());
      fetchProducts(pagination.currentPage, search, categoryFilter);
      fetchStats();
    } catch (err) {
      showToast(extractApiError(err) || "Bulk reject failed", "error");
    } finally {
      setBulkLoading(false);
    }
  };

  const statCards = [
    {
      label: "Approved & live",
      value: statsLoading ? "—" : stats.approved,
      badge: null,
      valueColor: "text-green-600",
    },
    {
      label: "Pending approval",
      value: statsLoading ? "—" : stats.pending,
      badge: { text: "review", cls: "bg-red-100 text-red-500" },
      valueColor: "text-amber-600",
    },
    {
      label: "Rejected",
      value: statsLoading ? "—" : stats.rejected,
      badge: null,
      valueColor: "text-red-500",
    },
  ];

  return (
    <AdminLayout>
      <h1 className="mb-6 text-title-md font-bold text-gray-800 dark:text-white/90">Products</h1>

      {/* Stats */}
      <div className="mb-6 flex flex-wrap gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="flex min-w-[150px] flex-col gap-1 rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm dark:border-white/[0.06] dark:bg-white/[0.03]"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">{card.label}</span>
              {card.badge && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${card.badge.cls}`}
                >
                  {card.badge.text}
                </span>
              )}
            </div>
            <span className={`text-3xl font-bold ${card.valueColor}`}>{card.value}</span>
          </div>
        ))}
      </div>

      {/* Search + Category filter */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-lg">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
            />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by product name, code…"
            className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-white/[0.1] dark:bg-white/[0.05] dark:text-gray-200"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-white/[0.1] dark:bg-white/[0.05] dark:text-gray-300"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {(search || categoryFilter) && (
          <button
            onClick={() => { setSearch(""); setCategoryFilter(""); }}
            className="text-xs text-gray-400 underline hover:text-gray-600 dark:hover:text-gray-200"
          >
            Clear
          </button>
        )}

        <span className="ml-auto text-sm text-gray-400 dark:text-gray-500">
          {pagination.count} product{pagination.count !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="mb-3 flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-2.5 dark:border-blue-900/30 dark:bg-blue-900/10">
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
            {selectedIds.size} selected
          </span>
          <button
            onClick={() => setBulkApproveModal(true)}
            disabled={bulkLoading}
            className="rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {bulkLoading ? "Processing…" : "Bulk approve"}
          </button>
          <button
            onClick={() => setBulkRejectModal({ open: true, reason: "" })}
            disabled={bulkLoading}
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Bulk reject
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto text-xs text-blue-500 underline hover:text-blue-700"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03]">
        {loading ? (
          <div className="flex h-48 items-center justify-center text-sm text-gray-400">
            Loading products…
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-gray-100 dark:border-white/[0.05]">
                <th className="px-5 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 cursor-pointer rounded border-gray-300 accent-blue-500"
                  />
                </th>
                {["#", "Product Code", "Product", "Category", "Price", "Location", "Added", "Status", "Actions"].map((h) => (
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
              {products.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-5 py-10 text-center text-sm text-gray-400 dark:text-gray-500"
                  >
                    No products found
                  </td>
                </tr>
              ) : (
                products.map((product, index) => {
                  const thumb = product.product_images?.[0];
                  const price = product.price_on_request
                    ? "On Request"
                    : product.unit_price
                    ? `₹${Number(product.unit_price).toLocaleString("en-IN")}`
                    : "—";

                  return (
                    <tr
                      key={product.id}
                      className="transition-colors hover:bg-gray-50/60 dark:hover:bg-white/[0.02]"
                    >
                      {/* Checkbox */}
                      <td className="px-5 py-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(product.id)}
                          onChange={() => toggleSelect(product.id)}
                          className="h-4 w-4 cursor-pointer rounded border-gray-300 accent-blue-500"
                        />
                      </td>

                      {/* Sr. No. */}
                      <td className="px-5 py-4 text-sm text-gray-400 dark:text-gray-500">
                        {(pagination.currentPage - 1) * PAGE_SIZE + index + 1}
                      </td>

                      {/* Code */}
                      <td className="px-5 py-4 text-sm font-mono text-gray-500 dark:text-gray-400">
                        {product.product_code}
                      </td>

                      {/* Product */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-100 bg-gray-50 text-xs font-semibold text-gray-400 dark:border-white/[0.08] dark:bg-white/[0.05]">
                            {thumb ? (
                              <img
                                src={thumb}
                                alt={product.product_name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              "IMG"
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-800 dark:text-white/90">
                              {product.product_name}
                            </div>
                            <div className="text-xs text-gray-400 dark:text-gray-500">
                              {/* {product.product_images.length} image
                              {product.product_images.length !== 1 ? "s" : ""} · MOQ:{" "} */}
                              {/* /* ashish changes */ }
                                {product.product_images?.length ?? 0} image
                                {(product.product_images?.length ?? 0) !== 1 ? "s" : ""} · MOQ:{" "}

                              {product.minimum_order_quantity}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-5 py-4">
                        <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-white/[0.08] dark:text-gray-300">
                          {product.category}
                        </span>
                        {product.subcategory && product.subcategory !== product.category && (
                          <div className="mt-0.5 text-xs text-gray-400">{product.subcategory}</div>
                        )}
                      </td>

                      {/* Price */}
                      <td className="px-5 py-4 text-sm font-medium text-gray-700 dark:text-white/80">
                        {price}
                      </td>

                      {/* Location */}
                      <td className="px-5 py-4 text-sm text-gray-400 dark:text-gray-500">
                        {product.location ?? "—"}
                      </td>

                      {/* Added */}
                      <td className="px-5 py-4 text-sm text-gray-400 dark:text-gray-500">
                        {formatRelative(product.created_at)}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        {(() => {
                          const s = product.status;
                          const cfg =
                            s === "active"
                              ? "bg-green-50 text-green-700 border border-green-200"
                              : s === "pending_approval"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : s === "rejected"
                              ? "bg-red-50 text-red-600 border border-red-200"
                              : "bg-gray-100 text-gray-600 border border-gray-200";
                          const label =
                            s === "active"
                              ? "Approved"
                              : s === "pending_approval"
                              ? "Pending"
                              : s === "rejected"
                              ? "Rejected"
                              : s;
                          return (
                            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${cfg}`}>
                              {label}
                            </span>
                          );
                        })()}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              router.push(`/products/product-detail?slug=${product.slug}`)
                            }
                            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 dark:border-white/[0.1] dark:text-gray-300 dark:hover:border-blue-700 dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
                          >
                            View
                          </button>

                          {product.status === "pending_approval" && (
                            <>
                              <button
                                onClick={() => setApproveModal({ open: true, product })}
                                disabled={actionLoading === product.id}
                                className="rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 transition-colors hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {actionLoading === product.id ? "…" : "Approve"}
                              </button>
                              <button
                                onClick={() =>
                                  setRejectModal({
                                    open: true,
                                    productId: product.id,
                                    productName: product.product_name,
                                    reason: "",
                                  })
                                }
                                disabled={actionLoading === product.id}
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
            Previous
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
                <span key={`e-${idx}`} className="px-2 text-gray-400">
                  …
                </span>
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
            Next
          </button>
        </div>
      )}

      {/* Approve confirmation modal */}
      {approveModal.open && approveModal.product && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <h3 className="mb-1 text-base font-semibold text-gray-800 dark:text-white/90">
              Approve product
            </h3>
            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
              Are you sure you want to approve{" "}
              <span className="font-medium text-gray-700 dark:text-white/80">
                {approveModal.product.product_name}
              </span>
              ? It will go live immediately.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setApproveModal({ open: false, product: null })}
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

      {/* Bulk approve confirmation modal */}
      {bulkApproveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <h3 className="mb-1 text-base font-semibold text-gray-800 dark:text-white/90">
              Bulk approve
            </h3>
            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
              Are you sure you want to approve{" "}
              <span className="font-medium text-gray-700 dark:text-white/80">
                {selectedIds.size} product{selectedIds.size !== 1 ? "s" : ""}
              </span>
              ? Only pending products will be affected and they will go live immediately.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setBulkApproveModal(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-white/[0.1] dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkApprove}
                disabled={bulkLoading}
                className="rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {bulkLoading ? "Approving…" : "Confirm Approve"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject modal */}
      {rejectModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <h3 className="mb-1 text-base font-semibold text-gray-800 dark:text-white/90">
              Reject product
            </h3>
            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
              {rejectModal.productName}
            </p>
            <textarea
              value={rejectModal.reason}
              onChange={(e) =>
                setRejectModal((prev) => ({ ...prev, reason: e.target.value }))
              }
              placeholder="Rejection reason (optional)"
              rows={3}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-300 dark:border-white/[0.1] dark:bg-white/[0.05] dark:text-gray-200"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() =>
                  setRejectModal({ open: false, productId: null, productName: "", reason: "" })
                }
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-white/[0.1] dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectSubmit}
                disabled={actionLoading !== null}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionLoading !== null ? "Rejecting…" : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk reject modal */}
      {bulkRejectModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <h3 className="mb-1 text-base font-semibold text-gray-800 dark:text-white/90">
              Bulk reject
            </h3>
            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
              {selectedIds.size} product{selectedIds.size !== 1 ? "s" : ""} selected. Only pending products will be affected.
            </p>
            <textarea
              value={bulkRejectModal.reason}
              onChange={(e) => setBulkRejectModal((prev) => ({ ...prev, reason: e.target.value }))}
              placeholder="Rejection reason (optional, applied to all)"
              rows={3}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-300 dark:border-white/[0.1] dark:bg-white/[0.05] dark:text-gray-200"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setBulkRejectModal({ open: false, reason: "" })}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-white/[0.1] dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkRejectSubmit}
                disabled={bulkLoading}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {bulkLoading ? "Rejecting…" : "Confirm Reject"}
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

export default ProductsPage;
