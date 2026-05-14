import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import AdminLayout from '@/layout/AdminLayout';
import Button from "@/components/ui/button/Button";
import InputField from "@/components/form/input/InputField";
import TextEditor from "@/components/form/TextEditor";
import Select from "@/components/form/Select";
import Toast from "@/components/ui/toast/Toast";
import { apiGet, apiPost } from "@/utils/api";

interface PostCategory {
    id: number;
    name: string;
    slug: string;
}

interface PostFormData {
    title: string;
    post_type: 'news' | 'event' | 'exhibition';
    post_category: string;
    feature_image_url: string;
    detail_image_url: string;
    post_content: string;
    date: string;
    most_read: boolean;
    meta_title: string;
    meta_description: string;
    meta_keywords: string;
}

const CreatePostPage = () => {
    const API_ORIGIN = 'https://api-tradeclover.techsperia.in';
    const router = useRouter();
    const [categories, setCategories] = useState<PostCategory[]>([]);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<PostFormData>({
        title: '',
        post_type: 'news',
        post_category: '',
        feature_image_url: '',
        detail_image_url: '',
        post_content: '',
        date: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
        most_read: false,
        meta_title: '',
        meta_description: '',
        meta_keywords: ''
    });
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info"; isVisible: boolean }>({
        message: '',
        type: 'success',
        isVisible: false
    });
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [featureImagePreview, setFeatureImagePreview] = useState('');
    const [detailImagePreview, setDetailImagePreview] = useState('');
    const [uploadingFeatureImage, setUploadingFeatureImage] = useState(false);
    const [uploadingDetailImage, setUploadingDetailImage] = useState(false);
    const [isFeatureDragOver, setIsFeatureDragOver] = useState(false);
    const [isDetailDragOver, setIsDetailDragOver] = useState(false);
    const featureImageInputRef = useRef<HTMLInputElement | null>(null);
    const detailImageInputRef = useRef<HTMLInputElement | null>(null);

    // Fetch categories
    const fetchCategories = async () => {
        try {
            const response = await apiGet('/cms/post-categories/');
            setCategories(response.data);
        } catch (error) {
            console.error('Fetch categories error:', error);
            showToast('Failed to fetch categories', 'error');
        }
    };

    useEffect(() => {
        fetchCategories();
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

    const validateForm = (): boolean => {
        const newErrors: { [key: string]: string } = {};

        if (!formData.title.trim()) {
            newErrors.title = 'Title is required';
        }
        if (!formData.post_category) {
            newErrors.post_category = 'Category is required';
        }
        if (!formData.date) {
            newErrors.date = 'Date is required';
        }
        if (!formData.post_content) {
            newErrors.post_content = 'Post Content is required';
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

    const handleSelectChange = (name: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        // Clear error for this field when user selects
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const handleTextAreaChange = (value: string) => {
        setFormData(prev => ({
            ...prev,
            post_content: value
        }));

        // Clear error for this field when user starts typing
        if (errors.post_content) {
            setErrors(prev => ({
                ...prev,
                post_content: ''
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
        let normalized = url.replace('/uploads/uploads/', '/uploads/');

        if (normalized.startsWith('http://testserver')) {
            normalized = normalized.replace('http://testserver', API_ORIGIN);
        }
        if (normalized.startsWith('/')) {
            normalized = `${API_ORIGIN}${normalized}`;
        }

        return normalized;
    };

    const handleImageUpload = async (
        file: File | null,
        uploadFor: 'post_feature_image' | 'post_detail_image',
        targetField: 'feature_image_url' | 'detail_image_url'
    ) => {
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            showToast('Please upload a valid image file', 'error');
            return;
        }

        const setUploading = targetField === 'feature_image_url' ? setUploadingFeatureImage : setUploadingDetailImage;
        const setPreview = targetField === 'feature_image_url' ? setFeatureImagePreview : setDetailImagePreview;

        try {
            setUploading(true);
            const uploadedUrl = await uploadMediaFile(file, uploadFor);
            if (!uploadedUrl) {
                showToast('Image upload failed: missing file_url', 'error');
                return;
            }

            const normalizedUrl = normalizeMediaUrl(uploadedUrl);
            setFormData(prev => ({ ...prev, [targetField]: normalizedUrl }));
            setPreview(normalizedUrl);
            showToast('Image uploaded successfully', 'success');
        } catch (error) {
            console.error(`${targetField} upload error:`, error);
            showToast('Failed to upload image', 'error');
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate form
        if (!validateForm()) {
            return;
        }

        setLoading(true);

        try {
            // Prepare data for API
            const submitData = {
                ...formData,
                post_category: parseInt(formData.post_category)
            };

            await apiPost('/cms/posts/create/', submitData);
            showToast('Post created successfully', 'success');

            // Redirect to posts list after successful creation
            setTimeout(() => {
                router.push('/website-cms/posts');
            }, 1500);

        } catch (error) {
            console.error('Create post error:', error);
            showToast('Failed to create post', 'error');
        } finally {
            setLoading(false);
        }
    };

    const postTypeOptions = [
        { value: 'news', label: 'News' },
        { value: 'event', label: 'Event' },
        { value: 'exhibition', label: 'Exhibition' }
    ];

    const categoryOptions = categories.map(category => ({
        value: category.id.toString(),
        label: category.name
    }));

    return (
        <AdminLayout>
            <div className="flex justify-between items-center mb-6">
                <h1 className="font-bold text-gray-800 text-title-md dark:text-white/90">Create Post</h1>
                <Button
                    variant="outline"
                    onClick={() => router.push('/website-cms/posts')}
                >
                    Back to Posts
                </Button>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-white/[0.05] dark:bg-white/[0.03]">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Title */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                                Title *
                            </label>
                            <InputField
                                name="title"
                                type="text"
                                placeholder="Enter post title"
                                defaultValue={formData.title}
                                onChange={handleInputChange}
                                error={!!errors.title}
                            />
                            {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
                        </div>

                        {/* Post Type */}
                        <div>
                            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                                Post Type *
                            </label>
                            <Select
                                options={postTypeOptions}
                                placeholder="Select post type"
                                defaultValue={formData.post_type}
                                onChange={(value) => handleSelectChange('post_type', value)}
                            />
                        </div>

                        {/* Post Category */}
                        <div>
                            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                                Category *
                            </label>
                            <Select
                                options={categoryOptions}
                                placeholder="Select category"
                                defaultValue={formData.post_category}
                                onChange={(value) => handleSelectChange('post_category', value)}
                            />
                            {errors.post_category && <p className="text-red-500 text-sm mt-1">{errors.post_category}</p>}
                        </div>

                        {/* Date */}
                        <div>
                            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                                Date *
                            </label>
                            <InputField
                                name="date"
                                type="date"
                                defaultValue={formData.date}
                                onChange={handleInputChange}
                                error={!!errors.date}
                            />
                            {errors.date && <p className="text-red-500 text-sm mt-1">{errors.date}</p>}
                        </div>

                        {/* Feature Image Upload */}
                        <div>
                            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                                Feature Image
                            </label>
                            <input
                                ref={featureImageInputRef}
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleImageUpload(e.target.files?.[0] || null, 'post_feature_image', 'feature_image_url')}
                                className="hidden"
                            />
                            <div
                                className={`rounded-lg border-2 border-dashed p-4 text-center cursor-pointer transition-colors ${
                                    isFeatureDragOver ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 hover:border-blue-400 dark:border-gray-600'
                                }`}
                                onClick={() => featureImageInputRef.current?.click()}
                                onDragOver={(e) => { e.preventDefault(); setIsFeatureDragOver(true); }}
                                onDragLeave={() => setIsFeatureDragOver(false)}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    setIsFeatureDragOver(false);
                                    handleImageUpload(e.dataTransfer.files?.[0] || null, 'post_feature_image', 'feature_image_url');
                                }}
                            >
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                    {uploadingFeatureImage ? 'Uploading...' : 'Drag and drop image here, or click to browse'}
                                </p>
                            </div>
                            {(featureImagePreview || formData.feature_image_url) && (
                                <img
                                    src={featureImagePreview || formData.feature_image_url}
                                    alt="Feature preview"
                                    className="mt-2 h-24 w-24 rounded-lg object-cover border border-gray-200 dark:border-gray-700"
                                />
                            )}
                        </div>

                        {/* Detail Image Upload */}
                        <div>
                            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                                Detail Image
                            </label>
                            <input
                                ref={detailImageInputRef}
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleImageUpload(e.target.files?.[0] || null, 'post_detail_image', 'detail_image_url')}
                                className="hidden"
                            />
                            <div
                                className={`rounded-lg border-2 border-dashed p-4 text-center cursor-pointer transition-colors ${
                                    isDetailDragOver ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 hover:border-blue-400 dark:border-gray-600'
                                }`}
                                onClick={() => detailImageInputRef.current?.click()}
                                onDragOver={(e) => { e.preventDefault(); setIsDetailDragOver(true); }}
                                onDragLeave={() => setIsDetailDragOver(false)}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    setIsDetailDragOver(false);
                                    handleImageUpload(e.dataTransfer.files?.[0] || null, 'post_detail_image', 'detail_image_url');
                                }}
                            >
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                    {uploadingDetailImage ? 'Uploading...' : 'Drag and drop image here, or click to browse'}
                                </p>
                            </div>
                            {(detailImagePreview || formData.detail_image_url) && (
                                <img
                                    src={detailImagePreview || formData.detail_image_url}
                                    alt="Detail preview"
                                    className="mt-2 h-24 w-24 rounded-lg object-cover border border-gray-200 dark:border-gray-700"
                                />
                            )}
                        </div>

                        {/* Meta Title */}
                        <div>
                            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                                Meta Title
                            </label>
                            <InputField
                                name="meta_title"
                                type="text"
                                placeholder="SEO meta title"
                                defaultValue={formData.meta_title}
                                onChange={handleInputChange}
                            />
                        </div>

                        {/* Meta Keywords */}
                        <div>
                            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                                Meta Keywords
                            </label>
                            <InputField
                                name="meta_keywords"
                                type="text"
                                placeholder="keyword1, keyword2, keyword3"
                                defaultValue={formData.meta_keywords}
                                onChange={handleInputChange}
                            />
                        </div>

                        {/* Most Read Checkbox */}
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="most_read"
                                checked={formData.most_read}
                                onChange={(e) => setFormData(prev => ({ ...prev, most_read: e.target.checked }))}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label htmlFor="most_read" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                                Mark as Most Read
                            </label>
                        </div>
                    </div>

                    {/* Meta Description */}
                    <div className=" meta-desc-textbox">
                        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                            Meta Description
                        </label>
                        <TextEditor
                            placeholder="SEO meta description"
                            value={formData.meta_description}
                            onChange={(value) => setFormData(prev => ({ ...prev, meta_description: value }))}
                        />
                    </div>

                    {/* Post Content - Text Editor */}
                    <div className=" post-content-textbox">
                        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                            Post Content *
                        </label>
                        <TextEditor
                            placeholder="Enter post content (HTML/Text)"
                            value={formData.post_content}
                            onChange={handleTextAreaChange}
                            hint="Use the toolbar to format your content"
                        />
                        {errors.post_content && <p className="text-red-500 text-sm mt-1">{errors.post_content}</p>}
                    </div>

                    {/* Submit Buttons */}
                    <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                        <Button
                            variant="outline"
                            onClick={() => router.push('/website-cms/posts')}
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Creating...' : 'Create Post'}
                        </button>
                    </div>
                </form>
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

export default CreatePostPage;
