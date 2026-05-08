import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: '📊', roles: ['admin', 'manager', 'teacher', 'counselor', 'operations', 'finance'] },
  { path: '/children', label: 'Children', icon: '👶', roles: ['admin', 'manager', 'teacher', 'counselor'] },
  { path: '/attendance', label: 'Attendance', icon: '✅', roles: ['admin', 'teacher', 'manager'] },
  { path: '/grades', label: 'Grades', icon: '📝', roles: ['admin', 'teacher', 'manager'] },
  { path: '/staff', label: 'Staff', icon: '👥', roles: ['admin', 'manager'] },
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
      <aside className="w-64 bg-brand-900 text-white flex flex-col fixed h-full">
        <div className="p-6 border-b border-brand-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center font-bold text-sm">
              EP
            </div>
            <div>
              <p className="font-bold text-sm">Ewaka-Pulse</p>
              <p className="text-brand-300 text-xs">Testimony Africa NGO</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {visibleNav.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors ${
                location.pathname.startsWith(item.path)
                  ? 'bg-brand-600 text-white font-medium'
                  : 'text-brand-200 hover:bg-brand-800 hover:text-white'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-brand-800">
          <div className="mb-3">
            <p className="text-sm font-medium text-white">{user?.username}</p>
            <p className="text-xs text-brand-300 capitalize">{user?.role}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full text-left text-xs text-brand-300 hover:text-white transition-colors py-1"
          >
            Sign out →
          </button>
        </div>
      </aside>

      <main className="flex-1 ml-64 p-8">
        {children}
      </main>
    </div>
  )
}