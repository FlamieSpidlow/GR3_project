<template>
  <div class="place-details-page">
    <main class="site-main">
      <div v-if="isLoading" class="loading-spinner">
        <p>Đang tải chi tiết địa điểm...</p>
      </div>

      <div v-else-if="errorMessage" class="error-message">
        {{ errorMessage }}
        <router-link to="/" class="back-link">Quay lại trang chủ</router-link>
      </div>

      <div v-else-if="place" class="place-container">
        <!-- Two Column Layout -->
        <div class="place-layout">
          <!-- Left: Image Gallery -->
          <div class="gallery-section">
            <div class="main-image-wrapper" @click="openLightbox(currentImageIndex)">
              <img 
                :src="getImageUrl(place.images && place.images.length > 0 ? place.images[currentImageIndex] : place.image)" 
                :alt="place.name" 
                class="main-image" 
              />
              <div v-if="place.images && place.images.length > 1" class="image-nav">
                <button @click.stop="previousImage" class="nav-btn prev" aria-label="Ảnh trước">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M15 18 9 12l6-6" />
                  </svg>
                </button>
                <button @click.stop="nextImage" class="nav-btn next" aria-label="Ảnh tiếp theo">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </button>
              </div>
            </div>
            <div v-if="place.images && place.images.length > 1" class="thumbnails">
              <div 
                v-for="(img, idx) in place.images" 
                :key="idx" 
                :class="['thumb', { active: idx === currentImageIndex }]"
                @click="currentImageIndex = idx"
              >
                <img :src="getImageUrl(img)" :alt="place.name" />
              </div>
            </div>
          </div>

          <!-- Right: Info -->
          <div class="info-section">
            <h1 class="place-name">{{ place.name }}</h1>
            
            <div class="rating-row">
              <span class="stars">{{ renderStars(place.rating) }}</span>
              <span class="rating-value" v-if="place.rating && place.rating > 0">{{ place.rating }}/5</span>
              <span class="rating-value no-rating" v-else>Chưa có đánh giá</span>
              <span class="review-count" v-if="reviewStats.reviewCount > 0">({{ reviewStats.reviewCount }} đánh giá)</span>
            </div>

            <!-- Tags -->
            <div class="tags-row" v-if="place.tags && place.tags.length > 0">
              <span v-for="tag in place.tags" :key="tag" class="tag">{{ tag }}</span>
            </div>

            <div class="quick-info">
              <div class="info-badge" v-if="userDistance !== null">
                <span>{{ formatDistance(userDistance) }}</span>
              </div>
              <div class="info-badge">
                <span class="badge-icon">👶</span>
                <span>{{ place.ageRange || '0-12' }} tuổi</span>
              </div>
              <div class="info-badge">
                <span class="badge-icon">💰</span>
                <span>{{ formatPrice(place.price) }}</span>
              </div>
            </div>

            <!-- Thông tin nhanh -->
            <div class="facilities-grid">
              <div class="facility-item" v-if="place.parking">
                <span class="facility-icon">🅿️</span>
                <div class="facility-info">
                  <span class="facility-label">Bãi đỗ xe</span>
                  <span class="facility-value">{{ place.parking }}</span>
                </div>
              </div>
              <div class="facility-item" v-if="place.food">
                <span class="facility-icon">🍽️</span>
                <div class="facility-info">
                  <span class="facility-label">Ăn uống</span>
                  <span class="facility-value">{{ place.food }}</span>
                </div>
              </div>
              <div class="facility-item" v-if="place.facilities">
                <span class="facility-icon">🚻</span>
                <div class="facility-info">
                  <span class="facility-label">Tiện ích</span>
                  <span class="facility-value">{{ place.facilities }}</span>
                </div>
              </div>
            </div>

            <div class="details-list">
              <div class="detail-item">
                <span class="detail-icon">🏠</span>
                <span class="detail-text">{{ cleanAddress(place.address, place.name) || 'Địa chỉ không rõ' }}</span>
              </div>
              <div class="detail-item" v-if="place.phone">
                <span class="detail-icon">📞</span>
                <span class="detail-text">{{ place.phone }}</span>
              </div>
              <div class="detail-item" v-if="place.openingHours && place.openingHours.length">
                <span class="detail-icon">🕐</span>
                <span class="detail-text">{{ formatOpeningHours(place.openingHours) }}</span>
              </div>
              <div class="detail-item" v-if="place.website">
                <span class="detail-icon">🌐</span>
                <a :href="place.website" target="_blank" class="detail-link">{{ place.website }}</a>
              </div>
            </div>

            <div class="action-row">
              <div v-if="isFreePlace" class="free-entry-note">
                Miễn phí, không cần đặt vé
              </div>
              <button v-else class="btn-ticket-action" @click="openTicketModal">
                Đặt vé
              </button>
              <a
                v-if="canOpenMap"
                class="btn-map-action"
                :href="mapDirectionsUrl"
                target="_blank"
                rel="noopener noreferrer"
              >
                Ch&#7881; &#273;&#432;&#7901;ng
              </a>
              <button 
                class="btn-favorite" 
                :class="{ active: isFavorited }" 
                @click="toggleFavorite"
              >
                <svg class="favorite-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
                <span>{{ isFavorited ? 'Đã lưu' : 'Lưu yêu thích' }}</span>
              </button>
            </div>

          </div>
        </div>

        <section v-if="canOpenMap" class="map-section">
          <iframe
            class="map-frame"
            :src="mapEmbedUrl"
            :title="`Ban do ${place.name}`"
            loading="lazy"
            referrerpolicy="no-referrer-when-downgrade"
          ></iframe>
        </section>

        <!-- Description Section -->
        <div v-if="place.description" class="description-section">
          <h2>Giới thiệu</h2>
          <p>{{ place.description }}</p>
        </div>

        <!-- Reviews Section -->
        <div class="reviews-section">
          <div class="reviews-header">
            <div class="reviews-title-section">
              <h2>Bình luận</h2>
            </div>
          </div>

          <!-- Form viết bình luận -->
          <div v-if="isLoggedIn" class="write-review-box">
            <div class="write-review-header">
              <img :src="getAvatarUrl(currentUserAvatar)" class="write-avatar" alt="Your avatar" @error="handleAvatarError" />
              <div class="write-prompt">
                <span class="write-name">{{ currentUserName }}</span>
                <span class="write-hint">Chia sẻ trải nghiệm của bạn...</span>
              </div>
            </div>
            <button @click="showReviewModal = true" class="write-review-btn">
              Viết đánh giá
            </button>
          </div>
          <div v-else class="login-to-review">
            <p><router-link to="/login">Đăng nhập</router-link> để chia sẻ trải nghiệm của bạn.</p>
          </div>

          <!-- Danh sách đánh giá -->
          <div class="reviews-list">
            <div v-if="reviewsLoading" class="loading-reviews">
              <div class="loading-spinner-reviews"></div>
              <p>Đang tải bình luận...</p>
            </div>
            <div v-else-if="reviews.length === 0" class="no-reviews">
              <h3>Chưa có bình luận nào</h3>
              <p>Hãy là người đầu tiên chia sẻ trải nghiệm của bạn.</p>
            </div>
            <div v-else class="reviews-container">
              <div v-for="review in reviews" :key="review._id" class="review-card">
                <div class="review-card-header">
                  <div class="reviewer-info">
                    <img 
                      :src="getAvatarUrl(review.user?.avatar)" 
                      class="reviewer-avatar" 
                      alt="Avatar"
                      @error="handleAvatarError"
                    />
                    <div class="reviewer-details">
                      <span class="reviewer-name">{{ review.user?.parentName || review.user?.username || 'Ẩn danh' }}</span>
                      <div class="review-rating-inline">
                        <span class="stars-display">{{ renderStars(review.rating) }}</span>
                      </div>
                      <div class="review-meta">
                        <span class="review-date">{{ formatDate(review.createdAt) }}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    class="review-like-btn"
                    :disabled="!canReactToReview(review) || reactingReviewId === review._id"
                    @click="toggleReviewReaction(review, 'like')"
                    :class="{ active: review.myReaction === 'like' }"
                    aria-label="Thích đánh giá"
                  >
                    <svg class="reaction-icon" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M14 9V5a3 3 0 0 0-3-3L7 11v11h10.28a2 2 0 0 0 1.98-1.7l1.38-9A2 2 0 0 0 18.66 9H14z"
                      />
                      <path
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"
                      />
                    </svg>
                    <span class="reaction-count">{{ review.likeCount || 0 }}</span>
                  </button>
                </div>
                
                <div class="review-body">
                  <p class="review-text">{{ review.comment }}</p>
                  
                  <div v-if="review.images && review.images.length > 0" class="review-gallery">
                    <div 
                      v-for="(img, idx) in review.images" 
                      :key="idx" 
                      class="review-image-wrapper"
                      @click="openImageModal(img)"
                    >
                      <img :src="getImageUrl(img)" alt="Review image" />
                      <div class="image-overlay">
                        <span>Xem ảnh</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="review-footer" v-if="canDeleteReview(review)">
                  <button @click="editReviewItem(review)" class="review-action-btn edit">
                    Chỉnh sửa
                  </button>
                  <button @click="deleteReviewItem(review._id)" class="review-action-btn delete">
                    Xóa
                  </button>
                </div>
              </div>

              <div
                v-if="!showAllReviews && reviewsPagination.total > reviewsPagination.limit"
                class="reviews-pagination"
              >
                <button @click="showAllReviewsList" class="pagination-btn">
                  Các đánh giá khác về địa điểm này
                </button>
              </div>

              <!-- Pagination -->
              <div v-if="showAllReviews && reviewsPagination.totalPages > 1" class="reviews-pagination">
                <button 
                  @click="loadReviews(reviewsPagination.page - 1)" 
                  :disabled="reviewsPagination.page === 1"
                  class="pagination-btn"
                >
                  <span>←</span> Trước
                </button>
                <div class="pagination-info">
                  <span class="current-page">{{ reviewsPagination.page }}</span>
                  <span class="page-separator">/</span>
                  <span class="total-pages">{{ reviewsPagination.totalPages }}</span>
                </div>
                <button 
                  @click="loadReviews(reviewsPagination.page + 1)" 
                  :disabled="reviewsPagination.page === reviewsPagination.totalPages"
                  class="pagination-btn"
                >
                  Tiếp <span>→</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Nearby Similar Places Section -->
        <div class="nearby-section" v-if="nearbyPlaces.length > 0">
          <h2>🏞️ Địa điểm tương tự gần đây</h2>
          <div class="nearby-grid">
            <div 
              v-for="nearby in nearbyPlaces" 
              :key="nearby._id || nearby.id" 
              class="nearby-card"
              @click="goToPlace(nearby._id || nearby.id)"
            >
              <div class="nearby-image">
                <img :src="getImageUrl(nearby.images && nearby.images[0] || nearby.image)" :alt="nearby.name" />
              </div>
              <div class="nearby-info">
                <h4>{{ nearby.name }}</h4>
                <div class="nearby-meta">
                  <span v-if="nearby.rating">⭐ {{ nearby.rating }}/5</span>
                  <span v-else>Chưa có đánh giá</span>
                  <span v-if="nearby.distance">{{ formatDistance(nearby.distance) }}</span>
                </div>
                <div class="nearby-tags" v-if="nearby.tags && nearby.tags.length">
                  <span v-for="tag in nearby.tags.slice(0, 2)" :key="tag" class="mini-tag">{{ tag }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="no-place">
        <p>Không tìm thấy địa điểm này.</p>
        <router-link to="/" class="back-link">Quay lại trang chủ</router-link>
      </div>
    </main>

    <!-- Lightbox Modal -->
    <div v-if="showLightbox" class="lightbox-overlay" @click.self="closeLightbox">
      <button class="lightbox-close" @click="closeLightbox" aria-label="Đóng">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      </button>
      <button class="lightbox-nav prev" @click="prevLightboxImage" v-if="allImages.length > 1" aria-label="Ảnh trước">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M15 18 9 12l6-6" />
        </svg>
      </button>
      <img :src="getImageUrl(allImages[lightboxIndex])" class="lightbox-image" />
      <button class="lightbox-nav next" @click="nextLightboxImage" v-if="allImages.length > 1" aria-label="Ảnh tiếp theo">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m9 18 6-6-6-6" />
        </svg>
      </button>
      <div class="lightbox-counter" v-if="allImages.length > 1">
        {{ lightboxIndex + 1 }} / {{ allImages.length }}
      </div>
    </div>

    <div v-if="showTicketModal" class="ticket-modal-overlay" @click.self="closeTicketModal">
      <div class="ticket-modal">
        <div class="modal-header">
          <h3>Đặt vé</h3>
          <button v-if="!ticketPaymentCompleted" @click="closeTicketModal" class="close-modal-btn">×</button>
        </div>
        <form v-if="!createdTicketOrder" class="ticket-form" @submit.prevent="submitTicketOrder">
          <div class="ticket-place">
            <strong>{{ place.name }}</strong>
            <span>{{ cleanAddress(place.address, place.name) || 'Địa chỉ không rõ' }}</span>
          </div>

          <div class="form-group">
            <label>Ngày đi *</label>
            <input v-model="ticketForm.visitDate" type="date" :min="minVisitDate" required />
          </div>

          <div class="ticket-quantity-grid">
            <div class="form-group">
              <label>Vé người lớn</label>
              <input v-model.number="ticketForm.adultQuantity" type="number" min="0" max="50" />
            </div>
            <div class="form-group">
              <label>Vé trẻ em</label>
              <input v-model.number="ticketForm.childQuantity" type="number" min="0" max="50" />
            </div>
          </div>

          <div class="form-group">
            <label>Ghi chú</label>
            <textarea v-model="ticketForm.note" rows="3" placeholder="Ví dụ: cần hỗ trợ thêm, đi theo nhóm..."></textarea>
          </div>


          <div class="form-group payment-method-fixed">
            <label>Phuong thuc thanh toan</label>
            <div class="fixed-payment-badge">VNPAY QR</div>
            <small>Thanh toan bang QR VNPAY hoac app ngan hang co ho tro VNPAY.</small>
          </div>

          <div class="ticket-summary">
            <div>
              <span>Đơn giá tham khảo</span>
              <strong>{{ formatPrice(ticketUnitPrice) }}</strong>
            </div>
            <div>
              <span>Tổng tiền</span>
              <strong>{{ formatPrice(ticketTotalPrice) }}</strong>
            </div>
          </div>

          <div v-if="ticketError" class="ticket-error">{{ ticketError }}</div>
          <div v-if="ticketSuccess" class="ticket-success">{{ ticketSuccess }}</div>

          <div class="modal-footer">
            <button type="button" class="btn-cancel" @click="closeTicketModal">Hủy</button>
            <button type="submit" class="btn-submit" :disabled="ticketSubmitting">
              {{ ticketSubmitting ? 'Đang gửi...' : 'Gửi yêu cầu' }}
            </button>
          </div>
        </form>
        <div v-else class="ticket-payment">
          <div class="ticket-place">
            <strong>{{ place.name }}</strong>
            <span>{{ cleanAddress(place.address, place.name) || 'Địa chỉ không rõ' }}</span>
          </div>

          <div class="payment-summary">
            <div>
              <span>Mã đơn</span>
              <strong>{{ createdTicketOrder._id }}</strong>
            </div>
            <div>
              <span>Tổng tiền</span>
              <strong>{{ formatPrice(createdTicketOrder.totalPrice) }}</strong>
            </div>
          </div>

          <div v-if="!ticketPaymentCompleted" class="payment-qr-wrap">
            <img v-if="paymentQrImage" :src="paymentQrImage" class="payment-qr-image" alt="Mã QR thanh toán" />
            <div v-else class="payment-qr-empty">
              Chưa tạo được QR thanh toán. Vui lòng kiểm tra cấu hình thanh toán.
            </div>
            <div v-if="createdTicketOrder.payment?.transferContent" class="transfer-content">
              Noi dung chuyen khoan: <strong>{{ createdTicketOrder.payment.transferContent }}</strong>
            </div>
            <div v-if="paymentQrImage && createdTicketOrder.payment?.provider === 'vietqr' && !createdTicketOrder.payment?.qrUrl && createdTicketOrder.payment?.transferContent" class="transfer-hint">
              QR này chứa nội dung chuyển khoản. Để có QR ngân hàng tự điền số tiền/tài khoản, cấu hình VIETQR_BANK_ID và VIETQR_ACCOUNT_NO ở backend.
            </div>
            <div v-if="paymentQrImage && createdTicketOrder.payment?.provider === 'zalopay'" class="transfer-hint">
              Quét QR này bằng ZaloPay hoặc app ngân hàng được hỗ trợ. Sau khi ZaloPay xác nhận thành công, vé điện tử sẽ tự xuất hiện trong mục Vé của tôi.
            </div>
            <div v-if="paymentQrImage && createdTicketOrder.payment?.provider === 'vnpay'" class="transfer-hint">
              Quét QR này bằng app ngân hàng có hỗ trợ VNPAY. Sau khi VNPAY xác nhận thành công, vé điện tử sẽ tự xuất hiện trong mục Vé của tôi.
            </div>
            <div v-if="createdTicketOrder.payment?.provider === 'vietqr'" class="transfer-hint">
              VietQR chỉ được ghi nhận thành công khi hệ thống nhận webhook ngân hàng hoặc admin xác nhận giao dịch. Chuyển khoản xong có thể mất vài phút để đối soát.
            </div>
            <button
              v-if="createdTicketOrder"
              type="button"
              class="btn-check-payment"
              @click="checkCurrentTicketPayment"
            >
              Kiểm tra trạng thái thanh toán
            </button>
          </div>

          <div v-if="ticketError" class="ticket-error">{{ ticketError }}</div>
          <div v-if="ticketSuccess" class="ticket-success">{{ ticketSuccess }}</div>

          <div v-if="ticketPaymentCompleted" class="modal-footer centered">
            <button
              type="button"
              class="btn-submit"
              @click="goHomeAfterPayment"
            >
              Quay lại trang chủ
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Review Modal -->
    <div v-if="showReviewModal" class="review-modal-overlay" @click.self="closeReviewModal">
      <div class="review-modal">
        <div class="modal-header">
          <h3>{{ editingReviewId ? 'Sửa đánh giá' : 'Viết đánh giá' }}</h3>
          <button @click="closeReviewModal" class="close-modal-btn">×</button>
        </div>
        <div class="modal-body">
          <div class="rating-input">
            <label>Đánh giá của bạn:</label>
            <div class="star-rating-large">
              <span 
                v-for="star in 5" 
                :key="star" 
                :class="['star', { active: star <= newReview.rating }]"
                @click="newReview.rating = star"
                @mouseenter="hoverRating = star"
                @mouseleave="hoverRating = 0"
              >{{ (hoverRating || newReview.rating) >= star ? '★' : '☆' }}</span>
            </div>
            <span class="rating-label">{{ getRatingLabel(newReview.rating) }}</span>
          </div>
          <div class="comment-input">
            <label>Nhận xét của bạn:</label>
            <textarea 
              v-model="newReview.comment" 
              placeholder="Chia sẻ trải nghiệm của bạn về địa điểm này..."
              rows="5"
            ></textarea>
          </div>

          <div class="review-images-input">
            <label>Ảnh:</label>

            <div v-if="editingReviewId && existingReviewImages.length > 0" class="review-existing-images">
              <div class="existing-title">Ảnh hiện có</div>
              <div class="review-images-preview">
                <div v-for="(src, idx) in existingReviewImages" :key="src + idx" class="preview-item">
                  <img :src="getImageUrl(src)" alt="existing" />
                  <button type="button" class="btn-remove-preview" @click="removeExistingReviewImage(idx)">✕</button>
                </div>
              </div>
            </div>

            <div v-if="editingReviewId && myReviewImageSubmissions.length > 0" class="review-submitted-images">
              <div class="existing-title">Ảnh bạn đã gửi (chờ duyệt)</div>
              <div class="review-images-preview">
                <div v-for="s in myReviewImageSubmissions.slice(0, 9)" :key="s._id" class="preview-item">
                  <img :src="getImageUrl(s.imageUrl)" alt="submitted" />
                  <div class="preview-status" :class="s.status">{{ submissionStatusLabel(s.status) }}</div>
                </div>
              </div>
            </div>

            <input
              ref="reviewImageInput"
              class="review-images-native"
              type="file"
              accept="image/*"
              multiple
              @change="onSelectReviewImages"
            />

            <div class="review-images-toolbar">
              <button
                type="button"
                class="btn-pick-images"
                @click="openReviewImagePicker"
                :disabled="(editingReviewId ? existingReviewImages.length : 0) + reviewImageFiles.length >= 3"
              >
                + Chọn ảnh
              </button>
              <span class="review-images-meta">
                {{ (editingReviewId ? existingReviewImages.length : 0) + reviewImageFiles.length }}/3 ảnh
              </span>
            </div>
            <div class="review-images-hint">Bạn có thể chọn tối đa 3 ảnh.</div>

            <div v-if="reviewImagePreviews.length > 0" class="review-images-preview">
              <div v-for="(src, idx) in reviewImagePreviews" :key="idx" class="preview-item">
                <img :src="src" alt="preview" />
                <button type="button" class="btn-remove-preview" @click="removeReviewImage(idx)">✕</button>
              </div>
            </div>
          </div>

          <div v-if="reviewError" class="review-error">{{ reviewError }}</div>
        </div>
        <div class="modal-footer">
          <button @click="closeReviewModal" class="btn-cancel">Hủy</button>
          <button @click="submitReview" :disabled="submittingReview" class="btn-submit">
            {{ submittingReview ? 'Đang gửi...' : 'Gửi đánh giá' }}
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script>
import { getPlaceById, getAllPlaces } from '../api/places'
import { getReviews, createReview, updateReview, deleteReview, getMyReviewImageSubmissions, reactToReview } from '../api/reviews'
import { getProfile, updateLocation, updateFavorite } from '../api/auth'
import { createTicketOrder, getTicketPaymentStatus } from '../api/tickets'
import { formatPrice, parsePriceValue } from '../utils/priceFormatter'
import { cleanAddress } from '../utils/addressFormatter'
import { assetUrl } from '../utils/apiBase'
import { buildMapsDirectionsUrl, buildMapsEmbedUrl, hasMapTarget } from '../utils/mapLinks'
import { getAuthToken, getAuthUserRaw } from '../utils/authSession'
import { getBrowserLocationCached } from '../utils/clientCache'
import { loadNotifications, requestConfirmation } from '../utils/notifications'
import QRCode from 'qrcode'

export default {
  name: 'PlaceDetails',
  data() {
    return {
      place: null,
      isLoading: false,
      errorMessage: '',
      currentImageIndex: 0,
      // User location
      userLocation: null,
      userDistance: null,
      // Nearby places
      nearbyPlaces: [],
      // Lightbox
      showLightbox: false,
      lightboxIndex: 0,
      // Reviews
      reviews: [],
      reviewsLoading: false,
      reviewsPagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
      reviewStats: { avgRating: 0, reviewCount: 0 },
      showAllReviews: false,
      reactingReviewId: null,
      // New review form
      showReviewModal: false,
      hoverRating: 0,
      newReview: {
        rating: 5,
        comment: ''
      },
      reviewImageFiles: [],
      reviewImagePreviews: [],
      existingReviewImages: [],
      myReviewImageSubmissions: [],
      submittingReview: false,
      reviewError: '',
      hasReviewed: false,
      isFavorited: false,
      editingReviewId: null,
      showTicketModal: false,
      ticketSubmitting: false,
      ticketError: '',
      ticketSuccess: '',
      createdTicketOrder: null,
      paymentQrImage: '',
      paymentOrigin: '',
      paymentStatusTimer: null,
      ticketPaymentCompleted: false,
      ticketForm: {
        visitDate: '',
        adultQuantity: 1,
        childQuantity: 0,
        note: '',
        paymentMethod: 'vnpay'
      }
    }
  },
  computed: {
    isLoggedIn() {
      return !!getAuthToken()
    },
    currentUserId() {
      const user = getAuthUserRaw()
      if (user) {
        try {
          const parsed = JSON.parse(user)
          return parsed._id || parsed.id
        } catch {
          return null
        }
      }
      return null
    },
    currentUserRole() {
      const user = getAuthUserRaw()
      if (user) {
        try {
          return JSON.parse(user).role
        } catch {
          return 'user'
        }
      }
      return 'user'
    },
    currentUserAvatar() {
      const user = getAuthUserRaw()
      if (user) {
        try {
          return JSON.parse(user).avatar || ''
        } catch {
          return ''
        }
      }
      return ''
    },
    currentUserName() {
      const user = getAuthUserRaw()
      if (user) {
        try {
          const parsed = JSON.parse(user)
          return parsed.parentName || parsed.username || 'Bạn'
        } catch {
          return 'Bạn'
        }
      }
      return 'Bạn'
    },
    allImages() {
      if (!this.place) return []
      if (this.place.images && this.place.images.length > 0) {
        return this.place.images
      }
      return this.place.image ? [this.place.image] : []
    },
    minVisitDate() {
      const now = new Date()
      const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      return localDate.toISOString().slice(0, 10)
    },
    ticketUnitPrice() {
      return parsePriceValue(this.place && this.place.price)
    },
    isFreePlace() {
      return this.ticketUnitPrice <= 0
    },
    ticketTotalPrice() {
      const adult = Number.parseInt(this.ticketForm.adultQuantity, 10) || 0
      const child = Number.parseInt(this.ticketForm.childQuantity, 10) || 0
      return this.ticketUnitPrice * Math.max(0, adult + child)
    },
    canOpenMap() {
      return hasMapTarget(this.place)
    },
    mapDirectionsUrl() {
      return buildMapsDirectionsUrl(this.place)
    },
    mapEmbedUrl() {
      return buildMapsEmbedUrl(this.place)
    }
  },
  watch: {
    '$route.params.id': {
      handler(newId, oldId) {
        if (newId && newId !== oldId) {
          // Reset state when navigating to a different place
          this.currentImageIndex = 0
          this.nearbyPlaces = []
          this.reviews = []
          this.hasReviewed = false
          this.showAllReviews = false
          this.loadPlaceDetails()
          this.checkFavorite()
        }
      },
      immediate: false
    }
  },
  mounted() {
    this.loadPlaceDetails()
    this.getUserLocation()
    this.checkFavorite()
  },
  beforeUnmount() {
    this.stopPaymentStatusWatcher()
  },
  methods: {
    resetTicketModalState() {
      this.ticketError = ''
      this.ticketSuccess = ''
      this.createdTicketOrder = null
      this.paymentQrImage = ''
      this.paymentOrigin = ''
      this.ticketPaymentCompleted = false
    },
    openTicketModal() {
      if (this.isFreePlace) {
        this.$notify({ type: 'info', title: 'Địa điểm miễn phí', message: 'Địa điểm này miễn phí nên không cần đặt vé.' })
        return
      }
      if (!this.isLoggedIn) {
        this.$notify({ type: 'warning', title: 'Cần đăng nhập', message: 'Vui lòng đăng nhập để đặt vé.' })
        this.$router.push('/login')
        return
      }
      this.resetTicketModalState()
      this.ticketForm = {
        visitDate: this.minVisitDate,
        adultQuantity: 1,
        childQuantity: 0,
        note: '',
        paymentMethod: 'vnpay'
      }
      this.showTicketModal = true
    },
    closeTicketModal() {
      if (this.ticketSubmitting) return
      if (this.ticketPaymentCompleted) return
      this.stopPaymentStatusWatcher()
      this.showTicketModal = false
      this.resetTicketModalState()
    },
    async submitTicketOrder() {
      if (!this.place) return
      if (this.isFreePlace) {
        this.ticketError = 'Địa điểm miễn phí không cần đặt vé'
        return
      }
      const adult = Number.parseInt(this.ticketForm.adultQuantity, 10) || 0
      const child = Number.parseInt(this.ticketForm.childQuantity, 10) || 0
      if (adult + child <= 0) {
        this.ticketError = 'Vui lòng chọn ít nhất 1 vé'
        return
      }
      if (!this.ticketForm.visitDate || this.ticketForm.visitDate < this.minVisitDate) {
        this.ticketError = 'Vui lòng chọn ngày đi từ hôm nay trở đi'
        this.ticketForm.visitDate = this.minVisitDate
        return
      }

      this.ticketSubmitting = true
      this.ticketError = ''
      this.ticketSuccess = ''

      const res = await createTicketOrder({
        placeId: this.place._id || this.place.id,
        visitDate: this.ticketForm.visitDate,
        adultQuantity: adult,
        childQuantity: child,
        note: this.ticketForm.note,
        paymentMethod: 'vnpay'
      })

      this.ticketSubmitting = false
      if (res.success) {
        this.ticketSuccess = 'Đã gửi yêu cầu đặt vé. Bạn có thể xem trạng thái trong mục Vé của tôi.'
        this.createdTicketOrder = res.data
        const payment = this.createdTicketOrder.payment || {}
        this.$notify({
          type: 'info',
          title: 'Đã tạo đơn vé',
          message: `Đơn vé tại ${this.place.name || 'địa điểm'} đã được tạo. Vui lòng thanh toán để chờ xác nhận.`,
          persist: false
        })
        if (payment.provider === 'zalopay' || payment.provider === 'vnpay') {
          if (!payment.qrUrl && !payment.payUrl) {
            this.ticketError = `${payment.provider === 'zalopay' ? 'ZaloPay' : 'VNPAY'} chưa được cấu hình hoặc chưa tạo được QR thanh toán.`
            this.ticketSuccess = ''
            return
          }
          await this.createPaymentQr(res.data)
          this.startPaymentStatusWatcher(res.data)
          this.ticketSuccess = payment.provider === 'zalopay'
            ? 'Đã tạo đơn vé. Vui lòng quét QR ZaloPay để thanh toán.'
            : 'Đã tạo đơn vé. Vui lòng quét QR VNPAY bằng app ngân hàng để thanh toán.'
          return
        }

        await this.createPaymentQr(res.data)
        this.startPaymentStatusWatcher(res.data)
        this.ticketSuccess = 'Đã tạo đơn vé. Vui lòng quét QR và chuyển khoản đúng nội dung.'
      } else {
        this.ticketError = res.error || 'Không thể gửi yêu cầu đặt vé'
      }
    },
    async createPaymentQr(order) {
      const payment = order?.payment || {}
      if (payment.provider === 'zalopay' && payment.qrUrl) {
        if (/^(https?:|data:image\/)/i.test(payment.qrUrl)) {
          this.paymentQrImage = payment.qrUrl
        } else {
          this.paymentQrImage = await QRCode.toDataURL(payment.qrUrl, {
            width: 240,
            margin: 2,
            color: { dark: '#0f172a', light: '#ffffff' }
          })
        }
        return
      }

      if (payment.provider === 'zalopay' && payment.payUrl) {
        this.paymentQrImage = await QRCode.toDataURL(payment.payUrl, {
          width: 240,
          margin: 2,
          color: { dark: '#0f172a', light: '#ffffff' }
        })
        return
      }

      if (payment.provider === 'vnpay' && payment.payUrl) {
        this.paymentQrImage = await QRCode.toDataURL(payment.payUrl, {
          width: 240,
          margin: 2,
          color: { dark: '#0f172a', light: '#ffffff' }
        })
        return
      }

      if (payment.qrUrl) {
        this.paymentQrImage = payment.qrUrl
        return
      }

      const transferContent = payment.transferContent || payment.orderRef || order?.code || order?._id || ''
      if (!transferContent) {
        this.paymentQrImage = ''
        return
      }

      this.paymentQrImage = await QRCode.toDataURL(transferContent, {
        width: 240,
        margin: 2,
        color: { dark: '#0f172a', light: '#ffffff' }
      })
    },
    startPaymentStatusWatcher(order) {
      this.stopPaymentStatusWatcher()
      if (!order?._id) return

      this.paymentStatusTimer = window.setInterval(async () => {
        const res = await getTicketPaymentStatus(order._id)
        if (!res.success || !res.data) return

        const isPaid = res.data.paymentStatus === 'paid' || res.data.status === 'paid' || res.data.status === 'used'
        if (!isPaid) return

        this.stopPaymentStatusWatcher()
        this.createdTicketOrder = res.data
        this.ticketError = ''
        this.ticketPaymentCompleted = true
        this.$notify({
          type: 'success',
          title: 'Thanh toán thành công',
          message: 'Đặt vé thành công. Vé điện tử đã sẵn sàng trong mục Vé của tôi.',
          persist: false
        })
        this.ticketSuccess = 'Thanh toán thành công. Vé điện tử đã sẵn sàng trong mục Vé của tôi.'
      }, 2000)
    },
    async checkCurrentTicketPayment({ silentPending = false } = {}) {
      const orderId = this.createdTicketOrder?._id
      if (!orderId) return false

      const res = await getTicketPaymentStatus(orderId)
      if (!res.success || !res.data) {
        if (!silentPending) {
          this.ticketError = res.error || 'Chưa kiểm tra được trạng thái thanh toán'
        }
        return false
      }

      const isPaid = res.data.paymentStatus === 'paid' || res.data.status === 'paid' || res.data.status === 'used'
      if (!isPaid) {
        if (!silentPending) {
          this.ticketError = ''
          this.ticketSuccess = this.createdTicketOrder?.payment?.provider === 'vietqr'
            ? 'Hệ thống chưa nhận được webhook ngân hàng hoặc xác nhận từ admin. Vui lòng chờ đối soát giao dịch.'
            : 'Thanh toán chưa được backend xác minh. Vui lòng kiểm tra lại sau.'
        }
        return false
      }

      this.stopPaymentStatusWatcher()
      this.createdTicketOrder = res.data
      this.ticketError = ''
      this.ticketPaymentCompleted = true
      this.$notify({
        type: 'success',
        title: 'Thanh toán thành công',
        message: 'Đặt vé thành công. Vé điện tử đã sẵn sàng trong mục Vé của tôi.',
        persist: false
      })
      this.ticketSuccess = 'Thanh toán thành công. Vé điện tử đã sẵn sàng trong mục Vé của tôi.'
      return true
    },
    stopPaymentStatusWatcher() {
      if (!this.paymentStatusTimer) return
      window.clearInterval(this.paymentStatusTimer)
      this.paymentStatusTimer = null
    },
    goHomeAfterPayment() {
      this.stopPaymentStatusWatcher()
      this.showTicketModal = false
      this.resetTicketModalState()
      this.$router.push('/')
    },
    openReviewImagePicker() {
      const total = (this.editingReviewId ? (this.existingReviewImages || []).length : 0) + (this.reviewImageFiles || []).length
      if (total >= 3) return
      if (this.$refs.reviewImageInput) {
        this.$refs.reviewImageInput.click()
      }
    },
    rebuildReviewImagePreviews() {
      this.reviewImagePreviews.forEach(u => {
        try { URL.revokeObjectURL(u) } catch { /* ignore */ }
      })
      this.reviewImagePreviews = (this.reviewImageFiles || []).map(f => URL.createObjectURL(f))
    },
    onSelectReviewImages(e) {
      const picked = Array.from(e.target.files || [])
      const current = Array.isArray(this.reviewImageFiles) ? this.reviewImageFiles : []

      const existingCount = this.editingReviewId ? (Array.isArray(this.existingReviewImages) ? this.existingReviewImages.length : 0) : 0
      const remainingSlots = Math.max(0, 3 - existingCount - current.length)

      // allow picking multiple times, cap at 3
      this.reviewImageFiles = current.concat(picked.slice(0, remainingSlots)).slice(0, 3)
      this.rebuildReviewImagePreviews()

      // reset input so user can pick same file again if needed
      if (e && e.target) e.target.value = ''
    },
    removeReviewImage(idx) {
      if (!Array.isArray(this.reviewImageFiles)) return
      this.reviewImageFiles.splice(idx, 1)
      this.rebuildReviewImagePreviews()
    },
    removeExistingReviewImage(idx) {
      if (!Array.isArray(this.existingReviewImages)) return
      this.existingReviewImages.splice(idx, 1)
    },
    submissionStatusLabel(status) {
      if (status === 'approved') return 'Đã duyệt'
      if (status === 'rejected') return 'Từ chối'
      return 'Chờ duyệt'
    },
    async loadMyReviewImageSubmissions(reviewId) {
      if (!reviewId || !this.isLoggedIn) {
        this.myReviewImageSubmissions = []
        return
      }
      const res = await getMyReviewImageSubmissions(reviewId)
      if (res && res.success) {
        this.myReviewImageSubmissions = res.data || []
      } else {
        this.myReviewImageSubmissions = []
      }
    },
    checkFavorite() {
      try {
        const raw = getAuthUserRaw()
        const user = raw ? JSON.parse(raw) : null
        const favorites = user && Array.isArray(user.favorites)
          ? user.favorites
          : []
        const placeId = this.$route.params.id
        this.isFavorited = favorites.includes(placeId)
      } catch (e) {
        this.isFavorited = false
      }
    },
    async toggleFavorite() {
      try {
        if (!getAuthToken()) {
          this.$router.push('/login')
          return
        }

        const raw = getAuthUserRaw()
        const user = raw ? JSON.parse(raw) : null
        let favorites = user && Array.isArray(user.favorites)
          ? [...user.favorites]
          : []
        const placeId = this.$route.params.id
        const nextFavorited = !this.isFavorited

        if (!nextFavorited) {
          const ok = await requestConfirmation({
            title: 'Bỏ yêu thích',
            message: `Bạn có chắc muốn bỏ ${this.place?.name || 'địa điểm này'} khỏi danh sách yêu thích không?`,
            confirmText: 'Bỏ yêu thích',
            cancelText: 'Giữ lại',
            tone: 'danger'
          })
          if (!ok) return
        }
        
        if (!nextFavorited) {
          favorites = favorites.filter(id => id !== placeId)
        } else {
          if (!favorites.includes(placeId)) favorites.push(placeId)
        }
        
        this.isFavorited = nextFavorited
        if (user) {
          const nextUser = { ...user, favorites }
          if (sessionStorage.getItem('user')) sessionStorage.setItem('user', JSON.stringify(nextUser))
        }

        if (getAuthToken()) {
          const res = await updateFavorite(placeId, nextFavorited)
          if (!res.success) throw new Error(res.error || 'Update favorite failed')
          this.$notify({
            type: nextFavorited ? 'success' : 'info',
            title: nextFavorited ? 'Đã thêm yêu thích' : 'Đã bỏ yêu thích',
            message: nextFavorited
              ? `${this.place.name || 'Địa điểm'} đã được thêm vào danh sách yêu thích.`
              : `${this.place.name || 'Địa điểm'} đã được bỏ khỏi danh sách yêu thích.`,
            persist: false
          })
          const serverFavorites = Array.isArray(res.favorites) ? res.favorites : favorites
          if (user) {
            const nextUser = { ...user, favorites: serverFavorites }
            if (sessionStorage.getItem('user')) sessionStorage.setItem('user', JSON.stringify(nextUser))
          }
          await loadNotifications()
        }
      } catch (e) {
        console.error('Error toggling favorite:', e)
        this.checkFavorite()
        this.$notify({
          type: 'error',
          title: 'Không thể cập nhật yêu thích',
          message: 'Vui lòng thử lại sau.',
          persist: false
        })
      }
    },
    coerceNumber(value) {
      if (value === null || value === undefined || value === '') return null
      const n = typeof value === 'number' ? value : parseFloat(value)
      return Number.isFinite(n) ? n : null
    },
    setUserLocation(lat, lng) {
      const latNum = this.coerceNumber(lat)
      const lngNum = this.coerceNumber(lng)
      if (latNum === null || lngNum === null) return false
      this.userLocation = { lat: latNum, lng: lngNum }
      this.calculateUserDistance()
      if (this.place) this.loadNearbyPlaces()
      return true
    },
    loadUserLocationFromStorage() {
      try {
        const userData = getAuthUserRaw()
        if (userData) {
          const parsed = JSON.parse(userData)
          this.setUserLocation(parsed?.lat, parsed?.lng, { persist: false })
        }
      } catch (e) {
        console.warn('Failed to get user location from storage', e)
      }
    },
    async loadUserLocationFromProfile() {
      const token = getAuthToken()
      if (!token) return
      try {
        const res = await getProfile()
        if (res?.success && res.user) {
          this.setUserLocation(res.user.lat, res.user.lng)
        }
      } catch (e) {
        console.warn('Failed to get user location from profile', e)
      }
    },
    async getUserLocation() {
      this.loadUserLocationFromStorage()
      await this.loadUserLocationFromProfile()

      const location = await getBrowserLocationCached({ timeout: 5000 })
      if (!location) return

      this.setUserLocation(location.lat, location.lng)
      try {
        const token = getAuthToken()
        if (token) {
          await updateLocation({
            lat: this.userLocation.lat,
            lng: this.userLocation.lng
          })
        }
      } catch (e) {
        console.warn('Failed to persist user location', e)
      }
    },
    calculateUserDistance() {
      const placeLat = this.coerceNumber(this.place?.lat)
      const placeLng = this.coerceNumber(this.place?.lng)
      if (this.userLocation && placeLat !== null && placeLng !== null) {
        this.userDistance = this.calculateDistance(
          this.userLocation.lat,
          this.userLocation.lng,
          placeLat,
          placeLng
        )
      } else {
        this.userDistance = null
      }
    },
    calculateDistance(lat1, lng1, lat2, lng2) {
      const aLat = this.coerceNumber(lat1)
      const aLng = this.coerceNumber(lng1)
      const bLat = this.coerceNumber(lat2)
      const bLng = this.coerceNumber(lng2)
      if (aLat === null || aLng === null || bLat === null || bLng === null) return null
      const toRad = (v) => (v * Math.PI) / 180
      const R = 6371000 // Earth radius in meters
      const dLat = toRad(bLat - aLat)
      const dLng = toRad(bLng - aLng)
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2)
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      return R * c // distance in meters
    },
    formatDistance(meters) {
      if (meters === null || meters === undefined) return ''
      if (meters < 1000) {
        return `Cách bạn khoảng ${Math.round(meters)} m`
      }
      return `Cách bạn khoảng ${(meters / 1000).toFixed(1)} km`
    },
    formatPrice,
    async loadPlaceDetails() {
      this.isLoading = true
      this.errorMessage = ''

      this.showAllReviews = false

      const placeId = this.$route.params.id
      if (!placeId) {
        this.errorMessage = 'Không tìm thấy ID địa điểm'
        this.isLoading = false
        return
      }

      const res = await getPlaceById(placeId)
      if (res.success && res.data) {
        this.place = res.data
        // Calculate distance
        this.calculateUserDistance()
        // Load reviews after place loaded
        this.loadReviews(1)
        // Load nearby places
        this.loadNearbyPlaces()
      } else {
        this.errorMessage = res.error || 'Không thể tải chi tiết địa điểm'
      }

      this.isLoading = false
    },
    async loadNearbyPlaces() {
      if (!this.place) return
      
      try {
        const res = await getAllPlaces()
        if (res.success && res.data) {
          const currentId = this.place._id || this.$route.params.id
          const normalizeTag = (tag) => String(tag || '').trim().toLowerCase()
          const currentTagSet = new Set((this.place.tags || []).map(normalizeTag).filter(Boolean))
          
          // Pick the three places with the most matching tags. Distance is only a tie-breaker.
          let places = res.data
            .map(p => {
              const pTags = new Set((p.tags || []).map(normalizeTag).filter(Boolean))
              const matchingTagCount = [...pTags].filter(tag => currentTagSet.has(tag)).length
              
              let distance = null
              const pLat = this.coerceNumber(p.lat)
              const pLng = this.coerceNumber(p.lng)
              if (this.userLocation && pLat !== null && pLng !== null) {
                distance = this.calculateDistance(
                  this.userLocation.lat,
                  this.userLocation.lng,
                  pLat,
                  pLng
                )
              }
              return { ...p, distance, matchingTagCount }
            })
            .filter(p => {
              const pId = p._id || p.id
              return pId !== currentId && p.matchingTagCount > 0
            })
            // Sort by matching tags first. Keep the current distance logic as tie-breaker.
            .sort((a, b) => {
              if (b.matchingTagCount !== a.matchingTagCount) {
                return b.matchingTagCount - a.matchingTagCount
              }
              if (a.distance === null) return 1
              if (b.distance === null) return -1
              return a.distance - b.distance
            })
            .slice(0, 3) // Take top 3

          this.nearbyPlaces = places
        }
      } catch (err) {
        console.error('Failed to load nearby places:', err)
      }
    },
    goToPlace(placeId) {
      // Scroll to top and navigate
      window.scrollTo(0, 0)
      this.$router.push({ path: `/place/${placeId}` })
    },
    // Lightbox methods
    openLightbox(index) {
      this.lightboxIndex = index
      this.showLightbox = true
      document.body.style.overflow = 'hidden'
    },
    closeLightbox() {
      this.showLightbox = false
      document.body.style.overflow = ''
    },
    prevLightboxImage() {
      this.lightboxIndex = (this.lightboxIndex - 1 + this.allImages.length) % this.allImages.length
    },
    nextLightboxImage() {
      this.lightboxIndex = (this.lightboxIndex + 1) % this.allImages.length
    },
    async loadReviews(page = 1) {
      if (!this.place?._id) return
      
      this.reviewsLoading = true
      const limit = this.showAllReviews ? 1000 : 3
      const res = await getReviews(this.place._id, page, limit)
      
      if (res.success && res.data) {
        this.reviews = (res.data.reviews || []).map(r => ({
          ...r,
          likeCount: Number(r.likeCount || 0),
          dislikeCount: Number(r.dislikeCount || 0),
          myReaction: r.myReaction || null
        }))
        this.reviewsPagination = res.data.pagination
        this.reviewStats = res.data.stats
        
        // Check if current user has reviewed
        if (this.currentUserId) {
          this.hasReviewed = this.reviews.some(r => 
            r.user?._id === this.currentUserId || r.user?.id === this.currentUserId
          )
        }
      }
      this.reviewsLoading = false
    },
    showAllReviewsList() {
      this.showAllReviews = true
      this.loadReviews(1)
    },
    isOwnReview(review) {
      if (!this.currentUserId) return false
      const reviewUserId = review.user?._id || review.user?.id
      return !!reviewUserId && reviewUserId === this.currentUserId
    },
    canReactToReview(review) {
      return this.isLoggedIn && !this.isOwnReview(review)
    },
    async toggleReviewReaction(review, action) {
      if (!review?._id) return
      if (!this.canReactToReview(review)) return

      const nextAction = review.myReaction === action ? 'clear' : action
      this.reactingReviewId = review._id
      const res = await reactToReview(review._id, nextAction)
      this.reactingReviewId = null

      if (res.success && res.data) {
        review.likeCount = Number(res.data.likeCount || 0)
        review.dislikeCount = Number(res.data.dislikeCount || 0)
        review.myReaction = res.data.myReaction || null
      } else {
        this.$notify({ type: 'error', title: 'Không thể cập nhật', message: res.error || 'Không thể cập nhật cảm xúc.' })
      }
    },
    getRatingLabel(rating) {
      const labels = {
        1: 'Rất tệ',
        2: 'Tệ',
        3: 'Bình thường',
        4: 'Tốt',
        5: 'Tuyệt vời'
      }
      return labels[rating] || ''
    },
    closeReviewModal() {
      this.showReviewModal = false
      this.editingReviewId = null
      this.newReview = { rating: 5, comment: '' }
      this.reviewError = ''

      this.reviewImageFiles = []
      this.rebuildReviewImagePreviews()

      this.existingReviewImages = []
      this.myReviewImageSubmissions = []
    },
    async submitReview() {
      if (!this.newReview.comment.trim()) {
        this.reviewError = 'Vui lòng nhập nhận xét'
        return
      }
      if (this.newReview.rating < 1 || this.newReview.rating > 5) {
        this.reviewError = 'Vui lòng chọn đánh giá từ 1-5 sao'
        return
      }

      this.submittingReview = true
      this.reviewError = ''

      const wasEditingReview = !!this.editingReviewId
      let res
      if (this.editingReviewId) {
        // Update existing review
        res = await updateReview(
          this.editingReviewId,
          this.newReview.rating,
          this.newReview.comment,
          this.reviewImageFiles,
          this.existingReviewImages
        )
      } else {
        // Create new review
        res = await createReview(
          this.place._id,
          this.newReview.rating,
          this.newReview.comment,
          this.reviewImageFiles
        )
      }

      if (res.success) {
        this.$notify({
          type: 'success',
          title: wasEditingReview ? 'Đã cập nhật đánh giá' : 'Đã gửi đánh giá',
          message: wasEditingReview
            ? `Đánh giá của bạn về ${this.place.name || 'địa điểm'} đã được cập nhật.`
            : `Đánh giá của bạn về ${this.place.name || 'địa điểm'} đã được gửi thành công.`,
          persist: false
        })
        // Reset form and close modal
        this.closeReviewModal()
        // Reload reviews
        await this.loadReviews(1)
        // Update place rating
        if (this.place) {
          this.place.rating = this.reviewStats.avgRating
        }
      } else {
        this.reviewError = res.error || 'Không thể gửi đánh giá'
      }

      this.submittingReview = false
    },
    canDeleteReview(review) {
      if (!this.currentUserId) return false
      return review.user?._id === this.currentUserId || 
             review.user?.id === this.currentUserId || 
             this.currentUserRole === 'admin'
    },
    editReviewItem(review) {
      this.editingReviewId = review._id
      this.newReview.rating = review.rating
      this.newReview.comment = review.comment

      this.existingReviewImages = Array.isArray(review.images) ? [...review.images] : []

      this.reviewImageFiles = []
      this.rebuildReviewImagePreviews()

      this.loadMyReviewImageSubmissions(review._id)

      this.showReviewModal = true
    },
    async deleteReviewItem(reviewId) {
      const confirmed = await this.$confirm({
        title: 'Xóa đánh giá',
        message: 'Bạn có chắc muốn xóa đánh giá này?',
        confirmText: 'Xóa',
        tone: 'danger'
      })
      if (!confirmed) return

      const res = await deleteReview(reviewId)
      if (res.success) {
        this.$notify({
          type: 'info',
          title: 'Đã xóa đánh giá',
          message: `Đánh giá của bạn về ${this.place.name || 'địa điểm'} đã được xóa.`,
          persist: false
        })
        await this.loadReviews(this.reviewsPagination.page)
        this.hasReviewed = false
        // Update place rating
        if (this.place) {
          this.place.rating = this.reviewStats.avgRating
        }
      } else {
        this.$notify({ type: 'error', title: 'Không thể xóa đánh giá', message: res.error || 'Không thể xóa đánh giá.' })
      }
    },
    formatDate(dateStr) {
      if (!dateStr) return ''
      const date = new Date(dateStr)
      return date.toLocaleDateString('vi-VN', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    },
    getAvatarUrl(avatar) {
      if (!avatar) return 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="%23e5e7eb"/><circle cx="50" cy="40" r="18" fill="%239ca3af"/><ellipse cx="50" cy="85" rx="30" ry="25" fill="%239ca3af"/></svg>'
      return assetUrl(avatar)
    },
    handleAvatarError(e) {
      e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="%23e5e7eb"/><circle cx="50" cy="40" r="18" fill="%239ca3af"/><ellipse cx="50" cy="85" rx="30" ry="25" fill="%239ca3af"/></svg>'
    },
    openImageModal(img) {
      // Simple: open in new tab
      window.open(this.getImageUrl(img), '_blank')
    },
    renderStars(rating) {
      const r = Math.round(Number(rating) || 0)
      return '★'.repeat(r) + '☆'.repeat(Math.max(0, 5 - r))
    },
    formatOpeningHours(hours) {
      if (!hours || hours.length === 0) return 'Chưa cập nhật'
      return hours[0] || 'Chưa cập nhật'
    },
    cleanAddress,
    getImageUrl(imagePath) {
      if (!imagePath) return '/Playground.jpg'
      return assetUrl(imagePath)
    },
    nextImage() {
      if (this.place.images && this.place.images.length > 0) {
        this.currentImageIndex = (this.currentImageIndex + 1) % this.place.images.length
      }
    },
    previousImage() {
      if (this.place.images && this.place.images.length > 0) {
        this.currentImageIndex = (this.currentImageIndex - 1 + this.place.images.length) % this.place.images.length
      }
    }
  }
}
</script>

<style scoped>
.place-details-page {
  background: var(--tw-bg);
  min-height: 100%;
}

.site-header {
  position: relative;
  z-index: 10;
}

.site-main {
  padding: 28px 16px 46px 16px;
}

.place-container {
  max-width: 1100px;
  margin: 0 auto;
}

/* Main place layout */
.place-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 18px;
  align-items: start;
  margin-bottom: 32px;
}

