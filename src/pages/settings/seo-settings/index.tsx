import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import AdminLayout from "@/layout/AdminLayout";
import Button from "@/components/ui/button/Button";
import Toast from "@/components/ui/toast/Toast";
import { Modal } from "@/components/ui/modal";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EyeIcon, PencilIcon, PlusIcon, TrashBinIcon } from "@/icons";
import { apiDelete, apiGet } from "@/utils/api";

interface SeoSetting {
  id: number;
  page: string;
  meta_title: string;
  meta_keywords: string;
  meta_description: string;
}

const SeoSettingsPage = () => {
  const router = useRouter();
  const [seoSettings, setSeoSettings] = useState<SeoSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [seoToDelete, setSeoToDelete] = useState<SeoSetting | null>(null);
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

  const normalizeSeoSettings = (data: SeoSetting[] | { results?: SeoSetting[] }) => {
    if (Array.isArray(data)) {
      return data;
    }

    return Array.isArray(data?.results) ? data.results : [];
  };

  const fetchSeoSettings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiGet("/settings/seo-settings/");
      setSeoSettings(normalizeSeoSettings(response.data));
    } catch (error) {
      console.error("Fetch SEO settings error:", error);
      showToast("Failed to fetch SEO settings", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSeoSettings();
  }, [fetchSeoSettings]);

  const handleDeleteClick = (seoSetting: SeoSetting) => {
    setSeoToDelete(seoSetting);
    setDeleteModalOpen(true);
  };

  const handleDeleteCancel = () => {
    setDeleteModalOpen(false);
    setSeoToDelete(null);
  };

  const handleDeleteConfirm = async () => {
    if (!seoToDelete) {
      return;
    }

    try {
      await apiDelete(`/settings/seo-settings/${seoToDelete.id}/delete/`);
      showToast("SEO setting deleted successfully", "success");
      setDeleteModalOpen(false);
      setSeoToDelete(null);
      fetchSeoSettings();
    } catch (error) {
      console.error("Delete SEO setting error:", error);
      showToast("Failed to delete SEO setting", "error");
    }
  };

  const truncate = (value: string, maxLength = 70) => {
    if (!value) {
      return "N/A";
    }

    return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex h-64 items-center justify-center">
          <div>Loading...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-title-md font-bold text-gray-800 dark:text-white/90">
          SEO Settings
        </h1>
        <Button
          onClick={() => router.push("/settings/seo-settings/create")}
          startIcon={<PlusIcon />}
        >
          Create SEO Setting
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  Page
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  Meta Title
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  Meta Keywords
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  Meta Description
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  Actions
                </TableCell>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {seoSettings.length === 0 ? (
                <TableRow>
                  <td
                    colSpan={5}
                    className="px-5 py-8 text-center text-theme-sm text-gray-500 dark:text-gray-400"
                  >
                    No SEO settings found
                  </td>
                </TableRow>
              ) : (
                seoSettings.map((seoSetting) => (
                  <TableRow key={seoSetting.id}>
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-800 dark:text-white/90">
                      {seoSetting.page}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                      {truncate(seoSetting.meta_title)}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                      {truncate(seoSetting.meta_keywords)}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                      {truncate(seoSetting.meta_description)}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => router.push(`/settings/seo-settings/${seoSetting.id}`)}
                          className="rounded-md border border-blue-200 p-2 text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/20"
                          title="View"
                        >
                          <EyeIcon />
                        </button>
                        <button
                          onClick={() =>
                            router.push(`/settings/seo-settings/edit?id=${seoSetting.id}`)
                          }
                          className="rounded-md p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                          title="Edit"
                        >
                          <PencilIcon />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(seoSetting)}
                          className="rounded-md p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                          title="Delete"
                        >
                          <TrashBinIcon />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Modal isOpen={deleteModalOpen} onClose={handleDeleteCancel} className="max-w-sm">
        <div className="p-6">
          <h2 className="mb-3 text-center text-lg font-bold">Confirm Delete</h2>
          <p className="mb-6 text-center text-gray-600 dark:text-gray-400">
            Are you sure you want to delete the SEO setting for{" "}
            <b>{seoToDelete?.page ?? ""}</b>? This action cannot be undone.
          </p>
          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={handleDeleteCancel} className="px-6">
              Cancel
            </Button>
            <button
              onClick={handleDeleteConfirm}
              className="rounded-md bg-red-600 px-6 py-2 font-medium text-white transition-colors hover:bg-red-700"
            >
              Delete
            </button>
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

export default SeoSettingsPage;
