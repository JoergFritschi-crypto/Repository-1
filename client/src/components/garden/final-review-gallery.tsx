import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  Download, 
  Share2, 
  FileText, 
  Eye,
  CheckSquare,
  Square,
  Package,
  Mail,
  Copy,
  Facebook,
  Twitter,
  Instagram,
  Link,
  Calendar,
  TreePine,
  MapPin,
  Flower2,
  Sun,
  Cloud,
  CloudRain,
  Snowflake,
  Leaf,
  ZoomIn,
  Check,
  X,
  Loader2,
  ArrowLeft,
  Home,
  Edit,
  Save,
  Image as ImageIcon,
  FileJson,
  FileSpreadsheet,
  Printer,
  Archive,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { cn } from '@/lib/utils';
import { apiRequest } from '@/lib/queryClient';
import { PlacedPlant } from './garden-layout-canvas';

interface SeasonalImage {
  dayOfYear: number;
  date: string;
  imageUrl: string;
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  description: string;
  bloomingPlants: string[];
  weatherCondition: string;
}

interface GardenSummary {
  gardenId?: string;
  gardenName: string;
  city?: string;
  country?: string;
  shape: string;
  dimensions: Record<string, number>;
  units: string;
  totalPlants: number;
  uniqueSpecies: number;
  gardenStyle: string;
  usdaZone?: string;
  rhsZone?: string;
  sunExposure?: string;
  soilType?: string;
  createdAt?: string;
}

interface FinalReviewGalleryProps {
  seasonalImages: SeasonalImage[];
  gardenSummary: GardenSummary;
  placedPlants: PlacedPlant[];
  onStartNewGarden: () => void;
  onEditGarden: () => void;
  onSaveGarden?: () => void;
  isSaved?: boolean;
  canvasImageUrl?: string; // 2D canvas screenshot
  threeDImageUrl?: string; // 3D view screenshot
}

const SEASON_ICONS = {
  spring: <Flower2 className="h-4 w-4" />,
  summer: <Sun className="h-4 w-4" />,
  autumn: <Leaf className="h-4 w-4" />,
  winter: <Snowflake className="h-4 w-4" />
};

