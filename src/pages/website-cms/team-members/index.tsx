import React, { useState, useEffect, useRef } from "react";
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

interface TeamMember {
    id: number;
    name: string;
    designation: string;
    description: string;
    feature_image_url: string;
    facebook_url: string;
    linkedin_url: string;
    instagram_url: string;
}

interface TeamMemberFormData {
    name: string;
    designation: string;
    description: string;
    feature_image_url: string;
    facebook_url: string;
    linkedin_url: string;
    instagram_url: string;
}

const TeamMemberPage = () => {
    const API_ORIGIN = 'https://api-tradeclover.techsperia.in';
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [memberToDelete, setMemberToDelete] = useState<TeamMember | null>(null);
    const [formData, setFormData] = useState<TeamMemberFormData>({
        name: '',
        designation: '',
        description: '',
        feature_image_url: '',
        facebook_url: '',
        linkedin_url: '',
        instagram_url: ''
    });
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info"; isVisible: boolean }>({
        message: '',
        type: 'success',
        isVisible: false
    });
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [imagePreviewUrl, setImagePreviewUrl] = useState('');
    const [uploadingFeatureImage, setUploadingFeatureImage] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const featureImageInputRef = useRef<HTMLInputElement | null>(null);

    // Fetch team members
    const fetchTeamMembers = async (isInitialLoad = false) => {
        try {
            const response = await apiGet('/cms/team-members/');
            setTeamMembers(response.data);
        } catch (error) {
            console.error('Fetch team members error:', error);
            showToast('Failed to fetch team members', 'error');
        } finally {
            if (isInitialLoad) {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        fetchTeamMembers(true); // Pass true for initial load
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
        setEditingMember(null);
        setFormData({
            name: '',
            designation: '',
            description: '',
            feature_image_url: '',
            facebook_url: '',
            linkedin_url: '',
            instagram_url: ''
        });
        setImagePreviewUrl('');
        setErrors({});
        setIsModalOpen(true);
    };

    const handleEdit = (member: TeamMember) => {
        const normalizedFeatureImageUrl = normalizeMediaUrl(member.feature_image_url || '');
        setEditingMember(member);
        setFormData({
            name: member.name,
            designation: member.designation,
            description: member.description,
            feature_image_url: normalizedFeatureImageUrl,
            facebook_url: member.facebook_url,
            linkedin_url: member.linkedin_url,
            instagram_url: member.instagram_url
        });
        setImagePreviewUrl(normalizedFeatureImageUrl);
        setIsModalOpen(true);
    };

    const handleDeleteClick = (member: TeamMember) => {
        setMemberToDelete(member);
        setDeleteModalOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!memberToDelete) return;

        try {
            await apiDelete(`/cms/team-members/${memberToDelete.id}/delete/`);
            showToast('Team member deleted successfully', 'success');
            fetchTeamMembers();
            setDeleteModalOpen(false);
            setMemberToDelete(null);
        } catch (error) {
            console.error('Delete error:', error);
            showToast('Failed to delete team member', 'error');
        }
    };

    const handleDeleteCancel = () => {
        setDeleteModalOpen(false);
        setMemberToDelete(null);
    };



    const validateForm = (): boolean => {
        const newErrors: { [key: string]: string } = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Name is required';
        }

        if (!formData.designation.trim()) {
            newErrors.designation = 'Designation is required';
        }

        if (!formData.description.trim()) {
            newErrors.description = 'Description is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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

    const uploadMediaFile = async (file: File, uploadFor: string) => {
        const uploadData = new FormData();
        uploadData.append('file', file);
        uploadData.append('upload_for', uploadFor);

        const response = await apiPost('/users/uploads/media/', uploadData, {}, true);
        return (response?.data?.file_url || response?.data?.files?.[0]?.file_url || '') as string;
    };

    const normalizeMediaUrl = (url: string) => {
        if (!url) return '';
        let normalized = url;

        // Backend sometimes returns duplicated segment: /uploads/uploads/...
        normalized = normalized.replace('/uploads/uploads/', '/uploads/');

        if (normalized.startsWith('http://testserver')) {
            normalized = normalized.replace('http://testserver', API_ORIGIN);
        }
        if (normalized.startsWith('/')) {
            normalized = `${API_ORIGIN}${normalized}`;
        }
        return normalized;
    };

    const handleFeatureImageFile = async (file: File | null) => {
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            showToast('Please upload a valid image file', 'error');
            return;
        }

        try {
            setUploadingFeatureImage(true);
            const uploadedUrl = await uploadMediaFile(file, 'team_member_feature_image');

            if (!uploadedUrl) {
                showToast('Image upload failed: missing file_url', 'error');
                return;
            }

            const normalizedUrl = normalizeMediaUrl(uploadedUrl);
            setFormData(prev => ({ ...prev, feature_image_url: normalizedUrl }));
            setImagePreviewUrl(normalizedUrl);
            showToast('Image uploaded successfully', 'success');
        } catch (error) {
            console.error('Feature image upload error:', error);
            showToast('Failed to upload image', 'error');
        } finally {
            setUploadingFeatureImage(false);
        }
    };

    const handleFeatureImageInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        await handleFeatureImageFile(file);
    };

    const handleFeatureImageDrop = async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragOver(false);
        const file = e.dataTransfer.files?.[0] || null;
        await handleFeatureImageFile(file);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate form
        if (!validateForm()) {
            return;
        }

        try {
            if (editingMember) {
                await apiPut(`/cms/team-members/${editingMember.id}/update/`, formData);
                showToast('Team member updated successfully', 'success');
            } else {
                const response = await apiPost('/cms/team-members/create/', formData);
                console.log('Create response:', response);
                showToast('Team member created successfully', 'success');
            }
            setIsModalOpen(false);
            setErrors({});
            fetchTeamMembers();
        } catch (error) {
            console.error('Submit error:', error);
            showToast(`Failed to ${editingMember ? 'update' : 'create'} team member`, 'error');
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
                <h1 className="font-bold text-gray-800 text-title-md dark:text-white/90">Team Members</h1>
                <Button onClick={handleCreate} startIcon={<PlusIcon />}>
                    Create Team Member
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
                                    Designation
                                </TableCell>
                                <TableCell
                                    isHeader
                                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                                >
                                    Description
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
                            {teamMembers.map((member) => (
                                <TableRow key={member.id}>
                                    <TableCell className="px-5 py-4 text-gray-800 text-theme-sm dark:text-white/90">
                                        {member.name}
                                    </TableCell>
                                    <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                                        {member.designation}
                                    </TableCell>
                                    <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                                        {member.description.length > 50
                                            ? `${member.description.substring(0, 50)}...`
                                            : member.description}
                                    </TableCell>
                                    <TableCell className="px-4 py-3">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleEdit(member)}
                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-md dark:text-blue-400 dark:hover:bg-blue-900/20"
                                            >
                                                <PencilIcon />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteClick(member)}
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
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} className="max-w-2xl">
                <div className="p-6">
                    <h2 className="text-lg font-bold mb-4">
                        {editingMember ? 'Edit Team Member' : 'Create Team Member'}
                    </h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Name</label>
                                <InputField
                                    name="name"
                                    defaultValue={formData.name}
                                    onChange={handleInputChange}
                                    placeholder="Enter name"

                                />
                                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Designation</label>
                                <InputField
                                    name="designation"
                                    defaultValue={formData.designation}
                                    onChange={handleInputChange}
                                    placeholder="Enter designation"

                                />
                                {errors.designation && <p className="text-red-500 text-sm mt-1">{errors.designation}</p>}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Description</label>
                            <textarea
                                name="description"
                                defaultValue={formData.description}
                                onChange={handleInputChange}
                                placeholder="Enter description"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                rows={3}
                            />
                            {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Feature Image</label>
                            <input
                                ref={featureImageInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleFeatureImageInputChange}
                                className="hidden"
                            />
                            <div
                                className={`rounded-lg border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${
                                    isDragOver
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                        : 'border-gray-300 hover:border-blue-400 dark:border-gray-600'
                                }`}
                                onClick={() => featureImageInputRef.current?.click()}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    setIsDragOver(true);
                                }}
                                onDragLeave={() => setIsDragOver(false)}
                                onDrop={handleFeatureImageDrop}
                            >
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                    {uploadingFeatureImage ? 'Uploading...' : 'Drag and drop image here, or click to browse'}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                    PNG, JPG, JPEG, WEBP
                                </p>
                            </div>
                            {(imagePreviewUrl || formData.feature_image_url) && (
                                <div className="mt-3">
                                    <p className="text-xs text-gray-500 mb-2">
                                        Image preview
                                    </p>
                                    <img
                                        src={imagePreviewUrl || formData.feature_image_url}
                                        alt="Feature preview"
                                        className="h-28 w-28 rounded-lg object-cover border border-gray-200 dark:border-gray-700"
                                    />
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Facebook URL</label>
                                <InputField
                                    name="facebook_url"
                                    defaultValue={formData.facebook_url}
                                    onChange={handleInputChange}
                                    placeholder="Enter Facebook URL"
                                    type="url"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">LinkedIn URL</label>
                                <InputField
                                    name="linkedin_url"
                                    defaultValue={formData.linkedin_url}
                                    onChange={handleInputChange}
                                    placeholder="Enter LinkedIn URL"
                                    type="url"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Instagram URL</label>
                            <InputField
                                name="instagram_url"
                                defaultValue={formData.instagram_url}
                                onChange={handleInputChange}
                                placeholder="Enter Instagram URL"
                                type="url"
                            />
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <Button
                                variant="outline"
                                onClick={() => setIsModalOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button>
                                {editingMember ? 'Update' : 'Create'}
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
                        Are you sure you want to delete the team member <b>{memberToDelete?.name ?? ""}</b>? This action cannot be undone.
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

export default TeamMemberPage
