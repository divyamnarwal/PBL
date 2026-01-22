// src/components/RecommendationCard.jsx
import React from 'react';

const severityColors = {
  HIGH: '#ef4444',
  MEDIUM: '#f97316',
  LOW: '#22c55e'
};

const severityLabels = {
  HIGH: 'High Priority',
  MEDIUM: 'Medium Priority',
  LOW: 'Low Priority'
};

const cardStyle = {
  padding: '1rem',
  border: '1px solid #e5e7eb',
  borderRadius: '0.5rem',
  backgroundColor: '#ffffff',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  marginBottom: '1rem'
};

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '0.75rem'
};

const sourceStyle = {
  fontSize: '1.125rem',
  fontWeight: '600',
  color: '#111827',
  margin: 0
};

const badgeStyle = (color) => ({
  padding: '0.25rem 0.75rem',
  borderRadius: '9999px',
  fontSize: '0.75rem',
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  backgroundColor: color,
  color: '#ffffff'
});

const textStyle = {
  color: '#6b7280',
  fontSize: '0.875rem',
  lineHeight: '1.5',
  marginBottom: '0.75rem'
};

const reductionStyle = {
  color: '#059669',
  fontSize: '0.875rem',
  fontWeight: '500',
  marginBottom: '1rem'
};

const resolveButtonStyle = {
  padding: '0.5rem 1rem',
  backgroundColor: '#3b82f6',
  color: '#ffffff',
  border: 'none',
  borderRadius: '0.375rem',
  fontSize: '0.875rem',
  fontWeight: '500',
  cursor: 'pointer',
  transition: 'background-color 0.15s'
};

const resolvedBadgeStyle = {
  padding: '0.25rem 0.75rem',
  borderRadius: '0.375rem',
  backgroundColor: '#d1fae5',
  color: '#065f46',
  fontSize: '0.75rem',
  fontWeight: '600',
  display: 'inline-block'
};

function RecommendationCard({ recommendation, onResolve }) {
  const {
    _id,
    emissionSource,
    recommendationText,
    severity,
    expectedReductionPercent,
    isResolved
  } = recommendation;

  const handleResolve = () => {
    onResolve(_id);
  };

  return (
    <div style={cardStyle}>
      <div style={headerStyle}>
        <h3 style={sourceStyle}>{emissionSource}</h3>
        <span style={badgeStyle(severityColors[severity] || '#6b7280')}>
          {severityLabels[severity] || 'Unknown'}
        </span>
      </div>

      <p style={textStyle}>{recommendationText}</p>

      <p style={reductionStyle}>
        Expected Reduction: {expectedReductionPercent}%
      </p>

      {!isResolved ? (
        <button
          style={resolveButtonStyle}
          onClick={handleResolve}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#2563eb'}
          onMouseLeave={(e) => e.target.style.backgroundColor = '#3b82f6'}
        >
          Resolve
        </button>
      ) : (
        <span style={resolvedBadgeStyle}>Resolved</span>
      )}
    </div>
  );
}

export default RecommendationCard;
