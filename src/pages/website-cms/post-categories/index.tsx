import React, { useState, useEffect } from "react";
import AdminLayout from '@/layout/AdminLayout';
import Button from "@/components/ui/button/Button";
import {
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import InputField from "@/components/form/input/InputField";
import { PencilIcon, TrashBinIcon, PlusIcon } from "@/icons";
import Toast from "@/components/ui/toast/Toast";
import { apiGet, apiPost, apiPut, apiDelete } from "@/utils/api";

interface PostCategory {
    id: number;
    name: string;
    slug: string;
}

interface PostCategoryFormData {
    name: string;
}

const PostCategoryPage = () => {
    const [postCategories, setPostCategories] = useState<PostCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<PostCategory | null>(null);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState<PostCategory | null>(null);
    const [formData, setFormData] = useState<PostCategoryFormData>({
        name: ''
    });
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info"; isVisible: boolean }>({
        message: '',
        type: 'success',
        isVisible: false
    });
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    // Fetch post categories
    const fetchPostCategories = async (isInitialLoad = false) => {
        try {
            const response = await apiGet('/cms/post-categories/');
            setPostCategories(response.data);
        } catch (error) {
            console.error('Fetch post categories error:', error);
            showToast('Failed to fetch post categories', 'error');
        } finally {
            if (isInitialLoad) {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        fetchPostCategories(true); // Pass true for initial load
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
        setFormData({
            name: ''
        });
        setErrors({});
        setIsModalOpen(true);
    };

    const handleEdit = (category: PostCategory) => {
        setEditingCategory(category);
        setFormData({
            name: category.name
        });
        setIsModalOpen(true);
    };

    const handleDeleteClick = (category: PostCategory) => {
        setCategoryToDelete(category);
        setDeleteModalOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!categoryToDelete) return;

        try {
            await apiDelete(`/cms/post-categories/${categoryToDelete.slug}/delete/`);
            showToast('Post category deleted successfully', 'success');
            fetchPostCategories();
            setDeleteModalOpen(false);
            setCategoryToDelete(null);
        } catch (error) {
            console.error('Delete error:', error);
            showToast('Failed to delete post category', 'error');
        }
    };

    const handleDeleteCancel = () => {
        setDeleteModalOpen(false);
        setCategoryToDelete(null);
    };

    const validateForm = (): boolean => {
        const newErrors: { [key: string]: string } = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Name is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        // Clear error for this field when user starts typing
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate form
        if (!validateForm()) {
            return;
        }

        try {
            if (editingCategory) {
                await apiPut(`/cms/post-categories/${editingCategory.slug}/update/`, formData);
                showToast('Post category updated successfully', 'success');
            } else {
                const response = await apiPost('/cms/post-categories/create/', formData);
                console.log('Create response:', response);
                showToast('Post category created successfully', 'success');
            }
            setIsModalOpen(false);
            setErrors({});
            fetchPostCategories();
        } catch (error) {
            console.error('Submit error:', error);
            showToast(`Failed to ${editingCategory ? 'update' : 'create'} post category`, 'error');
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
                <h1 className="font-bold text-gray-800 text-title-md dark:text-white/90">Post Categories</h1>
                <Button onClick={handleCreate} startIcon={<PlusIcon />}>
                    Create Post Category
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
                                    Actions
                                </TableCell>
                            </TableRow>
                        </TableHeader>

                        <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                            {postCategories.map((category) => (
                                <TableRow key={category.id}>
                                    <TableCell className="px-5 py-4 text-gray-800 text-theme-sm dark:text-white/90">
                                        {category.name}
                                    </TableCell>
                                    <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                                        {category.slug}
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
                <div className="p-6">
                    <h2 className="text-lg font-bold mb-4">
                        {editingCategory ? 'Edit Post Category' : 'Create Post Category'}
                    </h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Name</label>
                            <InputField
                                name="name"
                                defaultValue={formData.name}
                                onChange={handleInputChange}
                                placeholder="Enter category name"
                            />
                            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
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
                        Are you sure you want to delete the post category <b>{categoryToDelete?.name ?? ""}</b>? This action cannot be undone.
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
    )
}

export default PostCategoryPage
