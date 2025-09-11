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
    <img
      src="/generated-icons/garden-spade.png"
      alt="Garden Design"
      className={cn("w-6 h-6 object-contain", className)}
    />
  );
}

export function PlantLibraryIcon({ className }: IconProps) {
  return (
    <img
      src="/generated-icons/terracotta-plant-pot.png"
      alt="Plant Library"
      className={cn("w-6 h-6 object-contain", className)}
    />
  );
}

export function PlantDoctorIcon({ className }: IconProps) {
  return (
    <img
      src="/generated-icons/pruning-shears.png"
      alt="Plant Doctor"
      className={cn("w-6 h-6 object-contain", className)}
    />
  );
}

export function PremiumIcon({ className }: IconProps) {
  return (
    <img
      src="/generated-icons/garden-fork.png"
      alt="Premium"
      className={cn("w-6 h-6 object-contain", className)}
    />
  );
}

export function DashboardIcon({ className }: IconProps) {
  return (
    <img
      src="/generated-icons/garden-rake.png"
      alt="Dashboard"
      className={cn("w-6 h-6 object-contain", className)}
    />
  );
}

export function SeasonIcon({ className }: IconProps) {
  return (
    <img
      src="/generated-icons/seed-dibber.png"
      alt="Season"
      className={cn("w-6 h-6 object-contain", className)}
    />
  );
}

export function ClimateIcon({ className }: IconProps) {
  return (
    <img
      src="/generated-icons/garden-hoe.png"
      alt="Climate"
      className={cn("w-6 h-6 object-contain", className)}
    />
  );
}

export function ToolsIcon({ className }: IconProps) {
  return (
    <img
      src="/generated-icons/hand-trowel.png"
      alt="Tools"
      className={cn("w-6 h-6 object-contain", className)}
    />
  );
}