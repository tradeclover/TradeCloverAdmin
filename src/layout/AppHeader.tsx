"use client";
import { ThemeToggleButton } from "@/components/common/ThemeToggleButton";
import NotificationDropdown from "@/components/header/NotificationDropdown";
import UserDropdown from "@/components/header/UserDropdown";
import { useSidebar } from "@/context/SidebarContext";
import { apiGet } from "@/utils/api";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { useCallback, useEffect, useRef, useState } from "react";

interface SearchUser {
  id: number;
  first_name?: string;
  last_name?: string;
  name?: string;
  full_name?: string;
  phone?: string;
  primary_phone?: string;
  email?: string | null;
}

interface SearchProduct {
  id: number;
  name?: string;
  product_name?: string;
  slug?: string;
  seller?: string;
  seller_name?: string;
}

interface SearchOrder {
  id: number;
  buyer?: string;
  buyer_name?: string;
  product?: string;
  product_name?: string;
  total_amount?: string;
  status?: string;
}

interface SearchResults {
  users?: SearchUser[];
  products?: SearchProduct[];
  orders?: SearchOrder[];
}

const AppHeader: React.FC = () => {
  const router = useRouter();
  const { isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar();
  const [isApplicationMenuOpen, setApplicationMenuOpen] = useState(false);

  // Search state
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleToggle = () => {
    if (window.innerWidth >= 1024) toggleSidebar();
    else toggleMobileSidebar();
  };

  // Keyboard shortcut ⌘K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
        setQuery("");
        inputRef.current?.blur();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Close search on outside click
  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // Debounced search
  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults(null);
      setSearchOpen(false);
      return;
    }
    setSearchLoading(true);
    setSearchOpen(true);
    try {
      const res = await apiGet(`/users/admin/global-search/?q=${encodeURIComponent(q)}`);
      const d = res.data?.data ?? res.data;
      setResults(d);
    } catch {
      setResults(null);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 350);
  };

  const hasResults =
    results &&
    ((results.users?.length ?? 0) > 0 ||
      (results.products?.length ?? 0) > 0 ||
      (results.orders?.length ?? 0) > 0);

  const goAndClose = (href: string) => {
    setSearchOpen(false);
    setQuery("");
    setResults(null);
    router.push(href);
  };

  return (
    <header className="sticky top-0 flex w-full bg-white border-gray-200 z-99999 dark:border-gray-800 dark:bg-gray-900 lg:border-b">
      <div className="flex flex-col items-center justify-between grow lg:flex-row lg:px-6">
        {/* Top bar */}
        <div className="flex items-center justify-between w-full gap-2 px-3 py-3 border-b border-gray-200 dark:border-gray-800 sm:gap-4 lg:justify-normal lg:border-b-0 lg:px-0 lg:py-4">
          {/* Hamburger */}
          <button
            className="items-center justify-center w-10 h-10 text-gray-500 border-gray-200 rounded-lg z-99999 dark:border-gray-800 lg:flex dark:text-gray-400 lg:h-11 lg:w-11 lg:border"
            onClick={handleToggle}
            aria-label="Toggle Sidebar"
          >
            {isMobileOpen ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path fillRule="evenodd" clipRule="evenodd" d="M6.21967 7.28131C5.92678 6.98841 5.92678 6.51354 6.21967 6.22065C6.51256 5.92775 6.98744 5.92775 7.28033 6.22065L11.999 10.9393L16.7176 6.22078C17.0105 5.92789 17.4854 5.92788 17.7782 6.22078C18.0711 6.51367 18.0711 6.98855 17.7782 7.28144L13.0597 12L17.7782 16.7186C18.0711 17.0115 18.0711 17.4863 17.7782 17.7792C17.4854 18.0721 17.0105 18.0721 16.7176 17.7792L11.999 13.0607L7.28033 17.7794C6.98744 18.0722 6.51256 18.0722 6.21967 17.7794C5.92678 17.4865 5.92678 17.0116 6.21967 16.7187L10.9384 12L6.21967 7.28131Z" fill="currentColor" />
              </svg>
            ) : (
              <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
                <path fillRule="evenodd" clipRule="evenodd" d="M0.583252 1C0.583252 0.585788 0.919038 0.25 1.33325 0.25H14.6666C15.0808 0.25 15.4166 0.585786 15.4166 1C15.4166 1.41421 15.0808 1.75 14.6666 1.75L1.33325 1.75C0.919038 1.75 0.583252 1.41422 0.583252 1ZM0.583252 11C0.583252 10.5858 0.919038 10.25 1.33325 10.25L14.6666 10.25C15.0808 10.25 15.4166 10.5858 15.4166 11C15.4166 11.4142 15.0808 11.75 14.6666 11.75L1.33325 11.75C0.919038 11.75 0.583252 11.4142 0.583252 11ZM1.33325 5.25C0.919038 5.25 0.583252 5.58579 0.583252 6C0.583252 6.41421 0.919038 6.75 1.33325 6.75L7.99992 6.75C8.41413 6.75 8.74992 6.41421 8.74992 6C8.74992 5.58579 8.41413 5.25 7.99992 5.25L1.33325 5.25Z" fill="currentColor" />
              </svg>
            )}
          </button>

          {/* Logo (mobile) */}
          <Link href="/" className="lg:hidden">
            <Image width={154} height={32} className="dark:hidden" src="/images/logo/tradeclover_logo.png" alt="TradeClover" />
            <Image width={154} height={32} className="hidden dark:block" src="/images/logo/tradeclover_logo_dark.png" alt="TradeClover" />
          </Link>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setApplicationMenuOpen(!isApplicationMenuOpen)}
            className="flex items-center justify-center w-10 h-10 text-gray-700 rounded-lg z-99999 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 lg:hidden"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path fillRule="evenodd" clipRule="evenodd" d="M5.99902 10.4951C6.82745 10.4951 7.49902 11.1667 7.49902 11.9951V12.0051C7.49902 12.8335 6.82745 13.5051 5.99902 13.5051C5.1706 13.5051 4.49902 12.8335 4.49902 12.0051V11.9951C4.49902 11.1667 5.1706 10.4951 5.99902 10.4951ZM17.999 10.4951C18.8275 10.4951 19.499 11.1667 19.499 11.9951V12.0051C19.499 12.8335 18.8275 13.5051 17.999 13.5051C17.1706 13.5051 16.499 12.8335 16.499 12.0051V11.9951C16.499 11.1667 17.1706 10.4951 17.999 10.4951ZM13.499 11.9951C13.499 11.1667 12.8275 10.4951 11.999 10.4951C11.1706 10.4951 10.499 11.1667 10.499 11.9951V12.0051C10.499 12.8335 11.1706 13.5051 11.999 13.5051C12.8275 13.5051 13.499 12.8335 13.499 12.0051V11.9951Z" fill="currentColor" />
            </svg>
          </button>

          {/* Search bar (desktop) */}
          <div className="hidden lg:block relative" ref={searchRef}>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                {searchLoading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
                ) : (
                  <svg className="fill-gray-500 dark:fill-gray-400" width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path fillRule="evenodd" clipRule="evenodd" d="M3.04175 9.37363C3.04175 5.87693 5.87711 3.04199 9.37508 3.04199C12.8731 3.04199 15.7084 5.87693 15.7084 9.37363C15.7084 12.8703 12.8731 15.7053 9.37508 15.7053C5.87711 15.7053 3.04175 12.8703 3.04175 9.37363ZM9.37508 1.54199C5.04902 1.54199 1.54175 5.04817 1.54175 9.37363C1.54175 13.6991 5.04902 17.2053 9.37508 17.2053C11.2674 17.2053 13.003 16.5344 14.357 15.4176L17.177 18.238C17.4699 18.5309 17.9448 18.5309 18.2377 18.238C18.5306 17.9451 18.5306 17.4703 18.2377 17.1774L15.418 14.3573C16.5365 13.0033 17.2084 11.2669 17.2084 9.37363C17.2084 5.04817 13.7011 1.54199 9.37508 1.54199Z" fill="" />
                  </svg>
                )}
              </span>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={handleQueryChange}
                onFocus={() => query.length >= 2 && setSearchOpen(true)}
                placeholder="Search users, products, orders..."
                className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-200 bg-transparent py-2.5 pl-12 pr-14 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 xl:w-[430px]"
              />
              <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 inline-flex items-center gap-0.5 rounded-lg border border-gray-200 bg-gray-50 px-[7px] py-[4.5px] text-xs text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400">
                <span>⌘</span><span>K</span>
              </kbd>
            </div>

            {/* Search dropdown */}
            {searchOpen && (
              <div className="absolute left-0 top-[calc(100%+8px)] z-[99999] w-full min-w-[430px] rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-gray-900">
                {!hasResults && !searchLoading ? (
                  <div className="flex h-20 items-center justify-center text-sm text-gray-400">
                    No results for &ldquo;{query}&rdquo;
                  </div>
                ) : (
                  <div className="max-h-[400px] overflow-y-auto p-2">
                    {/* Users */}
                    {(results?.users?.length ?? 0) > 0 && (
                      <div className="mb-2">
                        <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
                          Users
                        </p>
                        {results!.users!.map((u) => {
                          const displayName =
                            u.first_name || u.last_name
                              ? `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim()
                              : (u.full_name ?? u.name ?? "—");
                          return (
                            <button
                              key={u.id}
                              onClick={() => goAndClose(`/verified-users/${u.id}`)}
                              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-white/[0.03]"
                            >
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                                {displayName.charAt(0).toUpperCase() || "?"}
                              </span>
                              <span className="flex-1 min-w-0">
                                <span className="block truncate text-sm font-medium text-gray-800 dark:text-white/90">
                                  {displayName}
                                </span>
                                <span className="block truncate text-xs text-gray-400">
                                  {u.email ?? u.phone ?? u.primary_phone ?? ""}
                                </span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Products */}
                    {(results?.products?.length ?? 0) > 0 && (
                      <div className="mb-2">
                        <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
                          Products
                        </p>
                        {results!.products!.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => goAndClose(p.slug ? `/products/product-detail?slug=${p.slug}` : `/products/product-detail?id=${p.id}`)}
                            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-white/[0.03]"
                          >
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400">
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                              </svg>
                            </span>
                            <span className="flex-1 min-w-0">
                              <span className="block truncate text-sm font-medium text-gray-800 dark:text-white/90">
                                {p.product_name ?? p.name ?? "—"}
                              </span>
                              <span className="block truncate text-xs text-gray-400">
                                {p.seller_name ?? p.seller ?? ""}
                              </span>
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Orders */}
                    {(results?.orders?.length ?? 0) > 0 && (
                      <div>
                        <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
                          Orders
                        </p>
                        {results!.orders!.map((o) => (
                          <button
                            key={o.id}
                            onClick={() => goAndClose(`/orders/order-detail?id=${o.id}`)}
                            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-white/[0.03]"
                          >
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-orange-600 dark:bg-orange-500/10 dark:text-orange-400">
                              #{o.id}
                            </span>
                            <span className="flex-1 min-w-0">
                              <span className="block truncate text-sm font-medium text-gray-800 dark:text-white/90">
                                {o.buyer_name ?? o.buyer ?? "—"} → {o.product_name ?? o.product ?? "—"}
                              </span>
                              <span className="block truncate text-xs text-gray-400">
                                {o.total_amount ? `₹${parseFloat(o.total_amount).toLocaleString("en-IN")}` : ""}{" "}
                                {o.status ?? ""}
                              </span>
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right actions */}
        <div
          className={`${
            isApplicationMenuOpen ? "flex" : "hidden"
          } items-center justify-between w-full gap-4 px-5 py-4 lg:flex shadow-theme-md lg:justify-end lg:px-0 lg:shadow-none`}
        >
          <div className="flex items-center gap-2 2xsm:gap-3">
            <ThemeToggleButton />
            <NotificationDropdown />
          </div>
          <UserDropdown />
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
