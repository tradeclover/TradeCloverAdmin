import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import AdminLayout from "@/layout/AdminLayout";
import Toast from "@/components/ui/toast/Toast";
import { apiGet } from "@/utils/api";

interface SupportTicket {
  id?: number;
  ticket_id?: number;
  user_id?: number;
  user_name?: string | null;
  subject?: string | null;
  title?: string | null;
  category?: string | null;
  status?: string | null;
  priority?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  last_replied_at?: string | null;
  user?: {
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    business_profile?: {
      first_name?: string | null;
      last_name?: string | null;
    } | null;
  } | null;
  user_detail?: {
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    business_profile?: {
      first_name?: string | null;
      last_name?: string | null;
    } | null;
  } | null;
  created_by?: {
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
  } | null;
  [key: string]: unknown;
}

interface HighPriorityTicket {
  id: number;
  subject: string;
  priority: string;
  user_id: number;
  user_phone: string;
  created_at: string;
}

interface StatsData {
  open_count: number;
  in_progress_count: number;
  high_priority_open_count: number;
  high_priority_open: HighPriorityTicket[];
  total_resolved: number;
  resolved_today: number;
}

const normalizeTickets = (data: SupportTicket[] | { results?: SupportTicket[] }) => {
  if (Array.isArray(data)) return data;
  return Array.isArray(data?.results) ? data.results : [];
};

const getTicketId = (ticket: SupportTicket) => Number(ticket.id ?? ticket.ticket_id ?? 0);

const getPersonName = (person?: Record<string, unknown> | null) => {
  if (!person) return "";
  const bp =
    person.business_profile && typeof person.business_profile === "object"
      ? (person.business_profile as Record<string, unknown>)
      : undefined;
  const candidates = [
    `${person.first_name ?? ""} ${person.last_name ?? ""}`.trim(),
    `${bp?.first_name ?? ""} ${bp?.last_name ?? ""}`.trim(),
  ];
  return candidates.find(Boolean) ?? "";
};

const getCustomerName = (ticket: SupportTicket) => {
  if (typeof ticket.user_name === "string" && ticket.user_name.trim()) return ticket.user_name;
  for (const u of [ticket.user, ticket.user_detail, ticket.created_by]) {
    const name = getPersonName(u as Record<string, unknown> | null);
    if (name) return name;
  }
  return "N/A";
};

const getCustomerEmail = (ticket: SupportTicket) => {
  for (const u of [ticket.user, ticket.user_detail, ticket.created_by]) {
    if (u?.email && typeof u.email === "string") return u.email;
  }
  return "";
};

const formatRelative = (value: unknown) => {
  if (!value || typeof value !== "string") return "—";
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

const STATUS_TABS = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
  { value: "", label: "All" },
];

