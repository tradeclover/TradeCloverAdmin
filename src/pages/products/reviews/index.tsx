import { useCallback, useEffect, useRef, useState } from "react";
import AdminLayout from "@/layout/AdminLayout";
import Toast from "@/components/ui/toast/Toast";
import { apiGet } from "@/utils/api";

interface ProductReview {
  id: number;
  product: string;
  product_name?: string | null;
  buyer?: string | null;
  buyer_name?: string | null;
  reviewer?: string | null;
  reviewer_name?: string | null;
  rating: number;
  body?: string | null;
  created_at: string;
}

const formatDate = (value: string | null | undefined) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
};

const StarRating = ({ rating }: { rating: number }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((s) => (
      <svg
        key={s}
        className={`h-3.5 w-3.5 ${s <= rating ? "text-amber-400" : "text-gray-200 dark:text-gray-700"}`}
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ))}
    <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">{rating}/5</span>
  </div>
);

const ProductReviewsPage = () => {
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info"; isVisible: boolean }>({ message: "", type: "success", isVisible: false });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info") =>
    setToast({ message, type, isVisible: true });
  const closeToast = () => setToast((p) => ({ ...p, isVisible: false }));

  const fetchReviews = useCallback(async (slug: string) => {
    try {
      setLoading(true);
      setSearched(true);
      const res = await apiGet(`/products/admin/reviews/?product=${encodeURIComponent(slug)}`);
      const data = res.data;
      setReviews(Array.isArray(data) ? data : (data?.results ?? []));
    } catch {
      showToast("Failed to load reviews", "error");
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!search.trim()) {
      setSearchQuery("");
      setReviews([]);
      setSearched(false);
      setRatingFilter(null);
      return;
    }
    debounceRef.current = setTimeout(() => {
      const slug = search.trim();
      setSearchQuery(slug);
      fetchReviews(slug);
    }, 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search, fetchReviews]);

  const displayed = ratingFilter !== null ? reviews.filter((r) => r.rating === ratingFilter) : reviews;

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : "—";

  const ratingCounts = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));

  const getReviewerName = (r: ProductReview) =>
    r.reviewer_name ?? r.reviewer ?? r.buyer_name ?? r.buyer ?? "—";

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-title-md font-bold text-gray-800 dark:text-white/90">Product Reviews</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          View all buyer reviews across products
        </p>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-7">
        <div className="col-span-2 sm:col-span-1 lg:col-span-2 rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm dark:border-white/[0.06] dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Reviews</p>
          <p className="mt-1 text-3xl font-bold text-gray-800 dark:text-white/90">{loading ? "—" : reviews.length}</p>
        </div>
        <div className="col-span-2 sm:col-span-1 lg:col-span-2 rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm dark:border-white/[0.06] dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500 dark:text-gray-400">Avg Rating</p>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-3xl font-bold text-amber-500">{loading ? "—" : avgRating}</span>
            {!loading && reviews.length > 0 && <span className="text-sm text-gray-400">/ 5</span>}
          </div>
        </div>
        {ratingCounts.map(({ star, count }) => (
          <button
            key={star}
            onClick={() => setRatingFilter(ratingFilter === star ? null : star)}
            className={`rounded-2xl border px-4 py-3 text-left shadow-sm transition-colors ${
              ratingFilter === star
                ? "border-amber-400 bg-amber-50 dark:bg-amber-500/10"
                : "border-gray-100 bg-white hover:border-amber-300 hover:bg-amber-50/50 dark:border-white/[0.06] dark:bg-white/[0.03]"
            }`}
          >
            <div className="flex items-center gap-1 mb-0.5">
              <svg className="h-3 w-3 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{star}</span>
            </div>
            <p className="text-xl font-bold text-gray-800 dark:text-white/90">{loading ? "—" : count}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by product slug…"
            className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-white/[0.1] dark:bg-white/[0.05] dark:text-gray-200"
          />
        </div>
        {ratingFilter !== null && (
          <button
            onClick={() => setRatingFilter(null)}
            className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100"
          >
            <svg className="h-3 w-3 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            {ratingFilter} star — clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03]">
        {!searched && !loading ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2 text-center">
            <svg className="h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
            </svg>
            <p className="text-sm text-gray-400">Enter a product slug above to load its reviews</p>
          </div>
        ) : loading ? (
          <div className="flex h-48 items-center justify-center text-sm text-gray-400">Loading reviews…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-100 dark:border-white/[0.05]">
                  {["Product", "Reviewer", "Rating", "Review", "Date"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-white/[0.04]">
                {displayed.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-sm text-gray-400">
                      No reviews for <span className="font-medium text-gray-600 dark:text-gray-300">{searchQuery}</span>
                    </td>
                  </tr>
                ) : (
                  displayed.map((r) => (
                    <tr key={r.id} className="transition-colors hover:bg-gray-50/60 dark:hover:bg-white/[0.02]">
                      <td className="px-5 py-4 max-w-[180px]">
                        <p className="truncate text-sm font-medium text-gray-800 dark:text-white/90">
                          {r.product_name ?? r.product}
                        </p>
                        {r.product_name && (
                          <p className="truncate text-xs font-mono text-gray-400">{r.product}</p>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm text-gray-700 dark:text-white/80">{getReviewerName(r)}</p>
                      </td>
                      <td className="px-5 py-4">
                        <StarRating rating={r.rating} />
                      </td>
                      <td className="px-5 py-4 max-w-[300px]">
                        {r.body ? (
                          <p className="line-clamp-2 text-sm text-gray-600 dark:text-gray-300">{r.body}</p>
                        ) : (
                          <span className="text-xs text-gray-400">No text</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {formatDate(r.created_at)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Toast message={toast.message} type={toast.type} isVisible={toast.isVisible} onClose={closeToast} />
    </AdminLayout>
  );
};

export default ProductReviewsPage;
