import React, { useEffect, useState } from 'react';
import { getRecommendationTargets } from '../../js/services/carbonApi.service';

const fallbackBuildings = [
  { buildingId: 'office-demo-001', buildingType: 'OFFICE', label: 'Office Demo 001', source: 'demo' },
  { buildingId: 'campus-demo-001', buildingType: 'CAMPUS', label: 'Campus Demo 001', source: 'demo' }
];

const containerStyle = {
  marginBottom: '1.5rem'
};

const labelStyle = {
  display: 'block',
  fontSize: '0.875rem',
  fontWeight: '500',
  color: '#374151',
  marginBottom: '0.5rem'
};

const selectStyle = {
  width: '100%',
  maxWidth: '520px',
  padding: '0.5rem 0.75rem',
  fontSize: '0.875rem',
  border: '1px solid #d1d5db',
  borderRadius: '0.375rem',
  backgroundColor: '#ffffff',
  color: '#111827',
  cursor: 'pointer'
};

const helperStyle = {
  marginTop: '0.5rem',
  fontSize: '0.8125rem',
  color: '#6b7280'
};

function BuildingSelector({ onSelect }) {
  const [buildings, setBuildings] = useState(fallbackBuildings);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadTargets = async () => {
      try {
        const response = await getRecommendationTargets();
        if (!isMounted) return;

        const targets = response.targets?.length ? response.targets : fallbackBuildings;
        setBuildings(targets);
      } catch (err) {
        if (!isMounted) return;
        setError(err.message);
        setBuildings(fallbackBuildings);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadTargets();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleChange = (e) => {
    const selectedBuilding = buildings.find(
      (building) => building.buildingId === e.target.value
    );

    if (selectedBuilding) {
      onSelect({
        buildingId: selectedBuilding.buildingId,
        buildingType: selectedBuilding.buildingType,
        source: selectedBuilding.source
      });
    }
  };

  return (
    <div style={containerStyle}>
      <label htmlFor="building-select" style={labelStyle}>
        Select Building Or Live Sensor Location
      </label>
      <select
        id="building-select"
        style={selectStyle}
        onChange={handleChange}
        defaultValue=""
        disabled={loading}
      >
        <option value="">
          {loading ? 'Loading available targets...' : '-- Choose a building or live location --'}
        </option>
        {buildings.map((building) => (
          <option key={building.buildingId} value={building.buildingId}>
            {building.label} [{building.buildingType}]
          </option>
        ))}
      </select>
      <p style={helperStyle}>
        Live sensor locations are inferred automatically. Demo buildings remain available for fallback testing.
      </p>
      {error ? <p style={{ ...helperStyle, color: '#b91c1c' }}>{error}</p> : null}
    </div>
  );
}

export default BuildingSelector;
