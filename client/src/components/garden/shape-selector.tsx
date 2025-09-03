import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { GardenDimensions } from "@/types/garden";

interface ShapeSelectorProps {
  shape: string;
  dimensions: GardenDimensions;
  units: 'metric' | 'imperial';
  onShapeChange: (shape: string) => void;
  onDimensionsChange: (dimensions: GardenDimensions) => void;
}

const SHAPE_OPTIONS = [
  {
    id: 'rectangle',
    name: 'Rectangle',
    icon: '⬛',
    fields: ['length', 'width']
  },
  {
    id: 'circle',
    name: 'Circle',
    icon: '⚫',
    fields: ['radius']
  },
  {
    id: 'oval',
    name: 'Oval',
    icon: '⬭',
    fields: ['majorAxis', 'minorAxis']
  },
  {
    id: 'rhomboid',
    name: 'Rhomboid',
    icon: '◊',
    fields: ['sideA', 'sideB', 'angle']
  },
  {
    id: 'l_shaped',
    name: 'L-Shaped',
    icon: '⌐',
    fields: ['length1', 'width1', 'length2', 'width2']
  }
];

const FIELD_LABELS = {
  length: 'Length',
  width: 'Width',
  radius: 'Radius',
  majorAxis: 'Major Axis',
  minorAxis: 'Minor Axis',
  sideA: 'Side A',
  sideB: 'Side B',
  angle: 'Angle',
  length1: 'Length 1',
  width1: 'Width 1',
  length2: 'Length 2',
  width2: 'Width 2',
};

export default function ShapeSelector({
  shape,
  dimensions,
  units,
  onShapeChange,
  onDimensionsChange,
}: ShapeSelectorProps) {
  const unitSymbol = units === 'metric' ? 'm' : 'ft';
  const selectedOption = SHAPE_OPTIONS.find(option => option.id === shape);

  const handleDimensionChange = (field: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    onDimensionsChange({
      ...dimensions,
      [field]: numValue,
    });
  };

  return (
    <div className="space-y-6">
      {/* Shape Options */}
      <div>
        <Label className="text-base font-semibold mb-4 block">Garden Shape</Label>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {SHAPE_OPTIONS.map((option) => (
            <Card
              key={option.id}
              className={cn(
                "cursor-pointer transition-all duration-200 hover:shadow-md",
                shape === option.id
                  ? "border-primary bg-primary/10 shadow-md"
                  : "hover:border-accent"
              )}
              onClick={() => onShapeChange(option.id)}
              data-testid={`shape-option-${option.id}`}
            >
              <CardContent className="p-4 text-center">
                <div className="text-2xl mb-2">{option.icon}</div>
                <h3 className="font-medium text-sm">{option.name}</h3>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Dimension Inputs */}
      {selectedOption && (
        <div>
          <Label className="text-base font-semibold mb-4 block">Dimensions</Label>
          <div className="grid grid-cols-2 gap-4">
            {selectedOption.fields.map((field) => (
              <div key={field}>
                <Label htmlFor={field} className="text-sm">
                  {FIELD_LABELS[field]} ({field === 'angle' ? '°' : unitSymbol})
                </Label>
                <Input
                  id={field}
                  type="number"
                  placeholder={field === 'angle' ? '90' : '10'}
                  value={dimensions[field] || ''}
                  onChange={(e) => handleDimensionChange(field, e.target.value)}
                  className="mt-1"
                  data-testid={`input-${field}`}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Shape Preview */}
      <div className="bg-muted/30 rounded-lg p-6">
        <Label className="text-base font-semibold mb-4 block">Shape Preview</Label>
        <div className="bg-white border-2 border-dashed border-muted-foreground/30 rounded-lg h-32 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <div className="text-3xl mb-2">{selectedOption?.icon}</div>
            <p className="text-sm capitalize">{shape.replace('_', '-')} Garden</p>
            {selectedOption && (
              <p className="text-xs mt-1">
                {selectedOption.fields.map(field => 
                  `${FIELD_LABELS[field]}: ${dimensions[field] || 0}${field === 'angle' ? '°' : unitSymbol}`
                ).join(' × ')}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
