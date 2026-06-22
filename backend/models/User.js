const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
  username:    { type: String, required: true, unique: true },
  email:       { type: String, required: true, unique: true },
  avatar:      { type: String },
  phone:       { type: String, default: '' },
  password:    { type: String, required: true },
  resetCode:   { type: String },
  resetExpires:{ type: Date },
  parentName:  { type: String, required: true },
  address:     { type: String, required: true },
  lat:         { type: Number }, // Tọa độ latitude
  lng:         { type: Number }, // Tọa độ longitude
  role:        { type: String, enum: ['user', 'admin'], default: 'user' },
  searchHistory: [{ 
    query: String, 
    timestamp: { type: Date, default: Date.now }
  }],
  favorites: [{ type: String }] // Mảng lưu các placeId yêu thích
}, { timestamps: true })

module.exports = mongoose.model('User', userSchema)
