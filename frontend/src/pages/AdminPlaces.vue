<template>
  <div class="admin-places-page">
    <main class="content">
      <section class="page-hero">
        <div class="page-hero-inner tw-container-wide">
          <h1>Quản lý địa điểm</h1>
          <p>Tìm kiếm, duyệt ảnh đánh giá và quản lý địa điểm</p>
        </div>
      </section>

      <div class="admin-container tw-container-wide page-body">

        <!-- Search from Goong API -->
        <div class="search-section">
          <h3>Tìm kiếm địa điểm mới</h3>
          <div class="search-bar">
            <input 
              v-model="searchQuery" 
              type="text" 
              placeholder="Nhập tên địa điểm cần tìm..." 
              @keyup.enter="searchGoong"
            />
            <button @click="searchGoong" :disabled="isSearching" class="btn btn-primary">
              {{ isSearching ? 'Đang tìm...' : 'Tìm kiếm' }}
            </button>
          </div>
          
          <!-- Search Results -->
          <div v-if="searchResults.length > 0" class="search-results">
            <h4>Kết quả tìm kiếm ({{ searchResults.length }} địa điểm chưa có trong database):</h4>
            <div class="search-results-list">
              <div v-for="result in searchResults" :key="result.placeId" class="search-result-item">
                <div class="result-info">
                  <strong>{{ result.name || result.mainText }}</strong>
                  <span class="result-secondary">{{ result.secondaryText }}</span>
                </div>
                <button @click="addFromGoongDirect(result)" :disabled="result.adding" class="btn btn-success btn-small">
                  {{ result.adding ? 'Đang thêm...' : '+ Thêm vào DB' }}
                </button>
              </div>
            </div>
          </div>
          <div v-if="searchMessage" class="search-message">{{ searchMessage }}</div>
        </div>

        <hr class="divider" />

        <div class="tag-admin-section">
          <div class="tag-admin-header">
            <div>
              <h3>Tag địa điểm</h3>
              <p>Thêm tag mới để sử dụng khi tạo hoặc chỉnh sửa địa điểm.</p>
            </div>
          </div>
          <div class="tag-admin-form">
            <input
              v-model="newTagName"
              type="text"
              placeholder="VD: Khu vui chơi nước"
              @keyup.enter="addTag"
            />
            <button class="btn btn-primary" type="button" @click="addTag" :disabled="isAddingTag">
              {{ isAddingTag ? 'Đang thêm...' : 'Thêm tag' }}
            </button>
          </div>
          <div class="tag-admin-list" v-if="availableTags.length > 0">
            <span v-for="tag in availableTags" :key="tag" class="tag-pill">{{ tag }}</span>
          </div>
        </div>

        <hr class="divider" />

        <!-- Pending review image submissions -->
        <div class="submissions-section">
          <div class="submissions-header">
            <h3>🖼️ Ảnh đánh giá (chờ duyệt)</h3>
            <button class="btn btn-secondary" @click="loadPendingReviewImageSubmissions" :disabled="reviewSubmissionsLoading">
              {{ reviewSubmissionsLoading ? 'Đang tải...' : 'Tải lại' }}
            </button>
          </div>

          <div v-if="reviewSubmissionsLoading" class="loading">Đang tải ảnh đánh giá chờ duyệt...</div>
          <div v-else-if="reviewSubmissionsError" class="error-message">{{ reviewSubmissionsError }}</div>
          <div v-else-if="pendingReviewImageSubmissions.length === 0" class="empty-submissions">Không có ảnh đánh giá chờ duyệt.</div>
          <div v-else class="submissions-grid">
            <div v-for="s in pendingReviewImageSubmissions" :key="s._id" class="submission-card">
              <div class="submission-image">
                <img :src="getImageUrl(s.imageUrl)" alt="review submission" />
              </div>
              <div class="submission-info">
                <div class="submission-place">Địa điểm: {{ s.place?.name || 'Không rõ địa điểm' }}</div>
                <div class="submission-user">Người gửi: {{ s.submittedBy?.parentName || s.submittedBy?.username || 'Không rõ' }}</div>
                <div class="submission-time">🕒 {{ formatDateTime(s.createdAt) }}</div>
              </div>
              <div class="submission-actions">
                <button class="btn-small btn-approve" @click="approveReviewImage(s)">✅ Duyệt</button>
                <button class="btn-small btn-reject" @click="rejectReviewImage(s)">❌ Từ chối</button>
              </div>
            </div>
          </div>
        </div>

        <hr class="divider" />

        <h3>Địa điểm trong Database ({{ places.length }})</h3>

        <div v-if="isLoading" class="loading">Đang tải...</div>
        <div v-else-if="errorMessage" class="error-message">{{ errorMessage }}</div>

        <div v-else class="places-grid">
          <div v-for="place in places" :key="place._id" class="place-card">
            <div class="place-image">
              <img :src="getImageUrl(place.images && place.images[0] ? place.images[0] : place.image)" :alt="place.name" />
              <span v-if="place.images && place.images.length > 1" class="image-count">📷 {{ place.images.length }}</span>
            </div>
            <div class="place-info">
              <h3>{{ place.name }}</h3>
              <p class="place-address">{{ cleanAddress(place.address, place.name) || 'Chưa có địa chỉ' }}</p>
              <div class="place-meta">
                <span class="meta-tag">👶 {{ place.ageRange || '0-12' }}</span>
                <span class="meta-tag">Giá: {{ formatPrice(place.price) }}</span>
              </div>
            </div>
            <div class="place-actions">
              <button @click="editPlace(place)" class="btn-small btn-edit">✏️ Sửa</button>
              <button @click="confirmDelete(place)" class="btn-small btn-delete">🗑️ Xóa</button>
            </div>
          </div>
        </div>

        <!-- Modal Thêm/Sửa địa điểm -->
        <div v-if="showAddModal || showEditModal" class="modal-overlay" @click.self="closeModals">
          <div class="modal-content">
            <h2>{{ showAddModal ? 'Thêm địa điểm mới' : 'Sửa thông tin địa điểm' }}</h2>
            <form @submit.prevent="showAddModal ? addPlace() : updatePlace()">
              <div class="form-group">
                <label>Place ID (Goong) *</label>
                <input v-model="formData.placeId" type="text" required :disabled="showEditModal" placeholder="VD: ChIJ..." />
              </div>
              <div class="form-group">
                <label>Tên địa điểm *</label>
                <input v-model="formData.name" type="text" required />
              </div>
              <div class="form-group">
                <label>Địa chỉ</label>
                <input v-model="formData.address" type="text" />
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Độ tuổi từ *</label>
                  <select v-model.number="formData.ageMin" required>
                    <option v-for="age in 13" :key="age-1" :value="age-1">{{ age-1 }} tuổi</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Độ tuổi đến *</label>
                  <select v-model.number="formData.ageMax" required>
                    <option v-for="age in 13" :key="age-1" :value="age-1">{{ age-1 }} tuổi</option>
                  </select>
                </div>
              </div>
              <div class="form-group">
                <label>Giá tiền *</label>
                <input v-model="formData.price" type="text" required placeholder="VD: Miễn phí hoặc 50.000đ" />
              </div>
              <div class="form-group">
                <label>Hình ảnh (chọn nhiều ảnh)</label>
                <input type="file" @change="handleImageUpload" accept="image/*" multiple />
                <div v-if="formData.images && formData.images.length > 0" class="images-preview">
                  <div v-for="(img, idx) in formData.images" :key="idx" class="image-preview-item">
                    <img :src="getImageUrl(img)" :alt="'Image ' + (idx + 1)" />
                    <button type="button" @click="removeImage(idx)" class="btn-remove-image">✕</button>
                  </div>
                </div>
                <div v-if="uploadingImage" class="uploading">Đang upload...</div>
              </div>
              <div class="form-group">
                <label>Mô tả</label>
                <textarea v-model="formData.description" rows="3"></textarea>
              </div>
              <div class="form-group">
                <label>Giờ mở cửa</label>
                <div class="time-picker-container">
                  <div class="time-row">
                    <label class="time-label">Giờ mở:</label>
                    <input v-model="formData.openTime" type="time" class="time-input" />
                    <label class="time-label">Giờ đóng:</label>
                    <input v-model="formData.closeTime" type="time" class="time-input" />
                  </div>
                </div>
              </div>
              <div class="form-group">
                <label>Bãi đỗ xe</label>
                <select v-model="formData.parking">
                  <option value="">Chưa cập nhật</option>
                  <option v-for="option in availableParkingOptions" :key="option" :value="option">{{ option }}</option>
                </select>
              </div>
              <div class="form-group">
                <label>Ăn uống / Picnic</label>
                <select v-model="formData.food">
                  <option value="">Chưa cập nhật</option>
                  <option v-for="option in availableFoodOptions" :key="option" :value="option">{{ option }}</option>
                </select>
              </div>
              <div class="form-group">
                <label>Tiện ích (WC, khu nghỉ)</label>
                <select v-model="formData.facilities">
                  <option value="">Chưa cập nhật</option>
                  <option v-for="option in availableFacilityOptions" :key="option" :value="option">{{ option }}</option>
                </select>
              </div>
              <div class="form-group">
                <label>Tags (chọn nhiều)</label>
                <div class="inline-tag-create">
                  <input
                    v-model="placeTagName"
                    type="text"
                    placeholder="Nhập tag mới cho địa điểm"
                    @keyup.enter.prevent="addTagToPlaceForm"
                  />
                  <button type="button" class="btn btn-secondary" @click="addTagToPlaceForm" :disabled="isAddingPlaceTag">
                    {{ isAddingPlaceTag ? 'Đang thêm...' : '+ Tag mới' }}
                  </button>
                </div>
                <div class="tags-selection">
                  <label v-for="tag in availableTags" :key="tag" class="tag-checkbox">
                    <input type="checkbox" :value="tag" v-model="formData.tags" />
                    <span class="tag-label">{{ tag }}</span>
                  </label>
                </div>
              </div>
              <div class="modal-actions">
                <button type="button" @click="closeModals" class="btn btn-secondary">Hủy</button>
                <button type="submit" class="btn btn-primary" :disabled="uploadingImage">{{ showAddModal ? 'Thêm' : 'Cập nhật' }}</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import {
  getAllPlaces,
  createPlace,
  updatePlace,
  deletePlace,
  getAllTags,
  createTag,
  searchGoongPlaces,
  addPlaceFromGoong,
  getReviewImageSubmissions,
  approveReviewImageSubmission,
  rejectReviewImageSubmission
} from '../api/admin'
import { formatPrice, hasPriceRange } from '../utils/priceFormatter'
import { cleanAddress } from '../utils/addressFormatter'
import { apiUrl, assetUrl } from '../utils/apiBase'
import { getAuthToken, getAuthUser } from '../utils/authSession'

