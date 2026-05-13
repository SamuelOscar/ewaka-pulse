import { useState, useEffect } from 'react'
import { getStaff } from '../api/client'
import Layout from '../components/Layout'
import { Search } from 'lucide-react'

const statusColours = {
  active:   'bg-green-100 text-green-700',
  on_leave: 'bg-yellow-100 text-yellow-700',
  resigned: 'bg-red-100 text-red-700',
  retired:  'bg-gray-100 text-gray-600',
}

export default function Staff() {
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    getStaff()
      .then(res => setStaff(res.data))
      .catch(() => setError('Failed to load staff.'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = staff.filter(s =>
    s.full_name.toLowerCase().includes(search.toLowerCase()) ||
    s.staff_code.toLowerCase().includes(search.toLowerCase()) ||
    s.role_title?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Layout>
      <div className="p-8">
        <div className="print-header">
          <h1 style={{ fontSize: '18pt', fontWeight: 'bold', marginBottom: '4pt' }}>
            Africa Ewaka Village — Testimony Africa NGO
          </h1>
          <h2 style={{ fontSize: '14pt', marginBottom: '4pt' }}>Staff Register</h2>
          <p style={{ fontSize: '10pt' }}>
            Printed on {new Date().toLocaleDateString('en-GB', {
              day: 'numeric', month: 'long', year: 'numeric',
            })}
          </p>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Staff</h1>
            <p className="text-gray-500 text-sm mt-1">
              {staff.length} staff members registered
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="no-print flex items-center gap-2 bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            🖨️ Print Staff List
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, code or role..."
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

        {loading ? (
          <div className="text-center py-16 text-gray-400 text-sm">Loading staff...</div>
        ) : (
          <>
            {/* Screen view — cards */}
            <div className="grid gap-4 no-print">
              {filtered.length === 0 ? (
                <div className="text-center py-16 text-gray-400 text-sm">
                  {search ? 'No staff match your search.' : 'No staff registered yet.'}
                </div>
              ) : (
                filtered.map(member => (
                  <div key={member.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-5">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg flex-shrink-0 ${
                      member.employment_type === 'volunteer' ? 'bg-purple-100 text-purple-700' : 'bg-brand-100 text-brand-700'
                    }`}>
                      {member.full_name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900">{member.full_name}</p>
                        <span className="font-mono text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">{member.staff_code}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusColours[member.status]}`}>
                          {member.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 flex-wrap">
                        <span className="text-sm text-gray-500">{member.role_title || '—'}</span>
                        <span className="text-xs text-gray-400">{member.department}</span>
                        <span className="text-xs text-gray-400 capitalize">{member.employment_type.replace('_', ' ')}</span>
                        {member.contact_phone && (
                          <span className="text-xs text-gray-400">{member.contact_phone}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-gray-400">Joined</p>
                      <p className="text-sm text-gray-600">{member.date_joined || '—'}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Print view — table */}
            <div className="print-only">
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10pt' }}>
                <thead>
                  <tr style={{ background: '#f0f0f0' }}>
                    <th style={{ border: '1pt solid #ccc', padding: '6pt', textAlign: 'left' }}>Staff Code</th>
                    <th style={{ border: '1pt solid #ccc', padding: '6pt', textAlign: 'left' }}>Full Name</th>
                    <th style={{ border: '1pt solid #ccc', padding: '6pt', textAlign: 'left' }}>Role</th>
                    <th style={{ border: '1pt solid #ccc', padding: '6pt', textAlign: 'left' }}>Department</th>
                    <th style={{ border: '1pt solid #ccc', padding: '6pt', textAlign: 'left' }}>Type</th>
                    <th style={{ border: '1pt solid #ccc', padding: '6pt', textAlign: 'left' }}>Contact</th>
                    <th style={{ border: '1pt solid #ccc', padding: '6pt', textAlign: 'left' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(member => (
                    <tr key={member.id}>
                      <td style={{ border: '1pt solid #ccc', padding: '6pt', fontFamily: 'monospace' }}>{member.staff_code}</td>
                      <td style={{ border: '1pt solid #ccc', padding: '6pt' }}>{member.full_name}</td>
                      <td style={{ border: '1pt solid #ccc', padding: '6pt' }}>{member.role_title || '—'}</td>
                      <td style={{ border: '1pt solid #ccc', padding: '6pt' }}>{member.department || '—'}</td>
                      <td style={{ border: '1pt solid #ccc', padding: '6pt', textTransform: 'capitalize' }}>{member.employment_type.replace('_', ' ')}</td>
                      <td style={{ border: '1pt solid #ccc', padding: '6pt' }}>{member.contact_phone || '—'}</td>
                      <td style={{ border: '1pt solid #ccc', padding: '6pt', textTransform: 'capitalize' }}>{member.status.replace('_', ' ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}