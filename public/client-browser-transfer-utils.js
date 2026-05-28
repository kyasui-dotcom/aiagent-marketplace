export function createClientBrowserTransferUtils(deps = {}) {
  const {
    Blob,
    URL,
    buildDeliveryZipBlob,
    document,
    flash = () => {},
    navigator
  } = deps;

  async function copyTextToClipboard(text, label = 'Copied.') {
    if (!text) {
      flash('Nothing to copy.', 'error');
      return;
    }
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        if (label) flash(label, 'ok');
        return;
      }
    } catch {}
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'absolute';
    area.style.left = '-9999px';
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    document.body.removeChild(area);
    if (label) flash(label, 'ok');
  }

  function downloadBlob(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function downloadDeliveryFile(file = {}) {
    const content = String(file.content || '');
    if (!content) {
      flash('No file content to download.', 'error');
      return;
    }
    const fileName = file.name || 'delivery.txt';
    const blob = new Blob([content], { type: file.type || 'text/plain;charset=utf-8' });
    downloadBlob(blob, fileName);
    flash(`Downloaded ${fileName}.`, 'ok');
  }

  function downloadDeliverySummaryFile(run = null, summaryText = '') {
    const content = String(summaryText || '').trim();
    if (!content) {
      flash('No summary to download.', 'error');
      return;
    }
    const orderId = String(run?.id || '').trim().slice(0, 8);
    const fileName = `delivery-summary-${orderId || new Date().toISOString().slice(0, 10)}.md`;
    const blob = new Blob([`${content}\n`], { type: 'text/markdown;charset=utf-8' });
    downloadBlob(blob, fileName);
    flash(`Downloaded ${fileName}.`, 'ok');
  }

  function downloadDeliveryZip(files = [], run = null) {
    const zipBlob = buildDeliveryZipBlob(files);
    if (!zipBlob) {
      flash('No delivery files to zip.', 'error');
      return;
    }
    const orderId = String(run?.id || '').trim().slice(0, 8);
    const fileName = `delivery-${orderId || new Date().toISOString().slice(0, 10)}.zip`;
    downloadBlob(zipBlob, fileName);
    flash(`Downloaded ${fileName}.`, 'ok');
  }

  return {
    copyTextToClipboard,
    downloadDeliveryFile,
    downloadDeliverySummaryFile,
    downloadDeliveryZip
  };
}
