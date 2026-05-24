
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Upload, Link, X } from 'lucide-react';
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
    if (imageUrl) {
      onImageChange(imageUrl);
      setImageUrl('');
      toast({
        title: "Image Added",
        description: "Featured image has been set successfully.",
      });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      // In a real implementation, you'd upload the file here
      toast({
        title: "File Upload",
        description: "File upload functionality would be implemented here with your preferred service.",
      });
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      // In a real implementation, you'd upload the file here
      toast({
        title: "File Upload",
        description: "File upload functionality would be implemented here with your preferred service.",
      });
    }
  };

  const removeImage = () => {
    onImageChange('');
    toast({
      title: "Image Removed",
      description: "Featured image has been removed.",
    });
  };

  return (
    <div className="space-y-4">
      {currentImage ? (
        <div className="relative">
          <img 
            src={currentImage} 
            alt="Featured" 
            className="w-full h-48 object-cover rounded-lg"
          />
          <Button
            size="sm"
            variant="destructive"
            className="absolute top-2 right-2"
            onClick={removeImage}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <Card
          className={`border-2 border-dashed p-8 text-center transition-colors ${
            dragOver 
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
              : 'border-gray-300 dark:border-gray-600'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Drag and drop an image here, or click to select
          </p>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileInput}
            className="hidden"
            id="file-upload"
          />
          <Button variant="outline" asChild>
            <label htmlFor="file-upload" className="cursor-pointer">
              Choose File
            </label>
          </Button>
        </Card>
      )}

      <div className="flex gap-2">
        <Input
          placeholder="Or paste image URL..."
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
        />
        <Button onClick={handleUrlSubmit} disabled={!imageUrl}>
          <Link className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default ImageUploader;
