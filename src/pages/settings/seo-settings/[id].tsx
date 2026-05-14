import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import AdminLayout from "@/layout/AdminLayout";
import Button from "@/components/ui/button/Button";
import Toast from "@/components/ui/toast/Toast";
import { apiGet } from "@/utils/api";

interface SeoSetting {
  id: number;
  page: string;
  meta_title: string;
  meta_keywords: string;
  meta_description: string;
}

const SeoSettingDetailPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const [seoSetting, setSeoSetting] = useState<SeoSetting | null>(null);
  const [loading, setLoading] = useState(true);
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
      setLoading(true);
      const response = await apiGet(`/settings/seo-settings/${seoId}/`);
      setSeoSetting(response.data);
    } catch (error) {
      console.error("Fetch SEO setting detail error:", error);
      showToast("Failed to fetch SEO setting", "error");
      router.push("/settings/seo-settings");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (id && typeof id === "string") {
      fetchSeoSetting(id);
    }
  }, [fetchSeoSetting, id]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex h-64 items-center justify-center">
          <div>Loading SEO setting...</div>
        </div>
      </AdminLayout>
    );
  }

  if (!seoSetting) {
    return null;
  }

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-title-md font-bold text-gray-800 dark:text-white/90">
          SEO Setting Details
        </h1>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.push("/settings/seo-settings")}>
            Back to SEO Settings
          </Button>
          <Button onClick={() => router.push(`/settings/seo-settings/edit?id=${seoSetting.id}`)}>
            Edit SEO Setting
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="md:col-span-2">
            <p className="mb-1 text-sm font-medium text-gray-500 dark:text-gray-400">Page</p>
            <p className="text-base text-gray-800 dark:text-white/90">{seoSetting.page}</p>
          </div>

          <div className="md:col-span-2">
            <p className="mb-1 text-sm font-medium text-gray-500 dark:text-gray-400">
              Meta Title
            </p>
            <p className="text-base text-gray-800 dark:text-white/90">
              {seoSetting.meta_title}
            </p>
          </div>

          <div className="md:col-span-2">
            <p className="mb-1 text-sm font-medium text-gray-500 dark:text-gray-400">
              Meta Keywords
            </p>
            <p className="text-base text-gray-800 dark:text-white/90">
              {seoSetting.meta_keywords}
            </p>
          </div>

          <div className="md:col-span-2">
            <p className="mb-1 text-sm font-medium text-gray-500 dark:text-gray-400">
              Meta Description
            </p>
            <p className="whitespace-pre-wrap text-base text-gray-800 dark:text-white/90">
              {seoSetting.meta_description}
            </p>
          </div>
        </div>
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

export default SeoSettingDetailPage;
