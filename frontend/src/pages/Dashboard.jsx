import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getDashboardSummary, getAttendanceSummary, getUpcomingBirthdays } from '../api/client'
import Layout from '../components/Layout'
import { Cake } from 'lucide-react'

function StatCard({ label, value, sub, color }) {
  return (
    <div className={`bg-white rounded-xl border-l-4 ${color} p-6 shadow-sm`}>
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="text-3xl font-bold text-gray-900">{value ?? '—'}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

function BirthdayWidget({ birthdays }) {
  if (!birthdays || birthdays.total_upcoming === 0) return null

  return (
    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-5 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Cake size={18} className="text-yellow-600" />
        <h3 className="font-semibold text-yellow-800">
          Upcoming Birthdays
          {birthdays.birthdays_today > 0 && (
            <span className="ml-2 text-xs bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full font-bold">
              {birthdays.birthdays_today} TODAY! 🎉
            </span>
          )}
        </h3>
      </div>
      <div className="space-y-2">
        {birthdays.upcoming.map((b, i) => (
          <div
            key={i}
            className={`flex items-center justify-between p-3 rounded-lg ${b.is_today
                ? 'bg-yellow-200 border border-yellow-300'
                : 'bg-white border border-yellow-100'
              }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${b.is_today
                  ? 'bg-yellow-400 text-yellow-900'
                  : 'bg-yellow-100 text-yellow-700'
                }`}>
                {b.is_today ? '🎂' : b.full_name.charAt(0)}
              </div>
              <div>
                <p className="font-medium text-gray-900 text-sm">{b.full_name}</p>
                <p className="text-xs text-gray-500">
                  Turning {b.turning_age} · {b.child_code}
                </p>
              </div>
            </div>
            <div className="text-right">
              {b.is_today ? (
                <span className="text-sm font-bold text-yellow-700">🎉 Today!</span>
              ) : (
                <span className="text-sm text-gray-500">
                  in {b.days_until} day{b.days_until !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [summary, setSummary] = useState(null)
  const [attendance, setAttendance] = useState(null)
  const [birthdays, setBirthdays] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const [summaryRes, attendanceRes, birthdayRes] = await Promise.all([
          getDashboardSummary(),
          getAttendanceSummary(),
          getUpcomingBirthdays(),
        ])
        setSummary(summaryRes.data)
        setAttendance(attendanceRes.data)
        setBirthdays(birthdayRes.data)
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
      <div className="p-8">
        {/* Header */}
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
          <div className="text-center py-16 text-gray-400 text-sm">
            Loading dashboard...
          </div>
        ) : (
          <>
            {/* Birthday Alert Widget */}
            <BirthdayWidget birthdays={birthdays} />

            {/* KPI Cards */}
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
                sub="Full-time and volunteers"
                color="border-purple-500"
              />
            </div>

            {/* Recent Registrations */}
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
      </div>
    </Layout>
  )
}