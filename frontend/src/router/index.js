import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '../pages/HomePage.vue'
import LoginPage from '../pages/LoginPage.vue'
import RegisterPage from '../pages/RegisterPage.vue'
import ForgotPassword from '../pages/ForgotPassword.vue'
import ResetPassword from '../pages/ResetPassword.vue'
import EditProfile from '../pages/EditProfile.vue'
import ChangePassword from '../pages/ChangePassword.vue'
import SearchResults from '../pages/SearchResults.vue'
import PlaceDetails from '../pages/PlaceDetails.vue'
import SuggestPage from '../pages/SuggestPage.vue'
import FavourPage from '../pages/FavourPage.vue'
import AboutPage from '../pages/AboutPage.vue'
import AdminDashboard from '../pages/AdminDashboard.vue'
import AdminUsers from '../pages/AdminUsers.vue'
import AdminPlaces from '../pages/AdminPlaces.vue'
import AdminTickets from '../pages/AdminTickets.vue'
import MyTickets from '../pages/MyTickets.vue'
import TicketPayment from '../pages/TicketPayment.vue'
import { getAuthToken, getAuthUser } from '../utils/authSession'

const routes = [
  { path: '/', component: HomePage, meta: { userOnly: true } },
  { path: '/login', component: LoginPage },
  { path: '/register', component: RegisterPage },
  { path: '/forgot', component: ForgotPassword },
  { path: '/reset', component: ResetPassword },
  { path: '/profile/edit', component: EditProfile, meta: { userOnly: true } },
  { path: '/profile/change-password', component: ChangePassword, meta: { userOnly: true } },
  { path: '/search', component: SearchResults },
  { path: '/place/:id', component: PlaceDetails },
  { path: '/suggest', component: SuggestPage, meta: { userOnly: true } },
  { path: '/favour', component: FavourPage, meta: { userOnly: true } },
  { path: '/tickets', component: MyTickets, meta: { userOnly: true } },
  { path: '/ticket-payment/:orderId', component: TicketPayment },
  { path: '/about', component: AboutPage },
  { path: '/admin', component: AdminDashboard, meta: { adminOnly: true } },
  { path: '/admin/users', component: AdminUsers, meta: { adminOnly: true } },
  { path: '/admin/places', component: AdminPlaces, meta: { adminOnly: true } },
  { path: '/admin/tickets', component: AdminTickets, meta: { adminOnly: true } }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Centralized route access control for guest, user, and admin pages.
router.beforeEach((to, from, next) => {
  const token = getAuthToken()
  const user = getAuthUser()
  const isAuthenticated = !!(token && user)
  const isAdmin = isAuthenticated && user.role === 'admin'

  if ((to.meta.userOnly || to.meta.adminOnly) && !isAuthenticated) {
    next({
      path: '/login',
      query: to.fullPath && to.fullPath !== '/login' ? { redirect: to.fullPath } : {}
    })
    return
  }

  if (to.meta.adminOnly && !isAdmin) {
    next('/')
    return
  }

  if (to.meta.userOnly && isAdmin) {
    next('/admin')
    return
  }

  next()
})

export default router
