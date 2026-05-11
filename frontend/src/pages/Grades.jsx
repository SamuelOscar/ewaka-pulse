import { useState, useEffect } from 'react'
import { getChildren, getChildGrades, getTermReport } from '../api/client'
import { enterGrade } from '../api/client'
import Layout from '../components/Layout'
import { BookOpen, Plus, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const TERMS = [
  { value: 'term_1', label: 'Term 1' },
  { value: 'term_2', label: 'Term 2' },
  { value: 'term_3', label: 'Term 3' },
]

const SUBJECTS = [
  'Mathematics', 'English', 'Science', 'Social Studies',
  'Religious Education', 'Physical Education', 'Art', 'Music',
]

function gradeColour(pct) {
  if (pct >= 80) return 'text-green-600'
  if (pct >= 50) return 'text-yellow-600'
  return 'text-red-500'
}

export default function Grades() {
  const { hasRole } = useAuth()
  const currentYear = new Date().getFullYear().toString()

  const [children, setChildren] = useState([])
  const [selectedChild, setSelectedChild] = useState('')
  const [selectedTerm, setSelectedTerm] = useState('term_1')
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [grades, setGrades] = useState(null)
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [form, setForm] = useState({
    subject: 'Mathematics',
    score: '',
    max_score: '100',
    comments: '',
  })

  // Load children on mount
  useEffect(() => {
    getChildren().then(res => {
      setChildren(res.data)
      if (res.data.length > 0) setSelectedChild(res.data[0].id)
    }).catch(() => {})
  }, [])

  // Load grades when child/term/year changes
  useEffect(() => {
    if (!selectedChild) return
    let cancelled = false

    Promise.resolve()
      .then(() => {
        if (cancelled) return
        setLoading(true)
        setError('')
        setReport(null)
        return Promise.all([
          getChildGrades(selectedChild, { term: selectedTerm, academic_year: selectedYear }),
          getTermReport(selectedChild, selectedTerm, selectedYear).catch(() => null),
        ])
      })
      .then((result) => {
        if (cancelled || result === undefined) return
        const [gradesRes, reportRes] = result
        setGrades(gradesRes.data)
        setReport(reportRes?.data || null)
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load grades.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [selectedChild, selectedTerm, selectedYear])

  const handleFormChange = e => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    setSuccess('')
    try {
      await enterGrade({
        child_id: selectedChild,
        subject: form.subject,
        term: selectedTerm,
        academic_year: selectedYear,
        score: parseFloat(form.score),
        max_score: parseFloat(form.max_score),
        comments: form.comments || null,
      })
      setSuccess(`✅ Grade saved for ${form.subject}`)
      setShowForm(false)
      setForm({ subject: 'Mathematics', score: '', max_score: '100', comments: '' })
      // Reload grades
      const [gradesRes, reportRes] = await Promise.all([
        getChildGrades(selectedChild, { term: selectedTerm, academic_year: selectedYear }),
        getTermReport(selectedChild, selectedTerm, selectedYear).catch(() => null),
      ])
      setGrades(gradesRes.data)
      setReport(reportRes?.data || null)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save grade.')
    }
  }

  const selectedChildName = children.find(c => c.id === selectedChild)?.full_name || ''

  return (
    <Layout>
      <div className="p-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Grades</h1>
            <p className="text-gray-500 text-sm mt-1">Enter and view term academic results</p>
          </div>
          {hasRole('admin', 'teacher') && (
            <button
              onClick={() => { setShowForm(true); setError(''); setSuccess('') }}
              className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus size={16} />
              Enter Grade
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Child</label>
              <select
                value={selectedChild}
                onChange={e => setSelectedChild(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {children.map(c => (
                  <option key={c.id} value={c.id}>{c.full_name} ({c.child_code})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Term</label>
              <select
                value={selectedTerm}
                onChange={e => setSelectedTerm(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {TERMS.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="2026">2026</option>
                <option value="2025">2025</option>
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-5 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-5 text-sm">
            {success}
          </div>
        )}

        {/* Grade Entry Form */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-sm border border-brand-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">
                Enter Grade — {selectedChildName}
              </h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <select
                  name="subject"
                  value={form.subject}
                  onChange={handleFormChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Score <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="score"
                    type="number"
                    min="0"
                    max={form.max_score}
                    value={form.score}
                    onChange={handleFormChange}
                    required
                    placeholder="e.g. 78"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Out of</label>
                  <input
                    name="max_score"
                    type="number"
                    min="1"
                    value={form.max_score}
                    onChange={handleFormChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teacher Comments (optional)
                </label>
                <input
                  name="comments"
                  value={form.comments}
                  onChange={handleFormChange}
                  placeholder="e.g. Good progress this term"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div className="col-span-2 flex justify-end">
                <button
                  type="submit"
                  className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
                >
                  Save Grade
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Report Card Summary */}
        {report && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="font-semibold text-gray-800">
                  {report.child_name} — {selectedTerm.replace('_', ' ').toUpperCase()} {selectedYear}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">{report.child_code}</p>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className={`text-2xl font-bold ${gradeColour(report.average_percentage)}`}>
                    {report.grade_letter}
                  </p>
                  <p className="text-xs text-gray-400">Grade</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{report.average_percentage}%</p>
                  <p className="text-xs text-gray-400">Average</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {report.total_score}/{report.total_max}
                  </p>
                  <p className="text-xs text-gray-400">Total</p>
                </div>
                {report.attendance_rate !== null && (
                  <div className="text-center">
                    <p className={`text-2xl font-bold ${report.attendance_rate >= 80 ? 'text-green-600' : 'text-red-500'}`}>
                      {report.attendance_rate}%
                    </p>
                    <p className="text-xs text-gray-400">Attendance</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Grades Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <BookOpen size={15} className="text-brand-600" />
            <h2 className="font-semibold text-gray-800">Subject Results</h2>
          </div>

          {loading ? (
            <div className="py-12 text-center text-gray-400 text-sm">Loading grades...</div>
          ) : !grades || grades.grades?.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">
              <p>No grades recorded for this term.</p>
              {hasRole('admin', 'teacher') && (
                <button
                  onClick={() => setShowForm(true)}
                  className="mt-3 text-brand-600 hover:text-brand-700 text-sm font-medium"
                >
                  + Enter first grade
                </button>
              )}
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Subject</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Score</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Percentage</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Comments</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {grades.grades.map(g => (
                  <tr key={g.id}>
                    <td className="px-6 py-4 font-medium text-gray-900 text-sm">{g.subject}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{g.score}/{g.max_score}</td>
                    <td className="px-6 py-4">
                      <span className={`text-sm font-semibold ${gradeColour(g.percentage)}`}>
                        {g.percentage}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400 italic">{g.comments || '—'}</td>
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