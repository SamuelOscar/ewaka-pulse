import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard,
  Baby,
  ClipboardCheck,
  GraduationCap,
  Users,
  LogOut,
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

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const visibleNav = navItems.filter(item => hasRole(...item.roles))

  return (
    <div className="flex min-h-screen bg-gray-50">

      {/* Sidebar */}
      <aside className="w-64 bg-brand-900 text-white flex flex-col fixed h-full z-10">

        {/* Logo */}
        <div className="p-5 border-b border-brand-800">
          <div className="flex items-center gap-3">
            <img
              src="/ewaka-logo.png"
              alt="Africa Ewaka Village"
              className="w-10 h-10 rounded-lg object-cover"
              onError={(e) => {
                e.target.style.display = 'none'
                e.target.nextSibling.style.display = 'flex'
              }}
            />
            <div
              className="w-10 h-10 bg-ewaka-red rounded-lg items-center justify-center font-bold text-sm hidden"
            >
              AE
            </div>
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
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors ${
                  active
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
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-64 min-h-screen">
        {children}
      </main>
    </div>
  )
}