import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase.js";
import {
  calculateTfIdf,
  normalizeArticle,
  getAllUniqueAlgorithms,
  detectAlgorithmsInQuery,
  translateQuery,
  recommendAlgorithmDualLanguage,
  recommendArticlesDualLanguage,
  prewarmAlgorithmDomains,
} from "./utils/recommendationPipeline.js";
import SearchInput from "./components/SearchInput.jsx";
import RecommendationAlgorithmsPanel from "./components/RecommendationAlgorithmsPanel.jsx";
import DetectedAlgorithmsPanel from "./components/DetectedAlgorithmsPanel.jsx";
import ArticleSection from "./components/ArticleSection.jsx";
import Dashboard from "./components/Dashboard.jsx";
import Repository from "./components/Repository.jsx";
import Sidebar from "./components/Sidebar.jsx";
import AppCSS from "./App.module.css";
import useDebounce from "./hooks/useDebounce.js";

const App = () => {
  const [query, setQuery] = useState("");
  const [translatedQuery, setTranslatedQuery] = useState("");
  const [recommendedAlgorithms, setRecommendedAlgorithms] = useState([]);
  const [topArticles, setTopArticles] = useState([]);
  const [detectedAlgorithms, setDetectedAlgorithms] = useState([]);
  const [articlesData, setArticlesData] = useState([]);
  const [tfidfMatrix, setTfidfMatrix] = useState([]);
  const [terms, setTerms] = useState([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [puterLoading, setPuterLoading] = useState(false);

  useEffect(() => {
    const fetchArticles = async () => {
      const querySnapshot = await getDocs(collection(db, "articles"));
      const articles = [];
      querySnapshot.forEach((doc) => {
        articles.push(normalizeArticle(doc));
      });
      setArticlesData(articles);
      setIsLoading(false);
    };

    fetchArticles();
  }, []);

  const buildArticleSearchText = (article) => {
    const keywordText = Array.isArray(article.keywords) ? article.keywords.join(" ") : "";
    const weightedParts = [
      article.title,
      article.title,
      article.title,
      keywordText,
      keywordText,
      article.abstract || "",
      article.conclusion || "",
    ]
      .filter(Boolean)
      .join(" ");

    const content = weightedParts.trim();
    return content.length <= 2000 ? content : content.slice(0, 2000);
  };

  useEffect(() => {
    if (!articlesData.length) {
      return;
    }

    const searchTexts = articlesData.map((article) => buildArticleSearchText(article));
    const { tfidfMatrix: matrix, terms: generatedTerms } = calculateTfIdf(searchTexts);
    setTfidfMatrix(matrix);
    setTerms(generatedTerms);
  }, [articlesData]);

  const handleSearch = (e) => setQuery(e.target.value);
  const debouncedQuery = useDebounce(query, 700);

  const runSearch = async (inputQuery) => {
    const trimmedQuery = inputQuery.trim();
    const wordCount = trimmedQuery === "" ? 0 : trimmedQuery.split(/\s+/).length;

    if (!trimmedQuery || wordCount < 3) {
      setIsSearching(false);
      setRecommendedAlgorithms([]);
      setTopArticles([]);
      setDetectedAlgorithms([]);
      setTranslatedQuery("");
      return;
    }

    setIsSearching(true);

    try {
      const translated = await translateQuery(inputQuery, "en");
      setTranslatedQuery(translated);

      const allAlgorithms = getAllUniqueAlgorithms(articlesData);
      let queriedAlgorithms = detectAlgorithmsInQuery(inputQuery, allAlgorithms);

      if (!queriedAlgorithms.length && translated !== inputQuery) {
        queriedAlgorithms = detectAlgorithmsInQuery(translated, allAlgorithms);
      }

      setDetectedAlgorithms(queriedAlgorithms);

      setRecommendedAlgorithms(
        await recommendAlgorithmDualLanguage(
          inputQuery,
          translated,
          articlesData,
          tfidfMatrix,
          terms,
          queriedAlgorithms
        )
      );

      setTopArticles(
        recommendArticlesDualLanguage(
          inputQuery,
          translated,
          articlesData,
          tfidfMatrix,
          terms,
          queriedAlgorithms
        )
      );
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (debouncedQuery === undefined || debouncedQuery === null) return;
    runSearch(debouncedQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handler = (e) => {
      try {
        setPuterLoading(Boolean(e.detail && e.detail.loading));
      } catch (err) {
        // ignore
      }
    };

    window.addEventListener("puter-loading", handler);
    return () => window.removeEventListener("puter-loading", handler);
  }, []);

  const [activePage, setActivePage] = useState("Dashboard");
  const queryLength = query.trim() ? query.trim().split(/\s+/).length : 0;

  return (
    <div className={AppCSS.appContainer}>
      <Sidebar activePage={activePage} onSelectPage={setActivePage} />
      <div className={AppCSS.content}>
        {isLoading && <p>Memuat data...</p>}

        {!isLoading && activePage === "Dashboard" && <Dashboard data={articlesData} />}

        {!isLoading && activePage === "Rekomendasi" && (
          <>
            <h3>Rekomendasi Algoritma Untuk Penelitian Menggunakan Cosine Similarity</h3>
            <SearchInput query={query} onSearch={handleSearch} />
            <DetectedAlgorithmsPanel detectedAlgorithms={detectedAlgorithms} />
            <RecommendationAlgorithmsPanel
              recommendedAlgorithms={recommendedAlgorithms}
              queryLength={queryLength}
              isSearching={isSearching || puterLoading}
            />
            <ArticleSection topArticles={topArticles} query={query} translatedQuery={translatedQuery} />
          </>
        )}

        {!isLoading && activePage === "Repositori" && <Repository articles={articlesData} />}
      </div>
    </div>
  );
};

export default App;
