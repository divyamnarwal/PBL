// src/components/RecommendationsList.jsx
import React, { useState, useEffect } from 'react';
import RecommendationCard from './RecommendationCard';
import {
  getActiveRecommendationsByBuilding,
  resolveRecommendation
} from '../../js/services/carbonApi.service';

function RecommendationsList({ buildingId }) {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRecommendations = async () => {
    if (!buildingId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await getActiveRecommendationsByBuilding(buildingId);
      setRecommendations(response.recommendations || []);
    } catch (err) {
      console.error('Failed to fetch recommendations:', err);
      setError(err.message);
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, [buildingId]);

  const handleResolve = async (recommendationId) => {
    try {
      await resolveRecommendation(recommendationId);
      await fetchRecommendations();
    } catch (err) {
      console.error('Failed to resolve recommendation:', err);
    }
  };

  if (loading) {
    return <p>Loading recommendations...</p>;
  }

  if (error) {
    return <p style={{ color: '#ef4444' }}>Unable to load recommendations.</p>;
  }

  if (recommendations.length === 0) {
    return <p>No active recommendations.</p>;
  }

  return (
    <div>
      {recommendations.map((recommendation) => (
        <RecommendationCard
          key={recommendation._id}
          recommendation={recommendation}
          onResolve={handleResolve}
        />
      ))}
    </div>
  );
}

export default RecommendationsList;
