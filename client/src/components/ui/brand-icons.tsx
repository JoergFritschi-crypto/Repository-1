import { cn } from "@/lib/utils";

interface IconProps {
  className?: string;
}

export function GardenScapeIcon({ className }: IconProps) {
  return (
    <img
      src="/generated-icons/watering-can.png"
      alt="GardenScape Pro"
      className={cn("w-6 h-6 object-contain", className)}
    />
  );
}

export function GardenDesignIcon({ className }: IconProps) {
  return (
    <svg
      className={cn("w-5 h-5", className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" fill="hsl(var(--british-racing-green))" opacity="0.1"/>
      <rect x="3" y="3" width="18" height="18" rx="2" stroke="hsl(var(--british-racing-green))" strokeWidth="2"/>
      <circle cx="8" cy="8" r="2" fill="hsl(var(--gold))"/>
      <circle cx="16" cy="8" r="2" fill="hsl(var(--british-racing-green))"/>
      <circle cx="12" cy="16" r="2" fill="hsl(var(--gold))"/>
      <path d="M8 8L16 8L12 16Z" stroke="hsl(var(--british-racing-green))" strokeWidth="1" fill="none" opacity="0.4"/>
    </svg>
  );
}

export function PlantLibraryIcon({ className }: IconProps) {
  return (
    <svg
      className={cn("w-5 h-5", className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 2L12 22"
        stroke="hsl(var(--british-racing-green))"
        strokeWidth="2"
      />
      <path
        d="M12 6C12 6 6 4 6 9C6 12 9 13 11 13L12 6Z"
        fill="hsl(var(--british-racing-green))"
      />
      <path
        d="M12 6C12 6 18 4 18 9C18 12 15 13 13 13L12 6Z"
        fill="hsl(var(--gold))"
      />
      <circle cx="12" cy="20" r="3" fill="hsl(var(--british-racing-green))" opacity="0.2"/>
    </svg>
  );
}

export function PlantDoctorIcon({ className }: IconProps) {
  return (
    <svg
      className={cn("w-5 h-5", className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="9" y="3" width="6" height="8" rx="1" fill="hsl(var(--gold))"/>
      <rect x="10" y="6" width="4" height="2" fill="hsl(var(--british-racing-green))"/>
      <circle cx="12" cy="16" r="5" fill="hsl(var(--british-racing-green))"/>
      <path d="M12 14V18M10 16H14" stroke="hsl(var(--gold))" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

export function PremiumIcon({ className }: IconProps) {
  return (
    <svg
      className={cn("w-5 h-5", className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 2L14.5 9L22 9L16.5 13.5L19 21L12 16L5 21L7.5 13.5L2 9L9.5 9L12 2Z"
        fill="hsl(var(--gold))"
        stroke="hsl(var(--british-racing-green))"
        strokeWidth="1"
      />
    </svg>
  );
}

export function DashboardIcon({ className }: IconProps) {
  return (
    <svg
      className={cn("w-5 h-5", className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="3" y="3" width="8" height="8" rx="1" fill="hsl(var(--british-racing-green))"/>
      <rect x="13" y="3" width="8" height="8" rx="1" fill="hsl(var(--gold))"/>
      <rect x="3" y="13" width="8" height="8" rx="1" fill="hsl(var(--gold))"/>
      <rect x="13" y="13" width="8" height="8" rx="1" fill="hsl(var(--british-racing-green))"/>
    </svg>
  );
}

export function SeasonIcon({ className }: IconProps) {
  return (
    <svg
      className={cn("w-5 h-5", className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="9" stroke="hsl(var(--british-racing-green))" strokeWidth="2" fill="none"/>
      <path d="M12 3V12L17 17" stroke="hsl(var(--gold))" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="12" cy="12" r="2" fill="hsl(var(--british-racing-green))"/>
    </svg>
  );
}

export function ClimateIcon({ className }: IconProps) {
  return (
    <svg
      className={cn("w-5 h-5", className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="10" r="4" fill="hsl(var(--gold))"/>
      <path d="M12 14V18M9 16L12 18L15 16" stroke="hsl(var(--gold))" strokeWidth="2" strokeLinecap="round"/>
      <path d="M6 10H8M16 10H18M12 4V6M8.5 6.5L7 5M15.5 6.5L17 5" stroke="hsl(var(--british-racing-green))" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

export function ToolsIcon({ className }: IconProps) {
  return (
    <svg
      className={cn("w-5 h-5", className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M5 10L10 5L12 7L7 12L5 10Z"
        fill="hsl(var(--british-racing-green))"
      />
      <rect x="9" y="11" width="2" height="10" rx="1" fill="hsl(var(--british-racing-green))"/>
      <path
        d="M14 3L19 3L19 8L16 11L14 9L17 6L14 3Z"
        fill="hsl(var(--gold))"
      />
      <rect x="13" y="10" width="2" height="11" rx="1" fill="hsl(var(--gold))"/>
    </svg>
  );
}