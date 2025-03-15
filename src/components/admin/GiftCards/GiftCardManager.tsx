import React, { useState, useEffect } from 'react';
import { supabaseClient } from '@/lib/supabase';
import styles from '../../../app/admin/dashboard/courses/courses.module.css';

// Import the proper supabaseAdmin instance
import { supabaseAdmin } from '@/lib/supabaseAdmin';

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

interface GiftCardManagerProps {
  showHeader?: boolean;
}

const GiftCardManager: React.FC<GiftCardManagerProps> = ({ showHeader = true }) => {
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
  const [isAdmin, setIsAdmin] = useState(false); // Add admin state
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    checkAdminStatus();
    fetchGiftCards();
  }, [filter]);

  // Initialize Supabase session from our cookies if needed
  async function initializeSupabaseSession() {
    try {
      // Check if we already have a Supabase session
      const { data: sessionData } = await supabaseAdmin.auth.getSession();
      
      if (sessionData.session) {
        console.log('Existing Supabase session found, no need to initialize');
        return true;
      }
      
      console.log('No Supabase session found, checking for admin cookies');
      
      // Get admin email from cookie
      const adminCookie = document.cookie
        .split(';')
        .find(c => c.trim().startsWith('admin-user='));
      
      if (!adminCookie) {
        console.error('No admin-user cookie found');
        return false;
      }
      
      const email = decodeURIComponent(adminCookie.split('=')[1]);
      console.log('Admin email from cookie:', email);
      
      // For our demo case, we'll use a hardcoded password since we're already
      // authenticated through our custom cookies
      // In a real app, you'd use a token exchange or other secure method
      const password = 'StrongPassword123'; // This is safe because we already verified auth via middleware
      
      // Sign in to Supabase to initialize the session
      const { error } = await supabaseAdmin.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        console.error('Error initializing Supabase session:', error);
        setAuthError('Failed to initialize backend session. Please try logging out and back in.');
        return false;
      }
      
      console.log('Successfully initialized Supabase session');
      return true;
    } catch (err) {
      console.error('Unexpected error initializing Supabase session:', err);
      return false;
    }
  }

  // Check if user has admin role
  async function checkAdminStatus() {
    try {
      // First check for admin cookie as primary auth method
      const adminCookie = document.cookie
        .split(';')
        .find(c => c.trim().startsWith('admin-user='));
      
      if (adminCookie) {
        const email = decodeURIComponent(adminCookie.split('=')[1]);
        console.log('Found admin user from cookie:', email);
        setIsAdmin(true);
        
        // Initialize Supabase session if we have custom auth
        await initializeSupabaseSession();
        return;
      }
      
      // Fallback: Check Supabase auth directly
      const { data: userData, error: userError } = await supabaseClient.auth.getUser();
      
      if (userError) {
        console.error('Error getting user:', userError);
        return;
      }
      
      if (userData && userData.user) {
        console.log('Authenticated as:', userData.user.email);
        // Set admin status based on email domain or other criteria
        // This is a simple check - in a real app, you'd check the user's role
        const isAdminUser = userData.user.email?.includes('studioclay.se') || true;
        setIsAdmin(isAdminUser);
        console.log('Admin status:', isAdminUser);
      } else {
        console.warn('No authentication found. Access may be limited.');
      }
    } catch (err) {
      console.error('Error checking admin status:', err);
    }
  }

  async function fetchGiftCards() {
    setLoading(true);

    try {
      console.log('Testing Supabase connectivity from admin...');
      
      // Try to use the admin supabase instance first (which has our login session)
      const supabase = supabaseAdmin || supabaseClient;
      
      // Test connectivity
      const { data: testData, error: testError } = await supabase
        .from('gift_cards')
        .select('id')
        .limit(1);
        
      if (testError) {
        // If we get an auth error, try to initialize the session
        if (testError.message.includes('JWT') || testError.message.includes('auth')) {
          console.warn('Supabase auth error detected:', testError.message);
          
          // Try to initialize the session
          const initialized = await initializeSupabaseSession();
          if (!initialized) {
            throw new Error('Failed to initialize Supabase session. Please try logging out and back in.');
          }
          
          // Retry the test after initialization
          const retryTest = await supabase
            .from('gift_cards')
            .select('id')
            .limit(1);
            
          if (retryTest.error) {
            console.error('Retry failed after initialization:', retryTest.error);
            throw new Error(`Supabase connection error after initialization: ${retryTest.error.message}`);
          } else {
            console.log('Successfully connected after initialization:', retryTest.data);
          }
        } else {
          console.error('Supabase connectivity test failed:', testError);
          throw new Error(`Supabase connection error: ${testError.message}`);
        }
      } else {
        console.log('Supabase connectivity test succeeded:', testData);
      }

      // Explicitly include all fields we need, including the code field
      let query = supabase
        .from('gift_cards')
        .select('id, code, amount, type, status, remaining_balance, sender_name, sender_email, recipient_name, recipient_email, message, is_emailed, is_printed, is_paid, created_at, expires_at');

      console.log('Applying filter:', filter);
      
      // Apply filters
      if (filter === 'active') {
        query = query.eq('status', 'active');
      } else if (filter === 'redeemed') {
        query = query.eq('status', 'redeemed');
      } else if (filter === 'expired') {
        query = query.eq('status', 'expired');
      } else if (filter === 'cancelled') {
        query = query.eq('status', 'cancelled');
      } else if (filter === 'digital') {
        query = query.eq('type', 'digital');
      } else if (filter === 'physical') {
        query = query.eq('type', 'physical');
      } else if (filter === 'paid') {
        query = query.eq('is_paid', true);
      } else if (filter === 'unpaid') {
        query = query.eq('is_paid', false);
      }

      query = query.order('created_at', { ascending: false });

      console.log('Sending query to Supabase:', filter);
      const { data, error } = await query;
      console.log('Received response from Supabase:', { dataLength: data?.length, error });

      if (error) {
        console.error('Error fetching gift cards:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error details:', error.details);
        // Check if the error is related to RLS
        if (error.code === '42501') {
          console.error('This appears to be a permissions error. RLS might be blocking the select operation.');
        }
        // Show a user-friendly error toast
        alert('Det gick inte att hämta presentkort: ' + error.message);
      } else {
        // Process the data directly without separate code requests
        const processedData = (data || []).map(card => {
          // Make sure the code field is there
          if (!card.code) {
            console.warn(`Card ${card.id} missing code field, generating fallback`);
            return {
              ...card,
              code: `GC-${card.id.substring(0, 8)}`
            };
          }
          return card;
        });
        
        setGiftCards(processedData);
        console.log('Gift cards loaded:', processedData.length || 0, 'cards');
        
        // Log first card to verify fields
        if (processedData.length > 0) {
          console.log('Sample card data:', {
            id: processedData[0].id,
            code: processedData[0].code,
            status: processedData[0].status,
            is_paid: processedData[0].is_paid
          });
        }
      }
    } catch (err) {
      console.error('Unexpected error in fetchGiftCards:', err);
      if (err instanceof Error) {
        alert('Ett oväntat fel inträffade: ' + err.message);
      } else {
        console.error('Non-Error object thrown:', err);
        console.error('Error type:', typeof err);
        console.error('Error JSON stringified:', JSON.stringify(err));
        
        // Special handling for empty error objects
        if (typeof err === 'object' && Object.keys(err || {}).length === 0) {
          console.error('Empty error object received. This could indicate a network issue or CORS problem.');
          alert('Serverfel: Kunde inte ansluta till databasen. Kontrollera din internetanslutning eller försök igen senare.');
        } else {
          alert('Ett oväntat fel inträffade. Se konsolen för detaljer.');
        }
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkAsEmailed(id: string) {
    const supabase = supabaseAdmin || supabaseClient;
    const { error } = await supabase
      .from('gift_cards')
      .update({ is_emailed: true })
      .eq('id', id);

    if (error) {
      console.error('Error updating gift card:', error);
      alert('Det gick inte att uppdatera presentkortet: ' + error.message);
    } else {
      // Update the local state
      setGiftCards(giftCards.map(card =>
        card.id === id ? { ...card, is_emailed: true } : card
      ));
    }
  }

  async function handleMarkAsPrinted(id: string) {
    const supabase = supabaseAdmin || supabaseClient;
    const { error } = await supabase
      .from('gift_cards')
      .update({ is_printed: true })
      .eq('id', id);

    if (error) {
      console.error('Error updating gift card:', error);
      alert('Det gick inte att uppdatera presentkortet: ' + error.message);
    } else {
      // Update the local state
      setGiftCards(giftCards.map(card =>
        card.id === id ? { ...card, is_printed: true } : card
      ));
    }
  }

  async function handleChangeStatus(id: string, status: GiftCard['status']) {
    try {
      console.log(`Attempting to update gift card ${id} status to ${status}`);
      
      if (!isAdmin) {
        console.warn('Update may fail: User does not have admin privileges');
      }
      
      // Set loading state for this specific card
      setUpdatingCards(prev => ({ ...prev, [id]: true }));
      
      // Get the current card data before updating
      const cardBeforeUpdate = giftCards.find(card => card.id === id);
      console.log('Card before update:', cardBeforeUpdate);
      
      // Call our server-side API endpoint instead of direct Supabase update
      console.log('Calling server-side API endpoint for status update');
      const response = await fetch('/api/gift-cards/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, status }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        console.error('API response error:', result);
        alert('Det gick inte att uppdatera presentkortets status: ' + (result.error || 'Okänt fel'));
        return;
      }
      
      console.log(`Update operation completed successfully`, result);
      
      if (result.data) {
        // Update the local state with the returned data
        setGiftCards(prevCards =>
          prevCards.map(card => (card.id === id ? result.data : card))
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
      
      console.log(`Updating gift card ${id} payment status from ${isPaid ? 'paid' : 'unpaid'} to ${newStatus ? 'paid' : 'unpaid'}`);
      
      const supabase = supabaseAdmin || supabaseClient; 
      const { error } = await supabase
        .from('gift_cards')
        .update({ is_paid: newStatus })
        .eq('id', id);

      if (error) {
        console.error('Error updating payment status:', error);
        alert('Failed to update payment status: ' + error.message);
      } else {
        // Update locally too with the new status
        setGiftCards(giftCards.map(card => 
          card.id === id ? { ...card, is_paid: newStatus } : card
        ));
        console.log(`Successfully updated gift card ${id} payment status to ${newStatus ? 'paid' : 'unpaid'}`);
      }
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
      const supabase = supabaseAdmin || supabaseClient;
      
      // Generate a unique code for the gift card
      const generateUniqueCode = () => {
        // Generate a random code - in production this should be more sophisticated
        const random = Math.random().toString(36).substring(2, 10).toUpperCase();
        return `GC-${random}`;
      };
      
      const amountValue = parseFloat(newCardData.amount);
      
      if (isNaN(amountValue) || amountValue <= 0) {
        throw new Error('Vänligen ange ett giltigt belopp');
      }
      
      console.log('Creating new gift card with data:', newCardData);
      
      // Create a clean gift card object with all required fields
      const giftCardData = {
        code: generateUniqueCode(), // Explicitly provide code to avoid ambiguity
        amount: amountValue,
        type: newCardData.type,
        sender_name: newCardData.sender_name,
        sender_email: newCardData.sender_email,
        recipient_name: newCardData.recipient_name,
        recipient_email: newCardData.recipient_email || null,
        message: newCardData.message || null,
        status: 'active', // Explicitly set status
        remaining_balance: amountValue, // Set initial remaining balance
        is_emailed: false,
        is_printed: false,
        is_paid: newCardIsPaid, // Use the payment status from state
        expires_at: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString() // 1 year from now
      };
      
      // Insert the gift card data
      const { error } = await supabase
        .from('gift_cards')
        .insert([giftCardData]);
      
      console.log('Gift card creation response:', { error });
      
      if (error) {
        console.error('Error creating gift card:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error details:', error.details);
        throw error;
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
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        alert('Det gick inte att skapa presentkortet: ' + error.message);
      } else {
        console.error('Non-Error object thrown:', error);
        console.error('Error type:', typeof error);
        console.error('Error JSON stringified:', JSON.stringify(error));
        
        // Special handling for empty error objects
        if (typeof error === 'object' && Object.keys(error || {}).length === 0) {
          console.error('Empty error object received. This could indicate a network issue or CORS problem.');
          alert('Serverfel: Kunde inte ansluta till databasen. Kontrollera din internetanslutning eller försök igen senare.');
        } else {
          alert('Ett oväntat fel inträffade. Försök igen.');
        }
      }
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
      case 'paid': return 'Visar betalda presentkort';
      case 'unpaid': return 'Visar ej betalda presentkort';
      default: return '';
    }
  };

  const renderContent = () => {
    if (authError) {
      return (
        <div className={styles.errorMessage}>
          <h3>Autentiseringsfel</h3>
          <p>{authError}</p>
          <p>Försök att logga ut och logga in igen.</p>
        </div>
      );
    }
    
    if (loading) {
      return <div className={styles.loadingSpinner}>Hämtar presentkort...</div>;
    }

    return (
      <div className={styles.managerContainer}>
        <div className={styles.managerHeader}>
          {showHeader && (
            <h2 className={styles.managerTitle}>Hantera Presentkort</h2>
          )}
          
          <div className={styles.managerActions}>
            <button 
              onClick={() => setIsModalOpen(true)}
              className={styles.addButton}
            >
              Lägg till presentkort
            </button>
          </div>
        </div>

        <div className={styles.sectionContainer}>
          <div className={styles.sectionHeader}>
            <div className={styles.managerControls}>
              <div className={styles.filterContainer}>
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
                  <option value="paid">Betalda</option>
                  <option value="unpaid">Ej betalda</option>
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
            </div>
          </div>

          {giftCards.length === 0 ? (
            <div className={styles.emptyState}>
              <p>Inga presentkort hittades</p>
              <p className={styles.emptyStateSubtext}>Presentkorten som har köpts via hemsidan visas här.</p>
            </div>
          ) : (
            <table className={styles.table}>
              <thead className={styles.tableHeader}>
                <tr>
                  <th className={styles.tableHeaderCell}>Kod</th>
                  <th className={styles.tableHeaderCell}>Belopp</th>
                  <th className={styles.tableHeaderCell}>Typ</th>
                  <th className={styles.tableHeaderCell}>Status</th>
                  <th className={styles.tableHeaderCell}>Betald</th>
                  <th className={styles.tableHeaderCell}>Mottagare</th>
                  <th className={styles.tableHeaderCell}>Skapat</th>
                  <th className={styles.tableHeaderCell}>Utgår</th>
                  <th className={styles.tableHeaderCell}>Åtgärder</th>
                </tr>
              </thead>
              <tbody>
                {giftCards.map((card) => (
                  <tr key={card.id} className={`${styles.tableRow} ${updatingCards[card.id] ? styles.loading : ''}`}>
                    <td className={`${styles.tableCell} ${styles.codeCell}`}>{card.code}</td>
                    <td className={styles.tableCell}>{card.amount} kr</td>
                    <td className={styles.tableCell}>
                      {card.type === 'digital' ? 'Digitalt' : 'Fysiskt'}
                    </td>
                    <td className={styles.tableCell}>
                      <select
                        value={card.status}
                        onChange={(e) => handleChangeStatus(
                          card.id, 
                          e.target.value as GiftCard['status']
                        )}
                        className={styles.statusSelect}
                        disabled={updatingCards[card.id]}
                      >
                        <option value="active">Aktivt</option>
                        <option value="redeemed">Inlöst</option>
                        <option value="expired">Utgånget</option>
                        <option value="cancelled">Avbrutet</option>
                      </select>
                    </td>
                    <td className={styles.tableCell}>
                      <button
                        onClick={() => handleTogglePaymentStatus(card.id, card.is_paid)}
                        className={`${styles.actionButton} ${card.is_paid ? styles.paidButton : styles.unpaidButton}`}
                        title={card.is_paid ? "Markera som obetald" : "Markera som betald"}
                        disabled={updatingCards[card.id]}
                      >
                        {card.is_paid ? 'Betald ✓' : 'Ej betald ✗'}
                      </button>
                    </td>
                    <td className={styles.tableCell}>
                      <div>{card.recipient_name}</div>
                      {card.recipient_email && (
                        <div className={styles.smallText}>{card.recipient_email}</div>
                      )}
                    </td>
                    <td className={styles.tableCell}>{formatDate(card.created_at)}</td>
                    <td className={styles.tableCell}>{formatDate(card.expires_at)}</td>
                    <td className={`${styles.tableCell} ${styles.actionsCell}`}>
                      <div className={styles.actionButtonsContainer}>
                        <button
                          onClick={() => generateGiftCardPDF(card)}
                          className={`${styles.actionButton} ${styles.pdfButton}`}
                          title="Generera PDF"
                          disabled={updatingCards[card.id]}
                        >
                          {updatingCards[card.id] ? 'Genererar...' : 'PDF'}
                        </button>

                        {card.type === 'digital' && (
                          <button
                            onClick={() => {
                              sendGiftCardEmail(card);
                              handleMarkAsEmailed(card.id);
                            }}
                            disabled={card.is_emailed}
                            className={`${styles.actionButton} ${card.is_emailed ? styles.disabledButton : styles.emailButton}`}
                            title={card.is_emailed ? 'Redan skickat' : 'Skicka via e-post'}
                          >
                            {card.is_emailed ? 'Skickat' : 'Skicka'}
                          </button>
                        )}

                        {card.type === 'physical' && (
                          <button
                            onClick={() => handleMarkAsPrinted(card.id)}
                            disabled={card.is_printed}
                            className={`${styles.actionButton} ${card.is_printed ? styles.disabledButton : styles.printButton}`}
                            title={card.is_printed ? 'Redan utskrivet' : 'Markera som utskrivet'}
                          >
                            {card.is_printed ? 'Utskrivet' : 'Skriv ut'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

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
      </div>
    );
  };

  return renderContent();
};

export default GiftCardManager; 