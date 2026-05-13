import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getChild, getChildAttendance, getChildGrades, getChildActivities, getChildBiometrics } from '../api/client'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { ArrowLeft, User, Home, BookOpen, CheckCircle, XCircle, Clock, AlertCircle, Activity, Heart, Shield } from 'lucide-react'

const statusColours = {
  active: 'bg-green-100 text-green-700',
  alumni: 'bg-blue-100 text-blue-700',
  transferred: 'bg-yellow-100 text-yellow-700',
  withdrawn: 'bg-red-100 text-red-700',
}

const attendanceIcons = {
  present: <CheckCircle size={14} className="text-green-500" />,
  absent: <XCircle size={14} className="text-red-500" />,
  late: <Clock size={14} className="text-yellow-500" />,
  excused: <AlertCircle size={14} className="text-blue-500" />,
}

function getAge(dob) {
  return Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900 text-right max-w-[60%]">{value || '—'}</span>
    </div>
  )
}

export default function ChildDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [child, setChild] = useState(null)
  const [attendance, setAttendance] = useState(null)
  const [grades, setGrades] = useState(null)
  const [activities, setActivities] = useState(null)
  const [activeTab, setActiveTab] = useState('profile')
  const [loading, setLoading] = useState(true)
  const { hasRole } = useAuth()
  const [biometrics, setBiometrics] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const promises = [
          getChild(id),
          getChildAttendance(id),
          getChildGrades(id),
          getChildActivities(id),
        ]

        const [childRes, attendanceRes, gradesRes, activitiesRes] = await Promise.all(promises)
        setChild(childRes.data)
        setAttendance(attendanceRes.data)
        setGrades(gradesRes.data)
        setActivities(activitiesRes.data)

        // Load biometrics only for admin/counselor
        const userData = localStorage.getItem('ewaka_user')
        if (userData) {
          const user = JSON.parse(userData)
          if (['admin', 'counselor'].includes(user.role)) {
            const bioRes = await getChildBiometrics(id)
            setBiometrics(bioRes.data)
          } else {
            setBiometrics(null)
          }
        } else {
          setBiometrics(null)
        }
      } catch {
        navigate('/children')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  if (loading) {
    return (
      <Layout>
        <div className="p-8 text-center text-gray-400 text-sm py-16">Loading profile...</div>
      </Layout>
    )
  }

  if (!child) return null

  return (
    <Layout>
      <div className="p-8 max-w-4xl">

        {/* Back button */}
        <button
          onClick={() => navigate('/children')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Children
        </button>

        {/* Profile Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-2xl flex-shrink-0">
              {child.full_name.charAt(0)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-bold text-gray-900">{child.full_name}</h1>
                <span className="font-mono text-xs bg-gray-800 text-white px-2 py-1 rounded">
                  {child.child_code}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${statusColours[child.status]}`}>
                  {child.status}
                </span>
              </div>
              <p className="text-gray-500 text-sm mt-1">
                {getAge(child.date_of_birth)} years old · {child.gender} · {child.nationality || 'Ugandan'}
              </p>
              {attendance && (
                <p className="text-sm mt-1">
                  <span className={`font-semibold ${attendance.attendance_rate >= 80 ? 'text-green-600' : 'text-red-500'}`}>
                    {attendance.attendance_rate}% attendance rate
                  </span>
                  {attendance.attendance_flag && (
                    <span className="ml-2 text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
                      ⚠ Below threshold
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit flex-wrap">
          {[
            { key: 'profile', label: 'Profile', icon: User },
            { key: 'attendance', label: 'Attendance', icon: CheckCircle },
            { key: 'grades', label: 'Grades', icon: BookOpen },
            { key: 'activities', label: 'Activities', icon: Activity },
            ...(hasRole('admin', 'counselor') ? [{ key: 'health', label: 'Health', icon: Heart }] : []),
          ].map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab.key
                    ? 'bg-white text-brand-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <User size={15} className="text-brand-600" />
                Basic Details
              </h3>
              <InfoRow label="Date of Birth" value={child.date_of_birth} />
              <InfoRow label="Gender" value={child.gender} />
              <InfoRow label="Nationality" value={child.nationality} />
              <InfoRow label="Class / Grade" value={child.class_grade} />
              <InfoRow label="Date of Arrival" value={child.date_of_arrival} />
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Home size={15} className="text-brand-600" />
                Guardian & Village
              </h3>
              <InfoRow label="Guardian Name" value={child.guardian_name} />
              <InfoRow label="Guardian Contact" value={child.guardian_contact} />
              <InfoRow label="Village" value={child.village?.name} />
              <InfoRow label="Status" value={child.status} />
            </div>
          </div>
        )}

        {/* Attendance Tab */}
        {activeTab === 'attendance' && attendance && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{attendance.attendance_rate}%</p>
                  <p className="text-xs text-gray-500">Attendance Rate</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{attendance.present}</p>
                  <p className="text-xs text-gray-500">Present</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-500">{attendance.absent}</p>
                  <p className="text-xs text-gray-500">Absent</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-yellow-500">{attendance.late}</p>
                  <p className="text-xs text-gray-500">Late</p>
                </div>
              </div>
            </div>
            <div className="divide-y divide-gray-50">
              {attendance.records?.length > 0 ? (
                attendance.records.map((r, i) => (
                  <div key={i} className="px-6 py-3 flex items-center justify-between">
                    <span className="text-sm text-gray-600">{r.date}</span>
                    <div className="flex items-center gap-2">
                      {attendanceIcons[r.status]}
                      <span className="text-sm capitalize text-gray-700">{r.status}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-6 py-8 text-center text-gray-400 text-sm">
                  No attendance records yet
                </div>
              )}
            </div>
          </div>
        )}

        {/* Grades Tab */}
        {activeTab === 'grades' && grades && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            {grades.grades?.length > 0 ? (
              <>
                <div className="px-6 py-4 border-b border-gray-100">
                  <p className="text-sm text-gray-500">{grades.total_grades} grade records for {grades.child_name}</p>
                </div>
                <div className="divide-y divide-gray-50">
                  {grades.grades.map(g => (
                    <div key={g.id} className="px-6 py-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{g.subject}</p>
                        <p className="text-xs text-gray-400 capitalize">{g.term.replace('_', ' ')} · {g.academic_year}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">{g.score}/{g.max_score}</p>
                        <p className={`text-xs font-medium ${g.percentage >= 70 ? 'text-green-600' : g.percentage >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>
                          {g.percentage}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="py-16 text-center text-gray-400 text-sm">
                No grades recorded yet
              </div>
            )}
          </div>
        )}

        {/* Activities Tab */}
        {activeTab === 'activities' && activities && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{activities.total_activities}</p>
                  <p className="text-xs text-gray-500">Total Activities</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-brand-600">{activities.sports_and_arts}</p>
                  <p className="text-xs text-gray-500">Sports & Arts</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">{activities.vocational}</p>
                  <p className="text-xs text-gray-500">Vocational</p>
                </div>
              </div>
            </div>
            <div className="divide-y divide-gray-50">
              {activities.activities?.length > 0 ? (
                activities.activities.map((a, i) => (
                  <div key={i} className="px-6 py-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 text-sm capitalize">
                        {a.activity_type.replace(/_/g, ' ')}
                        {a.activity_name && ` — ${a.activity_name}`}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{a.activity_date}</p>
                      {a.instructor_notes && (
                        <p className="text-xs text-gray-500 italic mt-1">{a.instructor_notes}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${a.participation_level === 'leader'
                          ? 'bg-purple-100 text-purple-700'
                          : a.participation_level === 'active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                        {a.participation_level}
                      </span>
                      {a.vocational_status && (
                        <p className="text-xs text-gray-400 mt-1 capitalize">
                          {a.vocational_status.replace(/_/g, ' ')}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-6 py-8 text-center text-gray-400 text-sm">
                  No activities recorded yet
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'health' && hasRole('admin', 'counselor') && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
              <Shield size={15} className="text-red-500" />
              <h3 className="font-semibold text-gray-800">Health Records</h3>
              <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full ml-auto">
                SENSITIVE
              </span>
            </div>
            {!biometrics || biometrics.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-400 text-sm">
                No health records yet
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {biometrics.map((r, i) => (
                  <div key={i} className="px-6 py-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-gray-900 text-sm">{r.record_date}</p>
                      {r.next_checkup_date && (
                        <p className="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
                          Next checkup: {r.next_checkup_date}
                        </p>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                      {r.height_cm && (
                        <div className="bg-gray-50 rounded-lg p-3 text-center">
                          <p className="text-lg font-bold text-gray-900">{r.height_cm}</p>
                          <p className="text-xs text-gray-500">Height (cm)</p>
                        </div>
                      )}
                      {r.weight_kg && (
                        <div className="bg-gray-50 rounded-lg p-3 text-center">
                          <p className="text-lg font-bold text-gray-900">{r.weight_kg}</p>
                          <p className="text-xs text-gray-500">Weight (kg)</p>
                        </div>
                      )}
                      {r.blood_type && (
                        <div className="bg-red-50 rounded-lg p-3 text-center">
                          <p className="text-lg font-bold text-red-700">{r.blood_type}</p>
                          <p className="text-xs text-gray-500">Blood Type</p>
                        </div>
                      )}
                      {r.allergies && (
                        <div className="bg-yellow-50 rounded-lg p-3 text-center">
                          <p className="text-sm font-medium text-yellow-800">{r.allergies}</p>
                          <p className="text-xs text-gray-500">Allergies</p>
                        </div>
                      )}
                    </div>
                    {r.health_notes && (
                      <p className="text-sm text-gray-600 mt-3 bg-gray-50 rounded-lg p-3 italic">
                        {r.health_notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  )
}