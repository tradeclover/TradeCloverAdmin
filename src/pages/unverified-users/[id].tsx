import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import AdminLayout from '@/layout/AdminLayout';
import { ChevronLeftIcon } from "@/icons";
import { apiGet, apiPost, apiPatch } from "@/utils/api";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import Toast from "@/components/ui/toast/Toast";

interface BusinessProfile {
    id: number;
    first_name: string;
    last_name: string;
    business_name: string | null;
    legal_name: string | null;
    business_logo: string | null;
    business_registration_type: string | null;
    industry_category: string | null;
    website_url: string | null;
    year_of_establishment: string | null;
    employee_count: number | null;
    annual_turnover: string | null;
    business_description: string | null;
    head_office_address: string | null;
    head_office_country: string | null;
    head_office_state: string | null;
    head_office_city: string | null;
    head_office_zipcode: string | null;
    billing_address: string | null;
    billing_country: string | null;
    billing_state: string | null;
    billing_city: string | null;
    billing_zipcode: string | null;
    documents_verified_at: string | null;
    subscription_plan_id: number | null;
    subscription_status: string | null;
    subscription_expiry_date: string | null;
    preferred_currency: string | null;
    time_zone: string | null;
    notification_email: string | null;
    notification_sms: string | null;
    trust_score: number;
    referral_code: string | null;
    referred_by: string | null;
    source: string | null;
    admin_notes: string | null;
    audit_trail_id: string | null;
    certificate_url: string | null;
    rating: number;
    reviews_count: number;
    created_at: string;
    updated_at: string;
    user: number;
}

interface UserKyc {
    id: number;
    gstin: string | null;
    gstin_score: number | null;
    pan: string | null;
    pan_score: number | null;
    cin: string | null;
    cin_score: number | null;
    iec: string | null;
    iec_score: number | null;
    udhyam: string | null;
    udhyam_score: number | null;
    gstin_url: string | null;
    pan_url: string | null;
    cin_url: string | null;
    iec_url: string | null;
    udhyam_url: string | null;
    partnership_deed_url: string | null;
    shop_registration_url: string | null;
    live_selfie_url: string | null;
    cancelled_cheque_url: string | null;
    bank_statement_url: string | null;
    sample_invoice_url: string | null;
    electricity_bill_url: string | null;
    rent_agreement_url: string | null;
    property_tax_receipt_url: string | null;
    // USA-specific fields
    ein_letter_url?: string | null;
    business_registration_url?: string | null;
    business_license_url?: string | null;
    proof_of_business_address_url?: string | null;
    director_id_url?: string | null;
    gstin_status: boolean;
    pan_status: boolean;
    cin_status: boolean;
    iec_status: boolean;
    udhyam_status: boolean;
    partnership_deed_status: boolean;
    shop_registration_status: boolean;
    live_selfie_status: boolean;
    cancelled_cheque_status: boolean;
    bank_statement_status: boolean;
    sample_invoice_status: boolean;
    electricity_bill_status: boolean;
    rent_agreement_status: boolean;
    property_tax_receipt_status: boolean;
    // USA-specific statuses
    ein_letter_status?: boolean;
    business_registration_status?: boolean;
    business_license_status?: boolean;
    proof_of_business_address_status?: boolean;
    director_id_status?: boolean;
    account_number: string | null;
    account_ifsc: string | null;
    user: number;
}

interface User {
    id: number;
    business_profile: BusinessProfile;
    user_kyc: UserKyc;
    last_login: string | null;
    is_superuser: boolean;
    country_code: string;
    primary_phone: string;
    alternate_phone: string | null;
    email: string | null;
    slug: string;
    user_type: string;
    is_active: boolean;
    is_staff: boolean;
    onboarding_completed: boolean;
    profile_completion_percent: number;
    is_email_verified: boolean;
    is_verified_vendor: boolean;
    kyc_status: string;
    verification_date: string | null;
    rejection_reason: string | null;
    allow_to_resubmit: boolean;
    last_login_at: string | null;
    last_active_at: string | null;
    deleted_at: string | null;
    deleted_reason: string | null;
    created_at: string;
    updated_at: string;
    kyc_verified_by: number | null;
    kyc_submitted_at: string | null;
    kyc_submission_time: string | null;
    kyc_region?: string;
}