/* Gallery Section */
.gallery-section {
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  align-self: start;
}

.main-image-wrapper {
  position: relative;
  aspect-ratio: 16/9;
  max-height: 640px;
  background: #f1f5f9;
}

.main-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-nav .nav-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 44px;
  height: 44px;
  background: rgba(255,255,255,0.95);
  border: none;
  border-radius: 50%;
  font-size: 24px;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  transition: all 0.2s;
  color: #374151;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  line-height: 1;
}

.image-nav .nav-btn:hover {
  background: #fff;
  transform: translateY(-50%) scale(1.1);
}

.image-nav .nav-btn svg {
  width: 24px;
  height: 24px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.image-nav .prev { left: 12px; }
.image-nav .next { right: 12px; }

.thumbnails {
  display: flex;
  gap: 8px;
  padding: 10px 12px 12px;
  background: #fff;
  overflow-x: auto;
}

.thumb {
  width: 72px;
  height: 54px;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  opacity: 0.6;
  transition: all 0.2s;
  flex-shrink: 0;
  border: 2px solid transparent;
}

.thumb.active {
  opacity: 1;
  border-color: #6366f1;
}

.thumb:hover { opacity: 1; }

.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Info Section */
.info-section {
  background: #fff;
  border-radius: 16px;
  padding: 28px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  height: fit-content;
}

.place-name {
  font-size: 1.6rem;
  font-weight: 700;
  color: #111827;
  margin: 0 0 16px 0;
  line-height: 1.3;
}

.rating-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.rating-row .stars {
  color: #f59e0b;
  font-size: 1.1rem;
  letter-spacing: 2px;
}

.rating-value {
  font-weight: 600;
  color: #374151;
}

.rating-row .review-count {
  color: #6b7280;
  font-size: 0.9rem;
}

.quick-info {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.info-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  background: #f1f5f9;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 500;
  color: #475569;
}

.badge-icon {
  font-size: 1.1rem;
}

/* Tags */
.tags-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.tag {
  display: inline-block;
  padding: 6px 12px;
  background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%);
  color: #4338ca;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 500;
}

