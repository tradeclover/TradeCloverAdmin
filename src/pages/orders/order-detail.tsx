import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import AdminLayout from '@/layout/AdminLayout';
import { ChevronLeftIcon } from "@/icons";
import { apiGet, apiPost } from "@/utils/api";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import Toast from "@/components/ui/toast/Toast";

// ── Types ─────────────────────────────────────────────────────────────────────

interface BuyerBusinessProfile {
    id: number;
    first_name: string;
    last_name: string;
    business_name: string | null;
    legal_name: string | null;
    business_logo: string | null;
    business_registration_type: string | null;
    industry_category: string | null;
    website_url: string | null;
    year_of_establishment: string | null;
    employee_count: number | null;
    annual_turnover: string | null;
    business_description: string | null;
    head_office_address: string | null;
    head_office_country: string | null;
    head_office_state: string | null;
    head_office_city: string | null;
    head_office_zipcode: string | null;
    billing_address: string | null;
    billing_country: string | null;
    billing_state: string | null;
    billing_city: string | null;
    billing_zipcode: string | null;
    preferred_currency: string | null;
    time_zone: string | null;
    trust_score: number;
    rating: number;
    reviews_count: number;
    created_at: string;
    updated_at: string;
}

interface ProductCategory {
    id: number;
    name: string;
}

interface ProductDetail {
    id: number;
    product_code: string;
    product_name: string;
    product_images: string[];
    unit_price: string;
    price_on_request: boolean;
    minimum_order_quantity: number;
    currency: string;
    status: string;
    category: ProductCategory | null;
}

interface OrderDetail {
    id: number;
    buyer: number;
    buyer_name: string;
    buyer_business_profile: BuyerBusinessProfile | null;
    seller: number;
    seller_id: number;
    seller_name: string;
    product_id: number;
    product_detail: ProductDetail | null;
    quantity: number;
    price: string;
    total_amount: string;
    paid_amount: string;
    balance_amount: string;
    currency: string;
    delivery_date: string | null;
    payment_due_date: string | null;
    payment_status: string | null;
    status: string | null;
    proof_of_delivery: string[];
    proof_of_payment: string[];
    seller_order_reference: string | null;
    quote_request_id: number | null;
    chat_id: number | null;
    source_offer_message_id: number | null;
    created_at: string;
    updated_at: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const fmt = (v: string | null | undefined) => v || '—';

const fmtDate = (v: string | null | undefined) => {
    if (!v) return '—';
    return new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const fmtDateTime = (v: string | null | undefined) => {
    if (!v) return '—';
    return new Date(v).toLocaleString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
};

const fmtCurrency = (amount: string | null | undefined, currency = 'INR') => {
    if (!amount) return '—';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(amount));
};

const capitalize = (s: string | null | undefined) =>
    s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ') : '—';

// ── Badge components ───────────────────────────────────────────────────────────

const OrderStatusBadge = ({ status }: { status: string | null }) => {
    const s = (status ?? '').toLowerCase();
    const cfg: Record<string, string> = {
        confirmed: 'bg-green-100 text-green-800 border-green-200',
        completed: 'bg-blue-100 text-blue-800 border-blue-200',
        cancelled: 'bg-red-100 text-red-800 border-red-200',
        pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        processing: 'bg-purple-100 text-purple-800 border-purple-200',
    };
    return (
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${cfg[s] ?? 'bg-gray-100 text-gray-700 border-gray-200'}`}>
            {capitalize(status)}
        </span>
    );
};

const PaymentStatusBadge = ({ status }: { status: string | null }) => {
    const s = (status ?? '').toLowerCase();
    const cfg: Record<string, string> = {
        paid: 'bg-green-100 text-green-800 border-green-200',
        partially_paid: 'bg-blue-100 text-blue-800 border-blue-200',
        unpaid: 'bg-red-100 text-red-800 border-red-200',
    };
    return (
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${cfg[s] ?? 'bg-gray-100 text-gray-700 border-gray-200'}`}>
            {capitalize(status)}
        </span>
    );
};

