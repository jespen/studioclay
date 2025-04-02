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
  invoice_number?: string;
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
      
      console.log(`Handling PDF for gift card: ${card.id}`);
      
      // Försök först att direkt hämta presentkorts-PDF:en baserat på presentkortskoden
      if (card.code) {
        const bucketName = 'giftcards';
        const fileName = `gift-card-${card.code}.pdf`;
        const directPdfUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucketName}/${fileName}`;
        
        console.log(`Trying to access gift card PDF directly at: ${directPdfUrl}`);
        
        try {
          // Kontrollera om PDF:en finns tillgänglig med HEAD-förfrågan
          const checkResponse = await fetch(directPdfUrl, { method: 'HEAD' });
          
          if (checkResponse.ok) {
            console.log('Gift card PDF found, opening directly');
            // Öppna PDF:en direkt i ny flik
            window.open(directPdfUrl, '_blank');
            return; // Avsluta funktionen här om PDF:en hittades
          } else {
            console.log('Gift card PDF not found via direct access, trying API');
          }
        } catch (directError) {
          console.error('Error checking direct PDF access:', directError);
          // Fortsätt till API-metoden om direkt åtkomst misslyckades
        }
      }
      
      // Generera presentkorts-PDF via API
      try {
        console.log(`Generating gift card PDF for card: ${card.id}`);
        const response = await fetch('/api/gift-card/generate-pdf', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ id: card.id }),
        });
        
        const data = await response.json();
        
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to generate gift card PDF');
        }
        
        // Open the PDF in a new tab
        const pdfWindow = window.open('', '_blank');
        if (pdfWindow) {
          pdfWindow.document.write(`
            <html>
              <head>
                <title>Presentkort ${card.code}</title>
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
        
        console.log('Gift card PDF displayed successfully, URL:', data.pdfUrl);
        return; // Avsluta funktionen här om API-metoden lyckades
      } catch (apiError) {
        console.error('Error generating gift card PDF via API:', apiError);
        // Visa tydligt felmeddelande istället för fallback till faktura
        alert('Kunde inte generera eller visa presentkortets PDF: ' + 
          (apiError instanceof Error ? apiError.message : 'Okänt fel'));
      }
      
    } catch (error) {
      console.error('Error handling PDF:', error);
      alert('Det gick inte att hantera PDF: ' + (error instanceof Error ? error.message : 'Okänt fel'));
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

  async function handleUpdateRemainingBalance(id: string, newBalance: number) {
    setUpdatingCards(prev => ({ ...prev, [id]: true }));
    
    try {
      const card = giftCards.find(card => card.id === id);
      if (!card) {
        throw new Error('Presentkortet kunde inte hittas');
      }
      
      // Validate input
      if (isNaN(newBalance)) {
        throw new Error('Ogiltigt belopp. Vänligen ange ett nummer.');
      }
      
      if (newBalance < 0) {
        throw new Error('Saldot kan inte vara negativt');
      }
      
      if (newBalance > card.amount) {
        throw new Error(`Saldot kan inte överstiga ursprungsbeloppet på ${card.amount} kr`);
      }
      
      console.log(`Updating gift card ${id} remaining balance to ${newBalance}`);
      
      const response = await fetch(`/api/gift-cards/update-balance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, remaining_balance: newBalance }),
      });
      
      // Handle non-OK responses
      if (!response.ok) {
        // Try to get a detailed error message from the response
        try {
          const errorData = await response.json();
          throw new Error(errorData.error || `Serverfel: ${response.status}`);
        } catch (jsonError) {
          // If we can't parse the JSON, use a generic message
          throw new Error(`Kunde inte uppdatera saldo. Serverfel: ${response.status}`);
        }
      }
      
      // Get the response data
      const data = await response.json();
      
      // Update locally with the new balance
      setGiftCards(giftCards.map(card => 
        card.id === id ? { ...card, remaining_balance: newBalance } : card
      ));
      
      console.log(`Successfully updated gift card ${id} remaining balance to ${newBalance}`);
      
      // If the remaining balance is 0, also update the card status locally
      if (newBalance === 0) {
        setGiftCards(prevCards =>
          prevCards.map(card => 
            card.id === id ? { ...card, status: 'redeemed' as const } : card
          )
        );
      }
      
    } catch (err) {
      console.error('Error updating remaining balance:', err);
      alert('Ett fel inträffade: ' + (err instanceof Error ? err.message : 'Okänt fel'));
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
                onUpdateBalance={handleUpdateRemainingBalance}
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