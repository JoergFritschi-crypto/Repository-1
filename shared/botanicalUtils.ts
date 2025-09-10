/**
 * Utility functions for botanical name parsing and processing
 */

/**
 * Extracts botanical parts (genus, species, cultivar) from a scientific name
 * @param scientificName The scientific name to parse
 * @returns Object containing genus, species, and cultivar (if present)
 */
export function extractBotanicalParts(scientificName: string): {
  genus: string | null;
  species: string | null;
  cultivar: string | null;
} {
  if (!scientificName || typeof scientificName !== 'string') {
    return { genus: null, species: null, cultivar: null };
  }

  // Remove extra whitespace and trim
  const cleanName = scientificName.trim().replace(/\s+/g, ' ');
  
  // Initialize result
  let genus: string | null = null;
  let species: string | null = null;
  let cultivar: string | null = null;
  
  // Extract cultivar if present (in single quotes or after 'cv.')
  let nameWithoutCultivar = cleanName;
  
  // Check for cultivar in single quotes
  const cultivarMatch = cleanName.match(/['']([^'']+)['']|"([^"]+)"/);
  if (cultivarMatch) {
    cultivar = cultivarMatch[1] || cultivarMatch[2];
    nameWithoutCultivar = cleanName.replace(/['']([^'']+)['']|"([^"]+)"/, '').trim();
  }
  
  // Check for cultivar after 'cv.'
  const cvMatch = nameWithoutCultivar.match(/\bcv\.\s*(.+)$/i);
  if (cvMatch && !cultivar) {
    cultivar = cvMatch[1].trim();
    nameWithoutCultivar = nameWithoutCultivar.replace(/\bcv\.\s*.+$/i, '').trim();
  }
  
  // Split the remaining name into parts
  const parts = nameWithoutCultivar.split(' ').filter(part => 
    part.length > 0 && 
    !part.match(/^(var\.|subsp\.|ssp\.|f\.|forma)$/i) // Skip botanical rank indicators
  );
  
  // Extract genus and species
  if (parts.length > 0) {
    // Genus is typically the first word and starts with capital letter
    genus = parts[0];
    
    // Normalize genus to proper case (first letter uppercase, rest lowercase)
    if (genus) {
      genus = genus.charAt(0).toUpperCase() + genus.slice(1).toLowerCase();
    }
  }
  
  if (parts.length > 1) {
    // Species is typically the second word and is lowercase
    species = parts[1].toLowerCase();
    
    // Handle hybrid notation (×)
    if (species.startsWith('×') || species.startsWith('x')) {
      species = species.replace(/^[×x]/, '').trim();
    }
  }
  
  // Handle subspecies or variety
  if (parts.length > 2) {
    // Check if third part is a subspecies or variety indicator
    const thirdPart = parts[2].toLowerCase();
    if (!thirdPart.match(/^(var\.|subsp\.|ssp\.|f\.|forma)$/i)) {
      // If it's not a rank indicator and we don't have a cultivar yet, 
      // it might be part of the species or a cultivar
      if (!cultivar && parts.length === 3) {
        // Could be a subspecies without indicator
        species = `${species} ${thirdPart}`;
      }
    } else if (parts.length > 3) {
      // There's a rank indicator, so the next part is the subspecies/variety name
      species = `${species} ${parts[2]} ${parts[3]}`;
    }
  }
  
  return {
    genus: genus || null,
    species: species || null,
    cultivar: cultivar || null
  };
}

/**
 * Formats botanical parts back into a scientific name
 * @param genus The genus name
 * @param species The species name (optional)
 * @param cultivar The cultivar name (optional)
 * @returns Formatted scientific name
 */
export function formatScientificName(
  genus: string | null,
  species: string | null = null,
  cultivar: string | null = null
): string {
  let name = genus || 'Unknown';
  
  if (species) {
    name += ` ${species}`;
  }
  
  if (cultivar) {
    name += ` '${cultivar}'`;
  }
  
  return name;
}