import { useState, useEffect } from 'react'
import { getClasses, getClassAttendance, markAttendance, getChildren, getClassStudents } from '../api/client'
import Layout from '../components/Layout'
import { CheckCircle, XCircle, Clock, AlertCircle, Save } from 'lucide-react'

const STATUS_OPTIONS = [
  { value: 'present', label: 'Present', icon: CheckCircle, colour: 'text-green-600 bg-green-50 border-green-200' },
  { value: 'absent', label: 'Absent', icon: XCircle, colour: 'text-red-600 bg-red-50 border-red-200' },
  { value: 'late', label: 'Late', icon: Clock, colour: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
  { value: 'excused', label: 'Excused', icon: AlertCircle, colour: 'text-blue-600 bg-blue-50 border-blue-200' },
]

function today() {
  return new Date().toISOString().split('T')[0]
}

export default function Attendance() {
  const [classes, setClasses] = useState([])
  const [allChildren, setAllChildren] = useState([])
  const [classStudents, setClassStudents] = useState([])
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedDate, setSelectedDate] = useState(today())
  const [records, setRecords] = useState({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  // Load classes and all children on mount
  useEffect(() => {
    Promise.all([getClasses(), getChildren()])
      .then(([classRes, childRes]) => {
        setClasses(classRes.data)
        setAllChildren(childRes.data)
        if (classRes.data.length > 0) setSelectedClass(classRes.data[0].id)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedClass) return
    getClassStudents(selectedClass)
      .then(res => setClassStudents(res.data.students || []))
      .catch(() => setClassStudents([]))
  }, [selectedClass])

  // Load existing attendance when class or date changes
  useEffect(() => {
    if (!selectedClass || !selectedDate) return
    queueMicrotask(() => {
      setLoading(true)
      setSuccess('')
      setError('')
    })

    getClassAttendance(selectedClass, selectedDate)
      .then(res => {
        const existingRecords = res.data.records || []
        // Pre-fill from existing records
        const map = {}
        existingRecords.forEach(r => {
          map[r.child_id] = r.status
        })
        setRecords(map)
      })
      .catch(() => setRecords({}))
      .finally(() => setLoading(false))
  }, [selectedClass, selectedDate])

  const handleStatus = (childId, status) => {
    setRecords(prev => ({ ...prev, [childId]: status }))
  }

  const handleMarkAll = (status) => {
    const map = {}
    const list = classStudents.length > 0 ? classStudents : allChildren
    list.forEach(c => { map[c.id] = status })
    setRecords(map)
  }

  const handleSubmit = async () => {
    const recordList = Object.entries(records).map(([child_id, status]) => ({
      child_id,
      status,
    }))

    if (recordList.length === 0) {
      setError('Please mark at least one child before submitting.')
      return
    }

    setSaving(true)
    setError('')
    try {
      const res = await markAttendance({
        class_id: selectedClass,
        date: selectedDate,
        records: recordList,
      })
      setSuccess(
        `✅ Attendance saved — ${res.data.created} new, ${res.data.updated} updated`
      )
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save attendance.')
    } finally {
      setSaving(false)
    }
  }

  const selectedClassName = classes.find(c => c.id === selectedClass)?.name || ''
  const displayChildren = classStudents.length > 0 ? classStudents : allChildren
  const markedCount = Object.keys(records).length

  return (
    <Layout>
      <div className="p-8">
        {/* Print header */}
        <div className="print-header">
          <h1 style={{ fontSize: '18pt', fontWeight: 'bold', marginBottom: '4pt' }}>
            Africa Ewaka Village — Testimony Africa NGO
          </h1>
          <h2 style={{ fontSize: '14pt', marginBottom: '4pt' }}>
            Attendance Register — {selectedClassName}
          </h2>
          <p style={{ fontSize: '10pt' }}>Date: {selectedDate}</p>
        </div>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
          <p className="text-gray-500 text-sm mt-1">Mark daily attendance for your class</p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
              <select
                value={selectedClass}
                onChange={e => setSelectedClass(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[180px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={selectedDate}
                max={today()}
                onChange={e => setSelectedDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>
        </div>

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-5 text-sm">
            {success}
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-5 text-sm">
            {error}
          </div>
        )}

        {/* Attendance List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="font-semibold text-gray-800">{selectedClassName}</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {markedCount} of {classStudents.length > 0 ? classStudents.length : allChildren.length} marked · {selectedDate}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* Quick mark all */}
              <button
                onClick={() => handleMarkAll('present')}
                className="text-xs text-green-600 hover:text-green-700 border border-green-200 px-3 py-1.5 rounded-lg transition-colors"
              >
                All Present
              </button>
              <button
                onClick={() => handleMarkAll('absent')}
                className="text-xs text-red-500 hover:text-red-600 border border-red-200 px-3 py-1.5 rounded-lg transition-colors"
              >
                All Absent
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving || markedCount === 0}
                className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:bg-gray-200 disabled:text-gray-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <Save size={14} />
                {saving ? 'Saving...' : 'Save Attendance'}
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="no-print flex items-center gap-2 bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                🖨️ Print Sheet
              </button>
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-gray-400 text-sm">Loading...</div>
          ) : displayChildren.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">
              No children registered yet.
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {(classStudents.length > 0 ? classStudents : allChildren).map(child => (
                <div key={child.id} className="px-6 py-4">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-sm flex-shrink-0">
                        {child.full_name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{child.full_name}</p>
                        <p className="text-xs text-gray-400 font-mono">{child.child_code}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {STATUS_OPTIONS.map(opt => {
                        const Icon = opt.icon
                        const isSelected = records[child.id] === opt.value
                        return (
                          <button
                            key={opt.value}
                            onClick={() => handleStatus(child.id, opt.value)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${isSelected
                                ? opt.colour + ' border-current'
                                : 'text-gray-400 bg-white border-gray-200 hover:border-gray-300'
                              }`}
                          >
                            <Icon size={12} />
                            {opt.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Summary footer */}
          {displayChildren.length > 0 && (
            <div className="px-6 py-3 border-t border-gray-50 flex gap-4 text-xs text-gray-400">
              {STATUS_OPTIONS.map(opt => {
                const Icon = opt.icon
                const count = Object.values(records).filter(v => v === opt.value).length
                return (
                  <span key={opt.value} className="flex items-center gap-1">
                    <Icon size={11} />
                    {opt.label}: {count}
                  </span>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}