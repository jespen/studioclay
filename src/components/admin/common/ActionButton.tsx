import React, { ReactNode } from 'react';
import styles from '../../../app/admin/dashboard/courses/courses.module.css';

type ButtonVariant = 'edit' | 'publish' | 'unpublish' | 'delete' | 'confirm' | 'cancel' | 'pdf';

interface ActionButtonProps {
  variant: ButtonVariant;
  onClick: () => void;
  label?: string;
  disabled?: boolean;
  icon?: ReactNode;
}

/**
 * A standardized button component for admin actions
 * Used across all admin tables to ensure consistent styling
 */
const ActionButton: React.FC<ActionButtonProps> = ({
  variant,
  onClick,
  label,
  disabled = false,
  icon
}) => {
  // Define standard labels for each variant if not provided
  const getDefaultLabel = (variant: ButtonVariant): string => {
    switch (variant) {
      case 'edit': return 'Redigera';
      case 'publish': return 'Publicera';
      case 'unpublish': return 'Avpublicera';
      case 'delete': return 'Ta bort';
      case 'confirm': return 'Bekräfta';
      case 'cancel': return 'Avbryt';
      case 'pdf': return 'PDF';
      default: return '';
    }
  };

  // Get the appropriate style class based on the variant
  const getButtonClass = (variant: ButtonVariant): string => {
    switch (variant) {
      case 'edit': return `${styles.actionButton} ${styles.editButton}`;
      case 'publish': return `${styles.actionButton} ${styles.publishButton}`;
      case 'unpublish': return `${styles.actionButton} ${styles.unpublishButton}`;
      case 'delete': return `${styles.actionButton} ${styles.deleteButton}`;
      case 'confirm': return `${styles.actionButton} ${styles.publishButton}`;
      case 'cancel': return `${styles.actionButton} ${styles.unpublishButton}`;
      case 'pdf': return `${styles.actionButton} ${styles.pdfButton}`;
      default: return styles.actionButton;
    }
  };

  const buttonLabel = label || getDefaultLabel(variant);
  const buttonClass = getButtonClass(variant);

  return (
    <button
      className={buttonClass}
      onClick={onClick}
      disabled={disabled}
      title={buttonLabel}
    >
      {icon ? (
        <span className={styles.iconWrapper}>
          {icon}
        </span>
      ) : (
        buttonLabel
      )}
    </button>
  );
};

export default ActionButton; 