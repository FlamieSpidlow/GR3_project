const cloudinary = require('cloudinary').v2

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
})

const isConfigured = () => !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
)

const uploadBuffer = (buffer, folder) => {
  if (!isConfigured()) {
    return Promise.reject(new Error('Cloudinary chưa được cấu hình (CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET)'))
  }
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (err, result) => (err ? reject(err) : resolve(result))
    )
    stream.end(buffer)
  })
}

const destroyImage = async (publicId) => {
  if (!publicId || !isConfigured()) return
  await cloudinary.uploader.destroy(publicId)
}

module.exports = { uploadBuffer, destroyImage, isConfigured }
