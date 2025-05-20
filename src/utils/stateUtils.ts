// Utility functions for handling state names and codes

// Map of US state names to their two-letter codes
export const stateNameToCode: Record<string, string> = {
  'alabama': 'AL',
  'alaska': 'AK',
  'arizona': 'AZ',
  'arkansas': 'AR',
  'california': 'CA',
  'colorado': 'CO',
  'connecticut': 'CT',
  'delaware': 'DE',
  'florida': 'FL',
  'georgia': 'GA',
  'hawaii': 'HI',
  'idaho': 'ID',
  'illinois': 'IL',
  'indiana': 'IN',
  'iowa': 'IA',
  'kansas': 'KS',
  'kentucky': 'KY',
  'louisiana': 'LA',
  'maine': 'ME',
  'maryland': 'MD',
  'massachusetts': 'MA',
  'michigan': 'MI',
  'minnesota': 'MN',
  'mississippi': 'MS',
  'missouri': 'MO',
  'montana': 'MT',
  'nebraska': 'NE',
  'nevada': 'NV',
  'new hampshire': 'NH',
  'new jersey': 'NJ',
  'new mexico': 'NM',
  'new york': 'NY',
  'north carolina': 'NC',
  'north dakota': 'ND',
  'ohio': 'OH',
  'oklahoma': 'OK',
  'oregon': 'OR',
  'pennsylvania': 'PA',
  'rhode island': 'RI',
  'south carolina': 'SC',
  'south dakota': 'SD',
  'tennessee': 'TN',
  'texas': 'TX',
  'utah': 'UT',
  'vermont': 'VT',
  'virginia': 'VA',
  'washington': 'WA',
  'west virginia': 'WV',
  'wisconsin': 'WI',
  'wyoming': 'WY',
  'district of columbia': 'DC',
  'american samoa': 'AS',
  'guam': 'GU',
  'northern mariana islands': 'MP',
  'puerto rico': 'PR',
  'united states minor outlying islands': 'UM',
  'u.s. virgin islands': 'VI',
};

/**
 * Converts a state name to its two-letter code
 * @param stateName The full name of the state
 * @returns The two-letter state code or the original string if not found
 */
export const getStateCode = (stateName: string): string => {
  if (!stateName) return '';
  
  // If it's already a 2-letter code, return it
  if (stateName.length === 2 && stateName === stateName.toUpperCase()) {
    return stateName;
  }
  
  // Try to find the state code
  const stateCode = stateNameToCode[stateName.toLowerCase()];
  
  // Return the code if found, otherwise return the first 2 characters
  return stateCode || stateName.substring(0, 2).toUpperCase();
};
