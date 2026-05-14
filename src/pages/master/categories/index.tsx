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
import { PencilIcon, TrashBinIcon, PlusIcon } from "@/icons";
import Toast from "@/components/ui/toast/Toast";
import { apiGet, apiPost, apiPatch, apiPut, apiDelete } from "@/utils/api";

interface Category {
    id: number;
    name: string;
    slug: string;
    is_active: boolean;
}

interface CategoryFormData {
    name: string;
    slug: string;
    is_active: boolean;
}

export default function CategoriesPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
    const [formData, setFormData] = useState<CategoryFormData>({
        name: '',
        slug: '',
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

    // Fetch categories
    const fetchCategories = async (isInitialLoad = false) => {
        try {
            console.log('Fetching categories...');
            console.log('Access token:', localStorage.getItem('access_token'));
            console.log('Admin token:', localStorage.getItem('admin_token'));
            const response = await apiGet('/products/categories-list/');
            console.log('Categories response:', response);
            setCategories(response.data);
        } catch (error) {
            console.error('Fetch categories error:', error);
            showToast('Failed to fetch categories', 'error');
        } finally {
            if (isInitialLoad) {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        fetchCategories(true); // Pass true for initial load
    }, []);

    const showToast = (message: string, type: "success" | "error" | "info") => {
        setToast({ message, type, isVisible: true });
        // Auto-hide after 3 seconds
        setTimeout(() => {
            setToast(prev => ({ ...prev, isVisible: false }));
        }, 3000);
    };

    const closeToast = () => {
        setToast(prev => ({ ...prev, isVisible: false }));
    };

    const handleCreate = () => {
        setEditingCategory(null);
        setFormData({ name: '', slug: '', is_active: true });
        setIsSlugManuallyEdited(false);
        setIsModalOpen(true);
    };

    const handleEdit = (category: Category) => {
        setEditingCategory(category);
        setFormData({
            name: category.name,
            slug: category.slug,
            is_active: category.is_active
        });
        setIsSlugManuallyEdited(false);
        setIsModalOpen(true);
    };

    const handleDeleteClick = (category: Category) => {
        setCategoryToDelete(category);
        setDeleteModalOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!categoryToDelete) return;

        try {
            console.log('Deleting category:', categoryToDelete);
            await apiDelete(`/products/admin/categories/${categoryToDelete.slug}/`);
            showToast('Category deleted successfully', 'success');
            fetchCategories();
            setDeleteModalOpen(false);
            setCategoryToDelete(null);
        } catch (error) {
            console.error('Delete error:', error);
            showToast('Failed to delete category', 'error');
        }
    };

    const handleDeleteCancel = () => {
        setDeleteModalOpen(false);
        setCategoryToDelete(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            if (editingCategory) {
                await apiPut(`/products/admin/categories/${editingCategory.slug}/`, formData);
                showToast('Category updated successfully', 'success');
            } else {
                const response = await apiPost('/products/admin/categories/create/', formData);
                console.log('Create response:', response);
                showToast('Category created successfully', 'success');
            }
            setIsModalOpen(false);
            fetchCategories();
        } catch (error) {
            console.error('Submit error:', error);
            showToast(`Failed to ${editingCategory ? 'update' : 'create'} category`, 'error');
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
                <h1 className="font-bold text-gray-800 text-title-md dark:text-white/90">Categories</h1>
                <Button onClick={handleCreate} startIcon={<PlusIcon />}>
                    Create Category
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
                            {categories.map((category) => (
                                <TableRow key={category.id}>
                                    <TableCell className="px-5 py-4 text-gray-800 text-theme-sm dark:text-white/90">
                                        {category.name}
                                    </TableCell>
                                    <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                                        {category.slug}
                                    </TableCell>
                                    <TableCell className="px-4 py-3">
                                        <Badge
                                            size="sm"
                                            color={category.is_active ? "success" : "error"}
                                        >
                                            {category.is_active ? "Active" : "Inactive"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="px-4 py-3">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleEdit(category)}
                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-md dark:text-blue-400 dark:hover:bg-blue-900/20"
                                            >
                                                <PencilIcon />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteClick(category)}
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
                        {editingCategory ? 'Edit Category' : 'Create Category'}
                    </h2>
                    <form onSubmit={handleSubmit} key={editingCategory?.id || 'create'}>
                        <div className="mb-3">
                            <label className="block text-sm font-medium mb-1">Name</label>
                            <InputField
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                placeholder="Enter category name"
                            />
                        </div>
                        <div className="mb-3">
                            <label className="block text-sm font-medium mb-1">Slug</label>
                            <InputField
                                name="slug"
                                value={formData.slug}
                                onChange={handleInputChange}
                                placeholder="Enter category slug"
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
                                {editingCategory ? 'Update' : 'Create'}
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
                        Are you sure you want to delete the category  <b>{categoryToDelete?.name ?? ""}</b> ? This action cannot be undone.
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
