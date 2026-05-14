import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import AdminLayout from "@/layout/AdminLayout";
import Button from "@/components/ui/button/Button";
import Toast from "@/components/ui/toast/Toast";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/utils/api";

interface TicketMessage {
  id?: number;
  sender_id?: number;
  sender_name?: string | null;
  sender_type?: string | null;
  message?: string | null;
  content?: string | null;
  body?: string | null;
  attachment?: string | null;
  created_at?: string | null;
  user?: {
    first_name?: string | null;
    last_name?: string | null;
    business_profile?: {
      first_name?: string | null;
      last_name?: string | null;
    } | null;
  } | null;
  sender?: {
    first_name?: string | null;
    last_name?: string | null;
    business_profile?: {
      first_name?: string | null;
      last_name?: string | null;
    } | null;
  } | null;
  [key: string]: unknown;
}

interface SupportTicketDetail {
  id?: number;
  user_id?: number;
  user_name?: string | null;
  subject?: string | null;
  title?: string | null;
  description?: string | null;
  message?: string | null;
  content?: string | null;
  category?: string | null;
  status?: string | null;
  priority?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  user?: {
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    business_profile?: {
      first_name?: string | null;
      last_name?: string | null;
    } | null;
  } | null;
  user_detail?: {
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    business_profile?: {
      first_name?: string | null;
      last_name?: string | null;
    } | null;
  } | null;
  messages?: TicketMessage[] | null;
  replies?: TicketMessage[] | null;
  thread?: TicketMessage[] | null;
  [key: string]: unknown;
}

interface QuickReplyTemplate {
  id: number;
  title: string;
  message: string;
}

const getText = (value: unknown, fallback = "N/A") => {
  if (typeof value === "string" && value.trim()) {
    return value;
  }

  return fallback;
};

const getNameFromRecord = (record?: Record<string, unknown> | null) => {
  if (!record) {
    return "";
  }

  const businessProfile =
    record.business_profile && typeof record.business_profile === "object"
      ? (record.business_profile as Record<string, unknown>)
      : undefined;

  const directName = `${
    typeof record.first_name === "string" ? record.first_name : ""
  } ${typeof record.last_name === "string" ? record.last_name : ""}`.trim();

  if (directName) {
    return directName;
  }

  return `${
    typeof businessProfile?.first_name === "string" ? businessProfile.first_name : ""
  } ${typeof businessProfile?.last_name === "string" ? businessProfile.last_name : ""}`.trim();
};

const getCustomerName = (ticket: SupportTicketDetail) => {
  if (typeof ticket.user_name === "string" && ticket.user_name.trim()) {
    return ticket.user_name;
  }

  const possibleUsers = [ticket.user, ticket.user_detail];

  for (const possibleUser of possibleUsers) {
    const name = getNameFromRecord(possibleUser as Record<string, unknown> | null);
    if (name) {
      return name;
    }
  }

  return "N/A";
};

const getCustomerEmail = (ticket: SupportTicketDetail) => {
  const possibleUsers = [ticket.user, ticket.user_detail];

  for (const possibleUser of possibleUsers) {
    if (possibleUser?.email && typeof possibleUser.email === "string") {
      return possibleUser.email;
    }
  }

  return "";
};

const getMessages = (ticket: SupportTicketDetail) => {
  const thread = ticket.messages ?? ticket.replies ?? ticket.thread ?? [];
  return Array.isArray(thread) ? thread : [];
};

const getMessageBody = (message: TicketMessage) =>
  getText(message.message ?? message.content ?? message.body, "");

const getMessageSenderName = (message: TicketMessage) => {
  if (typeof message.sender_name === "string" && message.sender_name.trim()) {
    return message.sender_name;
  }

  const possibleSenders = [message.user, message.sender];

  for (const possibleSender of possibleSenders) {
    const senderName = getNameFromRecord(possibleSender as Record<string, unknown> | null);
    if (senderName) {
      return senderName;
    }
  }

  const senderType = getText(message.sender_type, "").toLowerCase();
  if (senderType === "admin") {
    return "Admin";
  }

  if (senderType === "user") {
    return "Customer";
  }

  return "Support";
};

