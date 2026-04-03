import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check } from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '../utils/I18nContext';

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Anchorage',
  'Pacific/Honolulu',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
];

export default function SettingsTab({ user, onUpdate, onUnsavedChange }) {
  const { tr, setLanguage } = useI18n();
  const [formData, setFormData] = useState({
    theme: user?.theme || 'light',
    timezone_str: user?.timezone_str || user?.timezone || 'America/Chicago',
    default_page: user?.default_page || 'Study',
    verse_display_format: user?.verse_display_format || 'inline',
    font_size: user?.font_size || 'medium',
    preferred_language: user?.preferred_language || 'en',
  });
  const [originalData, setOriginalData] = useState(formData);
  const [saving, setSaving] = useState(false);

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
      setLanguage(formData.preferred_language);
      toast.success(tr('Preferences updated successfully'));
      
      if (formData.theme !== originalData.theme) {
        document.documentElement.classList.toggle('dark', formData.theme === 'dark');
      }
      
      onUpdate();
    } catch (error) {
      toast.error(tr('Failed to update preferences'));
    }
    setSaving(false);
  };

  const handleCancel = () => {
    setFormData(originalData);
  };

  const hasChanges = JSON.stringify(formData) !== JSON.stringify(originalData);

  return (
    <div className="space-y-8">
      {/* Appearance */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Appearance</h3>
        <div className="space-y-4">
          <div>
            <Label className="text-gray-700 dark:text-gray-300 mb-2">Theme</Label>
            <Select value={formData.theme} onValueChange={(val) => handleChange('theme', val)}>
              <SelectTrigger className="dark:bg-gray-800 dark:border-gray-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-gray-700 dark:text-gray-300 mb-2">Font Size</Label>
            <Select value={formData.font_size} onValueChange={(val) => handleChange('font_size', val)}>
              <SelectTrigger className="dark:bg-gray-800 dark:border-gray-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Small</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="large">Large</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Reading Preferences */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Reading</h3>
        <div className="space-y-4">
          <div>
            <Label className="text-gray-700 dark:text-gray-300 mb-2">Verse Display Format</Label>
            <Select value={formData.verse_display_format} onValueChange={(val) => handleChange('verse_display_format', val)}>
              <SelectTrigger className="dark:bg-gray-800 dark:border-gray-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inline">Inline (continuous)</SelectItem>
                <SelectItem value="block">Block (separate paragraphs)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* General */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{tr('General')}</h3>
        <div className="space-y-4">
          <div>
            <Label className="text-gray-700 dark:text-gray-300 mb-2">{tr('Language')}</Label>
            <Select value={formData.preferred_language} onValueChange={(val) => handleChange('preferred_language', val)}>
              <SelectTrigger className="dark:bg-gray-800 dark:border-gray-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">{tr('English')}</SelectItem>
                <SelectItem value="es">{tr('Spanish')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-gray-700 dark:text-gray-300 mb-2">{tr('Time Zone')}</Label>
            <Select value={formData.timezone_str} onValueChange={(val) => handleChange('timezone_str', val)}>
              <SelectTrigger className="dark:bg-gray-800 dark:border-gray-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map(tz => (
                  <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-gray-700 dark:text-gray-300 mb-2">{tr('Default Landing Page')}</Label>
            <Select value={formData.default_page} onValueChange={(val) => handleChange('default_page', val)}>
              <SelectTrigger className="dark:bg-gray-800 dark:border-gray-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Study">{tr('Study')}</SelectItem>
                <SelectItem value="Keywords">Keywords</SelectItem>
                <SelectItem value="AccountCenter">{tr('Account Center')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
            className="bg-purple-600 hover:bg-purple-700"
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
    </div>
  );
}