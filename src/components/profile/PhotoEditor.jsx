import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { RotateCw, RotateCcw, ZoomIn, ZoomOut, Grid3x3, Check, X } from 'lucide-react';
import { toast } from 'sonner';

export default function PhotoEditor({ open, imageUrl, onSave, onCancel }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [showGrid, setShowGrid] = useState(true);
  const [saving, setSaving] = useState(false);

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createImage = (url) =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.src = url;
    });

  const getCroppedImg = async (imageSrc, pixelCrop, rotation = 0) => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const maxSize = 512;
    canvas.width = maxSize;
    canvas.height = maxSize;

    ctx.translate(maxSize / 2, maxSize / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-maxSize / 2, -maxSize / 2);

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      maxSize,
      maxSize
    );

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Canvas is empty'));
          return;
        }
        blob.name = 'avatar.jpg';
        resolve(blob);
      }, 'image/jpeg', 0.95);
    });
  };

  const handleSave = async () => {
    if (!croppedAreaPixels) {
      toast.error('Please adjust the crop area');
      return;
    }

    setSaving(true);
    try {
      const croppedBlob = await getCroppedImg(imageUrl, croppedAreaPixels, rotation);
      const file = new File([croppedBlob], 'avatar.jpg', { type: 'image/jpeg' });
      await onSave(file);
    } catch (error) {
      toast.error('Failed to process image');
      console.error(error);
      setSaving(false);
    }
  };

  const handleRotate = (degrees) => {
    setRotation((prev) => (prev + degrees) % 360);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && !saving && onCancel()}>
      <DialogContent className="dark:bg-gray-900 dark:border-gray-800 max-w-3xl">
        <DialogHeader>
          <DialogTitle className="dark:text-white">Edit Profile Photo</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Crop Area */}
          <div className="relative h-96 bg-gray-900 rounded-lg overflow-hidden">
            <Cropper
              image={imageUrl}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={1}
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
              onRotationChange={setRotation}
              showGrid={showGrid}
              cropShape="round"
            />
          </div>

          {/* Preview */}
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-500 dark:text-gray-400">Preview:</div>
            <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden border-2 border-gray-300 dark:border-gray-700">
              {/* Small preview circle */}
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-4">
            {/* Zoom */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Zoom</label>
                <span className="text-xs text-gray-500 dark:text-gray-400">{Math.round(zoom * 100)}%</span>
              </div>
              <div className="flex items-center gap-3">
                <ZoomOut className="w-4 h-4 text-gray-500" />
                <Slider
                  value={[zoom]}
                  onValueChange={([value]) => setZoom(value)}
                  min={1}
                  max={3}
                  step={0.1}
                  className="flex-1"
                />
                <ZoomIn className="w-4 h-4 text-gray-500" />
              </div>
            </div>

            {/* Rotation */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Rotation</label>
                <span className="text-xs text-gray-500 dark:text-gray-400">{rotation}°</span>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRotate(-90)}
                  disabled={saving}
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  90° Left
                </Button>
                <Slider
                  value={[rotation]}
                  onValueChange={([value]) => setRotation(value)}
                  min={0}
                  max={360}
                  step={1}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRotate(90)}
                  disabled={saving}
                >
                  <RotateCw className="w-4 h-4 mr-1" />
                  90° Right
                </Button>
              </div>
            </div>

            {/* Grid Toggle */}
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Show Grid</label>
              <Button
                variant={showGrid ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowGrid(!showGrid)}
                disabled={saving}
                className={showGrid ? 'bg-purple-600 hover:bg-purple-700' : ''}
              >
                <Grid3x3 className="w-4 h-4 mr-1" />
                {showGrid ? 'On' : 'Off'}
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={saving}
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {saving ? (
              'Saving...'
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Save Photo
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}