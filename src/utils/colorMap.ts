import { Color } from '../types';

/**
 * Centralized color mapping for consistent color display across the application
 * Maps color names to their corresponding hex values
 */
export const colorMap: Record<Color, string> = {
  'white': '#FFFFFF',
  'black': '#000000',
  'sport-grey': '#CACACA',
  'ice-grey': '#D7D6D3',
  'dark-heather-grey': '#3A3D42',
  'dark-chocolate': '#31221D',
  'maroon': '#642838',
  'tropical-blue': '#0097A9',
  'sand': '#DCD2BE',
  'mint-green': '#B1E0C0',
  'sage': '#A4B09E',
  'military-green': '#62664C',
  'forest-green': '#223B26',
  'light-blue': '#D6E6F7',
  'navy': '#1A2237',
  'light-pink': '#FEE0EB',
  'antique-heliconia': '#B92972',
  'heather-orange': '#FF8B4A',
  'coral-silk': '#E67376'
};

/**
 * Get the hex color value for a given color name
 * @param color - The color name
 * @returns The hex color value or the original color if not found
 */
export const getColorHex = (color: string): string => {
  return colorMap[color as Color] || color;
};

/**
 * Format color name for display (convert kebab-case to Title Case)
 * @param color - The color name in kebab-case
 * @returns Formatted color name
 */
export const formatColorName = (color: string): string => {
  return color
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Get all available colors
 * @returns Array of all color names
 */
export const getAllColors = (): Color[] => {
  return Object.keys(colorMap) as Color[];
};

/**
 * Validate if a color exists in the color map
 * @param color - The color name to validate
 * @returns True if the color exists, false otherwise
 */
export const isValidColor = (color: string): color is Color => {
  return color in colorMap;
};
