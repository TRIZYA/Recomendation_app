import { useState, useEffect } from 'react';
import Foto from "../assets/long_logo.webp";
import AppCSS from "../App.module.css";

const Sidebar = ({ activePage, onSelectPage }) => {
  const toggleSidebar = () => {
    document
      .querySelector(`.${AppCSS.sidebar}`)
      ?.classList.toggle(AppCSS.collapsed);
  };

  const toggleMenu = () => {
    const sidebar = document.querySelector(`.${AppCSS.sidebar}`);

    if (!sidebar) return;

    const isActive = sidebar.classList.toggle(AppCSS.menuActive);

    sidebar.style.height = isActive
      ? `${sidebar.scrollHeight}px`
      : "56px";
  };

  return (
   <aside className={AppCSS.sidebar}>
      <header className={AppCSS.sidebarHeader}>
        <a href="https://umg.ac.id" className={AppCSS.headerLogo}>
          <img src={Foto} alt="Logo" />
        </a>

        <button
          className={`${AppCSS.toggler} ${AppCSS.sidebarToggler}`}
          onClick={toggleSidebar}
        >
          <span className="material-symbols-rounded">
            chevron_left
          </span>
        </button>

        <button
          className={`${AppCSS.toggler} ${AppCSS.menuToggler}`}
          onClick={toggleMenu}
        >
          <span className="material-symbols-rounded">menu</span>
        </button>
      </header>

      <nav className={AppCSS.sidebarNav}>
        <ul className={`${AppCSS.navList} ${AppCSS.primaryNav}`}>
          {[
            ["dashboard", "Dashboard"],
            ["tips_and_updates", "Rekomendasi"],
            ["folder", "Repositori"],
          ].map(([icon, label]) => (
            <li className={AppCSS.navItem} key={label}>
              <a
                href="#"
                className={`${AppCSS.navLink} ${activePage === label ? AppCSS.activeNavLink : ""}`}
                onClick={(event) => {
                  event.preventDefault();
                  onSelectPage(label);
                }}
              >
                <span
                  className={`material-symbols-rounded ${AppCSS.navIcon}`}
                >
                  {icon}
                </span>

                <span className={AppCSS.navLabel}>{label}</span>
              </a>

              <span className={AppCSS.navTooltip}>{label}</span>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};
export default Sidebar;




 