/* Facilities Grid */
.facilities-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
  padding: 16px;
  background: #fafafa;
  border-radius: 12px;
}

.facility-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.facility-icon {
  font-size: 1.4rem;
  flex-shrink: 0;
}

.facility-info {
  display: flex;
  flex-direction: column;
}

.facility-label {
  font-size: 0.75rem;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.facility-value {
  font-size: 0.85rem;
  color: #374151;
  font-weight: 500;
}

/* No rating style */
.rating-value.no-rating {
  color: #9ca3af;
  font-style: italic;
  font-weight: 400;
}

.main-image-wrapper {
  cursor: pointer;
}

.details-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 20px 0;
  margin-bottom: 20px;
}

.detail-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  font-size: 0.95rem;
  color: #4b5563;
}

.detail-icon {
  font-size: 1.2rem;
  flex-shrink: 0;
  width: 24px;
  text-align: center;
}

.detail-text {
  line-height: 1.5;
}

.detail-link {
  color: #6366f1;
  text-decoration: none;
  word-break: break-all;
}

.detail-link:hover {
  text-decoration: underline;
}

.action-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.btn-favorite {
  grid-column: 1 / -1;
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #e5e7eb;
  min-height: 50px;
  padding: 12px 14px;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  font-size: 0.95rem;
}

