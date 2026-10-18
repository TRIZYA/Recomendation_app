import React, { useMemo, useState } from "react";
import ArticleList from "./ArticleList.jsx";
import AppCSS from "../App.module.css";

const Repository = ({ articles }) => {
  const [sortOrder, setSortOrder] = useState("descA");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUniversity, setSelectedUniversity] = useState("");

  const universities = useMemo(() => {
    const list = articles
      .map((article) => article.University || article.university)
      .filter(Boolean)
      .map((univ) => String(univ).trim())
      .filter(Boolean);

    return Array.from(new Set(list)).sort((a, b) => a.localeCompare(b));
  }, [articles]);

  const normalizeText = (value) =>
    String(value || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();

  const getYearFromDate = (value) => {
    const text = String(value || "").trim();
    if (!text) return 0;
    const match = text.match(/(\d{4})/);
    return match ? Number(match[1]) : 0;
  };

  const filteredArticles = useMemo(() => {
    const normalizedSearchTerm = normalizeText(searchTerm);

    return articles
      .filter((article) => {
        const articleDate = String(article.date || "").trim();
        if (!articleDate) return false;
        if (selectedUniversity) {
          const university = (article.University || article.university || "").toString();
          if (university !== selectedUniversity) return false;
        }
        if (!normalizedSearchTerm) return true;

        const searchableText = normalizeText(
          [
            article.title,
            article.author,
            article.University || article.university,
            Array.isArray(article.keywords) ? article.keywords.join(" ") : "",
            article.abstract,
            article.conclusion,
          ]
            .filter(Boolean)
            .join(" ")
        );

        return searchableText.includes(normalizedSearchTerm);
      })
      .sort((a, b) => {
        if (sortOrder === "ascA") {
          const titleA = a.title?.toLowerCase() || "";
          const titleB = b.title?.toLowerCase() || "";
          return titleA.localeCompare(titleB);
        }
        if (sortOrder === "descA") {
          const titleA = a.title?.toLowerCase() || "";
          const titleB = b.title?.toLowerCase() || "";
          return titleB.localeCompare(titleA);
        }
        if (sortOrder === "ascN") return getYearFromDate(a.date) - getYearFromDate(b.date);
        return getYearFromDate(b.date) - getYearFromDate(a.date);
      });
  }, [articles, searchTerm, sortOrder, selectedUniversity]);

  return (
    <div className={AppCSS.referencesPage}>
      <div className={AppCSS.repositoryHeader}>
        <div>
          <h3>Repositori Jurnal Teknik Informatika</h3>
          <p className={AppCSS.repositoryIntro}>
            Koleksi artikel jurnal Teknik Informatika.
          </p>
        </div>

        <div className={AppCSS.repositoryControls}>
          <div className={AppCSS.repositoryControlsRow}>
            <label>
              Universitas:
              <select
                value={selectedUniversity}
                className={AppCSS.sortOrderSelect}
                onChange={(event) => setSelectedUniversity(event.target.value)}
              >
                <option value="">Semua universitas</option>
                {universities.map((university) => (
                  <option key={university} value={university}>
                    {university}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Urutan:
              <select
                value={sortOrder}
                className={AppCSS.sortOrderSelect}
                onChange={(event) => setSortOrder(event.target.value)}
              >
                <option value="descA">Abjad Tertinggi / Z - A</option>
                <option value="ascA">Abjad Terendah / A - Z</option>
                <option value="descN">Tahun Tertinggi</option>
                <option value="ascN">Tahun Terendah</option>
              </select>
            </label>
          </div>
          <div className={AppCSS.repositorySearchRow}>
            <input
              type="text"
              className={AppCSS.searchRepository}
              placeholder="Cari judul, penulis, universitas, atau kata kunci..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
        </div>
      </div>
      <div className={AppCSS.referencesSection}>

        <ArticleList articles={filteredArticles} query={searchTerm} />
      </div>              
    </div>
  );
};

export default Repository;
