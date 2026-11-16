import React, { useState, useEffect, useCallback } from 'react';
import AdminHeader from '../Dashboard/AdminHeader';
import SectionContainer from '../Dashboard/SectionContainer';
import styles from '../../../app/admin/dashboard/courses/courses.module.css';
import OrderForm from './OrderForm';
import StatusToggle from '../common/StatusToggle';
import StandardTable from '../common/StandardTable';
import RowActions from '../common/RowActions';
import ConfirmDialog from '../common/ConfirmDialog';
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
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);

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
        <SectionContainer title="Hantera beställningar" count={orders.length}>
          {loading ? (
            <p>Laddar beställningar...</p>
          ) : (
            <StandardTable
              headers={['Referens', 'Datum', 'Kund', 'Produkt', 'Pris', 'Status', 'Betalning', 'Åtgärder']}
              emptyMessage="Inga beställningar hittades."
            >
              {orders.map((order) => (
                <tr key={order.id} className={styles.tableRow}>
                  <td className={styles.tableCell}>{order.order_reference}</td>
                  <td className={styles.tableCell}>{formatDate(order.created_at)}</td>
                  <td className={styles.tableCell}>{order.customer_name}</td>
                  <td className={styles.tableCell}>{order.product?.title || 'Okänd'}</td>
                  <td className={styles.tableCell}>{order.total_price} {order.currency}</td>
                  <td className={styles.tableCell}>
                    <StatusToggle
                      currentValue={order.status}
                      option1={{ value: 'confirmed', label: 'Bekräftad', color: 'blue' }}
                      option2={{ value: 'completed', label: 'Genomförd', color: 'green' }}
                      onChange={(newStatus) => handleUpdateOrderStatus(order.id, newStatus)}
                      loading={updatingOrders[order.id]}
                    />
                  </td>
                  <td className={styles.tableCell}>
                    <StatusToggle
                      currentValue={order.payment_status.toUpperCase()}
                      option1={{ value: 'CREATED', label: 'Ej betald', color: 'yellow' }}
                      option2={{ value: 'PAID', label: 'Betald', color: 'green' }}
                      onChange={(newPaymentStatus) => handleUpdatePaymentStatus(order.id, newPaymentStatus)}
                      loading={updatingOrders[`${order.id}-payment`]}
                    />
                  </td>
                  <td className={styles.tableCell}>
                    <RowActions
                      onEdit={() => handleEditOrder(order)}
                      editLabel="Visa"
                      items={[{ label: 'Ta bort', danger: true, onClick: () => setOrderToDelete(order.id) }]}
                    />
                  </td>
                </tr>
              ))}
            </StandardTable>
          )}
        </SectionContainer>
        <ConfirmDialog
          open={Boolean(orderToDelete)}
          title="Ta bort beställning"
          message="Vill du ta bort beställningen? Det går inte att ångra."
          onConfirm={() => {
            if (orderToDelete) handleDeleteOrder(orderToDelete);
            setOrderToDelete(null);
          }}
          onCancel={() => setOrderToDelete(null)}
        />
      </main>
    </div>
  );
};

export default OrderManager; 