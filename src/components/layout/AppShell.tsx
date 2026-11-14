import React from 'react';
import {
  BarChart3,
  BookOpen,
  ClipboardCheck,
  FileText,
  FolderKanban,
  Home,
  LogOut,
  UserCircle,
} from 'lucide-react';
import {useAuth} from '../../context/AuthContext';

export type NavRoute =
  | 'dashboard'
  | 'modules'
  | 'quizzes'
  | 'progress'
  | 'profile'
  | 'admin-curriculum'
  | 'admin-materials'
  | 'admin-quizzes'
  | 'admin-students';

interface NavItem {
  id: NavRoute;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{className?: string}>;
}

const STUDENT_NAV: NavItem[] = [
  {id: 'dashboard', label: 'Papan Pemuka', shortLabel: 'Utama', icon: Home},
  {id: 'modules', label: 'Modul Pembelajaran', shortLabel: 'Modul', icon: BookOpen},
  {id: 'quizzes', label: 'Kuiz Interaktif', shortLabel: 'Kuiz', icon: ClipboardCheck},
  {id: 'profile', label: 'Profil Saya', shortLabel: 'Profil', icon: UserCircle},
];

const ADMIN_NAV: NavItem[] = [
  {id: 'dashboard', label: 'Dashboard Admin', shortLabel: 'Utama', icon: Home},
  {id: 'admin-curriculum', label: 'Modul & Topik', shortLabel: 'Kurikulum', icon: FolderKanban},
  {id: 'admin-materials', label: 'Bahan Pembelajaran', shortLabel: 'Bahan', icon: FileText},
  {id: 'admin-quizzes', label: 'Pengurusan Kuiz', shortLabel: 'Kuiz', icon: ClipboardCheck},
  {id: 'admin-students', label: 'Rekod Kemajuan', shortLabel: 'Kemajuan', icon: BarChart3},
  {id: 'modules', label: 'Pratonton Pelajar', shortLabel: 'Pratonton', icon: BookOpen},
  {id: 'profile', label: 'Profil Admin', shortLabel: 'Profil', icon: UserCircle},
];

interface AppShellProps {
  activeRoute: NavRoute;
  onNavigate: (route: NavRoute) => void;
  breadcrumb: string;
  children: React.ReactNode;
}

export function AppShell({
  activeRoute,
  onNavigate,
  breadcrumb,
  children,
}: AppShellProps) {
  const {profile, isAdminUser, signOut} = useAuth();
  const isAdmin = isAdminUser || profile?.role === 'ADMIN';
  const navItems = isAdmin ? ADMIN_NAV : STUDENT_NAV;
  const mobileItems = navItems.slice(0, 5);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r border-slate-200 bg-white">
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5">
          <div>
            <p className="text-lg font-bold tracking-tight text-emerald-900">
              I-KNOW
            </p>
            <p className="text-[11px] font-medium text-amber-700">
              ILMU • AMALAN • PENGHAYATAN
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-5">
          <p className="px-3 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            {isAdmin ? 'Panel Pentadbir' : 'Menu Pembelajaran'}
          </p>
          <nav className="mt-2 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeRoute === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-900'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      isActive ? 'text-emerald-700' : 'text-slate-400'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-slate-200 p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">
                {profile?.full_name || 'Pengguna'}
              </p>
              <p className="truncate text-xs text-slate-500">
                Peranan: {profile?.role || 'PELAJAR'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => signOut()}
              title="Log Keluar"
              className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 hover:text-red-700 transition-colors shrink-0"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col lg:pl-64 pb-20 lg:pb-0">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white/95 backdrop-blur px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 min-w-0">
            <span className="lg:hidden text-base font-bold text-emerald-900 whitespace-nowrap shrink-0">
              I-KNOW
            </span>
            <span className="hidden lg:inline text-sm font-medium text-slate-500 truncate">
              Pusat Pembelajaran Ilmu Islam
            </span>
            <span aria-hidden="true" className="text-slate-300">
              /
            </span>
            <span className="text-sm font-semibold text-slate-900 truncate">
              {breadcrumb}
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="hidden sm:inline text-xs font-medium text-slate-600">
              {profile?.full_name} · {profile?.role === 'ADMIN' ? 'Admin' : 'Pelajar'}
            </span>
            <button
              type="button"
              onClick={() => onNavigate('profile')}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              Akaun
            </button>
            <button
              type="button"
              onClick={() => signOut()}
              className="lg:hidden inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              <LogOut className="h-3.5 w-3.5" />
              Keluar
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-slate-200 bg-white">
        <div className={`grid ${mobileItems.length === 4 ? 'grid-cols-4' : 'grid-cols-5'}`}>
          {mobileItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeRoute === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`flex min-h-[56px] flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-medium transition-colors ${
                  isActive ? 'text-emerald-800' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate max-w-full">{item.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