const PRIORITY_OPTIONS = [
  { value: "", label: "All priority" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const statusTabStyle = (tab: string, active: string) => {
  const isActive = tab === active;
  if (tab === "open")
    return isActive
      ? "border border-red-400 bg-red-50 text-red-600 font-semibold"
      : "border border-red-200 bg-red-50/50 text-red-400 hover:bg-red-50 hover:text-red-500";
  if (tab === "in_progress")
    return isActive
      ? "border border-amber-400 bg-amber-50 text-amber-700 font-semibold"
      : "border border-amber-200 bg-amber-50/50 text-amber-500 hover:bg-amber-50 hover:text-amber-600";
  if (tab === "resolved")
    return isActive
      ? "border border-green-400 bg-green-50 text-green-700 font-semibold"
      : "border border-green-200 bg-green-50/50 text-green-500 hover:bg-green-50 hover:text-green-600";
  if (tab === "closed")
    return isActive
      ? "border border-gray-400 bg-gray-100 text-gray-700 font-semibold"
      : "border border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700";
  return isActive
    ? "border border-gray-700 bg-gray-700 text-white font-semibold"
    : "border border-gray-200 bg-gray-100 text-gray-600 hover:bg-gray-200";
};

const priorityBadge = (value: string) => {
  const v = value.toLowerCase();
  if (v === "urgent") return "bg-red-100 text-red-700";
  if (v === "high") return "bg-orange-100 text-orange-700";
  if (v === "medium") return "bg-amber-100 text-amber-700";
  if (v === "low") return "bg-green-100 text-green-700";
  return "bg-gray-100 text-gray-600";
};

const statusBadge = (value: string) => {
  const v = value.toLowerCase();
  if (v === "open") return "bg-red-50 text-red-600 border border-red-200";
  if (v === "in_progress") return "bg-amber-50 text-amber-700 border border-amber-200";
  if (v === "resolved") return "bg-green-50 text-green-700 border border-green-200";
  if (v === "closed") return "bg-gray-100 text-gray-600 border border-gray-200";
  return "bg-gray-100 text-gray-600 border border-gray-200";
};

const SupportTicketsPage = () => {
  const router = useRouter();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("open");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
    isVisible: boolean;
  }>({ message: "", type: "success", isVisible: false });

  const showToast = (message: string, type: "success" | "error" | "info") =>
    setToast({ message, type, isVisible: true });

  const closeToast = () => setToast((prev) => ({ ...prev, isVisible: false }));

  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const response = await apiGet("/cms/admin/support-tickets/stats/");
      setStats(response.data);
    } catch {
      // stats are supplementary; fail silently
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchTickets = useCallback(async (status: string, priority: string, q: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (priority) params.set("priority", priority);
      if (q.trim()) params.set("search", q.trim());
      const qs = params.toString();
      const response = await apiGet(`/cms/admin/support-tickets/${qs ? `?${qs}` : ""}`);
      setTickets(normalizeTickets(response.data));
    } catch {
      showToast("Failed to fetch support tickets", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchTickets(activeTab, priorityFilter, searchQuery); }, [fetchTickets, activeTab, priorityFilter, searchQuery]);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const statCards = [
    {
      label: "Open tickets",
      value: statsLoading ? "—" : (stats?.open_count ?? 0),
      badge: "action",
      badgeColor: "bg-red-100 text-red-600",
      valueColor: "text-red-600",
    },
    {
      label: "In progress",
      value: statsLoading ? "—" : (stats?.in_progress_count ?? 0),
      badge: "ongoing",
      badgeColor: "bg-amber-100 text-amber-700",
      valueColor: "text-amber-700",
    },
    {
      label: "High priority open",
      value: statsLoading ? "—" : (stats?.high_priority_open_count ?? 0),
      badge: "urgent",
      badgeColor: "bg-orange-100 text-orange-600",
      valueColor: "text-orange-600",
    },
    {
      label: "Resolved today",
      value: statsLoading ? "—" : (stats?.resolved_today ?? 0),
      badge: "today",
      badgeColor: "bg-green-100 text-green-600",
      valueColor: "text-green-600",
    },
    {
      label: "Total resolved",
      value: statsLoading ? "—" : (stats?.total_resolved ?? 0),
      badge: "lifetime",
      badgeColor: "bg-blue-100 text-blue-600",
      valueColor: "text-blue-600",
    },
  ];

  return (
    <AdminLayout>
      <h1 className="mb-6 text-title-md font-bold text-gray-800 dark:text-white/90">Support Tickets</h1>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 sm:gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="flex flex-col gap-1 rounded-2xl border border-gray-100 bg-white px-4 py-4 shadow-sm dark:border-white/[0.06] dark:bg-white/[0.03]"
          >
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-gray-500 dark:text-gray-400">{card.label}</span>
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${card.badgeColor}`}>
                {card.badge}
              </span>
            </div>
            <span className={`text-3xl font-bold ${card.valueColor}`}>{card.value}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`rounded-full px-4 py-1.5 text-sm transition-colors ${statusTabStyle(tab.value, activeTab)}`}
          >
            {tab.label}
            {tab.value === "open" && stats && !statsLoading && (
              <span className="ml-1.5 text-xs">({stats.open_count})</span>
            )}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tickets…"
              className="w-48 rounded-lg border border-gray-200 bg-white py-1.5 pl-8 pr-3 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-white/[0.1] dark:bg-white/[0.05] dark:text-gray-300"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-white/[0.1] dark:bg-white/[0.05] dark:text-gray-300"
          >
            {PRIORITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03]">
        {loading ? (
          <div className="flex h-48 items-center justify-center text-sm text-gray-400">
            Loading tickets…
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-gray-100 dark:border-white/[0.05]">
                {["Ticket ID", "User", "Subject", "Priority", "Status", "Last Reply", "Action"].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-white/[0.04]">
              {tickets.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-10 text-center text-sm text-gray-400 dark:text-gray-500"
                  >
                    No tickets found
                  </td>
                </tr>
              ) : (
                tickets.map((ticket) => {
                  const id = getTicketId(ticket);
                  const status = (ticket.status ?? "open").toLowerCase();
                  const priority = (ticket.priority ?? "medium").toLowerCase();

                  return (
                    <tr
                      key={id}
                      className="transition-colors hover:bg-gray-50/60 dark:hover:bg-white/[0.02]"
                    >
                      <td className="px-5 py-4 text-sm font-medium text-gray-700 dark:text-white/80">
                        #T-{id || "—"}
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-sm font-medium text-gray-800 dark:text-white/90">
                          {getCustomerName(ticket)}
                        </div>
                        {getCustomerEmail(ticket) && (
                          <div className="text-xs text-gray-400 dark:text-gray-500">
                            {getCustomerEmail(ticket)}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
                        {ticket.subject ?? ticket.title ?? "—"}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${priorityBadge(priority)}`}
                        >
                          {priority.charAt(0).toUpperCase() + priority.slice(1)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusBadge(status)}`}
                        >
                          {status === "in_progress" ? "In Progress" : status.charAt(0).toUpperCase() + status.slice(1)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-400 dark:text-gray-500">
                        {formatRelative(ticket.last_replied_at)}
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => router.push(`/support-tickets/${id}`)}
                          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 dark:border-white/[0.1] dark:text-gray-300 dark:hover:border-blue-700 dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
                        >
                          Open ticket
                        </button>
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

      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={closeToast}
      />
    </AdminLayout>
  );
};

export default SupportTicketsPage;
