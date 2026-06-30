"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { apiGet } from "@/utils/api";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faGrip,
  faLayerGroup,
  faFileLines,
  faChartLine,
  faUsers,
  faArrowsRotate,
  faBoxOpen,
  faCartShopping,
  faGear,
  faUserCheck,
  faUserTimes,
  faShareNodes,
  faLifeRing,
  faClipboardList,
  faIdCard,
  faComments,
} from "@fortawesome/free-solid-svg-icons";
import {
  ChevronDownIcon,
  HorizontaLDots,
} from "../icons/index";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean }[];
};

interface NavCounts {
  pending_kyc: number;
  pending_products: number;
  pending_social_media_requests: number;
  open_tickets: number;
  new_orders: number;
  total: number;
}

const NAV_COUNT_MAP: Partial<Record<string, keyof NavCounts>> = {
  "/kyc-verification": "pending_kyc",
  "/products": "pending_products",
  "/social-media-requests": "pending_social_media_requests",
  "/support-tickets": "open_tickets",
  "/orders": "new_orders",
};

const iconClass = "text-[18px]"

const navItems: NavItem[] = [
  {
    icon: <FontAwesomeIcon icon={faGrip} className={iconClass} />,
    name: "Dashboard",
    path: "/",
    // subItems: [{ name: "Ecommerce", path: "/", pro: false }],
  },
  {
    name: "Master",
    icon: <FontAwesomeIcon icon={faLayerGroup} className={iconClass} />,
    subItems: [
      { name: "Categories", path: "/master/categories", pro: false },
      { name: "Subcategories", path: "/master/sub-categories", pro: false },
      { name: "Supply Types", path: "/master/supply-types", pro: false },
      { name: "Pricing Terms", path: "/master/pricing-terms", pro: false },
      { name: "Conditions", path: "/master/conditions", pro: false },
    ],
  },
  {
    name: "Website CMS",
    icon: <FontAwesomeIcon icon={faFileLines} className={iconClass} />,
    subItems: [
      { name: "Posts Categories", path: "/website-cms/post-categories", pro: false },
      { name: "Posts", path: "/website-cms/posts", pro: false },
      { name: "Blog Comments", path: "/website-cms/comments", pro: false },
      { name: "Job Listings", path: "/website-cms/job-listings", pro: false },
      { name: "Team Members", path: "/website-cms/team-members", pro: false },
    ],
  },
  {
    icon: <FontAwesomeIcon icon={faChartLine} className={iconClass} />,
    name: "Live Product Prices",
    path: "#",
  },
  // {
  //   icon: <FontAwesomeIcon icon={faUserPlus} className={iconClass} />,
  //   name: "Sign up Requests",
  //   path: "#",
  // },
  // {
  //   icon: <FontAwesomeIcon icon={faUsers} className={iconClass} />,
  //   name: "Active Users",
  //   path: "/active-users",
  // },
  {
    icon: <FontAwesomeIcon icon={faUsers} className={iconClass} />,
    name: "All Users",
    path: "/users",
  },
  {
    icon: <FontAwesomeIcon icon={faIdCard} className={iconClass} />,
    name: "KYC Verification",
    path: "/kyc-verification",
  },
  {
    icon: <FontAwesomeIcon icon={faUserCheck} className={iconClass} />,
    name: "Verified Users",
    path: "/verified-users",
  },
  {
    icon: <FontAwesomeIcon icon={faUserTimes} className={iconClass} />,
    name: "Unverified Users",
    path: "/unverified-users",
  },
  {
    icon: <FontAwesomeIcon icon={faArrowsRotate} className={iconClass} />,
    name: "Subscriptions",
    path: "/subscriptions",
  },
  {
    icon: <FontAwesomeIcon icon={faBoxOpen} className={iconClass} />,
    name: "Products",
    path: "/products",
  },
  {
    icon: <FontAwesomeIcon icon={faCartShopping} className={iconClass} />,
    name: "Orders",
    path: "/orders",
  },
  {
    icon: <FontAwesomeIcon icon={faComments} className={iconClass} />,
    name: "User Chats",
    path: "/users-chats",
  },
  {
    icon: <FontAwesomeIcon icon={faShareNodes} className={iconClass} />,
    name: "Social Media Requests",
    path: "/social-media-requests",
  },
  {
    icon: <FontAwesomeIcon icon={faLifeRing} className={iconClass} />,
    name: "Support Tickets",
    path: "/support-tickets",
  },
  {
    icon: <FontAwesomeIcon icon={faClipboardList} className={iconClass} />,
    name: "Audit Logs",
    path: "/audit-logs",
  },
  {
    icon: <FontAwesomeIcon icon={faGear} className={iconClass} />,
    name: "Settings",
    subItems: [
      { name: "Approval Settings", path: "/settings/approval-settings", pro: false },
      { name: "SEO Settings", path: "/settings/seo-settings", pro: false },
    ],
  },
  // {
  //   icon: <CalenderIcon />,
  //   name: "Calendar",
  //   path: "/calendar",
  // },
  // {
  //   icon: <UserCircleIcon />,
  //   name: "User Profile",
  //   path: "/profile",
  // },

  // {
  //   name: "Forms",
  //   icon: <ListIcon />,
  //   subItems: [{ name: "Form Elements", path: "/form-elements", pro: false }],
  // },
  // {
  //   name: "Tables",
  //   icon: <TableIcon />,
  //   subItems: [{ name: "Basic Tables", path: "/basic-tables", pro: false }],
  // },
  // {
  //   name: "Pages",
  //   icon: <PageIcon />,
  //   subItems: [
  //     { name: "Blank Page", path: "/blank", pro: false },
  //     { name: "404 Error", path: "/error-404", pro: false },
  //   ],
  // },
];