export default {
  name: 'AdminPlaces',
  data() {
    return {
      places: [],
      isLoading: false,
      errorMessage: '',
      // Pending review-image submissions
      pendingReviewImageSubmissions: [],
      reviewSubmissionsLoading: false,
      reviewSubmissionsError: '',
      showAddModal: false,
      showEditModal: false,
      // Search Goong
      searchQuery: '',
      searchResults: [],
      isSearching: false,
      searchRequestId: 0,
      searchMessage: '',
      formData: {
        placeId: '',
        name: '',
        address: '',
        openingHours: [],
        description: '',
        images: [],
        types: [],
        ageMin: 0,
        ageMax: 12,
        price: 'Miễn phí',
        openTime: '08:00',
        closeTime: '18:00',
        parking: '',
        food: '',
        facilities: '',
        tags: []
      },
      editingPlaceId: null,
      uploadingImage: false,
      fallbackTags: [
        'Trong nhà', 'Ngoài trời', 'Picnic', 'Leo núi', 'Vận động',
        'Chụp ảnh', 'Check-in', 'Công viên', 'Giải trí',
        'Gia đình', 'Cuối tuần', 'Sinh thái', 'Thư giãn', 'Gần Hà Nội', 'Bơi lội',
        'Nông trại', 'Chăm sóc thú', 'Động vật', 'Nhà bóng', 'Cảm giác mạnh',
        'Đồ thủ công', 'Truyền thống',
        'Lịch sử', 'Văn hóa'
      ],
      availableTags: [],
      newTagName: '',
      isAddingTag: false,
      placeTagName: '',
      isAddingPlaceTag: false,
      fallbackParkingOptions: ['Có (ô tô, xe máy)', 'Có bãi đỗ xe gần địa điểm', 'Chỉ xe máy', 'Không có'],
      fallbackFoodOptions: ['Có quán ăn', 'Có quán ăn gần đó', 'Cho phép picnic', 'Có quán ăn & cho phép picnic', 'Không'],
      fallbackFacilityOptions: ['WC, khu nghỉ', 'Chỉ WC', 'Không'],
      availableParkingOptions: [],
      availableFoodOptions: [],
      availableFacilityOptions: []
    }
  },
  mounted() {
    this.checkAdmin()
    this.loadPlaces()
    this.loadTags()
    this.loadPendingReviewImageSubmissions()
  },
  methods: {
    mergeTags(...tagGroups) {
      const seen = new Set()
      const merged = []
      for (const group of tagGroups) {
        for (const tag of group || []) {
          const value = String(tag || '').trim()
          const key = value.toLowerCase()
          if (!value || seen.has(key)) continue
          seen.add(key)
          merged.push(value)
        }
      }
      return merged
    },
    checkAdmin() {
      const user = getAuthUser() || {}
      if (user.role !== 'admin') {
        this.$notify({ type: 'error', title: 'Không có quyền truy cập', message: 'Bạn cần tài khoản quản trị để mở trang này.' })
        this.$router.push('/')
      }
    },
    async loadPlaces() {
      this.isLoading = true
      this.errorMessage = ''
      const res = await getAllPlaces()
      if (res.success) {
        this.places = res.data
        this.loadPlaceOptionLists()
      } else {
        this.errorMessage = res.error || 'Lỗi tải danh sách địa điểm'
      }
      this.isLoading = false
    },
    loadPlaceOptionLists() {
      const parking = this.places.map(place => place.parking)
      const food = this.places.map(place => place.food)
      const facilities = this.places.map(place => place.facilities)
      const parkingOptions = this.mergeTags(parking, this.fallbackParkingOptions)
      const foodOptions = this.mergeTags(food)
      const facilityOptions = this.mergeTags(facilities)
      this.availableParkingOptions = parkingOptions.length ? parkingOptions : [...this.fallbackParkingOptions]
      this.availableFoodOptions = foodOptions.length ? foodOptions : [...this.fallbackFoodOptions]
      this.availableFacilityOptions = facilityOptions.length ? facilityOptions : [...this.fallbackFacilityOptions]
    },
    async loadTags() {
      const res = await getAllTags()
      if (res.success) {
        const apiTags = (res.data || []).map(tag => tag.name).filter(Boolean)
        this.availableTags = apiTags.length ? this.mergeTags(apiTags) : [...this.fallbackTags]
      } else {
        this.availableTags = [...this.fallbackTags]
      }
    },
    async addTag() {
      const name = String(this.newTagName || '').trim()
      if (!name) {
        this.$notify({ type: 'warning', title: 'Thiếu tên tag', message: 'Vui lòng nhập tên tag cần thêm.' })
        return
      }

      this.isAddingTag = true
      const res = await createTag(name)
      this.isAddingTag = false

      if (res && res.success && res.data) {
        const tagName = res.data.name || name
        this.availableTags = this.mergeTags(this.availableTags, [tagName])
        this.formData.tags = this.mergeTags(this.formData.tags, [tagName])
        this.newTagName = ''
        this.$notify({ type: 'success', title: 'Đã thêm tag', message: `Tag "${tagName}" đã được thêm.` })
      } else {
        this.$notify({ type: 'error', title: 'Không thể thêm tag', message: res?.error || 'Đã có lỗi xảy ra.' })
      }
    },
    async addTagToPlaceForm() {
      const name = String(this.placeTagName || '').trim()
      if (!name) {
        this.$notify({ type: 'warning', title: 'Thiếu tên tag', message: 'Vui lòng nhập tên tag cần thêm.' })
        return
      }

      this.isAddingPlaceTag = true
      const res = await createTag(name)
      this.isAddingPlaceTag = false

      if (res && res.success && res.data) {
        const tagName = res.data.name || name
        this.availableTags = this.mergeTags(this.availableTags, [tagName])
        this.formData.tags = this.mergeTags(this.formData.tags, [tagName])
        this.placeTagName = ''
        this.$notify({ type: 'success', title: 'Đã thêm tag', message: `Tag "${tagName}" đã được thêm vào địa điểm.` })
      } else {
        this.$notify({ type: 'error', title: 'Không thể thêm tag', message: res?.error || 'Đã có lỗi xảy ra.' })
      }
    },
    formatDateTime(iso) {
      if (!iso) return ''
      try {
        const d = new Date(iso)
        return d.toLocaleString('vi-VN')
      } catch {
        return String(iso)
      }
    },
    async loadPendingReviewImageSubmissions() {
      this.reviewSubmissionsLoading = true
      this.reviewSubmissionsError = ''
      const res = await getReviewImageSubmissions('pending', 100)
      if (res && res.success) {
        this.pendingReviewImageSubmissions = res.data || []
      } else {
        this.pendingReviewImageSubmissions = []
        this.reviewSubmissionsError = res?.error || 'Không thể tải ảnh đánh giá chờ duyệt.'
      }
      this.reviewSubmissionsLoading = false
    },
    async approveReviewImage(submission) {
      if (!submission?._id) return
      const confirmed = await this.$confirm({
        title: 'Phê duyệt ảnh đánh giá',
        message: 'Ảnh này sẽ được hiển thị trong đánh giá sau khi phê duyệt.',
        confirmText: 'Phê duyệt'
      })
      if (!confirmed) return
      const res = await approveReviewImageSubmission(submission._id)
      if (res && res.success) {
        this.$notify({ type: 'success', title: 'Đã phê duyệt ảnh', message: 'Ảnh đánh giá đã được phê duyệt.' })
        await this.loadPendingReviewImageSubmissions()
      } else {
        this.$notify({ type: 'error', title: 'Không thể phê duyệt', message: res?.error || 'Không thể phê duyệt ảnh đánh giá.' })
      }
    },
    async rejectReviewImage(submission) {
      if (!submission?._id) return
      const reason = await this.$prompt({
        title: 'Từ chối ảnh đánh giá',
        message: 'Nhập lý do từ chối nếu cần.',
        placeholder: 'Lý do từ chối',
        confirmText: 'Từ chối'
      })
      if (reason === null) return
      const res = await rejectReviewImageSubmission(submission._id, reason || '')
      if (res && res.success) {
        this.$notify({ type: 'success', title: 'Đã từ chối ảnh', message: 'Ảnh đánh giá đã được từ chối.' })
        await this.loadPendingReviewImageSubmissions()
      } else {
        this.$notify({ type: 'error', title: 'Không thể từ chối', message: res?.error || 'Không thể từ chối ảnh đánh giá.' })
      }
    },
    async addPlace() {
      const dataToSend = { ...this.formData }
      if (hasPriceRange(dataToSend.price)) {
        this.$notify({ type: 'warning', title: 'Giá chưa hợp lệ', message: 'Mỗi địa điểm chỉ có một giá cố định. Vui lòng nhập một giá, ví dụ: Miễn phí hoặc 50.000đ.' })
        return
      }
      dataToSend.price = formatPrice(dataToSend.price)
      // Tạo ageRange từ ageMin và ageMax
      dataToSend.ageRange = `${this.formData.ageMin}-${this.formData.ageMax}`
      // Tạo openingHours từ time
      if (this.formData.openTime && this.formData.closeTime) {
        dataToSend.openingHours = [`${this.formData.openTime} - ${this.formData.closeTime}`]
      } else {
        dataToSend.openingHours = []
      }
      // Xóa các field tạm
      delete dataToSend.ageMin
      delete dataToSend.ageMax
      delete dataToSend.openTime
      delete dataToSend.closeTime
      
      const res = await createPlace(dataToSend)
      if (res.success) {
        this.$notify({ type: 'success', title: 'Đã thêm địa điểm', message: 'Địa điểm mới đã được lưu vào hệ thống.' })
        this.closeModals()
        this.loadPlaces()
        this.loadTags()
      } else {
        this.$notify({ type: 'error', title: 'Không thể thêm địa điểm', message: res.error || 'Đã có lỗi xảy ra.' })
      }
    },
    editPlace(place) {
      this.editingPlaceId = place._id
      // Parse ageRange
      const ageRange = place.ageRange || '0-12'
      const ageParts = ageRange.split('-')
      // Parse openingHours
      let openTime = '08:00', closeTime = '18:00'
      if (place.openingHours && place.openingHours[0]) {
        const timeParts = place.openingHours[0].split(' - ')
        if (timeParts.length === 2) {
          openTime = timeParts[0].trim()
          closeTime = timeParts[1].trim()
        }
      }
      
      this.formData = {
        placeId: place.placeId,
        name: place.name,
        address: place.address || '',
        description: place.description || '',
        images: place.images || [],
        types: place.types || [],
        ageMin: parseInt(ageParts[0]) || 0,
        ageMax: parseInt(ageParts[1]) || 12,
        price: place.price || 'Miễn phí',
        openTime: openTime,
        closeTime: closeTime,
        parking: place.parking || '',
        food: place.food || '',
        facilities: place.facilities || '',
        tags: place.tags || []
      }
      this.availableTags = this.mergeTags(this.availableTags, place.tags || [])
      this.availableParkingOptions = this.mergeTags(this.availableParkingOptions, [place.parking])
      this.availableFoodOptions = this.mergeTags(this.availableFoodOptions, [place.food])
      this.availableFacilityOptions = this.mergeTags(this.availableFacilityOptions, [place.facilities])
      this.showEditModal = true
    },
    async updatePlace() {
      const dataToSend = { ...this.formData }
      if (hasPriceRange(dataToSend.price)) {
        this.$notify({ type: 'warning', title: 'Giá chưa hợp lệ', message: 'Mỗi địa điểm chỉ có một giá cố định. Vui lòng nhập một giá, ví dụ: Miễn phí hoặc 50.000đ.' })
        return
      }
      dataToSend.price = formatPrice(dataToSend.price)
      // Tạo ageRange từ ageMin và ageMax
      dataToSend.ageRange = `${this.formData.ageMin}-${this.formData.ageMax}`
      // Tạo openingHours từ time
      if (this.formData.openTime && this.formData.closeTime) {
        dataToSend.openingHours = [`${this.formData.openTime} - ${this.formData.closeTime}`]
      } else {
        dataToSend.openingHours = []
      }
      // Xóa các field tạm
      delete dataToSend.ageMin
      delete dataToSend.ageMax
      delete dataToSend.openTime
      delete dataToSend.closeTime
      
      const res = await updatePlace(this.editingPlaceId, dataToSend)
      if (res.success) {
        this.$notify({ type: 'success', title: 'Đã cập nhật địa điểm', message: 'Thông tin địa điểm đã được lưu.' })
        const updatedPlace = res.data
        const index = this.places.findIndex(place => place._id === this.editingPlaceId)
        if (index !== -1 && updatedPlace) {
          this.places.splice(index, 1, updatedPlace)
          this.loadPlaceOptionLists()
        }
        this.closeModals()
        this.loadTags()
      } else {
        this.$notify({ type: 'error', title: 'Không thể cập nhật địa điểm', message: res.error || 'Đã có lỗi xảy ra.' })
      }
    },
    async confirmDelete(place) {
      const confirmed = await this.$confirm({
        title: 'Xóa địa điểm',
        message: `Bạn có chắc muốn xóa địa điểm "${place.name}"?`,
        confirmText: 'Xóa',
        tone: 'danger'
      })
      if (confirmed) {
        this.deletePlaceById(place._id)
      }
    },
    async deletePlaceById(id) {
      const res = await deletePlace(id)
      if (res.success) {
        this.$notify({ type: 'success', title: 'Đã xóa địa điểm', message: 'Địa điểm đã được xóa khỏi hệ thống.' })
        const index = this.places.findIndex(place => place._id === id)
        if (index !== -1) {
          this.places.splice(index, 1)
          this.loadPlaceOptionLists()
        }
      } else {
        this.$notify({ type: 'error', title: 'Không thể xóa địa điểm', message: res.error || 'Đã có lỗi xảy ra.' })
      }
    },
    closeModals() {
      this.showAddModal = false
      this.showEditModal = false
      this.formData = {
        placeId: '',
        name: '',
        address: '',
        openingHours: [],
        description: '',
        images: [],
        types: [],
        ageMin: 0,
        ageMax: 12,
        price: 'Miễn phí',
        openTime: '08:00',
        closeTime: '18:00',
        parking: '',
        food: '',
        facilities: '',
        tags: []
      }
      this.editingPlaceId = null
      this.uploadingImage = false
      this.placeTagName = ''
      this.isAddingPlaceTag = false
    },
    async handleImageUpload(event) {
      const files = event.target.files
      if (!files || files.length === 0) return

      this.uploadingImage = true
      const formData = new FormData()
      
      // Thêm tất cả files vào formData
      for (let i = 0; i < files.length; i++) {
        formData.append('images', files[i])
      }

      try {
        const token = getAuthToken()
        const response = await fetch(apiUrl('/admin/places/upload-image'), {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: formData
        })

        const result = await response.json()
        if (result.success) {
          // Thêm các ảnh mới vào mảng images
          this.formData.images = [...this.formData.images, ...result.data.imageUrls]
        } else {
          this.$notify({ type: 'error', title: 'Không thể tải ảnh', message: result.error || 'Upload ảnh không thành công.' })
        }
      } catch (error) {
        this.$notify({ type: 'error', title: 'Không thể tải ảnh', message: error.message || 'Upload ảnh không thành công.' })
      } finally {
        this.uploadingImage = false
        // Reset input file
        event.target.value = ''
      }
    },
    removeImage(index) {
      this.formData.images.splice(index, 1)
    },
    getImageUrl(imagePath) {
      if (!imagePath) return '/Playground.jpg'
      return assetUrl(imagePath)
    },
    formatPrice,
    cleanAddress,
    // ============ GOONG SEARCH METHODS ============
    async searchGoong() {
      const query = this.searchQuery.trim()
      if (!query) {
        this.searchMessage = 'Vui lòng nhập từ khóa tìm kiếm'
        this.searchResults = []
        return
      }
      
      const requestId = ++this.searchRequestId
      this.isSearching = true
      this.searchMessage = ''
      this.searchResults = []
      
      try {
        const res = await searchGoongPlaces(query)

        if (requestId !== this.searchRequestId) return

        if (res.success) {
          this.searchResults = (res.data || []).map(result => ({
            ...result,
            adding: false
          }))
          if (this.searchResults.length === 0) {
            this.searchMessage = 'Không tìm thấy địa điểm mới (có thể đã có trong database)'
          }
        } else {
          this.searchMessage = 'Lỗi: ' + (res.error || 'Không thể tìm kiếm')
        }
      } finally {
        if (requestId === this.searchRequestId) {
          this.isSearching = false
        }
      }
    },
    async addFromGoongDirect(place) {
      // Đánh dấu đang thêm
      place.adding = true
      
      const dataToSend = {
        placeId: place.placeId,
        name: place.name || place.mainText,
        ageMin: 0,
        ageMax: 12,
        price: 'Miễn phí',
        tags: []
      }
      
      const res = await addPlaceFromGoong(dataToSend)
      
      if (res.success) {
        // Xóa kết quả đã thêm khỏi list
        this.searchResults = this.searchResults.filter(r => r.placeId !== place.placeId)
        this.loadPlaces()
        this.$notify({ type: 'success', title: 'Đã thêm địa điểm', message: 'Địa điểm từ Goong đã được thêm vào hệ thống.' })
      } else {
        this.$notify({ type: 'error', title: 'Không thể thêm địa điểm', message: res.error || 'Không thể thêm địa điểm.' })
        place.adding = false
      }
    }
  }
}
</script>