const SEASON_COLORS = {
  spring: 'bg-green-100 text-green-800 border-green-300',
  summer: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  autumn: 'bg-orange-100 text-orange-800 border-orange-300',
  winter: 'bg-blue-100 text-blue-800 border-blue-300'
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function FinalReviewGallery({
  seasonalImages,
  gardenSummary,
  placedPlants,
  onStartNewGarden,
  onEditGarden,
  onSaveGarden,
  isSaved = false,
  canvasImageUrl,
  threeDImageUrl
}: FinalReviewGalleryProps) {
  const [selectedImages, setSelectedImages] = useState<Set<number>>(new Set());
  const [showFullImage, setShowFullImage] = useState<number | null>(null);
  const [downloadFormat, setDownloadFormat] = useState<'jpg' | 'png'>('jpg');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [shareUrl, setShareUrl] = useState<string>('');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [activeTab, setActiveTab] = useState('gallery');
  const { toast } = useToast();

  // Generate shareable URL on mount
  useEffect(() => {
    if (gardenSummary.gardenId) {
      const baseUrl = window.location.origin;
      const url = `${baseUrl}/garden/${gardenSummary.gardenId}/view`;
      setShareUrl(url);
    }
  }, [gardenSummary.gardenId]);

  // Helper to get month name from day of year
  const getMonthFromDayOfYear = (dayOfYear: number) => {
    const date = new Date(new Date().getFullYear(), 0, dayOfYear);
    return MONTH_NAMES[date.getMonth()];
  };

  // Toggle image selection
  const toggleImageSelection = (index: number) => {
    const newSelection = new Set(selectedImages);
    if (newSelection.has(index)) {
      newSelection.delete(index);
    } else {
      newSelection.add(index);
    }
    setSelectedImages(newSelection);
  };

  // Select all/none
  const selectAll = () => {
    setSelectedImages(new Set(seasonalImages.map((_, i) => i)));
  };

  const selectNone = () => {
    setSelectedImages(new Set());
  };

  // Download single image
  const downloadSingleImage = async (image: SeasonalImage, index: number) => {
    try {
      const response = await fetch(image.imageUrl);
      const blob = await response.blob();
      const fileName = `${gardenSummary.gardenName}-${image.season}-${image.date}.${downloadFormat}`;
      saveAs(blob, fileName);
      
      toast({
        title: "Image Downloaded",
        description: `Saved ${fileName}`,
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Could not download the image",
        variant: "destructive"
      });
    }
  };

  // Batch download as ZIP
  const downloadBatch = async () => {
    if (selectedImages.size === 0) {
      toast({
        title: "No Images Selected",
        description: "Please select at least one image to download",
        variant: "destructive"
      });
      return;
    }

    setIsDownloading(true);
    setDownloadProgress(0);

    try {
      const zip = new JSZip();
      const imagesFolder = zip.folder("seasonal-images");
      
      let completed = 0;
      const total = selectedImages.size;

      for (const index of selectedImages) {
        const image = seasonalImages[index];
        if (!image) continue;

        try {
          const response = await fetch(image.imageUrl);
          const blob = await response.blob();
          const fileName = `${image.season}-${image.date}.${downloadFormat}`;
          
          if (imagesFolder) {
            imagesFolder.file(fileName, blob);
          }

          completed++;
          setDownloadProgress((completed / total) * 100);
        } catch (error) {
          console.error(`Failed to download image ${index}:`, error);
        }
      }

      // Add garden info JSON
      const gardenInfo = {
        ...gardenSummary,
        generatedAt: new Date().toISOString(),
        totalImages: seasonalImages.length,
        downloadedImages: selectedImages.size
      };
      zip.file("garden-info.json", JSON.stringify(gardenInfo, null, 2));

      // Generate and download ZIP
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `${gardenSummary.gardenName}-seasonal-images.zip`);

      toast({
        title: "Batch Download Complete",
        description: `Downloaded ${selectedImages.size} images`,
      });

      // Clear selection after successful download
      setSelectedImages(new Set());
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Could not create ZIP file",
        variant: "destructive"
      });
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  // Export garden data as JSON
  const exportGardenData = () => {
    const exportData = {
      gardenSummary,
      placedPlants,
      seasonalImages: seasonalImages.map(img => ({
        ...img,
        imageUrl: img.imageUrl.startsWith('http') ? img.imageUrl : `${window.location.origin}${img.imageUrl}`
      })),
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    saveAs(blob, `${gardenSummary.gardenName}-garden-data.json`);

    toast({
      title: "Garden Data Exported",
      description: "Your complete garden design has been exported as JSON",
    });
  };

  // Export plant list as CSV
  const exportPlantList = () => {
    // Group plants by name and count quantities
    const plantCounts = new Map<string, number>();
    placedPlants.forEach(plant => {
      const count = plantCounts.get(plant.plantName) || 0;
      plantCounts.set(plant.plantName, count + 1);
    });

    // Create CSV content
    let csv = 'Plant Name,Quantity,Position X,Position Y\n';
    placedPlants.forEach(plant => {
      csv += `"${plant.plantName}",1,${plant.x.toFixed(2)},${plant.y.toFixed(2)}\n`;
    });

    // Add summary at the end
    csv += '\n\nSummary\n';
    csv += 'Plant Type,Total Quantity\n';
    plantCounts.forEach((count, name) => {
      csv += `"${name}",${count}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    saveAs(blob, `${gardenSummary.gardenName}-plant-list.csv`);

    toast({
      title: "Plant List Exported",
      description: "Your plant list has been exported as CSV",
    });
  };

  // Generate printable PDF
  const generatePrintablePlan = async () => {
    setIsGeneratingPDF(true);

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;

      // Title page
      pdf.setFontSize(24);
      pdf.text(gardenSummary.gardenName, pageWidth / 2, margin + 10, { align: 'center' });
      
      pdf.setFontSize(12);
      pdf.text('Garden Design Plan', pageWidth / 2, margin + 20, { align: 'center' });
      pdf.text(format(new Date(), 'MMMM dd, yyyy'), pageWidth / 2, margin + 30, { align: 'center' });

      // Garden details
      pdf.setFontSize(14);
      pdf.text('Garden Details', margin, margin + 50);
      
      pdf.setFontSize(10);
      let yPos = margin + 60;
      const details = [
        `Location: ${gardenSummary.city || 'N/A'}, ${gardenSummary.country || 'N/A'}`,
        `Shape: ${gardenSummary.shape}`,
        `Dimensions: ${Object.values(gardenSummary.dimensions).join(' x ')} ${gardenSummary.units}`,
        `Style: ${gardenSummary.gardenStyle}`,
        `Total Plants: ${gardenSummary.totalPlants}`,
        `Unique Species: ${gardenSummary.uniqueSpecies}`,
        `USDA Zone: ${gardenSummary.usdaZone || 'N/A'}`,
        `Sun Exposure: ${gardenSummary.sunExposure || 'N/A'}`,
        `Soil Type: ${gardenSummary.soilType || 'N/A'}`
      ];

      details.forEach(detail => {
        pdf.text(detail, margin, yPos);
        yPos += 6;
      });

      // Add new page for plant list
      pdf.addPage();
      pdf.setFontSize(14);
      pdf.text('Plant List', margin, margin);

      // Group plants and add to PDF
      const plantCounts = new Map<string, number>();
      placedPlants.forEach(plant => {
        const count = plantCounts.get(plant.plantName) || 0;
        plantCounts.set(plant.plantName, count + 1);
      });

      pdf.setFontSize(10);
      yPos = margin + 10;
      let index = 1;
      
      plantCounts.forEach((count, name) => {
        if (yPos > pageHeight - margin) {
          pdf.addPage();
          yPos = margin;
        }
        pdf.text(`${index}. ${name} (Qty: ${count})`, margin, yPos);
        yPos += 6;
        index++;
      });

      // Add seasonal preview page if images exist
      if (seasonalImages.length > 0) {
        pdf.addPage();
        pdf.setFontSize(14);
        pdf.text('Seasonal Views', margin, margin);
        pdf.setFontSize(10);
        pdf.text('Visit your online garden design to view seasonal images', margin, margin + 10);
      }

      // Save the PDF
      pdf.save(`${gardenSummary.gardenName}-garden-plan.pdf`);

      toast({
        title: "PDF Generated",
        description: "Your printable garden plan has been created",
      });
    } catch (error) {
      toast({
        title: "PDF Generation Failed",
        description: "Could not create the PDF document",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Create complete project archive
  const createProjectArchive = async () => {
    setIsDownloading(true);
    setDownloadProgress(0);

    try {
      const zip = new JSZip();

      // Add all seasonal images
      const imagesFolder = zip.folder("seasonal-images");
      let completed = 0;
      const total = seasonalImages.length;

      for (let i = 0; i < seasonalImages.length; i++) {
        const image = seasonalImages[i];
        try {
          const response = await fetch(image.imageUrl);
          const blob = await response.blob();
          const fileName = `${image.season}-${image.date}.jpg`;
          
          if (imagesFolder) {
            imagesFolder.file(fileName, blob);
          }

          completed++;
          setDownloadProgress((completed / total) * 90); // Reserve 10% for other files
        } catch (error) {
          console.error(`Failed to archive image ${i}:`, error);
        }
      }

      // Add garden data JSON
      const gardenData = {
        gardenSummary,
        placedPlants,
        seasonalImages: seasonalImages.map(img => ({
          ...img,
          imageUrl: `seasonal-images/${img.season}-${img.date}.jpg`
        })),
        exportedAt: new Date().toISOString()
      };
      zip.file("garden-data.json", JSON.stringify(gardenData, null, 2));

      // Add plant list CSV
      let csv = 'Plant Name,Quantity,Position X,Position Y\n';
      placedPlants.forEach(plant => {
        csv += `"${plant.plantName}",1,${plant.x.toFixed(2)},${plant.y.toFixed(2)}\n`;
      });
      zip.file("plant-list.csv", csv);

      // Add README
      const readme = `# ${gardenSummary.gardenName}

## Garden Design Archive

This archive contains your complete garden design project.

### Contents:
- **seasonal-images/**: All seasonal visualization images
- **garden-data.json**: Complete garden design data
- **plant-list.csv**: Detailed plant list with positions

### Garden Details:
- Location: ${gardenSummary.city || 'N/A'}, ${gardenSummary.country || 'N/A'}
- Style: ${gardenSummary.gardenStyle}
- Total Plants: ${gardenSummary.totalPlants}
- Created: ${format(new Date(), 'MMMM dd, yyyy')}

### Viewing Your Design:
Visit ${shareUrl || 'your garden URL'} to view the interactive version.

Generated by GardenScape Pro
`;
      zip.file("README.md", readme);

      setDownloadProgress(100);

      // Generate and download ZIP
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `${gardenSummary.gardenName}-complete-project.zip`);

      toast({
        title: "Project Archive Created",
        description: "Your complete garden project has been archived",
      });
    } catch (error) {
      toast({
        title: "Archive Creation Failed",
        description: "Could not create project archive",
        variant: "destructive"
      });
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  // Copy share link
  const copyShareLink = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Link Copied",
        description: "Share link has been copied to clipboard",
      });
    }
  };

  // Share via email
  const shareViaEmail = () => {
    const subject = encodeURIComponent(`Check out my garden design: ${gardenSummary.gardenName}`);
    const body = encodeURIComponent(`I've created a beautiful garden design using GardenScape Pro!\n\nView it here: ${shareUrl}\n\nGarden Details:\n- Style: ${gardenSummary.gardenStyle}\n- Total Plants: ${gardenSummary.totalPlants}\n- Location: ${gardenSummary.city || 'N/A'}, ${gardenSummary.country || 'N/A'}`);
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  // Share on social media
  const shareOnSocial = (platform: 'facebook' | 'twitter' | 'pinterest') => {
    const text = encodeURIComponent(`Check out my ${gardenSummary.gardenStyle} garden design!`);
    const url = encodeURIComponent(shareUrl);

    const shareUrls = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      twitter: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      pinterest: `https://pinterest.com/pin/create/button/?url=${url}&description=${text}`
    };

    window.open(shareUrls[platform], '_blank', 'width=600,height=400');
  };

  return (
    <div className="space-y-4">
      {/* Success Header */}
      <Card className="border-2 border-green-500 bg-green-50 dark:bg-green-900/20">
        <CardContent className="py-6">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-center mb-2">Your Garden Design is Complete!</h2>
          <p className="text-center text-muted-foreground">
            Explore your seasonal garden views, download your designs, and share with friends
          </p>
        </CardContent>
      </Card>

      {/* Garden Summary Card */}
      <Card className="border-2 border-primary">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <TreePine className="w-5 h-5 text-primary" />
            {gardenSummary.gardenName}
          </CardTitle>
          <CardDescription>Garden Design Summary</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Location & Climate */}
            <div className="space-y-2">
              <h4 className="font-semibold text-sm flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                Location & Climate
              </h4>
              <div className="text-xs space-y-1">
                {gardenSummary.city && gardenSummary.country && (
                  <p>{gardenSummary.city}, {gardenSummary.country}</p>
                )}
                {gardenSummary.usdaZone && <p>USDA Zone: {gardenSummary.usdaZone}</p>}
                {gardenSummary.rhsZone && <p>RHS Zone: {gardenSummary.rhsZone}</p>}
                {gardenSummary.sunExposure && <p>Sun: {gardenSummary.sunExposure.replace('_', ' ')}</p>}
                {gardenSummary.soilType && <p>Soil: {gardenSummary.soilType}</p>}
              </div>
            </div>

            {/* Garden Details */}
            <div className="space-y-2">
              <h4 className="font-semibold text-sm flex items-center gap-1">
                <TreePine className="w-3 h-3" />
                Garden Details
              </h4>
              <div className="text-xs space-y-1">
                <p>Shape: {gardenSummary.shape}</p>
                <p>Size: {Object.values(gardenSummary.dimensions).join(' x ')} {gardenSummary.units}</p>
                <p>Style: {gardenSummary.gardenStyle}</p>
                <p>Created: {format(new Date(gardenSummary.createdAt || Date.now()), 'MMM d, yyyy')}</p>
              </div>
            </div>

            {/* Plant Summary */}
            <div className="space-y-2">
              <h4 className="font-semibold text-sm flex items-center gap-1">
                <Flower2 className="w-3 h-3" />
                Plant Summary
              </h4>
              <div className="text-xs space-y-1">
                <p>Total Plants: {gardenSummary.totalPlants}</p>
                <p>Unique Species: {gardenSummary.uniqueSpecies}</p>
                <p>Seasonal Images: {seasonalImages.length}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="gallery" className="flex items-center gap-1">
            <ImageIcon className="w-3 h-3" />
            Gallery
          </TabsTrigger>
          <TabsTrigger value="downloads" className="flex items-center gap-1">
            <Download className="w-3 h-3" />
            Downloads
          </TabsTrigger>
          <TabsTrigger value="share" className="flex items-center gap-1">
            <Share2 className="w-3 h-3" />
            Share
          </TabsTrigger>
        </TabsList>

        {/* Gallery Tab */}
        <TabsContent value="gallery" className="space-y-4 mt-4">
          {/* Selection Controls */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={selectAll}
                data-testid="button-select-all"
              >
                <CheckSquare className="w-3 h-3 mr-1" />
                Select All
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={selectNone}
                data-testid="button-select-none"
              >
                <Square className="w-3 h-3 mr-1" />
                Clear Selection
              </Button>
              {selectedImages.size > 0 && (
                <Badge variant="secondary">
                  {selectedImages.size} selected
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Select value={downloadFormat} onValueChange={(value: any) => setDownloadFormat(value)}>
                <SelectTrigger className="w-24" data-testid="select-format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="jpg">JPG</SelectItem>
                  <SelectItem value="png">PNG</SelectItem>
                </SelectContent>
              </Select>

              <Button
                size="sm"
                onClick={downloadBatch}
                disabled={selectedImages.size === 0 || isDownloading}
                data-testid="button-batch-download"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <Package className="w-3 h-3 mr-1" />
                    Download Selected
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Download Progress */}
          {isDownloading && (
            <div className="space-y-2">
              <Progress value={downloadProgress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                Creating archive... {Math.round(downloadProgress)}%
              </p>
            </div>
          )}

          {/* Image Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {seasonalImages.map((image, index) => (
              <div
                key={index}
                className={cn(
                  "relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all",
                  selectedImages.has(index) ? "border-primary ring-2 ring-primary/20" : "border-transparent"
                )}
              >
                {/* Checkbox */}
                <div className="absolute top-2 left-2 z-10">
                  <Checkbox
                    checked={selectedImages.has(index)}
                    onCheckedChange={() => toggleImageSelection(index)}
                    className="bg-white/90 border-gray-400"
                    data-testid={`checkbox-image-${index}`}
                  />
                </div>

                {/* Image */}
                <div 
                  className="aspect-video relative"
                  onClick={() => setShowFullImage(index)}
                >
                  <img
                    src={image.imageUrl}
                    alt={`${image.season} - ${image.date}`}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                    <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>

                {/* Image Info */}
                <div className="p-2 bg-white dark:bg-gray-800">
                  <div className="flex items-center justify-between mb-1">
                    <Badge 
                      variant="outline" 
                      className={cn("text-xs", SEASON_COLORS[image.season])}
                    >
                      {SEASON_ICONS[image.season]}
                      <span className="ml-1 capitalize">{image.season}</span>
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {getMonthFromDayOfYear(image.dayOfYear)}
                    </span>
                  </div>
                  
                  {/* Individual Download */}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-full h-7 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadSingleImage(image, index);
                    }}
                    data-testid={`button-download-${index}`}
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Download
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Downloads Tab */}
        <TabsContent value="downloads" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Garden Data */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileJson className="w-4 h-4" />
                  Garden Data (JSON)
                </CardTitle>
                <CardDescription className="text-xs">
                  Complete garden design data for backup or import
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={exportGardenData}
                  data-testid="button-export-json"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Garden Data
                </Button>
              </CardContent>
            </Card>

            {/* Plant List */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4" />
                  Plant List (CSV)
                </CardTitle>
                <CardDescription className="text-xs">
                  Detailed plant list with positions and quantities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={exportPlantList}
                  data-testid="button-export-csv"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Plant List
                </Button>
              </CardContent>
            </Card>

            {/* Printable Plan */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Printer className="w-4 h-4" />
                  Printable Plan (PDF)
                </CardTitle>
                <CardDescription className="text-xs">
                  Professional garden plan for printing or sharing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={generatePrintablePlan}
                  disabled={isGeneratingPDF}
                  data-testid="button-generate-pdf"
                >
                  {isGeneratingPDF ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4 mr-2" />
                      Generate PDF
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Complete Archive */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Archive className="w-4 h-4" />
                  Complete Project (ZIP)
                </CardTitle>
                <CardDescription className="text-xs">
                  Everything in one archive: images, data, and documents
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={createProjectArchive}
                  disabled={isDownloading}
                  data-testid="button-create-archive"
                >
                  {isDownloading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Package className="w-4 h-4 mr-2" />
                      Create Archive
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Download Progress for Archive */}
          {isDownloading && (
            <Card>
              <CardContent className="py-4">
                <Progress value={downloadProgress} className="h-2 mb-2" />
                <p className="text-xs text-muted-foreground text-center">
                  Creating project archive... {Math.round(downloadProgress)}%
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Share Tab */}
        <TabsContent value="share" className="space-y-4 mt-4">
          {/* Share Link */}
          {shareUrl && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Link className="w-4 h-4" />
                  Share Link
                </CardTitle>
                <CardDescription className="text-xs">
                  Share your garden design with this link
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="flex-1 px-3 py-2 text-xs border rounded-md bg-muted"
                  />
                  <Button
                    size="sm"
                    onClick={copyShareLink}
                    data-testid="button-copy-link"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={shareViaEmail}
                    data-testid="button-share-email"
                  >
                    <Mail className="w-3 h-3 mr-1" />
                    Email
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => shareOnSocial('facebook')}
                    data-testid="button-share-facebook"
                  >
                    <Facebook className="w-3 h-3 mr-1" />
                    Facebook
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => shareOnSocial('twitter')}
                    data-testid="button-share-twitter"
                  >
                    <Twitter className="w-3 h-3 mr-1" />
                    Twitter
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Save Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Save className="w-4 h-4" />
                Save Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isSaved ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-sm">Garden saved to your account</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-amber-600">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">Garden not saved yet</span>
                  </div>
                  {onSaveGarden && (
                    <Button
                      className="w-full"
                      onClick={onSaveGarden}
                      data-testid="button-save-garden"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save to My Gardens
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <Card>
        <CardContent className="py-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button
              variant="outline"
              onClick={onEditGarden}
              data-testid="button-edit-garden"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit This Garden
            </Button>
            <Button
              variant="outline"
              onClick={onStartNewGarden}
              data-testid="button-new-garden"
            >
              <TreePine className="w-4 h-4 mr-2" />
              Start New Garden
            </Button>
            <Button
              variant="default"
              onClick={() => window.location.href = '/'}
              data-testid="button-dashboard"
            >
              <Home className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Full Image Modal */}
      {showFullImage !== null && (
        <Dialog open={true} onOpenChange={() => setShowFullImage(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {SEASON_ICONS[seasonalImages[showFullImage].season]}
                <span className="capitalize">{seasonalImages[showFullImage].season}</span>
                - {seasonalImages[showFullImage].date}
              </DialogTitle>
              <DialogDescription>
                {seasonalImages[showFullImage].description}
              </DialogDescription>
            </DialogHeader>
            <div className="relative">
              <img
                src={seasonalImages[showFullImage].imageUrl}
                alt={`${seasonalImages[showFullImage].season} view`}
                className="w-full h-auto rounded-lg"
              />
              <div className="absolute top-2 right-2 flex gap-2">
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={() => downloadSingleImage(seasonalImages[showFullImage], showFullImage)}
                >
                  <Download className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={() => setShowFullImage(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
            {seasonalImages[showFullImage].bloomingPlants.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-semibold mb-2">Blooming Plants:</h4>
                <div className="flex flex-wrap gap-1">
                  {seasonalImages[showFullImage].bloomingPlants.map((plant, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {plant}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}