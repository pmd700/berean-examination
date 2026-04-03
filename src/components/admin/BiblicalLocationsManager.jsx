import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MapPin, Plus, Upload, RefreshCw, Trash2, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import ThinkingOverlay from '@/components/ui/ThinkingOverlay';

export default function BiblicalLocationsManager() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState('');
  const [importText, setImportText] = useState('');
  const [importResults, setImportResults] = useState(null);
  const [errors, setErrors] = useState({});
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [deleting, setDeleting] = useState(false);
  const [sortOrder, setSortOrder] = useState('alphabetical');
  const [formData, setFormData] = useState({
    biblical_location_name: '',
    bible_verses: ''
  });

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    setLoading(true);
    const rows = await base44.entities.BiblicalLocation.list('-created_date');
    setLocations(rows);
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({ biblical_location_name: '', bible_verses: '' });
    setErrors({});
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);else
      next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === locations.length && locations.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(locations.map((location) => location.id)));
    }
  };

  const deleteLocation = async (id) => {
    setDeleting(true);
    try {
      const response = await base44.functions.invoke('deleteBiblicalLocations', { ids: [id] });
      if (response.data.error) {
        toast.error(response.data.error);
        return;
      }
      await loadLocations();
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      toast.success('Biblical location deleted');
    } finally {
      setDeleting(false);
    }
  };

  const deleteSelected = async () => {
    if (selectedIds.size === 0) return;
    const existingIds = new Set(locations.map((location) => location.id));
    const idsToDelete = [...selectedIds].filter((id) => existingIds.has(id));
    if (idsToDelete.length === 0) {
      setSelectedIds(new Set());
      return;
    }

    setDeleting(true);
    try {
      const response = await base44.functions.invoke('deleteBiblicalLocations', { ids: idsToDelete });
      if (response.data.error) {
        toast.error(response.data.error);
        return;
      }

      await loadLocations();
      setSelectedIds(new Set());
      if ((response.data.failedCount || 0) > 0) {
        toast.success(`Deleted ${response.data.deletedCount} biblical locations (${response.data.failedCount} need another pass)`);
      } else {
        toast.success(`Deleted ${response.data.deletedCount} biblical locations`);
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleSave = async () => {
    const nextErrors = {};
    if (!formData.biblical_location_name.trim()) nextErrors.biblical_location_name = 'Biblical Location Name is required';
    if (!formData.bible_verses.trim()) nextErrors.bible_verses = 'Bible Verses is required';
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSaving(true);
    const response = await base44.functions.invoke('processBiblicalLocations', {
      mode: 'validate',
      verseString: formData.bible_verses.trim()
    });

    if (!response.data.valid) {
      setErrors({ bible_verses: response.data.errors.join(' • ') });
      setSaving(false);
      return;
    }

    await base44.entities.BiblicalLocation.create({
      biblical_location_name: formData.biblical_location_name.trim(),
      bible_verses: response.data.normalized
    });

    toast.success('Biblical location created');
    await loadLocations();
    resetForm();
    setOpen(false);
    setSaving(false);
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setImportText(await file.text());
  };

  const handleImport = async () => {
    if (!importText.trim()) {
      toast.error('Upload or paste a text file first');
      return;
    }

    setImporting(true);
    try {
      const response = await base44.functions.invoke('processBiblicalLocations', {
        mode: 'import',
        fileText: importText
      });

      setImportResults(response.data);
      await loadLocations();
      toast.success(`Imported ${response.data.totalImported} biblical locations`);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const sortedLocations = [...locations].sort((a, b) => {
    if (sortOrder === 'newest') {
      return new Date(b.created_date) - new Date(a.created_date);
    }
    if (sortOrder === 'oldest') {
      return new Date(a.created_date) - new Date(b.created_date);
    }
    return a.biblical_location_name.localeCompare(b.biblical_location_name);
  });

  const premiumButtonClass = 'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:scale-[0.98]';

  return (
    <>
      <ThinkingOverlay
        visible={importing || deleting}
        title={deleting ? 'Deleting locations…' : 'Importing biblical places…'}
        subtitle={deleting ? 'Removing saved biblical locations and syncing the list.' : 'Parsing, validating, and saving biblical places. This may take a moment for larger files.'} />

      <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-gray-900 text-2xl font-bold dark:text-white">Biblical Places Importer</h3>
          
        </div>
        <div className="flex items-center gap-3">
          {selectedIds.size > 0 &&
            <Button variant="outline" onClick={deleteSelected} className={`border-red-700 text-white hover:bg-red-900/30 dark:border-red-700 ${premiumButtonClass}`}>
              <Trash2 className="w-4 h-4 mr-2" /> Delete Selected ({selectedIds.size})
            </Button>
            }
          <Button variant="outline" onClick={loadLocations} className={`text-white border-gray-700 hover:bg-gray-800 dark:border-gray-700 dark:text-white ${premiumButtonClass}`}>
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
          <Button onClick={() => setOpen(true)} className={`bg-orange-600 hover:bg-orange-700 text-white ${premiumButtonClass}`}>
            <Plus className="w-4 h-4 mr-2" /> Add New Biblical Location
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 space-y-4">
        <div>
          
          <div className="rounded-2xl border border-gray-200/80 dark:border-gray-700 bg-gradient-to-br from-slate-900 to-slate-800 p-4 shadow-inner">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-orange-600/15 p-3 ring-1 ring-orange-500/20">
                  <FileText className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Mass Import Text File</p>
                  <p className="mt-1 text-xs text-slate-400">Supports plain text blocks with one location name and one verse line per entry.</p>
                </div>
              </div>
              {fileName &&
                <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-slate-200 ring-1 ring-white/10">
                  {fileName}
                </div>
                }
            </div>

            <label className="mt-4 flex cursor-pointer items-center justify-center gap-3 rounded-xl border border-dashed border-orange-500/30 bg-white/5 px-4 py-4 text-center transition-all duration-200 hover:border-orange-400/60 hover:bg-white/10">
              <Upload className="w-5 h-5 text-orange-400" />
              <div>
                <div className="text-sm font-semibold text-white">Choose import file</div>
                <div className="text-xs text-slate-400">TXT, MD, or TEXT</div>
              </div>
              <Input type="file" accept=".txt,.md,.text" onChange={handleFileChange} className="sr-only" />
            </label>
          </div>
        </div>

        <div>
          <Label className="mb-2 block text-gray-700 dark:text-gray-300">Importer Preview / Paste Area</Label>
          <Textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              rows={10}
              placeholder={`Jerusalem\n2Sam 5:5, Ps 122:2, Isa 62:1\n\nMount Nebo\nNum 27:12, 33:47, 33:48, Deut 32:49`}
              className="font-mono text-sm text-white placeholder:text-gray-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:placeholder:text-gray-500" />

        </div>

        <Button onClick={handleImport} disabled={importing} className={`bg-amber-600 hover:bg-amber-700 text-white ${premiumButtonClass}`}>
          <Upload className="w-4 h-4 mr-2" /> {importing ? 'Importing...' : 'Run Import'}
        </Button>

        {importResults &&
          <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950/50 p-4 space-y-3">
            <div className="grid gap-2 sm:grid-cols-3 text-sm text-gray-900 dark:text-white">
              <div className="rounded-md bg-white/70 dark:bg-gray-900 px-3 py-2">Total parsed: <span className="font-semibold text-white dark:text-white">{importResults.totalParsed}</span></div>
              <div className="rounded-md bg-white/70 dark:bg-gray-900 px-3 py-2">Total imported: <span className="font-semibold text-green-600 dark:text-green-400">{importResults.totalImported}</span></div>
              <div className="rounded-md bg-white/70 dark:bg-gray-900 px-3 py-2">Total skipped: <span className="font-semibold text-red-600 dark:text-red-400">{importResults.totalSkipped}</span></div>
            </div>
            {importResults.errors?.length > 0 &&
            <div className="space-y-2">
                <p className="text-sm font-medium text-gray-900 dark:text-white">Skipped rows</p>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {importResults.errors.map((item, index) =>
                <div key={index} className="rounded-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-3 text-sm">
                      <div className="font-medium">Row {item.row}: {item.location}</div>
                      <div className="text-red-600 dark:text-red-400 mt-1">{item.reason}</div>
                    </div>
                )}
                </div>
              </div>
            }
          </div>
          }
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-orange-600" />
            <h4 className="font-semibold text-gray-900 dark:text-white">Saved Biblical Locations</h4>
          </div>
          <div className="w-full sm:w-[220px]">
            <Select value={sortOrder} onValueChange={setSortOrder}>
              <SelectTrigger className="text-white dark:bg-gray-800 dark:border-gray-700">
                <SelectValue placeholder="Sort order" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alphabetical">Alphabetical</SelectItem>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {loading ?
          <div className="p-8 text-center text-gray-500">Loading...</div> :

          <Table>
            <TableHeader>
              <TableRow className="dark:border-gray-800">
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === locations.length && locations.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500" />

                </TableHead>
                <TableHead>Biblical Location Name</TableHead>
                <TableHead>Bible Verses</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedLocations.map((location) =>
              <TableRow key={location.id} className="dark:border-gray-800">
                  <TableCell>
                    <input
                    type="checkbox"
                    checked={selectedIds.has(location.id)}
                    onChange={() => toggleSelect(location.id)}
                    className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500" />

                  </TableCell>
                  <TableCell className="font-medium text-gray-900 dark:text-white">{location.biblical_location_name}</TableCell>
                  <TableCell className="font-mono text-xs text-gray-600 dark:text-gray-300">{location.bible_verses}</TableCell>
                  <TableCell className="text-sm text-gray-500">{format(new Date(location.created_date), 'MMM d, yyyy')}</TableCell>
                  <TableCell className="text-right">
                    <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteLocation(location.id)}
                    className={`text-red-500 hover:text-red-600 hover:bg-red-900/20 ${premiumButtonClass}`}>

                      <Trash2 className="w-4 h-4 mr-1" /> Delete
                    </Button>
                  </TableCell>
                </TableRow>
              )}
              {locations.length === 0 &&
              <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-gray-500">No biblical locations imported yet</TableCell>
                </TableRow>
              }
            </TableBody>
          </Table>
          }
      </div>

      <Dialog open={open} onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) resetForm();
        }}>
        <DialogContent className="dark:bg-gray-900 dark:border-gray-800">
          <DialogHeader>
            <DialogTitle className="dark:text-white">Add New Biblical Location</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Biblical Location Name</Label>
              <Input
                  value={formData.biblical_location_name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, biblical_location_name: e.target.value }))}
                  className="dark:bg-gray-800 dark:border-gray-700" />

              {errors.biblical_location_name && <p className="mt-1 text-xs text-red-600">{errors.biblical_location_name}</p>}
            </div>
            <div>
              <Label className="mb-2 block">Bible Verses</Label>
              <Textarea
                  value={formData.bible_verses}
                  onChange={(e) => setFormData((prev) => ({ ...prev, bible_verses: e.target.value }))}
                  placeholder="Num 27:12, 33:47, 33:48, Deut 32:49, Jer 22:20"
                  rows={4}
                  className="dark:bg-gray-800 dark:border-gray-700" />

              {errors.bible_verses && <p className="mt-1 text-xs text-red-600">{errors.bible_verses}</p>}
            </div>
            <Button onClick={handleSave} disabled={saving} className={`w-full bg-orange-600 hover:bg-orange-700 text-white ${premiumButtonClass}`}>
              {saving ? 'Saving...' : 'Create Biblical Location'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </>);

}