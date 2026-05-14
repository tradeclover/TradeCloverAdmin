import { useCallback, useEffect, useRef, useState } from "react";
import AdminLayout from "@/layout/AdminLayout";
import Toast from "@/components/ui/toast/Toast";
import { apiDelete, apiGet, apiPatch } from "@/utils/api";

interface BlogComment {
  id: number;
  post: string;
  post_title?: string | null;
  name: string;
  email?: string | null;
  body: string;
  is_active: boolean;
  created_at: string;
}

const formatDate = (value: string | null | undefined) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
};

const BlogCommentsPage = () => {
  const [comments, setComments] = useState<BlogComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; comment: BlogComment | null }>({ open: false, comment: null });
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info"; isVisible: boolean }>({ message: "", type: "success", isVisible: false });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info") =>
    setToast({ message, type, isVisible: true });
  const closeToast = () => setToast((p) => ({ ...p, isVisible: false }));

  const fetchComments = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set("post", searchQuery.trim());
      if (statusFilter === "active") params.set("is_active", "true");
      if (statusFilter === "inactive") params.set("is_active", "false");
      const res = await apiGet(`/cms/admin/comments/?${params.toString()}`);
      const data = res.data;
      setComments(Array.isArray(data) ? data : (data?.results ?? []));
    } catch {
      showToast("Failed to load comments", "error");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearchQuery(search), 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  const handleToggleActive = async (comment: BlogComment) => {
    try {
      setActionLoading(comment.id);
      await apiPatch(`/cms/admin/comments/${comment.id}/`, { is_active: !comment.is_active });
      showToast(`Comment ${comment.is_active ? "deactivated" : "activated"}`, "success");
      fetchComments();
    } catch {
      showToast("Failed to update comment", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteConfirm = async () => {
    const comment = deleteModal.comment;
    if (!comment) return;
    setDeleteModal({ open: false, comment: null });
    try {
      setActionLoading(comment.id);
      await apiDelete(`/cms/admin/comments/${comment.id}/`);
      showToast("Comment deleted", "success");
      fetchComments();
    } catch {
      showToast("Failed to delete comment", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const totalActive = comments.filter((c) => c.is_active).length;
  const totalInactive = comments.filter((c) => !c.is_active).length;

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-title-md font-bold text-gray-800 dark:text-white/90">Blog Comments</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Moderate and manage comments on blog posts
        </p>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        {[
          { label: "Total", value: comments.length, color: "text-gray-800 dark:text-white/90" },
          { label: "Active", value: totalActive, color: "text-green-600" },
          { label: "Inactive", value: totalInactive, color: "text-red-500" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm dark:border-white/[0.06] dark:bg-white/[0.03]">
            <p className="text-sm text-gray-500 dark:text-gray-400">{s.label}</p>
            <p className={`mt-1 text-3xl font-bold ${s.color}`}>{loading ? "—" : s.value}</p>
          </div>
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
            placeholder="Filter by post slug…"
            className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-white/[0.1] dark:bg-white/[0.05] dark:text-gray-200"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "active", "inactive"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors capitalize ${
                statusFilter === f
                  ? f === "active"
                    ? "border-green-400 bg-green-50 text-green-700"
                    : f === "inactive"
                    ? "border-red-300 bg-red-50 text-red-600"
                    : "border-gray-700 bg-gray-700 text-white"
                  : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03]">
        {loading ? (
          <div className="flex h-48 items-center justify-center text-sm text-gray-400">Loading comments…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-gray-100 dark:border-white/[0.05]">
                  {["Post", "Author", "Comment", "Status", "Date", "Actions"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-white/[0.04]">
                {comments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-400">No comments found</td>
                  </tr>
                ) : (
                  comments.map((c) => (
                    <tr key={c.id} className="transition-colors hover:bg-gray-50/60 dark:hover:bg-white/[0.02]">
                      <td className="px-5 py-4 max-w-[180px]">
                        <p className="truncate text-sm font-medium text-blue-600 dark:text-blue-400">
                          {c.post_title ?? c.post}
                        </p>
                        {c.post_title && (
                          <p className="truncate text-xs font-mono text-gray-400">{c.post}</p>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm font-medium text-gray-800 dark:text-white/90">{c.name}</p>
                        {c.email && <p className="text-xs text-gray-400">{c.email}</p>}
                      </td>
                      <td className="px-5 py-4 max-w-[260px]">
                        <p className="line-clamp-2 text-sm text-gray-600 dark:text-gray-300">{c.body}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          c.is_active
                            ? "border border-green-200 bg-green-50 text-green-700"
                            : "border border-red-200 bg-red-50 text-red-600"
                        }`}>
                          {c.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {formatDate(c.created_at)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleActive(c)}
                            disabled={actionLoading === c.id}
                            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                              c.is_active
                                ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                                : "border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                            }`}
                          >
                            {actionLoading === c.id ? "…" : c.is_active ? "Deactivate" : "Activate"}
                          </button>
                          <button
                            onClick={() => setDeleteModal({ open: true, comment: c })}
                            disabled={actionLoading === c.id}
                            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {deleteModal.open && deleteModal.comment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <h3 className="mb-1 text-base font-semibold text-gray-800 dark:text-white/90">Delete comment?</h3>
            <p className="mb-1 text-sm text-gray-500 dark:text-gray-400">
              By <span className="font-medium text-gray-700 dark:text-white/80">{deleteModal.comment.name}</span> on{" "}
              <span className="font-medium text-gray-700 dark:text-white/80">{deleteModal.comment.post_title ?? deleteModal.comment.post}</span>
            </p>
            <p className="mb-4 line-clamp-2 text-xs text-gray-400">"{deleteModal.comment.body}"</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteModal({ open: false, comment: null })}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-white/[0.1] dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast message={toast.message} type={toast.type} isVisible={toast.isVisible} onClose={closeToast} />
    </AdminLayout>
  );
};

export default BlogCommentsPage;
