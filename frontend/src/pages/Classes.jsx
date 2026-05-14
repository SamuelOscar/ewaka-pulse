import { useState, useEffect } from 'react'
import { listClasses, createClass, enrollChild, getVillages, getChildren } from '../api/client'
import Layout from '../components/Layout'
import { Plus, Users, X } from 'lucide-react'

export default function Classes() {
  const [classes, setClasses] = useState([])
  const [villages, setVillages] = useState([])
  const [allChildren, setAllChildren] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showEnrollForm, setShowEnrollForm] = useState(null) // class id
  const [form, setForm] = useState({ name: '', village_id: '' })
  const [enrollChildId, setEnrollChildId] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await listClasses()
      setClasses(response.data)
    } catch {
      setError('Failed to load classes.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true

    async function init() {
      setLoading(true)
      setError('')
      const [classesRes, villagesRes, childrenRes] = await Promise.allSettled([
        listClasses(),
        getVillages(),
        getChildren(),
      ])

      if (!isMounted) return

      if (classesRes.status === 'fulfilled') {
        setClasses(classesRes.value.data)
      }
      if (villagesRes.status === 'fulfilled') {
        setVillages(villagesRes.value.data)
      }
      if (childrenRes.status === 'fulfilled') {
        setAllChildren(childrenRes.value.data)
      }

      if (
        classesRes.status !== 'fulfilled' ||
        villagesRes.status !== 'fulfilled' ||
        childrenRes.status !== 'fulfilled'
      ) {
        setError('Failed to load classes or reference data.')
      }

      if (isMounted) {
        setLoading(false)
      }
    }

    init()

    return () => {
      isMounted = false
    }
  }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await createClass({
        name: form.name.trim(),
        village_id: form.village_id,
      })
      setSuccess(`✅ Class "${form.name}" created`)
      setForm({ name: '', village_id: '' })
      setShowForm(false)
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create class.')
    }
  }

  const handleEnroll = async (classId) => {
    if (!enrollChildId) return
    setError('')
    try {
      const res = await enrollChild(classId, enrollChildId)
      setSuccess(res.data.message)
      setShowEnrollForm(null)
      setEnrollChildId('')
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to enroll child.')
    }
  }

  return (
    <Layout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Classes</h1>
            <p className="text-gray-500 text-sm mt-1">{classes.length} classes registered</p>
          </div>
          <button
            onClick={() => { setShowForm(true); setError(''); setSuccess('') }}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            <Plus size={16} />
            Create Class
          </button>
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

        {/* Create Class Form */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-sm border border-brand-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">New Class</h3>
              <button onClick={() => setShowForm(false)}>
                <X size={18} className="text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Class Name <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.name}
                  onChange={e => setForm(p => ({...p, name: e.target.value}))}
                  required
                  placeholder="e.g. Primary 1, Primary 2, Secondary 3"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Village</label>
                <select
                  value={form.village_id}
                  onChange={e => setForm(p => ({...p, village_id: e.target.value}))}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">Select village</option>
                  {villages.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2 flex justify-end">
                <button
                  type="submit"
                  className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium"
                >
                  Create Class
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Classes List */}
        {loading ? (
          <div className="text-center py-16 text-gray-400 text-sm">Loading classes...</div>
        ) : (
          <div className="grid gap-4">
            {classes.map(cls => (
              <div key={cls.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-brand-100 flex items-center justify-center">
                      <Users size={20} className="text-brand-700" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{cls.name}</p>
                      <p className="text-sm text-gray-500">
                        {cls.student_count} student{cls.student_count !== 1 ? 's' : ''} enrolled
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowEnrollForm(showEnrollForm === cls.id ? null : cls.id)
                      setEnrollChildId('')
                      setError('')
                    }}
                    className="text-sm text-brand-600 hover:text-brand-700 border border-brand-200 px-3 py-1.5 rounded-lg"
                  >
                    + Enroll Child
                  </button>
                </div>

                {/* Enroll form */}
                {showEnrollForm === cls.id && (
                  <div className="mt-4 pt-4 border-t border-gray-100 flex gap-3">
                    <select
                      value={enrollChildId}
                      onChange={e => setEnrollChildId(e.target.value)}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="">Select a child to enroll...</option>
                      {allChildren.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.full_name} ({c.child_code})
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleEnroll(cls.id)}
                      disabled={!enrollChildId}
                      className="bg-brand-600 hover:bg-brand-700 disabled:bg-gray-200 disabled:text-gray-400 text-white px-4 py-2 rounded-lg text-sm font-medium"
                    >
                      Enroll
                    </button>
                    <button
                      onClick={() => setShowEnrollForm(null)}
                      className="text-gray-400 hover:text-gray-600 px-2"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}