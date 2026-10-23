import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { Camera, CameraOff, CheckCircle2, RefreshCw, Volume2, X } from 'lucide-react';
import { playBeep } from '../utils/audioUtils';

export default function BarcodeScanner({ open, onClose, onDetected }) {
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const onDetectedRef = useRef(onDetected);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [continuous, setContinuous] = useState(true);
  const [lastScanned, setLastScanned] = useState(null);
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  const handledCooldownRef = useRef(false);

  onDetectedRef.current = onDetected;

  useEffect(() => {
    if (!open) return undefined;
    setError('');
    setReady(false);
    setLastScanned(null);
    handledCooldownRef.current = false;

    const reader = new BrowserMultiFormatReader();
    let stopped = false;

    // List available cameras
    BrowserMultiFormatReader.listVideoInputDevices()
      .then((devs) => {
        if (!stopped && devs.length) {
          setDevices(devs);
          // Prefer rear/environment camera on phones
          const backCam = devs.find((d) => /back|rear|environment/i.test(d.label));
          setSelectedDevice(backCam ? backCam.deviceId : devs[0].deviceId);
        }
      })
      .catch(() => {});

    const start = async (deviceId = null) => {
      try {
        const constraints = deviceId
          ? { deviceId: { exact: deviceId } }
          : {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            };

        const controls = await reader.decodeFromConstraints(
          { audio: false, video: constraints },
          videoRef.current,
          (result) => {
            if (!result || handledCooldownRef.current || stopped) return;
            const text = result.getText();
            if (!text) return;

            handledCooldownRef.current = true;
            playBeep();
            setLastScanned(text);
            onDetectedRef.current(text);

            if (continuous) {
              // Pause scanning for 1.3 seconds before allowing next scan
              setTimeout(() => {
                if (!stopped) {
                  handledCooldownRef.current = false;
                  setLastScanned(null);
                }
              }, 1300);
            }
          },
        );

        controlsRef.current = controls;
        if (!stopped) setReady(true);
      } catch (err) {
        const name = err?.name || '';
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          setError('Camera permission was denied. Please allow camera access in browser settings, or use manual barcode entry.');
        } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
          setError('No camera found on this device. Use the manual barcode entry box.');
        } else if (!window.isSecureContext) {
          setError('Camera scanning requires HTTPS or localhost. Use manual barcode input.');
        } else {
          setError(err?.message || 'Could not start camera. Please enter barcode manually.');
        }
      }
    };

    start(selectedDevice || null);

    return () => {
      stopped = true;
      try {
        controlsRef.current?.stop();
      } catch {
        // already stopped
      }
    };
  }, [open, selectedDevice, continuous]);

  if (!open) return null;

  return (
    <div className="modal-backdrop scanner-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal-card scanner-card" onClick={(e) => e.stopPropagation()}>
        <div className="scanner-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Camera size={22} color="var(--blue)" />
            <h3 style={{ margin: 0 }}>Mobile Barcode Scanner</h3>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close scanner">
            <X size={20} />
          </button>
        </div>

        <div className="camera-frame">
          <video ref={videoRef} className="camera-video" muted playsInline autoPlay />
          <div className={`scan-guide ${lastScanned ? 'scanned' : ''}`}>
            <div className="scan-laser-line" />
            <div className="scan-corner top-left" />
            <div className="scan-corner top-right" />
            <div className="scan-corner bottom-left" />
            <div className="scan-corner bottom-right" />
          </div>
          {lastScanned ? (
            <div className="scan-success-pill animate-popIn">
              <CheckCircle2 size={18} />
              <span>Scanned: {lastScanned}</span>
            </div>
          ) : null}
        </div>

        {!ready && !error ? (
          <p className="muted center" style={{ margin: '10px 0', fontSize: '0.85rem' }}>
            Starting camera preview…
          </p>
        ) : null}

        {error ? (
          <div className="alert alert-error" style={{ margin: '12px 0' }}>
            <CameraOff size={18} />
            <span>{error}</span>
          </div>
        ) : (
          <div className="scanner-controls-row">
            <label className="field checkbox" style={{ margin: 0, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={continuous}
                onChange={(e) => setContinuous(e.target.checked)}
              />
              <span className="small">Keep scanner open for multiple scans</span>
            </label>

            {devices.length > 1 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <RefreshCw size={14} className="muted" />
                <select
                  value={selectedDevice}
                  onChange={(e) => setSelectedDevice(e.target.value)}
                  style={{ padding: '6px 10px', fontSize: '0.82rem', borderRadius: 6 }}
                >
                  {devices.map((d, i) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Camera ${i + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>
        )}

        <div className="scanner-instructions">
          <p className="tiny muted">
            <Volume2 size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            Position the barcode inside the frame. An audio beep sounds on successful scan.
          </p>
        </div>

        <div className="modal-actions" style={{ marginTop: 10 }}>
          <button type="button" className="btn btn-primary" style={{ width: '100%' }} onClick={onClose}>
            Done Scanning
          </button>
        </div>
      </div>
    </div>
  );
}
