import { apiUrl } from '../utils/apiBase'

const API_URL = apiUrl('/home-content')

export async function getHomeContent() {
  try {
    const res = await fetch(API_URL)
    return await res.json()
  } catch (err) {
    console.error('Get home content error:', err)
    return { success: false, error: 'Lỗi lấy nội dung trang chủ', details: err.message }
  }
}
