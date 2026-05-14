import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import AdminLayout from '@/layout/AdminLayout';
import { ChevronLeftIcon } from "@/icons";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import Toast from "@/components/ui/toast/Toast";
import { apiGet, apiPost } from "@/utils/api";

interface SellerDetail {
    id?: number;
    first_name: string;
    last_name: string;
    business_logo: string | null;
    head_office_country: string;
    average_rating?: number | null;
    reviews_count?: number | null;
}

interface ProductDetail {
    id: number;
    slug: string;
    product_code: string;
    product_name: string;
    category_detail: {
        id: number;
        name: string;
    };
    subcategory_detail: {
        id: number;
        name: string;
    };
    hsn_code: string;
    description: string;
    technical_specification: string;
    product_dimension: string;
    product_weight: string;
    unit_price: string;
    price_on_request: boolean;
    minimum_order_quantity: number;
    purchase_price: string;
    location?: string | null;
    supply_type_detail?: { id: number; name: string; label: string } | null;
    pricing_terms_detail?: { id: number; name: string; label: string } | null;
    condition_detail?: { id: number; name: string; label: string } | null;
    tags: string[] | null;
    product_images: string[] | null;
    status: 'draft' | 'pending_approval' | 'active' | 'rejected';
    currency?: string | null;
    profit_margin?: string | null;
    views_count?: number | null;
    inquiries_count?: number | null;
    approved_by?: string | null;
    average_rating?: number | null;
    reviews_count?: number | null;
    featured?: boolean;
    rejection_reason?: string | null;
    seller_detail: SellerDetail;
    images?: unknown;
    product_image?: unknown;
    main_image?: unknown;
    thumbnail?: unknown;
}

