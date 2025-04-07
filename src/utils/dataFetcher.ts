import { 
  setItemDetails as setFlowItemDetails, 
  getItemDetails as getFlowItemDetails,
  setUserInfo as setFlowUserInfo, 
  getUserInfo as getFlowUserInfo,
  setPaymentInfo as setFlowPaymentInfo, 
  getPaymentInfo as getFlowPaymentInfo 
} from './dataStorage';

/**
 * Interface for course details
 */
export interface CourseDetail {
  id: string;
  title: string;
  description?: string;
  rich_description?: string;
  start_date?: string;
  end_date?: string;
  duration_minutes?: number;
  location?: string;
  price?: number;
  max_participants?: number;
  current_participants?: number;
  features?: string[];
  image_url?: string;
  category?: any;
  instructor?: any;
  availableSpots?: number;
  template_id?: string;
}

/**
 * Result of fetching course details
 */
export interface FetchCourseResult {
  courseDetail: CourseDetail | null;
  loading: boolean;
  error: string | null;
  hasLimitedData: boolean;
}

/**
 * Options for fetching course details
 */
export interface FetchCourseOptions {
  skipFlowStorage?: boolean;
  forceRefresh?: boolean;
}

/**
 * Fetches course details from localStorage first, then from API if needed
 * @param courseId The ID of the course to fetch
 * @param options Options for fetching
 * @returns Promise with the course details or error
 */
export async function fetchCourseDetail(
  courseId: string, 
  options: FetchCourseOptions = {}
): Promise<CourseDetail> {
  // First check if we already have this in flowStorage
  if (!options.skipFlowStorage && !options.forceRefresh) {
    const storedItem = getFlowItemDetails<CourseDetail>();
    if (storedItem && storedItem.id === courseId) {
      return storedItem;
    }
  }
  
  // Try to get from localStorage (legacy support) for better performance
  if (!options.forceRefresh) {
    try {
      const storedCourseDetail = localStorage.getItem('courseDetail');
      if (storedCourseDetail) {
        const parsedDetail = JSON.parse(storedCourseDetail);
        if (parsedDetail && parsedDetail.id === courseId) {
          // Store in flowStorage for future use
          if (!options.skipFlowStorage) {
            setFlowItemDetails(parsedDetail);
          }
          return parsedDetail;
        }
      }
    } catch (err) {
      console.error('Error parsing stored course detail:', err);
      // Continue to fetch from API if parsing fails
    }
  }
  
  // Fetch from API
  const response = await fetch(`/api/courses/${courseId}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch course details: ${response.status}`);
  }
  
  const data = await response.json();
  
  if (data && data.course) {
    const course = data.course;
    
    // Calculate availableSpots if not provided
    if (course.max_participants !== undefined && 
        course.availableSpots === undefined) {
      course.availableSpots = course.max_participants - (course.current_participants || 0);
    }
    
    // Store in flowStorage and localStorage for compatibility
    if (!options.skipFlowStorage) {
      setFlowItemDetails(course);
    }
    localStorage.setItem('courseDetail', JSON.stringify(course));
    
    return course;
  } else {
    throw new Error('No course data found or invalid format');
  }
}

/**
 * Checks if course details have minimal data
 * @param course The course detail to check
 * @returns True if the course has minimal data
 */
export function hasMinimalCourseData(course: CourseDetail): boolean {
  return !course.description && !course.price && !course.start_date;
}

/**
 * Hook for using course details in a component
 * This will be implemented later if needed. For now we'll use the direct fetch function.
 */

/**
 * Common user information interface
 */
export interface UserInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  numberOfParticipants: string;
  specialRequirements?: string;
}

/**
 * Payment information interface
 */
export interface PaymentInfo {
  status: string;
  amount: number;
  payment_method: string;
  updated_at?: string;
  created_at?: string;
  reference: string;
}

/**
 * Save user information to both flowStorage and localStorage
 * @param userInfo The user information to save
 */
export function saveUserInfo(userInfo: UserInfo): void {
  // Save to flow storage
  setFlowUserInfo(userInfo);
  
  // For backwards compatibility
  localStorage.setItem('userInfo', JSON.stringify(userInfo));
}

/**
 * Get user information from flowStorage or localStorage
 * @returns The user information or null if not found
 */
