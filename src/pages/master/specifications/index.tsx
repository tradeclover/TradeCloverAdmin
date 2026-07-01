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
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import InputField from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import { PencilIcon, TrashBinIcon, PlusIcon } from "@/icons";
import Toast from "@/components/ui/toast/Toast";
import Pagination from "@/components/tables/Pagination";
import {
    apiGet,
    adminListSpecGroups,
    adminCreateSpecGroup,
    adminUpdateSpecGroup,
    adminDeleteSpecGroup,
} from "@/utils/api";

interface Category {
    id: number;
    name: string;
}

interface SubCategory {
    id: number;
    name: string;
    category: number;
}

interface SpecOption {
    id: number;
    value: string;
    order: number;
}

interface SpecGroup {
    id: number;
    label: string;
    key: string;
    hint: string;
    selection: "single" | "multi";
    allow_other: boolean;
    step: number;
    order: number;
    options: SpecOption[];
}

interface SpecGroupFormData {
    label: string;
    hint: string;
    step: number | string;
    selection: "single" | "multi";
    allow_other: boolean;
    options: string; // newline / comma separated in the form
}

const emptyForm: SpecGroupFormData = {
    label: "",
    hint: "",
    step: 1,
    selection: "single",
    allow_other: true,
    options: "",
};

export default function SpecificationsPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
    const [selectedSub, setSelectedSub] = useState<string>("");
    const [specGroups, setSpecGroups] = useState<SpecGroup[]>([]);

    // Search + client-side pagination for the spec groups table
    const [search, setSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const PAGE_SIZE = 10;

    const [loading, setLoading] = useState(true);
    const [groupsLoading, setGroupsLoading] = useState(false);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editing, setEditing] = useState<SpecGroup | null>(null);
    const [formData, setFormData] = useState<SpecGroupFormData>(emptyForm);

    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [toDelete, setToDelete] = useState<SpecGroup | null>(null);

    const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info"; isVisible: boolean }>({
        message: "",
        type: "success",
        isVisible: false,
    });

    const showToast = (message: string, type: "success" | "error" | "info") => {
        setToast({ message, type, isVisible: true });
        setTimeout(() => setToast((prev) => ({ ...prev, isVisible: false })), 3000);
    };
    const closeToast = () => setToast((prev) => ({ ...prev, isVisible: false }));

    // Load categories + subcategories for the selector
    useEffect(() => {
        const load = async () => {
            try {
                const [catRes, subRes] = await Promise.all([
                    apiGet("/products/categories-list/"),
                    apiGet("/products/subcategories-list/"),
                ]);
                setCategories(catRes.data || []);
                setSubCategories(subRes.data || []);
            } catch (error) {
                console.error(error);
                showToast("Failed to load categories", "error");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const fetchSpecGroups = async (subId: string) => {
        if (!subId) {
            setSpecGroups([]);
            return;
        }
        try {
            setGroupsLoading(true);
            const res = await adminListSpecGroups(subId);
            setSpecGroups(res.data || []);
        } catch (error) {
            console.error(error);
            showToast("Failed to load specifications", "error");
        } finally {
            setGroupsLoading(false);
        }
    };

    const handleSubChange = (value: string) => {
        setSelectedSub(value);
        setSearch("");
        setCurrentPage(1);
        fetchSpecGroups(value);
    };

    const categoryName = (sub: SubCategory) =>
        categories.find((c) => c.id === sub.category)?.name || "";

    // ---- Create / Edit ----
    const handleCreate = () => {
        if (!selectedSub) {
            showToast("Select a sub-category first", "info");
            return;
        }
        setEditing(null);
        setFormData(emptyForm);
        setIsModalOpen(true);
    };

    const handleEdit = (group: SpecGroup) => {
        setEditing(group);
        setFormData({
            label: group.label,
            hint: group.hint || "",
            step: group.step,
            selection: group.selection,
            allow_other: group.allow_other,
            options: (group.options || []).map((o) => o.value).join("\n"),
        });
        setIsModalOpen(true);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.label.trim()) {
            showToast("Label is required", "error");
            return;
        }
        const options = formData.options
            .split(/[\n,]/)
            .map((s) => s.trim())
            .filter(Boolean);

        const payload = {
            subcategory: Number(selectedSub),
            label: formData.label.trim(),
            hint: formData.hint.trim(),
            step: Number(formData.step),
            selection: formData.selection,
            allow_other: formData.allow_other,
            options,
        };

        try {
            if (editing) {
                await adminUpdateSpecGroup(editing.id, payload);
                showToast("Specification updated", "success");
            } else {
                await adminCreateSpecGroup(payload);
                showToast("Specification created", "success");
            }
            setIsModalOpen(false);
            fetchSpecGroups(selectedSub);
        } catch (error: any) {
            console.error(error);
            showToast(error?.response?.data?.detail || "Save failed", "error");
        }
    };

    // ---- Delete ----
    const handleDeleteClick = (group: SpecGroup) => {
        setToDelete(group);
        setDeleteModalOpen(true);
    };
    const handleDeleteCancel = () => {
        setToDelete(null);
        setDeleteModalOpen(false);
    };
    const handleDeleteConfirm = async () => {
        if (!toDelete) return;
        try {
            await adminDeleteSpecGroup(toDelete.id);
            showToast("Specification deleted", "success");
            fetchSpecGroups(selectedSub);
        } catch (error) {
            console.error(error);
            showToast("Delete failed", "error");
        } finally {
            handleDeleteCancel();
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

    // Filter spec groups by search (label, hint, or option value), then paginate
    const q = search.trim().toLowerCase();
    const filteredSpecGroups = q
        ? specGroups.filter(
              (g) =>
                  g.label.toLowerCase().includes(q) ||
                  (g.hint || "").toLowerCase().includes(q) ||
                  (g.options || []).some((o) => o.value.toLowerCase().includes(q))
          )
        : specGroups;
    const totalPages = Math.max(1, Math.ceil(filteredSpecGroups.length / PAGE_SIZE));
    const safePage = Math.min(currentPage, totalPages);
    const paginatedSpecGroups = filteredSpecGroups.slice(
        (safePage - 1) * PAGE_SIZE,
        safePage * PAGE_SIZE
    );

    return (
        <AdminLayout>
            <div className="flex justify-between items-center mb-4">
                <h1 className="font-bold text-gray-800 text-title-md dark:text-white/90">Specifications</h1>
                <Button onClick={handleCreate} startIcon={<PlusIcon />}>
                    Add Specification
                </Button>
            </div>

            {/* Sub-category selector + search */}
            <div className="mb-4 flex flex-wrap items-end gap-4">
                <div className="max-w-sm w-full sm:w-auto">
                    <label className="block text-sm font-medium mb-1">Sub-category</label>
                    <Select
                        options={subCategories.map((s) => ({
                            value: s.id.toString(),
                            label: categoryName(s) ? `${categoryName(s)} → ${s.name}` : s.name,
                        }))}
                        placeholder="Select a sub-category"
                        onChange={handleSubChange}
                        defaultValue={selectedSub}
                    />
                </div>
                {selectedSub && (
                    <div className="max-w-sm w-full sm:w-auto">
                        <label className="block text-sm font-medium mb-1">Search</label>
                        <div className="relative">
                            <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                            </svg>
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                                placeholder="Search specification…"
                                className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:bg-white/[0.03] dark:text-white/90"
                            />
                        </div>
                    </div>
                )}
            </div>

            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
                <div className="max-w-full overflow-x-auto">
                    <Table>
                        <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                            <TableRow>
                                {["Label", "Hint", "Step", "Selection", "Options", "Actions"].map((h) => (
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
                            {!selectedSub ? (
                                <TableRow>
                                    <TableCell className="px-5 py-6 text-gray-400 text-theme-sm">
                                        Select a sub-category to manage its specifications.
                                    </TableCell>
                                </TableRow>
                            ) : groupsLoading ? (
                                <TableRow>
                                    <TableCell className="px-5 py-6 text-gray-400 text-theme-sm">Loading…</TableCell>
                                </TableRow>
                            ) : filteredSpecGroups.length === 0 ? (
                                <TableRow>
                                    <TableCell className="px-5 py-6 text-gray-400 text-theme-sm">
                                        {q
                                            ? "No specifications match your search."
                                            : "No specifications yet. Click “Add Specification”."}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedSpecGroups.map((group) => (
                                    <TableRow key={group.id}>
                                        <TableCell className="px-5 py-4 text-gray-800 text-theme-sm dark:text-white/90">
                                            {group.label}
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                                            {group.hint || "—"}
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                                            {group.step}
                                        </TableCell>
                                        <TableCell className="px-4 py-3">
                                            <Badge size="sm" color={group.selection === "multi" ? "warning" : "info"}>
                                                {group.selection}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                                            <div className="flex flex-wrap gap-1">
                                                {group.options?.slice(0, 6).map((o) => (
                                                    <span
                                                        key={o.id}
                                                        className="rounded-md border border-gray-200 px-2 py-0.5 text-xs dark:border-white/[0.1]"
                                                    >
                                                        {o.value}
                                                    </span>
                                                ))}
                                                {group.options?.length > 6 && (
                                                    <span className="text-xs text-gray-400">
                                                        +{group.options.length - 6}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-4 py-3">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleEdit(group)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-md dark:text-blue-400 dark:hover:bg-blue-900/20"
                                                >
                                                    <PencilIcon />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteClick(group)}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-md dark:text-red-400 dark:hover:bg-red-900/20"
                                                >
                                                    <TrashBinIcon />
                                                </button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {selectedSub && totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                        Showing {(safePage - 1) * PAGE_SIZE + 1}
                        –{Math.min(safePage * PAGE_SIZE, filteredSpecGroups.length)} of {filteredSpecGroups.length}
                    </span>
                    <Pagination
                        currentPage={safePage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                    />
                </div>
            )}

            {/* Create / Edit Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} className="max-w-md">
                <div className="p-4">
                    <h2 className="text-lg font-bold mb-3">
                        {editing ? "Edit Specification" : "Add Specification"}
                    </h2>
                    <form onSubmit={handleSubmit} key={editing?.id || "create"}>
                        <div className="mb-3">
                            <label className="block text-sm font-medium mb-1">Label</label>
                            <InputField
                                name="label"
                                value={formData.label}
                                onChange={handleInputChange}
                                placeholder="e.g. Capacity"
                            />
                        </div>
                        <div className="mb-3">
                            <label className="block text-sm font-medium mb-1">Hint</label>
                            <InputField
                                name="hint"
                                value={formData.hint}
                                onChange={handleInputChange}
                                placeholder="e.g. Bottle volume"
                            />
                        </div>
                        <div className="mb-3">
                            <label className="block text-sm font-medium mb-1">Options</label>
                            <textarea
                                name="options"
                                value={formData.options}
                                onChange={handleInputChange}
                                rows={4}
                                placeholder={"One per line or comma separated\n1 L, 500 mL, 200 mL"}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-white/[0.1] dark:bg-white/[0.03] dark:text-white/90"
                            />
                        </div>
                        <div className="mb-3 grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium mb-1">Step</label>
                                <Select
                                    options={[
                                        { value: "1", label: "1 — Specifications" },
                                        { value: "2", label: "2 — More details" },
                                    ]}
                                    placeholder="Step"
                                    onChange={(v) => setFormData((p) => ({ ...p, step: v }))}
                                    defaultValue={String(formData.step)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Selection</label>
                                <Select
                                    options={[
                                        { value: "single", label: "Single select" },
                                        { value: "multi", label: "Multi select" },
                                    ]}
                                    placeholder="Selection"
                                    onChange={(v) =>
                                        setFormData((p) => ({ ...p, selection: v as "single" | "multi" }))
                                    }
                                    defaultValue={formData.selection}
                                />
                            </div>
                        </div>
                        <div className="mb-3">
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    name="allow_other"
                                    checked={formData.allow_other}
                                    onChange={handleInputChange}
                                    className="mr-2"
                                />
                                Allow “Other…” free text
                            </label>
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button>{editing ? "Update" : "Create"}</Button>
                        </div>
                    </form>
                </div>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal isOpen={deleteModalOpen} onClose={handleDeleteCancel} className="max-w-sm">
                <div className="p-6">
                    <h2 className="text-lg font-bold mb-3 text-center">Confirm Delete</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-6 text-center">
                        Delete specification <b>{toDelete?.label ?? ""}</b>? This action cannot be undone.
                    </p>
                    <div className="flex justify-center gap-3">
                        <Button variant="outline" onClick={handleDeleteCancel} className="px-6">
                            Cancel
                        </Button>
                        <button
                            onClick={handleDeleteConfirm}
                            className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium transition-colors"
                        >
                            Delete
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
}
