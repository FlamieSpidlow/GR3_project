import { createRouter, createWebHistory } from 'vue-router'
import { getAuthToken, getAuthUser } from '../utils/authSession'

const HomePage = () => import('../pages/HomePage.vue')
const LoginPage = () => import('../pages/LoginPage.vue')
const RegisterPage = () => import('../pages/RegisterPage.vue')
const ForgotPassword = () => import('../pages/ForgotPassword.vue')
const ResetPassword = () => import('../pages/ResetPassword.vue')
const EditProfile = () => import('../pages/EditProfile.vue')
const ChangePassword = () => import('../pages/ChangePassword.vue')
const SearchResults = () => import('../pages/SearchResults.vue')
const PlaceDetails = () => import('../pages/PlaceDetails.vue')
const SuggestPage = () => import('../pages/SuggestPage.vue')
const FavourPage = () => import('../pages/FavourPage.vue')
const AboutPage = () => import('../pages/AboutPage.vue')
const AdminDashboard = () => import('../pages/AdminDashboard.vue')
const AdminUsers = () => import('../pages/AdminUsers.vue')
const AdminPlaces = () => import('../pages/AdminPlaces.vue')
const AdminTickets = () => import('../pages/AdminTickets.vue')
const MyTickets = () => import('../pages/MyTickets.vue')
const TicketPayment = () => import('../pages/TicketPayment.vue')

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
