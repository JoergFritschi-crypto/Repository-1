import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Garden Tool Icon Components using our 5-color system
const WateringCanIcon = ({ size = 48 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    {/* Main body - British racing green */}
    <path d="M25 35 L65 35 L65 70 Q65 75 60 75 L30 75 Q25 75 25 70 Z" fill="hsl(var(--british-racing-green))" />
    {/* Handle - Gold */}
    <path d="M65 45 Q75 45 75 55 Q75 65 65 65" stroke="hsl(var(--gold))" strokeWidth="3" fill="none" />
    {/* Spout - Dark spring green */}
    <path d="M25 50 L10 45 Q5 43 5 48 Q5 53 10 51 L25 55 Z" fill="hsl(var(--dark-spring-green))" />
    {/* Top handle - Gold */}
    <ellipse cx="45" cy="30" rx="8" ry="3" fill="hsl(var(--gold))" />
    <rect x="42" y="25" width="6" height="10" fill="hsl(var(--gold))" rx="3" />
    {/* Water drops - Canary */}
    <circle cx="12" cy="38" r="1.5" fill="hsl(var(--canary))" />
    <circle cx="8" cy="42" r="1" fill="hsl(var(--canary))" />
    <circle cx="15" cy="44" r="1" fill="hsl(var(--canary))" />
  </svg>
);

const SpadeIcon = ({ size = 48 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    {/* Handle - Gold */}
    <rect x="47" y="5" width="6" height="50" fill="hsl(var(--gold))" rx="3" />
    {/* Grip - Dark spring green */}
    <rect x="44" y="15" width="12" height="8" fill="hsl(var(--dark-spring-green))" rx="4" />
    {/* Blade - British racing green */}
    <path d="M35 55 L65 55 L60 85 Q50 90 40 85 Z" fill="hsl(var(--british-racing-green))" />
    {/* Step bar - Dark pastel green */}
    <rect x="40" y="50" width="20" height="4" fill="hsl(var(--dark-pastel-green))" rx="2" />
    {/* Blade edge - Canary highlight */}
    <path d="M42 85 Q50 88 58 85" stroke="hsl(var(--canary))" strokeWidth="2" fill="none" />
  </svg>
);

const ForkIcon = ({ size = 48 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    {/* Handle - Gold */}
    <rect x="47" y="5" width="6" height="45" fill="hsl(var(--gold))" rx="3" />
    {/* Grip - Dark spring green */}
    <rect x="44" y="15" width="12" height="8" fill="hsl(var(--dark-spring-green))" rx="4" />
    {/* Fork base - British racing green */}
    <rect x="35" y="50" width="30" height="8" fill="hsl(var(--british-racing-green))" rx="2" />
    {/* Fork tines - Dark pastel green */}
    <rect x="38" y="58" width="4" height="25" fill="hsl(var(--dark-pastel-green))" rx="2" />
    <rect x="46" y="58" width="4" height="28" fill="hsl(var(--dark-pastel-green))" rx="2" />
    <rect x="54" y="58" width="4" height="25" fill="hsl(var(--dark-pastel-green))" rx="2" />
    {/* Tine tips - Canary */}
    <circle cx="40" cy="85" r="2" fill="hsl(var(--canary))" />
    <circle cx="48" cy="88" r="2" fill="hsl(var(--canary))" />
    <circle cx="56" cy="85" r="2" fill="hsl(var(--canary))" />
  </svg>
);

const TrowelIcon = ({ size = 48 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    {/* Handle - Gold */}
    <rect x="45" y="5" width="10" height="35" fill="hsl(var(--gold))" rx="5" />
    {/* Ferrule - Dark spring green */}
    <rect x="44" y="38" width="12" height="6" fill="hsl(var(--dark-spring-green))" rx="2" />
    {/* Blade - British racing green */}
    <path d="M40 44 L60 44 L55 75 Q50 80 45 75 Z" fill="hsl(var(--british-racing-green))" />
    {/* Blade edge - Canary */}
    <path d="M47 75 Q50 78 53 75" stroke="hsl(var(--canary))" strokeWidth="2" fill="none" />
    {/* Handle grip lines - Dark pastel green */}
    <line x1="47" y1="15" x2="53" y2="15" stroke="hsl(var(--dark-pastel-green))" strokeWidth="1" />
    <line x1="47" y1="25" x2="53" y2="25" stroke="hsl(var(--dark-pastel-green))" strokeWidth="1" />
  </svg>
);

const PruningShearIcon = ({ size = 48 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    {/* Handle 1 - Gold */}
    <path d="M20 20 Q15 25 20 35 L35 50 Q40 45 35 40 Z" fill="hsl(var(--gold))" />
    {/* Handle 2 - Gold */}
    <path d="M80 20 Q85 25 80 35 L65 50 Q60 45 65 40 Z" fill="hsl(var(--gold))" />
    {/* Blade 1 - British racing green */}
    <path d="M35 50 Q45 55 50 50 Q45 45 35 50" fill="hsl(var(--british-racing-green))" />
    {/* Blade 2 - Dark spring green */}
    <path d="M65 50 Q55 55 50 50 Q55 45 65 50" fill="hsl(var(--dark-spring-green))" />
    {/* Pivot - Canary */}
    <circle cx="50" cy="50" r="4" fill="hsl(var(--canary))" />
    {/* Spring - Dark pastel green */}
    <path d="M45 35 Q50 30 55 35" stroke="hsl(var(--dark-pastel-green))" strokeWidth="2" fill="none" />
  </svg>
);

const RakeIcon = ({ size = 48 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    {/* Handle - Gold */}
    <rect x="47" y="5" width="6" height="55" fill="hsl(var(--gold))" rx="3" />
    {/* Head base - British racing green */}
    <rect x="25" y="60" width="50" height="6" fill="hsl(var(--british-racing-green))" rx="3" />
    {/* Rake tines - Dark spring green */}
    <rect x="28" y="66" width="2" height="15" fill="hsl(var(--dark-spring-green))" />
    <rect x="35" y="66" width="2" height="18" fill="hsl(var(--dark-spring-green))" />
    <rect x="42" y="66" width="2" height="15" fill="hsl(var(--dark-spring-green))" />
    <rect x="49" y="66" width="2" height="18" fill="hsl(var(--dark-spring-green))" />
    <rect x="56" y="66" width="2" height="15" fill="hsl(var(--dark-spring-green))" />
    <rect x="63" y="66" width="2" height="18" fill="hsl(var(--dark-spring-green))" />
    <rect x="70" y="66" width="2" height="15" fill="hsl(var(--dark-spring-green))" />
    {/* Connection - Dark pastel green */}
    <rect x="46" y="58" width="8" height="4" fill="hsl(var(--dark-pastel-green))" rx="2" />
  </svg>
);

const HoeIcon = ({ size = 48 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    {/* Handle - Gold */}
    <rect x="15" y="15" width="6" height="70" fill="hsl(var(--gold))" rx="3" transform="rotate(-15)" />
    {/* Blade - British racing green */}
    <rect x="45" y="65" width="25" height="8" fill="hsl(var(--british-racing-green))" rx="2" />
    {/* Connection - Dark spring green */}
    <rect x="35" y="60" width="15" height="4" fill="hsl(var(--dark-spring-green))" rx="2" />
    {/* Blade edge - Canary */}
    <rect x="45" y="71" width="25" height="2" fill="hsl(var(--canary))" rx="1" />
  </svg>
);

const SeedPacketIcon = ({ size = 48 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    {/* Packet - Card background */}
    <rect x="25" y="15" width="50" height="70" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="2" rx="4" />
    {/* Top seal - Gold */}
    <rect x="25" y="15" width="50" height="12" fill="hsl(var(--gold))" rx="4" />
    {/* Plant illustration - British racing green */}
    <path d="M45 35 Q40 40 45 50 Q50 40 55 35 Q50 30 45 35" fill="hsl(var(--british-racing-green))" />
    <rect x="47" y="50" width="6" height="15" fill="hsl(var(--dark-spring-green))" rx="1" />
    {/* Seeds - Dark pastel green */}
    <circle cx="40" cy="70" r="2" fill="hsl(var(--dark-pastel-green))" />
    <circle cx="50" cy="72" r="2" fill="hsl(var(--dark-pastel-green))" />
    <circle cx="60" cy="69" r="2" fill="hsl(var(--dark-pastel-green))" />
  </svg>
);

const PlantPotIcon = ({ size = 48 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    {/* Pot - British racing green */}
    <path d="M30 45 L70 45 L65 85 Q50 90 35 85 Z" fill="hsl(var(--british-racing-green))" />
    {/* Rim - Gold */}
    <ellipse cx="50" cy="45" rx="20" ry="4" fill="hsl(var(--gold))" />
    {/* Soil - Dark spring green */}
    <ellipse cx="50" cy="48" rx="18" ry="3" fill="hsl(var(--dark-spring-green))" />
    {/* Plant - Dark pastel green */}
    <path d="M45 48 Q40 35 35 25 M55 48 Q60 35 65 25 M50 48 L50 20" stroke="hsl(var(--dark-pastel-green))" strokeWidth="3" fill="none" />
    {/* Leaves - Canary */}
    <ellipse cx="38" cy="30" rx="4" ry="6" fill="hsl(var(--canary))" transform="rotate(-30 38 30)" />
    <ellipse cx="62" cy="30" rx="4" ry="6" fill="hsl(var(--canary))" transform="rotate(30 62 30)" />
    <ellipse cx="50" cy="25" rx="4" ry="6" fill="hsl(var(--canary))" />
  </svg>
);

export default function IconGallery() {
  const icons = [
    { name: "Watering Can", component: WateringCanIcon, description: "Classic long-spout watering can - perfect for the main logo" },
    { name: "Garden Spade", component: SpadeIcon, description: "Traditional digging spade with step bar" },
    { name: "Garden Fork", component: ForkIcon, description: "Three-tine garden fork for soil cultivation" },
    { name: "Hand Trowel", component: TrowelIcon, description: "Small hand trowel for precise planting" },
    { name: "Pruning Shears", component: PruningShearIcon, description: "Professional pruning shears for plant care" },
    { name: "Garden Rake", component: RakeIcon, description: "Multi-tine rake for soil preparation" },
    { name: "Garden Hoe", component: HoeIcon, description: "Traditional hoe for weeding and cultivation" },
    { name: "Seed Packet", component: SeedPacketIcon, description: "Classic seed packet for plant library" },
    { name: "Plant Pot", component: PlantPotIcon, description: "Potted plant for growing/planting features" }
  ];

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            GardenScape Pro Icon Gallery
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Classic garden tool icons designed in our British racing green and gold color system. 
            These icons will replace all existing icons throughout the application to create a cohesive, 
            elegant garden tool aesthetic inspired by traditional English gardening.
          </p>
        </div>

        {/* Color Palette Reference */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle>Color System Reference</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded" style={{ backgroundColor: 'hsl(151, 100%, 13%)' }}></div>
                <span className="text-sm">British Racing Green (Primary)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded" style={{ backgroundColor: 'hsl(138, 75%, 26%)' }}></div>
                <span className="text-sm">Dark Spring Green (Secondary)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded" style={{ backgroundColor: 'hsl(131, 69%, 41%)' }}></div>
                <span className="text-sm">Dark Pastel Green</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded" style={{ backgroundColor: 'hsl(51, 100%, 57%)' }}></div>
                <span className="text-sm">Canary (Accent)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded" style={{ backgroundColor: 'hsl(45, 100%, 50%)' }}></div>
                <span className="text-sm">Gold (Highlight)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Icon Gallery Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {icons.map((icon, index) => {
            const IconComponent = icon.component;
            return (
              <Card key={index} className="hover:shadow-lg transition-shadow duration-300">
                <CardHeader className="text-center">
                  <div className="flex justify-center mb-4">
                    <div className="p-6 bg-muted rounded-lg">
                      <IconComponent size={80} />
                    </div>
                  </div>
                  <CardTitle className="text-lg">{icon.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-center mb-4">
                    {icon.description}
                  </p>
                  
                  {/* Size Variations */}
                  <div className="flex justify-center items-center gap-4 mb-4">
                    <div className="text-center">
                      <IconComponent size={24} />
                      <p className="text-xs text-muted-foreground mt-1">Small</p>
                    </div>
                    <div className="text-center">
                      <IconComponent size={32} />
                      <p className="text-xs text-muted-foreground mt-1">Medium</p>
                    </div>
                    <div className="text-center">
                      <IconComponent size={48} />
                      <p className="text-xs text-muted-foreground mt-1">Large</p>
                    </div>
                  </div>
                  
                  {/* Usage Suggestions */}
                  <div className="text-xs text-muted-foreground text-center">
                    {index === 0 && "Suggested for: Main logo, watering features"}
                    {index === 1 && "Suggested for: Digging, garden design tools"}
                    {index === 2 && "Suggested for: Soil preparation, cultivation"}
                    {index === 3 && "Suggested for: Planting, detailed work"}
                    {index === 4 && "Suggested for: Plant care, maintenance"}
                    {index === 5 && "Suggested for: Cleanup, soil smoothing"}
                    {index === 6 && "Suggested for: Weeding, row making"}
                    {index === 7 && "Suggested for: Plant library, seed features"}
                    {index === 8 && "Suggested for: Container gardening, growing"}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Selection Instructions */}
        <Card className="mt-12">
          <CardHeader>
            <CardTitle>Selection Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Please review these garden tool icons and let me know which ones you'd like to use throughout 
              the GardenScape Pro application. I recommend:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li><strong>Watering Can</strong> - Perfect replacement for the current lily logo</li>
              <li><strong>Plant Pot</strong> - Great for plant-related features</li>
              <li><strong>Seed Packet</strong> - Ideal for plant library and search</li>
              <li><strong>Garden Tools</strong> - Choose 2-3 additional tools for navigation and features</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              Once you've selected your preferred icons, I'll implement them throughout the entire 
              application, replacing all existing icons with your chosen garden tool set.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}