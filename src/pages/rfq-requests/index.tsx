"use client";
import React, { useState, useEffect } from "react";
import AdminLayout from "@/layout/AdminLayout";
import {
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import Badge from "@/components/ui/badge/Badge";
import { Modal } from "@/components/ui/modal";
import Toast from "@/components/ui/toast/Toast";
import { apiGet } from "@/utils/api";

interface RFQRequest {
    id: number;
    contact_name: string;
    contact_email: string;
    contact_phone: string;
    product_name: string;
    categories: string[];
    subcategories: string[];
    categories_text: string;
    delivery_location: string;
    terms_of_delivery: string;
    quantity: string;
    unit: string;
    valid_to: string;
    is_recurring: boolean;
    request_details: string;
    status: string;
    created_at: string;
    updated_at: string;
}

export default function RFQRequestsPage() {
    const [rfqs, setRfqs] = useState<RFQRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<RFQRequest | null>(null);
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info"; isVisible: boolean }>({
        message: "",
        type: "success",
        isVisible: false,
    });

    const showToast = (message: string, type: "success" | "error" | "info") => {
        setToast({ message, type, isVisible: true });
        setTimeout(() => setToast((p) => ({ ...p, isVisible: false })), 3000);
    };

    const fetchRfqs = async () => {
        try {
            setLoading(true);
            const res = await apiGet("/quotes/rfq/list/");
            // endpoint may return a plain array or a paginated { results: [] }
            const data = Array.isArray(res.data) ? res.data : res.data?.results || [];
            setRfqs(data);
        } catch (error) {
            console.error("Fetch RFQs error:", error);
            showToast("Failed to fetch RFQ requests", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRfqs();
    }, []);

    const fmtDate = (s: string) => {
        if (!s) return "-";
        try {
            return new Date(s).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
        } catch {
            return s;
        }
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

    return (
        <AdminLayout>
            <div className="flex justify-between items-center mb-4">
                <h1 className="font-bold text-gray-800 text-title-md dark:text-white/90">RFQ Requests</h1>
                <span className="text-sm text-gray-500">{rfqs.length} total</span>
            </div>

            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
                <div className="max-w-full overflow-x-auto">
                    <Table>
                        <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                            <TableRow>
                                {["Product", "Contact", "Categories", "Qty", "Terms", "Location", "Valid To", "Status", "Submitted", ""].map((h) => (
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
                            {rfqs.length === 0 ? (
                                <TableRow>
                                    <TableCell className="px-5 py-8 text-center text-gray-400">
                                        No RFQ requests yet.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                rfqs.map((r) => (
                                    <TableRow key={r.id}>
                                        <TableCell className="px-5 py-4 text-gray-800 text-theme-sm dark:text-white/90">
                                            {r.product_name}
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                                            <div className="font-medium text-gray-700 dark:text-gray-300">{r.contact_name}</div>
                                            <div className="text-xs">{r.contact_email}</div>
                                            {r.contact_phone && <div className="text-xs">{r.contact_phone}</div>}
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400 max-w-[220px]">
                                            <span className="line-clamp-2">{r.categories_text || "-"}</span>
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                                            {r.quantity} {r.unit}
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                                            {r.terms_of_delivery}
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                                            {r.delivery_location}
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                                            {fmtDate(r.valid_to)}
                                        </TableCell>
                                        <TableCell className="px-4 py-3">
                                            <Badge size="sm" color={r.status === "open" ? "success" : "error"}>
                                                {r.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                                            {fmtDate(r.created_at)}
                                        </TableCell>
                                        <TableCell className="px-4 py-3">
                                            <button
                                                onClick={() => setSelected(r)}
                                                className="px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded-md dark:text-blue-400 dark:hover:bg-blue-900/20 text-sm"
                                            >
                                                View
                                            </button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Details modal */}
            <Modal isOpen={!!selected} onClose={() => setSelected(null)} className="max-w-lg">
                {selected && (
                    <div className="p-6">
                        <h2 className="text-lg font-bold mb-1">{selected.product_name}</h2>
                        <p className="text-sm text-gray-500 mb-4">RFQ #{selected.id} · {fmtDate(selected.created_at)}</p>

                        <div className="space-y-3 text-sm">
                            <Detail label="Contact">
                                {selected.contact_name}<br />
                                {selected.contact_email}{selected.contact_phone ? ` · ${selected.contact_phone}` : ""}
                            </Detail>
                            <Detail label="Categories">{selected.categories_text || "-"}</Detail>
                            <Detail label="Quantity">{selected.quantity} {selected.unit}</Detail>
                            <Detail label="Delivery location">{selected.delivery_location}</Detail>
                            <Detail label="Terms of delivery">{selected.terms_of_delivery}</Detail>
                            <Detail label="Valid to">{fmtDate(selected.valid_to)}</Detail>
                            <Detail label="Recurring demand">{selected.is_recurring ? "Yes" : "No"}</Detail>
                            <Detail label="Request details">
                                <span className="whitespace-pre-wrap">{selected.request_details}</span>
                            </Detail>
                        </div>

                        <div className="flex justify-end mt-6">
                            <button
                                onClick={() => setSelected(null)}
                                className="px-5 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            <Toast
                message={toast.message}
                type={toast.type}
                isVisible={toast.isVisible}
                onClose={() => setToast((p) => ({ ...p, isVisible: false }))}
            />
        </AdminLayout>
    );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="grid grid-cols-3 gap-2">
            <span className="text-gray-500 col-span-1">{label}</span>
            <span className="text-gray-800 dark:text-white/90 col-span-2">{children}</span>
        </div>
    );
}
