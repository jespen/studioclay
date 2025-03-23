import React, { useState, useEffect } from 'react';
import styles from '../../../app/admin/dashboard/courses/courses.module.css';
import GiftCardTable from './GiftCardTable';
import { Box, Paper, Typography, Button, CircularProgress } from '@mui/material';
import SectionContainer from '../Dashboard/SectionContainer';

interface GiftCard {
  id: string;
  code: string;
  amount: number;
  type: 'digital' | 'physical';
  status: 'active' | 'redeemed' | 'expired' | 'cancelled';
  remaining_balance: number;
  sender_name: string;
  sender_email: string;
  recipient_name: string;
  recipient_email: string | null;
  message: string | null;
  is_emailed: boolean;
  is_printed: boolean;
  is_paid: boolean;
  created_at: string;
  expires_at: string;
}

const GiftCardManager: React.FC = () => {
  const [giftCards, setGiftCards] = useState<GiftCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, active, redeemed, expired, digital, physical, paid, unpaid
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCardData, setNewCardData] = useState({
    type: 'digital',
    amount: '500',
    sender_name: '',
    sender_email: '',
    recipient_name: '',
    recipient_email: '',
    message: ''
  });
  const [newCardIsPaid, setNewCardIsPaid] = useState(false);
  const [updatingCards, setUpdatingCards] = useState<{ [key: string]: boolean }>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchGiftCards();
  }, [filter]);

  async function fetchGiftCards() {
    setLoading(true);
    setError(null);

    try {
      console.log('Fetching gift cards with filter:', filter);
      
      // Build the query parameters based on the filter
      const queryParams = new URLSearchParams();
      if (filter !== 'all') {
        queryParams.append('filter', filter);
      }
      
      // Fetch gift cards from API instead of direct database access
      const response = await fetch(`/api/gift-cards?${queryParams.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch gift cards: ${response.status}`);
      }
      
      const data = await response.json();
      
      setGiftCards(data.giftCards || []);
      console.log('Gift cards loaded:', data.giftCards?.length || 0, 'cards');
      
    } catch (err) {
      console.error('Error fetching gift cards:', err);
      setError(err instanceof Error ? err.message : 'Ett oväntat fel inträffade');
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkAsEmailed(id: string) {
    try {
      const response = await fetch(`/api/gift-cards/${id}/email-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_emailed: true }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update email status');
      }
      
      // Update the local state
      setGiftCards(giftCards.map(card =>
        card.id === id ? { ...card, is_emailed: true } : card
      ));
    } catch (error) {
      console.error('Error updating email status:', error);
      alert('Det gick inte att uppdatera presentkortet: ' + 
        (error instanceof Error ? error.message : 'Ett oväntat fel inträffade'));
    }
  }

  async function handleMarkAsPrinted(id: string) {
    try {
      const response = await fetch(`/api/gift-cards/${id}/print-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_printed: true }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update print status');
      }
      
      // Update the local state
      setGiftCards(giftCards.map(card =>
        card.id === id ? { ...card, is_printed: true } : card
      ));
    } catch (error) {
      console.error('Error updating print status:', error);
      alert('Det gick inte att uppdatera presentkortet: ' + 
        (error instanceof Error ? error.message : 'Ett oväntat fel inträffade'));
    }
  }

  async function handleChangeStatus(id: string, status: GiftCard['status']) {
    try {
      console.log(`Attempting to update gift card ${id} status to ${status}`);
      
      // Set loading state for this specific card
      setUpdatingCards(prev => ({ ...prev, [id]: true }));
      
      const response = await fetch(`/api/gift-cards/update-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, status }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update status');
      }
      
      const data = await response.json();
      console.log(`Update operation completed successfully`, data);
      
      if (data.data) {
        // Update the local state with the returned data
        setGiftCards(prevCards =>
          prevCards.map(card => (card.id === id ? data.data : card))
        );
        
        console.log(`Local state updated for card ${id}, status: ${status}`);
        
        // Success - notify the user
        alert(`Presentkort ${id} status uppdaterad till: ${status}`);
      } else {
        console.warn('API returned success but no data');
        // Still update the local state optimistically
        setGiftCards(prevCards =>
          prevCards.map(card => (card.id === id ? { ...card, status } : card))
        );
      }
      
    } catch (err) {
      console.error('Unexpected error updating status:', err);
      alert('Ett oväntat fel inträffade när status skulle uppdateras.');
    } finally {
      setUpdatingCards(prev => ({ ...prev, [id]: false }));
    }
  }

  async function generateGiftCardPDF(card: GiftCard) {
    try {
      // Show loading state
      setUpdatingCards(prev => ({ ...prev, [card.id]: true }));
      
      console.log(`Generating PDF for gift card: ${card.id}`);
      
      // Dynamically import jsPDF (to avoid SSR issues)
      const { default: jsPDF } = await import('jspdf');
      
      // Create a new PDF document
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      
      // Set up some dimensions
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);
      
      // Add title
      doc.setFontSize(24);
      doc.text('STUDIO CLAY', pageWidth / 2, 30, { align: 'center' });
      
      doc.setFontSize(18);
      doc.text('PRESENTKORT', pageWidth / 2, 40, { align: 'center' });
      
      // Add a decorative border
      doc.rect(margin, 50, contentWidth, pageHeight - 100);
      
      // Gift card details
      doc.setFontSize(14);
      doc.text(`Kod: ${card.code}`, margin + 5, 60);
      
      doc.setFontSize(16);
      doc.text(`Värde: ${card.amount} SEK`, margin + 5, 70);
      
      // Recipient and sender info
      doc.setFontSize(12);
      doc.text(`Till: ${card.recipient_name}`, margin + 5, 85);
      doc.text(`Från: ${card.sender_name}`, margin + 5, 95);
      
      // Expiration date
      const expiryDate = new Date(card.expires_at).toLocaleDateString('sv-SE');
      doc.text(`Giltigt till: ${expiryDate}`, margin + 5, 105);
      
      // Add message if available
      if (card.message) {
        doc.text('Meddelande:', margin + 5, 120);
        
        // Split long messages into multiple lines
        const messageLines = doc.splitTextToSize(card.message, contentWidth - 10);
        doc.text(messageLines, margin + 5, 130);
      }
      
      // Footer with terms
      const footerY = pageHeight - 35;
      doc.setFontSize(10);
      doc.text('Villkor:', margin + 5, footerY);
      
      doc.setFontSize(8);
      const terms = 'Detta presentkort kan användas för alla tjänster hos Studio Clay. Presentkortet kan inte bytas mot kontanter och är giltigt till och med det angivna utgångsdatumet.';
      const termsLines = doc.splitTextToSize(terms, contentWidth - 10);
      doc.text(termsLines, margin + 5, footerY + 5);
      
      // Save the PDF and trigger download
      doc.save(`presentkort-${card.code}.pdf`);
      
      console.log('PDF generation completed successfully');
      alert('PDF-generering slutförd!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Det gick inte att generera PDF: ' + (error instanceof Error ? error.message : 'Okänt fel'));
    } finally {
      // Hide loading state
      setUpdatingCards(prev => ({ ...prev, [card.id]: false }));
    }
  }

  function sendGiftCardEmail(card: GiftCard) {
    // In a real implementation, this would send an email
    // For now, we'll just alert that this feature is coming soon
    alert(`E-postutskick för presentkort ${card.code} kommer snart!`);
  }

  // Format date helper function
  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString('sv-SE'); // Swedish format: YYYY-MM-DD
  }

  const handleNewCardInput = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewCardData({
      ...newCardData,
      [name]: value,
    });
  };

  async function handleTogglePaymentStatus(id: string, isPaid: boolean) {
    setUpdatingCards(prev => ({ ...prev, [id]: true }));
    
    try {
      // Need to pass the OPPOSITE of the current status to toggle it
      const newStatus = !isPaid;
      
      console.log(`Updating gift card ${id} payment status from ${isPaid ? 'PAID' : 'CREATED'} to ${newStatus ? 'PAID' : 'CREATED'}`);
      
      const response = await fetch(`/api/gift-cards/update-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, isPaid: newStatus }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update payment status');
      }
      
      // Update locally with the new status
      setGiftCards(giftCards.map(card => 
        card.id === id ? { ...card, is_paid: newStatus } : card
      ));
      console.log(`Successfully updated gift card ${id} payment status to ${newStatus ? 'PAID' : 'CREATED'}`);
      
    } catch (err) {
      console.error('Error in togglePayment:', err);
      alert('An unexpected error occurred');
    } finally {
      setUpdatingCards(prev => ({ ...prev, [id]: false }));
    }
  }

  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const amountValue = parseFloat(newCardData.amount);
      
      if (isNaN(amountValue) || amountValue <= 0) {
        throw new Error('Vänligen ange ett giltigt belopp');
      }
      
      console.log('Creating new gift card with data:', newCardData);
      
      // Create the gift card via API
      const response = await fetch(`/api/gift-cards/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newCardData,
          amount: amountValue,
          is_paid: newCardIsPaid
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create gift card');
      }
      
      alert(`Presentkort skapat! Uppdatera listan för att se det nya presentkortet.`);
      setIsModalOpen(false);
      
      // Reset form
      setNewCardData({
        type: 'digital',
        amount: '500',
        sender_name: '',
        sender_email: '',
        recipient_name: '',
        recipient_email: '',
        message: ''
      });
      setNewCardIsPaid(false); // Reset payment status
      
      // Refresh gift cards list
      fetchGiftCards();
      
    } catch (error) {
      console.error('Error creating gift card:', error);
      alert('Det gick inte att skapa presentkortet: ' + 
        (error instanceof Error ? error.message : 'Ett oväntat fel inträffade'));
    } finally {
      setLoading(false);
    }
  };

  // Get filter description for UI feedback
  const getFilterDescription = () => {
    switch(filter) {
      case 'all': return 'Visar alla presentkort';
      case 'active': return 'Visar aktiva presentkort';
      case 'redeemed': return 'Visar inlösta presentkort';
      case 'expired': return 'Visar utgångna presentkort';
      case 'cancelled': return 'Visar avbrutna presentkort';
      case 'digital': return 'Visar digitala presentkort';
      case 'physical': return 'Visar fysiska presentkort';
      case 'PAID': return 'Visar betalda presentkort';
      case 'CREATED': return 'Visar ej betalda presentkort';
      default: return '';
    }
  };

  return (
    <>
      {error && (
        <div className="error-message">{error}</div>
      )}

      {loading ? (
        <div>Laddar presentkort...</div>
      ) : (
        <>
          <div className={styles.navButtons} style={{ marginBottom: '1rem' }}>
            <button onClick={() => setIsModalOpen(true)} className={styles.addButton}>
              Lägg till presentkort
            </button>
          </div>

          <SectionContainer title="Presentkort">
            <div className={styles.filterContainer} style={{ margin: '1rem' }}>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className={styles.statusSelect}
                aria-label="Filtrera presentkort"
              >
                <option value="all">Alla Presentkort</option>
                <option value="active">Aktiva</option>
                <option value="redeemed">Inlösta</option>
                <option value="expired">Utgångna</option>
                <option value="cancelled">Avbrutna</option>
                <option value="digital">Digitala</option>
                <option value="physical">Fysiska</option>
                <option value="PAID">Betalda</option>
                <option value="CREATED">Ej betalda</option>
              </select>
              
              <button
                onClick={fetchGiftCards}
                className={styles.publishButton}
                title="Uppdatera listan med presentkort"
              >
                <span>Uppdatera</span>
              </button>
              
              {getFilterDescription() && (
                <span className={styles.filterDescription}>
                  {getFilterDescription()} ({giftCards.length})
                </span>
              )}
            </div>

            {giftCards.length === 0 ? (
              <div className={styles.emptyState}>
                <p>Inga presentkort hittades</p>
                <p className={styles.emptyStateSubtext}>Presentkorten som har köpts via hemsidan visas här.</p>
              </div>
            ) : (
              <GiftCardTable 
                giftCards={giftCards}
                updatingCards={updatingCards}
                onStatusChange={handleChangeStatus}
                onTogglePayment={handleTogglePaymentStatus}
                onGeneratePDF={generateGiftCardPDF}
                onSendEmail={sendGiftCardEmail}
                onMarkAsEmailed={handleMarkAsEmailed}
                onMarkAsPrinted={handleMarkAsPrinted}
              />
            )}
          </SectionContainer>
        </>
      )}
      
      {/* Modal for adding new gift card */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>Lägg till nytt presentkort</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className={styles.modalCloseButton}
              >
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              <form onSubmit={handleCreateCard}>
                <div className={styles.formGroup}>
                  <label htmlFor="type">Typ av presentkort</label>
                  <select
                    id="type"
                    name="type"
                    value={newCardData.type}
                    onChange={handleNewCardInput}
                    required
                    className={styles.formControl}
                  >
                    <option value="digital">Digitalt Presentkort</option>
                    <option value="physical">Fysiskt Presentkort</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="amount">Belopp (SEK)</label>
                  <input
                    type="number"
                    id="amount"
                    name="amount"
                    value={newCardData.amount}
                    onChange={handleNewCardInput}
                    required
                    min="1"
                    step="1"
                    className={styles.formControl}
                    placeholder="t.ex. 500"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Betalningsstatus</label>
                  <div className={styles.paymentToggle}>
                    <button
                      type="button"
                      onClick={() => setNewCardIsPaid(!newCardIsPaid)}
                      className={`${styles.actionButton} ${newCardIsPaid ? styles.paidButton : styles.unpaidButton}`}
                      style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                    >
                      {newCardIsPaid ? 'Betald ✓' : 'Ej betald ✗'}
                    </button>
                    <span className={styles.smallText} style={{ marginLeft: '0.5rem' }}>
                      {newCardIsPaid ? 'Presentkortet markeras som betalt' : 'Presentkortet markeras som ej betalt'}
                    </span>
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label htmlFor="sender_name">Köparens namn</label>
                    <input
                      type="text"
                      id="sender_name"
                      name="sender_name"
                      value={newCardData.sender_name}
                      onChange={handleNewCardInput}
                      required
                      className={styles.formControl}
                      placeholder="Köparens fullständiga namn"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="sender_email">Köparens e-post</label>
                    <input
                      type="email"
                      id="sender_email"
                      name="sender_email"
                      value={newCardData.sender_email}
                      onChange={handleNewCardInput}
                      required
                      className={styles.formControl}
                      placeholder="kopare@exempel.se"
                    />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label htmlFor="recipient_name">Mottagarens namn</label>
                    <input
                      type="text"
                      id="recipient_name"
                      name="recipient_name"
                      value={newCardData.recipient_name}
                      onChange={handleNewCardInput}
                      required
                      className={styles.formControl}
                      placeholder="Mottagarens fullständiga namn"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="recipient_email">Mottagarens e-post</label>
                    <input
                      type="email"
                      id="recipient_email"
                      name="recipient_email"
                      value={newCardData.recipient_email}
                      onChange={handleNewCardInput}
                      required={newCardData.type === 'digital'}
                      className={styles.formControl}
                      placeholder="mottagare@exempel.se"
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="message">Personligt meddelande</label>
                  <textarea
                    id="message"
                    name="message"
                    value={newCardData.message}
                    onChange={handleNewCardInput}
                    className={styles.formControl}
                    rows={3}
                    placeholder="Valfritt personligt meddelande till mottagaren..."
                  ></textarea>
                </div>

                <div className={styles.modalFooter}>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className={styles.cancelButton}
                  >
                    Avbryt
                  </button>
                  <button
                    type="submit"
                    className={styles.saveButton}
                  >
                    Skapa presentkort
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GiftCardManager; 