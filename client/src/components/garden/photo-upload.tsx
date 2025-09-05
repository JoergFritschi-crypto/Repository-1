import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, X, Image as ImageIcon, Camera } from 'lucide-react';

interface PhotoUploadProps {
  onPhotosChange?: (photos: File[]) => void;
  maxPhotos?: number;
}

export default function PhotoUpload({ 
  onPhotosChange,
  maxPhotos = 6 
}: PhotoUploadProps) {
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;

    const newPhotos: File[] = [];
    const newPreviews: string[] = [];
    
    // Add existing photos first
    photos.forEach((photo, index) => {
      newPhotos.push(photo);
      newPreviews.push(previews[index]);
    });

    // Add new photos up to max limit
    for (let i = 0; i < files.length && newPhotos.length < maxPhotos; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        newPhotos.push(file);
        const reader = new FileReader();
        reader.onload = (e) => {
          const preview = e.target?.result as string;
          setPreviews(prev => [...prev, preview]);
        };
        reader.readAsDataURL(file);
      }
    }

    setPhotos(newPhotos);
    if (onPhotosChange) {
      onPhotosChange(newPhotos);
    }
  }, [photos, previews, maxPhotos, onPhotosChange]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const removePhoto = useCallback((index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    setPhotos(newPhotos);
    setPreviews(newPreviews);
    if (onPhotosChange) {
      onPhotosChange(newPhotos);
    }
  }, [photos, previews, onPhotosChange]);

  return (
    <Card className="border-2 border-[#004025] shadow-sm" data-testid="photo-upload">
      <CardHeader className="py-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Camera className="w-4 h-4" />
          Site Photos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <p className="text-xs text-muted-foreground">
          Upload up to {maxPhotos} photos of your garden site from different angles. 
          These will help the AI provide better recommendations.
        </p>

        {/* Upload Area */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            relative border-2 border-dashed rounded-lg p-4 text-center
            transition-colors cursor-pointer
            ${isDragging ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-gray-400'}
            ${photos.length >= maxPhotos ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => handleFileSelect(e.target.files)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={photos.length >= maxPhotos}
            data-testid="file-input"
          />
          
          <div className="space-y-2">
            <Upload className="w-8 h-8 mx-auto text-gray-400" />
            <div>
              <p className="text-sm font-medium">
                {photos.length >= maxPhotos 
                  ? `Maximum ${maxPhotos} photos reached`
                  : 'Drag & drop photos here or click to browse'
                }
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {maxPhotos - photos.length} of {maxPhotos} slots available
              </p>
            </div>
          </div>
        </div>

        {/* Photo Grid */}
        {photos.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {previews.map((preview, index) => (
              <div
                key={index}
                className="relative group aspect-square rounded overflow-hidden bg-gray-100"
              >
                <img
                  src={preview}
                  alt={`Garden photo ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                <Button
                  size="sm"
                  variant="destructive"
                  className="absolute top-1 right-1 p-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removePhoto(index)}
                  data-testid={`remove-photo-${index}`}
                >
                  <X className="w-3 h-3" />
                </Button>
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 text-center">
                  Photo {index + 1}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Photo Tips */}
        <div className="bg-blue-50 p-3 rounded-lg">
          <p className="text-xs font-medium mb-1">📸 Photo Tips:</p>
          <ul className="text-xs text-muted-foreground space-y-0.5 ml-4">
            <li>• Take photos from all four corners</li>
            <li>• Include existing features (trees, structures)</li>
            <li>• Show sun/shade patterns if possible</li>
            <li>• Capture any slopes or elevation changes</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}