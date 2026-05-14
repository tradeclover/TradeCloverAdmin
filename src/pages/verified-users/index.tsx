import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import AdminLayout from '@/layout/AdminLayout';
import {
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { EyeIcon } from "@/icons";
import { apiGet } from "@/utils/api";

interface BusinessProfile {
    id: number;
    first_name: string | null;
    last_name: string | null;
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
    account_number: string | null;
    account_ifsc: string | null;
    user: number;
}

interface User {
    id: number;
    business_profile: BusinessProfile | null;
    user_kyc: UserKyc | null;
    last_login: string | null;
    is_superuser: boolean;
    country_code: string;
    primary_phone: string;
    alternate_phone: string | null;
    email: string | null;
    slug: string | null;
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
}

const VerifiedUsersPage = () => {
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch verified users
    const fetchVerifiedUsers = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await apiGet('/users/admin/verified-users/');
            setUsers(response.data);
        } catch (error) {
            console.error('Fetch verified users error:', error);
            setError('Failed to fetch verified users');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVerifiedUsers();
    }, []);

    const getUserTypeBadge = (userType: string) => {
        let typeText = 'N/A';
        let typeClass = 'bg-gray-100 text-gray-800';

        if (userType === '1') {
            typeText = 'Buyer';
            typeClass = 'bg-blue-100 text-blue-800';
        } else if (userType === '2') {
            typeText = 'Seller';
            typeClass = 'bg-green-100 text-green-800';
        }

        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeClass}`}>
                {typeText}
            </span>
        );
    };

    const getKycStatusBadge = (kycStatus: string) => {
        let statusClass = 'bg-gray-100 text-gray-800';
        let statusText = kycStatus ? kycStatus.charAt(0).toUpperCase() + kycStatus.slice(1) : 'N/A';

        if (kycStatus === 'verified' || kycStatus === 'admin_verified') {
            statusClass = 'bg-green-100 text-green-800';
            statusText = kycStatus === 'admin_verified' ? 'Admin Verified' : 'Verified';
        } else if (kycStatus === 'pending') {
            statusClass = 'bg-yellow-100 text-yellow-800';
        } else if (kycStatus === 'rejected') {
            statusClass = 'bg-red-100 text-red-800';
        }

        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusClass}`}>
                {statusText}
            </span>
        );
    };

    const getVerificationStatusBadge = (isVerifiedVendor: boolean) => {
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                isVerifiedVendor ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
                {isVerifiedVendor ? 'Verified' : 'Unverified'}
            </span>
        );
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const safeValue = (value: any) => {
        if (
            value === null ||
            value === undefined ||
            value === '' ||
            value === 'null' ||
            value === 'undefined'
        ) {
            return null;
        }
        return value.toString().trim();
    };

    const displayValue = (value: any) => {
        return value && value.toString().trim() !== '' ? value : 'N/A';
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
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="flex justify-between items-center mb-4">
                <h1 className="font-bold text-gray-800 text-title-md dark:text-white/90">Verified Users</h1>
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
                                    Email
                                </TableCell>
                                <TableCell
                                    isHeader
                                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                                >
                                    Phone
                                </TableCell>
                                <TableCell
                                    isHeader
                                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                                >
                                    User Type
                                </TableCell>
                                <TableCell
                                    isHeader
                                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                                >
                                    Verification Date
                                </TableCell>
                                <TableCell
                                    isHeader
                                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                                >
                                    Date Joined
                                </TableCell>
                                <TableCell
                                    isHeader
                                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                                >
                                    KYC Status
                                </TableCell>
                                <TableCell
                                    isHeader
                                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                                >
                                    Verification Status
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
                            {users.length === 0 ? (
                                <TableRow>
                                    <td
                                        colSpan={8}
                                        className="px-5 py-8 text-center text-gray-500 dark:text-gray-400 text-theme-sm"
                                    >
                                        No verified users found
                                    </td>
                                </TableRow>
                            ) : (
                                users.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="px-5 py-4 text-gray-800 text-theme-sm dark:text-white/90">
                                            {(() => {
                                                const firstName = safeValue(user.business_profile?.first_name);
                                                const lastName = safeValue(user.business_profile?.last_name);

                                                if (firstName || lastName) {
                                                    return `${firstName ?? ''} ${lastName ?? ''}`.trim();
                                                }

                                                return 'N/A';
                                            })()}
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                                            {displayValue(user.email)}
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                                            {user.country_code} {displayValue(user.primary_phone)}
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                                            {getUserTypeBadge(user.user_type)}
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                                            {user.verification_date ? formatDate(user.verification_date) : 'N/A'}
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                                            {formatDate(user.created_at)}
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                                            {getKycStatusBadge(user.kyc_status)}
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                                            {getVerificationStatusBadge(user.is_verified_vendor)}
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                                            <button
                                                onClick={() => router.push(`/verified-users/${user.id}`)}
                                                className="inline-flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-md dark:text-blue-400 dark:hover:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                                            >
                                                <EyeIcon />
                                                <span>View</span>
                                            </button>
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

export default VerifiedUsersPage;