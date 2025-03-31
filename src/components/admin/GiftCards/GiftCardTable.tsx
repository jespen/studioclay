import React, { useState } from 'react';
import { Box } from '@mui/material';
import ReceiptIcon from '@mui/icons-material/Receipt';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import EditIcon from '@mui/icons-material/Edit';
import StandardTable from '../common/StandardTable';
import ActionButton from '../common/ActionButton';
import styles from '../../../app/admin/dashboard/courses/courses.module.css';
import { EditAttributesOutlined } from '@mui/icons-material';

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

interface GiftCardTableProps {
  giftCards: GiftCard[];
  updatingCards: { [key: string]: boolean };
  onStatusChange: (id: string, status: GiftCard['status']) => void;
  onTogglePayment: (id: string, isPaid: boolean) => void;
  onGeneratePDF: (card: GiftCard) => void;
  onSendEmail: (card: GiftCard) => void;
  onMarkAsEmailed: (id: string) => void;
  onUpdateBalance: (id: string, newBalance: number) => void;
}

export const GiftCardTable: React.FC<GiftCardTableProps> = ({
  giftCards,
  updatingCards,
  onStatusChange,
  onTogglePayment,
  onGeneratePDF,
  onSendEmail,
  onMarkAsEmailed,
  onUpdateBalance
}) => {
  const [editingBalance, setEditingBalance] = useState<{[key: string]: string | undefined}>({});
  const [balanceErrors, setBalanceErrors] = useState<{[key: string]: string | undefined}>({});

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('sv-SE');
  };

  const handleBalanceChange = (id: string, value: string) => {
    setEditingBalance({...editingBalance, [id]: value});
    
    // Clear any previous error
    if (balanceErrors[id]) {
      setBalanceErrors({...balanceErrors, [id]: undefined});
    }
    
    // Validate input
    const card = giftCards.find(card => card.id === id);
    if (!card) return;
    
    const numValue = Number(value);
    if (isNaN(numValue)) {
      setBalanceErrors({...balanceErrors, [id]: "Måste vara ett giltigt nummer"});
    } else if (numValue < 0) {
      setBalanceErrors({...balanceErrors, [id]: "Kan inte vara negativt"});
    } else if (numValue > card.amount) {
      setBalanceErrors({...balanceErrors, [id]: `Kan inte överstiga ${card.amount} kr`});
    }
  };

  const handleBalanceSubmit = (id: string) => {
    // Ensure there's a valid number
    const numBalance = Number(editingBalance[id]);
    if (isNaN(numBalance)) {
      setBalanceErrors({...balanceErrors, [id]: "Måste vara ett giltigt nummer"});
      return;
    }
    
    // Validate range
    const card = giftCards.find(card => card.id === id);
    if (!card) return;
    
    if (numBalance < 0) {
      setBalanceErrors({...balanceErrors, [id]: "Kan inte vara negativt"});
      return;
    }
    
    if (numBalance > card.amount) {
      setBalanceErrors({...balanceErrors, [id]: `Kan inte överstiga ${card.amount} kr`});
      return;
    }
    
    // No errors, update the balance
    onUpdateBalance(id, numBalance);
    setEditingBalance({...editingBalance, [id]: undefined});
    setBalanceErrors({...balanceErrors, [id]: undefined});
  };

  const startEditing = (id: string, currentBalance: number) => {
    setEditingBalance({...editingBalance, [id]: currentBalance.toString()});
    // Clear any previous errors
    setBalanceErrors({...balanceErrors, [id]: undefined});
  };

  const cancelEditing = (id: string) => {
    setEditingBalance({...editingBalance, [id]: undefined});
    setBalanceErrors({...balanceErrors, [id]: undefined});
  };

  return (
    <StandardTable 
      headers={['Kod', 'Belopp', 'Saldo', 'Typ', 'Status', 'Betald', 'Mottagare', 'Skapat', 'Utgår', 'Åtgärder']}
      emptyMessage="Inga presentkort att visa"
    >
      {giftCards.map((card) => (
        <tr key={card.id} className={`${styles.tableRow} ${updatingCards[card.id] ? styles.loading : ''}`}>
          <td className={`${styles.tableCell} ${styles.codeCell}`}>
            <div>
              <h3 className={styles.courseTitle}>{card.code}</h3>
            </div>
          </td>
          <td className={styles.tableCell}>{card.amount} kr</td>
          <td className={styles.tableCell}>
            {editingBalance[card.id] !== undefined ? (
              <div className={styles.balanceEditContainer}>
                <input 
                  type="number"
                  min="0"
                  max={card.amount}
                  value={editingBalance[card.id]}
                  onChange={(e) => handleBalanceChange(card.id, e.target.value)}
                  className={`${styles.balanceInput} ${balanceErrors[card.id] ? styles.inputError : ''}`}
                  disabled={updatingCards[card.id]}
                />
                {balanceErrors[card.id] && (
                  <div className={styles.errorMessage}>{balanceErrors[card.id]}</div>
                )}
                <div className={styles.balanceEditActions}>
                  <button 
                    onClick={() => handleBalanceSubmit(card.id)}
                    disabled={updatingCards[card.id] || !!balanceErrors[card.id]}
                    className={styles.saveButton}
                  >
                    Spara
                  </button>
                  <button 
                    onClick={() => cancelEditing(card.id)}
                    disabled={updatingCards[card.id]}
                    className={styles.cancelButton}
                  >
                    Avbryt
                  </button>
                </div>
              </div>
            ) : (
              <div 
                className={styles.balanceDisplay} 
                onClick={() => startEditing(card.id, card.remaining_balance)}
                title="Klicka för att redigera saldo"
              >
                {card.remaining_balance} kr
                <span className={styles.editIcon}>✎</span>
              </div>
            )}
          </td>
          <td className={styles.tableCell}>
            <span className={`${styles.statusBadge} ${card.type === 'digital' ? styles.publishedBadge : styles.draftBadge}`}>
              {card.type === 'digital' ? 'Digitalt' : 'Fysiskt'}
            </span>
          </td>
          <td className={styles.tableCell}>
            <select
              value={card.status}
              onChange={(e) => onStatusChange(
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
              onClick={() => onTogglePayment(card.id, card.is_paid)}
              className={`${styles.actionButton} ${card.is_paid ? styles.paidButton : styles.unpaidButton}`}
              title={card.is_paid ? "Markera som obetald" : "Markera som betald"}
              disabled={updatingCards[card.id]}
            >
              {card.is_paid ? 'Betald ✓' : 'Ej betald ✗'}
            </button>
          </td>
          <td className={styles.tableCell}>
            <div>
              <span className={styles.courseTitle}>{card.recipient_name}</span>
              {card.recipient_email && (
                <p className={styles.courseDescription}>{card.recipient_email}</p>
              )}
            </div>
          </td>
          <td className={styles.tableCell}>{formatDate(card.created_at)}</td>
          <td className={styles.tableCell}>{formatDate(card.expires_at)}</td>
          <td className={`${styles.tableCell} ${styles.actionsCell}`}>
            <div className={styles.actionButtonsContainer}>
              <ActionButton
                variant="pdf"
                onClick={() => onGeneratePDF(card)}
                disabled={updatingCards[card.id]}
                icon={<CardGiftcardIcon />}
                label="Visa presentkort"
              />
              
              {card.invoice_number && (
                <ActionButton
                  variant="pdf"
                  onClick={() => onGeneratePDF(card)}
                  disabled={updatingCards[card.id]}
                  icon={<ReceiptIcon />}
                  label="Visa faktura"
                />
              )}
              
              <ActionButton
                variant="edit"
                onClick={() => startEditing(card.id, card.remaining_balance)}
                disabled={updatingCards[card.id]}
                icon={<EditIcon />}
                label="Redigera saldo"
              />
            </div>
          </td>
        </tr>
      ))}
    </StandardTable>
  );
};

export default GiftCardTable; 