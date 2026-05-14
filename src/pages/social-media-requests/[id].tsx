import React, { useState, useEffect } from "react";
import { useRouter } from 'next/router';
import AdminLayout from '@/layout/AdminLayout';
import { apiGet, apiPatch } from "@/utils/api";

interface SocialMediaRequest {
    id: number;
    user?: {
        id: number;
        email: string;
        first_name: string;
        last_name: string;
        business_name?: string;
        business_profile?: {
            first_name?: string;
            last_name?: string;
            business_name?: string;
        };
    };
    user_id?: number;
    user_phone?: string;
    product_id?: number;
    product_name?: string;
    title?: string;
    description?: string;
    content: string;
    media_url?: string;
    platform?: string;
    facebook?: boolean;
    instagram?: boolean;
    twitter?: boolean;
    whatsapp?: boolean;
    status: 'pending' | 'approved' | 'posted' | 'rejected';
    rejection_reason?: string;
    created_at: string;
    updated_at: string;
    reviewed_at?: string;
    reviewed_by?: number;
}

const SocialMediaRequestViewPage = () => {
    const router = useRouter();
    const { id } = router.query;
    const [request, setRequest] = useState<SocialMediaRequest | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [reviewLoading, setReviewLoading] = useState(false);
    const [validationError, setValidationError] = useState('');

    // Fetch request details
    const fetchRequest = async () => {
        if (!id) return;
        
        try {
            setLoading(true);
            setError(null);
            
            // Fetch all requests since individual endpoint doesn't exist
            const response = await apiGet('/users/admin/social-media-requests/');
            console.log('Requests API Response:', response.data);
            
            // Find the specific request by ID
            const foundRequest = response.data.find((req: any) => req.id.toString() === id.toString());
            
            if (!foundRequest) {
                setError('Request not found');
                return;
            }
            
            let userDetails = null;
            
            // Fetch user details if user_id exists
            if (foundRequest.user_id) {
                try {
                    const possibleEndpoints = [
                        `/users/admin/users/${foundRequest.user_id}/`,
                        `/admin/users/${foundRequest.user_id}/`,
                        `/user/${foundRequest.user_id}/`,
                        `/auth/users/${foundRequest.user_id}/`
                    ];
                    
                    for (const endpoint of possibleEndpoints) {
                        try {
                            const userResponse = await apiGet(endpoint);
                            userDetails = userResponse.data;
                            console.log(`Successfully fetched user from ${endpoint}:`, userDetails);
                            break;
                        } catch (endpointError: any) {
                            console.log(`Failed endpoint ${endpoint}:`, endpointError.response?.status);
                            continue;
                        }
                    }
                } catch (error) {
                    console.error(`Failed to fetch user ${foundRequest.user_id}:`, error);
                }
            }
            
            // Determine platform from boolean flags
            const platforms = [];
            if (foundRequest.facebook) platforms.push('Facebook');
            if (foundRequest.instagram) platforms.push('Instagram');
            if (foundRequest.twitter) platforms.push('Twitter');
            if (foundRequest.whatsapp) platforms.push('WhatsApp');
            
            const enrichedRequest = {
                ...foundRequest,
                user: userDetails || undefined,
                platform: platforms.length > 0 ? platforms.join(', ') : 'Unknown',
                content: foundRequest.description || foundRequest.content || 'No content'
            };
            
            setRequest(enrichedRequest);
        } catch (error) {
            console.error('Fetch request error:', error);
            setError('Failed to fetch request details');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) {
            fetchRequest();
        }
    }, [id]);

    // Review request (approve or reject)
    const handleReview = async (status: 'approved' | 'posted' | 'rejected', reason?: string) => {
        if (!request) return;
        
        try {
            setReviewLoading(true);
            setValidationError(''); // Clear any validation errors
            setError(null); // Clear any general errors
            const payload: any = { status };
            if (status === 'rejected' && reason) {
                payload.rejection_reason = reason;
            }
            
            // Note: This endpoint may not exist yet - showing error message for now
            try {
                await apiPatch(`/users/admin/social-media-requests/${request.id}/review/`, payload);
                
                // Refresh the request details
                await fetchRequest();
                
                // Reset form
                setRejectionReason('');
                
            } catch (apiError: any) {
                console.error('Review API error:', apiError);
                if (apiError.response?.status === 404) {
                    setError('Review functionality not yet implemented in backend. Please contact the development team.');
                } else {
                    setError('Failed to review request');
                }
            }
            
        } catch (error) {
            console.error('Review request error:', error);
            setError('Failed to review request');
        } finally {
            setReviewLoading(false);
        }
    };

    // Handle approve action
    const handleApprove = () => {
        handleReview('approved');
    };

    // Handle mark as posted action
    const handleMarkAsPosted = () => {
        handleReview('posted');
    };

    // Handle reject action
    const handleReject = () => {
        // Clear previous validation error
        setValidationError('');
        
        // Validate rejection reason
        if (!rejectionReason.trim()) {
            setValidationError('Please provide a reason for rejection');
            return;
        }
        
        handleReview('rejected', rejectionReason);
    };

    // Format date
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Get status badge
    const getStatusBadge = (status: string) => {
        let statusClass = 'bg-gray-100 text-gray-800';
        let statusText = status.charAt(0).toUpperCase() + status.slice(1);

        if (status === 'pending') {
            statusClass = 'bg-yellow-100 text-yellow-800';
        } else if (status === 'approved') {
            statusClass = 'bg-blue-100 text-blue-800';
        } else if (status === 'posted') {
            statusClass = 'bg-green-100 text-green-800';
        } else if (status === 'rejected') {
            statusClass = 'bg-red-100 text-red-800';
        }

        return (
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusClass}`}>
                {statusText}
            </span>
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

    if (error || !request) {
        return (
            <AdminLayout>
                <div className="flex flex-col items-center justify-center h-64">
                    <div className="text-red-600 mb-4">{error || 'Request not found'}</div>
                    <button 
                        onClick={() => router.push('/social-media-requests')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 mr-2"
                    >
                        Back to Requests
                    </button>
                    {error && (
                        <button 
                            onClick={fetchRequest}
                            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                        >
                            Retry
                        </button>
                    )}
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="mb-6">
                <button
                    onClick={() => router.push('/social-media-requests')}
                    className="mb-4 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 inline-flex items-center gap-2"
                >
                    ← Back to Requests
                </button>
                
                <h1 className="font-bold text-gray-800 text-title-md dark:text-white/90 mb-2">
                    Social Media Request Details
                </h1>
                
                <div className="flex items-center gap-4">
                    {getStatusBadge(request.status)}
                    <span className="text-gray-500 text-sm">
                        Created: {formatDate(request.created_at)}
                    </span>
                    {request.reviewed_at && (
                        <span className="text-gray-500 text-sm">
                            Reviewed: {formatDate(request.reviewed_at)}
                        </span>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* User Information */}
                    <div className="bg-white dark:bg-white/[0.03] rounded-xl border border-gray-200 dark:border-white/[0.05] p-6">
                        <h2 className="text-lg font-semibold mb-4">User Information</h2>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                <p className="text-gray-900">
                                    {request.user?.business_profile?.first_name || 
                                     request.user?.first_name || 
                                     'Unknown User'}
                                    {request.user?.business_profile?.last_name || request.user?.last_name ? 
                                     ` ${request.user?.business_profile?.last_name || request.user?.last_name}` : ''}
                                </p>
                            </div>
                            
                            {request.user?.email && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <p className="text-gray-900">{request.user.email}</p>
                                </div>
                            )}
                            
                            {request.user_phone && !request.user && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                    <p className="text-gray-900">{request.user_phone}</p>
                                </div>
                            )}
                            
                            {request.user?.business_profile?.business_name && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Business</label>
                                    <p className="text-gray-900">{request.user.business_profile.business_name}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Request Details */}
                    <div className="bg-white dark:bg-white/[0.03] rounded-xl border border-gray-200 dark:border-white/[0.05] p-6">
                        <h2 className="text-lg font-semibold mb-4">Request Details</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                                <p className="text-gray-900 font-medium">
                                    {request.product_name || 'No product'}
                                </p>
                                {request.title && (
                                    <p className="text-gray-600 text-sm mt-1">{request.title}</p>
                                )}
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Platform</label>
                                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-md text-sm font-medium">
                                    {request.platform}
                                </span>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <p className="text-gray-900 bg-gray-50 p-4 rounded-md whitespace-pre-wrap">
                                    {request.description || request.content || 'No description'}
                                </p>
                            </div>
                            
                            {request.media_url && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Media</label>
                                    <a
                                        href={request.media_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                    >
                                        View Media File
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Actions - Show for pending and approved requests */}
                    {request && (request.status === 'pending' || request.status === 'approved') && (
                        <div className="bg-white dark:bg-white/[0.03] rounded-xl border border-gray-200 dark:border-white/[0.05] p-6">
                            <h2 className="text-lg font-semibold mb-4">Review Actions</h2>
                            <div className="space-y-4">
                                {request.status === 'pending' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Rejection Reason (if rejecting)
                                        </label>
                                        <textarea
                                            value={rejectionReason}
                                            onChange={(e) => {
                                                setRejectionReason(e.target.value);
                                                setValidationError(''); // Clear validation error when user starts typing
                                            }}
                                            placeholder="Enter reason for rejection..."
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            rows={4}
                                        />
                                        {validationError && (
                                            <p className="text-red-600 text-sm mt-2">{validationError}</p>
                                        )}
                                    </div>
                                )}
                                
                                <div className="space-y-3">
                                    {request.status === 'pending' && (
                                        <>
                                            <button
                                                onClick={handleApprove}
                                                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                                disabled={reviewLoading}
                                            >
                                                {reviewLoading ? 'Processing...' : 'Approve'}
                                            </button>
                                            <button
                                                onClick={handleReject}
                                                className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                                                disabled={reviewLoading}
                                            >
                                                {reviewLoading ? 'Processing...' : 'Reject'}
                                            </button>
                                        </>
                                    )}
                                    {request.status === 'approved' && (
                                        <button
                                            onClick={handleMarkAsPosted}
                                            className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                                            disabled={reviewLoading}
                                        >
                                            {reviewLoading ? 'Processing...' : 'Mark as Posted'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Status Information */}
                    <div className="bg-white dark:bg-white/[0.03] rounded-xl border border-gray-200 dark:border-white/[0.05] p-6">
                        <h2 className="text-lg font-semibold mb-4">Status Information</h2>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Current Status</label>
                                {getStatusBadge(request.status)}
                            </div>
                            
                            {request.rejection_reason && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Rejection Reason</label>
                                    <p className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
                                        {request.rejection_reason}
                                    </p>
                                </div>
                            )}
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Created At</label>
                                <p className="text-gray-900 text-sm">{formatDate(request.created_at)}</p>
                            </div>
                            
                            {request.reviewed_at && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Reviewed At</label>
                                    <p className="text-gray-900 text-sm">{formatDate(request.reviewed_at)}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
};

export default SocialMediaRequestViewPage;
