import QrScanner from 'react-qr-scanner';

const readText = (data) => {
  if (!data) return '';
  if (typeof data === 'string') return data;
  return data.text || data.result?.text || '';
};

const QRScanner = ({ onScan, onError }) => {
  const handleScan = (data) => {
    const text = readText(data);
    if (text) onScan(text);
  };

  const handleError = (err) => {
    onError?.(err);
  };

  return (
    <div className="h-full w-full overflow-hidden bg-black">
      <QrScanner
        constraints={{ video: { facingMode: 'environment' } }}
        delay={350}
        onError={handleError}
        onScan={handleScan}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    </div>
  );
};

export default QRScanner;
