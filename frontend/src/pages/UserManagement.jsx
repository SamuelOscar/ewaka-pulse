import { useState, useEffect } from 'react'
import { listUsers, createUser, updateUser } from '../api/client'
import Layout from '../components/Layout'
import { UserPlus, Shield, X } from 'lucide-react'

const ROLES = ['admin', 'teacher', 'counselor', 'operations', 'finance', 'volunteer', 'manager', 'readonly']

const roleColours = {
    admin: 'bg-red-100 text-red-700',
    teacher: 'bg-blue-100 text-blue-700',
    counselor: 'bg-purple-100 text-purple-700',
    operations: 'bg-orange-100 text-orange-700',
    finance: 'bg-green-100 text-green-700',
    volunteer: 'bg-yellow-100 text-yellow-700',
    manager: 'bg-brand-100 text-brand-700',
    readonly: 'bg-gray-100 text-gray-600',
}

export default function UserManagement() {
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [form, setForm] = useState({
        username: '',
        password: '',
        role: 'teacher',
    })

    const loadUsers = () => {
        listUsers()
            .then(res => setUsers(res.data))
            .catch(() => setError('Failed to load users.'))
            .finally(() => setLoading(false))
    }

    useEffect(() => {
        loadUsers()
    }, [])

    const handleCreate = async (e) => {
        e.preventDefault()
        setError('')
        setSuccess('')
        try {
            await createUser(form)
            setSuccess(`✅ User '${form.username}' created with role '${form.role}'`)
            setForm({ username: '', password: '', role: 'teacher' })
            setShowForm(false)
            loadUsers()
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to create user.')
        }
    }

    const handleToggle = async (user) => {
        try {
            await updateUser(user.id, { is_active: !user.is_active })
            loadUsers()
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to update user.')
        }
    }

    return (
        <Layout>
            <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
                        <p className="text-gray-500 text-sm mt-1">{users.length} system users</p>
                    </div>
                    <button
                        onClick={() => { setShowForm(true); setError(''); setSuccess('') }}
                        className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                    >
                        <UserPlus size={16} />
                        Add User
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

                {/* Create User Form */}
                {showForm && (
                    <div className="bg-white rounded-xl shadow-sm border border-brand-200 p-6 mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                                <Shield size={15} className="text-brand-600" />
                                Create New User
                            </h3>
                            <button onClick={() => setShowForm(false)}>
                                <X size={18} className="text-gray-400 hover:text-gray-600" />
                            </button>
                        </div>
                        <form onSubmit={handleCreate} className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Username <span className="text-red-500">*</span>
                                </label>
                                <input
                                    value={form.username}
                                    onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                                    required
                                    placeholder="e.g. teacher2"
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Password <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="password"
                                    value={form.password}
                                    onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                                    required
                                    placeholder="Min 10 chars, upper, number, symbol"
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                <select
                                    value={form.role}
                                    onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                                >
                                    {ROLES.map(r => (
                                        <option key={r} value={r}>{r}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="col-span-3 flex justify-end">
                                <button
                                    type="submit"
                                    className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium"
                                >
                                    Create User
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Users Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    {loading ? (
                        <div className="py-12 text-center text-gray-400 text-sm">Loading users...</div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Username</th>
                                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Role</th>
                                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Last Login</th>
                                    <th className="px-6 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {users.map(user => (
                                    <tr key={user.id}>
                                        <td className="px-6 py-4 font-medium text-gray-900 text-sm">{user.username}</td>
                                        <td className="px-6 py-4">
                                            <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${roleColours[user.role] || 'bg-gray-100 text-gray-600'}`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {user.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => handleToggle(user)}
                                                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${user.is_active
                                                        ? 'text-red-600 border-red-200 hover:bg-red-50'
                                                        : 'text-green-600 border-green-200 hover:bg-green-50'
                                                    }`}
                                            >
                                                {user.is_active ? 'Deactivate' : 'Reactivate'}
                                            </button>
                                        </td>
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