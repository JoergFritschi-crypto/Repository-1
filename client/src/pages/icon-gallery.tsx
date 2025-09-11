import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Photorealistic Garden Tool Icon Components using our 5-color system
const WateringCanIcon = ({ size = 48 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    <defs>
      {/* Gradients for realistic shading */}
      <linearGradient id="canBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="hsl(var(--dark-spring-green))" />
        <stop offset="50%" stopColor="hsl(var(--british-racing-green))" />
        <stop offset="100%" stopColor="hsl(var(--british-racing-green))" stopOpacity="0.8" />
      </linearGradient>
      <linearGradient id="canHandleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="hsl(var(--gold))" />
        <stop offset="50%" stopColor="hsl(var(--canary))" />
        <stop offset="100%" stopColor="hsl(var(--gold))" stopOpacity="0.7" />
      </linearGradient>
      <radialGradient id="metalShine" cx="30%" cy="30%">
        <stop offset="0%" stopColor="hsl(var(--canary))" stopOpacity="0.6" />
        <stop offset="100%" stopColor="transparent" />
      </radialGradient>
    </defs>
    
    {/* Main body with realistic curves and depth */}
    <path d="M25 38 L25 42 Q25 45 28 45 L62 45 Q65 45 65 42 L65 38 Q65 35 62 35 L28 35 Q25 35 25 38 Z" fill="url(#canBodyGrad)" />
    <path d="M25 42 L25 68 Q25 73 30 75 L60 75 Q65 73 65 68 L65 42" fill="url(#canBodyGrad)" />
    
    {/* Realistic spout with proper curves */}
    <path d="M25 49 Q20 47 15 45 Q8 42 5 46 Q3 49 5 52 Q8 55 15 52 Q20 50 25 52" fill="url(#canBodyGrad)" />
    <ellipse cx="12" cy="49" rx="2" ry="1" fill="url(#metalShine)" />
    
    {/* Brass handle with realistic metallic look */}
    <path d="M65 48 Q72 48 75 52 Q77 55 75 58 Q72 62 65 62" stroke="url(#canHandleGrad)" strokeWidth="4" fill="none" />
    <path d="M65 50 Q70 50 72 53 Q73 55 72 57 Q70 60 65 60" stroke="hsl(var(--canary))" strokeWidth="1" fill="none" opacity="0.6" />
    
    {/* Top handle with brass fittings */}
    <ellipse cx="45" cy="32" rx="10" ry="4" fill="url(#canHandleGrad)" />
    <rect x="41" y="22" width="8" height="12" fill="url(#canHandleGrad)" rx="4" />
    <ellipse cx="45" cy="24" rx="3" ry="1.5" fill="hsl(var(--canary))" opacity="0.7" />
    
    {/* Realistic water stream */}
    <path d="M5 52 Q3 55 4 58 Q5 60 7 58 Q8 55 6 52" fill="hsl(var(--canary))" opacity="0.4" />
    <path d="M3 60 Q2 62 3 64 Q4 65 5 63 Q6 60 4 58" fill="hsl(var(--canary))" opacity="0.3" />
    
    {/* Metal highlights and reflections */}
    <ellipse cx="40" cy="40" rx="8" ry="2" fill="url(#metalShine)" />
    <ellipse cx="55" cy="60" rx="6" ry="1.5" fill="url(#metalShine)" />
  </svg>
);

const SpadeIcon = ({ size = 48 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    <defs>
      <linearGradient id="woodGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="hsl(var(--gold))" />
        <stop offset="30%" stopColor="hsl(var(--canary))" />
        <stop offset="70%" stopColor="hsl(var(--gold))" />
        <stop offset="100%" stopColor="hsl(var(--gold))" stopOpacity="0.7" />
      </linearGradient>
      <linearGradient id="bladeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="hsl(var(--dark-spring-green))" />
        <stop offset="40%" stopColor="hsl(var(--british-racing-green))" />
        <stop offset="100%" stopColor="hsl(var(--british-racing-green))" stopOpacity="0.8" />
      </linearGradient>
      <linearGradient id="gripGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="hsl(var(--dark-pastel-green))" />
        <stop offset="50%" stopColor="hsl(var(--dark-spring-green))" />
        <stop offset="100%" stopColor="hsl(var(--british-racing-green))" />
      </linearGradient>
    </defs>
    
    {/* Wooden handle with realistic wood grain effect */}
    <rect x="46" y="5" width="8" height="48" fill="url(#woodGrad)" rx="4" />
    <rect x="47" y="7" width="2" height="44" fill="hsl(var(--canary))" opacity="0.3" rx="1" />
    <rect x="51" y="8" width="1" height="42" fill="hsl(var(--gold))" opacity="0.4" />
    
    {/* Green grip wrap with texture */}
    <rect x="43" y="15" width="14" height="10" fill="url(#gripGrad)" rx="7" />
    <rect x="44" y="17" width="12" height="1" fill="hsl(var(--canary))" opacity="0.3" />
    <rect x="44" y="20" width="12" height="1" fill="hsl(var(--canary))" opacity="0.3" />
    <rect x="44" y="23" width="12" height="1" fill="hsl(var(--canary))" opacity="0.3" />
    
    {/* Step bar with wear marks */}
    <rect x="38" y="49" width="24" height="6" fill="url(#gripGrad)" rx="3" />
    <rect x="40" y="51" width="20" height="1" fill="hsl(var(--canary))" opacity="0.4" />
    
    {/* Realistic spade blade with curves and depth */}
    <path d="M36 55 L64 55 Q66 55 66 57 L64 82 Q62 87 58 88 L42 88 Q38 87 36 82 L34 57 Q34 55 36 55 Z" fill="url(#bladeGrad)" />
    
    {/* Blade center ridge */}
    <path d="M50 55 L50 86 Q49 87 50 88 Q51 87 50 86 Z" fill="hsl(var(--dark-spring-green))" />
    
    {/* Sharp edge with metallic shine */}
    <path d="M40 86 Q50 90 60 86" stroke="hsl(var(--canary))" strokeWidth="2" fill="none" />
    <path d="M42 87 Q50 89 58 87" stroke="hsl(var(--canary))" strokeWidth="1" fill="none" opacity="0.6" />
    
    {/* Metal reflections */}
    <ellipse cx="45" cy="65" rx="3" ry="1" fill="hsl(var(--canary))" opacity="0.3" />
    <ellipse cx="55" cy="70" rx="2" ry="0.5" fill="hsl(var(--canary))" opacity="0.4" />
  </svg>
);

const ForkIcon = ({ size = 48 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    <defs>
      <linearGradient id="forkHandleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="hsl(var(--gold))" />
        <stop offset="30%" stopColor="hsl(var(--canary))" />
        <stop offset="70%" stopColor="hsl(var(--gold))" />
        <stop offset="100%" stopColor="hsl(var(--gold))" stopOpacity="0.8" />
      </linearGradient>
      <linearGradient id="forkTineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="hsl(var(--dark-spring-green))" />
        <stop offset="30%" stopColor="hsl(var(--british-racing-green))" />
        <stop offset="70%" stopColor="hsl(var(--dark-pastel-green))" />
        <stop offset="100%" stopColor="hsl(var(--british-racing-green))" stopOpacity="0.9" />
      </linearGradient>
      <radialGradient id="tineShine" cx="40%" cy="20%">
        <stop offset="0%" stopColor="hsl(var(--canary))" stopOpacity="0.5" />
        <stop offset="100%" stopColor="transparent" />
      </radialGradient>
    </defs>
    
    {/* Wooden handle with natural wood texture */}
    <rect x="46" y="5" width="8" height="42" fill="url(#forkHandleGrad)" rx="4" />
    <rect x="47" y="7" width="2" height="38" fill="hsl(var(--canary))" opacity="0.3" rx="1" />
    <rect x="51" y="8" width="1" height="36" fill="hsl(var(--gold))" opacity="0.4" />
    
    {/* Green grip wrap with realistic texture */}
    <rect x="43" y="15" width="14" height="10" fill="hsl(var(--dark-spring-green))" rx="7" />
    <rect x="44" y="17" width="12" height="1" fill="hsl(var(--canary))" opacity="0.3" />
    <rect x="44" y="20" width="12" height="1" fill="hsl(var(--canary))" opacity="0.3" />
    <rect x="44" y="23" width="12" height="1" fill="hsl(var(--canary))" opacity="0.3" />
    
    {/* Fork head with realistic metal construction */}
    <rect x="34" y="47" width="32" height="10" fill="url(#forkTineGrad)" rx="3" />
    <rect x="36" y="49" width="28" height="2" fill="hsl(var(--canary))" opacity="0.4" />
    
    {/* Three realistic tines with varying lengths */}
    <rect x="37" y="57" width="5" height="23" fill="url(#forkTineGrad)" rx="2.5" />
    <rect x="47.5" y="57" width="5" height="26" fill="url(#forkTineGrad)" rx="2.5" />
    <rect x="58" y="57" width="5" height="23" fill="url(#forkTineGrad)" rx="2.5" />
    
    {/* Metal highlights on tines */}
    <rect x="38" y="58" width="1" height="20" fill="url(#tineShine)" />
    <rect x="48.5" y="58" width="1" height="23" fill="url(#tineShine)" />
    <rect x="59" y="58" width="1" height="20" fill="url(#tineShine)" />
    
    {/* Sharp tine points */}
    <ellipse cx="39.5" cy="82" rx="2.5" ry="1" fill="hsl(var(--canary))" />
    <ellipse cx="50" cy="85" rx="2.5" ry="1" fill="hsl(var(--canary))" />
    <ellipse cx="60.5" cy="82" rx="2.5" ry="1" fill="hsl(var(--canary))" />
  </svg>
);

const TrowelIcon = ({ size = 48 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    <defs>
      <linearGradient id="trowelHandleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="hsl(var(--gold))" />
        <stop offset="30%" stopColor="hsl(var(--canary))" />
        <stop offset="70%" stopColor="hsl(var(--gold))" />
        <stop offset="100%" stopColor="hsl(var(--gold))" stopOpacity="0.8" />
      </linearGradient>
      <linearGradient id="trowelBladeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="hsl(var(--dark-spring-green))" />
        <stop offset="50%" stopColor="hsl(var(--british-racing-green))" />
        <stop offset="100%" stopColor="hsl(var(--british-racing-green))" stopOpacity="0.9" />
      </linearGradient>
      <radialGradient id="ferruleShine" cx="50%" cy="30%">
        <stop offset="0%" stopColor="hsl(var(--canary))" stopOpacity="0.6" />
        <stop offset="100%" stopColor="transparent" />
      </radialGradient>
    </defs>
    
    {/* Wooden handle with natural curve and grain */}
    <path d="M45 5 Q47 4 50 5 Q53 4 55 5 L55 37 Q55 38 54 39 L46 39 Q45 38 45 37 Z" fill="url(#trowelHandleGrad)" />
    
    {/* Wood grain details */}
    <path d="M47 8 Q50 7 53 8 M47 15 Q50 14 53 15 M47 22 Q50 21 53 22 M47 29 Q50 28 53 29" 
          stroke="hsl(var(--gold))" strokeWidth="0.5" opacity="0.4" fill="none" />
    
    {/* Realistic ferrule (metal collar) */}
    <rect x="43" y="37" width="14" height="8" fill="hsl(var(--dark-spring-green))" rx="2" />
    <rect x="43" y="37" width="14" height="8" fill="url(#ferruleShine)" rx="2" />
    <rect x="44" y="38" width="12" height="1" fill="hsl(var(--canary))" opacity="0.4" />
    <rect x="44" y="43" width="12" height="1" fill="hsl(var(--canary))" opacity="0.4" />
    
    {/* Realistic trowel blade with proper curves */}
    <path d="M42 45 L58 45 Q59 45 59 46 L57 74 Q55 78 50 79 Q45 78 43 74 L41 46 Q41 45 42 45 Z" fill="url(#trowelBladeGrad)" />
    
    {/* Blade center line and reflections */}
    <path d="M50 45 L50 76 Q49.5 77 50 78 Q50.5 77 50 76 Z" stroke="hsl(var(--dark-spring-green))" strokeWidth="1" />
    
    {/* Sharp cutting edge */}
    <path d="M45 76 Q50 79 55 76" stroke="hsl(var(--canary))" strokeWidth="2" fill="none" />
    <path d="M46 77 Q50 78 54 77" stroke="hsl(var(--canary))" strokeWidth="1" fill="none" opacity="0.6" />
    
    {/* Metal highlights */}
    <ellipse cx="48" cy="55" rx="2" ry="0.8" fill="hsl(var(--canary))" opacity="0.3" transform="rotate(-10 48 55)" />
    <ellipse cx="52" cy="65" rx="1.5" ry="0.6" fill="hsl(var(--canary))" opacity="0.4" transform="rotate(15 52 65)" />
  </svg>
);

const PruningShearIcon = ({ size = 48 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    <defs>
      <linearGradient id="shearHandleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="hsl(var(--gold))" />
        <stop offset="40%" stopColor="hsl(var(--canary))" />
        <stop offset="100%" stopColor="hsl(var(--gold))" stopOpacity="0.8" />
      </linearGradient>
      <linearGradient id="bladeGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="hsl(var(--dark-spring-green))" />
        <stop offset="60%" stopColor="hsl(var(--british-racing-green))" />
        <stop offset="100%" stopColor="hsl(var(--british-racing-green))" stopOpacity="0.9" />
      </linearGradient>
      <radialGradient id="pivotShine" cx="30%" cy="30%">
        <stop offset="0%" stopColor="hsl(var(--canary))" />
        <stop offset="50%" stopColor="hsl(var(--gold))" />
        <stop offset="100%" stopColor="hsl(var(--gold))" stopOpacity="0.7" />
      </radialGradient>
    </defs>
    
    {/* Left handle with ergonomic curve */}
    <path d="M15 25 Q12 20 18 15 Q25 12 30 18 L38 48 Q40 52 36 54 L32 52 Q28 50 25 46 Z" fill="url(#shearHandleGrad)" />
    <path d="M18 20 Q22 18 26 22 L34 46" stroke="hsl(var(--canary))" strokeWidth="1" opacity="0.4" fill="none" />
    
    {/* Right handle with ergonomic curve */}
    <path d="M85 25 Q88 20 82 15 Q75 12 70 18 L62 48 Q60 52 64 54 L68 52 Q72 50 75 46 Z" fill="url(#shearHandleGrad)" />
    <path d="M82 20 Q78 18 74 22 L66 46" stroke="hsl(var(--canary))" strokeWidth="1" opacity="0.4" fill="none" />
    
    {/* Left blade with realistic cutting edge */}
    <path d="M36 54 Q42 58 48 54 Q52 52 50 48 Q46 46 40 48 Q36 50 36 54 Z" fill="url(#bladeGrad1)" />
    <path d="M38 52 Q44 55 48 52" stroke="hsl(var(--canary))" strokeWidth="1" opacity="0.6" fill="none" />
    
    {/* Right blade with realistic cutting edge */}
    <path d="M64 54 Q58 58 52 54 Q48 52 50 48 Q54 46 60 48 Q64 50 64 54 Z" fill="url(#bladeGrad1)" />
    <path d="M62 52 Q56 55 52 52" stroke="hsl(var(--canary))" strokeWidth="1" opacity="0.6" fill="none" />
    
    {/* Central pivot with brass fitting */}
    <circle cx="50" cy="51" r="5" fill="url(#pivotShine)" />
    <circle cx="50" cy="51" r="3" fill="hsl(var(--canary))" opacity="0.6" />
    <circle cx="48" cy="49" r="1" fill="hsl(var(--canary))" />
    
    {/* Return spring */}
    <path d="M42 35 Q46 30 50 32 Q54 30 58 35" stroke="hsl(var(--dark-spring-green))" strokeWidth="2" fill="none" />
    <path d="M44 33 Q48 29 52 33" stroke="hsl(var(--dark-pastel-green))" strokeWidth="1" fill="none" />
    
    {/* Handle grip texture */}
    <ellipse cx="22" cy="30" rx="2" ry="1" fill="hsl(var(--dark-spring-green))" opacity="0.3" />
    <ellipse cx="78" cy="30" rx="2" ry="1" fill="hsl(var(--dark-spring-green))" opacity="0.3" />
  </svg>
);

const RakeIcon = ({ size = 48 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    <defs>
      <linearGradient id="rakeHandleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="hsl(var(--gold))" />
        <stop offset="30%" stopColor="hsl(var(--canary))" />
        <stop offset="70%" stopColor="hsl(var(--gold))" />
        <stop offset="100%" stopColor="hsl(var(--gold))" stopOpacity="0.8" />
      </linearGradient>
      <linearGradient id="rakeHeadGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="hsl(var(--dark-spring-green))" />
        <stop offset="50%" stopColor="hsl(var(--british-racing-green))" />
        <stop offset="100%" stopColor="hsl(var(--british-racing-green))" stopOpacity="0.9" />
      </linearGradient>
      <linearGradient id="rakeTineGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="hsl(var(--dark-spring-green))" />
        <stop offset="60%" stopColor="hsl(var(--british-racing-green))" />
        <stop offset="100%" stopColor="hsl(var(--dark-pastel-green))" />
      </linearGradient>
    </defs>
    
    {/* Wooden handle with realistic wood grain */}
    <rect x="46" y="5" width="8" height="50" fill="url(#rakeHandleGrad)" rx="4" />
    <rect x="47" y="7" width="2" height="46" fill="hsl(var(--canary))" opacity="0.3" rx="1" />
    <rect x="51" y="8" width="1" height="44" fill="hsl(var(--gold))" opacity="0.4" />
    
    {/* Connection ferrule */}
    <rect x="44" y="55" width="12" height="6" fill="url(#rakeHeadGrad)" rx="3" />
    <rect x="45" y="56" width="10" height="1" fill="hsl(var(--canary))" opacity="0.4" />
    
    {/* Rake head base with realistic metal construction */}
    <rect x="22" y="61" width="56" height="8" fill="url(#rakeHeadGrad)" rx="4" />
    <rect x="24" y="63" width="52" height="2" fill="hsl(var(--canary))" opacity="0.3" />
    
    {/* Seven realistic rake tines with varying heights */}
    <rect x="26" y="69" width="3" height="16" fill="url(#rakeTineGrad)" rx="1.5" />
    <rect x="33" y="69" width="3" height="19" fill="url(#rakeTineGrad)" rx="1.5" />
    <rect x="40" y="69" width="3" height="16" fill="url(#rakeTineGrad)" rx="1.5" />
    <rect x="47" y="69" width="3" height="20" fill="url(#rakeTineGrad)" rx="1.5" />
    <rect x="54" y="69" width="3" height="16" fill="url(#rakeTineGrad)" rx="1.5" />
    <rect x="61" y="69" width="3" height="19" fill="url(#rakeTineGrad)" rx="1.5" />
    <rect x="68" y="69" width="3" height="16" fill="url(#rakeTineGrad)" rx="1.5" />
    
    {/* Metal shine on tines */}
    <rect x="26.5" y="70" width="0.5" height="14" fill="hsl(var(--canary))" opacity="0.4" />
    <rect x="47.5" y="70" width="0.5" height="18" fill="hsl(var(--canary))" opacity="0.4" />
    <rect x="68.5" y="70" width="0.5" height="14" fill="hsl(var(--canary))" opacity="0.4" />
    
    {/* Sharp tine points */}
    <ellipse cx="27.5" cy="86" rx="1.5" ry="0.8" fill="hsl(var(--canary))" />
    <ellipse cx="48.5" cy="90" rx="1.5" ry="0.8" fill="hsl(var(--canary))" />
    <ellipse cx="69.5" cy="86" rx="1.5" ry="0.8" fill="hsl(var(--canary))" />
  </svg>
);

const HoeIcon = ({ size = 48 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    <defs>
      <linearGradient id="hoeHandleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="hsl(var(--gold))" />
        <stop offset="30%" stopColor="hsl(var(--canary))" />
        <stop offset="70%" stopColor="hsl(var(--gold))" />
        <stop offset="100%" stopColor="hsl(var(--gold))" stopOpacity="0.8" />
      </linearGradient>
      <linearGradient id="hoeBladeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="hsl(var(--dark-spring-green))" />
        <stop offset="50%" stopColor="hsl(var(--british-racing-green))" />
        <stop offset="100%" stopColor="hsl(var(--british-racing-green))" stopOpacity="0.9" />
      </linearGradient>
    </defs>
    
    {/* Long wooden handle with natural curve */}
    <rect x="12" y="12" width="7" height="65" fill="url(#hoeHandleGrad)" rx="3.5" transform="rotate(-12 15.5 44.5)" />
    <rect x="13" y="14" width="2" height="60" fill="hsl(var(--canary))" opacity="0.3" rx="1" transform="rotate(-12 14 44)" />
    <rect x="16" y="15" width="1" height="58" fill="hsl(var(--gold))" opacity="0.4" transform="rotate(-12 16.5 44)" />
    
    {/* Connection neck */}
    <rect x="32" y="58" width="18" height="5" fill="url(#hoeBladeGrad)" rx="2.5" transform="rotate(-5 41 60.5)" />
    <rect x="34" y="59" width="14" height="1" fill="hsl(var(--canary))" opacity="0.4" transform="rotate(-5 41 59.5)" />
    
    {/* Realistic hoe blade with proper proportions */}
    <rect x="45" y="63" width="28" height="10" fill="url(#hoeBladeGrad)" rx="2" />
    <rect x="46" y="65" width="26" height="2" fill="hsl(var(--canary))" opacity="0.3" />
    
    {/* Sharp cutting edge */}
    <rect x="45" y="71" width="28" height="3" fill="hsl(var(--canary))" rx="1.5" />
    <rect x="46" y="72" width="26" height="1" fill="hsl(var(--canary))" opacity="0.6" />
    
    {/* Blade center reinforcement */}
    <rect x="58" y="64" width="2" height="8" fill="hsl(var(--dark-spring-green))" rx="1" />
    
    {/* Metal shine and wear patterns */}
    <ellipse cx="52" cy="67" rx="3" ry="1" fill="hsl(var(--canary))" opacity="0.3" />
    <ellipse cx="66" cy="68" rx="2" ry="0.8" fill="hsl(var(--canary))" opacity="0.4" />
  </svg>
);

const SeedPacketIcon = ({ size = 48 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    <defs>
      <linearGradient id="packetGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="hsl(var(--card))" />
        <stop offset="30%" stopColor="hsl(var(--muted))" />
        <stop offset="100%" stopColor="hsl(var(--card))" />
      </linearGradient>
      <linearGradient id="sealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="hsl(var(--gold))" />
        <stop offset="50%" stopColor="hsl(var(--canary))" />
        <stop offset="100%" stopColor="hsl(var(--gold))" />
      </linearGradient>
      <radialGradient id="plantGlow" cx="50%" cy="50%">
        <stop offset="0%" stopColor="hsl(var(--dark-pastel-green))" />
        <stop offset="70%" stopColor="hsl(var(--british-racing-green))" />
        <stop offset="100%" stopColor="hsl(var(--dark-spring-green))" />
      </radialGradient>
    </defs>
    
    {/* Paper packet with realistic fold lines */}
    <rect x="24" y="14" width="52" height="72" fill="url(#packetGrad)" stroke="hsl(var(--border))" strokeWidth="2" rx="4" />
    <rect x="26" y="16" width="48" height="1" fill="hsl(var(--muted-foreground))" opacity="0.2" />
    <rect x="72" y="18" width="2" height="64" fill="hsl(var(--muted-foreground))" opacity="0.1" />
    
    {/* Metallic top seal with embossed effect */}
    <rect x="24" y="14" width="52" height="14" fill="url(#sealGrad)" rx="4" />
    <rect x="26" y="16" width="48" height="2" fill="hsl(var(--canary))" opacity="0.6" />
    <rect x="26" y="24" width="48" height="2" fill="hsl(var(--gold))" opacity="0.4" />
    
    {/* Realistic plant illustration with depth */}
    <path d="M42 35 Q38 38 42 48 Q46 42 50 35 Q52 32 50 30 Q46 28 42 35" fill="url(#plantGlow)" />
    <path d="M55 38 Q58 35 62 40 Q58 45 55 48 Q52 45 50 40 Q48 35 50 32 Q52 30 55 38" fill="url(#plantGlow)" />
    
    {/* Plant stems with realistic curves */}
    <path d="M47 48 Q49 52 47 58 Q45 62 47 65" stroke="hsl(var(--dark-spring-green))" strokeWidth="3" fill="none" />
    <path d="M57 48 Q55 52 57 58 Q59 62 57 65" stroke="hsl(var(--dark-spring-green))" strokeWidth="2" fill="none" />
    
    {/* Realistic seeds with shadows */}
    <ellipse cx="38" cy="72" rx="2.5" ry="1.8" fill="hsl(var(--dark-pastel-green))" />
    <ellipse cx="50" cy="74" rx="2.2" ry="1.6" fill="hsl(var(--british-racing-green))" />
    <ellipse cx="62" cy="71" rx="2.3" ry="1.7" fill="hsl(var(--dark-spring-green))" />
    
    {/* Seed highlights */}
    <ellipse cx="37" cy="71" rx="1" ry="0.6" fill="hsl(var(--canary))" opacity="0.3" />
    <ellipse cx="49" cy="73" rx="0.8" ry="0.5" fill="hsl(var(--canary))" opacity="0.3" />
    <ellipse cx="61" cy="70" rx="0.9" ry="0.6" fill="hsl(var(--canary))" opacity="0.3" />
    
    {/* Packet texture lines */}
    <line x1="28" y1="35" x2="72" y2="35" stroke="hsl(var(--muted-foreground))" strokeWidth="0.5" opacity="0.2" />
    <line x1="28" y1="55" x2="72" y2="55" stroke="hsl(var(--muted-foreground))" strokeWidth="0.5" opacity="0.2" />
  </svg>
);

const PlantPotIcon = ({ size = 48 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    <defs>
      <linearGradient id="potGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="hsl(var(--dark-spring-green))" />
        <stop offset="40%" stopColor="hsl(var(--british-racing-green))" />
        <stop offset="100%" stopColor="hsl(var(--british-racing-green))" stopOpacity="0.8" />
      </linearGradient>
      <linearGradient id="rimGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="hsl(var(--gold))" />
        <stop offset="50%" stopColor="hsl(var(--canary))" />
        <stop offset="100%" stopColor="hsl(var(--gold))" />
      </linearGradient>
      <radialGradient id="soilGrad" cx="50%" cy="30%">
        <stop offset="0%" stopColor="hsl(var(--dark-spring-green))" />
        <stop offset="60%" stopColor="hsl(var(--british-racing-green))" />
        <stop offset="100%" stopColor="hsl(var(--dark-spring-green))" stopOpacity="0.9" />
      </radialGradient>
      <linearGradient id="leafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="hsl(var(--canary))" />
        <stop offset="50%" stopColor="hsl(var(--dark-pastel-green))" />
        <stop offset="100%" stopColor="hsl(var(--dark-spring-green))" />
      </linearGradient>
    </defs>
    
    {/* Terracotta pot with realistic curves and depth */}
    <path d="M28 44 L72 44 Q73 44 73 45 L68 83 Q66 88 62 89 L38 89 Q34 88 32 83 L27 45 Q27 44 28 44 Z" fill="url(#potGrad)" />
    
    {/* Pot highlights and texture */}
    <path d="M30 48 Q35 47 40 48 Q45 47 50 48 Q55 47 60 48 Q65 47 70 48" stroke="hsl(var(--canary))" strokeWidth="1" opacity="0.3" fill="none" />
    <path d="M32 65 Q40 64 48 65 Q56 64 68 65" stroke="hsl(var(--canary))" strokeWidth="0.8" opacity="0.2" fill="none" />
    
    {/* Decorative rim with realistic brass appearance */}
    <ellipse cx="50" cy="44" rx="22" ry="5" fill="url(#rimGrad)" />
    <ellipse cx="50" cy="42" rx="20" ry="3" fill="hsl(var(--canary))" opacity="0.4" />
    <ellipse cx="50" cy="44" rx="18" ry="2" fill="hsl(var(--gold))" opacity="0.3" />
    
    {/* Rich soil with realistic texture */}
    <ellipse cx="50" cy="47" rx="19" ry="4" fill="url(#soilGrad)" />
    <ellipse cx="45" cy="46" rx="3" ry="1" fill="hsl(var(--dark-spring-green))" opacity="0.6" />
    <ellipse cx="55" cy="47" rx="2" ry="0.8" fill="hsl(var(--british-racing-green))" opacity="0.4" />
    
    {/* Realistic plant stems with natural curves */}
    <path d="M47 47 Q42 40 38 30 Q35 25 37 20" stroke="hsl(var(--dark-spring-green))" strokeWidth="2.5" fill="none" />
    <path d="M53 47 Q58 40 62 30 Q65 25 63 20" stroke="hsl(var(--dark-spring-green))" strokeWidth="2.5" fill="none" />
    <path d="M50 47 Q49 35 50 25 Q51 20 50 15" stroke="hsl(var(--dark-spring-green))" strokeWidth="3" fill="none" />
    
    {/* Realistic leaves with natural shapes and veining */}
    <path d="M35 28 Q32 22 38 18 Q44 22 41 28 Q38 32 35 28 Z" fill="url(#leafGrad)" />
    <path d="M65 28 Q68 22 62 18 Q56 22 59 28 Q62 32 65 28 Z" fill="url(#leafGrad)" />
    <path d="M47 22 Q44 16 50 12 Q56 16 53 22 Q50 26 47 22 Z" fill="url(#leafGrad)" />
    
    {/* Leaf veining for realism */}
    <path d="M37 20 Q39 24 41 28" stroke="hsl(var(--dark-spring-green))" strokeWidth="0.8" opacity="0.6" fill="none" />
    <path d="M63 20 Q61 24 59 28" stroke="hsl(var(--dark-spring-green))" strokeWidth="0.8" opacity="0.6" fill="none" />
    <path d="M50 14 Q50 18 50 22" stroke="hsl(var(--dark-spring-green))" strokeWidth="0.8" opacity="0.6" fill="none" />
    
    {/* Subtle leaf highlights */}
    <ellipse cx="38" cy="23" rx="2" ry="1" fill="hsl(var(--canary))" opacity="0.3" transform="rotate(-30 38 23)" />
    <ellipse cx="62" cy="23" rx="2" ry="1" fill="hsl(var(--canary))" opacity="0.3" transform="rotate(30 62 23)" />
    <ellipse cx="50" cy="18" rx="2" ry="1" fill="hsl(var(--canary))" opacity="0.3" />
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