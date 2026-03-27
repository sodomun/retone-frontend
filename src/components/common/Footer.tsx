"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname();

  const tabs = [
    { href: "/talk", label: "トーク", icon: "💬" },
    { href: "/settings", label: "設定", icon: "⚙️" },
  ];

  return (
    <nav
      style={{
        display: "flex",
        borderTop: "1px solid var(--border-color)",
        background: "var(--footer-bg)",
        position: "sticky",
        bottom: 0,
        zIndex: 10,
      }}
    >
      {tabs.map((tab) => {
        const isActive = pathname === tab.href || pathname.startsWith(tab.href + "/");
        return (
          <Link
            key={tab.href}
            href={tab.href}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "10px 0",
              gap: 3,
              color: isActive ? "var(--footer-active)" : "var(--footer-inactive)",
              fontSize: 12,
              fontWeight: isActive ? "bold" : "normal",
              textDecoration: "none",
            }}
          >
            <span style={{ fontSize: 20 }}>{tab.icon}</span>
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
