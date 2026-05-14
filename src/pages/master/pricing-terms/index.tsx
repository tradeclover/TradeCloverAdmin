import { useState, useEffect } from "react";
import AdminLayout from "@/layout/AdminLayout";
import {
  Table, TableBody, TableCell, TableHeader, TableRow,
} from "@/components/ui/table";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import InputField from "@/components/form/input/InputField";
import { PencilIcon, TrashBinIcon, PlusIcon } from "@/icons";
import Toast from "@/components/ui/toast/Toast";
import { apiGet, apiPost, apiPut, apiDelete } from "@/utils/api";

interface PricingTerm {
  id: number;
  name: string;
  label: string;
  is_active: boolean;
}

const emptyForm = { name: "", label: "", is_active: true };

export default function PricingTermsPage() {
  const [items, setItems] = useState<PricingTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editing, setEditing] = useState<PricingTerm | null>(null);
  const [toDelete, setToDelete] = useState<PricingTerm | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info"; isVisible: boolean }>({
    message: "", type: "success", isVisible: false,
  });

  const showToast = (message: string, type: "success" | "error" | "info") => {
    setToast({ message, type, isVisible: true });
    setTimeout(() => setToast((p) => ({ ...p, isVisible: false })), 3000);
  };

  const fetchItems = async () => {
    try {
      const res = await apiGet("/products/pricing-terms/");
      const data = Array.isArray(res.data) ? res.data : res.data?.results ?? [];
      setItems(data);
    } catch {
      showToast("Failed to fetch pricing terms", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (item: PricingTerm) => { setEditing(item); setForm({ name: item.name ?? item.label, label: item.label ?? item.name, is_active: item.is_active }); setModalOpen(true); };
  const openDelete = (item: PricingTerm) => { setToDelete(item); setDeleteModalOpen(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        await apiPut(`/products/admin/pricing-terms/${editing.id}/`, form);
        showToast("Pricing term updated successfully", "success");
      } else {
        await apiPost("/products/admin/pricing-terms/create/", form);
        showToast("Pricing term created successfully", "success");
      }
      setModalOpen(false);
      fetchItems();
    } catch {
      showToast(`Failed to ${editing ? "update" : "create"} pricing term`, "error");
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      await apiDelete(`/products/admin/pricing-terms/${toDelete.id}/`);
      showToast("Pricing term deleted successfully", "success");
      setDeleteModalOpen(false);
      setToDelete(null);
      fetchItems();
    } catch {
      showToast("Failed to delete pricing term", "error");
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex h-64 items-center justify-center">Loading...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-title-md font-bold text-gray-800 dark:text-white/90">Pricing Terms</h1>
        <Button onClick={openCreate} startIcon={<PlusIcon />}>Add Pricing Term</Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">#</TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Name</TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Status</TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Actions</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {items.length === 0 ? (
                <TableRow>
                  <td colSpan={4} className="px-5 py-8 text-center text-sm text-gray-400">No pricing terms found</td>
                </TableRow>
              ) : items.map((item, i) => (
                <TableRow key={item.id}>
                  <TableCell className="px-5 py-4 text-theme-sm text-gray-500 dark:text-gray-400">{i + 1}</TableCell>
                  <TableCell className="px-5 py-4 text-theme-sm font-medium text-gray-800 dark:text-white/90">{item.name ?? item.label}</TableCell>
                  <TableCell className="px-5 py-4">
                    <Badge size="sm" color={item.is_active ? "success" : "error"}>{item.is_active ? "Active" : "Inactive"}</Badge>
                  </TableCell>
                  <TableCell className="px-5 py-4">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(item)} className="rounded-md p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20">
                        <PencilIcon />
                      </button>
                      <button onClick={() => openDelete(item)} className="rounded-md p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20">
                        <TrashBinIcon />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} className="max-w-md">
        <div className="p-5">
          <h2 className="mb-4 text-lg font-bold text-gray-800 dark:text-white/90">
            {editing ? "Edit Pricing Term" : "Add Pricing Term"}
          </h2>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
              <InputField
                name="name"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value, label: e.target.value }))}
                placeholder="Enter pricing term name"
              />
            </div>
            <div className="mb-5">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300 accent-blue-600"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active</span>
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
              <button type="submit" className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700">{editing ? "Update" : "Create"}</button>
            </div>
          </form>
        </div>
      </Modal>

      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} className="max-w-sm">
        <div className="p-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
            <TrashBinIcon />
          </div>
          <h2 className="mb-2 text-lg font-bold text-gray-800 dark:text-white/90">Confirm Delete</h2>
          <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
            Are you sure you want to delete <b>{toDelete?.label}</b>? This action cannot be undone.
          </p>
          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>Cancel</Button>
            <button onClick={handleDelete} className="rounded-md bg-red-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700">
              Delete
            </button>
          </div>
        </div>
      </Modal>

      <Toast message={toast.message} type={toast.type} isVisible={toast.isVisible} onClose={() => setToast((p) => ({ ...p, isVisible: false }))} />
    </AdminLayout>
  );
}
