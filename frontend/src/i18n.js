import { reactive } from 'vue'

const normalizeLang = (lang) => {
  const v = String(lang || '').toLowerCase()
  return v === 'en' ? 'en' : 'vi'
}

export const i18nState = reactive({
  lang: normalizeLang(localStorage.getItem('lang') || 'vi')
})

const messages = {
  vi: {
    nav: {
      home: 'Trang chủ',
      suggest: 'Gợi ý',
      favour: 'Yêu thích',
      about: 'Về chúng tôi',
      admin: 'Quản trị hệ thống'
    },
    auth: {
      login: 'Đăng nhập',
      logout: 'Đăng xuất'
    },
    userMenu: {
      editProfile: 'Chỉnh sửa thông tin',
      changePassword: 'Đổi mật khẩu',
      admin: 'Quản trị hệ thống'
    },
    search: {
      open: 'Tìm kiếm',
      title: 'Tìm kiếm',
      placeholder: 'VD: công viên, khu vui chơi trong nhà, miễn phí...',
      button: 'Tìm kiếm',
      errorEmpty: 'Vui lòng nhập từ khóa tìm kiếm',
      ageLabel: 'Độ tuổi phù hợp',
      history: 'Lịch sử tìm kiếm',
      clearAll: 'Xóa tất cả',
      popular: 'Từ khóa phổ biến',
      emptyHistory: 'Chưa có lịch sử tìm kiếm'
    },
    home: {
      heroTitle: 'Khám phá khu vui chơi cho trẻ em',
      heroSubtitle: 'Tìm những địa điểm và hoạt động thú vị cho bé',
      topTitle: 'Một số địa điểm vui chơi cho trẻ nhỏ',
      activitiesTitle: 'Hoạt động thú vị',
      activitiesSubtitle: 'Gợi ý các trải nghiệm phù hợp cho trẻ nhỏ',
      loadingPlaces: 'Đang tải các địa điểm gần bạn...',
      noPlaces: 'Không tìm thấy địa điểm.',
      noActivities: 'Chưa có hoạt động để hiển thị.'
    },
    activities: {
      swimming: 'Bơi lội',
      climbing: 'Leo núi nhân tạo',
      animalCare: 'Chăm sóc thú',
      thrill: 'Cảm giác mạnh',
      history: 'Khám phá lịch sử',
      picnic: 'Picnic',
      farm: 'Làm nông trại'
    },
    about: {
      title: 'Về chúng tôi',
      subtitle: 'TheWeekend giúp bạn tìm khu vui chơi và hoạt động phù hợp cho bé.'
    },
    common: {
      unknownAddress: 'Địa chỉ không rõ',
      loading: 'Đang tải...',
      close: 'Đóng'
    }
  },
  en: {
    nav: {
      home: 'Home',
      suggest: 'Suggestions',
      favour: 'Favorites',
      about: 'About us',
      admin: 'Admin'
    },
    auth: {
      login: 'Login',
      logout: 'Logout'
    },
    userMenu: {
      editProfile: 'Edit profile',
      changePassword: 'Change password',
      admin: 'Admin dashboard'
    },
    search: {
      open: 'Search',
      title: 'Search',
      placeholder: 'e.g., park, indoor playground, free...',
      button: 'Search',
      errorEmpty: 'Please enter a search keyword',
      ageLabel: 'Suitable age',
      history: 'Search history',
      clearAll: 'Clear all',
      popular: 'Popular keywords',
      emptyHistory: 'No search history yet'
    },
    home: {
      heroTitle: 'Discover playgrounds for kids',
      heroSubtitle: 'Find fun places and activities for your child',
      topTitle: 'Some playgrounds for kids',
      activitiesTitle: 'Fun activities',
      activitiesSubtitle: 'Recommended experiences for little ones',
      loadingPlaces: 'Loading places near you...',
      noPlaces: 'No places found.',
      noActivities: 'No activities to show yet.'
    },
    activities: {
      swimming: 'Swimming',
      climbing: 'Indoor climbing',
      animalCare: 'Animal care',
      thrill: 'Thrill rides',
      history: 'Explore history',
      picnic: 'Picnic',
      farm: 'Farm activities'
    },
    about: {
      title: 'About us',
      subtitle: 'TheWeekend helps you find playgrounds and kid-friendly activities.'
    },
    common: {
      unknownAddress: 'Unknown address',
      loading: 'Loading...',
      close: 'Close'
    }
  }
}

const getByPath = (obj, keyPath) => {
  const parts = String(keyPath || '').split('.').filter(Boolean)
  let cur = obj
  for (const p of parts) {
    cur = cur && typeof cur === 'object' ? cur[p] : undefined
  }
  return cur
}

export function setLanguage(lang) {
  const next = normalizeLang(lang)
  i18nState.lang = next
  localStorage.setItem('lang', next)
}

export function t(key) {
  const lang = i18nState.lang
  const primary = getByPath(messages[lang], key)
  if (primary !== undefined) return primary
  const fallback = getByPath(messages.vi, key)
  return fallback !== undefined ? fallback : String(key)
}
