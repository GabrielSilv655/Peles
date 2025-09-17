import React, { useState } from 'react';
import API, { testConnectivity } from '../api';

const ConnectivityTest = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [testResults, setTestResults] = useState([]);
  const [isRunning, setIsRunning] = useState(false);

  const runConnectivityTest = async () => {
    setIsRunning(true);
    setTestResults([]);
    
    const endpoints = [
      { path: '/healthz', description: 'Health Check' },
      { path: '/test', description: 'Test Endpoint' },
      { path: '', description: 'Root API' },
      { path: '/auth/login', description: 'Login Endpoint (POST)', method: 'POST', data: { email: 'test@test.com', password: 'test' } }
    ];

    const results = [];
    
    for (const endpoint of endpoints) {
      try {
        const startTime = Date.now();
        let response;
        
        if (endpoint.method === 'POST') {
          response = await API.post(endpoint.path, endpoint.data);
        } else {
          response = await API.get(endpoint.path);
        }
        
        const duration = Date.now() - startTime;
        
        results.push({
          endpoint: endpoint.path || '/',
          description: endpoint.description,
          status: 'SUCCESS',
          statusCode: response.status,
          duration: `${duration}ms`,
          data: typeof response.data === 'object' ? JSON.stringify(response.data, null, 2) : response.data
        });
      } catch (error) {
        const duration = Date.now() - Date.now();
        results.push({
          endpoint: endpoint.path || '/',
          description: endpoint.description,
          status: 'ERROR',
          statusCode: error.response?.status || 'N/A',
          duration: 'N/A',
          error: error.message,
          data: error.response?.data ? JSON.stringify(error.response.data, null, 2) : 'No response data'
        });
      }
    }
    
    setTestResults(results);
    setIsRunning(false);
  };

  if (!isOpen) {
    return (
      <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 1000 }}>
        <button
          onClick={() => setIsOpen(true)}
          style={{
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            width: '60px',
            height: '60px',
            fontSize: '24px',
            cursor: 'pointer',
            boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
          }}
          title="Teste de Conectividade"
        >
          🔗
        </button>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      width: '400px',
      maxHeight: '600px',
      backgroundColor: 'white',
      border: '1px solid #ccc',
      borderRadius: '8px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      zIndex: 1000,
      overflow: 'hidden'
    }}>
      <div style={{
        padding: '15px',
        backgroundColor: '#f8f9fa',
        borderBottom: '1px solid #dee2e6',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h4 style={{ margin: 0, fontSize: '16px' }}>Teste de Conectividade</h4>
        <button
          onClick={() => setIsOpen(false)}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '18px',
            cursor: 'pointer',
            color: '#6c757d'
          }}
        >
          ×
        </button>
      </div>
      
      <div style={{ padding: '15px', maxHeight: '500px', overflowY: 'auto' }}>
        <div style={{ marginBottom: '15px' }}>
          <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#6c757d' }}>
            API Base URL: <strong>{API.defaults.baseURL}</strong>
          </p>
          <p style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#6c757d' }}>
            NODE_ENV: <strong>{process.env.NODE_ENV}</strong>
          </p>
          
          <button
            onClick={runConnectivityTest}
            disabled={isRunning}
            style={{
              backgroundColor: isRunning ? '#6c757d' : '#28a745',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: isRunning ? 'not-allowed' : 'pointer',
              width: '100%'
            }}
          >
            {isRunning ? 'Testando...' : 'Executar Teste'}
          </button>
        </div>

        {testResults.length > 0 && (
          <div>
            <h5 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>Resultados:</h5>
            {testResults.map((result, index) => (
              <div key={index} style={{
                marginBottom: '10px',
                padding: '10px',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                backgroundColor: result.status === 'SUCCESS' ? '#d4edda' : '#f8d7da'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                  <strong style={{ fontSize: '12px' }}>{result.description}</strong>
                  <span style={{
                    fontSize: '11px',
                    padding: '2px 6px',
                    borderRadius: '3px',
                    backgroundColor: result.status === 'SUCCESS' ? '#155724' : '#721c24',
                    color: 'white'
                  }}>
                    {result.status}
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: '#6c757d' }}>
                  <div>Endpoint: {result.endpoint}</div>
                  <div>Status: {result.statusCode} | Tempo: {result.duration}</div>
                  {result.error && <div style={{ color: '#721c24' }}>Erro: {result.error}</div>}
                </div>
                {result.data && (
                  <details style={{ marginTop: '5px' }}>
                    <summary style={{ fontSize: '11px', cursor: 'pointer' }}>Ver resposta</summary>
                    <pre style={{
                      fontSize: '10px',
                      backgroundColor: '#f8f9fa',
                      padding: '5px',
                      borderRadius: '3px',
                      overflow: 'auto',
                      maxHeight: '100px',
                      margin: '5px 0 0 0'
                    }}>
                      {result.data}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConnectivityTest;