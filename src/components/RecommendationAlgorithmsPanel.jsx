import React, { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import AppCSS from "../App.module.css";

const DEFAULT_LIMIT = 5;  

const RecommendationAlgorithmsPanel = ({ recommendedAlgorithms, queryLength, isSearching }) => {
  const [showAll, setShowAll] = useState(false);
  const filteredAlgorithms = recommendedAlgorithms.filter((algorithm) => {
    return (algorithm.articleCount || 0) > 0;
  });

  const hasResults = filteredAlgorithms.length > 0;
  const showValidQueryMessage = queryLength >= 3 && !hasResults;

  if (!filteredAlgorithms.length) {
    return null;
  }

  const displayAlgorithms = showAll ? filteredAlgorithms : filteredAlgorithms.slice(0, DEFAULT_LIMIT);
  // Chart should reflect the currently displayed algorithms
  const chartAlgorithms = displayAlgorithms;

  return (
    <div className={AppCSS.recommendation}>
      {hasResults ? (
        <>
          <div className={AppCSS.recommendationList}>
            <h4>Top 5 Rekomendasi Algoritma Lainnya</h4>
            {displayAlgorithms.map((algorithm, index) => (
              <div key={`${algorithm.algorithm}-${index}`} className={AppCSS.articleCard}>
                <h3>
                  {index + 1}. Algoritma: {algorithm.algorithm}
                </h3>
                <p>
                  <strong>Total Artikel:</strong> {algorithm.articleCount || 0}
                </p>
                {algorithm.universityLabels && algorithm.universityLabels.length > 0 && (
                  <p>
                    <strong>Artikel berasal dari:</strong> 
                    <p>
                      {algorithm.universityLabels.map((univ, index) => (
                        <React.Fragment key={index}>
                          {univ}
                          {index < algorithm.universityLabels.length - 1 && <br />}
                        </React.Fragment>
                      ))}
                    </p>
                  </p>
                )}
              </div>
            ))}
          <button onClick={() => setShowAll((s) => !s)}>
            {showAll ? `Sembunyikan` : `Tampilkan semua (${filteredAlgorithms.length})`}
          </button>
          </div>
          <div className={AppCSS.chartContainer}>
            <h4>📊 Distribusi Total Artikel per Algoritma</h4>
            <ResponsiveContainer width="100%" height={500}>
              <BarChart
                data={chartAlgorithms.map((m) => ({
                  name: m.algorithm,
                  articleCount: m.articleCount || 0,
                }))}
                margin={{ top: 20, right: 30, left: 20, bottom: 100 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={150}
                  tick={{ fontSize: 12 }}
                />
                <YAxis label={{ value: "Total Artikel", angle: -90, position: "insideLeft" }} />
                <Tooltip
                  labelFormatter={(label) => `Algoritma: ${label}`}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div style={{ backgroundColor: '#fff', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}>
                          <p style={{ margin: '0 0 4px 0', fontWeight: 'bold' }}>{data.name}</p>
                          <p style={{ margin: '0' }}>Total Artikel: {data.articleCount}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <Bar dataKey="articleCount" fill="#8884d8" name="Total Artikel" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      ) : (
        <div className={AppCSS.recommendationList}>
          <p>
            {queryLength === 0
              ? "Masukkan judul penelitian minimal 3 kata untuk mendapatkan rekomendasi algoritma alternatif."
              : queryLength < 3
              ? `Query minimal 3 kata (saat ini: ${queryLength} kata). Alternatif algoritma akan ditampilkan di sini.`
              : isSearching
              ? "Sedang memproses... Silakan tunggu rekomendasi algoritma."
              : showValidQueryMessage
              ? "Masukkan query yang valid."
              : "Sedang memproses... Silakan tunggu rekomendasi algoritma."}
          </p>
        </div>
      )}
    </div>
  );
};

export default RecommendationAlgorithmsPanel;