.btn-favorite .favorite-icon {
  width: 18px;
  height: 18px;
  flex: 0 0 18px;
  display: block;
}

.btn-favorite.active .favorite-icon path {
  fill: currentColor;
}

.btn-favorite:hover {
  background: #fee2e2;
  border-color: #fca5a5;
}

.btn-favorite.active {
  background: #fee2e2;
  color: #dc2626;
  border-color: #fca5a5;
}

.btn-ticket-action,
.btn-map-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: #6366f1;
  color: #ffffff;
  border: 1px solid #6366f1;
  min-height: 50px;
  padding: 12px 14px;
  border-radius: 10px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.2s;
  width: 100%;
  box-sizing: border-box;
  font-size: 0.95rem;
  white-space: nowrap;
}

.btn-ticket-action {
  cursor: pointer;
}

.free-entry-note {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 50px;
  padding: 12px 14px;
  border-radius: 10px;
  width: 100%;
  box-sizing: border-box;
  background: #dcfce7;
  border: 1px solid #86efac;
  color: #166534;
  font-weight: 700;
  font-size: 0.95rem;
  text-align: center;
}

.btn-ticket-action:hover,
.btn-map-action:hover {
  background: #4f46e5;
  border-color: #4f46e5;
  transform: translateY(-1px);
}

