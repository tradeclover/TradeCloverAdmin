import React, { useState, useEffect } from "react";
import { useRouter } from 'next/router';
import AdminLayout from '@/layout/AdminLayout';
import {
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { apiGet } from "@/utils/api";
import { EyeIcon } from "@/icons";

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

const SocialMediaRequestsPage = () => {
    const router = useRouter();
    const [requests, setRequests] = useState<SocialMediaRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'posted' | 'rejected'>('all');

    // Fetch social media requests
    const fetchRequests = async (status?: 'pending' | 'approved' | 'posted' | 'rejected') => {
        try {
            setLoading(true);
            setError(null);
            const url = status 
                ? `/users/admin/social-media-requests/?status=${status}`
                : '/users/admin/social-media-requests/';
            const response = await apiGet(url);
            console.log('API Response:', response.data); // Debug log
            
            // Enrich requests with user details and platform name
            const enrichedRequests = await Promise.all(
                response.data.map(async (request: any) => {
                    let userDetails = null;
                    
                    // Fetch user details if user_id exists - try different endpoints
                    if (request.user_id) {
                        try {
                            // Try different possible user endpoints
                            const possibleEndpoints = [
                                `/users/admin/users/${request.user_id}/`,
                                `/admin/users/${request.user_id}/`,
                                `/user/${request.user_id}/`,
                                `/auth/users/${request.user_id}/`
                            ];
                            
                            for (const endpoint of possibleEndpoints) {
                                try {
                                    const userResponse = await apiGet(endpoint);
                                    userDetails = userResponse.data;
                                    console.log(`Successfully fetched user from ${endpoint}:`, userDetails);
                                    break; // Stop trying once we find a working endpoint
                                } catch (endpointError: any) {
                                    console.log(`Failed endpoint ${endpoint}:`, endpointError.response?.status);
                                    continue; // Try next endpoint
                                }
                            }
                        } catch (error) {
                            console.error(`Failed to fetch user ${request.user_id}:`, error);
                        }
                    }
                    
                    // Determine platform from boolean flags
                    const platforms = [];
                    if (request.facebook) platforms.push('Facebook');
                    if (request.instagram) platforms.push('Instagram');
                    if (request.twitter) platforms.push('Twitter');
                    if (request.whatsapp) platforms.push('WhatsApp');
                    
                    return {
                        ...request,
                        user: userDetails || undefined,
                        platform: platforms.length > 0 ? platforms.join(', ') : 'Unknown',
                        content: request.description || request.content || 'No content'
                    };
                })
            );
            
            setRequests(enrichedRequests);
        } catch (error) {
            console.error('Fetch social media requests error:', error);
            setError('Failed to fetch social media requests');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (filter === 'all') {
            fetchRequests();
        } else {
            fetchRequests(filter);
        }
    }, [filter]);


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
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusClass}`}>
                {statusText}
            </span>
        );
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

    // Navigate to request detail page
    const handleViewRequest = (requestId: number) => {
        router.push(`/social-media-requests/${requestId}`);
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

    if (error) {
        return (
            <AdminLayout>
                <div className="flex flex-col items-center justify-center h-64">
                    <div className="text-red-600 mb-4">{error}</div>
                    <button 
                        onClick={() => {
                            setError(null);
                            if (filter === 'all') {
                                fetchRequests();
                            } else {
                                fetchRequests(filter);
                            }
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        Retry
                    </button>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="flex justify-between items-center mb-6">
                <h1 className="font-bold text-gray-800 text-title-md dark:text-white/90">
                    Social Media Requests
                </h1>
                
                {/* Filter buttons */}
                <div className="flex gap-2">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                            filter === 'all'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        All ({requests.length})
                    </button>
                    <button
                        onClick={() => setFilter('pending')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                            filter === 'pending'
                                ? 'bg-yellow-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        Pending
                    </button>
                    <button
                        onClick={() => setFilter('approved')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                            filter === 'approved'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        Approved
                    </button>
                    <button
                        onClick={() => setFilter('posted')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                            filter === 'posted'
                                ? 'bg-green-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        Posted
                    </button>
                    <button
                        onClick={() => setFilter('rejected')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                            filter === 'rejected'
                                ? 'bg-red-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        Rejected
                    </button>
                </div>
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
                                    User
                                </TableCell>
                                <TableCell
                                    isHeader
                                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                                >
                                    Platform
                                </TableCell>
                                <TableCell
                                    isHeader
                                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                                >
                                    Product
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
                                    Created Date
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
                            {requests.length === 0 ? (
                                <TableRow>
                                    <td
                                        colSpan={6}
                                        className="px-5 py-8 text-center text-gray-500 dark:text-gray-400 text-theme-sm"
                                    >
                                        No social media requests found
                                    </td>
                                </TableRow>
                            ) : (
                                requests.map((request) => (
                                    <TableRow key={request.id}>
                                        <TableCell className="px-5 py-4">
                                            <div>
                                                <div className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                                                    {request.user?.business_profile?.first_name || 
                                                     request.user?.first_name || 
                                                     'Unknown User'}
                                                    {request.user?.business_profile?.last_name || request.user?.last_name ? 
                                                     ` ${request.user?.business_profile?.last_name || request.user?.last_name}` : ''}
                                                </div>
                                                <div className="text-gray-500 text-xs dark:text-gray-400">
                                                    {request.user?.email || request.user_phone || 'No contact info'}
                                                </div>
                                                {request.user?.business_profile?.business_name && (
                                                    <div className="text-gray-500 text-xs dark:text-gray-400">
                                                        {request.user.business_profile.business_name}
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-5 py-4 text-gray-800 text-theme-sm dark:text-white/90">
                                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs font-medium">
                                                {request.platform}
                                            </span>
                                        </TableCell>
                                        <TableCell className="px-5 py-4">
                                            <div className="max-w-xs">
                                                <p className="text-gray-800 text-sm dark:text-white/90 font-medium">
                                                    {request.product_name || 'No product'}
                                                </p>
                                                {request.title && (
                                                    <p className="text-gray-500 text-xs dark:text-gray-400 mt-1">
                                                        {request.title}
                                                    </p>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-5 py-4">
                                            {getStatusBadge(request.status)}
                                            {request.rejection_reason && (
                                                <div className="text-red-600 text-xs mt-1 max-w-xs">
                                                    Reason: {request.rejection_reason}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="px-5 py-4 text-gray-500 text-theme-sm dark:text-gray-400">
                                            {formatDate(request.created_at)}
                                        </TableCell>
                                        <TableCell className="px-5 py-4">
                                            <div className="flex gap-2">
                                                {(request.status === 'pending' || request.status === 'approved') && (
                                                    <button
                                                        onClick={() => handleViewRequest(request.id)}
                                                        className="inline-flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-md dark:text-blue-400 dark:hover:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                                                    >
                                                        <EyeIcon />
                                                        <span>{request.status === 'approved' ? 'View' : 'Review'}</span>
                                                    </button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

        </AdminLayout>
    );
};

export default SocialMediaRequestsPage;
