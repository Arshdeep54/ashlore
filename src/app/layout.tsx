import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "lore — your coding lore, searchable",
  description:
    "Ingest your AI conversations, GitHub commits, and work history into a queryable second brain.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <div className="flex h-screen overflow-hidden bg-[#09090b] text-zinc-200">
          <Sidebar />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </body>
    </html>
  );
}

import Link from "next/link";

function Sidebar() {
  return (
    <aside className="w-48 shrink-0 border-r border-[#1f1f23] bg-[#0c0c10] flex flex-col">
      <div className="px-5 py-4 border-b border-[#1f1f23]">
        <Link href="/" className="text-base font-semibold tracking-tight text-white">
          lore
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        <SidebarItem href="/" label="Today" />
        <SidebarItem href="/search" label="Search" />

        <div className="pt-6 pb-1 px-2">
          <span className="text-[11px] uppercase tracking-wider text-zinc-600 font-medium">
            Knowledge
          </span>
        </div>
        <SidebarItem href="/skills" label="Skills" dot />
        <SidebarItem href="/snippets" label="Code" dot />
        <SidebarItem href="/links" label="Links" dot />

        <div className="pt-6 pb-1 px-2">
          <span className="text-[11px] uppercase tracking-wider text-zinc-600 font-medium">
            Sources
          </span>
        </div>
        <SidebarItem href="/sources/kilo" label="Kilo Code" dot />
        <SidebarItem href="/sources/codex" label="Codex" dot />
        <SidebarItem href="/sources/claude" label="Claude" dot />
        <SidebarItem href="/sources/github" label="GitHub" dot disabled />

        <div className="pt-6 pb-1 px-2">
          <span className="text-[11px] uppercase tracking-wider text-zinc-600 font-medium">
            Export
          </span>
        </div>
        <a
          href="/api/export"
          className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-all duration-150 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30"
        >
          <span className="w-1 h-1 rounded-full bg-zinc-600" />
          Markdown
        </a>

        <div className="pt-6 pb-1 px-2">
          <span className="text-[11px] uppercase tracking-wider text-zinc-600 font-medium">
            Settings
          </span>
        </div>
        <SidebarItem href="/settings" label="Configure" />
      </nav>

      <div className="px-4 py-3 border-t border-[#1f1f23] flex items-center gap-2 text-xs text-zinc-500">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        Kilo synced
      </div>
    </aside>
  );
}

function SidebarItem({
  href,
  label,
  dot,
  disabled,
}: {
  href: string;
  label: string;
  dot?: boolean;
  disabled?: boolean;
}) {
  const active = false;

  return (
    <Link
      href={disabled ? "#" : href}
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-all duration-150
        ${disabled ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}
        ${
          active
            ? "bg-zinc-800/50 text-white"
            : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30"
        }
      `}
    >
      {dot && <span className="w-1 h-1 rounded-full bg-zinc-600" />}
      {label}
    </Link>
  );
}
