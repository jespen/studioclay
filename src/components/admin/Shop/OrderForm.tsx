import React, { useState } from 'react';
import { getBrowserSupabaseInstance } from '@/utils/supabase';
import styles from '../../../app/admin/dashboard/courses/courses.module.css';

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

interface OrderFormProps {
  order: ArtOrder;
  onClose: () => void;
  onUpdate: (updatedOrder: ArtOrder) => void;
}

const OrderForm: React.FC<OrderFormProps> = ({ order, onClose, onUpdate }) => {
  const [currentOrder, setCurrentOrder] = useState<ArtOrder>(order);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Formattera datum på ett snyggt sätt
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('sv-SE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCurrentOrder(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await getBrowserSupabaseInstance()
        .from('art_orders')
        .update({
          customer_name: currentOrder.customer_name,
          customer_email: currentOrder.customer_email,
          customer_phone: currentOrder.customer_phone,
          status: currentOrder.status,
          payment_status: currentOrder.payment_status,
        })
        .eq('id', currentOrder.id)
        .select(`
          *,
          product:product_id (
            title,
            image
          )
        `)
        .single();
      
      if (error) {
        throw new Error(`Failed to update order: ${error.message}`);
      }
      
      if (data) {
        setIsEditing(false);
        onUpdate(data as ArtOrder);
      }
    } catch (err: any) {
      console.error('Error updating order:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.formContainer}>
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-medium">
            Beställningsinformation
          </h2>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <button 
                  onClick={() => setIsEditing(false)}
                  type="button"
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded"
                  disabled={loading}
                >
                  Avbryt
                </button>
                <button 
                  onClick={handleSave}
                  type="button"
                  className="px-4 py-2 bg-blue-600 text-white rounded"
                  disabled={loading}
                >
                  {loading ? 'Sparar...' : 'Spara ändringar'}
                </button>
              </>
            ) : (
              <button 
                onClick={() => setIsEditing(true)}
                type="button"
                className="px-4 py-2 bg-blue-600 text-white rounded"
              >
                Redigera
              </button>
            )}
            <button 
              onClick={onClose}
              type="button"
              className="text-gray-400 hover:text-black"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
        
        {error && (
          <div className="bg-red-50 text-red-700 p-3 mb-4 rounded">
            {error}
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Vänster kolumn - Orderinformation */}
          <div>
            <h3 className="text-lg font-medium mb-3">Orderdetaljer</h3>
            <div className="border rounded overflow-hidden">
              <table className="min-w-full">
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <th className="px-4 py-2 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order ID:
                    </th>
                    <td className="px-4 py-2 text-sm">
                      {currentOrder.order_reference}
                    </td>
                  </tr>
                  <tr>
                    <th className="px-4 py-2 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Skapad:
                    </th>
                    <td className="px-4 py-2 text-sm">
                      {formatDate(currentOrder.created_at)}
                    </td>
                  </tr>
                  <tr>
                    <th className="px-4 py-2 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Uppdaterad:
                    </th>
                    <td className="px-4 py-2 text-sm">
                      {formatDate(currentOrder.updated_at)}
                    </td>
                  </tr>
                  <tr>
                    <th className="px-4 py-2 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status:
                    </th>
                    <td className="px-4 py-2 text-sm">
                      {isEditing ? (
                        <select
                          name="status"
                          value={currentOrder.status}
                          onChange={handleChange}
                          className="w-full p-2 border border-gray-300 rounded"
                        >
                          <option value="confirmed">Bekräftad</option>
                          <option value="processing">Behandlas</option>
                          <option value="completed">Genomförd</option>
                          <option value="cancelled">Avbruten</option>
                        </select>
                      ) : (
                        <span className={`inline-block px-2 py-1 rounded ${
                          currentOrder.status === 'completed' ? 'bg-green-100 text-green-800' :
                          currentOrder.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                          currentOrder.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {currentOrder.status === 'confirmed' ? 'Bekräftad' :
                           currentOrder.status === 'processing' ? 'Behandlas' :
                           currentOrder.status === 'completed' ? 'Genomförd' :
                           currentOrder.status === 'cancelled' ? 'Avbruten' :
                           currentOrder.status}
                        </span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <th className="px-4 py-2 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Betalningsstatus:
                    </th>
                    <td className="px-4 py-2 text-sm">
                      {isEditing ? (
                        <select
                          name="payment_status"
                          value={currentOrder.payment_status}
                          onChange={handleChange}
                          className="w-full p-2 border border-gray-300 rounded"
                        >
                          <option value="CREATED">Skapad</option>
                          <option value="PENDING">Väntar</option>
                          <option value="PAID">Betald</option>
                          <option value="ERROR">Fel</option>
                          <option value="CANCELLED">Avbruten</option>
                        </select>
                      ) : (
                        <span className={`inline-block px-2 py-1 rounded ${
                          currentOrder.payment_status === 'PAID' ? 'bg-green-100 text-green-800' :
                          currentOrder.payment_status === 'PENDING' ? 'bg-blue-100 text-blue-800' :
                          currentOrder.payment_status === 'ERROR' ? 'bg-red-100 text-red-800' :
                          currentOrder.payment_status === 'CANCELLED' ? 'bg-gray-100 text-gray-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {currentOrder.payment_status}
                        </span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <th className="px-4 py-2 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Betalningsmetod:
                    </th>
                    <td className="px-4 py-2 text-sm">
                      {currentOrder.payment_method === 'swish' ? 'Swish' :
                       currentOrder.payment_method === 'invoice' ? 'Faktura' :
                       currentOrder.payment_method}
                    </td>
                  </tr>
                  {currentOrder.invoice_number && (
                    <tr>
                      <th className="px-4 py-2 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fakturanummer:
                      </th>
                      <td className="px-4 py-2 text-sm">
                        {currentOrder.invoice_number}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Produktinformation */}
            <h3 className="text-lg font-medium mt-6 mb-3">Produktinformation</h3>
            <div className="bg-gray-50 rounded p-4">
              <div className="flex items-center mb-3">
                {currentOrder.product?.image && (
                  <div className="h-16 w-16 bg-gray-100 mr-3">
                    <img 
                      src={currentOrder.product.image} 
                      alt={currentOrder.product?.title || 'Produkt'}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
                <div>
                  <h4 className="font-medium">
                    {currentOrder.product?.title || 'Okänd produkt'}
                  </h4>
                  <p className="text-sm text-gray-500">
                    Produkt-ID: {currentOrder.product_id}
                  </p>
                </div>
              </div>
              <div className="flex justify-between border-t pt-3">
                <div>
                  <p className="text-sm text-gray-500">Styckpris:</p>
                  <p className="font-medium">{currentOrder.unit_price} {currentOrder.currency}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Antal:</p>
                  <p className="font-medium">1</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Totalpris:</p>
                  <p className="font-medium">{currentOrder.total_price} {currentOrder.currency}</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Höger kolumn - Kundinformation */}
          <div>
            <h3 className="text-lg font-medium mb-3">Kundinformation</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Namn
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    name="customer_name"
                    value={currentOrder.customer_name}
                    onChange={handleChange}
                    className="w-full p-2 border border-gray-300 rounded"
                    required
                  />
                ) : (
                  <p className="p-2 border border-gray-200 rounded bg-gray-50">
                    {currentOrder.customer_name}
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  E-post
                </label>
                {isEditing ? (
                  <input
                    type="email"
                    name="customer_email"
                    value={currentOrder.customer_email}
                    onChange={handleChange}
                    className="w-full p-2 border border-gray-300 rounded"
                    required
                  />
                ) : (
                  <p className="p-2 border border-gray-200 rounded bg-gray-50">
                    {currentOrder.customer_email}
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefon
                </label>
                {isEditing ? (
                  <input
                    type="tel"
                    name="customer_phone"
                    value={currentOrder.customer_phone || ''}
                    onChange={handleChange}
                    className="w-full p-2 border border-gray-300 rounded"
                  />
                ) : (
                  <p className="p-2 border border-gray-200 rounded bg-gray-50">
                    {currentOrder.customer_phone || '-'}
                  </p>
                )}
              </div>
              
              {/* Fler åtgärder / information */}
              <div className="border-t pt-4 mt-6">
                <h4 className="font-medium mb-3">Åtgärder</h4>
                
                {/* Om faktura */}
                {currentOrder.payment_method === 'invoice' && currentOrder.invoice_number && (
                  <button 
                    className="flex items-center px-4 py-2 mb-2 w-full bg-indigo-50 text-indigo-700 rounded hover:bg-indigo-100"
                    onClick={async () => {
                      try {
                        // Använd den befintliga API-endpointen för att hämta faktura
                        const response = await fetch(`/api/invoice/${currentOrder.invoice_number}`);
                        const data = await response.json();
                        
                        if (!data.success) {
                          throw new Error(data.error || 'Failed to load invoice');
                        }
                        
                        // Öppna PDFen i en ny flik
                        const pdfWindow = window.open('', '_blank');
                        if (pdfWindow) {
                          pdfWindow.document.write(`
                            <html>
                              <head>
                                <title>Faktura ${currentOrder.invoice_number}</title>
                              </head>
                              <body style="margin:0;padding:0;">
                                <iframe 
                                  src="data:application/pdf;base64,${data.pdf}" 
                                  width="100%" 
                                  height="100%" 
                                  style="border:none;position:absolute;top:0;left:0;right:0;bottom:0;"
                                ></iframe>
                              </body>
                            </html>
                          `);
                        }
                      } catch (error) {
                        console.error('Error fetching invoice:', error);
                        alert('Kunde inte ladda fakturan. Försök igen senare.');
                      }
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Visa faktura
                  </button>
                )}
                
                {/* Skicka ett mejl */}
                <button 
                  className="flex items-center px-4 py-2 mb-2 w-full bg-green-50 text-green-700 rounded hover:bg-green-100"
                  onClick={() => {
                    window.location.href = `mailto:${currentOrder.customer_email}?subject=Din beställning ${currentOrder.order_reference}`;
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Kontakta kund
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderForm; 