<style scoped>
.admin-places-page {
  background: var(--tw-bg);
  min-height: 100%;
  display: flex;
  flex-direction: column;
}

.site-header {
  position: relative;
  z-index: 10;
}

.content { padding: 0; }

.admin-container {
  padding: 0;
}

.page-hero { position: relative; padding: 34px 0 26px 0; overflow: hidden; }
.page-hero::before { content: ''; position: absolute; inset: 0; background-image: url('~@/../public/Playground.jpg'); background-size: cover; background-position: center; transform: scale(1.02); }
.page-hero::after { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(15, 23, 42, 0.72) 0%, rgba(15, 23, 42, 0.45) 60%, rgba(15, 23, 42, 0.3) 100%); }
.page-hero-inner { position: relative; z-index: 1; text-align: center; color: #fff; }
.page-hero-inner h1 { margin: 0 0 8px 0; font-size: 2rem; font-weight: 900; letter-spacing: -0.03em; }
.page-hero-inner p { margin: 0; color: rgba(255,255,255,0.88); font-weight: 600; line-height: 1.5; }

.page-body { padding-top: 26px; padding-bottom: 46px; }

.header-actions {
  display: flex;
  gap: 10px;
}

.btn {
  padding: 10px 20px;
  border: 1px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  display: inline-block;
  transition: all 0.3s;
}

.btn-primary {
  background: var(--tw-primary);
  color: white;
}

.btn-primary:hover {
  background: var(--tw-primary-600);
}

.btn-secondary {
  background: transparent;
  border-color: var(--tw-border);
  color: var(--tw-text);
}

.btn-secondary:hover {
  border-color: rgba(99, 102, 241, 0.35);
  background: rgba(99, 102, 241, 0.06);
}

.btn-success {
  background: #2196F3;
  color: white;
}

.btn-success:hover {
  background: #1976D2;
}

/* Search Section */
.search-section {
  background: var(--tw-surface);
  border: 1px solid var(--tw-border);
  padding: 20px;
  border-radius: var(--tw-radius-lg);
  margin-bottom: 20px;
  box-shadow: var(--tw-shadow-sm);
}

.search-section h3 {
  margin: 0 0 15px 0;
  font-size: 18px;
  color: #333;
}

.search-bar {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

.search-bar input {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid var(--tw-border);
  border-radius: 8px;
  font-size: 14px;
}

.search-bar input:focus {
  outline: none;
  border-color: rgba(99, 102, 241, 0.65);
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.12);
}

.search-results {
  margin-top: 15px;
}

.search-results h4 {
  margin: 0 0 10px 0;
  font-size: 14px;
  color: #666;
}

.search-results-list {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #eee;
  border-radius: 8px;
}

.search-result-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 15px;
  border-bottom: 1px solid #eee;
  transition: background 0.2s;
}