.btn-primary {
  background: #6366f1;
  color: white;
  border: none;
  padding: 14px 24px;
  border-radius: 10px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary:hover {
  background: #4f46e5;
  transform: translateY(-1px);
}

.reviewed-tag {
  display: inline-flex;
  align-items: center;
  padding: 12px 20px;
  background: #dcfce7;
  color: #166534;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.9rem;
}

.login-hint {
  color: #6b7280;
  font-size: 0.9rem;
}

.login-hint a {
  color: #6366f1;
  font-weight: 600;
}

.map-section {
  background: #ffffff;
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 32px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}

.map-frame {
  width: 100%;
  height: 360px;
  border: 0;
  border-radius: 12px;
  background: #f1f5f9;
  display: block;
}

.ticket-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.58);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
}

.ticket-modal {
  width: min(520px, 100%);
  max-height: 92vh;
  overflow-y: auto;
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.25);
}

.ticket-form,
.ticket-payment {
  padding: 24px;
}

.ticket-place {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px;
  margin-bottom: 18px;
  background: #f8fafc;
  border: 1px solid var(--tw-border);
  border-radius: 12px;
}

.ticket-place strong {
  color: var(--tw-text);
}

.ticket-place span {
  color: var(--tw-muted);
  line-height: 1.5;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: var(--tw-text);
  font-weight: 700;
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  border: 1px solid var(--tw-border);
  border-radius: 10px;
  padding: 11px 12px;
  font: inherit;
  box-sizing: border-box;
}

