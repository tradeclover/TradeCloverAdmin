import { useCallback, useEffect, useRef, useState } from "react";
import AdminLayout from "@/layout/AdminLayout";
import Toast from "@/components/ui/toast/Toast";
import { apiGet, apiPost } from "@/utils/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatParticipant {
  id?: number;
  name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  [key: string]: unknown;
}

interface ChatSummary {
  id: number;
  buyer?: ChatParticipant | string;
  buyer_name?: string;
  seller?: ChatParticipant | string;
  seller_name?: string;
  product_name?: string;
  product?: string;
  linked_order_id?: string | number | null;
  order_id?: string | number | null;
  linked_dispute_id?: string | number | null;
  dispute_id?: string | number | null;
  last_message?: string;
  last_message_preview?: string;
  last_activity?: string;
  activity_time?: string;
  total_messages?: number;
  message_count?: number;
  is_flagged?: boolean;
  flagged?: boolean;
  has_dispute?: boolean;
  has_order?: boolean;
  [key: string]: unknown;
}

interface ChatMessage {
  id: number;
  sender_id?: number;
  sender_role?: string;
  sender_name?: string;
  sender?: string | Record<string, unknown>;
  content?: string;
  text?: string;
  message?: string;
  message_type?: string;
  timestamp?: string;
  created_at?: string;
  payload?: Record<string, unknown> | null;
  parsed_offer_payload?: Record<string, unknown>;
  offer_payload?: Record<string, unknown>;
  read_by_buyer?: boolean;
  read_by_seller?: boolean;
  is_suspicious?: boolean;
  is_flagged?: boolean;
  flag_reason?: string;
  auto_flag?: string;
  [key: string]: unknown;
}

interface ProductContext {
  id: number;
  product_name: string;
  product_code: string;
  unit_price: number;
  currency: string;
  minimum_order_quantity: number;
}

interface OrderContext {
  id: number;
  status: string;
  quantity: number;
  price: string;
  total_amount: string;
  currency: string;
  payment_status: string;
  delivery_date: string | null;
  created_at: string;
}

interface ChatDetail {
  id: number;
  buyer?: ChatParticipant | Record<string, unknown>;
  seller?: ChatParticipant | Record<string, unknown>;
  buyer_name?: string;
  seller_name?: string;
  product_name?: string;
  product_context?: ProductContext;
  order_context?: OrderContext;
  quote_id?: number | null;
  quote_status?: string | null;
  order_id?: string | number | null;
  dispute_id?: string | number | null;
  started_at?: string;
  created_at?: string;
  is_flagged?: boolean;
  flagged?: boolean;
  messages?: ChatMessage[];
  notes_count?: number;
  [key: string]: unknown;
}

interface AdminNote {
  id: number;
  note: string;
  admin_name?: string;
  admin?: string | Record<string, unknown>;
  created_at?: string;
  timestamp?: string;
  [key: string]: unknown;
}

type FilterType = "all" | "flagged" | "dispute" | "order";

// ─── Standalone helpers ───────────────────────────────────────────────────────

const participantName = (
  p: ChatParticipant | Record<string, unknown> | string | undefined,
  fallback = "Unknown"
): string => {
  if (!p) return fallback;
  if (typeof p === "string") return p.trim() || fallback;
  const r = p as Record<string, unknown>;
  if (typeof r.name === "string" && r.name.trim()) return r.name;
  const first = typeof r.first_name === "string" ? r.first_name.trim() : "";
  const last = typeof r.last_name === "string" ? r.last_name.trim() : "";
  const full = `${first} ${last}`.trim();
  return full || (typeof r.email === "string" ? r.email : fallback);
};

const chatBuyer = (chat: ChatSummary | ChatDetail): string =>
  chat.buyer_name
    ? String(chat.buyer_name)
    : participantName(
        chat.buyer as ChatParticipant | Record<string, unknown> | string,
        "Buyer"
      );

