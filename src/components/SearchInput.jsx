import React, { useEffect, useState } from "react";
import AppCSS from "../App.module.css";

const SearchInput = ({ query, onSearch }) => (
  <input
    type="text"
    placeholder="Masukkan judul penelitian minimal 3 kata..."
    value={query}
    onChange={onSearch}
    className={AppCSS.searchInput}
  />
);

export default SearchInput;
