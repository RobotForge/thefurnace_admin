'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, FlaskConical, Search,
  Megaphone, Globe, ListChecks, LogOut, Zap, FileSearch,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const NAV = [
  { href: '/',                label: 'Overview',       icon: LayoutDashboard },
  { href: '/users',           label: 'Users',          icon: Users           },
  { href: '/experiments',     label: 'Experiments',    icon: FlaskConical    },
  { href: '/leads',           label: 'Leads',          icon: Search          },
  { href: '/lead-discovery',  label: 'Lead Discovery', icon: Zap             },
  { href: '/landing-pages',   label: 'Landing Pages',  icon: Globe           },
  { href: '/outreach-test',   label: 'Outreach Test',  icon: Megaphone       },
  { href: '/problem-scans',   label: 'Problem Scans',  icon: FileSearch      },
  { href: '/waitlist',        label: 'Waitlist',       icon: ListChecks      },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="w-56 flex-shrink-0 bg-[#0A0A0A] border-r border-[#1E1E1E] flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[#1E1E1E]">
        <span className="text-xs font-bold text-white tracking-widest uppercase">RobotForge</span>
        <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">ADMIN</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                active
                  ? 'bg-[#3B82F6]/10 text-[#3B82F6] border border-[#3B82F6]/20'
                  : 'text-gray-500 hover:text-white hover:bg-[#1A1A1A]'
              }`}
            >
              <Icon size={13} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User + logout */}
      <div className="px-3 py-4 border-t border-[#1E1E1E]">
        <div className="px-3 py-2 mb-1">
          <p className="text-[10px] text-gray-600 truncate">{user?.email}</p>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <LogOut size={13} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
