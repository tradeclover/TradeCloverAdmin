import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import AdminLayout from "@/layout/AdminLayout";
import Toast from "@/components/ui/toast/Toast";
import SeoSettingsForm, {
  SeoSettingFormData,
} from "@/components/settings/SeoSettingsForm";
import { apiGet, apiPut } from "@/utils/api";

interface SeoSetting extends SeoSettingFormData {
  id: number;
}

const EditSeoSettingsPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [formData, setFormData] = useState<SeoSettingFormData>({
    page: "",
    meta_title: "",
    meta_keywords: "",
    meta_description: "",
  });
  const [seoSetting, setSeoSetting] = useState<SeoSetting | null>(null);
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

  const fetchSeoSetting = useCallback(async (seoId: string) => {
    try {
      setFetchLoading(true);
      const response = await apiGet(`/settings/seo-settings/${seoId}/`);
      const data: SeoSetting = response.data;

      setSeoSetting(data);
      setFormData({
        page: data.page || "",
        meta_title: data.meta_title || "",
        meta_keywords: data.meta_keywords || "",
        meta_description: data.meta_description || "",
      });
    } catch (error) {
      console.error("Fetch SEO setting error:", error);
      showToast("Failed to fetch SEO setting", "error");
      router.push("/settings/seo-settings");
    } finally {
      setFetchLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (id && typeof id === "string") {
      fetchSeoSetting(id);
    }
  }, [fetchSeoSetting, id]);

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

    if (!id || typeof id !== "string") {
      showToast("Invalid SEO setting id", "error");
      return;
    }

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      await apiPut(`/settings/seo-settings/${id}/update/`, formData);
      showToast("SEO setting updated successfully", "success");

      setTimeout(() => {
        router.push("/settings/seo-settings");
      }, 1200);
    } catch (error) {
      console.error("Update SEO setting error:", error);
      showToast("Failed to update SEO setting", "error");
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <AdminLayout>
        <div className="flex h-64 items-center justify-center">
          <div>Loading SEO setting...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-title-md font-bold text-gray-800 dark:text-white/90">
          Edit SEO Setting
        </h1>
      </div>

      <div key={seoSetting?.id ?? "seo-setting-form"}>
        <SeoSettingsForm
          formData={formData}
          errors={errors}
          loading={loading}
          submitLabel="Update SEO Setting"
          onSubmit={handleSubmit}
          onCancel={() => router.push("/settings/seo-settings")}
          onInputChange={handleInputChange}
          onDescriptionChange={handleDescriptionChange}
        />
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

export default EditSeoSettingsPage;