.search-result-item:last-child {
  border-bottom: none;
}

.search-result-item:hover {
  background: #f9f9f9;
}

.result-info {
  flex: 1;
}

.result-info strong {
  display: block;
  color: #333;
  margin-bottom: 4px;
}

.result-secondary {
  font-size: 12px;
  color: #888;
}

.search-message {
  padding: 10px;
  color: #666;
  font-style: italic;
}

.divider {
  border: none;
  border-top: 1px solid var(--tw-border);
  margin: 25px 0;
}

.tag-admin-section {
  background: var(--tw-surface);
  border: 1px solid var(--tw-border);
  padding: 20px;
  border-radius: var(--tw-radius-lg);
  margin-bottom: 20px;
  box-shadow: var(--tw-shadow-sm);
}

.tag-admin-header {
  margin-bottom: 14px;
}

.tag-admin-header h3 {
  margin: 0 0 6px 0;
  font-size: 18px;
  color: var(--tw-text);
}

.tag-admin-header p {
  margin: 0;
  color: var(--tw-muted);
}

.tag-admin-form {
  display: flex;
  align-items: stretch;
  gap: 10px;
}

.tag-admin-form input {
  flex: 1;
  min-width: 0;
  border: 1px solid var(--tw-border);
  border-radius: 10px;
  padding: 10px 12px;
  color: var(--tw-text);
}

