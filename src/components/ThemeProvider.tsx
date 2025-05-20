import React, { useEffect } from 'react';
import { fetchThemeColorSettings } from '../services/siteSettingsService';

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  useEffect(() => {
    // Try to load theme colors from localStorage first for immediate application
    const cachedThemeColors = localStorage.getItem('themeColors');
    if (cachedThemeColors) {
      try {
        const colors = JSON.parse(cachedThemeColors);
        // Apply navbar colors
        if (colors.navbarBackground && colors.navbarText) {
          document.documentElement.style.setProperty('--navbar-bg-color', colors.navbarBackground);
          document.documentElement.style.setProperty('--navbar-text-color', colors.navbarText);
        }

        // Apply footer colors
        if (colors.footerBackground && colors.footerText) {
          document.documentElement.style.setProperty('--footer-bg-color', colors.footerBackground);
          document.documentElement.style.setProperty('--footer-text-color', colors.footerText);

          // Create a semi-transparent version of the footer text color for the border
          const footerTextColor = colors.footerText;
          // Convert hex to rgba with 0.2 opacity
          let borderColor;
          if (footerTextColor.startsWith('#')) {
            // Parse the hex color
            const r = parseInt(footerTextColor.slice(1, 3), 16);
            const g = parseInt(footerTextColor.slice(3, 5), 16);
            const b = parseInt(footerTextColor.slice(5, 7), 16);
            borderColor = `rgba(${r}, ${g}, ${b}, 0.2)`;
          } else {
            // Fallback if not hex
            borderColor = footerTextColor;
          }

          document.documentElement.style.setProperty('--footer-border-color', borderColor);
        }

        // Apply footer button colors
        if (colors.footerButtonBackground && colors.footerButtonText) {
          document.documentElement.style.setProperty('--footer-button-bg-color', colors.footerButtonBackground);
          document.documentElement.style.setProperty('--footer-button-text-color', colors.footerButtonText);
        }
      } catch (error) {
        console.error('Error parsing cached theme colors:', error);
      }
    }

    // Then fetch the latest theme colors from the server
    const fetchColors = async () => {
      try {
        const colors = await fetchThemeColorSettings();

        // Apply the colors to CSS variables
        document.documentElement.style.setProperty('--navbar-bg-color', colors.navbarBackground);
        document.documentElement.style.setProperty('--navbar-text-color', colors.navbarText);

        // Apply footer colors
        document.documentElement.style.setProperty('--footer-bg-color', colors.footerBackground);
        document.documentElement.style.setProperty('--footer-text-color', colors.footerText);

        // Create a semi-transparent version of the footer text color for the border
        const footerTextColor = colors.footerText;
        // Convert hex to rgba with 0.2 opacity
        let borderColor;
        if (footerTextColor.startsWith('#')) {
          // Parse the hex color
          const r = parseInt(footerTextColor.slice(1, 3), 16);
          const g = parseInt(footerTextColor.slice(3, 5), 16);
          const b = parseInt(footerTextColor.slice(5, 7), 16);
          borderColor = `rgba(${r}, ${g}, ${b}, 0.2)`;
        } else {
          // Fallback if not hex
          borderColor = footerTextColor;
        }

        document.documentElement.style.setProperty('--footer-border-color', borderColor);

        // Apply footer button colors
        document.documentElement.style.setProperty('--footer-button-bg-color', colors.footerButtonBackground);
        document.documentElement.style.setProperty('--footer-button-text-color', colors.footerButtonText);

        // Cache the colors in localStorage for faster loading next time
        localStorage.setItem('themeColors', JSON.stringify(colors));
      } catch (error) {
        console.error('Error fetching theme colors:', error);
      }
    };

    fetchColors();
  }, []);

  return <>{children}</>;
};
