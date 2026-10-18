/* eslint-disable react/prop-types */
import { useMemo } from "react";
import AppCSS from "../App.module.css";

const toTitleCase = (value) => {
  if (!value) return "";
  return value
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

const getYearFromDate = (value) => {
  const text = String(value || "").trim();
  if (!text) return null;
  const match = text.match(/(\d{4})/);
  return match ? Number(match[1]) : null;
};

const parseArticleDate = (value) => {
  const text = String(value || "").trim();
  if (!text) return null;

  const year = getYearFromDate(text);
  if (!year) return null;

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }

  return new Date(`${year}-01-01T00:00:00`);
};

const Dashboard = ({ data }) => {
  const summary = useMemo(() => {
    const yearsCount = {};
    const algorithmCounts = {};
    let latestDate = null;

    data.forEach((article) => {
      const articleYear = getYearFromDate(article.date);
      if (articleYear) {
        yearsCount[articleYear] = (yearsCount[articleYear] || 0) + 1;
      }

      if (Array.isArray(article.algorithm)) {
        article.algorithm.forEach((algorithm) => {
          const normalized = algorithm.trim();
          if (!normalized) return;
          algorithmCounts[normalized] = (algorithmCounts[normalized] || 0) + 1;
        });
      }

      const parsedDate = parseArticleDate(article.date);
      if (parsedDate && (!latestDate || parsedDate > latestDate)) {
        latestDate = parsedDate;
      }
    });

    const totalJournals = data.length;
    const sortedYears = Object.entries(yearsCount).sort((a, b) => b[0] - a[0]);
    const topAlgorithms = Object.entries(algorithmCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const recentJournals = [...data]
      .filter((article) => article.date)
      .sort((a, b) => parseArticleDate(b.date) - parseArticleDate(a.date))
      .slice(0, 4);

    return {
      totalJournals,
      topAlgorithms,
      allAlgorithms: Object.keys(algorithmCounts),
      sortedYears,
      latestYear: latestDate ? latestDate.getFullYear() : null,
      recentJournals,
    };
  }, [data]);

  return (
    <div className={AppCSS.dashboardPage}>
      <div className={AppCSS.dashboardHeader}>
        <div>
          <p className={AppCSS.dashboardLabel}>Dashboard Rekomendasi Algoritma Teknik Informatika</p>
          <h2 className={AppCSS.dashboardTitle}>Universitas Muhammadiyah Gresik</h2>
          <p className={AppCSS.dashboardSubtitle}>
            Ringkasan data jurnal penelitian Teknik Informatika berdasarkan kumpulan publikasi yang tersedia.
          </p>
          <h5>Oleh: Dimas Achyar Trizyaputra</h5>
        </div>
      </div>

      <div className={AppCSS.dashboardStats}>
        <div className={AppCSS.dashboardCard}>
          <span className={AppCSS.cardLabel}>Total Jurnal</span>
          <p className={AppCSS.cardValue}>{summary.totalJournals}</p>
        </div>

        {/* <div className={AppCSS.dashboardCard}>
          <span className={AppCSS.cardLabel}>Skor Rata-rata</span>
          <p className={AppCSS.cardValue}>{summary.averageScore}</p>
        </div> */}

        <div className={AppCSS.dashboardCard}>
          <span className={AppCSS.cardLabel}>Tahun Terbaru</span>
          <p className={AppCSS.cardValue}>{summary.latestYear || "-"}</p>
        </div>

        <div className={AppCSS.dashboardCard}>
          <span className={AppCSS.cardLabel}>Total Algoritma</span>
          <p className={AppCSS.cardValue}>{summary.allAlgorithms.length}</p>
        </div>
      </div>

      <div className={AppCSS.dashboardGrid}>
        <section className={AppCSS.dashboardSection}>
          <h4>Algoritma Paling Banyak Digunakan</h4>
          <ul className={AppCSS.dashboardList}>
            {summary.topAlgorithms.map(([algorithm, count]) => (
              <li key={algorithm}>
                <span>{algorithm}</span>
                <strong>{count}</strong>
              </li>
            ))}
          </ul>
        </section>

        <section className={AppCSS.dashboardSection}>
          <h4>Jumlah Jurnal per Tahun</h4>
          <ul className={AppCSS.dashboardList}>
            {summary.sortedYears.map(([year, count]) => (
              <li key={year}>
                <span>{year}</span>
                <strong>{count}</strong>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <section className={`${AppCSS.dashboardSection} ${AppCSS.dashboardNewJournal}`}>
          <h4>Jurnal Terbaru</h4>
          <div className={AppCSS.dashboardRecentList}>
            {summary.recentJournals.map((article) => {
            const itemKey = article.link || article.title;
            const snippet = (text, regex, maxLength = 180) => {
              const match = text.match(regex);
              if (!match) {
                return text.length <= maxLength ? text : `${text.slice(0, maxLength).trim()}...`;
              }
              return match ? match[0].substring(0, maxLength) : text.substring(0, maxLength);
            };
            return (
              <div key={itemKey} className={AppCSS.recentItem}>
                <div className={AppCSS.recentHeading}>
                  {article.link ? ( 
                    <a style={{ textTransform: 'uppercase', color: "#111827"}}> {article.author} ({getYearFromDate(article.date)})
                      <a
                        href={article.link}
                        target="_blank"
                        rel="noreferrer"
                        className={AppCSS.recentTitle}
                      >
                        {article.title ? ` ${toTitleCase(article.title)}` : ""}
                      </a>
                    </a>    
                  ) : (
                    <p className={AppCSS.recentTitle}>{toTitleCase(article.title)}</p>
                  )}
                </div>             
                  {article.link ? (
                    <a href={article.link} 
                      target="_blank"
                      rel="noreferrer" 
                      className={AppCSS.recentabstract}
                      style={{ marginTop: "8px", color: "#444", lineHeight: "1.5", fontSize: "0.95em" }}
                    >
                      {snippet(article.abstract, /<p>(.*?)<\/p>/, 180)}
                    </a>
                  ) : (
                    <p className={AppCSS.recentabstract}>
                      {snippet(article.abstract, /<p>(.*?)<\/p>/, 180)}
                    </p>
                  )}
               
              </div>
            );
          })}
          </div>
        </section>
    </div>
  );
};

export default Dashboard;
