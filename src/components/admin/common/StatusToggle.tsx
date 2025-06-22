import React from 'react';

interface StatusToggleProps {
  currentValue: string;
  option1: { value: string; label: string; color: 'green' | 'blue' | 'yellow' };
  option2: { value: string; label: string; color: 'green' | 'blue' | 'yellow' };
  onChange: (newValue: string) => void;
  disabled?: boolean;
  loading?: boolean;
}

const StatusToggle: React.FC<StatusToggleProps> = ({
  currentValue,
  option1,
  option2,
  onChange,
  disabled = false,
  loading = false
}) => {
  const getColorClasses = (color: 'green' | 'blue' | 'yellow', isActive: boolean) => {
    if (loading) {
      return 'bg-gray-100 text-gray-400 cursor-not-allowed';
    }
    
    if (!isActive) {
      return 'bg-gray-100 text-gray-600 hover:bg-gray-200';
    }
    
    switch (color) {
      case 'green':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'blue':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'yellow':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleToggle = () => {
    if (disabled || loading) return;
    
    const newValue = currentValue === option1.value ? option2.value : option1.value;
    onChange(newValue);
  };

  const isOption1Active = currentValue === option1.value;
  const isOption2Active = currentValue === option2.value;

  return (
    <div className="flex rounded-lg border border-gray-200 overflow-hidden">
      <button
        type="button"
        onClick={() => !disabled && !loading && onChange(option1.value)}
        disabled={disabled || loading}
        className={`
          px-3 py-2 text-sm font-medium transition-colors duration-150 
          ${getColorClasses(option1.color, isOption1Active)}
          ${disabled || loading ? '' : 'cursor-pointer'}
          flex-1 text-center
        `}
      >
        {loading && isOption1Active ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {option1.label}
          </span>
        ) : (
          <>
            {isOption1Active ? '✓' : '○'} {option1.label}
          </>
        )}
      </button>
      
      <button
        type="button"
        onClick={() => !disabled && !loading && onChange(option2.value)}
        disabled={disabled || loading}
        className={`
          px-3 py-2 text-sm font-medium transition-colors duration-150 
          ${getColorClasses(option2.color, isOption2Active)}
          ${disabled || loading ? '' : 'cursor-pointer'}
          flex-1 text-center border-l border-gray-200
        `}
      >
        {loading && isOption2Active ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {option2.label}
          </span>
        ) : (
          <>
            {isOption2Active ? '✓' : '○'} {option2.label}
          </>
        )}
      </button>
    </div>
  );
};

export default StatusToggle; 