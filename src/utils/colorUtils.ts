/**
 * Utility functions for color manipulation
 */

/**
 * Converts a hex color to RGB
 * @param hex Hex color string (e.g., "#FFFFFF")
 * @returns RGB color object
 */
export const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  // Remove # if present
  hex = hex.replace(/^#/, '');

  // Handle shorthand hex (e.g., #FFF)
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }

  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    }
    : null;
};

/**
 * Converts RGB to hex color
 * @param r Red (0-255)
 * @param g Green (0-255)
 * @param b Blue (0-255)
 * @returns Hex color string
 */
export const rgbToHex = (r: number, g: number, b: number): string => {
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
};

/**
 * Calculates the perceived brightness of a color (0-1)
 * Uses the formula: (0.299*R + 0.587*G + 0.114*B) / 255
 * @param color Hex color string
 * @returns Brightness value between 0 (dark) and 1 (light)
 */
export const getColorBrightness = (color: string): number => {
  const rgb = hexToRgb(color);
  if (!rgb) return 0.5; // Default to middle brightness if invalid color

  // Calculate perceived brightness
  // Formula: (0.299*R + 0.587*G + 0.114*B) / 255
  return (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
};

/**
 * Determines if a color is light or dark
 * @param color Hex color string
 * @returns Boolean indicating if color is light
 */
export const isLightColor = (color: string): boolean => {
  return getColorBrightness(color) > 0.5;
};

/**
 * Adjusts a color's brightness
 * @param color Hex color string
 * @param amount Amount to adjust (-1 to 1, negative darkens, positive lightens)
 * @returns Adjusted hex color
 */
export const adjustBrightness = (color: string, amount: number): string => {
  const rgb = hexToRgb(color);
  if (!rgb) return color;

  // Adjust each channel
  const r = Math.max(0, Math.min(255, Math.round(rgb.r + amount * 255)));
  const g = Math.max(0, Math.min(255, Math.round(rgb.g + amount * 255)));
  const b = Math.max(0, Math.min(255, Math.round(rgb.b + amount * 255)));

  return rgbToHex(r, g, b);
};

/**
 * Generates an appropriate hover color based on the base color
 * For light colors, it darkens; for dark colors, it lightens
 * @param baseColor Base color in hex format
 * @returns Hover color in hex format
 */
export const generateHoverColor = (baseColor: string): string => {
  // Convert to RGB for better color manipulation
  const rgb = hexToRgb(baseColor);
  if (!rgb) return baseColor;

  // Calculate perceived brightness
  const brightness = getColorBrightness(baseColor);

  // Determine if the color is light or dark
  const isLight = brightness > 0.5;

  // Create a more dramatic effect for hover
  let r, g, b;

  if (isLight) {
    // For light colors, darken by reducing each channel
    const darkenFactor = 0.3; // 30% darker
    r = Math.max(0, Math.round(rgb.r * (1 - darkenFactor)));
    g = Math.max(0, Math.round(rgb.g * (1 - darkenFactor)));
    b = Math.max(0, Math.round(rgb.b * (1 - darkenFactor)));
  } else {
    // For dark colors, lighten by increasing each channel
    const lightenFactor = 0.5; // 50% lighter
    r = Math.min(255, Math.round(rgb.r + (255 - rgb.r) * lightenFactor));
    g = Math.min(255, Math.round(rgb.g + (255 - rgb.g) * lightenFactor));
    b = Math.min(255, Math.round(rgb.b + (255 - rgb.b) * lightenFactor));
  }

  // Convert back to hex
  const hoverColor = rgbToHex(r, g, b);

  console.log(`Original color: ${baseColor}, Hover color: ${hoverColor}, Is light: ${isLight}`);

  return hoverColor;
};