const chatSeller = (chat: ChatSummary | ChatDetail): string =>
  chat.seller_name
    ? String(chat.seller_name)
    : participantName(
        chat.seller as ChatParticipant | Record<string, unknown> | string,
        "Seller"
      );

const chatIsFlagged = (chat: ChatSummary | ChatDetail): boolean =>
  !!(chat.is_flagged ?? chat.flagged);

const timeAgo = (dateStr?: string): string => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const formatTs = (dateStr?: string): string => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const msgText = (msg: ChatMessage) =>
  (msg.content ?? msg.text ?? msg.message ?? "") as string;

const msgTs = (msg: ChatMessage) => msg.timestamp ?? msg.created_at ?? "";

const msgSenderRole = (msg: ChatMessage): string => {
  if (msg.sender_role) return msg.sender_role;
  if (msg.sender && typeof msg.sender === "object") {
    const s = msg.sender as Record<string, unknown>;
    if (typeof s.role === "string") return s.role;
  }
  return "seller";
};

const msgSenderName = (msg: ChatMessage): string => {
  if (msg.sender_name) return msg.sender_name;
  if (msg.sender && typeof msg.sender === "object") {
    return participantName(msg.sender as Record<string, unknown>);
  }
  if (typeof msg.sender === "string") return msg.sender;
  return "";
};

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-purple-100 text-purple-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-cyan-100 text-cyan-700",
];

const avatarColor = (seed: string): string => {
  const sum = seed.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
};

const twoInitials = (a: string, b: string): string => {
  const ai = a.trim()[0]?.toUpperCase() ?? "?";
  const bi = b.trim()[0]?.toUpperCase() ?? "?";
  return `${ai}${bi}`;
};

