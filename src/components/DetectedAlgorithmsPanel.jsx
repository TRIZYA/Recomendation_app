import React from "react";
import AppCSS from "../App.module.css";

const DetectedAlgorithmsPanel = ({ detectedAlgorithms }) => {
  if (!detectedAlgorithms.length) {
    return null;
  }

  return (
    <div className={AppCSS.detectedAlgorithmsContainer}>
      <h4>Algoritma yang terdeteksi dalam query</h4>
      <div className={AppCSS.detectedAlgorithmsList}>
        {detectedAlgorithms.map((algorithm) => (
          <span key={algorithm} className={AppCSS.detectedAlgorithmBadge}>
            {algorithm}
          </span>
        ))}
      </div>
    </div>
  );
};

export default DetectedAlgorithmsPanel;