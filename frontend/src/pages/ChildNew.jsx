import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { registerChild, getVillages } from '../api/client'
import Layout from '../components/Layout'
import { ArrowLeft, Save } from 'lucide-react'

export default function ChildNew() {
  const navigate = useNavigate()
  const [villages, setVillages] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [form, setForm] = useState({
    full_name: '',
    date_of_birth: '',
    gender: 'female',
    nationality: 'Ugandan',
    village_id: '',
    date_of_arrival: '',
    class_grade: '',
    guardian_name: '',
    guardian_contact: '',
  })

  useEffect(() => {
    getVillages().then(res => setVillages(res.data)).catch(() => {})
  }, [])

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await registerChild(form)
      setSuccess(`✅ Child registered successfully! Code: ${res.data.child_code}`)
      setTimeout(() => navigate(`/children/${res.data.id}`), 2000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed. Please check your details.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout>
      <div className="p-8 max-w-2xl">

        <button
          onClick={() => navigate('/children')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Children
        </button>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Register New Child</h1>
          <p className="text-gray-500 text-sm mt-1">
            A unique EP code will be automatically generated
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6 text-sm">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">

          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              name="full_name"
              value={form.full_name}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="e.g. Grace Apio"
            />
          </div>

          {/* DOB + Gender */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date of Birth <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="date_of_birth"
                value={form.date_of_birth}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gender <span className="text-red-500">*</span>
              </label>
              <select
                name="gender"
                value={form.gender}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Nationality + Village */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nationality
              </label>
              <input
                name="nationality"
                value={form.nationality}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="Ugandan"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Village <span className="text-red-500">*</span>
              </label>
              <select
                name="village_id"
                value={form.village_id}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">Select village...</option>
                {villages.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Date of Arrival + Class */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date of Arrival <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="date_of_arrival"
                value={form.date_of_arrival}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Class / Grade
              </label>
              <input
                name="class_grade"
                value={form.class_grade}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="e.g. Primary 5"
              />
            </div>
          </div>

          {/* Guardian Name + Contact */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Guardian Name
              </label>
              <input
                name="guardian_name"
                value={form.guardian_name}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="Guardian's full name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Guardian Contact
              </label>
              <input
                name="guardian_contact"
                value={form.guardian_contact}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="+256700000000"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              <Save size={15} />
              {loading ? 'Registering...' : 'Register Child'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  )
}