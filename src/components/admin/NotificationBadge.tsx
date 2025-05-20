import React from 'react';

interface NotificationBadgeProps {
  count: number;
  className?: string;
}

export const NotificationBadge: React.FC<NotificationBadgeProps> = ({
  count,
  className = ''
}) => {
  // Log the count for debugging
  console.log(`NotificationBadge rendering with count: ${count}`, {
    count,
    type: typeof count,
    isNumber: typeof count === 'number',
    isPositive: count > 0
  });

  // Force count to be a number
  const numericCount = Number(count);

  // Don't show the badge if count is 0 or NaN
  if (isNaN(numericCount) || numericCount <= 0) {
    console.log('NotificationBadge not showing (count <= 0 or NaN)');
    return null;
  }

  // Always show the badge if count is positive
  console.log('NotificationBadge showing with count:', numericCount);

  return (
    <span
      className={`notification-badge ${className}`}
      style={{
        backgroundColor: '#e53e3e',
        color: 'white',
        position: 'absolute',
        top: '-8px',
        right: '-8px',
        minWidth: '18px',
        height: '18px',
        padding: '0 4px',
        fontSize: '0.75rem',
        borderRadius: '9999px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 'bold',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
        zIndex: 50
      }}
    >
      {numericCount > 99 ? '99+' : numericCount}
    </span>
  );
};
