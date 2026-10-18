import React, { useEffect, useState } from "react";

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getYearFromDate = (value) => {
  const text = String(value || "").trim();
  if (!text) return "";
  const match = text.match(/(\d{4})/);
  return match ? match[1] : "";
};

const formatReference = (article) => {
  const author = article.author ? article.author.toUpperCase() : "UNKNOWN AUTHOR";
  const displayYear = getYearFromDate(article.date);
  const dateLabel = displayYear ? ` (${displayYear})` : "";
  const title = article.title ? article.title.toUpperCase() : "";
  const link = article.link ? article.link.trim() : "";

  if (link) {
    return (
      <span>
        {author}{dateLabel} <a href={link} target="_blank" rel="noreferrer">{title}</a>
      </span>
    );
  }

  return <span>{author}{dateLabel} {title}</span>;
};

const buildSnippet = (text, regex, maxLength = 180) => {
  const match = regex.exec(text);
  if (!match) {
    return text.length <= maxLength ? text : `${text.slice(0, maxLength).trim()}...`;
  }

  const start = Math.max(match.index - Math.floor(maxLength / 2), 0);
  const end = Math.min(start + maxLength, text.length);
  let snippet = text.slice(start, end).trim();

  if (start > 0) snippet = `...${snippet}`;
  if (end < text.length) snippet = `${snippet}...`;

  return snippet;
};

const highlightText = (text, terms) => {
  if (!terms.length) return text;
  const regex = new RegExp(`(${terms.map(escapeRegExp).join("|")})`, "gi");
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (!part) return null;
    const isMatch = terms.some((term) => part.toLowerCase() === term.toLowerCase());
    if (isMatch) {
      return (
        <mark key={index} style={{ backgroundColor: "#fff59d", padding: "0 2px" }}>
          {part}
        </mark>
      );
    }
    return <span key={index}>{part}</span>;
  });
};

const getQuerySnippet = (article, queryTerms) => {
  if (!queryTerms.length) return null;

  const fields = [article.abstract, article.conclusion];
  const regex = new RegExp(`(${queryTerms.map(escapeRegExp).join("|")})`, "gi");

  for (const field of fields) {
    if (!field) continue;
    if (regex.test(field)) {
      const snippet = buildSnippet(field, regex);
      return highlightText(snippet, queryTerms);
    }
    regex.lastIndex = 0;
  }

  const fallback = article.abstract || article.conclusion || "";
  if (!fallback) return null;
  const truncated = fallback.length <= 180 ? fallback : `${fallback.slice(0, 180).trim()}...`;
  return truncated;
};

const ArticleCard = ({ article, queryTerms }) => {
  const snippet = getQuerySnippet(article, queryTerms);
  const algorithmLabel = Array.isArray(article.algorithm)
    ? article.algorithm.join(", ")
    : article.algorithm || "";
  const universityValue = article.University || article.university || (Array.isArray(article.universities) ? article.universities.join(", ") : "");
  const universityLabel = universityValue ? String(universityValue).trim() : "";
    
  return (
    <div>
      <p>
        {formatReference(article)}
        {article.similarity !== undefined && (
          <span style={{ marginLeft: "10px", color: "#666", fontSize: "0.9em" }}>
            <strong>Kemiripan:</strong> {(article.similarity).toFixed(2)}
            {algorithmLabel ? (
              <>
                {' '}
                | <strong>Algoritma:</strong> {algorithmLabel}
                {universityLabel ? (
                  <>
                    {' '}
                    | <strong>Universitas:</strong> {universityLabel}
                  </>
                ) : null}
              </>
            ) : null}
          </span>
        )}
      </p>
      {snippet && (
        <p style={{ marginTop: "8px", color: "#444", lineHeight: "1.5", fontSize: "0.95em" }}>
          {snippet}
        </p>
      )}
    </div>
  );
};

export default ArticleCard;
