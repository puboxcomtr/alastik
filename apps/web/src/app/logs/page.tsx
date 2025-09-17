'use client';

import React, { useState, useEffect } from 'react';
import { logger, LogEntry } from '../../lib/logger';

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [filters, setFilters] = useState({
    type: 'all' as 'all' | LogEntry['type'],
    page: 'all',
    search: ''
  });
  const [analytics, setAnalytics] = useState<any>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);

  useEffect(() => {
    loadLogs();
  }, []);

  useEffect(() => {
    filterLogs();
  }, [logs, filters]);

  const loadLogs = () => {
    const allLogs = logger.getLogs();
    setLogs(allLogs);
    setAnalytics(logger.getAnalytics());
  };

  const filterLogs = () => {
    let filtered = [...logs];

    // Tip filtresi
    if (filters.type !== 'all') {
      filtered = filtered.filter(log => log.type === filters.type);
    }

    // Sayfa filtresi
    if (filters.page !== 'all') {
      filtered = filtered.filter(log => log.page === filters.page);
    }

    // Arama filtresi
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(log => 
        log.action.toLowerCase().includes(searchLower) ||
        log.page.toLowerCase().includes(searchLower) ||
        (log.data && JSON.stringify(log.data).toLowerCase().includes(searchLower)) ||
        (log.error && log.error.toLowerCase().includes(searchLower))
      );
    }

    setFilteredLogs(filtered);
  };

  const clearLogs = () => {
    logger.clearLogs();
    loadLogs();
  };

  const exportLogs = () => {
    const data = logger.exportLogs();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `web-logs-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getLogTypeColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'REQUEST': return 'text-primary';
      case 'RESPONSE': return 'text-success';
      case 'ERROR': return 'text-danger';
      case 'NAVIGATION': return 'text-info';
      case 'USER_ACTION': return 'text-warning';
      default: return 'text-secondary';
    }
  };

  const getLogTypeIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'REQUEST': return '🚀';
      case 'RESPONSE': return '✅';
      case 'ERROR': return '❌';
      case 'NAVIGATION': return '🧭';
      case 'USER_ACTION': return '👤';
      default: return '📝';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('tr-TR');
  };

  const getUniquePages = () => {
    const pages = new Set(logs.map(log => log.page));
    return Array.from(pages).sort();
  };

  return (
    <div className="container-fluid py-4">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2>Web Uygulaması Logları</h2>
            <div className="btn-group">
              <button 
                className={`btn btn-outline-primary ${showAnalytics ? 'active' : ''}`}
                onClick={() => setShowAnalytics(!showAnalytics)}
              >
                📊 Analitik
              </button>
              <button className="btn btn-outline-success" onClick={exportLogs}>
                📥 Dışa Aktar
              </button>
              <button className="btn btn-outline-danger" onClick={clearLogs}>
                🗑️ Temizle
              </button>
            </div>
          </div>

          {/* Analitik Panel */}
          {showAnalytics && analytics && (
            <div className="card mb-4">
              <div className="card-header">
                <h5 className="mb-0">📊 Log Analitikleri</h5>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-3">
                    <div className="text-center">
                      <h4 className="text-primary">{analytics.totalRequests}</h4>
                      <small className="text-muted">Toplam İstek</small>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="text-center">
                      <h4 className="text-danger">{analytics.totalErrors}</h4>
                      <small className="text-muted">Toplam Hata</small>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="text-center">
                      <h4 className="text-success">{Math.round(analytics.averageResponseTime)}ms</h4>
                      <small className="text-muted">Ortalama Yanıt Süresi</small>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="text-center">
                      <h4 className="text-info">{logs.length}</h4>
                      <small className="text-muted">Toplam Log</small>
                    </div>
                  </div>
                </div>

                <div className="row mt-4">
                  <div className="col-md-6">
                    <h6>En Çok Ziyaret Edilen Sayfalar</h6>
                    <div className="list-group list-group-flush">
                      {analytics.mostVisitedPages.map((page: any, index: number) => (
                        <div key={index} className="list-group-item d-flex justify-content-between align-items-center">
                          <span>{page.page}</span>
                          <span className="badge bg-primary rounded-pill">{page.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <h6>Hata Tipleri</h6>
                    <div className="list-group list-group-flush">
                      {analytics.errorTypes.map((error: any, index: number) => (
                        <div key={index} className="list-group-item d-flex justify-content-between align-items-center">
                          <span>{error.type}</span>
                          <span className="badge bg-danger rounded-pill">{error.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Filtreler */}
          <div className="card mb-4">
            <div className="card-body">
              <div className="row">
                <div className="col-md-3">
                  <label className="form-label">Log Tipi</label>
                  <select 
                    className="form-select"
                    value={filters.type}
                    onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value as any }))}
                  >
                    <option value="all">Tümü</option>
                    <option value="REQUEST">İstekler</option>
                    <option value="RESPONSE">Yanıtlar</option>
                    <option value="ERROR">Hatalar</option>
                    <option value="NAVIGATION">Navigasyon</option>
                    <option value="USER_ACTION">Kullanıcı Aksiyonları</option>
                  </select>
                </div>
                <div className="col-md-3">
                  <label className="form-label">Sayfa</label>
                  <select 
                    className="form-select"
                    value={filters.page}
                    onChange={(e) => setFilters(prev => ({ ...prev, page: e.target.value }))}
                  >
                    <option value="all">Tüm Sayfalar</option>
                    {getUniquePages().map(page => (
                      <option key={page} value={page}>{page}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label">Arama</label>
                  <input 
                    type="text" 
                    className="form-control"
                    placeholder="Log içeriğinde ara..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Log Listesi */}
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Loglar ({filteredLogs.length})</h5>
              <button className="btn btn-sm btn-outline-secondary" onClick={loadLogs}>
                🔄 Yenile
              </button>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                <table className="table table-hover mb-0">
                  <thead className="table-light sticky-top">
                    <tr>
                      <th>Zaman</th>
                      <th>Tip</th>
                      <th>Sayfa</th>
                      <th>Aksiyon</th>
                      <th>Detaylar</th>
                      <th>Süre</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log) => (
                      <tr key={log.id} className={log.type === 'ERROR' ? 'table-danger' : ''}>
                        <td>
                          <small>{formatTimestamp(log.timestamp)}</small>
                        </td>
                        <td>
                          <span className={`badge ${getLogTypeColor(log.type)}`}>
                            {getLogTypeIcon(log.type)} {log.type}
                          </span>
                        </td>
                        <td>
                          <code>{log.page}</code>
                        </td>
                        <td>
                          <strong>{log.action}</strong>
                        </td>
                        <td>
                          <div style={{ maxWidth: '300px', wordBreak: 'break-word' }}>
                            {log.error && (
                              <div className="text-danger">
                                <strong>Hata:</strong> {log.error}
                              </div>
                            )}
                            {log.data && (
                              <details>
                                <summary>Veri</summary>
                                <pre className="small text-muted mt-1 mb-0">
                                  {JSON.stringify(log.data, null, 2)}
                                </pre>
                              </details>
                            )}
                            {log.url && (
                              <div className="text-muted small">
                                <strong>URL:</strong> {log.url}
                              </div>
                            )}
                            {log.status && (
                              <span className={`badge ${log.status >= 400 ? 'bg-danger' : 'bg-success'}`}>
                                {log.status}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          {log.duration && (
                            <span className="badge bg-info">
                              {log.duration}ms
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 