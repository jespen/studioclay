import React from 'react';
import { Box } from '@mui/material';
import StandardTable from '../common/StandardTable';
import ActionButton from '../common/ActionButton';
import styles from '../../../app/admin/dashboard/courses/courses.module.css';

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

interface GiftCardTableProps {
  giftCards: GiftCard[];
  updatingCards: { [key: string]: boolean };
  onStatusChange: (id: string, status: GiftCard['status']) => void;
  onTogglePayment: (id: string, isPaid: boolean) => void;
  onGeneratePDF: (card: GiftCard) => void;
  onSendEmail: (card: GiftCard) => void;
  onMarkAsEmailed: (id: string) => void;
  onMarkAsPrinted: (id: string) => void;
}

export const GiftCardTable: React.FC<GiftCardTableProps> = ({
  giftCards,
  updatingCards,
  onStatusChange,
  onTogglePayment,
  onGeneratePDF,
  onSendEmail,
  onMarkAsEmailed,
  onMarkAsPrinted
}) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('sv-SE');
  };

  return (
    <StandardTable 
      headers={['Kod', 'Belopp', 'Typ', 'Status', 'Betald', 'Mottagare', 'Skapat', 'Utgår', 'Åtgärder']}
      emptyMessage="Inga presentkort att visa"
    >
      {giftCards.map((card) => (
        <tr key={card.id} className={`${styles.tableRow} ${updatingCards[card.id] ? styles.loading : ''}`}>
          <td className={`${styles.tableCell} ${styles.codeCell}`}>
            <div>
              <h3 className={styles.courseTitle}>{card.code}</h3>
              <p className={styles.courseDescription}>
                Saldo: {card.remaining_balance}/{card.amount} kr
              </p>
            </div>
          </td>
          <td className={styles.tableCell}>{card.amount} kr</td>
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
                variant="edit"
                onClick={() => onGeneratePDF(card)}
                disabled={updatingCards[card.id]}
                label="PDF"
              />
              
              {card.type === 'digital' && !card.is_emailed && (
                <ActionButton
                  variant="publish"
                  onClick={() => onSendEmail(card)}
                  disabled={updatingCards[card.id] || !card.is_paid}
                  label="Skicka"
                />
              )}
              
              {!card.is_emailed && card.type === 'digital' && (
                <ActionButton
                  variant="confirm"
                  onClick={() => onMarkAsEmailed(card.id)}
                  disabled={updatingCards[card.id]}
                  label="Markera skickat"
                />
              )}
              
              {!card.is_printed && card.type === 'physical' && (
                <ActionButton
                  variant="confirm"
                  onClick={() => onMarkAsPrinted(card.id)}
                  disabled={updatingCards[card.id]}
                  label="Markera utskrivet"
                />
              )}
            </div>
          </td>
        </tr>
      ))}
    </StandardTable>
  );
};

export default GiftCardTable; 