import React from 'react';

interface StatusBadgeProps {
  status: string;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
}

const StatusBadge = ({ status, variant = 'default' }: StatusBadgeProps) => {
  const getVariantClasses = () => {
    const statusLower = status.toLowerCase();
    
    // Auto-detect variant based on status if not provided
    if (variant === 'default') {
      if (statusLower.includes('active') || statusLower.includes('paid') || statusLower.includes('finished') || statusLower.includes('delivered')) {
        variant = 'success';
      } else if (statusLower.includes('pending') || statusLower.includes('ordered') || statusLower.includes('planned')) {
        variant = 'warning';
      } else if (statusLower.includes('cancelled') || statusLower.includes('failed') || statusLower.includes('inactive')) {
        variant = 'error';
      } else if (statusLower.includes('progress') || statusLower.includes('released')) {
        variant = 'info';
      }
    }

    switch (variant) {
      case 'success':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'info':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getVariantClasses()}`}>
      {status}
    </span>
  );
};

export default StatusBadge;