const formatDate = (value: unknown) => {
  if (!value || typeof value !== "string") {
    return "N/A";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const badgeClass = (value: string, type: "status" | "priority") => {
  const normalizedValue = value.toLowerCase();

  if (type === "status") {
    if (normalizedValue === "open") {
      return "bg-blue-100 text-blue-800";
    }

    if (normalizedValue === "in_progress") {
      return "bg-amber-100 text-amber-800";
    }

    if (normalizedValue === "resolved") {
      return "bg-green-100 text-green-800";
    }

    if (normalizedValue === "closed") {
      return "bg-gray-200 text-gray-800";
    }
  }

  if (normalizedValue === "high") {
    return "bg-red-100 text-red-800";
  }

  if (normalizedValue === "medium") {
    return "bg-amber-100 text-amber-800";
  }

  if (normalizedValue === "low") {
    return "bg-green-100 text-green-800";
  }

  return "bg-gray-100 text-gray-800";
};

const SupportTicketDetailPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const [ticket, setTicket] = useState<SupportTicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyMessage, setReplyMessage] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [selectedStatus, setSelectedStatus] = useState("open");
  const [selectedPriority, setSelectedPriority] = useState("medium");
  const [replyLoading, setReplyLoading] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);

  // Quick reply templates
  const [templates, setTemplates] = useState<QuickReplyTemplate[]>([]);
  const [showManageTemplates, setShowManageTemplates] = useState(false);
  const [templateForm, setTemplateForm] = useState<{ id: number | null; title: string; message: string }>({ id: null, title: "", message: "" });
  const [templateSaving, setTemplateSaving] = useState(false);
  const [templateDeleting, setTemplateDeleting] = useState<number | null>(null);
  const templateOriginalRef = useRef<string>("");
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

  const fetchTicket = useCallback(
    async (ticketId: string) => {
      try {
        setLoading(true);
        const response = await apiGet(`/cms/admin/support-tickets/${ticketId}/`);
        setTicket(response.data);
        setSelectedStatus(getText(response.data?.status, "open"));
        setSelectedPriority(getText(response.data?.priority, "medium"));
      } catch (error) {
        console.error("Fetch support ticket detail error:", error);
        showToast("Failed to fetch support ticket", "error");
        router.push("/support-tickets");
      } finally {
        setLoading(false);
      }
    },
    [router]
  );

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await apiGet("/cms/admin/quick-replies/");
      const data = res.data;
      setTemplates(Array.isArray(data) ? data : (data?.results ?? []));
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    if (typeof id === "string") {
      fetchTicket(id);
    }
    fetchTemplates();
  }, [fetchTicket, fetchTemplates, id]);

  const messages = useMemo(() => getMessages(ticket ?? {}), [ticket]);

  const handleReply = async () => {
    if (!id || typeof id !== "string" || !replyMessage.trim()) {
      showToast("Reply message is required", "info");
      return;
    }
    try {
      setReplyLoading(true);
      const useTemplate = selectedTemplateId !== null && replyMessage.trim() === templateOriginalRef.current;
      const body = useTemplate
        ? { template_id: selectedTemplateId }
        : { message: replyMessage.trim() };
      await apiPost(`/cms/admin/support-tickets/${id}/reply/`, body);
      setReplyMessage("");
      setSelectedTemplateId(null);
      templateOriginalRef.current = "";
      showToast("Reply sent successfully", "success");
      fetchTicket(id);
    } catch (error) {
      console.error("Reply support ticket error:", error);
      showToast("Failed to send reply", "error");
    } finally {
      setReplyLoading(false);
    }
  };

  const handlePickTemplate = (t: QuickReplyTemplate) => {
    setReplyMessage(t.message);
    setSelectedTemplateId(t.id);
    templateOriginalRef.current = t.message;
  };

  const handleSaveTemplate = async () => {
    if (!templateForm.title.trim() || !templateForm.message.trim()) return;
    try {
      setTemplateSaving(true);
      if (templateForm.id) {
        await apiPatch(`/cms/admin/quick-replies/${templateForm.id}/`, { title: templateForm.title.trim(), message: templateForm.message.trim() });
      } else {
        await apiPost("/cms/admin/quick-replies/", { title: templateForm.title.trim(), message: templateForm.message.trim() });
      }
      setTemplateForm({ id: null, title: "", message: "" });
      fetchTemplates();
    } catch {
      showToast("Failed to save template", "error");
    } finally {
      setTemplateSaving(false);
    }
  };

  const handleDeleteTemplate = async (templateId: number) => {
    try {
      setTemplateDeleting(templateId);
      await apiDelete(`/cms/admin/quick-replies/${templateId}/`);
      fetchTemplates();
    } catch {
      showToast("Failed to delete template", "error");
    } finally {
      setTemplateDeleting(null);
    }
  };

  const handleStatusUpdate = async () => {
    if (!id || typeof id !== "string") {
      return;
    }

    try {
      setUpdateLoading(true);
      await apiPatch(`/cms/admin/support-tickets/${id}/status/`, {
        status: selectedStatus,
        priority: selectedPriority,
      });
      showToast("Ticket updated successfully", "success");
      fetchTicket(id);
    } catch (error) {
      console.error("Update support ticket error:", error);
      showToast("Failed to update ticket", "error");
    } finally {
      setUpdateLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex h-64 items-center justify-center">
          <div>Loading support ticket...</div>
        </div>
      </AdminLayout>
    );
  }

  if (!ticket) {
    return null;
  }

  const status = getText(ticket.status, "open");
  const priority = getText(ticket.priority, "medium");

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-title-md font-bold text-gray-800 dark:text-white/90">
            {getText(ticket.subject ?? ticket.title, `Support Ticket #${ticket.id ?? id}`)}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Ticket #{ticket.id ?? id}
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push("/support-tickets")}>
          Back to Support Tickets
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-white/[0.05]">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">
                  Conversation
                </h2>
              </div>
              {/* <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-white/[0.06] dark:text-gray-400">
                {messages.length} {messages.length === 1 ? "message" : "messages"}
              </span> */}
            </div>

            {/* Scrollable message area */}
            <div className="min-h-[420px] max-h-[560px] overflow-y-auto px-6 py-5 space-y-5">
              {messages.length === 0 ? (
                (() => {
                  const fallbackMessage = getText(
                    ticket.description ?? ticket.message ?? ticket.content,
                    ""
                  );

                  if (!fallbackMessage) {
                    return (
                      <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-white/[0.05]">
                          <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                          </svg>
                        </div>
                        <p className="text-sm text-gray-400">No messages yet</p>
                      </div>
                    );
                  }

                  const initials = getCustomerName(ticket).charAt(0).toUpperCase();
                  return (
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-700 dark:bg-white/[0.1] dark:text-white/70">
                        {initials || "?"}
                      </div>
                      <div className="max-w-[75%]">
                        <div className="mb-1 flex items-baseline gap-2">
                          <span className="text-xs font-semibold text-gray-700 dark:text-white/80">{getCustomerName(ticket)}</span>
                          <span className="text-xs text-gray-400">{formatDate(ticket.created_at)}</span>
                        </div>
                        <div className="rounded-2xl rounded-tl-sm bg-gray-100 px-4 py-3 dark:bg-white/[0.05]">
                          <p className="whitespace-pre-wrap text-sm text-gray-800 dark:text-white/80">{fallbackMessage}</p>
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : (
                messages.map((message, index) => {
                  const senderType = getText(message.sender_type, "user").toLowerCase();
                  const isAdmin = senderType === "admin";
                  const senderName = getMessageSenderName(message);
                  const initials = senderName.charAt(0).toUpperCase();
                  const body = getMessageBody(message);

                  return (
                    <div
                      key={`${message.id ?? index}-${message.created_at ?? index}`}
                      className={`flex items-start gap-3 ${isAdmin ? "flex-row-reverse" : ""}`}
                    >
                      {/* Avatar */}
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                          isAdmin
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300"
                            : "bg-gray-200 text-gray-700 dark:bg-white/[0.1] dark:text-white/70"
                        }`}
                      >
                        {initials || "?"}
                      </div>

                      {/* Bubble */}
                      <div className={`max-w-[75%] ${isAdmin ? "items-end" : "items-start"} flex flex-col`}>
                        <div className={`mb-1 flex items-baseline gap-2 ${isAdmin ? "flex-row-reverse" : ""}`}>
                          <span className="text-xs font-semibold text-gray-700 dark:text-white/80">{senderName}</span>
                          <span className="text-xs text-gray-400">{formatDate(message.created_at)}</span>
                          {isAdmin && (
                            <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 dark:bg-blue-500/20 dark:text-blue-300">
                              Admin
                            </span>
                          )}
                        </div>

                        <div
                          className={`rounded-2xl px-4 py-3 ${
                            isAdmin
                              ? "rounded-tr-sm bg-blue-600 text-white"
                              : "rounded-tl-sm bg-gray-100 text-gray-800 dark:bg-white/[0.05] dark:text-white/80"
                          }`}
                        >
                          {body && (
                            <p className="whitespace-pre-wrap text-sm leading-relaxed">{body}</p>
                          )}

                          {message.attachment && (
                            <div className={body ? "mt-3" : ""}>
                              <a href={message.attachment} target="_blank" rel="noopener noreferrer" className="group block">
                                <img
                                  src={message.attachment}
                                  alt="attachment"
                                  className="max-h-52 max-w-[240px] rounded-xl object-cover shadow transition-opacity group-hover:opacity-85"
                                />
                                <span className={`mt-1.5 flex items-center gap-1 text-xs ${isAdmin ? "text-blue-200" : "text-blue-500 dark:text-blue-400"} group-hover:underline`}>
                                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                  </svg>
                                  Open full image
                                </span>
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-white/[0.05] dark:bg-white/[0.03]">
            <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">
              Reply to Ticket
            </h2>

            {/* Quick reply dropdown */}
            <div className="mb-3 flex items-center gap-2">
              <div className="relative flex-1">
                <select
                  value={selectedTemplateId ?? ""}
                  onChange={(e) => {
                    const picked = templates.find((t) => t.id === Number(e.target.value));
                    if (picked) handlePickTemplate(picked);
                    else {
                      setSelectedTemplateId(null);
                      templateOriginalRef.current = "";
                    }
                  }}
                  className="w-full appearance-none rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-8 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-white/[0.08] dark:bg-transparent dark:text-white/90"
                >
                  <option value="">Quick replies...</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
                <svg className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              <button
                type="button"
                title="Manage templates"
                onClick={() => setShowManageTemplates(true)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-400 transition-colors hover:border-gray-400 hover:text-gray-600 dark:border-white/[0.08] dark:bg-transparent"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>

            <textarea
              value={replyMessage}
              onChange={(event) => {
                setReplyMessage(event.target.value);
                if (selectedTemplateId !== null && event.target.value !== templateOriginalRef.current) {
                  setSelectedTemplateId(null);
                }
              }}
              rows={6}
              placeholder="Write your reply here..."
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-white/[0.08] dark:bg-transparent dark:text-white/90"
            />
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleReply}
                disabled={replyLoading}
                className="rounded-md bg-blue-600 px-5 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {replyLoading ? "Sending..." : "Send Reply"}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-white/[0.05] dark:bg-white/[0.03]">
            <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">
              Ticket Details
            </h2>
            <div className="space-y-4">
              <div>
                <p className="mb-1 text-sm font-medium text-gray-500 dark:text-gray-400">
                  Customer
                </p>
                <p className="text-sm text-gray-800 dark:text-white/90">
                  {getCustomerName(ticket)}
                </p>
                {getCustomerEmail(ticket) && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {getCustomerEmail(ticket)}
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <div>
                  <p className="mb-1 text-sm font-medium text-gray-500 dark:text-gray-400">
                    Status
                  </p>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${badgeClass(
                      status,
                      "status"
                    )}`}
                  >
                    {status.replace(/_/g, " ")}
                  </span>
                </div>

                <div>
                  <p className="mb-1 text-sm font-medium text-gray-500 dark:text-gray-400">
                    Priority
                  </p>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${badgeClass(
                      priority,
                      "priority"
                    )}`}
                  >
                    {priority}
                  </span>
                </div>
              </div>

              <div>
                <p className="mb-1 text-sm font-medium text-gray-500 dark:text-gray-400">
                  Created
                </p>
                <p className="text-sm text-gray-800 dark:text-white/90">
                  {formatDate(ticket.created_at)}
                </p>
              </div>

              <div>
                <p className="mb-1 text-sm font-medium text-gray-500 dark:text-gray-400">
                  Last Updated
                </p>
                <p className="text-sm text-gray-800 dark:text-white/90">
                  {formatDate(ticket.updated_at)}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-white/[0.05] dark:bg-white/[0.03]">
            <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">
              Update Status
            </h2>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Status
                </label>
                <select
                  value={selectedStatus}
                  onChange={(event) => setSelectedStatus(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-white/[0.08] dark:bg-transparent dark:text-white/90"
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Priority
                </label>
                <select
                  value={selectedPriority}
                  onChange={(event) => setSelectedPriority(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-white/[0.08] dark:bg-transparent dark:text-white/90"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <button
                onClick={handleStatusUpdate}
                disabled={updateLoading}
                className="w-full rounded-md bg-emerald-600 px-5 py-2 font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {updateLoading ? "Updating..." : "Update Ticket"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={closeToast}
      />

      {/* Manage Quick Reply Templates Modal */}
      {showManageTemplates && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0"
            onClick={() => {
              setShowManageTemplates(false);
              setTemplateForm({ id: null, title: "", message: "" });
            }}
          />
          <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-white/[0.05]">
              <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
                Manage Quick Reply Templates
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowManageTemplates(false);
                  setTemplateForm({ id: null, title: "", message: "" });
                }}
                className="flex h-7 w-7 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/[0.06]"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
              {/* Create / Edit form */}
              <div className="mb-5 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-white/[0.06] dark:bg-white/[0.02]">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {templateForm.id ? "Edit Template" : "New Template"}
                </p>
                <input
                  type="text"
                  value={templateForm.title}
                  onChange={(e) => setTemplateForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Template title (e.g. Greeting)"
                  className="mb-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-white/[0.08] dark:bg-transparent dark:text-white/90"
                />
                <textarea
                  value={templateForm.message}
                  onChange={(e) => setTemplateForm((prev) => ({ ...prev, message: e.target.value }))}
                  rows={3}
                  placeholder="Template message content..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-white/[0.08] dark:bg-transparent dark:text-white/90"
                />
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={handleSaveTemplate}
                    disabled={templateSaving || !templateForm.title.trim() || !templateForm.message.trim()}
                    className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {templateSaving ? "Saving..." : templateForm.id ? "Save Changes" : "Add Template"}
                  </button>
                  {templateForm.id && (
                    <button
                      type="button"
                      onClick={() => setTemplateForm({ id: null, title: "", message: "" })}
                      className="rounded-md border border-gray-200 px-4 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-white/[0.08] dark:text-gray-300"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>

              {/* Existing templates list */}
              {templates.length === 0 ? (
                <p className="py-4 text-center text-sm text-gray-400">No templates yet. Add one above.</p>
              ) : (
                <div className="space-y-2">
                  {templates.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-start gap-3 rounded-xl border border-gray-100 bg-white p-3 dark:border-white/[0.05] dark:bg-white/[0.03]"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-800 dark:text-white/90">{t.title}</p>
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{t.message}</p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          onClick={() => setTemplateForm({ id: t.id, title: t.title, message: t.message })}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-500/10"
                          title="Edit"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTemplate(t.id)}
                          disabled={templateDeleting === t.id}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-500/10"
                          title="Delete"
                        >
                          {templateDeleting === t.id ? (
                            <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                            </svg>
                          ) : (
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default SupportTicketDetailPage;
