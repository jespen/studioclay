import { Course } from './course';

export interface UserInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  numberOfParticipants: string;
  specialRequirements?: string;
  address?: string;
  postalCode?: string;
  city?: string;
}

export interface InvoiceDetails {
  address: string;
  postalCode: string;
  city: string;
  reference?: string;
}

export interface PaymentDetails {
  method: string;
  status?: string;
  paymentReference?: string;
  swishNumber?: string;
  invoiceNumber?: string;
  paymentDate?: string;
  amount?: number;
}

export interface Payment {
  id: string;
  created_at: string;
  status: PaymentStatus;
  payment_method: string;
  amount: number;
  payment_reference: string;
  booking_id: string;
  booking?: Booking;
}

export type PaymentStatus = 'CREATED' | 'PAID' | 'DECLINED' | 'ERROR';

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
  payment_status?: PaymentStatus;
  payment?: Payment;
  payments?: Payment[];
  course?: Course;
  message?: string;
  unit_price?: number;
  total_price?: number;
}

export interface ExtendedBooking extends Omit<Booking, 'course' | 'payments' | 'payment_status'> {
  course: {
    id: string;
    title: string;
    description: string;
    price: number;
    duration: number;
    capacity: number;
  };
  payments?: Array<Payment>;
  payment_method: string;
  booking_reference: string;
  payment_status: PaymentStatus;
  invoice_number?: string;
  invoice_address?: string;
  invoice_postal_code?: string;
  invoice_city?: string;
  invoice_reference?: string;
} 