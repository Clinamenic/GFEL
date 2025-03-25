import { QuartzComponentConstructor, QuartzComponentProps } from "./types"

// Preact hooks (instead of React)
import { useCallback, useEffect, useState } from "preact/hooks"

interface Options {
  title?: string
  links?: Record<string, string>
}

// This is the correct pattern for Quartz components
const Header: QuartzComponentConstructor<Options> = (opts) => {
  const title = opts?.title ?? "Ethereum Localism"
  const links = opts?.links ?? {
    Introduction: "/introduction",
    Knowledge: "/knowledge",
    Initiatives: "/initiatives",
    Resources: "/resources",
  }

  // This inner function is what gets called during rendering
  function HeaderComponent(props: QuartzComponentProps) {
    return (
      <header>
        <div className="container flex h-14 items-center">
          <div className="mr-4 flex">
          <a href="/" className="mr-6 flex items-center space-x-2">
          <img
          src="https://raw.githubusercontent.com/Clinamenic/GFEL/main/logo.png?v=2"
          alt="Ethereum Localism"
          style={{ height: "2.5rem", objectFit: "contain" }}
            /> 
          </a>
          </div>
          <div className="flex flex-1 items-center justify-end space-x-2">
            {/* Children (Darkmode, Search) are rendered here */}
            <div className="header-actions">
              {props.children}
            </div>
            
            <button
              id="mobile-menu-button"
              aria-label="Toggle menu"
              className="mobile-nav-trigger"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>

        {/* Navigation menu */}
        <div id="nav-menu" className="nav-menu">
          <div className="nav-menu-content">
            <a href="/">Home</a>
            {Object.entries(links).map(([text, href]) => (
              <a key={href} href={href}>{text}</a>
            ))}
            <a href="/introduction/action-kit">Action Kit</a>
          </div>
        </div>

        {/* Overlay to detect clicks outside of menu */}
        <div id="nav-menu-overlay" className="nav-menu-overlay"></div>
      </header>
    )
  }

  // Add afterDOMLoaded script to the component
  HeaderComponent.afterDOMLoaded = `
    document.addEventListener('DOMContentLoaded', function() {
      const menuButton = document.getElementById('mobile-menu-button');
      const navMenu = document.getElementById('nav-menu');
      const overlay = document.getElementById('nav-menu-overlay');
      
      if (menuButton && navMenu && overlay) {
        // Toggle menu when clicking the button
        menuButton.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          
          const isOpen = navMenu.classList.contains('open');
          
          if (isOpen) {
            navMenu.classList.remove('open');
            overlay.classList.remove('open');
          } else {
            navMenu.classList.add('open');
            overlay.classList.add('open');
          }
        });
        
        // Close menu when clicking overlay
        overlay.addEventListener('click', function() {
          navMenu.classList.remove('open');
          overlay.classList.remove('open');
        });
        
        // Close menu when pressing escape
        document.addEventListener('keydown', function(e) {
          if (e.key === 'Escape' && navMenu.classList.contains('open')) {
            navMenu.classList.remove('open');
            overlay.classList.remove('open');
          }
        });
        
        // Close menu when clicking menu items
        const menuLinks = navMenu.querySelectorAll('a');
        menuLinks.forEach(link => {
          link.addEventListener('click', function() {
            navMenu.classList.remove('open');
            overlay.classList.remove('open');
          });
        });
      }
      
      // Position the search container correctly with the fixed header
      const searchContainer = document.getElementById('search-container');
      if (searchContainer) {
        searchContainer.style.position = 'fixed';
        searchContainer.style.top = '3.5rem';
      }
    });

    // Change variables for dark mode
    const darkModeHandler = () => {
      if (document.documentElement.classList.contains('dark')) {
        document.documentElement.style.setProperty('--border', 'rgb(55, 65, 81)');
      } else {
        document.documentElement.style.setProperty('--border', 'rgb(229, 231, 235)');
      }
    }

    // Initialize and attach to theme change event
    darkModeHandler();
    window.addEventListener('themechange', darkModeHandler);
  `

  return HeaderComponent
}

export default Header
