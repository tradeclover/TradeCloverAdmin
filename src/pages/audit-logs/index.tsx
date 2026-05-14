import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import AdminLayout from "@/layout/AdminLayout";
import Toast from "@/components/ui/toast/Toast";
import DatePicker from "@/components/form/date-picker";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiGet } from "@/utils/api";

interface AuditLog {
  id?: number;
  user_id?: number | string | null;
  actor_id?: number | string | null;
  created_at?: string | null;
  timestamp?: string | null;
  details?: string | null;
  description?: string | null;
  message?: string | null;
  user?: number | null;
  user_detail?: {
    id?: number | null;
    full_name?: string | null;
    email?: string | null;
    primary_phone?: string | null;
  } | null;
  metadata?: unknown;
  [key: string]: unknown;
}

interface UserOption {
  id: number;
  label: string;
}

interface AuditLogFilters {
  user_id: string;
  start_date: string;
  end_date: string;
}

const normalizeAuditLogs = (
  data: AuditLog[] | { results?: AuditLog[]; data?: AuditLog[] }
) => {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.results)) {
    return data.results;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  return [];
};

const displayValue = (value: unknown, fallback = "N/A") => {
  if (typeof value === "string" && value.trim()) {
    return value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return fallback;
};

const formatDate = (value: unknown) => {
  if (!value || typeof value !== "string") {
    return "N/A";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getFirstAvailable = (log: AuditLog, keys: string[]) => {
  for (const key of keys) {
    const value = log[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }

  return null;
};

const getUserFullName = (log: AuditLog) => {
  if (typeof log.user_detail?.full_name === "string" && log.user_detail.full_name.trim()) {
    return log.user_detail.full_name;
  }

  const firstName = getFirstAvailable(log, ["first_name", "user_first_name"]);
  const lastName = getFirstAvailable(log, ["last_name", "user_last_name"]);
  const fallbackName = `${firstName ?? ""} ${lastName ?? ""}`.trim();
  if (fallbackName) {
    return fallbackName;
  }

  return "N/A";
};

const getUserRole = (log: AuditLog) => {
  const metadata =
    log.metadata && typeof log.metadata === "object"
      ? (log.metadata as Record<string, unknown>)
      : null;

  const userType = metadata?.user_type;
  const normalizedType =
    typeof userType === "string" || typeof userType === "number"
      ? String(userType).trim()
      : "";

  if (normalizedType === "1") {
    return "Buyer";
  }

  if (normalizedType === "2") {
    return "Seller";
  }

  return "N/A";
};

const buildQueryParams = (filters: AuditLogFilters) => {
  const params = new URLSearchParams();

  if (filters.user_id.trim()) {
    params.set("user_id", filters.user_id.trim());
  }

  if (filters.start_date) {
    params.set("start_date", filters.start_date);
  }

  if (filters.end_date) {
    params.set("end_date", filters.end_date);
  }

  return params.toString();
};

const defaultFilters: AuditLogFilters = {
  user_id: "",
  start_date: "",
  end_date: "",
};

const AuditLogsPage = () => {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [filters, setFilters] = useState<AuditLogFilters>(defaultFilters);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const userInputRef = useRef<HTMLDivElement>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
    isVisible: boolean;
  }>({
    message: "",
    type: "success",
    isVisible: false,
  });

  const showToast = (message: string, type: "success" | "error" | "info") => {
    setToast({ message, type, isVisible: true });
  };

  const closeToast = () => {
    setToast((prev) => ({ ...prev, isVisible: false }));
  };

  const fetchUsers = useCallback(async () => {
    try {
      const response = await apiGet("/users/admin");
      const data = Array.isArray(response.data) ? response.data : [];
      const options: UserOption[] = data.map(
        (u: { id: number; profile?: { first_name?: string; last_name?: string } }) => {
          const firstName = u.profile?.first_name ?? "";
          const lastName = u.profile?.last_name ?? "";
          const name = `${firstName} ${lastName}`.trim() || `User #${u.id}`;
          return { id: u.id, label: name };
        }
      );
      setUsers(options);
    } catch {
      // silently fail — dropdown will be empty
    }
  }, []);

  const fetchAuditLogs = useCallback(async (currentFilters: AuditLogFilters) => {
    try {
      setLoading(true);

      const query = buildQueryParams(currentFilters);
      const endpoint = query
        ? `/users/admin/audit-logs/?${query}`
        : "/users/admin/audit-logs/";

      const response = await apiGet(endpoint);
      setAuditLogs(normalizeAuditLogs(response.data));
    } catch (error) {
      console.error("Fetch audit logs error:", error);
      showToast("Failed to fetch audit logs", "error");
      setAuditLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchAuditLogs(defaultFilters);
  }, [fetchAuditLogs, fetchUsers]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userInputRef.current && !userInputRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const onFilterChange = (key: keyof AuditLogFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const onApplyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    fetchAuditLogs(filters);
  };

  const onResetFilters = () => {
    setFilters(defaultFilters);
    setUserSearch("");
    fetchAuditLogs(defaultFilters);
  };

  const onSelectUser = (user: UserOption) => {
    setUserSearch(user.label);
    onFilterChange("user_id", String(user.id));
    setShowDropdown(false);
  };

  const onClearUser = () => {
    setUserSearch("");
    onFilterChange("user_id", "");
    setShowDropdown(false);
  };

  const filteredUsers = userSearch
    ? users.filter((u) => u.label.toLowerCase().includes(userSearch.toLowerCase()))
    : users;

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex h-64 items-center justify-center">
          <div>Loading audit logs...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-title-md font-bold text-gray-800 dark:text-white/90">Audit Logs</h1>
      </div>

      <form
        onSubmit={onApplyFilters}
        className="mb-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-white/[0.05] dark:bg-white/[0.03]"
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {/* User searchable select */}
          <div ref={userInputRef} className="relative">
            <label
              htmlFor="user_search"
              className="mb-1 block text-theme-xs font-medium text-gray-500 dark:text-gray-400"
            >
              User
            </label>
            <div className="relative">
              <input
                id="user_search"
                type="text"
                autoComplete="off"
                value={userSearch}
                onChange={(e) => {
                  setUserSearch(e.target.value);
                  setShowDropdown(true);
                  if (!e.target.value) {
                    onFilterChange("user_id", "");
                  }
                }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Search user by name..."
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 pr-8 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white/90 dark:placeholder:text-white/30"
              />
              {userSearch && (
                <button
                  type="button"
                  onClick={onClearUser}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white/70"
                >
                  ✕
                </button>
              )}
            </div>
            {showDropdown && filteredUsers.length > 0 && (
              <ul className="absolute z-20 mt-1 max-h-52 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
                {filteredUsers.map((u) => (
                  <li
                    key={u.id}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => onSelectUser(u)}
                    className="cursor-pointer px-4 py-2.5 text-sm text-gray-800 hover:bg-gray-100 dark:text-white/90 dark:hover:bg-white/[0.07]"
                  >
                    <span className="font-medium">{u.label}</span>
                    <span className="ml-2 text-xs text-gray-400">#{u.id}</span>
                  </li>
                ))}
              </ul>
            )}
            {showDropdown && userSearch && filteredUsers.length === 0 && (
              <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-400 shadow-lg dark:border-gray-700 dark:bg-gray-900 dark:text-white/40">
                No users found
              </div>
            )}
          </div>

          <div>
            <DatePicker
              id="start_date"
              label="Start Date"
              placeholder="Select start date"
              defaultDate={filters.start_date || undefined}
              onChange={(_selectedDates, dateStr) => onFilterChange("start_date", dateStr)}
            />
          </div>

          <div>
            <DatePicker
              id="end_date"
              label="End Date"
              placeholder="Select end date"
              defaultDate={filters.end_date || undefined}
              onChange={(_selectedDates, dateStr) => onFilterChange("end_date", dateStr)}
            />
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            Apply Filters
          </button>
          <button
            type="button"
            onClick={onResetFilters}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-white/[0.05]"
          >
            Reset
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  ID
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  User ID
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  User
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  Role
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  Details
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  Created At
                </TableCell>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {auditLogs.length === 0 ? (
                <TableRow>
                  <td
                    colSpan={6}
                    className="px-5 py-8 text-center text-theme-sm text-gray-500 dark:text-gray-400"
                  >
                    No audit logs found
                  </td>
                </TableRow>
              ) : (
                auditLogs.map((log, index) => (
                  <TableRow key={`${displayValue(log.id, "row")}-${index}`}>
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-800 dark:text-white/90">
                      {displayValue(log.id)}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-500 dark:text-gray-400">
                      {displayValue(log.user_detail?.id ?? log.user)}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-500 dark:text-gray-400">
                      {getUserFullName(log)}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-500 dark:text-gray-400">
                      {getUserRole(log)}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-500 dark:text-gray-400">
                      <div className="max-w-lg truncate">
                        {displayValue(
                          getFirstAvailable(log, ["message", "details", "description"]),
                          "-"
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-500 dark:text-gray-400">
                      {formatDate(getFirstAvailable(log, ["created_at", "timestamp", "date"]))}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
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

export default AuditLogsPage;
