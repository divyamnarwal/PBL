// src/components/BuildingSelector.jsx
import React from 'react';

const buildings = [
  { buildingId: 'office-demo-001', buildingType: 'OFFICE', label: 'Office Demo 001' },
  { buildingId: 'campus-demo-001', buildingType: 'CAMPUS', label: 'Campus Demo 001' }
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
  maxWidth: '400px',
  padding: '0.5rem 0.75rem',
  fontSize: '0.875rem',
  border: '1px solid #d1d5db',
  borderRadius: '0.375rem',
  backgroundColor: '#ffffff',
  color: '#111827',
  cursor: 'pointer'
};

function BuildingSelector({ onSelect }) {
  const handleChange = (e) => {
    const selectedBuilding = buildings.find(
      (b) => b.buildingId === e.target.value
    );
    if (selectedBuilding) {
      onSelect({
        buildingId: selectedBuilding.buildingId,
        buildingType: selectedBuilding.buildingType
      });
    }
  };

  return (
    <div style={containerStyle}>
      <label htmlFor="building-select" style={labelStyle}>
        Select Building
      </label>
      <select
        id="building-select"
        style={selectStyle}
        onChange={handleChange}
        defaultValue=""
      >
        <option value="">-- Choose a building --</option>
        {buildings.map((building) => (
          <option key={building.buildingId} value={building.buildingId}>
            {building.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default BuildingSelector;
