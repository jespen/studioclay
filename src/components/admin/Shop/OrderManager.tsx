import React, { useState, useEffect, useCallback } from 'react';
import AdminHeader from '../Dashboard/AdminHeader';
import SectionContainer from '../Dashboard/SectionContainer';
import styles from '../../../app/admin/dashboard/courses/courses.module.css';
import OrderForm from './OrderForm';
import StatusToggle from '../common/StatusToggle';
import { ShopOrder } from '@/types/shop';
import { formatDate } from '@/utils/dateUtils';
import { fetchOrdersWithCache, invalidateCache } from '@/utils/apiCache';

interface OrderManagerProps {
  /**
   * Whether to show the admin header, defaults to true
   */
  showHeader?: boolean;
}

const OrderManager: React.FC<OrderManagerProps> = ({ showHeader = true }) => {
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingOrder, setEditingOrder] = useState<ShopOrder | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [updatingOrders, setUpdatingOrders] = useState<{ [key: string]: boolean }>({});

  // Memoized fetch function to prevent unnecessary renders
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchOrdersWithCache({
        useCache: true,
        expiry: 2 * 60 * 1000 // 2 minutes cache for orders
      });
      
      if (data && Array.isArray(data.orders)) {
        console.log('Orders from API:', JSON.stringify(data.orders, null, 2));
        
        // Process the orders to transform payment status display
        const processedOrders = data.orders.map((order: ShopOrder) => {
          console.log('Processing order payment status:', order.id, order.payment_status);
          return order;
        });
        
        setOrders(processedOrders);
      } else {
        alert('Unexpected data format received from server');
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      alert('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleSaveOrder = async (updatedOrder: ShopOrder) => {
    try {
      const response = await fetch(`/api/art-orders/${updatedOrder.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedOrder),
      });

      if (!response.ok) {
        throw new Error('Failed to update order');
      }

      // Invalidate the orders cache
      invalidateCache('shop-orders');
      
      // Refresh the orders list
      await fetchOrders();
      alert('Order updated successfully');
      setIsModalVisible(false);
    } catch (error) {
      console.error('Error updating order:', error);
      alert('Failed to update order');
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    setUpdatingOrders(prev => ({ ...prev, [orderId]: true }));
    
    try {
      const response = await fetch(`/api/art-orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error('Failed to update order status');
      }

      // Update local state optimistically
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId ? { ...order, status } : order
        )
      );

      // Invalidate the orders cache
      invalidateCache('shop-orders');
      
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Failed to update order status');
      // Refresh to get the correct state
      await fetchOrders();
    } finally {
      setUpdatingOrders(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const handleUpdatePaymentStatus = async (orderId: string, paymentStatus: string) => {
    setUpdatingOrders(prev => ({ ...prev, [`${orderId}-payment`]: true }));
    
    try {
      const response = await fetch(`/api/art-orders/${orderId}/payment-status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ payment_status: paymentStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update payment status');
      }

      // Update local state optimistically
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId ? { ...order, payment_status: paymentStatus } : order
        )
      );

      // Invalidate the orders cache
      invalidateCache('shop-orders');
      
    } catch (error) {
      console.error('Error updating payment status:', error);
      alert('Failed to update payment status');
      // Refresh to get the correct state
      await fetchOrders();
    } finally {
      setUpdatingOrders(prev => ({ ...prev, [`${orderId}-payment`]: false }));
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!window.confirm('Are you sure you want to delete this order?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/art-orders/${orderId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete order');
      }

      // Invalidate the orders cache
      invalidateCache('shop-orders');
      
      // Refresh the orders list
      await fetchOrders();
      alert('Order deleted successfully');
    } catch (error) {
      console.error('Error deleting order:', error);
      alert('Failed to delete order');
    }
  };

  const handleEditOrder = (order: ShopOrder) => {
    setEditingOrder(order);
    setIsModalVisible(true);
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    setEditingOrder(null);
  };

  // Visa formulär om man valt att redigera
  if (isModalVisible && editingOrder) {
    return (
      <div className={styles.pageContainer}>
        <main className={styles.mainContent}>
          <OrderForm 
            order={editingOrder} 
            onClose={handleModalCancel}
            onUpdate={handleSaveOrder}
          />
        </main>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      {showHeader && <AdminHeader title="Beställningar" subtitle="Hantera Köpta produkter i webshopen"/>}
      <main className={styles.mainContent}>
        <SectionContainer title="Hantera beställningar">
          <div className="overflow-x-auto">
            {loading ? (
              <p>Laddar beställningar...</p>
            ) : orders.length === 0 ? (
              <p>Inga beställningar hittades.</p>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Datum</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kund</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produkt</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pris</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Betalning</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Åtgärder</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.order_reference}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(order.created_at)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.customer_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.product?.title || 'Unknown'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.total_price} {order.currency}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusToggle
                          currentValue={order.status}
                          option1={{
                            value: 'confirmed',
                            label: 'Bekräftad',
                            color: 'blue'
                          }}
                          option2={{
                            value: 'completed',
                            label: 'Genomförd',
                            color: 'green'
                          }}
                          onChange={(newStatus) => handleUpdateOrderStatus(order.id, newStatus)}
                          loading={updatingOrders[order.id]}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusToggle
                          currentValue={order.payment_status.toUpperCase()}
                          option1={{
                            value: 'CREATED',
                            label: 'Ej betald',
                            color: 'yellow'
                          }}
                          option2={{
                            value: 'PAID',
                            label: 'Betald',
                            color: 'green'
                          }}
                          onChange={(newPaymentStatus) => handleUpdatePaymentStatus(order.id, newPaymentStatus)}
                          loading={updatingOrders[`${order.id}-payment`]}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <button
                          onClick={() => handleEditOrder(order)}
                          className="text-indigo-600 hover:text-indigo-900 mr-4"
                        >
                          Visa/Redigera
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
            )}
          </div>
        </SectionContainer>
      </main>
    </div>
  );
};

export default OrderManager; 