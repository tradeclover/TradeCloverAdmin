import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import AdminLayout from "@/layout/AdminLayout";
import {
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { EyeIcon } from "@/icons";
import { apiGet } from "@/utils/api";

interface GstExpiryEntry {
    id: number;
    user_id: number;
    user_name: string | null;
    business_name: string | null;
    user_phone: string | null;
    user_email: string | null;
    gstin: string | null;
    expiry_date: string;
    gstin_expiry_date: string | null;
    days_remaining: number | null;
    notified: boolean;
    first_detected_at: string;
}

const GstExpiryPage = () => {
    const router = useRouter();
    const [entries, setEntries] = useState<GstExpiryEntry[]>([]);
    const [windowDays, setWindowDays] = useState<number>(2);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchEntries = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await apiGet("/users/admin/gst-expiry/");
            const data = response?.data ?? {};
            setEntries(Array.isArray(data.results) ? data.results : []);
            if (typeof data.window_days === "number") setWindowDays(data.window_days);
        } catch (err) {
            console.error("Fetch GST expiry list error:", err);
            setError("Failed to fetch GST expiry list");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchEntries();
    }, [fetchEntries]);

    const formatDate = (dateString: string | null) => {
        if (!dateString) return "N/A";
        return new Date(String(dateString).slice(0, 10)).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    const renderDaysBadge = (days: number | null) => {
        if (days === null || days === undefined) return <span className="text-gray-400">—</span>;
        let cls = "bg-green-100 text-green-800";
        let label = `${days} day${days === 1 ? "" : "s"}`;
        if (days < 0) {
            cls = "bg-red-100 text-red-800";
            label = `Expired ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago`;
        } else if (days === 0) {
            cls = "bg-amber-100 text-amber-800";
            label = "Today";
        } else if (days <= 2) {
            cls = "bg-amber-100 text-amber-800";
        }
        return <span className={`px-2 py-1 rounded-full text-xs font-medium ${cls}`}>{label}</span>;
    };

    const displayValue = (value: unknown) => {
        if (value === null || value === undefined || value === "" || value === "null") return "N/A";
        return String(value).trim() || "N/A";
    };

    if (loading) {
        return (
            <AdminLayout>
                <div className="flex justify-center items-center h-64">
                    <div>Loading...</div>
                </div>
            </AdminLayout>
        );
    }

    if (error) {
        return (
            <AdminLayout>
                <div className="flex flex-col items-center justify-center h-64">
                    <div className="text-red-600 mb-4">{error}</div>
                    <button
                        onClick={fetchEntries}
                        className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                    >
                        Retry
                    </button>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
                <div>
                    <h1 className="font-bold text-gray-800 text-title-md dark:text-white/90">GST Expiry</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Verified users whose GST registration expires within the next {windowDays} day
                        {windowDays === 1 ? "" : "s"}. Updated every morning.
                    </p>
                </div>
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    {entries.length} user{entries.length === 1 ? "" : "s"}
                </span>
            </div>

            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
                <div className="max-w-full overflow-x-auto">
                    <Table>
                        <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                            <TableRow>
                                {["Name", "Business", "GSTIN", "Phone", "Expiry Date", "Days Left", "Actions"].map((h) => (
                                    <TableCell
                                        key={h}
                                        isHeader
                                        className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                                    >
                                        {h}
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHeader>

                        <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                            {entries.length === 0 ? (
                                <TableRow>
                                    <td
                                        colSpan={7}
                                        className="px-5 py-8 text-center text-gray-500 dark:text-gray-400 text-theme-sm"
                                    >
                                        No users with GST expiring in the next {windowDays} day
                                        {windowDays === 1 ? "" : "s"}.
                                    </td>
                                </TableRow>
                            ) : (
                                entries.map((entry) => (
                                    <TableRow key={entry.id}>
                                        <TableCell className="px-5 py-4 text-gray-800 text-theme-sm dark:text-white/90">
                                            {displayValue(entry.user_name)}
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                                            {displayValue(entry.business_name)}
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                                            {displayValue(entry.gstin)}
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                                            {displayValue(entry.user_phone)}
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                                            {formatDate(entry.gstin_expiry_date ?? entry.expiry_date)}
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                                            {renderDaysBadge(entry.days_remaining)}
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                                            <button
                                                onClick={() => router.push(`/verified-users/${entry.user_id}`)}
                                                className="inline-flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-md dark:text-blue-400 dark:hover:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                                                title="View user & edit GST expiry"
                                            >
                                                <EyeIcon />
                                                <span>View</span>
                                            </button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </AdminLayout>
    );
};

export default GstExpiryPage;