const noteAdminName = (note: AdminNote): string => {
  if (note.admin_name) return note.admin_name;
  if (!note.admin) return "Admin";
  if (typeof note.admin === "string") return note.admin;
  const a = note.admin as Record<string, unknown>;
  return typeof a.name === "string" ? a.name : "Admin";
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const CombinedAvatar = ({
  seller,
  buyer,
}: {
  seller: string;
  buyer: string;
}) => (
  <div
    className={`h-10 w-10 shrink-0 rounded-full flex items-center justify-center text-sm font-bold ${avatarColor(seller + buyer)}`}
  >
    {twoInitials(seller, buyer)}
  </div>
);

// ── Conversation card ────────────────────────────────────────────────────────

const ConversationCard = ({
  chat,
  isSelected,
  onSelect,
}: {
  chat: ChatSummary;
  isSelected: boolean;
  onSelect: (id: number) => void;
}) => {
  const buyer = chatBuyer(chat);
  const seller = chatSeller(chat);
  const flagged = chatIsFlagged(chat);
  const hasOrder = !!(chat.linked_order_id ?? chat.order_id ?? chat.has_order);
  const hasDispute = !!(chat.linked_dispute_id ?? chat.dispute_id ?? chat.has_dispute);
  const activity = chat.activity_time ?? chat.last_activity;
  const preview = chat.last_message_preview ?? chat.last_message ?? "";

  return (
    <button
      onClick={() => onSelect(chat.id)}
      className={`w-full text-left rounded-xl border transition-colors ${
        isSelected
          ? "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700"
          : "bg-white border-gray-100 hover:bg-gray-50 dark:bg-white/[0.03] dark:border-white/[0.05] dark:hover:bg-white/[0.05]"
      } p-3.5`}
    >
      <div className="flex items-start gap-3">
        <CombinedAvatar seller={seller} buyer={buyer} />
        <div className="min-w-0 flex-1">
          {/* Names + flagged badge */}
          <div className="mb-0.5 flex flex-wrap items-center gap-1.5">
            <span className="truncate text-sm font-semibold text-gray-800 dark:text-white">
              {seller} → {buyer}
            </span>
            {flagged && (
              <span className="shrink-0 rounded-full border border-red-400 px-1.5 py-0.5 text-xs font-medium text-red-500">
                Flagged
              </span>
            )}
          </div>

          {/* Product */}
          <p className="truncate text-xs text-gray-500 dark:text-gray-400">
            {chat.product_name ?? chat.product ?? "—"}
          </p>

          {/* Preview */}
          {preview && (
            <p className="mt-0.5 truncate text-xs text-gray-400">{preview}</p>
          )}

          {/* Badges + time */}
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              {hasDispute && (
                <span className="rounded-full bg-orange-100 px-1.5 py-0.5 text-xs font-medium text-orange-600">
                  Dispute
                </span>
              )}
              {hasOrder && (
                <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-600">
                  Order
                </span>
              )}
            </div>
            <span className="shrink-0 text-xs text-gray-400">{timeAgo(activity)}</span>
          </div>
        </div>
      </div>
    </button>
  );
};

// ── Offer payload card ────────────────────────────────────────────────────────

const OfferCard = ({ payload }: { payload: Record<string, unknown> }) => {
  const status = payload.offer_status as string | undefined;
  const isCounter = !!payload.counter_of;
  const statusColors: Record<string, string> = {
    accepted: "bg-green-100 text-green-700 border-green-200",
    rejected: "bg-red-100 text-red-700 border-red-200",
    pending: "bg-amber-100 text-amber-700 border-amber-200",
    countered: "bg-purple-100 text-purple-700 border-purple-200",
  };
  const statusCls = statusColors[status ?? ""] ?? "bg-gray-100 text-gray-600 border-gray-200";

  const fmtINR = (val: unknown, curr = "INR") => {
    const n = Number(val);
    if (isNaN(n)) return String(val);
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: String(curr), maximumFractionDigits: 0 }).format(n);
  };

  const fmtD = (val: unknown) => {
    if (!val) return null;
    const d = new Date(String(val));
    if (isNaN(d.getTime())) return String(val);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/30 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-blue-100 dark:border-blue-800">
        <p className="text-xs font-semibold text-blue-700 dark:text-blue-400">
          {isCounter ? "↩ Counter Offer" : "Offer"}
        </p>
        {status && (
          <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold capitalize ${statusCls}`}>
            {status}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="px-3 py-2 space-y-1.5 text-xs text-blue-800 dark:text-blue-300">
        {!!payload.product_name && (
          <div className="flex gap-2">
            <span className="text-blue-400 w-16 shrink-0">Product</span>
            <span className="font-medium">{String(payload.product_name)}</span>
          </div>
        )}
        {payload.quantity !== undefined && (
          <div className="flex gap-2">
            <span className="text-blue-400 w-16 shrink-0">Quantity</span>
            <span>{String(payload.quantity)} units</span>
          </div>
        )}
        {!!payload.price && (
          <div className="flex gap-2">
            <span className="text-blue-400 w-16 shrink-0">Price / unit</span>
            <span className="font-semibold">{fmtINR(payload.price, String(payload.currency ?? "INR"))}</span>
          </div>
        )}
        {!!payload.price && payload.quantity !== undefined && (
          <div className="flex gap-2">
            <span className="text-blue-400 w-16 shrink-0">Total</span>
            <span className="font-semibold text-blue-900 dark:text-blue-200">
              {fmtINR(Number(payload.price) * Number(payload.quantity), String(payload.currency ?? "INR"))}
            </span>
          </div>
        )}
        {!!payload.delivery_date && (
          <div className="flex gap-2">
            <span className="text-blue-400 w-16 shrink-0">Delivery</span>
            <span>{fmtD(payload.delivery_date)}</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Message bubble ────────────────────────────────────────────────────────────

const MessageBubble = ({
  msg,
  buyerName,
  sellerName,
}: {
  msg: ChatMessage;
  buyerName: string;
  sellerName: string;
}) => {
  const type = msg.message_type ?? "text";
  const role = msgSenderRole(msg);
  const senderName = msgSenderName(msg) || (role === "buyer" ? buyerName : sellerName);
  const text = msgText(msg);
  const ts = msgTs(msg);
  const offerPayload = msg.parsed_offer_payload ?? msg.offer_payload ?? (msg.payload ?? undefined);
  const isBuyer = role === "buyer";
  const isSystem = type === "system" || role === "system";
  const isSuspicious = !!(msg.is_suspicious ?? msg.is_flagged);
  const flagReason = msg.flag_reason ?? msg.auto_flag;

  if (isSystem) {
    return (
      <div className="my-3 flex justify-center">
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-500 dark:bg-white/[0.05] dark:text-gray-400">
          {text}
        </span>
      </div>
    );
  }

  return (
    <div className={`my-3 flex flex-col ${isBuyer ? "items-end" : "items-start"}`}>
      {/* Sender label */}
      <div
        className={`mb-1 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 ${
          isBuyer ? "flex-row-reverse" : ""
        }`}
      >
        <span className="font-medium text-gray-700 dark:text-gray-300">
          {senderName} ({isBuyer ? "Buyer" : "Seller"})
        </span>
        <span>—</span>
        <span>{formatTs(ts)}</span>
      </div>

      {/* Bubble */}
      <div
        className={`max-w-[82%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
          isBuyer
            ? "bg-green-50 border border-green-100 text-gray-800 dark:bg-green-900/20 dark:border-green-800 dark:text-gray-200"
            : "bg-blue-50 border border-blue-100 text-gray-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-gray-200"
        }`}
      >
        {text}
        {offerPayload && <OfferCard payload={offerPayload} />}
      </div>

      {/* Auto-flag warning */}
      {isSuspicious && (
        <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-700 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
          <span>⚠</span>
          <span>
            {flagReason
              ? `Auto-flag: ${flagReason} — verify this was disclosed in the order`
              : "Auto-flag: suspicious content detected"}
          </span>
        </div>
      )}
    </div>
  );
};

// ── Admin note card ───────────────────────────────────────────────────────────

const NoteCard = ({ note }: { note: AdminNote }) => (
  <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-white/[0.05] dark:bg-white/[0.03]">
    <p className="mb-1.5 text-sm text-gray-700 dark:text-gray-300">{note.note}</p>
    <div className="flex items-center gap-2 text-xs text-gray-400">
      <span className="font-medium text-gray-500">{noteAdminName(note)}</span>
      <span>·</span>
      <span>{formatTs(note.created_at ?? note.timestamp)}</span>
    </div>
  </div>
);

// ── Skeleton loader ───────────────────────────────────────────────────────────

const CardSkeleton = () => (
  <div className="animate-pulse rounded-xl border border-gray-100 bg-white p-3.5 dark:border-white/[0.05] dark:bg-white/[0.03]">
    <div className="flex gap-3">
      <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-white/[0.08]" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-3/4 rounded bg-gray-200 dark:bg-white/[0.08]" />
        <div className="h-3 w-1/2 rounded bg-gray-100 dark:bg-white/[0.05]" />
        <div className="h-3 w-1/4 rounded bg-gray-100 dark:bg-white/[0.05]" />
      </div>
    </div>
  </div>
);

// ─── Main page ────────────────────────────────────────────────────────────────

const AdminChatsPage = () => {
  // Conversation list state
  const [conversations, setConversations] = useState<ChatSummary[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [flaggedCount, setFlaggedCount] = useState(0);
  const PAGE_SIZE = 20;

  // Chat detail state
  const [selectedChatId, setSelectedChatId] = useState<number | null>(null);
  const [chatDetail, setChatDetail] = useState<ChatDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [isFlaggingChat, setIsFlaggingChat] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Notes state
  const [notes, setNotes] = useState<AdminNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);

  // Mobile: toggle between list and detail view
  const [mobileShowDetail, setMobileShowDetail] = useState(false);

  // Download state
  const [downloading, setDownloading] = useState(false);

  // Toast
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
    isVisible: boolean;
  }>({ message: "", type: "success", isVisible: false });

  const showToast = (message: string, type: "success" | "error" | "info") =>
    setToast({ message, type, isVisible: true });
  const closeToast = () => setToast((p) => ({ ...p, isVisible: false }));

  // ── Fetchers ─────────────────────────────────────────────────────────────────

  const fetchConversations = useCallback(async () => {
    try {
      setListLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.set("q", searchQuery);
      if (activeFilter === "flagged") params.set("flagged", "true");
      if (activeFilter === "dispute") params.set("has_dispute", "true");
      if (activeFilter === "order") params.set("has_order", "true");
      params.set("page", String(page));
      params.set("page_size", String(PAGE_SIZE));
      const q = params.toString();
      const res = await apiGet(`/chats/admin/${q ? `?${q}` : ""}`);
      const data = res.data;
      const list: ChatSummary[] = Array.isArray(data) ? data : (data?.results ?? []);
      setConversations(list);
      if (data?.count !== undefined) setTotalCount(data.count);
      if (data?.flagged_count !== undefined) setFlaggedCount(data.flagged_count);
    } catch (e) {
      console.error("Fetch conversations error:", e);
    } finally {
      setListLoading(false);
    }
  }, [searchQuery, activeFilter, page]);

  const fetchFlaggedCount = useCallback(async () => {
    try {
      const res = await apiGet("/chats/admin/?flagged=true&page_size=1");
      const data = res.data;
      if (data?.count !== undefined) setFlaggedCount(Number(data.count));
    } catch (e) {
      console.error("Flagged count error:", e);
    }
  }, []);

  const fetchChatDetail = useCallback(async (chatId: number) => {
    try {
      setDetailLoading(true);
      const res = await apiGet(`/chats/admin/${chatId}/`);
      const data = res.data;
      setChatDetail(data?.chat ?? data?.conversation ?? data);
    } catch (e) {
      console.error("Fetch chat detail error:", e);
      showToast("Failed to load conversation", "error");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const fetchNotes = useCallback(async (chatId: number) => {
    try {
      setNotesLoading(true);
      const res = await apiGet(`/chats/admin/${chatId}/notes/`);
      const data = res.data;
      setNotes(Array.isArray(data) ? data : (data?.results ?? []));
    } catch (e) {
      console.error("Fetch notes error:", e);
    } finally {
      setNotesLoading(false);
    }
  }, []);

  // ── Effects ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    fetchFlaggedCount();
  }, [fetchFlaggedCount]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, activeFilter]);

  useEffect(() => {
    if (selectedChatId === null) return;
    setChatDetail(null);
    setNotes([]);
    fetchChatDetail(selectedChatId);
    fetchNotes(selectedChatId);
  }, [selectedChatId, fetchChatDetail, fetchNotes]);

  // Scroll timeline to bottom when messages arrive
  useEffect(() => {
    if (timelineRef.current && chatDetail?.messages?.length) {
      timelineRef.current.scrollTop = timelineRef.current.scrollHeight;
    }
  }, [chatDetail?.messages]);

  // ── Handlers ──────────────────────────────────────────────────────────────────

  const handleSearchChange = (val: string) => {
    setSearchInput(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setSearchQuery(val), 400);
  };

  const handleFlagToggle = async () => {
    if (!chatDetail) return;
    try {
      setIsFlaggingChat(true);
      const currentlyFlagged = chatIsFlagged(chatDetail);
      const ep = currentlyFlagged
        ? `/chats/admin/${chatDetail.id}/unflag/`
        : `/chats/admin/${chatDetail.id}/flag/`;
      await apiPost(ep, {});
      showToast(currentlyFlagged ? "Chat unflagged" : "Chat flagged", "success");
      fetchChatDetail(chatDetail.id);
      fetchConversations();
      fetchFlaggedCount();
    } catch (e) {
      console.error("Flag toggle error:", e);
      showToast("Failed to update flag status", "error");
    } finally {
      setIsFlaggingChat(false);
    }
  };

  const handleSaveNote = async () => {
    if (!selectedChatId || !newNote.trim()) return;
    try {
      setNoteSaving(true);
      await apiPost(`/chats/admin/${selectedChatId}/notes/`, { note: newNote.trim() });
      setNewNote("");
      showToast("Note saved", "success");
      fetchNotes(selectedChatId);
    } catch (e) {
      console.error("Save note error:", e);
      showToast("Failed to save note", "error");
    } finally {
      setNoteSaving(false);
    }
  };

  const handleDownload = async () => {
    if (!selectedChatId) return;
    try {
      setDownloading(true);
      const res = await apiGet(`/chats/admin/${selectedChatId}/download/`);
      const csv =
        typeof res.data === "string" ? res.data : JSON.stringify(res.data);
      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `chat-${selectedChatId}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Download error:", e);
      showToast("Failed to download chat", "error");
    } finally {
      setDownloading(false);
    }
  };

  // ── Derived ───────────────────────────────────────────────────────────────────

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const buyerName = chatDetail ? chatBuyer(chatDetail) : "";
  const sellerName = chatDetail ? chatSeller(chatDetail) : "";
  const chatFlagged = chatDetail ? chatIsFlagged(chatDetail) : false;

  const filters: { id: FilterType; label: string; count?: number }[] = [
    { id: "all", label: "All" },
    // { id: "flagged", label: "Flagged", count: flaggedCount },
    // { id: "dispute", label: "Linked to dispute" },
    // { id: "order", label: "Linked to order" },
  ];

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <AdminLayout>
      {/* Page Heading */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Chats</h1>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Monitor all conversations between buyers and sellers</p>
      </div>

      {/* Info Banner */}
      <div className="mb-3 flex items-start gap-3 rounded-xl border-l-4 border-emerald-500 bg-white px-5 py-3 text-sm text-gray-600 shadow-sm dark:bg-white/[0.03] dark:text-gray-400">
        When two users are doing a deal, they talk inside the platform. As admin, you can read all
        conversations. This is your most important tool for resolving disputes — you can see exactly
        what was promised, agreed, or argued.
      </div>

      {/* Flagged Alert Banner */}
      {/* {flaggedCount > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm text-blue-700 shadow-sm dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
          <span className="text-blue-500">●</span>
          <span>
            <b>{flaggedCount}</b> conversation{flaggedCount !== 1 ? "s" : ""} flagged automatically
            (suspicious keywords detected). Review them first.
          </span>
        </div>
      )} */}

      {/* Split panel */}
      <div className="flex gap-4 h-[calc(100vh-230px)] min-h-[520px]">
        {/* ── Left: conversation list ── */}
        <div className={`${mobileShowDetail ? "hidden md:flex" : "flex"} w-full md:w-[35%] shrink-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03]`}>
          {/* Header */}
          <div className="border-b border-gray-100 px-4 pb-3 pt-4 dark:border-white/[0.05]">
            <h2 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
              All conversations
            </h2>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search by name or keyword..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:border-blue-400 focus:outline-none dark:border-white/[0.05] dark:bg-white/[0.03] dark:text-gray-300"
            />
          </div>

          {/* Filter tabs */}
          <div className="flex flex-wrap gap-2 border-b border-gray-100 px-4 py-2.5 dark:border-white/[0.05]">
            {filters.map((f) => {
              const isActive = activeFilter === f.id;
              const hasBadge = (f.count ?? 0) > 0;
              let cls =
                "rounded-full px-3 py-1 text-xs font-medium border transition-colors ";
              if (isActive) {
                cls +=
                  f.id === "flagged"
                    ? "bg-red-100 border-red-300 text-red-600"
                    : "bg-gray-800 border-gray-800 text-white dark:bg-white dark:text-gray-900";
              } else if (f.id === "flagged" && hasBadge) {
                cls += "border-red-300 text-red-500 hover:bg-red-50";
              } else {
                cls +=
                  "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-white/[0.08] dark:text-gray-400 dark:hover:bg-white/[0.05]";
              }
              return (
                <button key={f.id} onClick={() => setActiveFilter(f.id)} className={cls}>
                  {f.label}
                  {hasBadge && <span className="ml-1">({f.count})</span>}
                </button>
              );
            })}
          </div>

          {/* List */}
          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            {listLoading ? (
              Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)
            ) : conversations.length === 0 ? (
              <div className="py-16 text-center text-sm text-gray-400">
                No conversations found
              </div>
            ) : (
              conversations.map((chat) => (
                <ConversationCard
                  key={chat.id}
                  chat={chat}
                  isSelected={selectedChatId === chat.id}
                  onSelect={(id) => { setSelectedChatId(id); setMobileShowDetail(true); }}
                />
              ))
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-100 px-4 py-2.5 dark:border-white/[0.05]">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="text-xs text-gray-500 hover:text-gray-700 disabled:opacity-40 dark:text-gray-400"
              >
                ← Prev
              </button>
              <span className="text-xs text-gray-400">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="text-xs text-gray-500 hover:text-gray-700 disabled:opacity-40 dark:text-gray-400"
              >
                Next →
              </button>
            </div>
          )}
        </div>

        {/* ── Right: chat detail ── */}
        <div className={`${mobileShowDetail ? "flex" : "hidden md:flex"} min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03]`}>
          {/* Empty state */}
          {!selectedChatId && (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
              <div className="text-5xl">💬</div>
              <p className="text-sm text-gray-400">
                Select a conversation to view details
              </p>
            </div>
          )}

          {/* Loading state */}
          {selectedChatId && detailLoading && (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-sm text-gray-400">Loading conversation...</p>
            </div>
          )}

          {/* Chat loaded */}
          {selectedChatId && !detailLoading && chatDetail && (
            <>
              {/* Mobile back button */}
              <button
                onClick={() => setMobileShowDetail(false)}
                className="md:hidden flex items-center gap-2 border-b border-gray-100 px-5 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-white/[0.05] dark:text-gray-400 dark:hover:bg-white/[0.03]"
              >
                <span>←</span>
                <span>Back to conversations</span>
              </button>

              {/* Chat header */}
              <div className="shrink-0 border-b border-gray-100 px-5 py-3.5 dark:border-white/[0.05]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base font-bold text-gray-800 dark:text-white">
                      {sellerName} → {buyerName}
                    </h2>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      {(chatDetail.started_at ?? chatDetail.created_at) && (
                        <span>
                          Started{" "}
                          {new Date(
                            (chatDetail.started_at ?? chatDetail.created_at) as string
                          ).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      )}
                    </p>

                    {/* Product / Order / Quote context pills */}
                    {(chatDetail.product_context || chatDetail.order_context || chatDetail.quote_status) && (
                      <div className="mt-2.5 flex flex-wrap gap-2">
                        {chatDetail.product_context && (
                          <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5 dark:border-blue-800 dark:bg-blue-900/20">
                            <p className="text-xs font-semibold text-blue-700 dark:text-blue-400">
                              {chatDetail.product_context.product_name}
                            </p>
                            <p className="text-xs text-blue-500 dark:text-blue-500">
                              #{chatDetail.product_context.product_code}
                              {" · "}
                              {new Intl.NumberFormat("en-IN", { style: "currency", currency: chatDetail.product_context.currency, maximumFractionDigits: 0 }).format(chatDetail.product_context.unit_price)}/unit
                              {" · MOQ "}{chatDetail.product_context.minimum_order_quantity}
                            </p>
                          </div>
                        )}
                        {chatDetail.order_context && (
                          <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-1.5 dark:border-emerald-800 dark:bg-emerald-900/20">
                            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                              Order #{chatDetail.order_context.id}
                            </p>
                            <p className="text-xs text-emerald-500 dark:text-emerald-500 capitalize">
                              {chatDetail.order_context.quantity} units
                              {" · "}
                              {new Intl.NumberFormat("en-IN", { style: "currency", currency: chatDetail.order_context.currency, maximumFractionDigits: 0 }).format(Number(chatDetail.order_context.total_amount))}
                              {" · "}
                              {chatDetail.order_context.payment_status.replace(/_/g, " ")}
                            </p>
                          </div>
                        )}
                        {chatDetail.quote_status && (
                          <div className="rounded-lg border border-purple-100 bg-purple-50 px-3 py-1.5 dark:border-purple-800 dark:bg-purple-900/20">
                            <p className="text-xs font-semibold text-purple-700 dark:text-purple-400">
                              Quote #{chatDetail.quote_id}
                            </p>
                            <p className="text-xs text-purple-500 capitalize">{chatDetail.quote_status}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Header actions */}
                  <div className="flex flex-wrap items-center gap-2">
                    {chatFlagged && (
                      <span className="rounded-full border border-red-400 px-2.5 py-1 text-xs font-semibold text-red-500">
                        Flagged
                      </span>
                    )}
                    {/* <button
                      onClick={handleFlagToggle}
                      disabled={isFlaggingChat}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                        chatFlagged
                          ? "border-red-300 bg-red-50 text-red-600 hover:bg-red-100"
                          : "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-white/[0.08] dark:text-gray-400"
                      }`}
                    >
                      Flag / Unflag
                    </button> */}
                    {/* <button className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-white/[0.08] dark:text-gray-400">
                      Link to order
                    </button> */}
                    {/* <button className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                      Link to dispute
                    </button> */}
                  </div>
                </div>
              </div>

              {/* Message timeline */}
              <div
                ref={timelineRef}
                className="flex-1 overflow-y-auto px-5 py-4"
              >
                {!chatDetail.messages || chatDetail.messages.length === 0 ? (
                  <p className="py-12 text-center text-sm text-gray-400">
                    No messages in this conversation
                  </p>
                ) : (
                  chatDetail.messages.map((msg) => (
                    <MessageBubble
                      key={msg.id}
                      msg={msg}
                      buyerName={buyerName}
                      sellerName={sellerName}
                    />
                  ))
                )}
              </div>

              {/* Admin notes */}
              <div className="shrink-0 border-t border-gray-100 px-5 py-4 dark:border-white/[0.05]">
                <p className="mb-3 text-xs font-medium text-gray-400 dark:text-gray-500">
                  Internal note — not visible to users
                </p>

                {/* Existing notes */}
                {notesLoading ? (
                  <div className="mb-3 h-12 animate-pulse rounded-xl bg-gray-100 dark:bg-white/[0.05]" />
                ) : notes.length > 0 ? (
                  <div className="mb-3 max-h-28 space-y-2 overflow-y-auto">
                    {notes.map((note) => (
                      <NoteCard key={note.id} note={note} />
                    ))}
                  </div>
                ) : null}

                {/* Note input + actions */}
                <div className="flex gap-3">
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Add internal note..."
                    rows={2}
                    className="flex-1 resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:border-blue-400 focus:outline-none dark:border-white/[0.05] dark:bg-white/[0.03] dark:text-gray-300"
                  />
                  <div className="flex shrink-0 flex-col gap-2">
                    <button
                      onClick={handleSaveNote}
                      disabled={noteSaving || !newNote.trim()}
                      className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-600 disabled:opacity-50"
                    >
                      {noteSaving ? "Saving..." : "Save note"}
                    </button>
                    <button
                      onClick={handleDownload}
                      disabled={downloading}
                      className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-white/[0.08] dark:text-gray-400"
                    >
                      {downloading ? "Downloading..." : "Download full chat"}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
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

export default AdminChatsPage;