export function getUserInfo(): UserInfo | null {
  // Try flow storage first
  const flowUserInfo = getFlowUserInfo<UserInfo>();
  if (flowUserInfo) {
    return flowUserInfo;
  }
  
  // Fallback to localStorage for backwards compatibility
  try {
    const storedUserInfo = localStorage.getItem('userInfo');
    if (storedUserInfo) {
      const parsedUserInfo = JSON.parse(storedUserInfo);
      // Store in flow storage for future use
      setFlowUserInfo(parsedUserInfo);
      return parsedUserInfo;
    }
  } catch (error) {
    console.error('Error parsing user info from localStorage:', error);
  }
  
  return null;
}

/**
 * Save payment information to both flowStorage and localStorage
 * @param paymentInfo The payment information to save
 */
export function savePaymentInfo(paymentInfo: PaymentInfo): void {
  // Save to flow storage
  setFlowPaymentInfo(paymentInfo);
  
  // For backwards compatibility
  localStorage.setItem('paymentInfo', JSON.stringify(paymentInfo));
}

/**
 * Get payment information from flowStorage or localStorage
 * @returns The payment information or null if not found
 */
export function getPaymentInfo(): PaymentInfo | null {
  // Try flow storage first
  const flowPaymentInfo = getFlowPaymentInfo<PaymentInfo>();
  if (flowPaymentInfo) {
    return flowPaymentInfo;
  }
  
  // Fallback to localStorage for backwards compatibility
  try {
    const storedPaymentInfo = localStorage.getItem('paymentInfo');
    if (storedPaymentInfo) {
      const parsedPaymentInfo = JSON.parse(storedPaymentInfo);
      // Store in flow storage for future use
      setFlowPaymentInfo(parsedPaymentInfo);
      return parsedPaymentInfo;
    }
    
    // Try legacy format
    const storedPaymentDetails = localStorage.getItem('paymentDetails');
    if (storedPaymentDetails) {
      const details = JSON.parse(storedPaymentDetails);
      const paymentInfo: PaymentInfo = {
        status: details.paymentStatus || 'completed',
        amount: details.amount || 0,
        payment_method: details.method || 'unknown',
        updated_at: details.paymentDate || new Date().toISOString(),
        created_at: details.createdAt || new Date().toISOString(),
        reference: details.paymentReference || ''
      };
      
      // Store in flow storage for future use
      setFlowPaymentInfo(paymentInfo);
      return paymentInfo;
    }
  } catch (error) {
    console.error('Error parsing payment info from localStorage:', error);
  }
  
  return null;
}

/**
 * Generate a booking reference
 * @returns A unique booking reference
 */
export function generateBookingReference(): string {
  const timestamp = new Date().getTime().toString().slice(-5);
  const randomChars = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `SC-${randomChars}-${timestamp}`;
}

/**
 * Save item details to both flowStorage and localStorage
 * @param itemDetails The item details to save
 */
export function saveItemDetails<T>(itemDetails: T): void {
  // Save to flow storage
  setFlowItemDetails(itemDetails);
  
  // For backwards compatibility (if it's a course)
  if (itemDetails && typeof itemDetails === 'object' && 'id' in itemDetails) {
    localStorage.setItem('courseDetail', JSON.stringify(itemDetails));
  }
}

/**
 * Gift card details interface
 */
export interface GiftCardDetails {
  amount: number;
  type: string;
  recipientName: string;
  recipientEmail: string;
  message?: string;
}

/**
 * Save gift card details to both flowStorage and other storage methods
 * for maximum compatibility
 * @param giftCardDetails The gift card details to save
 */
export function saveGiftCardDetails(giftCardDetails: GiftCardDetails): void {
  // Save directly to itemDetails for the flow
  setFlowItemDetails(giftCardDetails);
  
  // Also save to specialized gift card storage
  import('./flowStorage').then(module => {
    module.setGiftCardDetails(giftCardDetails);
  });
  
  // For backwards compatibility with direct localStorage access
  localStorage.setItem('itemDetails', JSON.stringify(giftCardDetails));
  localStorage.setItem('giftCardDetails', JSON.stringify(giftCardDetails));
  
  console.log('Saved gift card details to all storage mechanisms:', giftCardDetails);
} 