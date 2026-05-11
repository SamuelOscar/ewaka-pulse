import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ewaka_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('ewaka_token')
      localStorage.removeItem('ewaka_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const login = (username, password) =>
  api.post('/auth/login', { username, password })

export const getMe = () =>
  api.get('/auth/me')

export const getDashboardSummary = () =>
  api.get('/dashboard/summary')

export const getAttendanceSummary = (date) =>
  api.get('/attendance/summary', { params: date ? { summary_date: date } : {} })

export const getChildren = (params) =>
  api.get('/children/', { params })

export const getChild = (id) =>
  api.get(`/children/${id}`)

export const registerChild = (data) =>
  api.post('/children/', data)

export const updateChild = (id, data) =>
  api.patch(`/children/${id}`, data)

export const getClasses = () =>
  api.get('/attendance/classes')

export const markAttendance = (data) =>
  api.post('/attendance/', data)

export const getClassAttendance = (classId, date) =>
  api.get(`/attendance/class/${classId}`, { params: { attendance_date: date } })

export const getChildAttendance = (childId) =>
  api.get(`/attendance/child/${childId}`)

export const getChildGrades = (childId, params) =>
  api.get(`/grades/child/${childId}`, { params })

export const getTermReport = (childId, term, year) =>
  api.get(`/grades/report/${childId}`, { params: { term, academic_year: year } })

export const getVillages = () =>
  api.get('/villages/')

export const getStaff = (params) =>
  api.get('/staff/', { params })

export const enterGrade = (data) =>
  api.post('/grades/', data)

export default api