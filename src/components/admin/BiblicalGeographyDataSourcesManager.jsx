import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Database, Upload, GitBranch, CheckCircle2, AlertTriangle, RefreshCw, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import ThinkingOverlay from '@/components/ui/ThinkingOverlay';

const SOURCE_CATEGORIES = [
  'approved_locations_txt',
  'openbible_ancient',
  'openbible_modern',
  'openbible_geometry',
  'openbible_geojson',
  'openbible_kml',
  'other_reference'
];

export default function BiblicalGeographyDataSourcesManager() {
  const [sourceFiles, setSourceFiles] = useState([]);
  const [matches, setMatches] = useState([]);
  const [reviewQueue, setReviewQueue] = useState([]);
  const [uploadFile, setUploadFile] = useState(null);
  const [sourceCategory, setSourceCategory] = useState('approved_locations_txt');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  const premiumButtonClass = 'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:scale-[0.98]';

  const loadAll = async () => {
    const [files, allMatches, queue] = await Promise.all([
      base44.entities.GeographySourceFile.list('-created_date'),
      base44.entities.BiblicalLocationImportMatch.list('-created_date', 500),
      base44.entities.BiblicalLocationReviewQueue.list('-created_date', 500)
    ]);
    setSourceFiles(files);
    setMatches(allMatches);
    setReviewQueue(queue);
  };

  const handleUploadAndParse = async () => {
    if (!uploadFile) {
      toast.error('Choose a source file first');
      return;
    }

    setBusy(true);
    try {
      const upload = await base44.integrations.Core.UploadFile({ file: uploadFile });
      const response = await base44.functions.invoke('processBiblicalGeographySource', {
        action: 'parse_source',
        originalFilename: uploadFile.name,
        sourceCategory,
        fileUrl: upload.file_url
      });
      toast.success(`Parsed ${response.data.parsedCount} records`);
      setUploadFile(null);
      await loadAll();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to parse source file');
    } finally {
      setBusy(false);
    }
  };

  const runMatching = async (sourceFileId) => {
    setBusy(true);
    try {
      const response = await base44.functions.invoke('processBiblicalGeographySource', {
        action: 'run_matching',
        sourceFileId
      });
      toast.success(`Matched ${response.data.matchedCount} candidates`);
      await loadAll();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to run matching');
    } finally {
      setBusy(false);
    }
  };

  const publishApproved = async (sourceFileId) => {
    setBusy(true);
    try {
      const response = await base44.functions.invoke('processBiblicalGeographySource', {
        action: 'publish_approved',
        sourceFileId
      });
      toast.success(`Published ${response.data.publishedCount} records`);
      await loadAll();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to publish approved records');
    } finally {
      setBusy(false);
    }
  };

  const setMatchStatus = async (matchId, reviewStatus) => {
    await base44.entities.BiblicalLocationImportMatch.update(matchId, { review_status: reviewStatus });
    await loadAll();
  };

  return (
    <>
      <ThinkingOverlay
        visible={busy}
        title="Processing geography source…"
        subtitle="Uploading, parsing, matching, or publishing biblical geography data."
      />
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Biblical Geography Data Sources</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Upload raw source files, parse them into staging tables, review matches, and publish approved biblical geography data.</p>
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 space-y-4">
          <div className="grid gap-4 lg:grid-cols-[1fr_260px_auto] lg:items-end">
            <div>
              <Label className="mb-2 block text-gray-700 dark:text-gray-300">Raw Source File</Label>
              <div className="rounded-2xl border border-gray-200/80 dark:border-gray-700 bg-gradient-to-br from-slate-900 to-slate-800 p-4 shadow-inner">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-orange-600/15 p-3 ring-1 ring-orange-500/20">
                      <FileText className="w-5 h-5 text-orange-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Upload a raw geography source file</p>
                      <p className="mt-1 text-xs text-slate-400">Supports TXT, JSONL, GeoJSON, KML, and KMZ ingestion sources.</p>
                    </div>
                  </div>
                  {uploadFile && (
                    <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-slate-200 ring-1 ring-white/10">
                      {uploadFile.name}
                    </div>
                  )}
                </div>

                <label className="mt-4 flex cursor-pointer items-center justify-center gap-3 rounded-xl border border-dashed border-orange-500/30 bg-white/5 px-4 py-4 text-center transition-all duration-200 hover:border-orange-400/60 hover:bg-white/10">
                  <Upload className="w-5 h-5 text-orange-400" />
                  <div>
                    <div className="text-sm font-semibold text-white">Choose source file</div>
                    <div className="text-xs text-slate-400">TXT, JSONL, GEOJSON, KML, or KMZ</div>
                  </div>
                  <Input type="file" accept=".jsonl,.geojson,.kml,.kmz,.txt" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} className="sr-only" />
                </label>
              </div>
            </div>
            <div>
              <Label className="mb-2 block text-gray-700 dark:text-gray-300">Source Category</Label>
              <Select value={sourceCategory} onValueChange={setSourceCategory}>
                <SelectTrigger className="text-white dark:bg-gray-800 dark:border-gray-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleUploadAndParse} className={`bg-orange-600 hover:bg-orange-700 text-white ${premiumButtonClass}`}>
              <Upload className="w-4 h-4 mr-2" /> Upload & Parse
            </Button>
          </div>
        </div>

        <Tabs defaultValue="sources" className="space-y-4">
          <TabsList className="dark:bg-gray-800">
            <TabsTrigger value="sources">Source Files</TabsTrigger>
            <TabsTrigger value="matches">Matches</TabsTrigger>
            <TabsTrigger value="review">Review Queue</TabsTrigger>
          </TabsList>

          <TabsContent value="sources">
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-orange-600" />
                  <h4 className="font-semibold text-gray-900 dark:text-white">Uploaded Data Sources</h4>
                </div>
                <Button variant="outline" onClick={loadAll} className={`text-white dark:border-gray-700 dark:text-white hover:bg-gray-800 ${premiumButtonClass}`}>
                  <RefreshCw className="w-4 h-4 mr-2" /> Refresh
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="dark:border-gray-800">
                    <TableHead className="dark:text-white">Filename</TableHead>
                    <TableHead className="dark:text-white">Type</TableHead>
                    <TableHead className="dark:text-white">Category</TableHead>
                    <TableHead className="dark:text-white">Status</TableHead>
                    <TableHead className="dark:text-white">Counts</TableHead>
                    <TableHead className="dark:text-white">Uploaded</TableHead>
                    <TableHead className="text-right dark:text-white">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sourceFiles.map((file) => (
                    <TableRow key={file.id} className="dark:border-gray-800">
                      <TableCell className="font-medium text-gray-900 dark:text-white">{file.original_filename}</TableCell>
                      <TableCell className="text-gray-900 dark:text-white">{file.detected_file_type}</TableCell>
                      <TableCell className="font-mono text-xs text-gray-900 dark:text-white">{file.source_category}</TableCell>
                      <TableCell>
                        <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                          {file.processing_status}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-gray-700 dark:text-gray-300">parsed {file.parsed_count || 0} • matched {file.matched_count || 0} • published {file.published_count || 0} • failed {file.failed_count || 0}</TableCell>
                      <TableCell className="text-sm text-gray-700 dark:text-gray-300">{format(new Date(file.upload_timestamp || file.created_date), 'MMM d, yyyy h:mm a')}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" variant="outline" onClick={() => runMatching(file.id)} className={`bg-slate-950 text-white border-gray-700 hover:bg-gray-800 dark:bg-slate-950 dark:border-gray-700 dark:text-white ${premiumButtonClass}`}>
                          <GitBranch className="w-4 h-4 mr-1" /> Match
                        </Button>
                        <Button size="sm" onClick={() => publishApproved(file.id)} className={`bg-amber-600 hover:bg-amber-700 text-white ${premiumButtonClass}`}>
                          <CheckCircle2 className="w-4 h-4 mr-1" /> Publish
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {sourceFiles.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-gray-500">No source files uploaded yet</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="matches">
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800">
                <h4 className="font-semibold text-gray-900 dark:text-white">Matched Records</h4>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="dark:border-gray-800">
                    <TableHead className="dark:text-white">Approved Location</TableHead>
                    <TableHead className="dark:text-white">Candidate</TableHead>
                    <TableHead className="dark:text-white">Type</TableHead>
                    <TableHead className="dark:text-white">Confidence</TableHead>
                    <TableHead className="dark:text-white">Status</TableHead>
                    <TableHead className="text-right dark:text-white">Review</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matches.map((match) => (
                    <TableRow key={match.id} className="dark:border-gray-800">
                      <TableCell className="font-medium text-gray-900 dark:text-white">{match.approved_location_name}</TableCell>
                      <TableCell className="text-gray-900 dark:text-white">{match.candidate_name}</TableCell>
                      <TableCell className="text-xs font-mono text-gray-900 dark:text-white">{match.match_type}</TableCell>
                      <TableCell className="text-gray-900 dark:text-white">{(match.match_confidence || 0).toFixed(2)}</TableCell>
                      <TableCell className="text-gray-900 dark:text-white">{match.review_status}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" variant="outline" onClick={() => setMatchStatus(match.id, 'approved')} className={`text-white dark:border-gray-700 dark:text-white hover:bg-gray-800 ${premiumButtonClass}`}>Approve</Button>
                        <Button size="sm" variant="outline" onClick={() => setMatchStatus(match.id, 'rejected')} className={`text-white dark:border-gray-700 dark:text-white hover:bg-gray-800 ${premiumButtonClass}`}>Reject</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {matches.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-gray-500">No matches yet</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="review">
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <h4 className="font-semibold text-gray-900 dark:text-white">Unresolved / Manual Review Queue</h4>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="dark:border-gray-800">
                    <TableHead className="dark:text-white">Approved Location</TableHead>
                    <TableHead className="dark:text-white">Issue Type</TableHead>
                    <TableHead className="dark:text-white">Details</TableHead>
                    <TableHead className="dark:text-white">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reviewQueue.map((item) => (
                    <TableRow key={item.id} className="dark:border-gray-800">
                      <TableCell className="font-medium text-gray-900 dark:text-white">{item.approved_location_name}</TableCell>
                      <TableCell className="text-gray-900 dark:text-white">{item.issue_type}</TableCell>
                      <TableCell className="text-sm text-gray-500 dark:text-gray-300">{item.details}</TableCell>
                      <TableCell className="text-gray-900 dark:text-white">{item.status}</TableCell>
                    </TableRow>
                  ))}
                  {reviewQueue.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-10 text-gray-500">No unresolved records</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}