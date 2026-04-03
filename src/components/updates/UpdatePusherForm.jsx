import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Megaphone, Plus, Upload, Trash2, Eye, EyeOff, Calendar,
  ThumbsUp, ThumbsDown, Edit2, ArrowLeft, MonitorPlay
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { LoadingSpinner } from '../ui/loading-screen';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import ScreenshotPositioner from './ScreenshotPositioner';
import UpdatePreview from './UpdatePreview';

export default function UpdatePusherForm({ onBack }) {
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUpdate, setEditingUpdate] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  // Form fields
  const [version, setVersion] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState('');
  const [screenshotX, setScreenshotX] = useState(50);
  const [screenshotY, setScreenshotY] = useState(50);
  const [screenshotScale, setScreenshotScale] = useState(100);
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const dropZoneRef = useRef(null);

  useEffect(() => {
    loadUpdates();
  }, []);

  const loadUpdates = async () => {
    const all = await base44.entities.AppUpdate.list('-created_date');
    setUpdates(all);
    setLoading(false);
  };

  const resetForm = () => {
    setVersion('');
    setTitle('');
    setDescription('');
    setScreenshotFile(null);
    setScreenshotPreview('');
    setScreenshotX(50);
    setScreenshotY(50);
    setScreenshotScale(100);
    setEditingUpdate(null);
    setShowForm(false);
    setShowPreview(false);
  };

  const handleEdit = (update) => {
    setEditingUpdate(update);
    setVersion(update.version);
    setTitle(update.title);
    setDescription(update.description);
    setScreenshotPreview(update.screenshot_url || '');
    setScreenshotX(update.screenshot_x || 50);
    setScreenshotY(update.screenshot_y || 50);
    setScreenshotScale(update.screenshot_scale || 100);
    setShowForm(true);
  };

  const processFile = (file) => {
    if (!file || !file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    setScreenshotFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setScreenshotPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleScreenshotChange = (e) => {
    processFile(e.target.files[0]);
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    processFile(file);
  };

  const handleSave = async () => {
    if (!version.trim() || !title.trim() || !description.trim()) {
      toast.error('Version, title, and description are required');
      return;
    }

    setSaving(true);

    let screenshotUrl = editingUpdate?.screenshot_url || '';

    if (screenshotFile) {
      setUploading(true);
      const { file_url } = await base44.integrations.Core.UploadFile({ file: screenshotFile });
      screenshotUrl = file_url;
      setUploading(false);
    }

    const payload = {
      version: version.trim(),
      title: title.trim(),
      description: description.trim(),
      screenshot_url: screenshotUrl,
      screenshot_x: screenshotX,
      screenshot_y: screenshotY,
      screenshot_scale: screenshotScale,
      published_date: editingUpdate?.published_date || new Date().toISOString(),
    };

    if (editingUpdate) {
      await base44.entities.AppUpdate.update(editingUpdate.id, payload);
      toast.success('Update edited');
    } else {
      payload.is_published = false;
      payload.likes_count = 0;
      payload.dislikes_count = 0;
      await base44.entities.AppUpdate.create(payload);
      toast.success('Update created');
    }

    await loadUpdates();
    resetForm();
    setSaving(false);
  };

  const togglePublish = async (update) => {
    const newState = !update.is_published;
    await base44.entities.AppUpdate.update(update.id, { is_published: newState });
    toast.success(newState ? 'Update published — users will see it' : 'Update unpublished');
    await loadUpdates();
  };

  const handleDelete = async (updateId) => {
    const [cmts, reactions, acks] = await Promise.all([
      base44.entities.UpdateComment.filter({ update_id: updateId }),
      base44.entities.UpdateReaction.filter({ update_id: updateId }),
      base44.entities.UpdateAcknowledgment.filter({ update_id: updateId }),
    ]);

    const deletions = [
      ...cmts.map(c => base44.entities.UpdateComment.delete(c.id)),
      ...reactions.map(r => base44.entities.UpdateReaction.delete(r.id)),
      ...acks.map(a => base44.entities.UpdateAcknowledgment.delete(a.id)),
      base44.entities.AppUpdate.delete(updateId),
    ];
    await Promise.all(deletions);

    toast.success('Update deleted');
    await loadUpdates();
    setDeleteConfirm(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={onBack} className="dark:text-gray-300">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Keys
          </Button>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-amber-500" />
            Update Pusher
          </h2>
        </div>
        {!showForm && (
          <Button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="premium-btn-primary bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-md"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Update
          </Button>
        )}
      </div>

      {showForm ? (
        <Card className="p-6 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {editingUpdate ? 'Edit Update' : 'Create New Update'}
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(true)}
              className="border-amber-700/50 text-amber-400 hover:text-amber-300 hover:border-amber-600"
            >
              <MonitorPlay className="w-4 h-4 mr-2" />
              Preview
            </Button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-700 dark:text-gray-300 mb-2">Version *</Label>
                <Input
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  placeholder="e.g., v1.02"
                  className="dark:bg-gray-800 dark:border-gray-700"
                />
              </div>
              <div>
                <Label className="text-gray-700 dark:text-gray-300 mb-2">Update Name *</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder='e.g., Social Media Function'
                  className="dark:bg-gray-800 dark:border-gray-700"
                />
              </div>
            </div>

            <div>
              <Label className="text-gray-700 dark:text-gray-300 mb-2">Description *</Label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Hello everyone! Hope you're having a great study session..."
                rows={4}
                className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm resize-y"
              />
            </div>

            <div>
              <Label className="text-gray-700 dark:text-gray-300 mb-2">Screenshot</Label>
              
              {/* Drag & drop zone */}
              <div
                ref={dropZoneRef}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative rounded-lg border-2 border-dashed transition-all duration-200 ${
                  isDragOver
                    ? 'border-amber-500 bg-amber-500/10'
                    : 'border-gray-300 dark:border-gray-600 hover:border-amber-500/50'
                } ${screenshotPreview ? 'p-3' : 'p-6'}`}
              >
                {isDragOver && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-amber-500/10 backdrop-blur-[1px]">
                    <div className="text-amber-400 font-semibold text-sm flex items-center gap-2">
                      <Upload className="w-5 h-5" />
                      Drop image here
                    </div>
                  </div>
                )}

                {!screenshotPreview ? (
                  <label className="cursor-pointer flex flex-col items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleScreenshotChange}
                      className="hidden"
                    />
                    <Upload className="w-6 h-6" />
                    <span>Click to upload or drag & drop an image</span>
                    <span className="text-xs text-gray-400">PNG, JPG, GIF</span>
                  </label>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">Screenshot uploaded</span>
                      <div className="flex gap-2">
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleScreenshotChange}
                            className="hidden"
                          />
                          <span className="text-xs text-amber-400 hover:text-amber-300 cursor-pointer">
                            Replace
                          </span>
                        </label>
                        <button
                          onClick={() => { setScreenshotFile(null); setScreenshotPreview(''); }}
                          className="text-xs text-red-400 hover:text-red-300"
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    <ScreenshotPositioner
                      imageUrl={screenshotPreview}
                      posX={screenshotX}
                      posY={screenshotY}
                      scale={screenshotScale}
                      onPositionChange={({ x, y, scale }) => {
                        setScreenshotX(x);
                        setScreenshotY(y);
                        setScreenshotScale(scale);
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={resetForm} className="dark:border-gray-700">
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || uploading}
                className="bg-amber-600 hover:bg-amber-700"
              >
                {saving ? <LoadingSpinner size="sm" /> : editingUpdate ? 'Save Changes' : 'Create Update'}
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {updates.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No updates yet. Create your first one!</p>
            </div>
          ) : (
            updates.map((update) => (
              <Card
                key={update.id}
                className="p-4 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-amber-300 dark:hover:border-amber-700 transition-colors"
              >
                <div className="flex items-start gap-4">
                  {update.screenshot_url && (
                    <img
                      src={update.screenshot_url}
                      alt={update.title}
                      className="w-20 h-14 rounded-lg object-cover flex-shrink-0 border border-gray-200 dark:border-gray-700"
                      style={{
                        objectPosition: `${update.screenshot_x || 50}% ${update.screenshot_y || 50}%`
                      }}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 text-xs">
                        {update.version}
                      </Badge>
                      <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                        {update.title}
                      </h4>
                      {update.is_published ? (
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 text-xs">
                          Published
                        </Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 text-xs">
                          Draft
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mb-1">
                      {update.description}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(update.published_date || update.created_date), 'MMM d, yyyy')}
                      </span>
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="w-3 h-3" /> {update.likes_count || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <ThumbsDown className="w-3 h-3" /> {update.dislikes_count || 0}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => togglePublish(update)}
                      title={update.is_published ? 'Unpublish' : 'Publish'}
                    >
                      {update.is_published ? (
                        <EyeOff className="w-4 h-4 text-gray-500" />
                      ) : (
                        <Eye className="w-4 h-4 text-green-500" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEdit(update)}
                    >
                      <Edit2 className="w-4 h-4 text-gray-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                      onClick={() => setDeleteConfirm(update)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <UpdatePreview
          version={version}
          title={title}
          description={description}
          screenshotUrl={screenshotPreview}
          screenshotX={screenshotX}
          screenshotY={screenshotY}
          screenshotScale={screenshotScale}
          onClose={() => setShowPreview(false)}
        />
      )}

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent className="dark:bg-gray-900 dark:border-gray-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="dark:text-white">Delete Update</AlertDialogTitle>
            <AlertDialogDescription className="dark:text-gray-400">
              This will permanently delete "{deleteConfirm?.title}" and all associated comments, reactions, and acknowledgments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="dark:border-gray-700">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDelete(deleteConfirm.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}