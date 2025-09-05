export const GARDEN_STYLES = {
  ROMANTIC_COUNTRY: {
    id: 'romantic-country',
    name: 'Romantic/Country Garden',
    description: 'Lush, informal plantings with flowing pathways and abundant blooms, embracing English and French country influences for a cozy, timeless atmosphere',
    keyCharacteristics: [
      'Informal, naturalistic planting style',
      'Abundant seasonal blooms',
      'Curved, flowing pathways',
      'Mixed borders with layered heights',
      'Vintage or rustic garden features'
    ],
    signaturePlants: [
      'Roses (climbing and shrub varieties)',
      'Lavender',
      'Peonies',
      'Foxgloves',
      'Delphiniums',
      'Hollyhocks',
      'Sweet peas'
    ],
    maintenanceLevel: 'medium-high',
    suitableFor: ['large gardens', 'cottage properties', 'rural settings']
  },
  
  CLASSIC_FORMAL: {
    id: 'classic-formal',
    name: 'Classic/Formal Garden',
    description: 'Emphasizes symmetry, geometric layouts, clipped hedges, defined borders, and focal points like statues or water features, inspired by European traditions',
    keyCharacteristics: [
      'Symmetrical design and geometric patterns',
      'Clipped hedges and topiary',
      'Defined borders and edges',
      'Central axis with focal points',
      'Formal water features or statuary'
    ],
    signaturePlants: [
      'Boxwood hedging',
      'Yew topiary',
      'Standard roses',
      'Formal annuals (begonias, impatiens)',
      'Alliums',
      'Tulips in formal beds'
    ],
    maintenanceLevel: 'high',
    suitableFor: ['estates', 'historical properties', 'urban gardens with structure']
  },
  
  KARL_FOERSTER_CONTEMPORARY: {
    id: 'karl-foerster',
    name: 'Karl Foerster Type/Contemporary Perennial Garden',
    description: 'Naturalistic plantings with ornamental grasses and robust perennials, blending wild and designed elements with focus on sustainability and year-round interest',
    keyCharacteristics: [
      'Naturalistic planting design',
      'Heavy use of ornamental grasses',
      'Four-season interest',
      'Ecological approach',
      'Plant-driven composition',
      'Minimal hardscaping'
    ],
    signaturePlants: [
      "Calamagrostis 'Karl Foerster'",
      'Miscanthus varieties',
      'Echinacea',
      'Rudbeckia',
      'Sedum varieties',
      'Salvia nemorosa',
      'Achillea'
    ],
    maintenanceLevel: 'low-medium',
    suitableFor: ['modern homes', 'ecological gardens', 'prairie-style landscapes']
  },
  
  COTTAGE: {
    id: 'cottage',
    name: 'Cottage Garden',
    description: 'Informal, romantic mix of flowers with climbing plants, pastel colors, and hidden nooks, encouraging biodiversity and sensory appeal',
    keyCharacteristics: [
      'Dense, informal plantings',
      'Self-seeding annuals and biennials',
      'Climbing plants on structures',
      'Pastel color palette',
      'Edibles mixed with ornamentals',
      'Picket fences and arbors'
    ],
    signaturePlants: [
      'Foxgloves',
      'Delphiniums',
      'Clematis',
      'Cottage roses',
      'Lupines',
      'Campanulas',
      'Sweet William'
    ],
    maintenanceLevel: 'medium',
    suitableFor: ['small gardens', 'residential properties', 'country homes']
  },
  
  MEDITERRANEAN: {
    id: 'mediterranean',
    name: 'Mediterranean Garden',
    description: 'Drought-tolerant species with terracotta materials, aromatic herbs, and warm color palettes evoking relaxed Mediterranean living',
    keyCharacteristics: [
      'Drought-tolerant plantings',
      'Gravel or decomposed granite paths',
      'Terracotta pots and tiles',
      'Aromatic herbs',
      'Warm color palette',
      'Outdoor living spaces'
    ],
    signaturePlants: [
      'Lavender',
      'Rosemary',
      'Thyme',
      'Olive trees',
      'Citrus trees',
      'Agapanthus',
      'Santolina'
    ],
    maintenanceLevel: 'low',
    suitableFor: ['dry climates', 'water-wise gardens', 'sunny exposures']
  },
  
  MODERNIST_MINIMALIST: {
    id: 'modernist',
    name: 'Modernist/Minimalist Garden',
    description: 'Clean lines, geometric spaces, architectural plants, and minimalist plantings with contemporary materials for a sleek look',
    keyCharacteristics: [
      'Clean, geometric lines',
      'Limited plant palette',
      'Architectural plants',
      'Contemporary materials',
      'Negative space as design element',
      'Monochromatic schemes'
    ],
    signaturePlants: [
      'Bamboo',
      'Ornamental grasses',
      'Agave',
      'Boxwood spheres',
      'Japanese maples',
      'Alliums',
      'White hydrangeas'
    ],
    maintenanceLevel: 'low-medium',
    suitableFor: ['modern architecture', 'urban gardens', 'small spaces']
  },
  
  JAPANESE: {
    id: 'japanese',
    name: 'Japanese Garden',
    description: 'Subtle, tranquil designs using rocks, water elements, moss, and carefully pruned plants for meditative and balanced environments',
    keyCharacteristics: [
      'Asymmetrical balance',
      'Rock and gravel features',
      'Water elements',
      'Carefully pruned trees',
      'Moss groundcover',
      'Meditation spaces'
    ],
    signaturePlants: [
      'Japanese maples',
      'Pine (pruned)',
      'Bamboo',
      'Moss',
      'Ferns',
      'Azaleas',
      'Hostas'
    ],
    maintenanceLevel: 'medium-high',
    suitableFor: ['contemplative spaces', 'shaded areas', 'small gardens']
  },
  
  GRAVEL_ROCK: {
    id: 'gravel-rock',
    name: 'Gravel/Rock Garden',
    description: 'Xeriscape, alpine, or desert plants in gravel or rock settings, perfect for low-water landscapes',
    keyCharacteristics: [
      'Gravel or rock mulch',
      'Drought-tolerant plants',
      'Rock features and boulders',
      'Minimal water requirements',
      'Sculptural plant forms'
    ],
    signaturePlants: [
      'Sedums',
      'Sempervivums',
      'Ornamental grasses',
      'Agaves',
      'Yuccas',
      'Alpine plants',
      'Cacti (in appropriate climates)'
    ],
    maintenanceLevel: 'low',
    suitableFor: ['dry climates', 'slopes', 'rock gardens']
  },
  
  WOODLAND_ECOLOGICAL: {
    id: 'woodland',
    name: 'Woodland/Ecological Garden',
    description: 'Shade-loving native plants in naturalistic settings, emphasizing ecological balance and low maintenance',
    keyCharacteristics: [
      'Layered canopy structure',
      'Native plant focus',
      'Shade-tolerant species',
      'Natural mulch',
      'Wildlife habitat features',
      'Minimal intervention'
    ],
    signaturePlants: [
      'Native ferns',
      'Hostas',
      'Astilbes',
      'Bleeding hearts',
      'Native woodland wildflowers',
      'Understory shrubs',
      'Native trees'
    ],
    maintenanceLevel: 'low',
    suitableFor: ['shaded properties', 'native gardens', 'wildlife gardens']
  },
  
  TROPICAL: {
    id: 'tropical',
    name: 'Tropical Garden',
    description: 'Exotic foliage with bold colors and dramatic textures, creating a lush paradise atmosphere',
    keyCharacteristics: [
      'Large-leaved plants',
      'Bold, vibrant colors',
      'Dense, layered plantings',
      'High humidity plants',
      'Dramatic textures',
      'Water features'
    ],
    signaturePlants: [
      'Palms',
      'Bananas',
      'Cannas',
      'Elephant ears',
      'Bird of paradise',
      'Gingers',
      'Tropical hibiscus'
    ],
    maintenanceLevel: 'medium-high',
    suitableFor: ['warm climates', 'protected gardens', 'conservatories']
  }
} as const;

export type GardenStyleId = keyof typeof GARDEN_STYLES;
export type GardenStyle = typeof GARDEN_STYLES[GardenStyleId];

export const CORE_GARDEN_STYLES = [
  'ROMANTIC_COUNTRY',
  'CLASSIC_FORMAL', 
  'KARL_FOERSTER_CONTEMPORARY',
  'COTTAGE',
  'MEDITERRANEAN',
  'MODERNIST_MINIMALIST',
  'JAPANESE'
] as const;

export const ADDITIONAL_GARDEN_STYLES = [
  'GRAVEL_ROCK',
  'WOODLAND_ECOLOGICAL',
  'TROPICAL'
] as const;