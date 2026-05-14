import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
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
import { PencilIcon, TrashBinIcon, PlusIcon } from "@/icons";
import Toast from "@/components/ui/toast/Toast";
import { apiGet, apiDelete } from "@/utils/api";

interface Post {
    id: number;
    title: string;
    slug: string;
    post_type: 'news' | 'event' | 'exhibition';
    post_category: number;
    post_category_name: string;
    feature_image_url: string;
    detail_image_url: string;
    date: string;
}

interface PaginationData {
    count: number;
    next: string | null;
    previous: string | null;
    results: Post[];
}

const PostsPage = () => {
    const router = useRouter();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [postToDelete, setPostToDelete] = useState<Post | null>(null);
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info"; isVisible: boolean }>({
        message: '',
        type: 'success',
        isVisible: false
    });
    const [pagination, setPagination] = useState<{
        count: number;
        next: string | null;
        previous: string | null;
        currentPage: number;
        totalPages: number;
    }>({
        count: 0,
        next: null,
        previous: null,
        currentPage: 1,
        totalPages: 1
    });

    // Fetch posts
    const fetchPosts = async (page = 1) => {
        try {
            setLoading(true);
            const response = await apiGet(`/cms/posts/?page=${page}`);
            const data: PaginationData = response.data;

            setPosts(data.results);
            setPagination({
                count: data.count,
                next: data.next,
                previous: data.previous,
                currentPage: page,
                totalPages: Math.ceil(data.count / 10) // Assuming 10 items per page
            });
        } catch (error) {
            console.error('Fetch posts error:', error);
            showToast('Failed to fetch posts', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPosts();
    }, []);

    const showToast = (message: string, type: "success" | "error" | "info") => {
        setToast({ message, type, isVisible: true });
        setTimeout(() => {
            setToast(prev => ({ ...prev, isVisible: false }));
        }, 3000);
    };

    const closeToast = () => {
        setToast(prev => ({ ...prev, isVisible: false }));
    };

    const handleCreate = () => {
        router.push('/website-cms/posts/create');
    };

    const handleEdit = (post: Post) => {
        router.push(`/website-cms/posts/edit?slug=${post.slug}`);
    };

    const handleDeleteClick = (post: Post) => {
        setPostToDelete(post);
        setDeleteModalOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!postToDelete) return;

        try {
            await apiDelete(`/cms/posts/${postToDelete.slug}/delete/`);
            showToast('Post deleted successfully', 'success');
            fetchPosts(pagination.currentPage);
            setDeleteModalOpen(false);
            setPostToDelete(null);
        } catch (error) {
            console.error('Delete error:', error);
            showToast('Failed to delete post', 'error');
        }
    };

    const handleDeleteCancel = () => {
        setDeleteModalOpen(false);
        setPostToDelete(null);
    };

    const handlePageChange = (page: number) => {
        fetchPosts(page);
    };

    const renderPagination = () => {
        if (pagination.totalPages <= 1) return null;

        const pages = [];
        const startPage = Math.max(1, pagination.currentPage - 2);
        const endPage = Math.min(pagination.totalPages, pagination.currentPage + 2);

        for (let i = startPage; i <= endPage; i++) {
            pages.push(
                <button
                    key={i}
                    onClick={() => handlePageChange(i)}
                    className={`px-3 py-2 mx-1 rounded ${
                        i === pagination.currentPage
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                >
                    {i}
                </button>
            );
        }

        return (
            <div className="flex justify-center items-center mt-6">
                <button
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                    disabled={!pagination.previous}
                    className="px-3 py-2 mx-1 rounded bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Previous
                </button>
                {pages}
                <button
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                    disabled={!pagination.next}
                    className="px-3 py-2 mx-1 rounded bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Next
                </button>
            </div>
        );
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
                <h1 className="font-bold text-gray-800 text-title-md dark:text-white/90">Posts</h1>
                <Button onClick={handleCreate} startIcon={<PlusIcon />}>
                    Create Post
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
                                    Title
                                </TableCell>
                                <TableCell
                                    isHeader
                                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                                >
                                    Type
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
                                    Date
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
                            {posts.map((post) => (
                                <TableRow key={post.id}>
                                    <TableCell className="px-5 py-4 text-gray-800 text-theme-sm dark:text-white/90">
                                        {post.title}
                                    </TableCell>
                                    <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                            post.post_type === 'news' ? 'bg-blue-100 text-blue-800' :
                                            post.post_type === 'event' ? 'bg-green-100 text-green-800' :
                                            'bg-purple-100 text-purple-800'
                                        }`}>
                                            {post.post_type}
                                        </span>
                                    </TableCell>
                                    <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                                        {post.post_category_name}
                                    </TableCell>
                                    <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                                        {new Date(post.date).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell className="px-4 py-3">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleEdit(post)}
                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-md dark:text-blue-400 dark:hover:bg-blue-900/20"
                                            >
                                                <PencilIcon />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteClick(post)}
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

            {renderPagination()}

            {/* Delete Confirmation Modal */}
            <Modal isOpen={deleteModalOpen} onClose={handleDeleteCancel} className="max-w-sm">
                <div className="p-6">
                    <h2 className="text-lg font-bold mb-3 text-center">Confirm Delete</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-6 text-center">
                        Are you sure you want to delete the post <b>{postToDelete?.title ?? ""}</b>? This action cannot be undone.
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

export default PostsPage
