import React from "react";
import Button from "@/components/ui/button/Button";
import InputField from "@/components/form/input/InputField";
import TextArea from "@/components/form/input/TextArea";

export interface SeoSettingFormData {
  page: string;
  meta_title: string;
  meta_keywords: string;
  meta_description: string;
}

interface SeoSettingsFormProps {
  formData: SeoSettingFormData;
  errors: Partial<Record<keyof SeoSettingFormData, string>>;
  loading: boolean;
  submitLabel: string;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDescriptionChange: (value: string) => void;
}

const SeoSettingsForm: React.FC<SeoSettingsFormProps> = ({
  formData,
  errors,
  loading,
  submitLabel,
  onSubmit,
  onCancel,
  onInputChange,
  onDescriptionChange,
}) => {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-white/[0.05] dark:bg-white/[0.03]">
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Page *
            </label>
            <InputField
              name="page"
              type="text"
              placeholder="Enter page path or name"
              defaultValue={formData.page}
              onChange={onInputChange}
              error={!!errors.page}
            />
            {errors.page && <p className="mt-1 text-sm text-red-500">{errors.page}</p>}
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Meta Title *
            </label>
            <InputField
              name="meta_title"
              type="text"
              placeholder="Enter SEO meta title"
              defaultValue={formData.meta_title}
              onChange={onInputChange}
              error={!!errors.meta_title}
            />
            {errors.meta_title && (
              <p className="mt-1 text-sm text-red-500">{errors.meta_title}</p>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Meta Keywords *
            </label>
            <InputField
              name="meta_keywords"
              type="text"
              placeholder="keyword1, keyword2, keyword3"
              defaultValue={formData.meta_keywords}
              onChange={onInputChange}
              error={!!errors.meta_keywords}
            />
            {errors.meta_keywords && (
              <p className="mt-1 text-sm text-red-500">{errors.meta_keywords}</p>
            )}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Meta Description *
          </label>
          <TextArea
            placeholder="Enter SEO meta description"
            rows={6}
            value={formData.meta_description}
            onChange={onDescriptionChange}
            error={!!errors.meta_description}
          />
          {errors.meta_description && (
            <p className="mt-1 text-sm text-red-500">{errors.meta_description}</p>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-200 pt-6 dark:border-gray-700">
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-blue-600 px-6 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Saving..." : submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SeoSettingsForm;
