import React, { useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import ReceiptIcon from '@mui/icons-material/Receipt';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import StandardTable from '../common/StandardTable';
import ActionButton from '../common/ActionButton';
import styles from '../../../app/admin/dashboard/courses/courses.module.css';

interface GiftCard {
  id: string;
  code: string;
  payment_reference?: string | null;
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
  onGenerateInvoicePDF: (card: GiftCard) => void;
  onDeleteGiftCard: (id: string) => void;
  onSendEmail: (card: GiftCard) => void;
  onMarkAsEmailed: (id: string) => void;
  onUpdateBalance: (id: string, newBalance: number) => void;
  onUpdateExpiry: (id: string, expiresAt: string) => void;
}

function codeOnCard(card: GiftCard): string {
  return card.code || 'Saknar kod';
}

function shiftMonths(dateValue: string, months: number) {
  const base = new Date(`${dateValue}T12:00:00`);
  if (Number.isNaN(base.getTime())) return dateValue;
  base.setMonth(base.getMonth() + months);
  const year = base.getFullYear();
  const month = String(base.getMonth() + 1).padStart(2, '0');
  const day = String(base.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('sv-SE');
}

function isPastDate(dateString: string) {
  const today = new Date().toLocaleDateString('sv-SE');
  return formatDate(dateString) < today;
}

export const GiftCardTable: React.FC<GiftCardTableProps> = ({
  giftCards,
  updatingCards,
  onStatusChange,
  onTogglePayment,
  onGeneratePDF,
  onGenerateInvoicePDF,
  onDeleteGiftCard,
  onUpdateBalance,
  onUpdateExpiry
}) => {
  const [editingBalance, setEditingBalance] = useState<{[key: string]: string | undefined}>({});
  const [balanceErrors, setBalanceErrors] = useState<{[key: string]: string | undefined}>({});
  const [expiryCard, setExpiryCard] = useState<GiftCard | null>(null);
  const [expiryValue, setExpiryValue] = useState('');
  const [expiryBase, setExpiryBase] = useState('');
  const [expiryError, setExpiryError] = useState('');

  const handleBalanceChange = (id: string, value: string) => {
    setEditingBalance({...editingBalance, [id]: value});
    
    if (balanceErrors[id]) {
      setBalanceErrors({...balanceErrors, [id]: undefined});
    }
    
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
    const numBalance = Number(editingBalance[id]);
    if (isNaN(numBalance)) {
      setBalanceErrors({...balanceErrors, [id]: "Måste vara ett giltigt nummer"});
      return;
    }
    
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
    
    onUpdateBalance(id, numBalance);
    setEditingBalance({...editingBalance, [id]: undefined});
    setBalanceErrors({...balanceErrors, [id]: undefined});
  };

  const startEditing = (id: string, currentBalance: number) => {
    setEditingBalance({...editingBalance, [id]: currentBalance.toString()});
    setBalanceErrors({...balanceErrors, [id]: undefined});
  };

  const cancelEditing = (id: string) => {
    setEditingBalance({...editingBalance, [id]: undefined});
    setBalanceErrors({...balanceErrors, [id]: undefined});
  };

  const openExpiryDialog = (card: GiftCard) => {
    const current = formatDate(card.expires_at);
    setExpiryCard(card);
    setExpiryValue(current);
    setExpiryBase(current);
    setExpiryError('');
  };

  const handleExpirySubmit = () => {
    if (!expiryCard) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(expiryValue)) {
      setExpiryError('Välj ett datum');
      return;
    }
    onUpdateExpiry(expiryCard.id, expiryValue);
    setExpiryCard(null);
  };

  const renderCode = (card: GiftCard) => {
    const showPrintedReference = Boolean(card.payment_reference && card.payment_reference !== card.code);

    return (
      <div>
        <h3 className={styles.courseTitle} title="Presentkortskod">
          {codeOnCard(card)}
        </h3>
        {showPrintedReference && (
          <p className={styles.courseDescription}>Referens på utskrivet kort: {card.payment_reference}</p>
        )}
      </div>
    );
  };

  const renderBalance = (card: GiftCard) => {
    if (editingBalance[card.id] !== undefined) {
      return (
        <div className={styles.balanceEditContainer}>
          <input
            type="number"
            min="0"
            max={card.amount}
            value={editingBalance[card.id]}
            onChange={(e) => handleBalanceChange(card.id, e.target.value)}
            className={`${styles.balanceInput} ${balanceErrors[card.id] ? styles.inputError : ''}`}
            disabled={updatingCards[card.id]}
            aria-label={`Saldo för ${codeOnCard(card)}`}
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
              className={styles.editorCancelButton}
            >
              Avbryt
            </button>
          </div>
        </div>
      );
    }

    return (
      <button
        type="button"
        className={styles.inlineEditable}
        onClick={() => startEditing(card.id, card.remaining_balance)}
        title="Klicka för att redigera saldo"
      >
        {card.remaining_balance} kr
        <span className={styles.editHint} aria-hidden="true">✎</span>
      </button>
    );
  };

  const renderExpiry = (card: GiftCard) => {
    const past = isPastDate(card.expires_at);
    return (
      <button
        type="button"
        className={`${styles.inlineEditable} ${past ? styles.expiredDate : ''}`}
        onClick={() => openExpiryDialog(card)}
        title="Ändra giltighetsdatum"
      >
        {formatDate(card.expires_at)}
        <span className={styles.editHint} aria-hidden="true">✎</span>
      </button>
    );
  };

  const renderStatus = (card: GiftCard) => (
    <select
      value={card.status}
      onChange={(e) => onStatusChange(card.id, e.target.value as GiftCard['status'])}
      className={styles.statusSelect}
      disabled={updatingCards[card.id]}
      aria-label={`Status för ${codeOnCard(card)}`}
    >
      <option value="active">Aktivt</option>
      <option value="redeemed">Inlöst</option>
      <option value="expired">Utgånget</option>
      <option value="cancelled">Avbrutet</option>
    </select>
  );

  const renderPayment = (card: GiftCard) => (
    <button
      onClick={() => onTogglePayment(card.id, card.is_paid)}
      className={`${styles.actionButton} ${card.is_paid ? styles.paidButton : styles.unpaidButton}`}
      title={card.is_paid ? "Markera som obetald" : "Markera som betald"}
      disabled={updatingCards[card.id]}
    >
      {card.is_paid ? 'Betald ✓' : 'Ej betald ✗'}
    </button>
  );

  const renderRecipient = (card: GiftCard) => (
    <div>
      <span className={styles.courseTitle}>{card.recipient_name}</span>
      {card.recipient_email && (
        <p className={styles.courseDescription}>{card.recipient_email}</p>
      )}
    </div>
  );

  const renderActions = (card: GiftCard, showLabels: boolean) => (
    <div className={styles.actionButtonsContainer}>
      <ActionButton
        variant="pdf"
        onClick={() => onGeneratePDF(card)}
        disabled={updatingCards[card.id]}
        icon={showLabels ? undefined : <CardGiftcardIcon />}
        label="Visa presentkort"
      />
      {card.invoice_number && (
        <ActionButton
          variant="pdf"
          onClick={() => onGenerateInvoicePDF(card)}
          disabled={updatingCards[card.id]}
          icon={showLabels ? undefined : <ReceiptIcon />}
          label="Visa faktura"
        />
      )}
      <ActionButton
        variant="edit"
        onClick={() => startEditing(card.id, card.remaining_balance)}
        disabled={updatingCards[card.id]}
        icon={showLabels ? undefined : <EditIcon />}
        label="Redigera saldo"
      />
      <ActionButton
        variant="delete"
        onClick={() => onDeleteGiftCard(card.id)}
        disabled={updatingCards[card.id]}
        icon={showLabels ? undefined : <DeleteIcon />}
        label="Ta bort"
      />
    </div>
  );

  return (
    <>
      <div className={styles.giftCardTableScroll}>
        <StandardTable
          headers={['Kod', 'Belopp', 'Saldo', 'Typ', 'Status', 'Betald', 'Mottagare', 'Skapat', 'Utgår', 'Åtgärder']}
          emptyMessage="Inga presentkort att visa"
        >
          {giftCards.map((card) => (
            <tr key={card.id} className={`${styles.tableRow} ${updatingCards[card.id] ? styles.loading : ''}`}>
              <td className={`${styles.tableCell} ${styles.codeCell}`}>
                {renderCode(card)}
              </td>
              <td className={styles.tableCell}>{card.amount} kr</td>
              <td className={styles.tableCell}>{renderBalance(card)}</td>
              <td className={styles.tableCell}>
                <span className={`${styles.statusBadge} ${card.type === 'digital' ? styles.publishedBadge : styles.draftBadge}`}>
                  {card.type === 'digital' ? 'Digitalt' : 'Fysiskt'}
                </span>
              </td>
              <td className={styles.tableCell}>{renderStatus(card)}</td>
              <td className={styles.tableCell}>{renderPayment(card)}</td>
              <td className={styles.tableCell}>{renderRecipient(card)}</td>
              <td className={styles.tableCell}>{formatDate(card.created_at)}</td>
              <td className={styles.tableCell}>{renderExpiry(card)}</td>
              <td className={`${styles.tableCell} ${styles.actionsCell}`}>
                {renderActions(card, false)}
              </td>
            </tr>
          ))}
        </StandardTable>
      </div>

      <div className={styles.giftCardList}>
        {giftCards.map((card) => (
          <article
            key={card.id}
            className={`${styles.giftCardItem} ${updatingCards[card.id] ? styles.loading : ''}`}
          >
            <div>
              <span className={styles.giftCardLabel}>Presentkortskod</span>
              {renderCode(card)}
            </div>
            <div>
              <span className={styles.giftCardLabel}>Avsändare</span>
              <span>{card.sender_name}</span>
            </div>

            <div className={styles.giftCardMeta}>
              <div>
                <span className={styles.giftCardLabel}>Belopp</span>
                <span>{card.amount} kr</span>
              </div>
              <div>
                <span className={styles.giftCardLabel}>Saldo</span>
                {renderBalance(card)}
              </div>
              <div>
                <span className={styles.giftCardLabel}>Typ</span>
                <span className={`${styles.statusBadge} ${card.type === 'digital' ? styles.publishedBadge : styles.draftBadge}`}>
                  {card.type === 'digital' ? 'Digitalt' : 'Fysiskt'}
                </span>
              </div>
              <div>
                <span className={styles.giftCardLabel}>Status</span>
                {renderStatus(card)}
              </div>
              <div>
                <span className={styles.giftCardLabel}>Betald</span>
                {renderPayment(card)}
              </div>
              <div>
                <span className={styles.giftCardLabel}>Mottagare</span>
                {renderRecipient(card)}
              </div>
              <div>
                <span className={styles.giftCardLabel}>Skapat</span>
                <span>{formatDate(card.created_at)}</span>
              </div>
              <div>
                <span className={styles.giftCardLabel}>Utgår</span>
                {renderExpiry(card)}
              </div>
            </div>

            <div className={styles.giftCardActions}>
              {renderActions(card, true)}
            </div>
          </article>
        ))}
      </div>

      <Dialog open={Boolean(expiryCard)} onClose={() => setExpiryCard(null)} fullWidth maxWidth="xs">
        <DialogTitle>Ändra giltighet</DialogTitle>
        <DialogContent>
          <p className={styles.courseDescription} style={{ marginBottom: 12 }}>
            {expiryCard ? codeOnCard(expiryCard) : ''}
          </p>
          <input
            type="date"
            value={expiryValue}
            onChange={(e) => {
              setExpiryValue(e.target.value);
              setExpiryError('');
            }}
            className={`${styles.dateInput} ${expiryError ? styles.inputError : ''}`}
            aria-label="Nytt giltighetsdatum"
          />
          {expiryError && <div className={styles.errorMessage}>{expiryError}</div>}
          <div className={styles.balanceEditActions} style={{ marginTop: 12 }}>
            <button type="button" className={styles.editorCancelButton} onClick={() => setExpiryValue(shiftMonths(expiryBase, 1))}>+1 mån</button>
            <button type="button" className={styles.editorCancelButton} onClick={() => setExpiryValue(shiftMonths(expiryBase, 3))}>+3 mån</button>
            <button type="button" className={styles.editorCancelButton} onClick={() => setExpiryValue(shiftMonths(expiryBase, 6))}>+6 mån</button>
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExpiryCard(null)} color="inherit">Avbryt</Button>
          <Button onClick={handleExpirySubmit} variant="contained">Spara</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default GiftCardTable;
