interface PrintHeaderProps {
  title: string;
  subtitle?: string;
  qrCodeUrl?: string;
  gymName?: string;
}

export function PrintHeader({ title, subtitle, qrCodeUrl, gymName }: PrintHeaderProps) {
  return (
    <div className="print-header">
      <div className="print-header-left">
        <div className="print-header-title">{title}</div>
        {subtitle && <div className="print-header-subtitle">{subtitle}</div>}
        {gymName && <div className="print-header-subtitle">{gymName}</div>}
      </div>
      {qrCodeUrl && (
        <div className="print-header-right">
          <div className="print-qr-code">
            <img src={qrCodeUrl} alt="二维码" />
            <div className="print-qr-label">扫码查看详情</div>
          </div>
        </div>
      )}
    </div>
  );
}

interface PrintFooterProps {
  pageNumber: number;
  totalPages?: number;
  gymName?: string;
  showDate?: boolean;
}

export function PrintFooter({ pageNumber, totalPages, gymName, showDate = true }: PrintFooterProps) {
  return (
    <div className="print-footer">
      <div className="print-footer-left">
        {gymName && <span>{gymName}</span>}
        {showDate && (
          <span>
            打印于 {new Date().toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
            })}
          </span>
        )}
      </div>
      <div className="print-footer-right">
        <span>
          第 {pageNumber} 页{totalPages ? ` / 共 ${totalPages} 页` : ''}
        </span>
      </div>
    </div>
  );
}
