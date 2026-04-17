import React from 'react';

export default function ScoreDisplay({ score }) {
  return (
    <div className="score-dots">
      {[1,2,3,4,5,6,7,8,9,10].map(i => (
        <div key={i} className={`score-dot ${i <= score ? 'filled' : ''}`} />
      ))}
      <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--text-muted)' }}>{score}/10</span>
    </div>
  );
}
