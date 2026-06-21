import axios from 'axios'
import { API_BASE_URL, apiUrl } from '../utils/apiBase'
import { getAuthToken } from '../utils/authSession'
import { clearAllPlacesCache } from './places'

const API_URL = apiUrl('/admin')

// Helper để lấy token
const getAuthHeader = () => {
  const token = getAuthToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// ============ QUẢN LÝ NGƯỜI DÙNG ============

export const getAllUsers = async () => {
  try {
    const response = await axios.get(`${API_URL}/users`, {
      headers: getAuthHeader()
    })
    return response.data
  } catch (error) {
    console.error('Get all users error:', error)
    return { success: false, error: error.response?.data?.error || error.message }
  }
}

export const getUserById = async (id) => {
  try {
    const response = await axios.get(`${API_URL}/users/${id}`, {
      headers: getAuthHeader()
    })
    return response.data
  } catch (error) {
    console.error('Get user error:', error)
    return { success: false, error: error.response?.data?.error || error.message }
  }
}

export const createUser = async (userData) => {
  try {
    const response = await axios.post(`${API_URL}/users`, userData, {
      headers: getAuthHeader()
    })
    return response.data
  } catch (error) {
    console.error('Create user error:', error)
    return { success: false, error: error.response?.data?.error || error.message }
  }
}

export const updateUser = async (id, userData) => {
  try {
    const response = await axios.put(`${API_URL}/users/${id}`, userData, {
      headers: getAuthHeader()
    })
    return response.data
  } catch (error) {
    console.error('Update user error:', error)
    return { success: false, error: error.response?.data?.error || error.message }
  }
}

export const deleteUser = async (id) => {
  try {
    const response = await axios.delete(`${API_URL}/users/${id}`, {
      headers: getAuthHeader()
    })
    return response.data
  } catch (error) {
    console.error('Delete user error:', error)
    return { success: false, error: error.response?.data?.error || error.message }
  }
}

// ============ QUẢN LÝ ĐỊA ĐIỂM ============

export const getAllPlaces = async () => {
  try {
    const response = await axios.get(`${API_URL}/places`, {
      headers: getAuthHeader()
    })
    return response.data
  } catch (error) {
    console.error('Get all places error:', error)
    return { success: false, error: error.response?.data?.error || error.message }
  }
}

export const getAllTags = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/tags`)
    return response.data
  } catch (error) {
    console.error('Get all tags error:', error)
    return { success: false, error: error.response?.data?.error || error.message }
  }
}

export const getPlaceById = async (id) => {
  try {
    const response = await axios.get(`${API_URL}/places/${id}`, {
      headers: getAuthHeader()
    })
    return response.data
  } catch (error) {
    console.error('Get place error:', error)
    return { success: false, error: error.response?.data?.error || error.message }
  }
}

export const createPlace = async (placeData) => {
  try {
    const response = await axios.post(`${API_URL}/places`, placeData, {
      headers: getAuthHeader()
    })
    if (response.data && response.data.success) clearAllPlacesCache()
    return response.data
  } catch (error) {
    console.error('Create place error:', error)
    return { success: false, error: error.response?.data?.error || error.message }
  }
}

export const updatePlace = async (id, placeData) => {
  try {
    const response = await axios.put(`${API_URL}/places/${id}`, placeData, {
      headers: getAuthHeader()
    })
    if (response.data && response.data.success) clearAllPlacesCache()
    return response.data
  } catch (error) {
    console.error('Update place error:', error)
    return { success: false, error: error.response?.data?.error || error.message }
  }
}

export const deletePlace = async (id) => {
  try {
    const response = await axios.delete(`${API_URL}/places/${id}`, {
      headers: getAuthHeader()
    })
    if (response.data && response.data.success) clearAllPlacesCache()
    return response.data
  } catch (error) {
    console.error('Delete place error:', error)
    return { success: false, error: error.response?.data?.error || error.message }
  }
}

// ============ TÌM KIẾM TỪ GOONG API ============

export const searchGoongPlaces = async (query) => {
  try {
    const trimmedQuery = String(query || '').trim()
    const response = await axios.get(`${API_URL}/search-goong?query=${encodeURIComponent(trimmedQuery)}`, {
      headers: getAuthHeader()
    })
    return response.data
  } catch (error) {
    console.error('Search Goong places error:', error)
    return { success: false, error: error.response?.data?.error || error.message }
  }
}

export const addPlaceFromGoong = async (placeData) => {
  try {
    const response = await axios.post(`${API_URL}/places/add-from-goong`, placeData, {
      headers: getAuthHeader()
    })
    if (response.data && response.data.success) clearAllPlacesCache()
    return response.data
  } catch (error) {
    console.error('Add place from Goong error:', error)
    return { success: false, error: error.response?.data?.error || error.message }
  }
}

// ============ DUYỆT ẢNH ĐÁNH GIÁ (REVIEW IMAGE SUBMISSIONS) ============

export const getReviewImageSubmissions = async (status = 'pending', limit = 50) => {
  try {
    const response = await axios.get(`${API_URL}/review-image-submissions?status=${encodeURIComponent(status)}&limit=${encodeURIComponent(limit)}`, {
      headers: getAuthHeader()
    })
    return response.data
  } catch (error) {
    console.error('Get review image submissions error:', error)
    return { success: false, error: error.response?.data?.error || error.message }
  }
}

export const approveReviewImageSubmission = async (submissionId) => {
  try {
    const response = await axios.post(`${API_URL}/review-image-submissions/${encodeURIComponent(submissionId)}/approve`, {}, {
      headers: getAuthHeader()
    })
    return response.data
  } catch (error) {
    console.error('Approve review image submission error:', error)
    return { success: false, error: error.response?.data?.error || error.message }
  }
}

export const rejectReviewImageSubmission = async (submissionId, reason = '') => {
  try {
    const response = await axios.post(`${API_URL}/review-image-submissions/${encodeURIComponent(submissionId)}/reject`, { reason }, {
      headers: getAuthHeader()
    })
    return response.data
  } catch (error) {
    console.error('Reject review image submission error:', error)
    return { success: false, error: error.response?.data?.error || error.message }
  }
}