const othersItems: NavItem[] = [
  // {
  //   icon: <PieChartIcon />,
  //   name: "Charts",
  //   subItems: [
  //     { name: "Line Chart", path: "/line-chart", pro: false },
  //     { name: "Bar Chart", path: "/bar-chart", pro: false },
  //   ],
  // },
  // {
  //   icon: <BoxCubeIcon />,
  //   name: "UI Elements",
  //   subItems: [
  //     { name: "Alerts", path: "/alerts", pro: false },
  //     { name: "Avatar", path: "/avatars", pro: false },
  //     { name: "Badge", path: "/badge", pro: false },
  //     { name: "Buttons", path: "/buttons", pro: false },
  //     { name: "Images", path: "/images", pro: false },
  //     { name: "Videos", path: "/videos", pro: false },
  //   ],
  // },
  // {
  //   icon: <PlugInIcon />,
  //   name: "Authentication",
  //   subItems: [
  //     { name: "Sign In", path: "/signin", pro: false },
  //     { name: "Sign Up", path: "/signup", pro: false },
  //   ],
  // },
];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname() ?? "";
  const [navCounts, setNavCounts] = useState<NavCounts | null>(null);

  const fetchNavCounts = useCallback(async () => {
    try {
      const res = await apiGet("/users/admin/nav-counts/");
      setNavCounts(res.data);
    } catch {
      // non-critical — silently ignore
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchNavCounts();
    const interval = setInterval(fetchNavCounts, 60_000);
    return () => clearInterval(interval);
  }, [fetchNavCounts]);

  const renderMenuItems = (
    navItems: NavItem[],
   
    menuType: "main" | "others"
  ) => (
    <ul className="flex flex-col gap-4">
      {navItems.map((nav, index) => (
        <li key={nav.name}>
          {nav.subItems ? (
            <button
              onClick={() => handleSubmenuToggle(index, menuType)}
              className={`menu-item group  ${openSubmenu?.type === menuType && openSubmenu?.index === index
                  ? "menu-item-active"
                  : "menu-item-inactive"
                } cursor-pointer ${!isExpanded && !isHovered
                  ? "lg:justify-center"
                  : "lg:justify-start"
                }`}
            >
              <span
                className={` ${openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? "menu-item-icon-active"
                    : "menu-item-icon-inactive"
                  }`}
              >
                {nav.icon}
              </span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <span className={`menu-item-text`}>{nav.name}</span>
              )}
              {(isExpanded || isHovered || isMobileOpen) && (
                <ChevronDownIcon
                  className={`ml-auto w-5 h-5 transition-transform duration-200  ${openSubmenu?.type === menuType &&
                      openSubmenu?.index === index
                      ? "rotate-180 text-brand-500"
                      : ""
                    }`}
                />
              )}
            </button>
          ) : (
            nav.path && (
              <Link
                href={nav.path}
                className={`menu-item group ${isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
                  }`}
              >
                <span
                  className={`relative ${isActive(nav.path)
                      ? "menu-item-icon-active"
                      : "menu-item-icon-inactive"
                    }`}
                >
                  {nav.icon}
                  {/* Collapsed badge dot on icon */}
                  {!isExpanded && !isHovered && !isMobileOpen && (() => {
                    const key = NAV_COUNT_MAP[nav.path];
                    const count = key ? (navCounts?.[key] ?? 0) : 0;
                    return count > 0 ? (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                        {count > 99 ? "99+" : count}
                      </span>
                    ) : null;
                  })()}
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (() => {
                  const key = NAV_COUNT_MAP[nav.path];
                  const count = key ? (navCounts?.[key] ?? 0) : 0;
                  return (
                    <>
                      <span className="menu-item-text">{nav.name}</span>
                      {count > 0 && (
                        <span className="ml-auto shrink-0 min-w-[20px] h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1.5">
                          {count > 99 ? "99+" : count}
                        </span>
                      )}
                    </>
                  );
                })()}
              </Link>
            )
          )}
          {nav.subItems && (isExpanded || isHovered || isMobileOpen) && (
            <div
              ref={(el) => {
                subMenuRefs.current[`${menuType}-${index}`] = el;
              }}
              className="overflow-hidden transition-all duration-300"
              style={{
                height:
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? `${subMenuHeight[`${menuType}-${index}`]}px`
                    : "0px",
              }}
            >
              <ul className="mt-2 space-y-1 ml-9">
                {nav.subItems.map((subItem) => (
                  <li key={subItem.name}>
                    <Link
                      href={subItem.path}
                      className={`menu-dropdown-item ${isActive(subItem.path)
                          ? "menu-dropdown-item-active"
                          : "menu-dropdown-item-inactive"
                        }`}
                    >
                      {subItem.name}
                      <span className="flex items-center gap-1 ml-auto">
                        {subItem.new && (
                          <span
                            className={`ml-auto ${isActive(subItem.path)
                                ? "menu-dropdown-badge-active"
                                : "menu-dropdown-badge-inactive"
                              } menu-dropdown-badge `}
                          >
                            new
                          </span>
                        )}
                        {subItem.pro && (
                          <span
                            className={`ml-auto ${isActive(subItem.path)
                                ? "menu-dropdown-badge-active"
                                : "menu-dropdown-badge-inactive"
                              } menu-dropdown-badge `}
                          >
                            pro
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </li>
      ))}
    </ul>
  );

  const [openSubmenu, setOpenSubmenu] = useState<{
    type: "main" | "others";
    index: number;
  } | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>(
    {}
  );
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // const isActive = (path: string) => path === pathname;
  const isActive = useCallback(
    (path: string) => {
      if (!path || path === "#") {
        return false;
      }

      if (path === "/") {
        return pathname === "/";
      }

      return pathname === path || pathname.startsWith(`${path}/`);
    },
    [pathname]
  );

  useEffect(() => {
    // Check if the current path matches any submenu item
    let submenuMatched = false;
    ["main", "others"].forEach((menuType) => {
      const items = menuType === "main" ? navItems : othersItems;
      items.forEach((nav, index) => {
        if (nav.subItems) {
          nav.subItems.forEach((subItem) => {
            if (isActive(subItem.path)) {
              setOpenSubmenu({
                type: menuType as "main" | "others",
                index,
              });
              submenuMatched = true;
            }
          });
        }
      });
    });

    // If no submenu item matches, close the open submenu
    if (!submenuMatched) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpenSubmenu(null);
    }
  }, [pathname, isActive]);

  useEffect(() => {
    // Set the height of the submenu items when the submenu is opened
    if (openSubmenu !== null) {
      const key = `${openSubmenu.type}-${openSubmenu.index}`;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prevHeights) => ({
          ...prevHeights,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
  }, [openSubmenu]);

  const handleSubmenuToggle = (index: number, menuType: "main" | "others") => {
    setOpenSubmenu((prevOpenSubmenu) => {
      if (
        prevOpenSubmenu &&
        prevOpenSubmenu.type === menuType &&
        prevOpenSubmenu.index === index
      ) {
        return null;
      }
      return { type: menuType, index };
    });
  };

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 
        ${isExpanded || isMobileOpen
          ? "w-[290px]"
          : isHovered
            ? "w-[290px]"
            : "w-[90px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`py-8 flex  ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
          }`}
      >
        <Link href="/">
          {isExpanded || isHovered || isMobileOpen ? (
            <>
              <Image
                className="dark:hidden"
                src="/images/logo/tradeclover_logo.png"
                alt="Logo"
                width={180}
                height={40}
              />
              <Image
                className="hidden dark:block"
                src="/images/logo/tradeclover_logo_dark.png"
                alt="Logo"
                width={180}
                height={40}
              />
            </>
          ) : (
            <Image
              src="/images/logo/tradeclover_logo_icon.png"
              alt="Logo"
              width={32}
              height={32}
            />
          )}
        </Link>
      </div>
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2
                className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${!isExpanded && !isHovered
                    ? "lg:justify-center"
                    : "justify-start"
                  }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  "Menu"
                ) : (
                  <HorizontaLDots />
                )}
              </h2>
              {renderMenuItems(navItems, "main")}
            </div>

            <div className="">
              <h2
                className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${!isExpanded && !isHovered
                    ? "lg:justify-center"
                    : "justify-start"
                  }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  "Others"
                ) : (
                  <HorizontaLDots />
                )}
              </h2>
              {renderMenuItems(othersItems, "others")}
            </div>
          </div>
        </nav>
        {/* {isExpanded || isHovered || isMobileOpen ? <SidebarWidget /> : null} */}
      </div>
    </aside>
  );
};

export default AppSidebar;
