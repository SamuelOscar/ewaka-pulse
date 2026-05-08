import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getDashboardSummary, getAttendanceSummary } from '../api/client'
import Layout from '../components/Layout'

function StatCard({ label, value, sub, color }) {
  return (
    <div className={`bg-white rounded-xl border-l-4 ${color} p-6 shadow-sm`}>
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="text-3xl font-bold text-gray-900">{value ?? '—'}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [summary, setSummary] = useState(null)
  const [attendance, setAttendance] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const [summaryRes, attendanceRes] = await Promise.all([
          getDashboardSummary(),
          getAttendanceSummary(),
        ])
        setSummary(summaryRes.data)
        setAttendance(attendanceRes.data)
      } catch {
        setError('Failed to load dashboard data.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.username} 👋
        </h1>
        <p className="text-gray-500 text-sm mt-1">{today}</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Loading dashboard...</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-6 mb-8 lg:grid-cols-4">
            <StatCard
              label="Active Children"
              value={summary?.children?.total_active}
              sub={`${summary?.children?.registered_this_month ?? 0} registered this month`}
              color="border-blue-500"
            />
            <StatCard
              label="Present Today"
              value={attendance?.present}
              sub={`${attendance?.attendance_rate ?? 0}% attendance rate`}
              color="border-green-500"
            />
            <StatCard
              label="Absent Today"
              value={attendance?.absent}
              sub={`${attendance?.late ?? 0} late, ${attendance?.excused ?? 0} excused`}
              color="border-red-400"
            />
            <StatCard
              label="Active Staff"
              value={summary?.staff?.total_active}
              sub="Full-time and part-time"
              color="border-purple-500"
            />
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">Recent Registrations</h2>
              <button
                onClick={() => navigate('/children')}
                className="text-sm text-brand-600 hover:text-brand-700 font-medium"
              >
                View all →
              </button>
            </div>
            <div className="divide-y divide-gray-50">
              {summary?.recent_registrations?.length > 0 ? (
                summary.recent_registrations.map((child, i) => (
                  <div
                    key={i}
                    className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate('/children')}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-sm">
                        {child.full_name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{child.full_name}</p>
                        <p className="text-xs text-gray-400">{child.class_grade || 'No class assigned'}</p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400 font-mono">{child.child_code}</span>
                  </div>
                ))
              ) : (
                <div className="px-6 py-8 text-center text-gray-400 text-sm">
                  No children registered yet
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </Layout>
  )
}