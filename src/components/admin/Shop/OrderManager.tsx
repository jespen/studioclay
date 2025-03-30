import React, { useState, useEffect } from 'react';
import { supabaseClient as supabase } from '@/lib/supabase';
import AdminHeader from '../Dashboard/AdminHeader';
import SectionContainer from '../Dashboard/SectionContainer';
import styles from '../../../app/admin/dashboard/courses/courses.module.css';
import OrderForm from './OrderForm';

// Typdefinitioner för beställningar
interface ArtOrder {
  id: string;
  created_at: string;
  updated_at: string;
  product_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  status: string;
  payment_status: string;
  payment_method: string;
  order_reference: string;
  invoice_number: string | null;
  unit_price: number;
  total_price: number;
  currency: string;
  product?: {
    title: string;
    image: string;
  };
}

interface OrderManagerProps {
  /**
   * Whether to show the admin header, defaults to true
   */
  showHeader?: boolean;
}

const OrderManager: React.FC<OrderManagerProps> = ({ showHeader = true }) => {
  const [orders, setOrders] = useState<ArtOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<ArtOrder | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Ladda beställningar från API
  useEffect(() => {
    async function loadOrders() {
      setLoading(true);
      try {
        // Använd supabase direkt för att hämta beställningar med produkt join
        const { data, error } = await supabase
          .from('art_orders')
          .select(`
            *,
            product:product_id (
              title,
              image
            )
          `)
          .order('created_at', { ascending: false });

        if (error) {
          throw new Error(`Failed to fetch orders: ${error.message}`);
        }
        
        if (data) {
          setOrders(data);
        } else {
          throw new Error('No data returned');
        }
        
        setLoading(false);
      } catch (err: any) {
        console.error('Error loading orders:', err);
        setError(err.message);
        setLoading(false);
      }
    }
    
    loadOrders();
  }, []);

  const handleViewOrder = (order: ArtOrder) => {
    setSelectedOrder(order);
    setShowForm(true);
  };

  const handleDeleteOrder = async (id: string) => {
    if (window.confirm('Är du säker på att du vill ta bort denna beställning?')) {
      try {
        const { error } = await supabase
          .from('art_orders')
          .delete()
          .eq('id', id);
        
        if (error) {
          throw new Error(`Failed to delete order: ${error.message}`);
        }
        
        // Uppdatera listan efter borttagning
        setOrders(orders.filter(order => order.id !== id));
      } catch (err: any) {
        console.error('Error deleting order:', err);
        setError(err.message);
      }
    }
  };

  // Formattera datum på ett snyggt sätt
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('sv-SE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Visa statusfärg baserat på beställningsstatus
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'paid':
        return 'text-green-600';
      case 'confirmed':
        return 'text-blue-600';
      case 'processing':
        return 'text-yellow-600';
      case 'cancelled':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  // Visa formulär om man valt att redigera
  if (showForm && selectedOrder) {
    return (
      <div className={styles.pageContainer}>
        <main className={styles.mainContent}>
          <OrderForm 
            order={selectedOrder} 
            onClose={() => {
              setShowForm(false);
              setSelectedOrder(null);
            }}
            onUpdate={(updatedOrder: ArtOrder) => {
              // Uppdatera listan med den uppdaterade beställningen
              setOrders(orders.map(o => o.id === updatedOrder.id ? updatedOrder : o));
              setShowForm(false);
              setSelectedOrder(null);
            }}
          />
        </main>
      </div>
    );
  }

  // Visa beställningslistan
  return (
    <div className={styles.pageContainer}>
      {showHeader && (
        <AdminHeader title="Beställningar" subtitle="Hantera beställningar från webbutiken" />
      )}
      
      <main className={styles.dashboardMainContent}>
        <SectionContainer title="Beställningar">
          {loading ? (
            <p>Laddar beställningar...</p>
          ) : error ? (
            <p className="text-red-500">{error}</p>
          ) : orders.length === 0 ? (
            <p>Inga beställningar hittades.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Datum</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Beställnings-ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produkt</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kund</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pris</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Betalmetod</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Åtgärder</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {formatDate(order.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {order.order_reference}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {order.product?.image && (
                            <div className="h-10 w-10 bg-gray-100 mr-3">
                              <img 
                                src={order.product.image} 
                                alt={order.product?.title || 'Produkt'}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          )}
                          <span className="text-sm">{order.product?.title || 'Okänd produkt'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div>
                          <p className="font-medium">{order.customer_name}</p>
                          <p className="text-gray-500">{order.customer_email}</p>
                          {order.customer_phone && <p className="text-gray-500">{order.customer_phone}</p>}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {order.total_price} {order.currency}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {order.payment_method === 'swish' ? 'Swish' : 
                         order.payment_method === 'invoice' ? 'Faktura' : 
                         order.payment_method}
                        {order.invoice_number && (
                          <p className="text-xs text-gray-500">#{order.invoice_number}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`${getStatusColor(order.payment_status)} font-medium`}>
                          {order.payment_status === 'PAID' ? 'Betald' : 
                           order.payment_status === 'CREATED' ? 'Bekräftad' : 
                           order.payment_status === 'ERROR' ? 'Fel' : 
                           order.payment_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <button
                          onClick={() => handleViewOrder(order)}
                          className="text-indigo-600 hover:text-indigo-900 mr-4"
                        >
                          Visa
                        </button>
                        <button
                          onClick={() => handleDeleteOrder(order.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Ta bort
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionContainer>
      </main>
    </div>
  );
};

export default OrderManager; 