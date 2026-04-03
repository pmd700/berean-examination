import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const TEST_FILENAMES = ['sample.kml', 'sample.geojson', 'places.txt'];
const STAGING_ENTITIES = [
  'StagingApprovedPlace',
  'StagingOpenBibleAncient',
  'StagingOpenBibleModern',
  'StagingOpenBibleGeometry',
  'StagingGeojsonFeature',
  'StagingKmlFeature'
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!user.is_admin && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const sourceFiles = await base44.asServiceRole.entities.GeographySourceFile.list('-created_date', 200);
    const testFiles = sourceFiles.filter((row) => TEST_FILENAMES.includes(row.original_filename || row.data?.original_filename));
    const sourceFileIds = testFiles.map((row) => row.id);

    for (const sourceFileId of sourceFileIds) {
      const importRuns = await base44.asServiceRole.entities.GeographyImportRun.filter({ source_file_id: sourceFileId });
      for (const row of importRuns) {
        await base44.asServiceRole.entities.GeographyImportRun.delete(row.id);
      }

      const matches = await base44.asServiceRole.entities.BiblicalLocationImportMatch.filter({ source_file_id: sourceFileId });
      for (const row of matches) {
        await base44.asServiceRole.entities.BiblicalLocationImportMatch.delete(row.id);
      }

      const reviewQueue = await base44.asServiceRole.entities.BiblicalLocationReviewQueue.filter({ source_file_id: sourceFileId });
      for (const row of reviewQueue) {
        await base44.asServiceRole.entities.BiblicalLocationReviewQueue.delete(row.id);
      }

      for (const entityName of STAGING_ENTITIES) {
        const rows = await base44.asServiceRole.entities[entityName].filter({ source_file_id: sourceFileId });
        for (const row of rows) {
          await base44.asServiceRole.entities[entityName].delete(row.id);
        }
      }

      await base44.asServiceRole.entities.GeographySourceFile.delete(sourceFileId);
    }

    return Response.json({
      success: true,
      removedCount: sourceFileIds.length,
      removedIds: sourceFileIds
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});