const ProductStatusBadge = ({ status }: { status: string }) => {
    const s = status.toLowerCase();
    const cfg: Record<string, string> = {
        approved: 'bg-green-100 text-green-700',
        rejected: 'bg-red-100 text-red-700',
        pending: 'bg-yellow-100 text-yellow-700',
    };
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cfg[s] ?? 'bg-gray-100 text-gray-600'}`}>
            {capitalize(status)}
        </span>
    );
};

// ── Section wrapper ────────────────────────────────────────────────────────────

const Section = ({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) => (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
            <span className="text-gray-500">{icon}</span>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{title}</h3>
        </div>
        <div className="p-6">{children}</div>
    </div>
);

const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div>
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">{label}</p>
        <div className="text-sm text-gray-800">{value ?? '—'}</div>
    </div>
);

// ── Icons (inline SVG) ─────────────────────────────────────────────────────────

const Icon = {
    order: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
    product: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" /></svg>,
    buyer: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
    seller: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
    money: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    delivery: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>,
    link: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>,
    proof: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>,
    address: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
    clock: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
};

// ── Page ──────────────────────────────────────────────────────────────────────

const OrderDetailPage = () => {
    const router = useRouter();
    const { id } = router.query;
    const [order, setOrder] = useState<OrderDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeImage, setActiveImage] = useState(0);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');

    const fetchOrder = useCallback(async () => {
        try {
            setLoading(true);
            if (id) {
                const response = await apiGet(`/orders/${id}/`);
                setOrder(response.data);
            }
        } catch {
            setError('Failed to fetch order details');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { fetchOrder(); }, [fetchOrder]);

    const confirmCancelOrder = useCallback(async () => {
        if (!order) return;
        setShowCancelModal(false);
        try {
            await apiPost(`/orders/${order.id}/cancel/`);
            setToastMessage('Order cancelled successfully');
            setToastType('success');
            setShowToast(true);
            setTimeout(() => router.push('/orders'), 1500);
        } catch {
            setToastMessage('Failed to cancel order. Please try again.');
            setToastType('error');
            setShowToast(true);
        }
    }, [order, router]);

    if (loading) {
        return (
            <AdminLayout>
                <div className="p-6 space-y-4 animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-1/4" />
                    <div className="h-40 bg-gray-200 rounded-xl" />
                    <div className="grid grid-cols-3 gap-4">
                        {[1, 2, 3].map(i => <div key={i} className="h-32 bg-gray-200 rounded-xl" />)}
                    </div>
                </div>
            </AdminLayout>
        );
    }

    if (error || !order) {
        return (
            <AdminLayout>
                <div className="p-6">
                    <Button variant="outline" onClick={() => router.back()} className="mb-4">
                        <ChevronLeftIcon className="h-5 w-5" />
                    </Button>
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                        <p className="text-red-700">{error ?? 'Order not found'}</p>
                    </div>
                </div>
            </AdminLayout>
        );
    }

    const product = order.product_detail;
    const buyer = order.buyer_business_profile;
    const images = product?.product_images ?? [];
    const canCancel = !['cancelled', 'completed'].includes((order.status ?? '').toLowerCase());

    return (
        <AdminLayout>
            <div className="p-6 max-w-7xl mx-auto space-y-6">

                {/* ── Header ─────────────────────────────────────────────── */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Button variant="outline" onClick={() => router.back()}>
                            <ChevronLeftIcon className="h-5 w-5" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">
                                Order #{order.seller_order_reference || order.id}
                            </h1>
                            <p className="text-sm text-gray-400 mt-0.5">
                                Placed {fmtDateTime(order.created_at)}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <OrderStatusBadge status={order.status} />
                        <PaymentStatusBadge status={order.payment_status} />
                        {canCancel && (
                            <Button
                                variant="primary"
                                onClick={() => setShowCancelModal(true)}
                                className="bg-red-600 hover:bg-red-700 text-sm px-4 py-2"
                            >
                                Cancel Order
                            </Button>
                        )}
                    </div>
                </div>

                {/* ── Financial summary strip ────────────────────────────── */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                        { label: 'Order Total', value: fmtCurrency(order.total_amount, order.currency), color: 'text-gray-900' },
                        { label: 'Paid Amount', value: fmtCurrency(order.paid_amount, order.currency), color: 'text-green-700' },
                        { label: 'Balance Due', value: fmtCurrency(order.balance_amount, order.currency), color: Number(order.balance_amount) > 0 ? 'text-red-600' : 'text-gray-500' },
                        { label: 'Agreed Price / unit', value: fmtCurrency(order.price, order.currency), color: 'text-blue-700' },
                    ].map(card => (
                        <div key={card.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">{card.label}</p>
                            <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
                        </div>
                    ))}
                </div>

                {/* ── Product ────────────────────────────────────────────── */}
                {product && (
                    <Section title="Product" icon={Icon.product}>
                        <div className="flex flex-col md:flex-row gap-6">
                            {/* Images */}
                            <div className="flex-shrink-0 w-full md:w-72">
                                {images.length > 0 ? (
                                    <>
                                        <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 mb-2">
                                            <img
                                                src={images[activeImage]}
                                                alt={product.product_name}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        {images.length > 1 && (
                                            <div className="flex gap-2 flex-wrap">
                                                {images.map((src, i) => (
                                                    <button
                                                        key={i}
                                                        onClick={() => setActiveImage(i)}
                                                        className={`w-12 h-12 rounded-md overflow-hidden border-2 transition-colors ${i === activeImage ? 'border-blue-500' : 'border-transparent'}`}
                                                    >
                                                        <img src={src} alt="" className="w-full h-full object-cover" />
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="aspect-square rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
                                        No image
                                    </div>
                                )}
                            </div>

                            {/* Details */}
                            <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-5">
                                <Field label="Product Name" value={product.product_name} />
                                <Field label="Product Code" value={product.product_code} />
                                <Field label="Category" value={product.category?.name} />
                                <Field label="Unit Price" value={fmtCurrency(product.unit_price, product.currency)} />
                                <Field label="Min. Order Qty" value={`${product.minimum_order_quantity} units`} />
                                <Field label="Price on Request" value={product.price_on_request ? 'Yes' : 'No'} />
                                <Field label="Product Status" value={<ProductStatusBadge status={product.status} />} />
                                <Field label="Ordered Qty" value={`${order.quantity} units`} />
                            </div>
                        </div>
                    </Section>
                )}

                {/* ── Buyer + Seller (side by side) ────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* Buyer */}
                    <Section title="Buyer" icon={Icon.buyer}>
                        <div className="flex items-start gap-3 mb-4">
                            {buyer?.business_logo ? (
                                <img src={buyer.business_logo} alt="" className="w-12 h-12 rounded-full object-cover border border-gray-200" />
                            ) : (
                                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
                                    {order.buyer_name.charAt(0)}
                                </div>
                            )}
                            <div>
                                <p className="font-semibold text-gray-900">{order.buyer_name}</p>
                                <p className="text-xs text-gray-400">User ID #{order.buyer}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Business Name" value={fmt(buyer?.business_name)} />
                            <Field label="Legal Name" value={fmt(buyer?.legal_name)} />
                            <Field label="Registration Type" value={fmt(buyer?.business_registration_type)} />
                            <Field label="Industry" value={fmt(buyer?.industry_category)} />
                            <Field label="Annual Turnover" value={buyer?.annual_turnover ? fmtCurrency(buyer.annual_turnover, buyer.preferred_currency ?? 'INR') : '—'} />
                            <Field label="Employees" value={buyer?.employee_count?.toLocaleString() ?? '—'} />
                            <Field label="Est. Year" value={buyer?.year_of_establishment ? fmtDate(buyer.year_of_establishment) : '—'} />
                            <Field label="Currency" value={fmt(buyer?.preferred_currency)} />
                            {buyer?.website_url && (
                                <div className="col-span-2">
                                    <Field label="Website" value={
                                        <a href={buyer.website_url} target="_blank" rel="noopener noreferrer"
                                            className="text-blue-600 hover:underline break-all text-sm">
                                            {buyer.website_url}
                                        </a>
                                    } />
                                </div>
                            )}
                        </div>

                        {/* Head office */}
                        {buyer?.head_office_address && (
                            <div className="mt-4 pt-4 border-t border-gray-100">
                                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                                    {Icon.address} Head Office
                                </p>
                                <p className="text-sm text-gray-700">
                                    {[buyer.head_office_address, buyer.head_office_city, buyer.head_office_state, buyer.head_office_country, buyer.head_office_zipcode]
                                        .filter(Boolean).join(', ')}
                                </p>
                            </div>
                        )}

                        {/* Trust & rating */}
                        <div className="mt-4 pt-4 border-t border-gray-100 flex gap-6">
                            <div>
                                <p className="text-xs text-gray-400 uppercase tracking-wide">Trust Score</p>
                                <p className="text-sm font-semibold text-gray-800">{buyer?.trust_score ?? 0}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 uppercase tracking-wide">Rating</p>
                                <p className="text-sm font-semibold text-gray-800">{buyer?.rating ?? 0} ★</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 uppercase tracking-wide">Reviews</p>
                                <p className="text-sm font-semibold text-gray-800">{buyer?.reviews_count ?? 0}</p>
                            </div>
                        </div>
                    </Section>

                    {/* Seller */}
                    <Section title="Seller" icon={Icon.seller}>
                        <div className="flex items-start gap-3 mb-4">
                            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold text-lg">
                                {order.seller_name.charAt(0)}
                            </div>
                            <div>
                                <p className="font-semibold text-gray-900">{order.seller_name}</p>
                                <p className="text-xs text-gray-400">User ID #{order.seller}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Seller ID" value={order.seller_id} />
                            <Field label="Seller Reference" value={fmt(order.seller_order_reference)} />
                        </div>
                    </Section>
                </div>

                {/* ── Delivery & Payment dates ──────────────────────────── */}
                <Section title="Delivery & Payment" icon={Icon.delivery}>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <Field label="Delivery Date" value={fmtDate(order.delivery_date)} />
                        <Field label="Payment Due Date" value={fmtDate(order.payment_due_date)} />
                        <Field label="Order Status" value={<OrderStatusBadge status={order.status} />} />
                        <Field label="Payment Status" value={<PaymentStatusBadge status={order.payment_status} />} />
                    </div>
                </Section>

                {/* ── Proof of Delivery & Payment ──────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Section title="Proof of Delivery" icon={Icon.proof}>
                        {order.proof_of_delivery.length === 0 ? (
                            <p className="text-sm text-gray-400">No proof of delivery uploaded.</p>
                        ) : (
                            <div className="flex flex-wrap gap-3">
                                {order.proof_of_delivery.map((url, i) => (
                                    <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm hover:bg-blue-100 transition-colors">
                                        {Icon.link} Document {i + 1}
                                    </a>
                                ))}
                            </div>
                        )}
                    </Section>

                    <Section title="Proof of Payment" icon={Icon.proof}>
                        {order.proof_of_payment.length === 0 ? (
                            <p className="text-sm text-gray-400">No proof of payment uploaded.</p>
                        ) : (
                            <div className="flex flex-wrap gap-3">
                                {order.proof_of_payment.map((url, i) => (
                                    <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-sm hover:bg-green-100 transition-colors">
                                        {Icon.link} Document {i + 1}
                                    </a>
                                ))}
                            </div>
                        )}
                    </Section>
                </div>

                {/* ── References & Timestamps ───────────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Section title="References" icon={Icon.link}>
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Order ID" value={`#${order.id}`} />
                            <Field label="Seller Reference" value={fmt(order.seller_order_reference)} />
                            <Field label="Quote Request ID" value={order.quote_request_id ?? '—'} />
                            <Field label="Chat ID" value={order.chat_id ?? '—'} />
                            <Field label="Source Offer Message ID" value={order.source_offer_message_id ?? '—'} />
                        </div>
                    </Section>

                    <Section title="Timestamps" icon={Icon.clock}>
                        <div className="grid grid-cols-1 gap-4">
                            <Field label="Order Created" value={fmtDateTime(order.created_at)} />
                            <Field label="Last Updated" value={fmtDateTime(order.updated_at)} />
                        </div>
                    </Section>
                </div>

            </div>

            {/* ── Cancel modal ─────────────────────────────────────────── */}
            <Modal isOpen={showCancelModal} onClose={() => setShowCancelModal(false)} className="max-w-sm">
                <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Cancel Order</h3>
                    <p className="text-sm text-gray-500 mb-6">
                        Are you sure you want to cancel Order #{order.seller_order_reference || order.id}? This action cannot be undone.
                    </p>
                    <div className="flex justify-end gap-3">
                        <Button variant="outline" onClick={() => setShowCancelModal(false)}>Keep Order</Button>
                        <Button variant="primary" onClick={confirmCancelOrder} className="bg-red-600 hover:bg-red-700">
                            Confirm Cancel
                        </Button>
                    </div>
                </div>
            </Modal>

            <Toast message={toastMessage} type={toastType} isVisible={showToast} onClose={() => setShowToast(false)} />
        </AdminLayout>
    );
};

export default OrderDetailPage;
