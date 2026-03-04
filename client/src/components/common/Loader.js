import React from 'react';
import './Loader.css';

const Loader = () => {
  return (
    <div className="loader-container">
      <div className="gold-loader">
        <div className="loader-circle"></div>
        <div className="loader-circle mirror"></div>
        <div className="loader-text">TriByte</div>
      </div>
    </div>
  );
};

export default Loader;