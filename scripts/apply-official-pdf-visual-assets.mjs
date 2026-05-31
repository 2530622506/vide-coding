import { readFile, writeFile } from "node:fs/promises";

const detailsPath = "data/classification/problem-details.json";
const assetsPath = "data/problem-ingestion/official-pdf-visual-assets.json";

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function updateCompleteness(record) {
  return {
    ...record.completeness,
    has_visual_assets: record.visual_assets.assets.length > 0,
    needs_visual_asset_collection: record.visual_assets.status === "pending_collection",
    needs_source_enrichment:
      (record.question_type === "selection" && record.choice_options.options.length === 0) ||
      record.visual_assets.status === "pending_collection" ||
      (record.question_type === "programming" && !record.programming_solution.code)
  };
}

function normalizeAsset(asset, index) {
  return {
    id: asset.id,
    asset_url: asset.asset_url,
    alt_text: asset.alt_text,
    source_url: asset.source_url,
    source_page: asset.source_page,
    source_status: asset.source_status,
    review_status: asset.review_status,
    asset_kind: asset.asset_kind,
    extraction_method: asset.extraction_method,
    bbox: asset.bbox,
    width_px: asset.width_px,
    height_px: asset.height_px,
    sha256: asset.sha256,
    sort_order: index + 1
  };
}

async function main() {
  const [details, visualAssets] = await Promise.all([
    readJson(detailsPath),
    readJson(assetsPath)
  ]);

  const assetsByOfficialId = new Map();
  for (const asset of visualAssets.documents.flatMap((document) => document.assets)) {
    const list = assetsByOfficialId.get(asset.official_problem_id) || [];
    list.push(asset);
    assetsByOfficialId.set(asset.official_problem_id, list);
  }

  let officialPdfVisualRecordCount = 0;
  let officialPdfVisualAssetCount = 0;
  let sourceExtractedRecordCount = 0;
  let sourceExtractedAssetCount = 0;
  let noneFoundCount = 0;

  const records = details.records.map((record) => {
    const extractedAssets = assetsByOfficialId.get(record.official_problem_id) || [];
    let nextRecord = record;

    if (extractedAssets.length > 0) {
      const existingAssets = (record.visual_assets.assets || []).filter((asset) => asset.extraction_method !== "pymupdf_image_region_crop");
      const mergedAssets = [
        ...existingAssets,
        ...extractedAssets.map((asset, index) => normalizeAsset(asset, existingAssets.length + index))
      ];
      nextRecord = {
        ...record,
        visual_assets: {
          ...record.visual_assets,
          status: "source_extracted",
          assets: mergedAssets,
          expected_asset_kinds: record.visual_assets.expected_asset_kinds || ["figure", "table_image", "formula_image", "code_screenshot"],
          notes: [
            "已从官方 PDF 抽取题目相关图片或代码截图区域，资产仍需人工对照原 PDF 复核。",
            "图片文件只保存裁剪区域，不保存完整 PDF 页面。"
          ]
        }
      };
      officialPdfVisualRecordCount += 1;
      officialPdfVisualAssetCount += extractedAssets.length;
    } else if (record.visual_assets.status === "pending_collection") {
      nextRecord = {
        ...record,
        visual_assets: {
          ...record.visual_assets,
          status: "none_found",
          assets: [],
          notes: [
            "官方 PDF 图片采集器未发现可稳定归属到本题的图片区域。",
            "若题干仍疑似依赖图形、表格或示意图，需要人工复核原 PDF；公开来源仍缺失时可补 AI 生成示意图，但必须显式标注 AI 生成和需甄别。"
          ]
        }
      };
      noneFoundCount += 1;
    } else if (record.visual_assets.status === "none_found") {
      noneFoundCount += 1;
    }

    const completedRecord = {
      ...nextRecord,
      completeness: updateCompleteness(nextRecord)
    };
    if (completedRecord.visual_assets.status === "source_extracted") {
      sourceExtractedRecordCount += 1;
      sourceExtractedAssetCount += completedRecord.visual_assets.assets.length;
    }
    return completedRecord;
  });

  const summary = {
    ...details.summary,
    pending_visual_asset_collection_count: records.filter((record) => record.completeness.needs_visual_asset_collection).length,
    official_pdf_visual_asset_record_count: officialPdfVisualRecordCount,
    official_pdf_visual_asset_count: officialPdfVisualAssetCount,
    source_extracted_visual_asset_record_count: sourceExtractedRecordCount,
    source_extracted_visual_asset_count: sourceExtractedAssetCount,
    visual_asset_none_found_count: noneFoundCount
  };

  const output = {
    ...details,
    generated_at: new Date().toISOString(),
    official_pdf_visual_assets: {
      source: assetsPath,
      summary: visualAssets.summary,
      review_status: "needs_review"
    },
    summary,
    records
  };

  await writeFile(detailsPath, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`official PDF visual asset records: ${officialPdfVisualRecordCount}`);
  console.log(`official PDF visual assets: ${officialPdfVisualAssetCount}`);
  console.log(`source-extracted visual asset records: ${sourceExtractedRecordCount}`);
  console.log(`source-extracted visual assets: ${sourceExtractedAssetCount}`);
  console.log(`visual asset none found records: ${noneFoundCount}`);
  console.log(`pending visual asset collection count: ${summary.pending_visual_asset_collection_count}`);
  console.log(`wrote ${detailsPath}`);
}

main().catch((error) => {
  console.error(`Apply official PDF visual assets failed: ${error.message}`);
  process.exitCode = 1;
});
