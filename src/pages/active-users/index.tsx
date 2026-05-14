import React, { useState, useEffect } from "react";
import AdminLayout from '@/layout/AdminLayout';
import {
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import { EyeIcon } from "@/icons";
import { apiGet } from "@/utils/api";

interface UserProfile {
    id: number;
    first_name: string;
    last_name: string;
    business_name: string | null;
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
    gstin: string | null;
    pan: string | null;
    cin: string | null;
    import_export_code: string | null;
    tax_compliance_status: string | null;
    gst_certificate_url: string | null;
    pan_card_url: string | null;
    registration_doc_url: string | null;
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
    admin_notes: string;
    audit_trail_id: string | null;
    rating: number;
    reviews_count: number;
    created_at: string;
    updated_at: string;
    user: number;
}

interface User {
    id: number;
    country_code: string;
    primary_phone: string;
    alternate_phone: string | null;
    email: string | null;
    is_active: boolean;
    is_staff: boolean;
    onboarding_completed: boolean;
    profile_completion_percent: number;
    is_verified_vendor: boolean;
    kyc_status: string;
    verification_date: string | null;
    last_login_at: string | null;
    last_active_at: string | null;
    created_at: string;
    updated_at: string;
    profile: UserProfile;
}

const ActiveUsersPage = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Fetch active users
    const fetchActiveUsers = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await apiGet('/users/admin');
            setUsers(response.data);
        } catch (error) {
            console.error('Fetch active users error:', error);
            setError('Failed to fetch active users');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchActiveUsers();
    }, []);

    const getUserTypeBadge = (user: User) => {
        let userType = 'buyer'; // default

        if (user.is_staff) {
            userType = 'admin';
        } else if (user.is_verified_vendor) {
            userType = 'seller';
        }

        const typeConfig = {
            buyer: 'bg-blue-100 text-blue-800',
            seller: 'bg-green-100 text-green-800',
            admin: 'bg-purple-100 text-purple-800',
        };

        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeConfig[userType as keyof typeof typeConfig] || 'bg-gray-100 text-gray-800'}`}>
                {userType.toUpperCase()}
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
                <h1 className="font-bold text-gray-800 text-title-md dark:text-white/90">Active Users</h1>
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
                                    Status
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
                                    Last Login
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
                                        No active users found
                                    </td>
                                </TableRow>
                            ) : (
                                users.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="px-5 py-4 text-gray-800 text-theme-sm dark:text-white/90">
                                            {/* {user.profile ? `${user.profile.first_name} ${user.profile.last_name}` : 'N/A'} */}
                                            {(() => {
                                                const firstName = safeValue(user.profile?.first_name);
                                                const lastName = safeValue(user.profile?.last_name);

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
                                            {displayValue(user.primary_phone)}
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                                            {getUserTypeBadge(user)}
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {user.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                                            {formatDate(user.created_at)}
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                                            {user.last_login_at ? formatDate(user.last_login_at) : 'Never'}
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                                            <button
                                                onClick={() => {
                                                    setSelectedUser(user);
                                                    setIsModalOpen(true);
                                                }}
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

            {/* User Details Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setSelectedUser(null);
                }}
                className="max-w-4xl max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
                <style jsx>{`
                    .custom-scrollbar::-webkit-scrollbar {
                        width: 6px;
                       
                    }
                    .custom-scrollbar::-webkit-scrollbar-track {
                        background: #465fff;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb {
                        background: #465fff;
                        border-radius: 3px;
                        
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                        background: #465fff;
                    }
                    .dark .custom-scrollbar::-webkit-scrollbar-track {
                        background: #465fff;
                    }
                `}</style>
                {selectedUser && (
                    <div className="p-6">
                        <div className="mb-6">
                            <h2 className="text-2xl font-bold text-gray-800 dark:text-white/90">
                                User Details - {selectedUser.profile.first_name} {selectedUser.profile.last_name}
                            </h2>
                        </div>

                        <div className="space-y-6">
                            {/* Personal Information */}
                            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                                <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-white/90">Personal Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">First Name</label>
                                        <p className="mt-1 text-gray-900 dark:text-white">{displayValue(selectedUser.profile.first_name)}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Last Name</label>
                                        <p className="mt-1 text-gray-900 dark:text-white">{displayValue(selectedUser.profile.last_name)}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Primary Phone</label>
                                        <p className="mt-1 text-gray-900 dark:text-white">{selectedUser.country_code} {selectedUser.primary_phone}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Alternate Phone</label>
                                        <p className="mt-1 text-gray-900 dark:text-white">{displayValue(selectedUser.alternate_phone)}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                                        <p className="mt-1 text-gray-900 dark:text-white">{displayValue(selectedUser.email)}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Business Information */}
                            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                                <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-white/90">Business Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Business Name</label>
                                        <p className="mt-1 text-gray-900 dark:text-white">{displayValue(selectedUser.profile.business_name)}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Registration Type</label>
                                        <p className="mt-1 text-gray-900 dark:text-white">{displayValue(selectedUser.profile.business_registration_type)}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Industry Category</label>
                                        <p className="mt-1 text-gray-900 dark:text-white">{displayValue(selectedUser.profile.industry_category)}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Website URL</label>
                                        <p className="mt-1 text-gray-900 dark:text-white">{displayValue(selectedUser.profile.website_url)}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Year of Establishment</label>
                                        <p className="mt-1 text-gray-900 dark:text-white">{displayValue(selectedUser.profile.year_of_establishment)}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Employee Count</label>
                                        <p className="mt-1 text-gray-900 dark:text-white">{displayValue(selectedUser.profile.employee_count)}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Annual Turnover</label>
                                        <p className="mt-1 text-gray-900 dark:text-white">{displayValue(selectedUser.profile.annual_turnover)}</p>
                                    </div>
                                    {/* <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Business Description</label>
                                        <p className="mt-1 text-gray-900 dark:text-white">{displayValue(selectedUser.profile.business_description)}</p>
                                    </div> */}
                                </div>
                            </div>

                            {/* Address Information */}
                            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                                <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-white/90">Head Office Address</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Address</label>
                                        <p className="mt-1 text-gray-900 dark:text-white">{displayValue(selectedUser.profile.head_office_address)}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Country</label>
                                        <p className="mt-1 text-gray-900 dark:text-white">{displayValue(selectedUser.profile.head_office_country)}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">State</label>
                                        <p className="mt-1 text-gray-900 dark:text-white">{displayValue(selectedUser.profile.head_office_state)}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">City</label>
                                        <p className="mt-1 text-gray-900 dark:text-white">{displayValue(selectedUser.profile.head_office_city)}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Zipcode</label>
                                        <p className="mt-1 text-gray-900 dark:text-white">{displayValue(selectedUser.profile.head_office_zipcode)}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Account Status */}
                            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                                <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-white/90">Account Status</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Active</label>
                                        <p className="mt-1 text-gray-900 dark:text-white">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${selectedUser.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {selectedUser.is_active ? 'Yes' : 'No'}
                                            </span>
                                        </p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Staff</label>
                                        <p className="mt-1 text-gray-900 dark:text-white">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${selectedUser.is_staff ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>
                                                {selectedUser.is_staff ? 'Yes' : 'No'}
                                            </span>
                                        </p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Verified Vendor</label>
                                        <p className="mt-1 text-gray-900 dark:text-white">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${selectedUser.is_verified_vendor ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {selectedUser.is_verified_vendor ? 'Yes' : 'No'}
                                            </span>
                                        </p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">KYC Status</label>
                                        <p className="mt-1 text-gray-900 dark:text-white">{displayValue(selectedUser.kyc_status)}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Onboarding Completed</label>
                                        <p className="mt-1 text-gray-900 dark:text-white">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${selectedUser.onboarding_completed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {selectedUser.onboarding_completed ? 'Yes' : 'No'}
                                            </span>
                                        </p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Profile Completion %</label>
                                        <p className="mt-1 text-gray-900 dark:text-white">{selectedUser.profile_completion_percent}%</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Last Login</label>
                                        <p className="mt-1 text-gray-900 dark:text-white">{selectedUser.last_login_at ? formatDate(selectedUser.last_login_at) : 'Never'}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Last Active</label>
                                        <p className="mt-1 text-gray-900 dark:text-white">{selectedUser.last_active_at ? formatDate(selectedUser.last_active_at) : 'N/A'}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Created At</label>
                                        <p className="mt-1 text-gray-900 dark:text-white">{formatDate(selectedUser.created_at)}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Updated At</label>
                                        <p className="mt-1 text-gray-900 dark:text-white">{formatDate(selectedUser.updated_at)}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Additional Information */}
                            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                                <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-white/90">Additional Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Preferred Currency</label>
                                        <p className="mt-1 text-gray-900 dark:text-white">{displayValue(selectedUser.profile.preferred_currency)}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Time Zone</label>
                                        <p className="mt-1 text-gray-900 dark:text-white">{displayValue(selectedUser.profile.time_zone)}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Trust Score</label>
                                        <p className="mt-1 text-gray-900 dark:text-white">{selectedUser.profile.trust_score}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Rating</label>
                                        <p className="mt-1 text-gray-900 dark:text-white">{selectedUser.profile.rating}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Reviews Count</label>
                                        <p className="mt-1 text-gray-900 dark:text-white">{selectedUser.profile.reviews_count}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </AdminLayout>
    );
};

export default ActiveUsersPage;
