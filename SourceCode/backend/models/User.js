const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
  username:    { type: String, required: true, unique: true },
  email:       { type: String, required: true, unique: true },
  avatar:      { type: String },
  phone:       { type: String, default: '' },
  password:    {
    type: String,
    required() {
      return this.authProvider !== 'google'
    }
  },
  googleId:    { type: String, unique: true, sparse: true },
  authProvider:{ type: String, enum: ['local', 'google'], default: 'local' },
  resetCode:   { type: String },
  resetExpires:{ type: Date },
  parentName:  { type: String, required: true },
  address:     { type: String, default: '' },
  lat:         { type: Number }, // Tọa độ latitude
  lng:         { type: Number }, // Tọa độ longitude
  role:        { type: String, enum: ['user', 'admin', 'staff'], default: 'user' },
  searchHistory: [{ 
    query: String, 
    timestamp: { type: Date, default: Date.now }
  }],
  favorites: [{ type: String }] // Mảng lưu các placeId yêu thích
}, { timestamps: true })

module.exports = mongoose.model('User', userSchema)
