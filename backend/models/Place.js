const mongoose = require('mongoose')

const placeSchema = new mongoose.Schema({
  placeId: { type: String, required: true, unique: true }, // Goong place ID
  name: { type: String, required: true },
  address: { type: String },
  lat: { type: Number },
  lng: { type: Number },
  rating: { type: Number },
  phone: { type: String },
  website: { type: String },
  openingHours: [{ type: String }],
  description: { type: String },
  images: [{ type: String }], // Mảng ảnh thay vì 1 ảnh
  types: [{ type: String }],
  viewCount: { type: Number, default: 1 }, // Đếm số lần xem
  ageRange: { type: String, default: '0-12' }, // Độ tuổi phù hợp (ví dụ: '3-6', '6-12', '0-12')
  price: { type: String, default: 'Miễn phí' }, // Giá tiền (ví dụ: 'Miễn phí', '50,000đ - 100,000đ')
  // Thông tin tiện ích
  parking: { type: String, default: '' }, // Bãi đỗ xe: 'Có (ô tô, xe máy)', 'Chỉ xe máy', 'Không có'
  food: { type: String, default: '' }, // Ăn uống: 'Có quán ăn', 'Cho phép picnic', 'Không'
  facilities: { type: String, default: '' }, // Tiện ích: 'WC, khu nghỉ', 'Chỉ WC', 'Không'
  tags: [{ type: String }] // Tags: ['Dã ngoại', 'Picnic', 'Leo núi', ...]
}, { timestamps: true })

module.exports = mongoose.model('Place', placeSchema)
