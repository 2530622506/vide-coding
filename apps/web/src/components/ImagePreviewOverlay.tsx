import { Button, Image, Modal, Space, Typography } from "antd";
import { ExternalLink } from "lucide-react";

export type PreviewAsset = {
  id: string;
  asset_url: string;
  alt_text: string;
  source_url: string | null;
  source_page?: number | null;
};

export function ImagePreviewOverlay({ asset, onClose }: { asset: PreviewAsset | null; onClose: () => void }) {
  return (
    <Modal
      centered
      footer={asset?.source_url ? (
        <Button href={asset.source_url} icon={<ExternalLink size={14} />} rel="noreferrer" target="_blank" type="link">
          查看来源
        </Button>
      ) : null}
      onCancel={onClose}
      open={Boolean(asset)}
      title={asset?.alt_text || "题目图片"}
      width={980}
    >
      {asset ? (
        <Space className="imagePreviewContent" direction="vertical" size={12}>
          <Image alt={asset.alt_text} preview={false} src={asset.asset_url} />
          {asset.source_page ? <Typography.Text type="secondary">官方 PDF 第 {asset.source_page} 页</Typography.Text> : null}
        </Space>
      ) : null}
    </Modal>
  );
}
