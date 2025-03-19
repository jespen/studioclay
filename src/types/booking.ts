import { Course } from './course';

export interface UserInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  numberOfParticipants: string;
  specialRequirements?: string;
}

export interface InvoiceDetails {
  address: string;
  postalCode: string;
  city: string;
  reference?: string;
}

export interface PaymentDetails {
  method: string;
  swishPhone?: string;
  invoiceDetails?: InvoiceDetails;
  paymentReference?: string;
  paymentStatus?: string;
  invoiceNumber?: string;
  bookingReference?: string;
  emailSent?: boolean;
}

export interface Payment {
  id: string;
  created_at: string;
  status: 'CREATED' | 'PAID' | 'DECLINED' | 'ERROR';
  payment_method: string;
  amount: number;
  payment_reference: string;
  booking_id: string;
  booking?: Booking;
}

export interface Booking {
  id: string;
  created_at: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  number_of_participants: number;
  course_id: string;
  course_date: string;
  payment_status?: string;
  payment?: Payment;
  payments?: Payment[];
  course?: Course;
}

export type PaymentStatus = 'CREATED' | 'PAID' | 'DECLINED' | 'ERROR'; 