import { apiUrl } from '../utils/apiBase'

const API_URL = apiUrl('/categories')

export async function getCategories() {
  try {
    const res = await fetch(API_URL)
    return await res.json()
  } catch (err) {
    console.error('Get categories error:', err)
    return { success: false, error: 'Loi lay danh sach categories', details: err.message }
  }
}