.tag-admin-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.tag-pill {
  border: 1px solid var(--tw-border);
  border-radius: 999px;
  background: #f8fafc;
  color: var(--tw-text);
  padding: 6px 10px;
  font-size: 0.86rem;
  font-weight: 700;
}

.checkbox-form-group {
  display: flex;
  align-items: end;
}

.checkbox-inline {
  display: inline-flex !important;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px !important;
}

.checkbox-inline input {
  width: auto !important;
}

/* Pending submissions */
.submissions-section {
  background: var(--tw-surface);
  border: 1px solid var(--tw-border);
  padding: 20px;
  border-radius: var(--tw-radius-lg);
  margin-bottom: 20px;
  box-shadow: var(--tw-shadow-sm);
}

.submissions-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.submissions-header h3 {
  margin: 0;
  font-size: 18px;
  color: #333;
}

.empty-submissions {
  color: #666;
  font-style: italic;
}

.submissions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 14px;
}

.submission-card {
  border: 1px solid #eee;
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.submission-image {
  height: 160px;
  background: #f3f4f6;
}

.submission-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.submission-info {
  padding: 12px;
  color: #444;
  font-size: 13px;
  display: grid;
  gap: 6px;
}

.submission-place {
  font-weight: 700;
  color: #333;
}

.submission-actions {
  padding: 12px;
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  border-top: 1px solid #eee;
}

.btn-approve {
  background: #10b981;
  color: white;
}

.btn-approve:hover {
  background: #059669;
}

.btn-reject {
  background: #ef4444;
  color: white;
}

.btn-reject:hover {
  background: #dc2626;
}

.goong-place-info {
  background: #f5f5f5;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.goong-place-info p {
  margin: 0;
}

.goong-place-info .secondary-text {
  font-size: 13px;
  color: #666;
  margin-top: 5px;
}

.modal-small {
  max-width: 500px;
}

.loading, .error-message {
  text-align: center;
  padding: 40px;
  font-size: 16px;
}

.error-message {
  color: #f44336;
}

.places-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.place-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  overflow: hidden;
  transition: transform 0.3s;
}

