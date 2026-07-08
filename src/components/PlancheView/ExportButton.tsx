import html2pdf from 'html2pdf.js';

interface ExportButtonProps {
  targetId: string;
  fileName: string;
}

export function ExportButton({ targetId, fileName }: ExportButtonProps) {
  const handleExport = () => {
    const element = document.getElementById(targetId);
    if (!element) return;
    html2pdf()
      .set({
        margin: 10,
        filename: `${fileName}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      })
      .from(element)
      .save();
  };

  return (
    <button className="plai-btn mt-4" type="button" onClick={handleExport}>
      Exporter en PDF
    </button>
  );
}
