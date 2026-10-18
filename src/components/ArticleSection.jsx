import React, { useState } from "react";
import ArticleList from "./ArticleList.jsx";
import TranslationInfo from "./TranslationInfo.jsx";
import AppCSS from "../App.module.css";

const DEFAULT_DISPLAY_LIMIT = 15;

const ArticleSection = ({ topArticles, query, translatedQuery }) => {
  const [showAll, setShowAll] = useState(false);

  const filteredArticles = topArticles.filter((article) => {
    const similarity = Number(article.similarity);
    return !Number.isNaN(similarity) && Math.round(similarity * 100) > 0;
  });

  if (!filteredArticles.length) {
    return null;
  }

  const displayArticles = showAll ? filteredArticles : filteredArticles.slice(0, DEFAULT_DISPLAY_LIMIT);

  return (
    <div className={AppCSS.referencesSection}>
      <h4>Referensi Artikel ({filteredArticles.length} hasil)</h4>
      <TranslationInfo query={query} translatedQuery={translatedQuery} />
      <ArticleList className={AppCSS.articleList} articles={displayArticles} query={query} translatedQuery={translatedQuery}  />
      {filteredArticles.length > DEFAULT_DISPLAY_LIMIT && (
        <div style={{ marginTop: 12 }}>
          <button onClick={() => setShowAll((s) => !s)}>
            {showAll ? `Sembunyikan` : `Tampilkan semua (${filteredArticles.length})`}
          </button>
        </div>
      )}
    </div>
  );
};

export default ArticleSection;