.form-group textarea {
  resize: none;
}

.payment-method-fixed small {
  display: block;
  margin-top: 8px;
  color: var(--tw-muted);
  line-height: 1.4;
}

.fixed-payment-badge {
  width: 100%;
  border: 1px solid #bfdbfe;
  border-radius: 10px;
  padding: 11px 12px;
  background: #eff6ff;
  color: #1d4ed8;
  box-sizing: border-box;
  font-weight: 800;
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.14);
}

.ticket-quantity-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.ticket-summary {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin: 18px 0;
}

.ticket-summary div {
  padding: 14px;
  background: #f8fafc;
  border: 1px solid var(--tw-border);
  border-radius: 12px;
}

.ticket-summary span {
  display: block;
  color: var(--tw-muted);
  font-size: 0.86rem;
  margin-bottom: 6px;
}

.ticket-summary strong {
  color: var(--tw-text);
  font-size: 1.05rem;
}

.payment-summary {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 12px;
  margin-bottom: 18px;
}

.payment-summary div {
  min-width: 0;
  padding: 14px;
  background: #f8fafc;
  border: 1px solid var(--tw-border);
  border-radius: 12px;
}

.payment-summary span {
  display: block;
  color: var(--tw-muted);
  font-size: 0.86rem;
  margin-bottom: 6px;
}

.payment-summary strong {
  display: block;
  color: var(--tw-text);
  overflow-wrap: anywhere;
}

.payment-qr-wrap {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  gap: 12px;
  margin: 16px 0;
}

.btn-check-payment {
  border: 1px solid var(--tw-border);
  border-radius: 10px;
  padding: 10px 14px;
  background: #ffffff;
  color: var(--tw-text);
  font-weight: 800;
  cursor: pointer;
}

.btn-check-payment:hover {
  background: #f8fafc;
}

.transfer-content {
  color: var(--tw-muted);
  font-size: 0.9rem;
  text-align: center;
}

.transfer-hint {
  max-width: 360px;
  color: #92400e;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 0.86rem;
  line-height: 1.45;
  text-align: center;
}

.payment-qr-image {
  width: 240px;
  height: 240px;
  background: #ffffff;
  border: 1px solid var(--tw-border);
  border-radius: 12px;
  padding: 10px;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
}

.payment-qr-empty {
  width: 240px;
  min-height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 16px;
  color: #92400e;
  background: #fffbeb;
  border: 1px dashed #f59e0b;
  border-radius: 12px;
  font-weight: 700;
}

.ticket-error,
.ticket-success {
  padding: 11px 12px;
  border-radius: 10px;
  margin-bottom: 14px;
  font-weight: 700;
}

.ticket-error {
  background: #fef2f2;
  color: #b91c1c;
  border: 1px solid #fecaca;
}

.ticket-success {
  background: #ecfdf5;
  color: #047857;
  border: 1px solid #bbf7d0;
}

/* Description Section */
.description-section {
  background: #fff;
  border-radius: 16px;
  padding: 28px;
  margin-bottom: 32px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}

.description-section h2 {
  font-size: 1.25rem;
  font-weight: 700;
  color: #111827;
  margin: 0 0 16px 0;
}

.description-section p {
  color: #4b5563;
  line-height: 1.7;
  margin: 0;
}

/* Reviews Section */
.reviews-section {
  background: #fff;
  border-radius: 16px;
  padding: 28px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}

.reviews-header h2 {
  font-size: 1.25rem;
  font-weight: 700;
  color: #111827;
  margin: 0 0 20px 0;
}

.reviews-list {
  margin-top: 0;
}

.loading-reviews {
  text-align: center;
  padding: 40px;
  color: #6b7280;
}

.no-reviews {
  text-align: center;
  padding: 60px 20px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 16px;
  border: 2px dashed #e2e8f0;
}

.no-reviews-icon {
  font-size: 3rem;
  margin-bottom: 16px;
}

.no-reviews h3 {
  color: #374151;
  font-size: 1.2rem;
  margin: 0 0 8px 0;
}

.no-reviews p {
  color: #9ca3af;
  margin: 0;
}

.no-reviews a {
  color: #6366f1;
  font-weight: 600;
}

/* Reviews Header */
.reviews-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.reviews-title-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.reviews-title-section h2 {
  margin: 0;
  font-size: 1.4rem;
  color: #111827;
}

.reviews-count {
  background: #6366f1;
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 500;
}

.reviews-summary {
  display: flex;
  align-items: center;
}

.avg-rating-display {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fef3c7;
  padding: 8px 16px;
  border-radius: 12px;
}

.avg-number {
  font-size: 1.5rem;
  font-weight: 700;
  color: #d97706;
}

.avg-stars {
  color: #f59e0b;
  font-size: 1rem;
}

/* Write Review Box */
.write-review-box {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  padding: 20px 24px;
  border-radius: 16px;
  margin-bottom: 24px;
  border: 1px solid #bae6fd;
}

.write-review-header {
  display: flex;
  align-items: center;
  gap: 14px;
}

.write-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid white;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.write-prompt {
  display: flex;
  flex-direction: column;
}

.write-name {
  font-weight: 600;
  color: #0369a1;
  font-size: 0.95rem;
}

.write-hint {
  color: #64748b;
  font-size: 0.85rem;
}

.write-review-btn {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 12px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}

.write-review-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(99, 102, 241, 0.4);
}

.login-to-review {
  background: #fef3c7;
  padding: 16px 24px;
  border-radius: 12px;
  margin-bottom: 24px;
  text-align: center;
}

.login-to-review p {
  margin: 0;
  color: #92400e;
}

.login-to-review a {
  color: #6366f1;
  font-weight: 600;
  text-decoration: none;
}

.login-to-review a:hover {
  text-decoration: underline;
}

/* Loading Reviews */
.loading-reviews {
  text-align: center;
  padding: 40px;
}

.loading-spinner-reviews {
  width: 40px;
  height: 40px;
  border: 3px solid #f1f5f9;
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Review Card */
.reviews-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.review-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 20px;
  transition: all 0.2s;
}