const ProductDetailPage = () => {
    const API_ORIGIN = 'https://api-tradeclover.techsperia.in';
    const router = useRouter();
    const { slug } = router.query;
    const [product, setProduct] = useState<ProductDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [toast, setToast] = useState<{
        message: string;
        type: 'success' | 'error' | 'info';
        isVisible: boolean;
    }>({
        message: '',
        type: 'success',
        isVisible: false,
    });

    useEffect(() => {
        if (typeof slug === "string" && slug.trim()) {
            fetchProductDetail(slug);
        }
    }, [slug]);

    const fetchProductDetail = async (productSlug: string) => {
        try {
            setLoading(true);
            setError(null);

            const response = await apiGet(`/products/rud/${productSlug}/`);
            const productData: ProductDetail = response.data;

            // Fetch user name if needed
            try {
                // Assuming the API returns created_by_name or we need to fetch it separately
                setProduct(productData);
            } catch (userError) {
                console.error('Error fetching user info:', userError);
                setProduct(productData);
            }
        } catch (error) {
            console.error('Fetch product detail error:', error);
            setError('Failed to fetch product details');
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const statusConfig = {
            draft: 'bg-gray-100 text-gray-800',
            pending_approval: 'bg-yellow-100 text-yellow-800',
            active: 'bg-green-100 text-green-800',
            rejected: 'bg-red-100 text-red-800'
        };

        const displayStatus = status.replace('_', ' ').toUpperCase();

        return (
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusConfig[status as keyof typeof statusConfig] || 'bg-gray-100 text-gray-800'}`}>
                {displayStatus}
            </span>
        );
    };

    const handleBack = () => {
        router.push('/products');
    };

    const showToast = (message: string, type: 'success' | 'error' | 'info') => {
        setToast({ message, type, isVisible: true });
        setTimeout(() => {
            setToast((prev) => ({ ...prev, isVisible: false }));
        }, 3000);
    };

    const closeToast = () => {
        setToast((prev) => ({ ...prev, isVisible: false }));
    };

    const handleProductReview = async (action: 'active' | 'rejected') => {
        if (!product) {
            return;
        }

        try {
            setActionLoading(true);

            const payload: { action: 'active' | 'rejected'; reason?: string } = { action };
            const trimmedReason = rejectionReason.trim();

            if (action === 'rejected' && trimmedReason) {
                payload.reason = trimmedReason;
            }

            await apiPost(`/products/admin/${product.id}/review/`, payload);
            await fetchProductDetail(product.slug);

            showToast(
                action === 'active' ? 'Product approved successfully' : 'Product rejected successfully',
                'success'
            );

            setRejectionReason('');
            setShowApproveModal(false);
            setShowRejectModal(false);
        } catch (reviewError: any) {
            console.error('Product review error:', reviewError);
            const apiErrorMessage =
                reviewError?.response?.data?.message ||
                reviewError?.response?.data?.error ||
                reviewError?.response?.data?.detail;

            showToast(apiErrorMessage || 'Failed to review product', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const displayValue = (value: any): string => {
        if (value === null || value === undefined || value === '') {
            return 'N/A';
        }
        return String(value);
    };

    const extractImageValue = (value: unknown): string | null => {
        if (!value) {
            return null;
        }

        if (typeof value === 'string') {
            const trimmedValue = value.trim();
            return trimmedValue || null;
        }

        if (typeof value === 'object') {
            const imageObject = value as Record<string, unknown>;
            const possibleKeys = ['image', 'image_url', 'url', 'src', 'file'];

            for (const key of possibleKeys) {
                const extractedValue = extractImageValue(imageObject[key]);
                if (extractedValue) {
                    return extractedValue;
                }
            }
        }

        return null;
    };

    const normalizeProductImages = (productData: ProductDetail | null): string[] => {
        if (!productData) {
            return [];
        }

        const possibleImageSources: unknown[] = [
            productData.product_images,
            productData.images,
            productData.product_image,
            productData.main_image,
            productData.thumbnail,
        ];

        for (const source of possibleImageSources) {
            if (!source) {
                continue;
            }

            if (Array.isArray(source)) {
                return source
                    .map((item) => extractImageValue(item))
                    .filter((image): image is string => Boolean(image));
            }

            if (typeof source === 'string') {
                const trimmedSource = source.trim();

                if (!trimmedSource) {
                    continue;
                }

                if (trimmedSource.startsWith('[') && trimmedSource.endsWith(']')) {
                    try {
                        const parsedImages = JSON.parse(trimmedSource);
                        if (Array.isArray(parsedImages)) {
                            return parsedImages
                                .map((item) => extractImageValue(item))
                                .filter((image): image is string => Boolean(image));
                        }
                    } catch (parseError) {
                        console.error('Failed to parse product images:', parseError);
                    }
                }

                return [trimmedSource];
            }

            const singleImage = extractImageValue(source);
            if (singleImage) {
                return [singleImage];
            }
        }

        return [];
    };

    const getProductImageSrc = (image: string): string => {
        if (!image) {
            return '/images/placeholder.png';
        }

        if (image.startsWith('data:image')) {
            return image;
        }

        if (image.startsWith('http://') || image.startsWith('https://')) {
            // Direct URL - return as is
            return image;
        }

        if (image.startsWith('/')) {
            // Relative path - prepend API origin
            return `${API_ORIGIN}${image}`;
        }

        return `data:image/jpeg;base64,${image}`;
    };

    const productImages = normalizeProductImages(product);

    if (loading) {
        return (
            <AdminLayout>
                <div className="flex justify-center items-center h-64">
                    <div>Loading...</div>
                </div>
            </AdminLayout>
        );
    }

    if (error || !product) {
        return (
            <AdminLayout>
                <div className="flex flex-col items-center justify-center h-64">
                    <div className="text-red-600 mb-4">{error || 'Product not found'}</div>
                    <button
                        onClick={handleBack}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        <ChevronLeftIcon />
                        Back to Products
                    </button>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className=" mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <button
                        onClick={handleBack}
                        className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
                    >
                        <ChevronLeftIcon />
                        Back to Products
                    </button>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">
                        Product Details
                    </h1>
                </div>

                {/* Product Images */}
                <div className="mb-6">
                    <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white/90">
                        Product Images
                    </h2>
                    {productImages.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {productImages.map((image, index) => (
                                <div key={index} className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                                    <img
                                        src={getProductImageSrc(image)}
                                        alt={`${product.product_name} - Image ${index + 1}`}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            e.currentTarget.src = '/images/placeholder.png';
                                        }}
                                        loading="lazy"
                                    />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-lg border border-dashed border-gray-300 px-4 py-8 text-center text-gray-500 dark:border-gray-700 dark:text-gray-400">
                            No product images available
                        </div>
                    )}
                </div>

                {/* Product Information */}
                <div className="bg-white dark:bg-white/[0.03] rounded-xl border border-gray-200 dark:border-white/[0.05] p-6">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white/90 mb-2">
                                {product.product_name}
                            </h2>
                            <p className="text-gray-500 dark:text-gray-400">
                                Code: {product.product_code}
                            </p>
                        </div>
                        <div className="text-right">
                            {getStatusBadge(product.status)}
                        </div>
                    </div>

                    {product.status === 'pending_approval' && (
                        <div className="mb-6 flex flex-wrap gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-white/[0.05] dark:bg-white/[0.02]">
                            <Button
                                variant="primary"
                                onClick={() => setShowApproveModal(true)}
                                className="bg-green-600 hover:bg-green-700"
                                disabled={actionLoading}
                            >
                                Approve Product
                            </Button>
                            <Button
                                variant="primary"
                                onClick={() => setShowRejectModal(true)}
                                className="bg-red-600 hover:bg-red-700"
                                disabled={actionLoading}
                            >
                                Reject Product
                            </Button>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {/* Basic Information */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 border-b pb-2">
                                Basic Information
                            </h3>

                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                                    Product Code
                                </label>
                                <p className="text-gray-800 dark:text-white/90">{product.product_code || 'N/A'}</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                                    Product Name
                                </label>
                                <p className="text-gray-800 dark:text-white/90">{product.product_name || 'N/A'}</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                                    Category
                                </label>
                                <p className="text-gray-800 dark:text-white/90">{product.category_detail?.name || 'N/A'}</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                                    Subcategory
                                </label>
                                <p className="text-gray-800 dark:text-white/90">{product.subcategory_detail?.name || 'N/A'}</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                                    HSN Code
                                </label>
                                <p className="text-gray-800 dark:text-white/90">{product.hsn_code || 'N/A'}</p>
                            </div>
                        </div>

                        {/* Trade Details */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 border-b pb-2">
                                Trade Details
                            </h3>

                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                                    Location
                                </label>
                                <p className="text-gray-800 dark:text-white/90">{product.location || 'N/A'}</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                                    Supply Type
                                </label>
                                <p className="text-gray-800 dark:text-white/90">
                                    {product.supply_type_detail?.name ?? product.supply_type_detail?.label ?? 'N/A'}
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                                    Pricing Terms
                                </label>
                                <p className="text-gray-800 dark:text-white/90">
                                    {product.pricing_terms_detail?.name ?? product.pricing_terms_detail?.label ?? 'N/A'}
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                                    Condition
                                </label>
                                <p className="text-gray-800 dark:text-white/90">
                                    {product.condition_detail?.name ?? product.condition_detail?.label ?? 'N/A'}
                                </p>
                            </div>
                        </div>

                        {/* Pricing & Specifications */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 border-b pb-2">
                                Pricing & Specifications
                            </h3>

                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                                    Unit Price
                                </label>
                                <p className="text-gray-800 dark:text-white/90">${product.unit_price || 'N/A'}</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                                    Purchase Price
                                </label>
                                <p className="text-gray-800 dark:text-white/90">${product.purchase_price || 'N/A'}</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                                    Minimum Order Quantity
                                </label>
                                <p className="text-gray-800 dark:text-white/90">{product.minimum_order_quantity || 'N/A'}</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                                    Price on Request
                                </label>
                                <p className="text-gray-800 dark:text-white/90">{product.price_on_request ? 'Yes' : 'No'}</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                                    Product Weight
                                </label>
                                <p className="text-gray-800 dark:text-white/90">{product.product_weight || 'N/A'}</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                                    Product Dimension
                                </label>
                                <p className="text-gray-800 dark:text-white/90">{product.product_dimension || 'N/A'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Additional Information */}
                    <div className="mt-6">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 border-b pb-2 mb-4">
                            Additional Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                                    Currency
                                </label>
                                <p className="text-gray-800 dark:text-white/90">{displayValue(product.currency)}</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                                    Profit Margin
                                </label>
                                <p className="text-gray-800 dark:text-white/90">{displayValue(product.profit_margin)}</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                                    Views Count
                                </label>
                                <p className="text-gray-800 dark:text-white/90">{displayValue(product.views_count)}</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                                    Inquiries Count
                                </label>
                                <p className="text-gray-800 dark:text-white/90">{displayValue(product.inquiries_count)}</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                                    Approved By
                                </label>
                                <p className="text-gray-800 dark:text-white/90">{displayValue(product.approved_by)}</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                                    Average Rating
                                </label>
                                <p className="text-gray-800 dark:text-white/90">
                                    {displayValue(product.average_rating ?? product.seller_detail?.average_rating)}
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                                    Reviews Count
                                </label>
                                <p className="text-gray-800 dark:text-white/90">
                                    {displayValue(product.reviews_count ?? product.seller_detail?.reviews_count)}
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                                    Featured
                                </label>
                                <p className="text-gray-800 dark:text-white/90">
                                    {typeof product.featured === 'boolean' ? (product.featured ? 'Yes' : 'No') : 'N/A'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Seller Details */}
                    {product.seller_detail && (
                        <div className="mt-6">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 border-b pb-2 mb-4">
                                Seller Details
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                                        Seller Name
                                    </label>
                                    <p className="text-gray-800 dark:text-white/90">
                                        {product.seller_detail.first_name} {product.seller_detail.last_name}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                                        Head Office Country
                                    </label>
                                    <p className="text-gray-800 dark:text-white/90">
                                        {product.seller_detail.head_office_country}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                                        Seller Average Rating
                                    </label>
                                    <p className="text-gray-800 dark:text-white/90">
                                        {displayValue(product.seller_detail.average_rating)}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                                        Seller Reviews Count
                                    </label>
                                    <p className="text-gray-800 dark:text-white/90">
                                        {displayValue(product.seller_detail.reviews_count)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Description */}
                    <div className="mt-6">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 border-b pb-2 mb-4">
                            Description
                        </h3>
                        <div className="prose dark:prose-invert max-w-none">
                            <div
                                className="text-gray-700 dark:text-gray-300"
                                dangerouslySetInnerHTML={{
                                    __html: product.description
                                }}
                            />
                        </div>
                    </div>

                    {/* Technical Specifications */}
                    {product.technical_specification && (
                        <div className="mt-6">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 border-b pb-2 mb-4">
                                Technical Specifications
                            </h3>
                            <div className="prose dark:prose-invert max-w-none">
                                <div
                                    className="text-gray-700 dark:text-gray-300"
                                    dangerouslySetInnerHTML={{
                                        __html: product.technical_specification
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Tags */}
                    {product.tags && product.tags.length > 0 && (
                        <div className="mt-6">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 border-b pb-2 mb-4">
                                Tags
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {product.tags.map((tag, index) => (
                                    <span
                                        key={index}
                                        className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {product.rejection_reason && (
                        <div className="mt-6">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 border-b pb-2 mb-4">
                                Rejection Reason
                            </h3>
                            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                                {product.rejection_reason}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <Modal
                isOpen={showApproveModal}
                onClose={() => setShowApproveModal(false)}
                className="max-w-sm"
            >
                <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Approve Product
                    </h3>
                    <p className="text-gray-600 mb-6">
                        Are you sure you want to mark this product as active?
                    </p>
                    <div className="flex justify-end gap-3">
                        <Button
                            variant="outline"
                            onClick={() => setShowApproveModal(false)}
                            className="px-4 py-2"
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            onClick={() => handleProductReview('active')}
                            className="bg-green-600 hover:bg-green-700 px-4 py-2"
                            disabled={actionLoading}
                        >
                            {actionLoading ? 'Processing...' : 'Confirm Approval'}
                        </Button>
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={showRejectModal}
                onClose={() => setShowRejectModal(false)}
                className="max-w-md"
            >
                <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Reject Product
                    </h3>
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Reason (Optional)
                        </label>
                        <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-red-500"
                            rows={4}
                            placeholder="Enter the reason for rejection..."
                        />
                    </div>
                    <div className="flex justify-end gap-3">
                        <Button
                            variant="outline"
                            onClick={() => setShowRejectModal(false)}
                            className="px-4 py-2"
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            onClick={() => handleProductReview('rejected')}
                            className="bg-red-600 hover:bg-red-700 px-4 py-2"
                            disabled={actionLoading}
                        >
                            {actionLoading ? 'Processing...' : 'Confirm Rejection'}
                        </Button>
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
};

export default ProductDetailPage;
