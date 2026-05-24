import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Upload, Link as LinkIcon, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ImageUploaderProps {
  currentImage?: string;
  onImageChange: (url: string) => void;
}

const ImageUploader = ({ currentImage, onImageChange }: ImageUploaderProps) => {
  const { toast } = useToast();
  const [imageUrl, setImageUrl] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const handleUrlSubmit = () => {
    const trimmed = imageUrl.trim();
    if (!trimmed) return;
    onImageChange(trimmed);
    setImageUrl('');
    toast({ title: 'Image set', description: 'Cover image saved.' });
  };

  const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(r.error);
      r.readAsDataURL(file);
    });

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith('image/'));
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    onImageChange(dataUrl);
    toast({ title: 'Image attached', description: `${file.name} added as cover.` });
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    onImageChange(dataUrl);
    toast({ title: 'Image attached', description: `${file.name} added as cover.` });
  };

  const removeImage = () => {
    onImageChange('');
    toast({ title: 'Image removed' });
  };

  return (
    <div className="space-y-4">
      {currentImage ? (
        <div className="relative rounded-xl overflow-hidden border border-border/70">
          <img
            src={currentImage}
            alt="Cover preview"
            className="w-full h-44 object-cover"
          />
          <button
            onClick={removeImage}
            className="absolute top-2 right-2 inline-flex items-center justify-center h-8 w-8 rounded-full bg-background/90 border border-border/70 text-foreground hover:bg-muted backdrop-blur-sm transition-colors"
            aria-label="Remove image"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div
          className={`relative rounded-xl border border-dashed p-6 text-center transition-colors ${
            dragOver
              ? 'border-primary bg-primary/5'
              : 'border-border/70 hover:border-border'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
          onDrop={handleDrop}
        >
          <div className="inline-flex items-center justify-center h-10 w-10 rounded-xl border border-border/70 bg-background text-muted-foreground mb-3 mx-auto">
            <Upload className="w-4 h-4" />
          </div>
          <p className="text-sm text-foreground font-medium">Drag &amp; drop an image</p>
          <p className="mt-1 text-xs text-muted-foreground">or click below to browse</p>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileInput}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="btn-secondary-modern mt-4 inline-flex items-center justify-center gap-1.5 rounded-full px-4 h-9 text-xs font-medium cursor-pointer"
          >
            Choose file
          </label>
        </div>
      )}

      <div className="flex gap-2">
        <div className="relative flex-1">
          <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Or paste image URL…"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleUrlSubmit())}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <button
          onClick={handleUrlSubmit}
          disabled={!imageUrl.trim()}
          className="btn-secondary-modern inline-flex items-center justify-center rounded-full px-4 h-9 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Set
        </button>
      </div>
    </div>
  );
};

export default ImageUploader;
