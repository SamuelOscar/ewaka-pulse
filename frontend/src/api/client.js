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

export const updateGrade = (gradeId, data) =>
  api.patch(`/grades/${gradeId}`, data)

export const getChildActivities = (childId, params) =>
  api.get(`/activities/child/${childId}`, { params })

export const logActivity = (data) =>
  api.post('/activities/', data)

export const logMeals = (data) =>
  api.post('/meals/', data)

export const getChildMeals = (childId, params) =>
  api.get(`/meals/child/${childId}`, { params })

export const getMealSummary = (date) =>
  api.get('/meals/summary', { params: date ? { summary_date: date } : {} })

export const getUpcomingBirthdays = () =>
  api.get('/dashboard/birthdays')

export const getChildBiometrics = (childId) =>
  api.get(`/biometrics/child/${childId}`)

export const createBiometricRecord = (data) =>
  api.post('/biometrics/', data)

export const logMentalHealthSession = (data) =>
  api.post('/mental-health/', data)

export const getChildMentalHealth = (childId) =>
  api.get(`/mental-health/child/${childId}`)

// Classes
export const listClasses = () =>
  api.get('/classes/')

export const createClass = (data) =>
  api.post('/classes/', data)

export const getClassStudents = (classId) =>
  api.get(`/classes/${classId}/students`)

export const enrollChild = (classId, childId) =>
  api.post(`/classes/${classId}/enroll`, { child_id: childId })

// Users (admin)
export const listUsers = () =>
  api.get('/auth/users')

export const createUser = (data) =>
  api.post('/auth/users', data)

export const updateUser = (userId, data) =>
  api.patch(`/auth/users/${userId}`, data)

export default api