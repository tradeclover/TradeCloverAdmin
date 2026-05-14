"use client";
import React, { useState, useEffect } from "react";
import AdminLayout from '@/layout/AdminLayout';
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
import { apiGet, apiPost, apiPut, apiDelete } from "@/utils/api";

interface SubCategory {
    id: number;
    name: string;
    slug: string;
    category: number;
    category_name?: string; // Added for display purposes
    is_active: boolean;
}

interface Category {
    id: number;
    name: string;
    slug: string;
}

interface SubCategoryFormData {
    name: string;
    slug: string;
    category: number | string;
    is_active: boolean;
}

export default function SubCategoriesPage() {
    const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSubCategory, setEditingSubCategory] = useState<SubCategory | null>(null);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [subCategoryToDelete, setSubCategoryToDelete] = useState<SubCategory | null>(null);
    const [formData, setFormData] = useState<SubCategoryFormData>({
        name: '',
        slug: '',
        category: 0,
        is_active: true
    });
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info"; isVisible: boolean }>({
        message: '',
        type: 'success',
        isVisible: false
    });
    const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);

    const generateSlug = (text: string) =>
        text
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');

    const showToast = (message: string, type: "success" | "error" | "info") => {
        setToast({ message, type, isVisible: true });
        // Auto-hide after 3 seconds
        setTimeout(() => {
            setToast(prev => ({ ...prev, isVisible: false }));
        }, 3000);
    };

    // Fetch categories for dropdown
    const fetchCategories = async () => {
        try {
            const response = await apiGet('/products/categories-list/');
            setCategories(response.data);
        } catch (error) {
            console.error('Fetch categories error:', error);
            showToast('Failed to fetch categories', 'error');
        }
    };

    // Fetch sub-categories
    const fetchSubCategories = async (isInitialLoad = false) => {
        try {
            const response = await apiGet('/products/subcategories-list/');
            // Enrich subcategories with category names if categories are available
            // const enrichedSubCategories = response.data.map((subCategory: any) => {
            //     const category = categories.find(cat => cat.id === subCategory.category);
            //     return {
            //         ...subCategory,
            //         category_name: category ? category.name : 'N/A'
            //     };
            // });
            // setSubCategories(enrichedSubCategories);
            setSubCategories(response.data);
            if (isInitialLoad) {
                setLoading(false);
            }
        } catch (error) {
            console.error('Fetch sub-categories error:', error);
            showToast('Failed to fetch sub-categories', 'error');
        }
    };

    useEffect(() => {
        // First fetch categories, then subcategories
        const loadData = async () => {
            await fetchCategories();
            await fetchSubCategories(true); // Pass true for initial load
        };
        loadData();
    }, []);

    const closeToast = () => {
        setToast(prev => ({ ...prev, isVisible: false }));
    };

    const handleCreate = () => {
        setEditingSubCategory(null);
        setFormData({ name: '', slug: '', category: '' as any, is_active: true });
        setIsSlugManuallyEdited(false);
        setIsModalOpen(true);
    };

    const handleEdit = (subCategory: SubCategory) => {
        setEditingSubCategory(subCategory);
        setFormData({
            name: subCategory.name,
            slug: subCategory.slug,
            category: subCategory.category,
            is_active: subCategory.is_active
        });
        setIsSlugManuallyEdited(false);
        setIsModalOpen(true);
    };

    const handleDeleteClick = (subCategory: SubCategory) => {
        setSubCategoryToDelete(subCategory);
        setDeleteModalOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!subCategoryToDelete) return;

        try {
            await apiDelete(`/products/admin/subcategories/${subCategoryToDelete.slug}/`);
            showToast('Sub-category deleted successfully', 'success');
            fetchSubCategories();
            setDeleteModalOpen(false);
            setSubCategoryToDelete(null);
        } catch (error) {
            console.error('Delete error:', error);
            showToast('Failed to delete sub-category', 'error');
        }
    };

    const handleDeleteCancel = () => {
        setDeleteModalOpen(false);
        setSubCategoryToDelete(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            if (editingSubCategory) {
                await apiPut(`/products/admin/subcategories/${editingSubCategory.slug}/`, formData);
                showToast('Sub-category updated successfully', 'success');
            } else {
                const response = await apiPost('/products/admin/subcategories/create/', formData);
                console.log('Create response:', response);
                showToast('Sub-category created successfully', 'success');
            }
            setIsModalOpen(false);
            fetchSubCategories();
        } catch (error) {
            console.error('Submit error:', error);
            showToast(`Failed to ${editingSubCategory ? 'update' : 'create'} sub-category`, 'error');
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        if (type === 'checkbox') {
            setFormData(prev => ({
                ...prev,
                [name]: checked
            }));
            return;
        }

        if (name === 'name') {
            setFormData(prev => ({
                ...prev,
                name: value,
                slug: isSlugManuallyEdited ? prev.slug : generateSlug(value)
            }));
            return;
        }

        if (name === 'slug') {
            setIsSlugManuallyEdited(true);
            setFormData(prev => ({
                ...prev,
                slug: generateSlug(value)
            }));
            return;
        }

        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleCategoryChange = (value: string) => {
        setFormData(prev => ({
            ...prev,
            category: parseInt(value)
        }));
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
                <h1 className="font-bold text-gray-800 text-title-md dark:text-white/90">Sub Categories</h1>
                <Button onClick={handleCreate} startIcon={<PlusIcon />}>
                    Create Sub-Category
                </Button>
            </div>

            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
                <div className="max-w-full overflow-x-auto">
                    <Table>
                        <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                            <TableRow>
                                <TableCell
                                    isHeader
                                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                                >
                                    Name
                                </TableCell>
                                <TableCell
                                    isHeader
                                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                                >
                                    Slug
                                </TableCell>
                                <TableCell
                                    isHeader
                                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                                >
                                    Category
                                </TableCell>
                                <TableCell
                                    isHeader
                                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                                >
                                    Status
                                </TableCell>
                                <TableCell
                                    isHeader
                                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                                >
                                    Actions
                                </TableCell>
                            </TableRow>
                        </TableHeader>

                        <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                            {subCategories.map((subCategory) => (
                                <TableRow key={subCategory.id}>
                                    <TableCell className="px-5 py-4 text-gray-800 text-theme-sm dark:text-white/90">
                                        {subCategory.name}
                                    </TableCell>
                                    <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                                        {subCategory.slug}
                                    </TableCell>
                                    {/* <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                                        {subCategory.category_name || 'N/A'}
                                    </TableCell> */}
                                    <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                                        {categories.find(cat => cat.id === subCategory.category)?.name || 'N/A'}
                                    </TableCell>

                                    <TableCell className="px-4 py-3">
                                        <Badge
                                            size="sm"
                                            color={subCategory.is_active ? "success" : "error"}
                                        >
                                            {subCategory.is_active ? "Active" : "Inactive"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="px-4 py-3">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleEdit(subCategory)}
                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-md dark:text-blue-400 dark:hover:bg-blue-900/20"
                                            >
                                                <PencilIcon />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteClick(subCategory)}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-md dark:text-red-400 dark:hover:bg-red-900/20"
                                            >
                                                <TrashBinIcon />
                                            </button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Modal for Create/Edit */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} className="max-w-md">
                <div className="p-4">
                    <h2 className="text-lg font-bold mb-3">
                        {editingSubCategory ? 'Edit Sub-Category' : 'Create Sub-Category'}
                    </h2>
                    <form onSubmit={handleSubmit} key={editingSubCategory?.id || 'create'}>
                        <div className="mb-3">
                            <label className="block text-sm font-medium mb-1">Name</label>
                            <InputField
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                placeholder="Enter sub-category name"
                            />
                        </div>
                        <div className="mb-3">
                            <label className="block text-sm font-medium mb-1">Slug</label>
                            <InputField
                                name="slug"
                                value={formData.slug}
                                onChange={handleInputChange}
                                placeholder="Enter sub-category slug"
                            />
                        </div>
                        <div className="mb-3">
                            <label className="block text-sm font-medium mb-1">Category</label>
                            <Select
                                options={categories.map(cat => ({ value: cat.id.toString(), label: cat.name }))}
                                placeholder="Select a category"
                                onChange={handleCategoryChange}
                                defaultValue={formData.category.toString()}
                            />
                        </div>
                        <div className="mb-3">
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    name="is_active"
                                    checked={formData.is_active}
                                    onChange={handleInputChange}
                                    className="mr-2"
                                />
                                Active
                            </label>
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                            <Button
                                variant="outline"
                                onClick={() => setIsModalOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button>
                                {editingSubCategory ? 'Update' : 'Create'}
                            </Button>
                        </div>
                    </form>
                </div>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal isOpen={deleteModalOpen} onClose={handleDeleteCancel} className="max-w-sm">
                <div className="p-6">
                    <h2 className="text-lg font-bold mb-3 text-center">Confirm Delete</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-6 text-center">
                        Are you sure you want to delete the sub-category <b>{subCategoryToDelete?.name ?? ""}</b> ? This action cannot be undone.
                    </p>
                    <div className="flex justify-center gap-3">
                        <Button
                            variant="outline"
                            onClick={handleDeleteCancel}
                            className="px-6"
                        >
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
