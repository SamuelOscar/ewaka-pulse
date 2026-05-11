import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard, Baby, ClipboardCheck,
  GraduationCap, Users, LogOut, Menu, X,
} from 'lucide-react'

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'manager', 'teacher', 'counselor', 'operations', 'finance'] },
  { path: '/children', label: 'Children', icon: Baby, roles: ['admin', 'manager', 'teacher', 'counselor'] },
  { path: '/attendance', label: 'Attendance', icon: ClipboardCheck, roles: ['admin', 'teacher', 'manager'] },
  { path: '/grades', label: 'Grades', icon: GraduationCap, roles: ['admin', 'teacher', 'manager'] },
  { path: '/staff', label: 'Staff', icon: Users, roles: ['admin', 'manager'] },
]

export default function Layout({ children }) {
  const { user, logout, hasRole } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const visibleNav = navItems.filter(item => hasRole(...item.roles))

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="p-5 border-b border-brand-800">
        <div className="flex items-center gap-3">
          <img
            src="/ewaka-logo.png"
            alt="Africa Ewaka Village"
            className="w-10 h-10 rounded-lg object-cover"
            onError={e => { e.target.style.display = 'none' }}
          />
          <div>
            <p className="font-bold text-sm leading-tight">Africa Ewaka</p>
            <p className="text-brand-300 text-xs">Testimony Africa NGO</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {visibleNav.map(item => {
          const Icon = item.icon
          const active = location.pathname.startsWith(item.path)
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors ${active
                  ? 'bg-brand-600 text-white font-medium'
                  : 'text-brand-200 hover:bg-brand-800 hover:text-white'
                }`}
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* User + Logout */}
      <div className="p-4 border-t border-brand-800">
        <div className="mb-3">
          <p className="text-sm font-medium text-white">{user?.username}</p>
          <p className="text-xs text-brand-300 capitalize">{user?.role}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-xs text-brand-300 hover:text-white transition-colors py-1"
        >
          <LogOut size={13} />
          Sign out
        </button>
      </div>
    </>
  )

  return (
    <div className="flex min-h-screen bg-gray-50">

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 bg-brand-900 text-white flex-col fixed h-full z-10">
        {sidebarContent}
      </aside>

      {/* Mobile Hamburger */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-20 bg-brand-900 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src="/ewaka-logo.png"
            alt="Ewaka"
            className="w-8 h-8 rounded-lg object-cover"
            onError={e => { e.target.style.display = 'none' }}
          />
          <span className="font-bold text-sm">Africa Ewaka</span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="text-white p-1"
        >
          {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-10 bg-black bg-opacity-50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <aside className={`lg:hidden fixed top-0 left-0 h-full w-64 bg-brand-900 text-white flex flex-col z-20 transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
        {sidebarContent}
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 min-h-screen pt-14 lg:pt-0">
        {children}
      </main>
    </div>
  )
}