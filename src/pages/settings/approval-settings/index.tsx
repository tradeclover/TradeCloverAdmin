import React, { useCallback, useEffect, useMemo, useState } from "react";
import AdminLayout from "@/layout/AdminLayout";
import Button from "@/components/ui/button/Button";
import Toast from "@/components/ui/toast/Toast";
import { apiGet, apiPatch } from "@/utils/api";

type ApprovalSettings = Record<string, unknown>;

const toLabel = (key: string) =>
  key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const isPrimitiveValue = (value: unknown) =>
  typeof value === "string" ||
  typeof value === "number" ||
  typeof value === "boolean" ||
  value === null;

const getFieldHint = (key: string, value: unknown) => {
  if (typeof value === "boolean") {
    return "Toggle this setting on or off.";
  }

  if (typeof value === "number") {
    return "Enter a numeric value.";
  }

  if (key.includes("days")) {
    return "Value in days.";
  }

  return "Update this value as needed.";
};

const ApprovalSettingsPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<ApprovalSettings>({});
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

  const editableEntries = useMemo(
    () =>
      Object.entries(settings).filter(
        ([key, value]) =>
          key !== "id" &&
          key !== "created_at" &&
          key !== "updated_at" &&
          isPrimitiveValue(value)
      ),
    [settings]
  );

  const booleanEnabledCount = useMemo(
    () =>
      editableEntries.filter(
        ([, value]) => typeof value === "boolean" && value
      ).length,
    [editableEntries]
  );

  const fetchApprovalSettings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiGet("/users/admin/approval-settings/");
      const data =
        response.data && typeof response.data === "object"
          ? (response.data as ApprovalSettings)
          : {};
      setSettings(data);
    } catch (error) {
      console.error("Fetch approval settings error:", error);
      showToast("Failed to fetch approval settings", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApprovalSettings();
  }, [fetchApprovalSettings]);

  const handleBooleanChange = (key: string, checked: boolean) => {
    setSettings((prev) => ({
      ...prev,
      [key]: checked,
    }));
  };

  const handleInputChange = (key: string, value: string, currentValue: unknown) => {
    let nextValue: unknown = value;

    if (typeof currentValue === "number") {
      const parsed = Number(value);
      nextValue = Number.isFinite(parsed) ? parsed : 0;
    }

    setSettings((prev) => ({
      ...prev,
      [key]: nextValue,
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await apiPatch("/users/admin/approval-settings/", settings);
      showToast("Approval settings updated successfully", "success");
      fetchApprovalSettings();
    } catch (error) {
      console.error("Update approval settings error:", error);
      showToast("Failed to update approval settings", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex h-64 items-center justify-center">
          <div>Loading approval settings...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mb-6 rounded-2xl border border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-5 dark:border-white/[0.05] dark:from-white/[0.02] dark:to-white/[0.04]">
        <h1 className="text-title-md font-bold text-gray-800 dark:text-white/90">
          Approval Settings
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Manage product and user approval behavior from one place.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-700 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:text-gray-300 dark:ring-gray-700">
            Total Fields: {editableEntries.length}
          </span>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-700 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:text-gray-300 dark:ring-gray-700">
            Enabled Toggles: {booleanEnabledCount}
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-white/[0.05] dark:bg-white/[0.03]">
        {editableEntries.length === 0 ? (
          <p className="text-theme-sm text-gray-500 dark:text-gray-400">
            No editable approval settings found.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {editableEntries.map(([key, value]) => (
              <div
                key={key}
                className="rounded-xl border border-gray-200 bg-gray-50/70 p-4 transition hover:border-brand-200 hover:bg-white dark:border-gray-800 dark:bg-white/[0.02] dark:hover:border-brand-800 dark:hover:bg-white/[0.03]"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200">
                    {toLabel(key)}
                  </label>
                </div>
                <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
                  {getFieldHint(key, value)}
                </p>

                {typeof value === "boolean" ? (
                  <label className="inline-flex w-full items-center justify-between gap-3 rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900">
                    <div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                        {value ? "Enabled" : "Enable"}
                      </span>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {value ? "Click to disable" : "Click to enable"}
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(event) => handleBooleanChange(key, event.target.checked)}
                      className="h-4 w-4 accent-brand-600"
                    />
                  </label>
                ) : (
                  <input
                    type={typeof value === "number" ? "number" : "text"}
                    value={value === null ? "" : String(value)}
                    onChange={(event) => handleInputChange(key, event.target.value, value)}
                    className="h-11 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
                  />
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 border-t border-gray-200 pt-4 sm:flex-row sm:items-center sm:justify-end dark:border-gray-800">
          <Button variant="outline" onClick={fetchApprovalSettings} disabled={saving}>
            Reset
          </Button>
          <Button onClick={handleSave} disabled={saving || editableEntries.length === 0}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
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

export default ApprovalSettingsPage;
