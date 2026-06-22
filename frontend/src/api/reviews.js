import { apiUrl } from '../utils/apiBase'
import { getAuthToken } from '../utils/authSession'

const API_URL = apiUrl('/reviews')

// Lấy danh sách đánh giá của một địa điểm
export async function getReviews(placeId, page = 1, limit = 10) {
  try {
    const token = getAuthToken()
    const res = await fetch(`${API_URL}/place/${placeId}?page=${page}&limit=${limit}`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : undefined
    })
    const data = await res.json()
    return data
  } catch (err) {
    console.error('Get reviews error:', err)
    return { success: false, error: 'Lỗi lấy danh sách đánh giá' }
  }
}

// Tạo đánh giá mới
export async function getLatestReviews(limit = 4) {
  try {
    const res = await fetch(`${API_URL}/latest/public?limit=${encodeURIComponent(limit)}`)
    const data = await res.json()
    return data
  } catch (err) {
    console.error('Get latest reviews error:', err)
    return { success: false, error: 'Loi lay danh gia moi nhat' }
  }
}

export async function createReview(placeId, rating, comment, images = []) {
  try {
    const token = getAuthToken()
    if (!token) {
      return { success: false, error: 'Vui lòng đăng nhập để đánh giá' }
    }

    const formData = new FormData()
    formData.append('placeId', placeId)
    formData.append('rating', rating)
    formData.append('comment', comment)
    
    // Thêm ảnh nếu có
    if (images && images.length > 0) {
      images.forEach(img => {
        formData.append('images', img)
      })
    }

    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    })
    const data = await res.json()
    return data
  } catch (err) {
    console.error('Create review error:', err)
    return { success: false, error: 'Lỗi tạo đánh giá' }
  }
}

// Cập nhật đánh giá
export async function updateReview(reviewId, rating, comment, images = [], keepImages = []) {
  try {
    const token = getAuthToken()
    if (!token) {
      return { success: false, error: 'Vui lòng đăng nhập' }
    }

    const formData = new FormData()
    formData.append('rating', rating)
    formData.append('comment', comment)

    if (keepImages !== undefined) {
      try {
        formData.append('keepImages', JSON.stringify(keepImages || []))
      } catch {
        formData.append('keepImages', '[]')
      }
    }
    
    if (images && images.length > 0) {
      images.forEach(img => {
        formData.append('images', img)
      })
    }

    const res = await fetch(`${API_URL}/${reviewId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    })
    const data = await res.json()
    return data
  } catch (err) {
    console.error('Update review error:', err)
    return { success: false, error: 'Lỗi cập nhật đánh giá' }
  }
}

// Lấy danh sách ảnh review mà user hiện tại đã gửi (pending/approved/rejected)
export async function getMyReviewImageSubmissions(reviewId) {
  try {
    const token = getAuthToken()
    if (!token) {
      return { success: false, error: 'Vui lòng đăng nhập' }
    }

    const res = await fetch(`${API_URL}/${encodeURIComponent(reviewId)}/image-submissions/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    const data = await res.json()
    return data
  } catch (err) {
    console.error('Get review image submissions error:', err)
    return { success: false, error: 'Lỗi lấy danh sách ảnh đã gửi' }
  }
}

// Xóa đánh giá
export async function deleteReview(reviewId) {
  try {
    const token = getAuthToken()
    if (!token) {
      return { success: false, error: 'Vui lòng đăng nhập' }
    }

    const res = await fetch(`${API_URL}/${reviewId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    const data = await res.json()
    return data
  } catch (err) {
    console.error('Delete review error:', err)
    return { success: false, error: 'Lỗi xóa đánh giá' }
  }
}

// Like/Dislike một đánh giá
export async function reactToReview(reviewId, action) {
  try {
    const token = getAuthToken()
    if (!token) {
      return { success: false, error: 'Vui lòng đăng nhập' }
    }

    const res = await fetch(`${API_URL}/${encodeURIComponent(reviewId)}/reaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ action })
    })
    const data = await res.json()
    return data
  } catch (err) {
    console.error('React review error:', err)
    return { success: false, error: 'Lỗi xử lý cảm xúc đánh giá' }
  }
}