.place-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.place-image {
  width: 100%;
  height: 200px;
  overflow: hidden;
  background: #e0e0e0;
  position: relative;
}

.place-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-count {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.place-info {
  padding: 16px;
  flex: 1;
}

.place-card {
  display: flex;
  flex-direction: column;
}

.place-actions {
  padding: 0 16px 16px 16px;
  display: flex;
  gap: 8px;
  margin-top: auto;
}

.place-info h3 {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.place-address,
.place-rating {
  font-size: 14px;
  color: #666;
  margin: 4px 0;
}

.place-meta {
  display: flex;
  gap: 8px;
  margin: 8px 0;
  flex-wrap: wrap;
}

.meta-tag {
  font-size: 12px;
  padding: 4px 8px;
  background: #f0f0f0;
  border-radius: 4px;
  color: #555;
}



.btn-small {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

.btn-edit {
  background: #2196F3;
  color: white;
}

.btn-edit:hover {
  background: #1976D2;
}

.btn-delete {
  background: #f44336;
  color: white;
}

.btn-delete:hover {
  background: #d32f2f;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.modal-content {
  background: var(--tw-surface);
  padding: 30px;
  border-radius: var(--tw-radius-lg);
  border: 1px solid var(--tw-border);
  box-shadow: var(--tw-shadow-lg);
  max-width: 600px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-content h2 {
  margin-bottom: 20px;
  color: #333;
}

.form-group {
  margin-bottom: 16px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  color: #333;
  font-size: 14px;
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 10px;
  border: 1px solid var(--tw-border);
  border-radius: 6px;
  font-size: 14px;
  font-family: inherit;
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  outline: none;
  border-color: rgba(99, 102, 241, 0.65);
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.12);
}

.time-picker-container {
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 12px;
  background: #f9f9f9;
}

.time-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.time-row:last-child {
  margin-bottom: 0;
}

.day-label,
.time-label {
  font-weight: 500;
  font-size: 13px;
  color: #555;
  min-width: 70px;
}

.days-select {
  flex: 1;
  min-height: 80px;
  padding: 8px;
}

.time-input {
  flex: 1;
  padding: 8px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.time-input:focus {
  outline: none;
  border-color: #4CAF50;
}

/* Tags Selection */
.inline-tag-create {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}

.inline-tag-create input {
  flex: 1;
  min-width: 0;
  border: 1px solid var(--tw-border);
  border-radius: 10px;
  padding: 10px 12px;
}

.tags-selection {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: #f9f9f9;
  max-height: 200px;
  overflow-y: auto;
}

.tag-checkbox {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.tag-checkbox input[type="checkbox"] {
  display: none;
}

.tag-label {
  padding: 6px 12px;
  background: #e2e8f0;
  border-radius: 20px;
  font-size: 0.85rem;
  color: #475569;
  transition: all 0.2s;
  user-select: none;
}

.tag-checkbox input[type="checkbox"]:checked + .tag-label {
  background: #6366f1;
  color: white;
}

.tag-label:hover {
  background: #c7d2fe;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.images-preview {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 10px;
  margin-top: 10px;
}

.image-preview-item {
  position: relative;
  border: 2px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
  aspect-ratio: 1;
}

.image-preview-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.btn-remove-image {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(244, 67, 54, 0.9);
  color: white;
  border: none;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  line-height: 1;
}

.btn-remove-image:hover {
  background: #d32f2f;
}

.image-preview {
  margin-top: 10px;
  border: 2px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
  max-width: 300px;
}

.image-preview img {
  width: 100%;
  height: auto;
  display: block;
}

.uploading {
  margin-top: 10px;
  color: #2196F3;
  font-weight: 500;
}

.site-footer { background: #fff; border-top: 1px solid var(--tw-border); padding: 14px 16px; text-align: center; color: #6b7280; font-size: 0.9rem; }
</style>
