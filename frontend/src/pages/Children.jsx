import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getChildren } from '../api/client'
import Layout from '../components/Layout'
import { Search, Plus, ChevronRight } from 'lucide-react'

const statusColours = {
  active:      'bg-green-100 text-green-700',
  alumni:      'bg-blue-100 text-blue-700',
  transferred: 'bg-yellow-100 text-yellow-700',
  withdrawn:   'bg-red-100 text-red-700',
}

function getAge(dob) {
  const diff = Date.now() - new Date(dob).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))
}

export default function Children() {
  const { hasRole } = useAuth()
  const navigate = useNavigate()
  const [children, setChildren] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const res = await getChildren()
        setChildren(res.data)
      } catch {
        setError('Failed to load children.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = children.filter(c =>
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    c.child_code.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Layout>
      <div className="p-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Children</h1>
            <p className="text-gray-500 text-sm mt-1">
              {children.length} registered beneficiaries
            </p>
          </div>
          {hasRole('admin') && (
            <button
              onClick={() => navigate('/children/new')}
              className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus size={16} />
              Register Child
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or EP code..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-gray-400 text-sm">Loading children...</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-gray-400 text-sm">
              {search ? 'No children match your search.' : 'No children registered yet.'}
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Child</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Code</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Age</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Class</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(child => (
                  <tr
                    key={child.id}
                    onClick={() => navigate(`/children/${child.id}`)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-sm flex-shrink-0">
                          {child.full_name.charAt(0)}
                        </div>
                        <span className="font-medium text-gray-900 text-sm">{child.full_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {child.child_code}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {getAge(child.date_of_birth)} yrs
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {child.class_grade || '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium capitalize ${statusColours[child.status] || 'bg-gray-100 text-gray-600'}`}>
                        {child.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-300">
                      <ChevronRight size={16} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Layout>
  )
}