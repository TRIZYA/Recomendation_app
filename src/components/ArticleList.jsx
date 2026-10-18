import React, { useEffect, useState } from "react";
import ArticleCard from "./ArticleCard";
import { preprocessText } from "../utils/recommendationPipeline.js";

const ArticleList = ({ articles: initialArticles = [], fetchUrl = "/api/articles", query, translatedQuery, className }) => {
  const [items, setItems] = useState(initialArticles || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Build activeQuery (may be empty)
  let activeQuery = "";
  if (translatedQuery && !query) activeQuery = translatedQuery;
  else if (!translatedQuery && query) activeQuery = query;
  else if (translatedQuery && query) activeQuery = `${translatedQuery} ${query}`;

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      // If parent provided articles, use them
      if (initialArticles && initialArticles.length) {
        setItems(initialArticles);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const res = await fetch(fetchUrl);
        if (!res.ok) throw new Error(`Fetch error: ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        setItems(Array.isArray(data) ? data : []);
      } catch (err) {
        if (cancelled) return;
        setError(err.message || String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [fetchUrl, initialArticles]);

  return (
    <div className={className}>
      {loading && <div>Loading articles...</div>}
      {error && <div style={{ color: "red" }}>Error: {error}</div>}
      {!loading && !error && items && items.length === 0 && <div>No articles found.</div>}
      {!loading && !error && items && items.map((article) => (
        <ArticleCard
          key={article.id || article.link || article.title}
          article={article}
          queryTerms={preprocessText(activeQuery)}
        />
      ))}
    </div>
  );
};

export default ArticleList;
