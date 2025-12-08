'use client';

import { useState } from 'react';

export default function TestGatewayPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>('');

  const testGateway = async () => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const testPayload = {
        Amount: 100.50,
        Installment: 1,
        ClientReferenceCode: "TEST-FRONTEND-001",
        Use3d: true,
        UseSafeKey: false,
        VirtualPosId: 13, // ParamTekÇekim
        ReturnUrl: "https://dd59db120e1a.ngrok-free.app/payment-result",
        CreditCard: {
          CardHolderName: "TEST USER",
          CardNumber: "5555555555554444",
          CvcNumber: "123",
          ExpMonth: 12,
          ExpYear: 2027
        }
      };

      const response = await fetch('https://netahsilatapi.compiturk.com.tr/api/netahsilat/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testPayload)
      });

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-8">
          <div className="card">
            <div className="card-header">
              <h4>Gateway Direkt Test</h4>
            </div>
            <div className="card-body">
              <button 
                className="btn btn-primary mb-3" 
                onClick={testGateway}
                disabled={loading}
              >
                {loading ? 'Test Ediliyor...' : 'Gateway Test Et'}
              </button>

              {error && (
                <div className="alert alert-danger">
                  <strong>Hata:</strong> {error}
                </div>
              )}

              {result && (
                <div className="alert alert-info">
                  <h5>Gateway Yanıtı:</h5>
                  <pre className="bg-light p-3 rounded">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              )}

              <div className="mt-3">
                <h6>Test Payload:</h6>
                <ul>
                  <li>Amount: 100.50 TL</li>
                  <li>Installment: 1 (Tek Çekim)</li>
                  <li>VirtualPosId: 13 (ParamTekÇekim)</li>
                  <li>Card: 5555555555554444</li>
                  <li>Use3d: true</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
