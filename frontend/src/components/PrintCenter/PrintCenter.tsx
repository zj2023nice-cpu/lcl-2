import { useState, useEffect, useRef, useMemo } from 'react';
import { Printer, FileImage, FileText, Layers, X, ZoomIn, ZoomOut, FileDown, QrCode, ChevronLeft, ChevronRight } from 'lucide-react';
import QRCode from 'qrcode';
import Modal from '@/components/UI/Modal';
import Button from '@/components/UI/Button';
import RouteOnlyTemplate from './RouteOnlyTemplate';
import FullReportTemplate from './FullReportTemplate';
import BatchPrintTemplate from './BatchPrintTemplate';
import type { PrintCenterProps, PrintTemplateType } from './types';
import { estimatePageCount, getRouteShareUrl } from './types';
import { useGymStore } from '@/store/gym';
import { cn } from '@/lib/utils';
import './print.css';

interface TemplateOption {
  type: PrintTemplateType;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const templateOptions: TemplateOption[] = [
  {
    type: 'route_only',
    title: '仅线路图',
    description: '单页打印，包含线路图示和基本信息',
    icon: <FileImage size={24} />,
  },
  {
    type: 'full_report',
    title: '完整报告',
    description: '多页报告，包含统计数据和攀爬记录',
    icon: <FileText size={24} />,
  },
  {
    type: 'batch',
    title: '批量打印',
    description: '多条线路整合打印，每页6条线路',
    icon: <Layers size={24} />,
  },
];

export default function PrintCenter({
  isOpen,
  onClose,
  route,
  wall,
  ascents = [],
  votes = [],
  allRoutes = [],
}: PrintCenterProps) {
  const { currentGym } = useGymStore();
  const printRef = useRef<HTMLDivElement>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<PrintTemplateType>('route_only');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [previewScale, setPreviewScale] = useState(0.6);
  const [isGenerating, setIsGenerating] = useState(false);

  const estimatedPages = useMemo(() => {
    return estimatePageCount(
      selectedTemplate,
      route,
      ascents,
      selectedTemplate === 'batch' ? allRoutes : []
    );
  }, [selectedTemplate, route, ascents, allRoutes]);

  useEffect(() => {
    if (isOpen && route) {
      generateQrCode();
    }
  }, [isOpen, route]);

  const generateQrCode = async () => {
    try {
      const url = getRouteShareUrl(route.id);
      const qrUrl = await QRCode.toDataURL(url, {
        width: 100,
        margin: 1,
        color: {
          dark: '#1F2937',
          light: '#FFFFFF',
        },
      });
      setQrCodeUrl(qrUrl);
    } catch (error) {
      console.error('Failed to generate QR code:', error);
    }
  };

  const handlePrint = () => {
    setIsGenerating(true);

    setTimeout(() => {
      const printContent = printRef.current;
      if (!printContent) return;

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('请允许弹出窗口以进行打印');
        setIsGenerating(false);
        return;
      }

      const styles = Array.from(document.styleSheets)
        .map((sheet) => {
          try {
            return Array.from(sheet.cssRules || [])
              .map((rule) => rule.cssText)
              .join('\n');
          } catch {
            return '';
          }
        })
        .join('\n');

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${route.name} - 打印</title>
          <style>${styles}</style>
          <style>
            @media print {
              body {
                margin: 0;
                padding: 0;
              }
              .no-print {
                display: none !important;
              }
            }
            @page {
              size: A4;
              margin: 15mm;
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
        </html>
      `);

      printWindow.document.close();
      setIsGenerating(false);
    }, 300);
  };

  const handleZoomIn = () => {
    setPreviewScale((prev) => Math.min(prev + 0.1, 1.2));
  };

  const handleZoomOut = () => {
    setPreviewScale((prev) => Math.max(prev - 0.1, 0.3));
  };

  const renderTemplate = () => {
    const gymName = currentGym?.name;

    switch (selectedTemplate) {
      case 'route_only':
        return (
          <RouteOnlyTemplate
            route={route}
            wall={wall}
            qrCodeUrl={qrCodeUrl}
            gymName={gymName}
          />
        );
      case 'full_report':
        return (
          <FullReportTemplate
            route={route}
            wall={wall}
            ascents={ascents}
            votes={votes}
            qrCodeUrl={qrCodeUrl}
            gymName={gymName}
          />
        );
      case 'batch':
        const routesToPrint = allRoutes.length > 0 ? allRoutes : [route];
        return (
          <BatchPrintTemplate
            routes={routesToPrint}
            wall={wall}
            qrCodeUrl={qrCodeUrl}
            gymName={gymName}
          />
        );
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="打印中心"
      size="xl"
      className="!max-w-6xl"
    >
      <div className="flex h-[70vh] gap-6">
        <div className="w-64 flex-shrink-0 space-y-6 overflow-y-auto pr-2">
          <div>
            <h3 className="text-sm font-semibold text-theme-text mb-3">选择模板</h3>
            <div className="space-y-2">
              {templateOptions.map((option) => (
                <button
                  key={option.type}
                  onClick={() => setSelectedTemplate(option.type)}
                  className={cn(
                    'print-template-option',
                    selectedTemplate === option.type && 'selected'
                  )}
                >
                  <div className="print-template-icon">
                    {option.icon}
                  </div>
                  <div className="print-template-title">{option.title}</div>
                  <div className="print-template-desc">{option.description}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-theme-border pt-4">
            <h3 className="text-sm font-semibold text-theme-text mb-3">打印设置</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-theme-text-muted">纸张</span>
                <span className="text-theme-text font-medium">A4</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-theme-text-muted">方向</span>
                <span className="text-theme-text font-medium">纵向</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-theme-text-muted">页眉页脚</span>
                <span className="text-green-400 font-medium">已启用</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-theme-text-muted">二维码</span>
                <span className="text-green-400 font-medium">已启用</span>
              </div>
            </div>
          </div>

          <div className="border-t border-theme-border pt-4">
            <h3 className="text-sm font-semibold text-theme-text mb-3">页数估算</h3>
            <div className="print-page-count">
              <FileText size={18} className="text-theme-text-muted" />
              <span>预计</span>
              <strong>{estimatedPages}</strong>
              <span>页</span>
            </div>
          </div>

          <div className="border-t border-theme-border pt-4 space-y-3">
            <Button
              variant="primary"
              fullWidth
              onClick={handlePrint}
              isLoading={isGenerating}
              className="gap-2"
            >
              <Printer size={18} />
              {isGenerating ? '准备中...' : '打印'}
            </Button>
            <Button
              variant="outline"
              fullWidth
              onClick={onClose}
              className="gap-2"
            >
              <X size={18} />
              关闭
            </Button>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-theme-text-muted">预览</span>
              <span className="print-mode-badge">
                {templateOptions.find((t) => t.type === selectedTemplate)?.title}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleZoomOut}
                className="p-2 rounded-lg text-theme-text-secondary hover:text-theme-text hover:bg-theme-hover transition-colors"
                title="缩小"
              >
                <ZoomOut size={18} />
              </button>
              <span className="text-sm text-theme-text-muted w-16 text-center">
                {Math.round(previewScale * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                className="p-2 rounded-lg text-theme-text-secondary hover:text-theme-text hover:bg-theme-hover transition-colors"
                title="放大"
              >
                <ZoomIn size={18} />
              </button>
            </div>
          </div>

          <div className="print-preview-wrapper flex-1">
            <div
              ref={printRef}
              style={{
                transform: `scale(${previewScale})`,
                transformOrigin: 'top center',
              }}
            >
              {renderTemplate()}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-theme-text-muted">
            <div className="flex items-center gap-2">
              <QrCode size={14} />
              <span>二维码链接到线路详情页</span>
            </div>
            <div className="flex items-center gap-2">
              <FileDown size={14} />
              <span>A4 纸张 · {estimatedPages} 页</span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
