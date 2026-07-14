import { useState } from 'react';
import html2pdf from 'html2pdf.js';

interface ExportButtonProps {
  targetId: string;
  fileName: string;
}

export function ExportButton({ targetId, fileName }: ExportButtonProps) {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setError(null);
    const element = document.getElementById(targetId);
    if (!element) {
      setError('Impossible de trouver le contenu à exporter.');
      return;
    }
    setExporting(true);
    try {
      await html2pdf()
        .set({
          margin: 10,
          filename: `${fileName}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        })
        .from(element)
        .save();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de l'export PDF");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="mt-4">
      <button className="plai-btn" type="button" disabled={exporting} onClick={handleExport} aria-busy={exporting}>
        {exporting ? 'Génération du PDF...' : 'Exporter en PDF'}
      </button>
      {error && (
        <div className="plai-error mt-2" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
