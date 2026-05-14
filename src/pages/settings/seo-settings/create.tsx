import React, { useState } from "react";
import { useRouter } from "next/router";
import AdminLayout from "@/layout/AdminLayout";
import Toast from "@/components/ui/toast/Toast";
import SeoSettingsForm, {
  SeoSettingFormData,
} from "@/components/settings/SeoSettingsForm";
import { apiPost } from "@/utils/api";

const CreateSeoSettingsPage = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<SeoSettingFormData>({
    page: "",
    meta_title: "",
    meta_keywords: "",
    meta_description: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof SeoSettingFormData, string>>>(
    {}
  );
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
    isVisible: boolean;
  }>({
    message: "",
    type: "success",
    isVisible: false,
  });

  const showToast = (message: string, type: "success" | "error" | "info") => {
    setToast({ message, type, isVisible: true });
  };

  const closeToast = () => {
    setToast((prev) => ({ ...prev, isVisible: false }));
  };

  const validateForm = () => {
    const newErrors: Partial<Record<keyof SeoSettingFormData, string>> = {};

    if (!formData.page.trim()) {
      newErrors.page = "Page is required";
    }

    if (!formData.meta_title.trim()) {
      newErrors.meta_title = "Meta title is required";
    }

    if (!formData.meta_keywords.trim()) {
      newErrors.meta_keywords = "Meta keywords are required";
    }

    if (!formData.meta_description.trim()) {
      newErrors.meta_description = "Meta description is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name as keyof SeoSettingFormData]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const handleDescriptionChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      meta_description: value,
    }));

    if (errors.meta_description) {
      setErrors((prev) => ({
        ...prev,
        meta_description: "",
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      await apiPost("/settings/seo-settings/create/", formData);
      showToast("SEO setting created successfully", "success");

      setTimeout(() => {
        router.push("/settings/seo-settings");
      }, 1200);
    } catch (error) {
      console.error("Create SEO setting error:", error);
      showToast("Failed to create SEO setting", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-title-md font-bold text-gray-800 dark:text-white/90">
          Create SEO Setting
        </h1>
      </div>

      <SeoSettingsForm
        formData={formData}
        errors={errors}
        loading={loading}
        submitLabel="Create SEO Setting"
        onSubmit={handleSubmit}
        onCancel={() => router.push("/settings/seo-settings")}
        onInputChange={handleInputChange}
        onDescriptionChange={handleDescriptionChange}
      />

      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={closeToast}
      />
    </AdminLayout>
  );
};

export default CreateSeoSettingsPage;
