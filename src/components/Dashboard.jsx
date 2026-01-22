// src/components/Dashboard.jsx
import React, { useState } from 'react';
import BuildingSelector from './BuildingSelector';
import RecommendationsList from './RecommendationsList';
import { generateRecommendations } from '../../js/services/carbonApi.service';

const pageStyle = {
  padding: '2rem',
  maxWidth: '900px',
  margin: '0 auto'
};

const titleStyle = {
  fontSize: '2rem',
  fontWeight: '700',
  color: '#111827',
  marginBottom: '0.5rem'
};

const descriptionStyle = {
  fontSize: '1rem',
  color: '#6b7280',
  marginBottom: '2rem'
};

const buttonStyle = {
  padding: '0.625rem 1.25rem',
  backgroundColor: '#3b82f6',
  color: '#ffffff',
  border: 'none',
  borderRadius: '0.375rem',
  fontSize: '0.875rem',
  fontWeight: '500',
  cursor: 'pointer',
  marginBottom: '2rem',
  transition: 'background-color 0.15s'
};

const sectionTitleStyle = {
  fontSize: '1.25rem',
  fontWeight: '600',
  color: '#111827',
  marginBottom: '1rem',
  paddingBottom: '0.5rem',
  borderBottom: '1px solid #e5e7eb'
};

function Dashboard() {
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleBuildingSelect = (building) => {
    setSelectedBuilding(building);
    setShowRecommendations(false);
  };

  const handleGenerateRecommendations = async () => {
    if (!selectedBuilding) return;

    setIsGenerating(true);
    try {
      await generateRecommendations(
        selectedBuilding.buildingId,
        selectedBuilding.buildingType
      );
      setShowRecommendations(true);
    } catch (err) {
      console.error('Failed to generate recommendations:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div style={pageStyle}>
      <h1 style={titleStyle}>Carbon Reduction Dashboard</h1>
      <p style={descriptionStyle}>
        Select a building to analyze emissions and generate actionable reduction recommendations.
      </p>

      <BuildingSelector onSelect={handleBuildingSelect} />

      {selectedBuilding && (
        <button
          style={{
            ...buttonStyle,
            backgroundColor: isGenerating ? '#9ca3af' : '#3b82f6',
            cursor: isGenerating ? 'not-allowed' : 'pointer'
          }}
          onClick={handleGenerateRecommendations}
          disabled={isGenerating}
          onMouseEnter={(e) => !isGenerating && (e.target.style.backgroundColor = '#2563eb')}
          onMouseLeave={(e) => !isGenerating && (e.target.style.backgroundColor = '#3b82f6')}
        >
          {isGenerating ? 'Generating...' : 'Generate Recommendations'}
        </button>
      )}

      {showRecommendations && selectedBuilding && (
        <section>
          <h2 style={sectionTitleStyle}>
            Recommendations for {selectedBuilding.buildingId}
          </h2>
          <RecommendationsList buildingId={selectedBuilding.buildingId} />
        </section>
      )}
    </div>
  );
}

export default Dashboard;
