import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Upload, User, Check } from 'lucide-react';
import { toast } from 'sonner';
import PhotoEditor from './PhotoEditor';

export default function ProfileTab({ user, onUpdate, onUnsavedChange }) {
  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    username: user?.username || '',
    email: user?.email || '',
    bio: user?.bio || '',
  });
  const [originalData, setOriginalData] = useState(formData);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showPhotoEditor, setShowPhotoEditor] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState(null);

  useEffect(() => {
    const hasChanges = JSON.stringify(formData) !== JSON.stringify(originalData);
    onUnsavedChange(hasChanges);
  }, [formData, originalData, onUnsavedChange]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe(formData);
      setOriginalData(formData);
      toast.success('Profile updated successfully');
      onUpdate();
    } catch (error) {
      toast.error('Failed to update profile');
    }
    setSaving(false);
  };

  const handleCancel = () => {
    setFormData(originalData);
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    // Create object URL for the editor
    const imageUrl = URL.createObjectURL(file);
    setSelectedImageUrl(imageUrl);
    setShowPhotoEditor(true);
  };

  const handleSaveEditedPhoto = async (editedFile) => {
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: editedFile });
      await base44.auth.updateMe({ avatar_url: file_url });
      toast.success('Profile photo updated');
      setShowPhotoEditor(false);
      setSelectedImageUrl(null);
      onUpdate();
    } catch (error) {
      toast.error('Failed to upload photo');
    }
    setUploading(false);
  };

  const handleCancelPhotoEdit = () => {
    if (selectedImageUrl) {
      URL.revokeObjectURL(selectedImageUrl);
    }
    setSelectedImageUrl(null);
    setShowPhotoEditor(false);
  };

  const hasChanges = JSON.stringify(formData) !== JSON.stringify(originalData);

  return (
    <div className="space-y-8">
      {/* Avatar Section */}
      <div>
        <Label className="text-gray-700 dark:text-gray-300 mb-3 block">Profile Photo</Label>
        <div className="flex items-center gap-4">
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt="Avatar" className="w-24 h-24 rounded-full object-cover" />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-700 to-amber-700 flex items-center justify-center text-white text-3xl font-bold">
              {(formData.full_name || formData.username || formData.email || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </div>
          )}
          <div>
            <input
              type="file"
              id="avatar-upload"
              accept="image/jpeg,image/png,image/gif"
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploading}
            />
            <label htmlFor="avatar-upload">
              <Button
                type="button"
                variant="outline"
                disabled={uploading}
                onClick={() => document.getElementById('avatar-upload')?.click()}
                asChild
              >
                <span>
                  <Upload className="w-4 h-4 mr-2" />
                  {uploading ? 'Uploading...' : 'Change Photo'}
                </span>
              </Button>
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              JPG, PNG or GIF. Max 5MB.
            </p>
          </div>
        </div>
      </div>

      {/* Form Fields */}
      <div className="space-y-6">
        <div>
          <Label className="text-gray-700 dark:text-gray-300 mb-2">Full Name</Label>
          <Input
            value={formData.full_name}
            onChange={(e) => handleChange('full_name', e.target.value)}
            placeholder="Your full name"
            className="dark:bg-gray-800 dark:border-gray-700"
          />
        </div>

        <div>
          <Label className="text-gray-700 dark:text-gray-300 mb-2">Username</Label>
          <Input
            value={formData.username}
            onChange={(e) => handleChange('username', e.target.value)}
            placeholder="Your username"
            className="dark:bg-gray-800 dark:border-gray-700"
          />
        </div>

        <div>
          <Label className="text-gray-700 dark:text-gray-300 mb-2">Email</Label>
          <Input
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            type="email"
            placeholder="your.email@example.com"
            className="dark:bg-gray-800 dark:border-gray-700"
            disabled
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Email changes require verification (coming soon)
          </p>
        </div>

        <div>
          <Label className="text-gray-700 dark:text-gray-300 mb-2">Bio</Label>
          <Textarea
            value={formData.bio}
            onChange={(e) => handleChange('bio', e.target.value)}
            placeholder="Tell us about yourself..."
            rows={4}
            className="dark:bg-gray-800 dark:border-gray-700 resize-none"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {formData.bio.length}/200 characters
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      {hasChanges && (
        <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
          <Button
            onClick={handleCancel}
            variant="outline"
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700"
          >
            {saving ? 'Saving...' : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      )}

      {showPhotoEditor && selectedImageUrl && (
        <PhotoEditor
          open={showPhotoEditor}
          imageUrl={selectedImageUrl}
          onSave={handleSaveEditedPhoto}
          onCancel={handleCancelPhotoEdit}
        />
      )}
    </div>
  );
}