const UnverifiedUserDetailPage = () => {
    const router = useRouter();
    const { id } = router.query;
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');
    const [rejectionReason, setRejectionReason] = useState('');
    const [allowToResubmit, setAllowToResubmit] = useState(true);
    const [approvedDocs, setApprovedDocs] = useState<Set<string>>(new Set());
    const [docApprovalLoading, setDocApprovalLoading] = useState<string | null>(null);
    const [showDocApproveModal, setShowDocApproveModal] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState<{ key: string; title: string } | null>(null);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showLogoModal, setShowLogoModal] = useState(false);
    const [uploadDocType, setUploadDocType] = useState<string>('');
    const [uploadDocTitle, setUploadDocTitle] = useState<string>('');
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploadLoading, setUploadLoading] = useState(false);

    const fetchUser = useCallback(async () => {
        try {
            setLoading(true);
            if (id) {
                const response = await apiGet(`/users/admin/users/${id}/`);
                setUser(response.data);
            }
        } catch (err) {
            setError('Failed to fetch user details');
            console.error('Error fetching user:', err);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchUser();
    }, [fetchUser]);

    const getApiErrorMessage = (error: any, fallbackMessage: string) => {
        const responseData = error?.response?.data;

        if (responseData?.message && responseData?.error) {
            return `${responseData.message} ${responseData.error}`;
        }

        if (responseData?.message) {
            return responseData.message;
        }

        if (responseData?.error) {
            return responseData.error;
        }

        return fallbackMessage;
    };

    const handleApproveUser = async () => {
        try {
            setActionLoading(true);
            const res = await apiPost(`/users/admin/users/${user?.id}/approve-all/`);
            const certUrl: string | null = res.data?.certificate_url ?? res.data?.data?.certificate_url ?? null;

            setToastMessage(
                certUrl
                    ? 'User approved — certificate generated successfully'
                    : 'User approved — all documents verified and subscription assigned'
            );
            setToastType('success');
            setShowToast(true);

            setTimeout(() => {
                router.push('/unverified-users');
            }, 1500);
        } catch (error) {
            console.error('Error approving user:', error);
            const errorMessage = getApiErrorMessage(error, 'Failed to approve user. Please try again.');
            setToastMessage(errorMessage);
            setToastType('error');
            setShowToast(true);
        } finally {
            setActionLoading(false);
            setShowApproveModal(false);
        }
    };

    const handleRejectUser = async () => {
        if (!rejectionReason.trim()) {
            setToastMessage('Please provide a rejection reason.');
            setToastType('error');
            setShowToast(true);
            return;
        }

        try {
            setActionLoading(true);
            await apiPost(`/users/admin/users/${user?.id}/reject/`, {
                rejection_reason: rejectionReason,
                allow_to_resubmit: allowToResubmit
            });
            
            setToastMessage('User rejected successfully');
            setToastType('success');
            setShowToast(true);
            
            // Reset form
            setRejectionReason('');
            setAllowToResubmit(true);
            
            // Redirect to list after a short delay
            setTimeout(() => {
                router.push('/unverified-users');
            }, 1500);
        } catch (error) {
            console.error('Error rejecting user:', error);
            setToastMessage('Failed to reject user. Please try again.');
            setToastType('error');
            setShowToast(true);
        } finally {
            setActionLoading(false);
            setShowRejectModal(false);
        }
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const formatDateTime = (dateString: string | null) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const displayValue = (value: any) => {
        if (value === null || value === undefined || value === '' || value === 'null' || value === 'undefined') {
            return 'N/A';
        }
        return value.toString().trim() !== '' ? value : 'N/A';
    };

    const getUserTypeDisplay = (userType: string) => {
        switch (userType) {
            case '1':
                return 'Buyer';
            case '2':
                return 'Seller';
            default:
                return displayValue(userType);
        }
    };

    const renderStatusBadge = (status: boolean | null, trueText: string = 'Valid', falseText: string = 'Invalid') => {
        return (
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                status ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
                {status ? trueText : falseText}
            </span>
        );
    };

    const openDocApproveModal = (docKey: string, title: string) => {
        setSelectedDoc({ key: docKey, title });
        setShowDocApproveModal(true);
    };

    const openUploadModal = (docType: string, title: string) => {
        setUploadDocType(docType);
        setUploadDocTitle(title);
        setUploadFile(null);
        setShowUploadModal(true);
    };

    const handleUploadDocument = async () => {
        if (!uploadFile || !uploadDocType || !user) return;

        try {
            setUploadLoading(true);
            const formData = new FormData();
            formData.append('file', uploadFile);
            formData.append('document_type', uploadDocType);

            const response = await apiPost(`/users/admin/users/${user.id}/upload-document/`, formData, {}, true);

            const { url } = response.data;
            setUser(prevUser => {
                if (!prevUser) return prevUser;
                return {
                    ...prevUser,
                    user_kyc: {
                        ...prevUser.user_kyc,
                        [uploadDocType]: url
                    }
                };
            });

            setToastMessage(`${uploadDocTitle} uploaded successfully`);
            setToastType('success');
            setShowToast(true);
            setShowUploadModal(false);
            setUploadFile(null);
        } catch (error) {
            console.error('Error uploading document:', error);
            setToastMessage('Failed to upload document. Please try again.');
            setToastType('error');
            setShowToast(true);
        } finally {
            setUploadLoading(false);
        }
    };

    const handleApproveDocument = async () => {
        if (!user || !selectedDoc) return;
        
        try {
            setDocApprovalLoading(selectedDoc.key);
            // API expects the status field name with _status suffix (e.g., live_selfie_status)
            const statusField = `${selectedDoc.key}_status`;
            await apiPatch(`/users/admin/users/${user.id}/kyc-status/`, {
                [statusField]: true
            });
            
            // Update local state to reflect the change immediately
            setUser(prevUser => {
                if (!prevUser) return prevUser;
                return {
                    ...prevUser,
                    user_kyc: {
                        ...prevUser.user_kyc,
                        [statusField]: true
                    }
                };
            });
            
            setApprovedDocs(prev => new Set([...prev, selectedDoc.key]));
            setToastMessage(`${selectedDoc.title} approved successfully`);
            setToastType('success');
            setShowToast(true);
            setShowDocApproveModal(false);
            setSelectedDoc(null);
        } catch (error) {
            console.error('Error approving document:', error);
            setToastMessage('Failed to approve document. Please try again.');
            setToastType('error');
            setShowToast(true);
        } finally {
            setDocApprovalLoading(null);
        }
    };

    const renderDocumentCard = (title: string, url: string | null, number: string | null, status: boolean, score: number | null = null, docKey: string = '') => {
        const isApproved = approvedDocs.has(docKey) || status;
        const isApprovalLoading = docApprovalLoading === docKey;
        
        return (
            <div className="border rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700">{title}</label>
                    <div className="flex items-center gap-2">
                        {renderStatusBadge(status, 'Valid', 'Invalid')}
                        {isApproved && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-500 text-white">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Verified
                            </span>
                        )}
                    </div>
                </div>
                {url ? (
                    <div className="flex items-center gap-2 flex-wrap">
                        <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View Document
                        </a>
                        {docKey && !isApproved && (
                            <button
                                onClick={() => openDocApproveModal(docKey, title)}
                                disabled={isApprovalLoading}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isApprovalLoading ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Approving...
                                    </>
                                ) : (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        Approve
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <span className="text-gray-500 text-sm">Not uploaded</span>
                        {docKey && (
                            <button
                                onClick={() => openUploadModal(`${docKey}_url`, title)}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                                Upload
                            </button>
                        )}
                    </div>
                )}
                <div className="mt-3 pt-3 border-t border-gray-200 space-y-1">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Number:</span>
                        <span className="text-gray-700 font-medium">{displayValue(number)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Score:</span>
                        <span className="text-gray-700 font-medium">{score !== null ? score : 'N/A'}</span>
                    </div>
                </div>
            </div>
        );
    };

    const renderOtherDocumentCard = (title: string, url: string | null, status: boolean, docKey: string = '') => {
        const isApproved = approvedDocs.has(docKey) || status;
        const isApprovalLoading = docApprovalLoading === docKey;
        
        return (
            <div className="border rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700">{title}</label>
                    <div className="flex items-center gap-2">
                        {renderStatusBadge(status, 'Valid', 'Invalid')}
                        {isApproved && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-500 text-white">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Verified
                            </span>
                        )}
                    </div>
                </div>
                {url ? (
                    <div className="flex items-center gap-2 flex-wrap">
                        <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View Document
                        </a>
                        {docKey && !isApproved && (
                            <button
                                onClick={() => openDocApproveModal(docKey, title)}
                                disabled={isApprovalLoading}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isApprovalLoading ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Approving...
                                    </>
                                ) : (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        Approve
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <span className="text-gray-500 text-sm">Not uploaded</span>
                        {docKey && (
                            <button
                                onClick={() => openUploadModal(`${docKey}_url`, title)}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                                Upload
                            </button>
                        )}
                    </div>
                )}
            </div>
        );
    };

    if (loading) {
        return (
            <AdminLayout>
                <div className="p-4 md:p-6">
                    <div className="animate-pulse h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                    </div>
                </div>
            </AdminLayout>
        );
    }

    if (error) {
        return (
            <AdminLayout>
                <div className="p-4 md:p-6">
                    <div className="flex items-center mb-6">
                        <Button
                            variant="outline"
                            onClick={() => router.back()}
                            className="mr-2"
                        >
                            <ChevronLeftIcon className="h-5 w-5" />
                        </Button>
                        <h1 className="text-2xl font-bold">User Details</h1>
                    </div>
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
                        <p className="text-red-700">{error}</p>
                    </div>
                </div>
            </AdminLayout>
        );
    }

    if (!user) {
        return (
            <AdminLayout>
                <div className="p-4 md:p-6">
                    <div className="flex items-center mb-6">
                        <Button
                            variant="outline"
                            onClick={() => router.back()}
                            className="mr-2"
                        >
                            <ChevronLeftIcon className="h-5 w-5" />
                        </Button>
                        <h1 className="text-2xl font-bold">User Not Found</h1>
                    </div>
                    <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6">
                        <p className="text-yellow-700">The requested user could not be found.</p>
                    </div>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="p-4 md:p-8">
                {/* Header Section */}
                <div className="flex flex-wrap items-start gap-3 justify-between mb-6 md:mb-8">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            onClick={() => router.push('/unverified-users')}
                        >
                            <ChevronLeftIcon className="h-5 w-5" />
                        </Button>
                        {user.business_profile.business_logo ? (
                            <img
                                src={user.business_profile.business_logo}
                                alt={user.business_profile.business_name || 'Business Logo'}
                                className="w-14 h-14 rounded-full object-cover border border-gray-200 shadow-sm cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all"
                                onClick={() => setShowLogoModal(true)}
                                title="Click to view"
                            />
                        ) : (
                            <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                                <span className="text-xl font-bold text-blue-600">
                                    {user.business_profile.first_name?.charAt(0)?.toUpperCase()}
                                </span>
                            </div>
                        )}
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">
                                {user.business_profile.first_name} {user.business_profile.last_name}
                            </h1>
                            <p className="text-sm text-gray-500 mt-1">
                                {user.business_profile.business_name}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                            user.is_verified_vendor ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                            {user.is_verified_vendor ? 'Verified' : 'Unverified'}
                        </span>
                        <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                            user.kyc_status === 'verified' ? 'bg-green-100 text-green-800' : 
                            user.kyc_status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                            user.kyc_status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                            KYC: {user.kyc_status ? user.kyc_status.charAt(0).toUpperCase() + user.kyc_status.slice(1) : 'N/A'}
                        </span>
                        <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                            user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                            {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                </div>

                {/* Profile Completion + KYC Submission Banner */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-blue-800">Profile Completion</p>
                                <p className="text-xs text-blue-600">{user.profile_completion_percent}% completed</p>
                            </div>
                        </div>
                        <div className="w-full sm:w-48 bg-blue-200 rounded-full h-2">
                            <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${user.profile_completion_percent}%` }}
                            ></div>
                        </div>
                        {/* <div className="flex items-center gap-2 border-l border-blue-200 pl-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div>
                                <p className="text-xs text-blue-600 font-medium">KYC Submitted</p>
                                <p className="text-sm font-semibold text-blue-800">
                                    {user.kyc_submission_time ? `${user.kyc_submission_time} ago` : 'Not submitted'}
                                </p>
                            </div>
                        </div> */}
                    </div>
                </div>

                {/* User Approval Actions */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">User Approval action</h3>
                    <p className="text-sm text-gray-600 mb-4">
                        Review and verify the uploaded documents below and approve the user accordingly.
                    </p>
                    {user.rejection_reason && (
                        <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
                            <p className="text-sm text-red-700">
                                <span className="font-medium">Rejection Reason:</span> {user.rejection_reason}
                            </p>
                        </div>
                    )}
                    <div className="flex flex-wrap gap-3">
                        <Button
                            onClick={() => setShowApproveModal(true)}
                            disabled={actionLoading || user.kyc_status === 'verified'}
                            className={`px-6 py-2 text-sm font-medium rounded-md ${
                                user.kyc_status === 'verified'
                                    ? 'bg-green-100 text-gray-400 cursor-not-allowed'
                                    : 'bg-green-600 text-white hover:bg-green-700'
                            }`}
                        >
                            <span className="flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Approve User
                            </span>
                        </Button>
                        <Button
                            onClick={() => setShowRejectModal(true)}
                            disabled={actionLoading || user.kyc_status === 'rejected'}
                            className={`px-6 py-2 text-sm font-medium rounded-md ${
                                user.kyc_status === 'rejected'
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : 'bg-red-600 text-white hover:bg-red-700'
                            }`}
                        >
                            <span className="flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Reject user
                            </span>
                        </Button>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* User Account Information */}
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <div className="p-4 md:p-6 border-b border-gray-200 bg-gray-50">
                            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                User Account Information
                            </h3>
                        </div>
                        <div className="p-4 md:p-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">User ID</label>
                                    <p className="text-gray-900">{user.id}</p>
                                </div>
                                {/* <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Slug</label>
                                    <p className="text-gray-900">{displayValue(user.slug)}</p>
                                </div> */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">User Type</label>
                                    <p className="text-gray-900">{getUserTypeDisplay(user.user_type)}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Email</label>
                                    <p className="text-gray-900 flex items-center gap-2">
                                        {displayValue(user.email)}
                                        {user.is_email_verified && (
                                            <span className="text-green-600">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                            </span>
                                        )}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Primary Phone</label>
                                    <p className="text-gray-900">{user.country_code} {user.primary_phone}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Alternate Phone</label>
                                    <p className="text-gray-900">{displayValue(user.alternate_phone)}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Last Login</label>
                                    <p className="text-gray-900">{formatDateTime(user.last_login_at)}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Last Active</label>
                                    <p className="text-gray-900">{formatDateTime(user.last_active_at)}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Personal Information */}
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <div className="p-4 md:p-6 border-b border-gray-200 bg-gray-50">
                            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Personal Information
                            </h3>
                        </div>
                        <div className="p-4 md:p-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">First Name</label>
                                    <p className="text-gray-900">{displayValue(user.business_profile.first_name)}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Last Name</label>
                                    <p className="text-gray-900">{displayValue(user.business_profile.last_name)}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Preferred Currency</label>
                                    <p className="text-gray-900">{displayValue(user.business_profile.preferred_currency)}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Time Zone</label>
                                    <p className="text-gray-900">{displayValue(user.business_profile.time_zone)}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Business Information */}
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <div className="p-4 md:p-6 border-b border-gray-200 bg-gray-50">
                            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                                Business Information
                            </h3>
                        </div>
                        <div className="p-4 md:p-6">
                            {user.business_profile.business_logo && (
                                <div className="mb-6 flex items-center gap-4">
                                    <img
                                        src={user.business_profile.business_logo}
                                        alt={user.business_profile.business_name || 'Business Logo'}
                                        className="w-20 h-20 rounded-xl object-cover border border-gray-200 shadow-sm cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all"
                                        onClick={() => setShowLogoModal(true)}
                                        title="Click to view"
                                    />
                                    <div>
                                        <p className="text-sm font-medium text-gray-700">{user.business_profile.business_name}</p>
                                        <p className="text-xs text-gray-400 mt-0.5">Business Logo</p>
                                    </div>
                                </div>
                            )}
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Business Name</label>
                                    <p className="text-gray-900">{displayValue(user.business_profile.business_name)}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Legal Name</label>
                                    <p className="text-gray-900">{displayValue(user.business_profile.legal_name)}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Registration Type</label>
                                    <p className="text-gray-900">{displayValue(user.business_profile.business_registration_type)}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Industry Category</label>
                                    <p className="text-gray-900">{displayValue(user.business_profile.industry_category)}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Website URL</label>
                                    <p className="text-gray-900">
                                        {user.business_profile.website_url ? (
                                            <a href={user.business_profile.website_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                                {user.business_profile.website_url}
                                            </a>
                                        ) : 'N/A'}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Year of Establishment</label>
                                    <p className="text-gray-900">{formatDate(user.business_profile.year_of_establishment)}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Employee Count</label>
                                    <p className="text-gray-900">{displayValue(user.business_profile.employee_count)}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Annual Turnover</label>
                                    <p className="text-gray-900">
                                        {user.business_profile.annual_turnover 
                                            ? `₹${Number(user.business_profile.annual_turnover).toLocaleString('en-IN')}` 
                                            : 'N/A'}
                                    </p>
                                </div>
                                <div className="col-span-1 sm:col-span-2 md:col-span-4">
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Business Description</label>
                                    <div className="text-gray-900">
                                        {user.business_profile.business_description 
                                            ? <div dangerouslySetInnerHTML={{ __html: user.business_profile.business_description }} />
                                            : 'N/A'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Head Office Address */}
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <div className="p-4 md:p-6 border-b border-gray-200 bg-gray-50">
                            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                Head Office Address
                            </h3>
                        </div>
                        <div className="p-4 md:p-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                                <div className="col-span-1 sm:col-span-2 md:col-span-4">
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Address</label>
                                    <p className="text-gray-900">{displayValue(user.business_profile.head_office_address)}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Country</label>
                                    <p className="text-gray-900">{displayValue(user.business_profile.head_office_country)}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">State</label>
                                    <p className="text-gray-900">{displayValue(user.business_profile.head_office_state)}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">City</label>
                                    <p className="text-gray-900">{displayValue(user.business_profile.head_office_city)}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Zipcode</label>
                                    <p className="text-gray-900">{displayValue(user.business_profile.head_office_zipcode)}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Billing Address */}
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <div className="p-4 md:p-6 border-b border-gray-200 bg-gray-50">
                            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                </svg>
                                Billing Address
                            </h3>
                        </div>
                        <div className="p-4 md:p-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                                <div className="col-span-1 sm:col-span-2 md:col-span-4">
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Address</label>
                                    <p className="text-gray-900">{displayValue(user.business_profile.billing_address)}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Country</label>
                                    <p className="text-gray-900">{displayValue(user.business_profile.billing_country)}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">State</label>
                                    <p className="text-gray-900">{displayValue(user.business_profile.billing_state)}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">City</label>
                                    <p className="text-gray-900">{displayValue(user.business_profile.billing_city)}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Zipcode</label>
                                    <p className="text-gray-900">{displayValue(user.business_profile.billing_zipcode)}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* KYC Documents — region-conditional */}
                    {user.kyc_region === 'usa' ? (
                        <div id="documents" className="bg-white rounded-lg shadow overflow-hidden">
                            <div className="p-4 md:p-6 border-b border-gray-200 bg-gray-50">
                                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    KYC Documents (USA)
                                </h3>
                            </div>
                            <div className="p-4 md:p-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                                    {renderOtherDocumentCard('EIN Letter', user.user_kyc.ein_letter_url ?? null, user.user_kyc.ein_letter_status ?? false, 'ein_letter')}
                                    {renderOtherDocumentCard('Business Registration', user.user_kyc.business_registration_url ?? null, user.user_kyc.business_registration_status ?? false, 'business_registration')}
                                    {renderOtherDocumentCard('Business License', user.user_kyc.business_license_url ?? null, user.user_kyc.business_license_status ?? false, 'business_license')}
                                    {renderOtherDocumentCard('Proof of Business Address', user.user_kyc.proof_of_business_address_url ?? null, user.user_kyc.proof_of_business_address_status ?? false, 'proof_of_business_address')}
                                    {renderOtherDocumentCard('Director ID', user.user_kyc.director_id_url ?? null, user.user_kyc.director_id_status ?? false, 'director_id')}
                                    {renderOtherDocumentCard('Live Selfie', user.user_kyc.live_selfie_url, user.user_kyc.live_selfie_status, 'live_selfie')}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* KYC Documents - Business Registrations (India) */}
                            <div id="documents" className="bg-white rounded-lg shadow overflow-hidden">
                                <div className="p-4 md:p-6 border-b border-gray-200 bg-gray-50">
                                    <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        KYC Documents - Business Registrations
                                    </h3>
                                </div>
                                <div className="p-4 md:p-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                                        {renderDocumentCard('GST Certificate', user.user_kyc.gstin_url, user.user_kyc.gstin, user.user_kyc.gstin_status, user.user_kyc.gstin_score, 'gstin')}
                                        {renderDocumentCard('PAN Card', user.user_kyc.pan_url, user.user_kyc.pan, user.user_kyc.pan_status, user.user_kyc.pan_score, 'pan')}
                                        {renderDocumentCard('CIN Certificate', user.user_kyc.cin_url, user.user_kyc.cin, user.user_kyc.cin_status, user.user_kyc.cin_score, 'cin')}
                                        {renderDocumentCard('IEC Certificate', user.user_kyc.iec_url, user.user_kyc.iec, user.user_kyc.iec_status, user.user_kyc.iec_score, 'iec')}
                                        {renderDocumentCard('Udhyam Registration', user.user_kyc.udhyam_url, user.user_kyc.udhyam, user.user_kyc.udhyam_status, user.user_kyc.udhyam_score, 'udhyam')}
                                    </div>
                                </div>
                            </div>

                            {/* KYC Documents - Other Documents (India) */}
                            <div className="bg-white rounded-lg shadow overflow-hidden">
                                <div className="p-4 md:p-6 border-b border-gray-200 bg-gray-50">
                                    <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                        </svg>
                                        KYC Documents - Other Documents
                                    </h3>
                                </div>
                                <div className="p-4 md:p-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                                        {renderOtherDocumentCard('Partnership Deed', user.user_kyc.partnership_deed_url, user.user_kyc.partnership_deed_status, 'partnership_deed')}
                                        {renderOtherDocumentCard('Shop Registration', user.user_kyc.shop_registration_url, user.user_kyc.shop_registration_status, 'shop_registration')}
                                        {renderOtherDocumentCard('Live Selfie', user.user_kyc.live_selfie_url, user.user_kyc.live_selfie_status, 'live_selfie')}
                                        {renderOtherDocumentCard('Cancelled Cheque', user.user_kyc.cancelled_cheque_url, user.user_kyc.cancelled_cheque_status, 'cancelled_cheque')}
                                        {renderOtherDocumentCard('Bank Statement', user.user_kyc.bank_statement_url, user.user_kyc.bank_statement_status, 'bank_statement')}
                                        {renderOtherDocumentCard('Sample Invoice', user.user_kyc.sample_invoice_url, user.user_kyc.sample_invoice_status, 'sample_invoice')}
                                        {renderOtherDocumentCard('Electricity Bill', user.user_kyc.electricity_bill_url, user.user_kyc.electricity_bill_status, 'electricity_bill')}
                                        {renderOtherDocumentCard('Rent Agreement', user.user_kyc.rent_agreement_url, user.user_kyc.rent_agreement_status, 'rent_agreement')}
                                        {renderOtherDocumentCard('Property Tax Receipt', user.user_kyc.property_tax_receipt_url, user.user_kyc.property_tax_receipt_status, 'property_tax_receipt')}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Bank Details */}
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <div className="p-4 md:p-6 border-b border-gray-200 bg-gray-50">
                            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                </svg>
                                Bank Details
                            </h3>
                        </div>
                        <div className="p-4 md:p-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Account Number</label>
                                    <p className="text-gray-900">{displayValue(user.user_kyc.account_number)}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">IFSC Code</label>
                                    <p className="text-gray-900">{displayValue(user.user_kyc.account_ifsc)}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Subscription Details */}
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <div className="p-4 md:p-6 border-b border-gray-200 bg-gray-50">
                            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                                </svg>
                                Subscription Details
                            </h3>
                        </div>
                        <div className="p-4 md:p-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Plan ID</label>
                                    <p className="text-gray-900">{displayValue(user.business_profile.subscription_plan_id)}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Status</label>
                                    <p className="text-gray-900">{displayValue(user.business_profile.subscription_status)}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Expiry Date</label>
                                    <p className="text-gray-900">{formatDate(user.business_profile.subscription_expiry_date)}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Documents Verified At</label>
                                    <p className="text-gray-900">{formatDateTime(user.business_profile.documents_verified_at)}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Account Status */}
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <div className="p-4 md:p-6 border-b border-gray-200 bg-gray-50">
                            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                                Account Status
                            </h3>
                        </div>
                        <div className="p-4 md:p-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Active</label>
                                    {renderStatusBadge(user.is_active, 'Active', 'Inactive')}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Superuser</label>
                                    {renderStatusBadge(user.is_superuser, 'Yes', 'No')}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Staff</label>
                                    {renderStatusBadge(user.is_staff, 'Yes', 'No')}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Email Verified</label>
                                    {renderStatusBadge(user.is_email_verified)}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Verified Vendor</label>
                                    {renderStatusBadge(user.is_verified_vendor)}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Onboarding Completed</label>
                                    {renderStatusBadge(user.onboarding_completed, 'Completed', 'Pending')}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Allow Resubmit</label>
                                    {renderStatusBadge(user.allow_to_resubmit, 'Allowed', 'Not Allowed')}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">KYC Status</label>
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                        user.kyc_status === 'verified' ? 'bg-green-100 text-green-800' : 
                                        user.kyc_status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                                        user.kyc_status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                                    }`}>
                                        {user.kyc_status ? user.kyc_status.charAt(0).toUpperCase() + user.kyc_status.slice(1) : 'N/A'}
                                    </span>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">KYC Submitted</label>
                                    <p className="text-gray-900">
                                        {user.kyc_submission_time
                                            ? <span className="font-medium text-blue-700">{user.kyc_submission_time} ago</span>
                                            : <span className="text-gray-400">Not submitted</span>
                                        }
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">KYC Submitted At</label>
                                    <p className="text-gray-900">{formatDateTime(user.kyc_submitted_at)}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Verification Date</label>
                                    <p className="text-gray-900">{formatDateTime(user.verification_date)}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">KYC Verified By</label>
                                    <p className="text-gray-900">{displayValue(user.kyc_verified_by)}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Rating & Reviews */}
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <div className="p-4 md:p-6 border-b border-gray-200 bg-gray-50">
                            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.814a1 1 0 00.951-.692l1.519-4.674z" />
                                </svg>
                                Rating & Reviews
                            </h3>
                        </div>
                        <div className="p-4 md:p-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Trust Score</label>
                                    <p className="text-gray-900">{user.business_profile.trust_score}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Rating</label>
                                    <p className="text-gray-900 flex items-center gap-2">
                                        {user.business_profile.rating}
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24-.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                        </svg>
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Reviews Count</label>
                                    <p className="text-gray-900">{user.business_profile.reviews_count}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Additional Information */}
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <div className="p-4 md:p-6 border-b border-gray-200 bg-gray-50">
                            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Additional Information
                            </h3>
                        </div>
                        <div className="p-4 md:p-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Referral Code</label>
                                    <p className="text-gray-900">{displayValue(user.business_profile.referral_code)}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Referred By</label>
                                    <p className="text-gray-900">{displayValue(user.business_profile.referred_by)}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Source</label>
                                    <p className="text-gray-900">{displayValue(user.business_profile.source)}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Admin Notes</label>
                                    <p className="text-gray-900">{displayValue(user.business_profile.admin_notes)}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Notification Email</label>
                                    <p className="text-gray-900">{displayValue(user.business_profile.notification_email)}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Notification SMS</label>
                                    <p className="text-gray-900">{displayValue(user.business_profile.notification_sms)}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Audit Trail ID</label>
                                    <p className="text-gray-900">{displayValue(user.business_profile.audit_trail_id)}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Referral Information */}
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <div className="p-4 md:p-6 border-b border-gray-200 bg-gray-50">
                            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                Referral Information
                            </h3>
                        </div>
                        <div className="p-4 md:p-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Referral Code</label>
                                    <p className="text-gray-900">{displayValue(user.business_profile.referral_code)}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Referred By</label>
                                    <p className="text-gray-900">{displayValue(user.business_profile.referred_by)}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Source</label>
                                    <p className="text-gray-900">{displayValue(user.business_profile.source)}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Admin Notes */}
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <div className="p-4 md:p-6 border-b border-gray-200 bg-gray-50">
                            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Admin Notes
                            </h3>
                        </div>
                        <div className="p-4 md:p-6">
                            <p className="text-gray-900 whitespace-pre-wrap">
                                {displayValue(user.business_profile.admin_notes)}
                            </p>
                        </div>
                    </div>

                    {/* Timestamps */}
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <div className="p-4 md:p-6 border-b border-gray-200 bg-gray-50">
                            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Timestamps
                            </h3>
                        </div>
                        <div className="p-4 md:p-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Created At</label>
                                    <p className="text-gray-900">{formatDateTime(user.created_at)}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Updated At</label>
                                    <p className="text-gray-900">{formatDateTime(user.updated_at)}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Business Profile Created</label>
                                    <p className="text-gray-900">{formatDateTime(user.business_profile.created_at)}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Business Profile Updated</label>
                                    <p className="text-gray-900">{formatDateTime(user.business_profile.updated_at)}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Deleted Account Info */}
                    {user.deleted_at && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                            <h3 className="text-lg font-semibold text-red-800 mb-4 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                Account Deleted
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-red-600 mb-1">Deleted At</label>
                                    <p className="text-red-900">{formatDateTime(user.deleted_at)}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-red-600 mb-1">Deletion Reason</label>
                                    <p className="text-red-900">{displayValue(user.deleted_reason)}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Approve User Confirmation Modal */}
                <Modal
                    isOpen={showApproveModal}
                    onClose={() => setShowApproveModal(false)}
                    className="max-w-sm"
                >
                    <div className="p-4 md:p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Confirm User Approval
                        </h3>
                        <p className="text-gray-600 mb-6">
                            Are you sure you want to approve this user? The user will be moved to the verified users list.
                        </p>
                        <div className="flex justify-end space-x-3">
                            <Button
                                variant="outline"
                                onClick={() => setShowApproveModal(false)}
                                className="px-4 py-2"
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="primary"
                                onClick={handleApproveUser}
                                className="px-4 py-2 bg-green-600 hover:bg-green-700"
                                disabled={actionLoading}
                            >
                                {actionLoading ? 'Processing...' : 'Confirm Approval'}
                            </Button>
                        </div>
                    </div>
                </Modal>

                {/* Reject User Modal */}
                <Modal
                    isOpen={showRejectModal}
                    onClose={() => setShowRejectModal(false)}
                    className="max-w-md"
                >
                    <div className="p-4 md:p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Reject User
                        </h3>
                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Rejection Reason <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                    rows={3}
                                    placeholder="Enter the reason for rejection..."
                                />
                            </div>
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="allowResubmit"
                                    checked={allowToResubmit}
                                    onChange={(e) => setAllowToResubmit(e.target.checked)}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <label htmlFor="allowResubmit" className="ml-2 block text-sm text-gray-700">
                                    Allow user to resubmit documents
                                </label>
                            </div>
                        </div>
                        <div className="flex justify-end space-x-3">
                            <Button
                                variant="outline"
                                onClick={() => setShowRejectModal(false)}
                                className="px-4 py-2"
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="primary"
                                onClick={handleRejectUser}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700"
                                disabled={actionLoading}
                            >
                                {actionLoading ? 'Processing...' : 'Confirm Rejection'}
                            </Button>
                        </div>
                    </div>
                </Modal>

                {/* Document Approval Confirmation Modal */}
                <Modal
                    isOpen={showDocApproveModal}
                    onClose={() => {
                        setShowDocApproveModal(false);
                        setSelectedDoc(null);
                    }}
                    className="max-w-sm"
                >
                    <div className="p-4 md:p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Confirm Document Approval
                        </h3>
                        <p className="text-gray-600 mb-6">
                            Are you sure you want to approve the <span className="font-medium">{selectedDoc?.title}</span> document?
                        </p>
                        <div className="flex justify-end space-x-3">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowDocApproveModal(false);
                                    setSelectedDoc(null);
                                }}
                                className="px-4 py-2"
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="primary"
                                onClick={handleApproveDocument}
                                className="px-4 py-2 bg-green-600 hover:bg-green-700"
                                disabled={docApprovalLoading !== null}
                            >
                                {docApprovalLoading !== null ? 'Processing...' : 'Confirm Approval'}
                            </Button>
                        </div>
                    </div>
                </Modal>

                {/* Upload Document Modal */}
                <Modal
                    isOpen={showUploadModal}
                    onClose={() => {
                        setShowUploadModal(false);
                        setUploadFile(null);
                        setUploadDocType('');
                        setUploadDocTitle('');
                    }}
                    className="max-w-lg"
                >
                    <div className="p-4 md:p-6">
                        {/* Header */}
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">Upload Document</h3>
                                <p className="text-sm text-gray-500">Admin upload on behalf of user</p>
                            </div>
                        </div>

                        {/* Document type chip */}
                        <div className="mb-4 flex items-center gap-2">
                            <span className="text-sm text-gray-600">Document type:</span>
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                                {uploadDocTitle}
                            </span>
                        </div>

                        {/* File input area */}
                        <div className="mb-5">
                            {!uploadFile ? (
                                <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-purple-300 rounded-xl cursor-pointer bg-purple-50 hover:bg-purple-100 transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-purple-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                    </svg>
                                    <p className="text-sm text-purple-600 font-medium">Click to browse files</p>
                                    <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG, WebP supported</p>
                                    <input
                                        type="file"
                                        className="hidden"
                                        onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                                    />
                                </label>
                            ) : (
                                <div className="flex items-center gap-3 p-4 bg-purple-50 border border-purple-200 rounded-xl">
                                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-800 truncate">{uploadFile.name}</p>
                                        <p className="text-xs text-gray-500">{(uploadFile.size / 1024).toFixed(1)} KB</p>
                                    </div>
                                    <button
                                        onClick={() => setUploadFile(null)}
                                        title="Remove and choose a different file"
                                        className="p-1.5 rounded-lg hover:bg-red-100 transition-colors text-gray-400 hover:text-red-600"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-3">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowUploadModal(false);
                                    setUploadFile(null);
                                    setUploadDocType('');
                                    setUploadDocTitle('');
                                }}
                                className="px-4 py-2"
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="primary"
                                onClick={handleUploadDocument}
                                className="px-5 py-2 bg-purple-600 hover:bg-purple-700"
                                disabled={uploadLoading || !uploadFile}
                            >
                                {uploadLoading ? (
                                    <span className="flex items-center gap-2">
                                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Uploading...
                                    </span>
                                ) : 'Upload Document'}
                            </Button>
                        </div>
                    </div>
                </Modal>

                {/* Toast Notification */}
                <Toast
                    message={toastMessage}
                    type={toastType}
                    isVisible={showToast}
                    onClose={() => setShowToast(false)}
                />
            </div>

            {/* Business Logo Lightbox */}
            {showLogoModal && user.business_profile.business_logo && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center"
                    onClick={() => setShowLogoModal(false)}
                >
                    <div className="relative bg-white rounded-2xl shadow-2xl p-4 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-sm font-semibold text-gray-700">{user.business_profile.business_name || 'Business Logo'}</p>
                            <button
                                onClick={() => setShowLogoModal(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <img
                            src={user.business_profile.business_logo}
                            alt={user.business_profile.business_name || 'Business Logo'}
                            className="w-full rounded-xl object-contain max-h-[70vh]"
                        />
                    </div>
                </div>
            )}
        </AdminLayout>
    );
};

export default UnverifiedUserDetailPage;
