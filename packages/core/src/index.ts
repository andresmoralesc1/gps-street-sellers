// Types
export type {
  UserRole,
  VendorCategory,
  Vendor,
  VendorLocation,
  Product,
  Review,
  Favorite,
  NotificationPrefs,
  VendorWithLocation,
} from './types'

// Constants
export { CATEGORIES, getCategoryInfo } from './constants/categories'
export type { CategoryInfo } from './constants/categories'

// Utils
export { calculateDistance, filterByDistance } from './utils/geo'
export { sendEmail } from './utils/email'
export type { SendEmailParams, SendEmailResult } from './utils/email'