.review-card:hover {
  box-shadow: 0 4px 16px rgba(0,0,0,0.08);
  border-color: #d1d5db;
}

.review-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.reviewer-info {
  display: flex;
  align-items: center;
  gap: 14px;
}

.reviewer-avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  object-fit: cover;
  background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%);
  border: 2px solid #e5e7eb;
}

.reviewer-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.reviewer-name {
  font-weight: 600;
  color: #111827;
  font-size: 1rem;
}

.review-rating-inline {
  display: flex;
  align-items: center;
}

.review-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.review-date {
  font-size: 0.85rem;
  color: #9ca3af;
}

.stars-display {
  color: #f59e0b;
  font-size: 1rem;
  letter-spacing: 2px;
}

/* Review Body */
.review-body {
  padding-left: 64px;
}

.review-text {
  color: #374151;
  line-height: 1.7;
  margin: 0 0 16px 0;
  font-size: 0.95rem;
}

.review-gallery {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.review-image-wrapper {
  position: relative;
  width: 100px;
  height: 100px;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
}

.review-image-wrapper img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s;
}

.review-image-wrapper:hover img {
  transform: scale(1.1);
}

.image-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
}

.review-image-wrapper:hover .image-overlay {
  opacity: 1;
}

.image-overlay span {
  font-size: 1.5rem;
}

/* Review Footer */
.review-footer {
  display: flex;
  gap: 12px;
  padding-left: 64px;
  margin-top: 16px;
  padding-top: 16px;
}

.review-action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: 1px solid #e5e7eb;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}

.review-like-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid #e5e7eb;
  background: #ffffff;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
  line-height: 1;
}

.review-like-btn:hover:not(:disabled) {
  background: #f8fafc;
  border-color: #cbd5e1;
}

.review-like-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.review-like-btn.active {
  color: #0369a1;
  border-color: #0369a1;
  background: #e0f2fe;
}

.reaction-icon {
  width: 18px;
  height: 18px;
  flex: 0 0 18px;
  display: block;
}

.reaction-count {
  font-weight: 600;
  line-height: 1;
  display: block;
}

.review-action-btn.edit {
  color: #6366f1;
}

.review-action-btn.edit:hover {
  background: #eef2ff;
  border-color: #6366f1;
}

.review-action-btn.delete {
  color: #ef4444;
}

.review-action-btn.delete:hover {
  background: #fef2f2;
  border-color: #ef4444;
}

/* Pagination */
.reviews-pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  margin-top: 32px;
  padding-top: 24px;
}

.pagination-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: white;
  border: 1px solid #e5e7eb;
  padding: 10px 20px;
  border-radius: 10px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.pagination-btn:hover:not(:disabled) {
  background: #6366f1;
  color: white;
  border-color: #6366f1;
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-info {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.95rem;
}

.current-page {
  background: #6366f1;
  color: white;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}

.page-separator {
  color: #9ca3af;
}

.total-pages {
  color: #6b7280;
}

.review-item {
  padding: 20px 0;
}

.review-item:last-child {
  border-bottom: none;
}

.review-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.reviewer-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.reviewer-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  object-fit: cover;
  background: #f1f5f9;
}

.reviewer-details {
  display: flex;
  flex-direction: column;
}

.reviewer-name {
  font-weight: 600;
  color: #111827;
  font-size: 0.95rem;
}

.review-date {
  font-size: 0.85rem;
  color: #9ca3af;
}

.review-rating .stars {
  color: #f59e0b;
  font-size: 0.95rem;
}

.review-content p {
  color: #4b5563;
  line-height: 1.6;
  margin: 0;
}

.review-images {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  flex-wrap: wrap;
}

.review-images img {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 8px;
  cursor: pointer;
}

.review-actions {
  margin-top: 8px;
  display: flex;
  gap: 12px;
}

.edit-review-btn {
  background: none;
  border: none;
  color: #6366f1;
  font-size: 0.85rem;
  cursor: pointer;
  padding: 4px 0;
}

.edit-review-btn:hover {
  text-decoration: underline;
}

.delete-review-btn {
  background: none;
  border: none;
  color: #ef4444;
  font-size: 0.85rem;
  cursor: pointer;
  padding: 4px 0;
}

.delete-review-btn:hover {
  text-decoration: underline;
}

.reviews-pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-top: 24px;
  padding-top: 20px;
}

.reviews-pagination button {
  background: #f1f5f9;
  border: none;
  padding: 10px 18px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  color: #374151;
  transition: background 0.2s;
}

.reviews-pagination button:hover:not(:disabled) {
  background: #e2e8f0;
}

.reviews-pagination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Footer */
.site-footer {
  position: relative;
  text-align: center;
  font-size: 13px;
  color: #6b7280;
  background: #fff;
  padding: 14px 16px;
}

/* Loading & Error */
.loading-spinner {
  text-align: center;
  padding: 60px 20px;
  color: #6366f1;
}

.error-message {
  background: #fef2f2;
  color: #dc2626;
  padding: 20px;
  border-radius: 12px;
  text-align: center;
}

.back-link {
  display: inline-block;
  margin-top: 12px;
  color: #6366f1;
  text-decoration: none;
  font-weight: 600;
}

.no-place {
  text-align: center;
  padding: 60px 20px;
  color: #9ca3af;
}

/* Responsive */
@media (max-width: 900px) {
  .place-layout {
    grid-template-columns: 1fr;
    gap: 18px;
  }
  
  .main-image-wrapper {
    aspect-ratio: 16/9;
  }
}

@media (max-width: 600px) {
  .place-name {
    font-size: 1.3rem;
  }
  
  .quick-info {
    flex-direction: column;
    gap: 8px;
  }
  
  .info-badge {
    width: 100%;
    justify-content: center;
  }

  .action-row {
    width: 100%;
    grid-template-columns: 1fr;
  }

  .btn-map-action,
  .btn-ticket-action,
  .btn-favorite {
    width: 100%;
  }

  .map-frame {
    height: 280px;
  }

  .ticket-quantity-grid,
  .ticket-summary {
    grid-template-columns: 1fr;
  }
}

.reviews-section {
  background: #ffffff;
  border-radius: 8px;
  padding: 32px;
  margin-bottom: 30px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06);
  border: 1px solid #f3f4f6;
}

.reviews-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 12px;
}

.reviews-section h2 {
  font-size: 1.6rem;
  font-weight: 700;
  margin: 0;
  color: #111827;
  letter-spacing: -0.01em;
}

.reviews-stats {
  display: flex;
  align-items: center;
  gap: 8px;
}

.avg-rating {
  color: #f59e0b;
  font-weight: 600;
}

.review-count {
  color: #6b7280;
  font-size: 0.9rem;
}

/* Review Form */
.review-form-section {
  margin-bottom: 32px;
  padding-bottom: 24px;
}

.login-prompt, .already-reviewed {
  text-align: center;
  padding: 20px;
  background: #f9fafb;
  border-radius: 8px;
}

.login-prompt a {
  color: #6b72cf;
  font-weight: 600;
}

.already-reviewed {
  color: #059669;
  font-weight: 500;
}

.review-form h3 {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 16px;
  color: #374151;
}

.rating-input {
  margin-bottom: 16px;
}

.rating-input label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #374151;
}

.star-rating {
  display: flex;
  gap: 4px;
}

.star-rating .star {
  font-size: 2rem;
  color: #f59e0b;
  cursor: pointer;
  transition: color 0.2s;
}

.star-rating .star.active {
  color: #f59e0b;
}

.star-rating .star:hover {
  color: #f59e0b;
}

.comment-input {
  margin-bottom: 16px;
}

.comment-input label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #374151;
}

.comment-input textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.95rem;
  resize: none;
  font-family: inherit;
}

.comment-input textarea:focus {
  outline: none;
  border-color: #6b72cf;
  box-shadow: 0 0 0 3px rgba(107, 114, 207, 0.1);
}

.review-images-input {
  margin-bottom: 16px;
}

.review-images-input label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #374151;
}

.review-images-native {
  display: none;
}

.review-images-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
}

.btn-pick-images {
  background: #6b72cf;
  color: white;
  border: none;
  padding: 10px 14px;
  border-radius: 10px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s, transform 0.05s;
}

.btn-pick-images:hover {
  background: #4f46e5;
}

.btn-pick-images:active {
  transform: translateY(1px);
}

.btn-pick-images:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.review-images-meta {
  font-size: 0.9rem;
  color: #6b7280;
}

.review-images-hint {
  margin-top: 8px;
  font-size: 0.85rem;
  color: #6b7280;
}

.review-existing-images,
.review-submitted-images {
  margin-bottom: 12px;
}

.existing-title {
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
}

.review-images-preview {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 12px;
}

.preview-item {
  position: relative;
  width: 92px;
  height: 92px;
}

.preview-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.btn-remove-preview {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 28px;
  height: 28px;
  background: rgba(17, 24, 39, 0.75);
  color: white;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  font-size: 0.95rem;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-remove-preview:hover {
  background: rgba(17, 24, 39, 0.9);
}

.preview-status {
  position: absolute;
  left: 6px;
  bottom: 6px;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  color: white;
  background: rgba(107, 114, 207, 0.85);
}

.preview-status.approved {
  background: rgba(34, 197, 94, 0.85);
}

.preview-status.rejected {
  background: rgba(239, 68, 68, 0.85);
}

.review-error {
  color: #dc2626;
  font-size: 0.9rem;
  margin-bottom: 12px;
}

.submit-review-btn {
  background: #6b72cf;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.submit-review-btn:hover:not(:disabled) {
  background: #5a61b8;
}

.submit-review-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Reviews List */
.reviews-list {
  margin-top: 24px;
}

.loading-reviews {
  text-align: center;
  padding: 20px;
  color: #6b7280;
}

.review-item {
  padding: 20px 0;
}

.review-item:last-child {
  border-bottom: none;
}

.review-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.reviewer-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.reviewer-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  object-fit: cover;
  background: #f3f4f6;
}

.reviewer-details {
  display: flex;
  flex-direction: column;
}

.reviewer-name {
  font-weight: 600;
  color: #111827;
}

.review-date {
  font-size: 0.85rem;
  color: #9ca3af;
}

.review-rating .stars {
  font-size: 1rem;
}

.review-content p {
  color: #4b5563;
  line-height: 1.6;
  margin: 0 0 12px 0;
}

.review-images {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.review-images img {
  width: 100px;
  height: 100px;
  object-fit: cover;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.2s;
}

.review-images img:hover {
  transform: scale(1.05);
}

.review-actions {
  margin-top: 12px;
}

.delete-review-btn {
  background: none;
  border: none;
  color: #ef4444;
  font-size: 0.85rem;
  cursor: pointer;
  padding: 4px 8px;
}

.delete-review-btn:hover {
  text-decoration: underline;
}

.reviews-pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-top: 24px;
  padding-top: 16px;
}

