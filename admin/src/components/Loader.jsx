import React from 'react';
import { useSymposiumDate } from '../../context/DateContext';
import './Loader.css';

const Loader = () => {
  const { symposiumName } = useSymposiumDate();
  
  return (
    <div className="loader-container">
      <div className="gold-loader">
        <div className="loader-circle"></div>
        <div className="loader-circle mirror"></div>
        <div className="loader-text">{symposiumName}</div>
      </div>
    </div>
  );
};

export default Loader;