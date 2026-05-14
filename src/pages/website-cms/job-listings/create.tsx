import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import AdminLayout from '@/layout/AdminLayout';
import Button from "@/components/ui/button/Button";
import InputField from "@/components/form/input/InputField";
import TextEditor from "@/components/form/TextEditor";
import Select from "@/components/form/Select";
import Toast from "@/components/ui/toast/Toast";
import { apiPost } from "@/utils/api";

interface JobFormData {
    job_title: string;
    field: string;
    job_description: string;
    job_type: 'full_time' | 'part_time';
    opening_valid_till: string;
}

const CreateJobListingPage = () => {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<JobFormData>({
        job_title: '',
        field: '',
        job_description: '',
        job_type: 'full_time',
        opening_valid_till: new Date().toISOString().split('T')[0] // Today's date in YYYY-MM-DD format
    });
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info"; isVisible: boolean }>({
        message: '',
        type: 'success',
        isVisible: false
    });
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

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

        if (!formData.job_title.trim()) {
            newErrors.job_title = 'Job title is required';
        }
        if (!formData.field.trim()) {
            newErrors.field = 'Field is required';
        }
        if (!formData.job_description.trim()) {
            newErrors.job_description = 'Job description is required';
        }
        if (!formData.opening_valid_till) {
            newErrors.opening_valid_till = 'Opening valid till date is required';
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
            job_description: value
        }));

        // Clear error for this field when user starts typing
        if (errors.job_description) {
            setErrors(prev => ({
                ...prev,
                job_description: ''
            }));
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
            await apiPost('/cms/jobs/create/', formData);
            showToast('Job listing created successfully', 'success');

            // Redirect to job listings list after successful creation
            setTimeout(() => {
                router.push('/website-cms/job-listings');
            }, 1500);

        } catch (error) {
            console.error('Create job listing error:', error);
            showToast('Failed to create job listing', 'error');
        } finally {
            setLoading(false);
        }
    };

    const jobTypeOptions = [
        { value: 'full_time', label: 'Full Time' },
        { value: 'part_time', label: 'Part Time' }
    ];

    return (
        <AdminLayout>
            <div className="flex justify-between items-center mb-6">
                <h1 className="font-bold text-gray-800 text-title-md dark:text-white/90">Create Job Listing</h1>
                <Button
                    variant="outline"
                    onClick={() => router.push('/website-cms/job-listings')}
                >
                    Back to Job Listings
                </Button>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-white/[0.05] dark:bg-white/[0.03]">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Job Title */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                                Job Title *
                            </label>
                            <InputField
                                name="job_title"
                                type="text"
                                placeholder="Enter job title"
                                defaultValue={formData.job_title}
                                onChange={handleInputChange}
                                error={!!errors.job_title}
                            />
                            {errors.job_title && <p className="text-red-500 text-sm mt-1">{errors.job_title}</p>}
                        </div>

                        {/* Field */}
                        <div>
                            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                                Field *
                            </label>
                            <InputField
                                name="field"
                                type="text"
                                placeholder="e.g. Engineering, Marketing, Sales"
                                defaultValue={formData.field}
                                onChange={handleInputChange}
                                error={!!errors.field}
                            />
                            {errors.field && <p className="text-red-500 text-sm mt-1">{errors.field}</p>}
                        </div>

                        {/* Job Type */}
                        <div>
                            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                                Job Type *
                            </label>
                            <Select
                                options={jobTypeOptions}
                                placeholder="Select job type"
                                defaultValue={formData.job_type}
                                onChange={(value) => handleSelectChange('job_type', value)}
                            />
                        </div>

                        {/* Opening Valid Till */}
                        <div>
                            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                                Opening Valid Till *
                            </label>
                            <InputField
                                name="opening_valid_till"
                                type="date"
                                defaultValue={formData.opening_valid_till}
                                onChange={handleInputChange}
                                error={!!errors.opening_valid_till}
                            />
                            {errors.opening_valid_till && <p className="text-red-500 text-sm mt-1">{errors.opening_valid_till}</p>}
                        </div>
                    </div>

                    {/* Job Description - Text Editor */}
                    <div className=" job-description-box">
                        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                            Job Description *
                        </label>
                        <TextEditor
                            placeholder="Enter detailed job description, requirements, and responsibilities"
                            value={formData.job_description}
                            onChange={handleTextAreaChange}
                            hint="Use the toolbar to format your job description"
                        />
                        {errors.job_description && <p className="text-red-500 text-sm mt-1">{errors.job_description}</p>}
                    </div>

                    {/* Submit Buttons */}
                    <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                        <Button
                            variant="outline"
                            onClick={() => router.push('/website-cms/job-listings')}
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Creating...' : 'Create Job Listing'}
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

export default CreateJobListingPage;