.reviews-pagination button {
  background: #f3f4f6;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  color: #374151;
}

.reviews-pagination button:hover:not(:disabled) {
  background: #e5e7eb;
}

.reviews-pagination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.no-reviews {
  text-align: center;
  padding: 40px 20px;
  color: #9ca3af;
}

.no-reviews p {
  font-size: 0.95rem;
  margin: 0;
}

.no-place {
  text-align: center;
  padding: 60px 20px;
  color: #9ca3af;
}

.no-place p {
  font-size: 1.1rem;
  margin-bottom: 20px;
}

.back-link {
  display: inline-block;
  color: #6b72cf;
  text-decoration: none;
  padding: 10px 20px;
  border: 2px solid #6b72cf;
  border-radius: 8px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.back-link:hover {
  background-color: #6b72cf;
  color: white;
}

.loading-spinner {
  text-align: center;
  padding: 60px 20px;
  color: #6b72cf;
  font-size: 1.1rem;
  font-weight: 500;
}

.loading-spinner::before {
  content: '';
  display: inline-block;
  width: 24px;
  height: 24px;
  margin-right: 12px;
  border: 3px solid #e9e5f5;
  border-top-color: #6b72cf;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  vertical-align: middle;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-message {
  background-color: rgba(220, 38, 38, 0.1);
  color: #dc2626;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  border-left: 4px solid #dc2626;
  text-align: center;
}

/* Review Modal Styles */
.review-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
  box-sizing: border-box;
}

.review-modal {
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  animation: modalSlideIn 0.3s ease;
  margin: auto;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  background: #f9fafb;
  border-radius: 16px 16px 0 0;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: #111827;
}

.close-modal-btn {
  background: #f3f4f6;
  border: none;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  font-size: 1.5rem;
  color: #6b7280;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  line-height: 1;
}

.close-modal-btn:hover {
  background: #e5e7eb;
  color: #374151;
}

.modal-body {
  padding: 28px 24px;
}

.modal-body .rating-input {
  margin-bottom: 24px;
  text-align: center;
}

.modal-body .rating-input label {
  display: block;
  margin-bottom: 16px;
  font-weight: 600;
  color: #374151;
  font-size: 1rem;
}

.star-rating-large {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-bottom: 12px;
}

.star-rating-large .star {
  font-size: 2.8rem;
  color: #f59e0b;
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
}

.star-rating-large .star.active {
  color: #f59e0b;
}

.star-rating-large .star:hover {
  transform: scale(1.2);
  color: #f59e0b;
}

.rating-label {
  display: block;
  font-size: 1rem;
  color: #6b72cf;
  font-weight: 600;
  margin-top: 8px;
}

.modal-body .comment-input {
  margin-bottom: 16px;
  text-align: left;
}

.modal-body .comment-input label {
  display: block;
  margin-bottom: 10px;
  font-weight: 600;
  color: #374151;
  font-size: 1rem;
}

.modal-body .comment-input textarea {
  width: 100%;
  padding: 14px 16px;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  font-size: 0.95rem;
  resize: none;
  font-family: inherit;
  transition: border-color 0.2s, box-shadow 0.2s;
  min-height: 120px;
  box-sizing: border-box;
}

.modal-body .comment-input textarea:focus {
  outline: none;
  border-color: #6b72cf;
  box-shadow: 0 0 0 3px rgba(107, 114, 207, 0.15);
}

.modal-body .comment-input textarea::placeholder {
  color: #9ca3af;
}

.modal-body .review-error {
  background: #fef2f2;
  color: #dc2626;
  padding: 12px 16px;
  border-radius: 10px;
  font-size: 0.9rem;
  margin-top: 12px;
  border: 1px solid #fecaca;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  background: #f9fafb;
  border-radius: 0 0 16px 16px;
}

.modal-footer.centered {
  justify-content: center;
}

.btn-cancel {
  padding: 12px 24px;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  color: #6b7280;
  font-size: 0.95rem;
  transition: all 0.2s;
}

.btn-cancel:hover {
  background: #f3f4f6;
  border-color: #d1d5db;
}

.btn-submit {
  padding: 12px 28px;
  background: linear-gradient(135deg, #6b72cf 0%, #5a61b8 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(107, 114, 207, 0.3);
}

.btn-submit:hover:not(:disabled) {
  background: linear-gradient(135deg, #5a61b8 0%, #4a51a0 100%);
  box-shadow: 0 4px 12px rgba(107, 114, 207, 0.4);
  transform: translateY(-1px);
}

.btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* Review Button Style */
.btn-review {
  background: #10b981;
  color: white;
  border: none;
}

.btn-review:hover {
  background: #059669;
}

.reviewed-badge {
  display: inline-flex;
  align-items: center;
  padding: 12px 20px;
  background: #d1fae5;
  color: #059669;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9rem;
}

/* Lightbox Styles */
.lightbox-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
  box-sizing: border-box;
}

.lightbox-image {
  max-width: 90%;
  max-height: 90vh;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.5);
}

.lightbox-close {
  position: fixed;
  top: 20px;
  right: 20px;
  background: rgba(255,255,255,0.2);
  border: none;
  color: white;
  font-size: 2.5rem;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  line-height: 1;
  padding: 0;
}

.lightbox-close:hover {
  background: rgba(255,255,255,0.3);
  transform: scale(1.1);
}

.lightbox-close svg {
  width: 30px;
  height: 30px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.4;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.lightbox-nav {
  position: fixed;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(255,255,255,0.2);
  border: none;
  color: white;
  font-size: 3rem;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  padding: 0;
  line-height: 1;
}

.lightbox-nav:hover {
  background: rgba(255,255,255,0.3);
}

.lightbox-nav svg {
  width: 34px;
  height: 34px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.4;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.lightbox-nav.prev { left: 20px; }
.lightbox-nav.next { right: 20px; }

.lightbox-counter {
  position: fixed;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0,0,0,0.7);
  color: white;
  padding: 10px 20px;
  border-radius: 20px;
  font-size: 0.95rem;
}

/* Nearby Section */
.nearby-section {
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  margin-top: 24px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  overflow: hidden;
}

.nearby-section h2 {
  font-size: 1.4rem;
  font-weight: 700;
  color: #111827;
  margin: 0 0 20px 0;
}

.nearby-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  width: 100%;
}

@media (max-width: 900px) {
  .nearby-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .nearby-grid {
    grid-template-columns: 1fr;
  }
}

.nearby-card {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: #f9fafb;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
  overflow: hidden;
  min-width: 0;
}

.nearby-card:hover {
  background: #f0f4ff;
  border-color: #c7d2fe;
  transform: translateY(-2px);
}

.nearby-image {
  width: 80px;
  height: 80px;
  border-radius: 10px;
  overflow: hidden;
  flex-shrink: 0;
}

.nearby-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.nearby-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.nearby-info h4 {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: #111827;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nearby-meta {
  display: flex;
  gap: 12px;
  font-size: 0.8rem;
  color: #6b7280;
  flex-wrap: nowrap;
}

.nearby-meta span {
  white-space: nowrap;
}

.nearby-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.mini-tag {
  padding: 3px 8px;
  background: #e0e7ff;
  color: #4338ca;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 500;
}

/* Login hint */
.login-hint {
  color: #6b7280;
  font-size: 0.9rem;
}

.login-hint a {
  color: #6366f1;
  font-weight: 600;
}

/* Reviews: final normalized UI */
.reviews-section {
  background: var(--tw-surface);
  border: 1px solid var(--tw-border);
  border-radius: var(--tw-radius-md);
  box-shadow: var(--tw-shadow-sm);
  padding: 24px;
}

.reviews-header {
  margin-bottom: 18px;
}

.reviews-title-section h2,
.reviews-header h2 {
  margin: 0;
  color: var(--tw-text);
  font-size: 1.35rem;
  font-weight: 800;
  letter-spacing: 0;
}

.write-review-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  background: #f8fafc;
  border: 1px solid var(--tw-border);
  border-radius: var(--tw-radius-md);
  padding: 16px;
  margin-bottom: 22px;
}

.write-review-header {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.write-avatar {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  border: 1px solid var(--tw-border);
  box-shadow: none;
}

.write-prompt {
  min-width: 0;
}

.write-name {
  color: var(--tw-text);
  font-weight: 700;
}

.write-hint {
  color: var(--tw-muted);
}

.write-review-btn {
  background: var(--tw-primary);
  color: #fff;
  border: 1px solid var(--tw-primary);
  border-radius: var(--tw-radius-md);
  box-shadow: none;
  padding: 11px 18px;
  font-weight: 700;
  white-space: nowrap;
}

.write-review-btn:hover {
  background: var(--tw-primary-600);
  transform: none;
  box-shadow: none;
}

.login-to-review {
  background: #f8fafc;
  border: 1px solid var(--tw-border);
  border-radius: var(--tw-radius-md);
  margin-bottom: 22px;
  padding: 14px 16px;
}

.login-to-review p {
  color: var(--tw-muted);
}

.login-to-review a {
  color: var(--tw-primary-600);
}

.no-reviews {
  background: #f8fafc;
  border: 1px solid var(--tw-border);
  border-radius: var(--tw-radius-md);
  padding: 44px 20px;
}

.no-reviews-icon {
  display: none;
}

.no-reviews h3 {
  color: var(--tw-text);
  font-size: 1.1rem;
  font-weight: 800;
}

.no-reviews p {
  color: var(--tw-muted);
}

.reviews-container {
  gap: 12px;
}

.review-card {
  border: 1px solid var(--tw-border);
  border-radius: var(--tw-radius-md);
  box-shadow: none;
  padding: 18px;
}

.review-card:hover {
  border-color: #cbd5e1;
  box-shadow: none;
}

.reviewer-avatar {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  background: #f1f5f9;
  border: 1px solid var(--tw-border);
}

.reviewer-name {
  color: var(--tw-text);
  font-weight: 700;
}

.review-date,
.review-meta {
  color: var(--tw-muted);
}

.stars-display {
  color: #f59e0b;
  letter-spacing: 1px;
}

.review-body,
.review-footer {
  padding-left: 56px;
}

.review-text {
  color: #334155;
  line-height: 1.65;
}

.review-image-wrapper {
  width: 88px;
  height: 88px;
  border-radius: 8px;
}

.image-overlay {
  background: rgba(15, 23, 42, 0.52);
}

.image-overlay span {
  color: #fff;
  font-size: 0.78rem;
  font-weight: 700;
}

.review-like-btn,
.review-action-btn {
  border-radius: var(--tw-radius-sm);
  box-shadow: none;
}

.review-action-btn {
  padding: 7px 12px;
}

@media (max-width: 640px) {
  .reviews-section {
    padding: 18px;
  }

  .write-review-box {
    align-items: stretch;
    flex-direction: column;
  }

  .write-review-btn {
    width: 100%;
  }

  .review-body,
  .review-footer {
    padding-left: 0;
  }
}
</style>
