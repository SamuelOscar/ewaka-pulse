import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getChild,
  getChildAttendance,
  getChildGrades,
  getChildActivities,
  getChildBiometrics,
  updateChild,
  updateGrade,
  logActivity,
  createBiometricRecord,
  logMentalHealthSession,
  getChildMentalHealth,
} from '../api/client'
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
  const [showActivityForm, setShowActivityForm] = useState(false)
  const [activityForm, setActivityForm] = useState({
    activity_type: 'football',
    activity_date: new Date().toISOString().split('T')[0],
    participation_level: 'active',
    instructor_notes: '',
    vocational_status: '',
  })
  const [activityError, setActivityError] = useState('')
  const [activitySuccess, setActivitySuccess] = useState('')
  const [showHealthForm, setShowHealthForm] = useState(false)
  const [healthForm, setHealthForm] = useState({
    record_date: new Date().toISOString().split('T')[0],
    height_cm: '',
    weight_kg: '',
    blood_type: '',
    allergies: '',
    health_notes: '',
    next_checkup_date: '',
  })
  const [healthError, setHealthError] = useState('')
  const [showMHForm, setShowMHForm] = useState(false)
  const [mhForm, setMhForm] = useState({
    session_date: new Date().toISOString().split('T')[0],
    session_type: 'individual',
    wellbeing_rating: '3',
    session_notes: '',
    trauma_milestone: '',
    action_items: '',
    next_session_date: '',
  })
  const [mhError, setMhError] = useState('')
  const [mhSuccess, setMhSuccess] = useState('')
  const [mentalHealth, setMentalHealth] = useState(null)

  const handleHealthSubmit = async (e) => {
    e.preventDefault()
    setHealthError('')
    try {
      await createBiometricRecord({
        child_id: id,
        record_date: healthForm.record_date,
        height_cm: healthForm.height_cm ? parseFloat(healthForm.height_cm) : null,
        weight_kg: healthForm.weight_kg ? parseFloat(healthForm.weight_kg) : null,
        blood_type: healthForm.blood_type || null,
        allergies: healthForm.allergies || null,
        health_notes: healthForm.health_notes || null,
        next_checkup_date: healthForm.next_checkup_date || null,
      })
      setShowHealthForm(false)
      setHealthForm({
        record_date: new Date().toISOString().split('T')[0],
        height_cm: '',
        weight_kg: '',
        blood_type: '',
        allergies: '',
        health_notes: '',
        next_checkup_date: '',
      })
      const res = await getChildBiometrics(id)
      setBiometrics(res.data)
    } catch (err) {
      setHealthError(err.response?.data?.detail || 'Failed to save health record.')
    }
  }

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

  const handleActivitySubmit = async (e) => {
    e.preventDefault()
    setActivityError('')
    try {
      await logActivity({
        child_id: id,
        activity_type: activityForm.activity_type,
        activity_date: activityForm.activity_date,
        participation_level: activityForm.participation_level,
        instructor_notes: activityForm.instructor_notes || null,
        vocational_status: activityForm.vocational_status || null,
      })
      setActivitySuccess('✅ Activity logged successfully')
      setShowActivityForm(false)
      setActivityForm({
        activity_type: 'football',
        activity_date: new Date().toISOString().split('T')[0],
        participation_level: 'active',
        instructor_notes: '',
        vocational_status: '',
      })
      const res = await getChildActivities(id)
      setActivities(res.data)
    } catch (err) {
      setActivityError(err.response?.data?.detail || 'Failed to log activity.')
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

        // Load biometrics and mental health only for admin/counselor
        const userData = localStorage.getItem('ewaka_user')
        if (userData) {
          const user = JSON.parse(userData)
          if (['admin', 'counselor'].includes(user.role)) {
            const [bioRes, mhRes] = await Promise.all([
              getChildBiometrics(id),
              getChildMentalHealth(id),
            ])
            setBiometrics(bioRes.data)
            setMentalHealth(mhRes.data)
          } else {
            setBiometrics(null)
            setMentalHealth(null)
          }
        } else {
          setBiometrics(null)
          setMentalHealth(null)
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
            ...(hasRole('admin', 'counselor') ? [
              { key: 'health', label: 'Health', icon: Heart },
              { key: 'counseling', label: 'Counseling', icon: Shield },
            ] : []),
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
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{activities.total_activities}</p>
                  <p className="text-xs text-gray-500">Total</p>
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
              {hasRole('admin', 'teacher') && (
                <button
                  type="button"
                  onClick={() => { setShowActivityForm(true); setActivityError(''); setActivitySuccess('') }}
                  className="no-print flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                >
                  + Log Activity
                </button>
              )}
            </div>

            {showActivityForm && (
              <div className="px-6 py-4 border-b border-brand-100 bg-brand-50">
                <h4 className="font-semibold text-gray-800 mb-3 text-sm">Log New Activity</h4>
                {activityError && (
                  <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded mb-3">{activityError}</p>
                )}
                <form onSubmit={handleActivitySubmit} className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Activity Type</label>
                    <select
                      value={activityForm.activity_type}
                      onChange={e => setActivityForm(p => ({ ...p, activity_type: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="football">Football</option>
                      <option value="dance">Dance</option>
                      <option value="choir">Choir</option>
                      <option value="drama">Drama</option>
                      <option value="basketball">Basketball</option>
                      <option value="volleyball">Volleyball</option>
                      <option value="athletics">Athletics</option>
                      <option value="vocational_tailoring">Vocational — Tailoring</option>
                      <option value="vocational_carpentry">Vocational — Carpentry</option>
                      <option value="vocational_cooking">Vocational — Cooking</option>
                      <option value="vocational_computing">Vocational — Computing</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
                    <input
                      type="date"
                      value={activityForm.activity_date}
                      max={new Date().toISOString().split('T')[0]}
                      onChange={e => setActivityForm(p => ({ ...p, activity_date: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Participation Level</label>
                    <select
                      value={activityForm.participation_level}
                      onChange={e => setActivityForm(p => ({ ...p, participation_level: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="observer">Observer</option>
                      <option value="active">Active</option>
                      <option value="leader">Leader</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Vocational Status (if applicable)</label>
                    <select
                      value={activityForm.vocational_status}
                      onChange={e => setActivityForm(p => ({ ...p, vocational_status: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="">— Not vocational —</option>
                      <option value="in_progress">In Progress</option>
                      <option value="certified">Certified</option>
                      <option value="did_not_complete">Did Not Complete</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Instructor Notes (optional)</label>
                    <input
                      value={activityForm.instructor_notes}
                      onChange={e => setActivityForm(p => ({ ...p, instructor_notes: e.target.value }))}
                      placeholder="e.g. Strong team player, improving each week"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div className="col-span-2 flex gap-2">
                    <button type="submit" className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
                      Save Activity
                    </button>
                    <button type="button" onClick={() => setShowActivityForm(false)} className="text-gray-500 border border-gray-200 px-4 py-2 rounded-lg text-sm">
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activitySuccess && (
              <div className="px-6 py-3 text-sm text-green-700 bg-green-50 border-b border-green-100">
                {activitySuccess}
              </div>
            )}

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
                      <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${
                        a.participation_level === 'leader' ? 'bg-purple-100 text-purple-700'
                          : a.participation_level === 'active' ? 'bg-green-100 text-green-700'
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
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield size={15} className="text-red-500" />
                <h3 className="font-semibold text-gray-800">Health Records</h3>
                <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full ml-2">SENSITIVE</span>
              </div>
              {hasRole('admin', 'counselor') && (
                <button
                  onClick={() => setShowHealthForm(true)}
                  className="no-print flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                >
                  + Add Health Record
                </button>
              )}
            </div>

            {/* Health form */}
            {showHealthForm && (
              <div className="px-6 py-4 border-b border-brand-100 bg-brand-50">
                <h4 className="font-semibold text-gray-800 mb-3 text-sm">New Health Record</h4>
                {healthError && (
                  <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded mb-3">{healthError}</p>
                )}
                <form onSubmit={handleHealthSubmit} className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Record Date</label>
                    <input
                      type="date"
                      value={healthForm.record_date}
                      max={new Date().toISOString().split('T')[0]}
                      onChange={e => setHealthForm(p => ({...p, record_date: e.target.value}))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Height (cm)</label>
                    <input
                      type="number"
                      value={healthForm.height_cm}
                      onChange={e => setHealthForm(p => ({...p, height_cm: e.target.value}))}
                      placeholder="e.g. 142"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Weight (kg)</label>
                    <input
                      type="number"
                      value={healthForm.weight_kg}
                      onChange={e => setHealthForm(p => ({...p, weight_kg: e.target.value}))}
                      placeholder="e.g. 32"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Blood Type</label>
                    <select
                      value={healthForm.blood_type}
                      onChange={e => setHealthForm(p => ({...p, blood_type: e.target.value}))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="">Unknown</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Allergies</label>
                    <input
                      value={healthForm.allergies}
                      onChange={e => setHealthForm(p => ({...p, allergies: e.target.value}))}
                      placeholder="e.g. None known"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Next Checkup Date</label>
                    <input
                      type="date"
                      value={healthForm.next_checkup_date}
                      onChange={e => setHealthForm(p => ({...p, next_checkup_date: e.target.value}))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Health Notes</label>
                    <textarea
                      value={healthForm.health_notes}
                      onChange={e => setHealthForm(p => ({...p, health_notes: e.target.value}))}
                      placeholder="e.g. Vaccination up to date. No known conditions."
                      rows={2}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div className="col-span-2 flex gap-2">
                    <button type="submit" className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
                      Save Record
                    </button>
                    <button type="button" onClick={() => setShowHealthForm(false)} className="text-gray-500 border border-gray-200 px-4 py-2 rounded-lg text-sm">
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {!biometrics || biometrics.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-400 text-sm">No health records yet</div>
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
                      <p className="text-sm text-gray-600 mt-3 bg-gray-50 rounded-lg p-3 italic">{r.health_notes}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'counseling' && hasRole('admin', 'counselor') && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield size={15} className="text-purple-600" />
                <h3 className="font-semibold text-gray-800">Counseling Sessions</h3>
                <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full ml-2">SENSITIVE</span>
              </div>
              <button
                onClick={() => { setShowMHForm(true); setMhError(''); setMhSuccess('') }}
                className="no-print flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                + Log Session
              </button>
            </div>

            {showMHForm && (
              <div className="px-6 py-4 border-b border-purple-100 bg-purple-50">
                <h4 className="font-semibold text-gray-800 mb-3 text-sm">New Counseling Session</h4>
                {mhError && (
                  <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded mb-3">{mhError}</p>
                )}
                <form onSubmit={async (e) => {
                  e.preventDefault()
                  setMhError('')
                  try {
                    await logMentalHealthSession({
                      child_id: id,
                      session_date: mhForm.session_date,
                      session_type: mhForm.session_type,
                      wellbeing_rating: parseInt(mhForm.wellbeing_rating),
                      session_notes: mhForm.session_notes || null,
                      trauma_milestone: mhForm.trauma_milestone || null,
                      action_items: mhForm.action_items || null,
                      next_session_date: mhForm.next_session_date || null,
                    })
                    setMhSuccess('✅ Session logged')
                    setShowMHForm(false)
                    const res = await getChildMentalHealth(id)
                    setMentalHealth(res.data)
                  } catch (err) {
                    setMhError(err.response?.data?.detail || 'Failed to log session.')
                  }
                }} className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Session Date</label>
                    <input type="date" value={mhForm.session_date}
                      max={new Date().toISOString().split('T')[0]}
                      onChange={e => setMhForm(p => ({...p, session_date: e.target.value}))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Session Type</label>
                    <select value={mhForm.session_type}
                      onChange={e => setMhForm(p => ({...p, session_type: e.target.value}))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="individual">Individual</option>
                      <option value="group">Group</option>
                      <option value="emergency">Emergency</option>
                      <option value="follow_up">Follow-up</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Wellbeing Rating (1-5)</label>
                    <select value={mhForm.wellbeing_rating}
                      onChange={e => setMhForm(p => ({...p, wellbeing_rating: e.target.value}))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="1">1 — Very Low</option>
                      <option value="2">2 — Low</option>
                      <option value="3">3 — Moderate</option>
                      <option value="4">4 — Good</option>
                      <option value="5">5 — Excellent</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Next Session Date</label>
                    <input type="date" value={mhForm.next_session_date}
                      onChange={e => setMhForm(p => ({...p, next_session_date: e.target.value}))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Session Notes</label>
                    <textarea value={mhForm.session_notes}
                      onChange={e => setMhForm(p => ({...p, session_notes: e.target.value}))}
                      rows={2} placeholder="Session observations and notes..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Trauma Milestone</label>
                    <input value={mhForm.trauma_milestone}
                      onChange={e => setMhForm(p => ({...p, trauma_milestone: e.target.value}))}
                      placeholder="e.g. Beginning to show trust in adult relationships"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Action Items</label>
                    <input value={mhForm.action_items}
                      onChange={e => setMhForm(p => ({...p, action_items: e.target.value}))}
                      placeholder="e.g. Weekly check-ins, coordinate with class teacher"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div className="col-span-2 flex gap-2">
                    <button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
                      Save Session
                    </button>
                    <button type="button" onClick={() => setShowMHForm(false)} className="text-gray-500 border border-gray-200 px-4 py-2 rounded-lg text-sm">
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {mhSuccess && (
              <div className="px-6 py-3 text-sm text-green-700 bg-green-50">{mhSuccess}</div>
            )}

            <div className="divide-y divide-gray-50">
              {!mentalHealth || mentalHealth.length === 0 ? (
                <div className="px-6 py-8 text-center text-gray-400 text-sm">No counseling sessions recorded yet</div>
              ) : (
                mentalHealth.map((s, i) => (
                  <div key={i} className="px-6 py-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium text-gray-900 text-sm capitalize">{s.session_type.replace('_', ' ')} session</p>
                        <p className="text-xs text-gray-400">{s.session_date}</p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1">
                          {[1,2,3,4,5].map(n => (
                            <div key={n} className={`w-3 h-3 rounded-full ${n <= s.wellbeing_rating ? 'bg-purple-500' : 'bg-gray-200'}`} />
                          ))}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Wellbeing {s.wellbeing_rating}/5</p>
                      </div>
                    </div>
                    {s.session_notes && <p className="text-sm text-gray-600 italic bg-gray-50 rounded p-2 mt-1">{s.session_notes}</p>}
                    {s.trauma_milestone && <p className="text-xs text-purple-600 mt-1">Milestone: {s.trauma_milestone}</p>}
                    {s.action_items && <p className="text-xs text-gray-500 mt-1">Actions: {s.action_items}</p>}
                    {s.next_session_date && <p className="text-xs text-orange-600 mt-1">Next session: {s.next_session_date}</p>}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
        </div>
      </div>
    </Layout>
  )
}