import React, { useEffect, useState } from "react";

const TranslationInfo = ({ query, translatedQuery }) => {
  if (!translatedQuery) {
    return null;
  }

  return (
    <div
      style={{
        marginBottom: "15px",
        padding: "12px",
        borderRadius: "4px",
        fontSize: "0.95em",
        color: translatedQuery === query ? "#2e7d32" : "#1565c0",
        borderLeft: `4px solid ${translatedQuery === query ? "#4caf50" : "#1976d2"}`,
        backgroundColor: translatedQuery === query ? "#e8f5e9" : "#f0f4ff",
      }}
    >
      {translatedQuery === query ? (
        <>
          ℹ️ <strong>Pencarian:</strong> Query menggunakan bahasa yang sama untuk pencarian
        </>
      ) : (
        <>
          🌐 <strong>Pencarian Dual Language (Indonesia + English):</strong>
          <br />• 🇮🇩 Indonesia: "{query}"
          <br />• 🇬🇧 English: "{translatedQuery}"
        </>
      )}
    </div>
  );
};

export default TranslationInfo;
