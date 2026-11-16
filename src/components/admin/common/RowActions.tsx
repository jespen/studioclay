'use client';

import { useState } from 'react';
import { Button, IconButton, Menu, MenuItem } from '@mui/material';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';

export interface RowActionItem {
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}

interface RowActionsProps {
  onEdit?: () => void;
  editLabel?: string;
  items?: RowActionItem[];
}

export default function RowActions({ onEdit, editLabel = 'Redigera', items = [] }: RowActionsProps) {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
      {onEdit && (
        <Button size="small" variant="contained" onClick={onEdit}>
          {editLabel}
        </Button>
      )}
      {items.length > 0 && (
        <>
          <IconButton
            size="small"
            aria-label="Fler åtgärder"
            onClick={(event) => setAnchor(event.currentTarget)}
          >
            <MoreHorizIcon fontSize="small" />
          </IconButton>
          <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
            {items.map((item) => (
              <MenuItem
                key={item.label}
                disabled={item.disabled}
                onClick={() => {
                  setAnchor(null);
                  item.onClick();
                }}
                sx={item.danger ? { color: 'error.main' } : undefined}
              >
                {item.label}
              </MenuItem>
            ))}
          </Menu>
        </>
      )}
    </div>
  );
}
