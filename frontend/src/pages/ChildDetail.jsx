import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getChild, getChildAttendance, getChildGrades, getChildActivities, getChildBiometrics, updateChild, updateGrade } from '../api/client'
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
  const [editingProfile, setEditingProfile] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [editError, setEditError] = useState('')
  const [editSuccess, setEditSuccess] = useState('')
  const [editingGrade, setEditingGrade] = useState(null)
  const [gradeEditForm, setGradeEditForm] = useState({})

  const handleProfileSave = async () => {
    setEditError('')
    setEditSuccess('')
    try {
      await updateChild(id, editForm)
      setEditSuccess('Profile updated successfully')
      setEditingProfile(false)
      const res = await getChild(id)
      setChild(res.data)
    } catch (err) {
      setEditError(err.response?.data?.detail || 'Failed to update profile.')
    }
  }

  const handleGradeSave = async (gradeId) => {
    try {
      await updateGrade(gradeId, gradeEditForm)
      setEditingGrade(null)
      const res = await getChildGrades(id)
      setGrades(res.data)
    } catch (err) {
      console.error('Grade update failed', err)
    }
  }

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
        <div className="no-print">
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
            {/* Print button */}
            <button
              type="button"
              onClick={() => window.print()}
              className="no-print flex items-center gap-2 bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex-shrink-0"
            >
              🖨️ Print Record
            </button>
          </div>
        </div>
        </div>

        {/* PRINT ONLY SECTION — full student record */}
        <div className="print-only" style={{ fontFamily: 'serif' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', borderBottom: '2pt solid black', paddingBottom: '12pt', marginBottom: '16pt' }}>
            <h1 style={{ fontSize: '18pt', fontWeight: 'bold', margin: '0 0 4pt 0' }}>
              Africa Ewaka Village
            </h1>
            <h2 style={{ fontSize: '13pt', fontWeight: 'normal', margin: '0 0 4pt 0' }}>
              Testimony Africa NGO — Student Record
            </h2>
            <p style={{ fontSize: '10pt', color: '#555', margin: 0 }}>
              Printed: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>

          {/* Student identity */}
          <table style={{ width: '100%', marginBottom: '14pt', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ padding: '4pt 8pt', fontWeight: 'bold', width: '30%', background: '#f5f5f5', border: '1pt solid #ccc' }}>Student Name</td>
                <td style={{ padding: '4pt 8pt', border: '1pt solid #ccc' }}>{child.full_name}</td>
                <td style={{ padding: '4pt 8pt', fontWeight: 'bold', width: '20%', background: '#f5f5f5', border: '1pt solid #ccc' }}>Student Code</td>
                <td style={{ padding: '4pt 8pt', fontFamily: 'monospace', border: '1pt solid #ccc' }}>{child.child_code}</td>
              </tr>
              <tr>
                <td style={{ padding: '4pt 8pt', fontWeight: 'bold', background: '#f5f5f5', border: '1pt solid #ccc' }}>Date of Birth</td>
                <td style={{ padding: '4pt 8pt', border: '1pt solid #ccc' }}>{child.date_of_birth}</td>
                <td style={{ padding: '4pt 8pt', fontWeight: 'bold', background: '#f5f5f5', border: '1pt solid #ccc' }}>Gender</td>
                <td style={{ padding: '4pt 8pt', border: '1pt solid #ccc', textTransform: 'capitalize' }}>{child.gender}</td>
              </tr>
              <tr>
                <td style={{ padding: '4pt 8pt', fontWeight: 'bold', background: '#f5f5f5', border: '1pt solid #ccc' }}>Nationality</td>
                <td style={{ padding: '4pt 8pt', border: '1pt solid #ccc' }}>{child.nationality || 'Ugandan'}</td>
                <td style={{ padding: '4pt 8pt', fontWeight: 'bold', background: '#f5f5f5', border: '1pt solid #ccc' }}>Status</td>
                <td style={{ padding: '4pt 8pt', border: '1pt solid #ccc', textTransform: 'capitalize' }}>{child.status}</td>
              </tr>
              <tr>
                <td style={{ padding: '4pt 8pt', fontWeight: 'bold', background: '#f5f5f5', border: '1pt solid #ccc' }}>Class / Grade</td>
                <td style={{ padding: '4pt 8pt', border: '1pt solid #ccc' }}>{child.class_grade || '—'}</td>
                <td style={{ padding: '4pt 8pt', fontWeight: 'bold', background: '#f5f5f5', border: '1pt solid #ccc' }}>Date of Arrival</td>
                <td style={{ padding: '4pt 8pt', border: '1pt solid #ccc' }}>{child.date_of_arrival || '—'}</td>
              </tr>
              <tr>
                <td style={{ padding: '4pt 8pt', fontWeight: 'bold', background: '#f5f5f5', border: '1pt solid #ccc' }}>Guardian Name</td>
                <td style={{ padding: '4pt 8pt', border: '1pt solid #ccc' }}>{child.guardian_name || '—'}</td>
                <td style={{ padding: '4pt 8pt', fontWeight: 'bold', background: '#f5f5f5', border: '1pt solid #ccc' }}>Guardian Contact</td>
                <td style={{ padding: '4pt 8pt', border: '1pt solid #ccc' }}>{child.guardian_contact || '—'}</td>
              </tr>
            </tbody>
          </table>

          {/* Attendance summary */}
          {attendance && (
            <>
              <h3 style={{ fontSize: '12pt', fontWeight: 'bold', borderBottom: '1pt solid black', paddingBottom: '4pt', marginBottom: '8pt' }}>
                Attendance Summary
              </h3>
              <table style={{ width: '100%', marginBottom: '14pt', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '4pt 8pt', fontWeight: 'bold', background: '#f5f5f5', border: '1pt solid #ccc', width: '25%' }}>Attendance Rate</td>
                    <td style={{ padding: '4pt 8pt', border: '1pt solid #ccc' }}>{attendance.attendance_rate}%</td>
                    <td style={{ padding: '4pt 8pt', fontWeight: 'bold', background: '#f5f5f5', border: '1pt solid #ccc', width: '25%' }}>Present</td>
                    <td style={{ padding: '4pt 8pt', border: '1pt solid #ccc' }}>{attendance.present}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4pt 8pt', fontWeight: 'bold', background: '#f5f5f5', border: '1pt solid #ccc' }}>Absent</td>
                    <td style={{ padding: '4pt 8pt', border: '1pt solid #ccc' }}>{attendance.absent}</td>
                    <td style={{ padding: '4pt 8pt', fontWeight: 'bold', background: '#f5f5f5', border: '1pt solid #ccc' }}>Late</td>
                    <td style={{ padding: '4pt 8pt', border: '1pt solid #ccc' }}>{attendance.late}</td>
                  </tr>
                </tbody>
              </table>
            </>
          )}

          {/* Grades */}
          {grades && grades.grades?.length > 0 && (
            <>
              <h3 style={{ fontSize: '12pt', fontWeight: 'bold', borderBottom: '1pt solid black', paddingBottom: '4pt', marginBottom: '8pt' }}>
                Academic Results
              </h3>
              <table style={{ width: '100%', marginBottom: '14pt', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f5f5f5' }}>
                    <th style={{ padding: '5pt 8pt', border: '1pt solid #ccc', textAlign: 'left' }}>Subject</th>
                    <th style={{ padding: '5pt 8pt', border: '1pt solid #ccc', textAlign: 'left' }}>Term</th>
                    <th style={{ padding: '5pt 8pt', border: '1pt solid #ccc', textAlign: 'left' }}>Score</th>
                    <th style={{ padding: '5pt 8pt', border: '1pt solid #ccc', textAlign: 'left' }}>Percentage</th>
                    <th style={{ padding: '5pt 8pt', border: '1pt solid #ccc', textAlign: 'left' }}>Comments</th>
                  </tr>
                </thead>
                <tbody>
                  {grades.grades.map((g, i) => (
                    <tr key={g.id ?? i}>
                      <td style={{ padding: '4pt 8pt', border: '1pt solid #ccc' }}>{g.subject}</td>
                      <td style={{ padding: '4pt 8pt', border: '1pt solid #ccc', textTransform: 'capitalize' }}>{(g.term || '').replace('_', ' ')}</td>
                      <td style={{ padding: '4pt 8pt', border: '1pt solid #ccc' }}>{g.score}/{g.max_score}</td>
                      <td style={{ padding: '4pt 8pt', border: '1pt solid #ccc' }}>{g.percentage}%</td>
                      <td style={{ padding: '4pt 8pt', border: '1pt solid #ccc', fontStyle: 'italic' }}>{g.comments || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {/* Activities */}
          {activities && activities.activities?.length > 0 && (
            <>
              <h3 style={{ fontSize: '12pt', fontWeight: 'bold', borderBottom: '1pt solid black', paddingBottom: '4pt', marginBottom: '8pt' }}>
                Activities & Engagement
              </h3>
              <table style={{ width: '100%', marginBottom: '14pt', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f5f5f5' }}>
                    <th style={{ padding: '5pt 8pt', border: '1pt solid #ccc', textAlign: 'left' }}>Activity</th>
                    <th style={{ padding: '5pt 8pt', border: '1pt solid #ccc', textAlign: 'left' }}>Date</th>
                    <th style={{ padding: '5pt 8pt', border: '1pt solid #ccc', textAlign: 'left' }}>Level</th>
                    <th style={{ padding: '5pt 8pt', border: '1pt solid #ccc', textAlign: 'left' }}>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {activities.activities.map((a, i) => (
                    <tr key={a.id ?? i}>
                      <td style={{ padding: '4pt 8pt', border: '1pt solid #ccc', textTransform: 'capitalize' }}>{(a.activity_type || '').replace(/_/g, ' ')}</td>
                      <td style={{ padding: '4pt 8pt', border: '1pt solid #ccc' }}>{a.activity_date}</td>
                      <td style={{ padding: '4pt 8pt', border: '1pt solid #ccc', textTransform: 'capitalize' }}>{a.participation_level}</td>
                      <td style={{ padding: '4pt 8pt', border: '1pt solid #ccc', fontStyle: 'italic' }}>{a.instructor_notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {/* Signature block */}
          <div style={{ marginTop: '40pt' }}>
            <table style={{ width: '100%' }}>
              <tbody>
                <tr>
                  <td style={{ width: '33%', paddingTop: '24pt', borderTop: '1pt solid black', fontSize: '10pt' }}>
                    Class Teacher Signature & Date
                  </td>
                  <td style={{ width: '33%' }}></td>
                  <td style={{ width: '33%', paddingTop: '24pt', borderTop: '1pt solid black', fontSize: '10pt' }}>
                    Program Manager Signature & Date
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="no-print">
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

            {/* Basic Details Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <User size={15} className="text-brand-600" />
                  Basic Details
                </h3>
                {hasRole('admin') && !editingProfile && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditForm({
                        full_name: child.full_name,
                        class_grade: child.class_grade || '',
                        guardian_name: child.guardian_name || '',
                        guardian_contact: child.guardian_contact || '',
                        nationality: child.nationality || '',
                        status: child.status,
                      })
                      setEditingProfile(true)
                      setEditError('')
                      setEditSuccess('')
                    }}
                    className="text-xs text-brand-600 hover:text-brand-700 border border-brand-200 px-3 py-1.5 rounded-lg"
                  >
                    ✏️ Edit
                  </button>
                )}
              </div>

              {editingProfile ? (
                <div className="space-y-3">
                  {editError && (
                    <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded">{editError}</p>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Full Name</label>
                    <input
                      value={editForm.full_name || ''}
                      onChange={e => setEditForm(p => ({ ...p, full_name: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Class / Grade</label>
                    <input
                      value={editForm.class_grade || ''}
                      onChange={e => setEditForm(p => ({ ...p, class_grade: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Nationality</label>
                    <input
                      value={editForm.nationality || ''}
                      onChange={e => setEditForm(p => ({ ...p, nationality: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                    <select
                      value={editForm.status || ''}
                      onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="active">Active</option>
                      <option value="alumni">Alumni</option>
                      <option value="transferred">Transferred</option>
                      <option value="withdrawn">Withdrawn</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Guardian Name</label>
                    <input
                      value={editForm.guardian_name || ''}
                      onChange={e => setEditForm(p => ({ ...p, guardian_name: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Guardian Contact</label>
                    <input
                      value={editForm.guardian_contact || ''}
                      onChange={e => setEditForm(p => ({ ...p, guardian_contact: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleProfileSave}
                      className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                    >
                      Save Changes
                    </button>
                    <button
                      type="button"
                      onClick={() => { setEditingProfile(false); setEditError('') }}
                      className="text-gray-500 hover:text-gray-700 border border-gray-200 px-4 py-2 rounded-lg text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {editSuccess && (
                    <p className="text-xs text-green-600 bg-green-50 px-3 py-2 rounded mb-3">{editSuccess}</p>
                  )}
                  <InfoRow label="Date of Birth" value={child.date_of_birth} />
                  <InfoRow label="Gender" value={child.gender} />
                  <InfoRow label="Nationality" value={child.nationality} />
                  <InfoRow label="Class / Grade" value={child.class_grade} />
                  <InfoRow label="Date of Arrival" value={child.date_of_arrival} />
                </>
              )}
            </div>

            {/* Guardian Card */}
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
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Subject</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Term</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Score</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Percentage</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Comments</th>
                      <th className="px-6 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {grades.grades.map(g => (
                      <tr key={g.id}>
                        <td className="px-6 py-4 font-medium text-gray-900 text-sm">{g.subject}</td>
                        <td className="px-6 py-4 text-sm text-gray-500 capitalize">{g.term.replace('_', ' ')}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {editingGrade === g.id ? (
                            <input
                              type="number"
                              value={gradeEditForm.score ?? g.score}
                              onChange={e => setGradeEditForm(p => ({ ...p, score: parseFloat(e.target.value) }))}
                              className="w-20 border border-gray-300 rounded px-2 py-1 text-sm"
                            />
                          ) : (
                            `${g.score}/${g.max_score}`
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-sm font-semibold ${g.percentage >= 70 ? 'text-green-600' : g.percentage >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>
                            {g.percentage}%
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-400 italic">
                          {editingGrade === g.id ? (
                            <input
                              value={gradeEditForm.comments ?? g.comments ?? ''}
                              onChange={e => setGradeEditForm(p => ({ ...p, comments: e.target.value }))}
                              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                              placeholder="Comments"
                            />
                          ) : (
                            g.comments || '—'
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {hasRole('admin', 'teacher') && (
                            editingGrade === g.id ? (
                              <div className="flex gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleGradeSave(g.id)}
                                  className="text-xs bg-green-600 text-white px-2 py-1 rounded"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingGrade(null)}
                                  className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingGrade(g.id)
                                  setGradeEditForm({ score: g.score, comments: g.comments })
                                }}
                                className="text-xs text-brand-600 hover:text-brand-700"
                              >
                                ✏️ Edit
                              </button>
                            )
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
      </div>
    </Layout>
  )
}