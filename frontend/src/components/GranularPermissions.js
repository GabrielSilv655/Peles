import React, { useState, useEffect } from 'react';
import API from '../api';
import { useLanguage } from './LanguageContext';
import '../styles/document-permissions-unified.css';

const GranularPermissions = ({ userId, userRole, onPermissionsChange }) => {
  const { language } = useLanguage();
  const [layouts, setLayouts] = useState([]);
  const [allDocuments, setAllDocuments] = useState([]);
  const [partialTemplates, setPartialTemplates] = useState([]);
  const [restrictedLayouts, setRestrictedLayouts] = useState(new Set());
  const [restrictedDocuments, setRestrictedDocuments] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('layouts');

  useEffect(() => {
    loadData();
      // eslint-disable-next-line
  }, [userId, userRole]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Layouts
      const layoutsResponse = await API.get('/document-layouts');
      setLayouts(layoutsResponse.data || []);

      // Documentos
      try {
        const docsResponse = await API.get('/all-documents');
        setAllDocuments(docsResponse.data || []);
      } catch (_) {
        setAllDocuments([]);
      }

      // Templates Parciais
      try {
        const templatesResponse = await API.get('/document-layouts/partial-templates');
        setPartialTemplates(templatesResponse.data || []);
      } catch (_) {
        setPartialTemplates([]);
      }

      // Restrições (DB -> localStorage fallback)
      const storageKey = `restrictions_${userId}_${userRole}`;
      let restrictions = null;
      try {
        const response = await API.get(`/granular-permissions/${userId}/${userRole}`);
        restrictions = response.data;
        localStorage.setItem(storageKey, JSON.stringify(restrictions));
      } catch (_) {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          try { restrictions = JSON.parse(saved); } catch { /* ignore */ }
        }
      }

      if (restrictions) {
        const restrictedLayoutIds = restrictions.layouts || [];
        const restrictedDocumentIds = restrictions.documents || [];
        setRestrictedLayouts(new Set(restrictedLayoutIds));
        setRestrictedDocuments(new Set(restrictedDocumentIds));
      } else {
        setRestrictedLayouts(new Set());
        setRestrictedDocuments(new Set());
        localStorage.setItem(storageKey, JSON.stringify({ layouts: [], documents: [] }));
      }
    } finally {
      setLoading(false);
    }
  };

  const saveRestrictions = async (layoutRestrictions, documentRestrictions) => {
    const restrictions = {
      layouts: Array.from(layoutRestrictions),
      documents: Array.from(documentRestrictions)
    };

    try {
      await API.post('/granular-permissions', {
        user_id: userId,
        user_role: userRole,
        restrictions
      });
    } catch (_) {
      // fallback: persistir localmente mesmo em caso de erro de rede
    } finally {
      const storageKey = `restrictions_${userId}_${userRole}`;
      localStorage.setItem(storageKey, JSON.stringify(restrictions));
      if (onPermissionsChange) onPermissionsChange(restrictions);
    }
  };

  const toggleLayout = async (layoutId) => {
    const newRestricted = new Set(restrictedLayouts);
    if (newRestricted.has(layoutId) || newRestricted.has(String(layoutId)) || newRestricted.has(Number(layoutId))) {
      newRestricted.delete(layoutId);
      newRestricted.delete(String(layoutId));
      newRestricted.delete(Number(layoutId));
    } else {
      newRestricted.add(layoutId);
    }
    setRestrictedLayouts(newRestricted);
    await saveRestrictions(newRestricted, restrictedDocuments);
  };

  const toggleDocument = async (docId, altKeys = []) => {
    const primaryKey = String(docId);
    const keysToCheck = Array.from(new Set([primaryKey, ...altKeys.map(k => String(k))]));

    const newRestricted = new Set(restrictedDocuments);

    // Se qualquer uma das chaves estiver presente, remover todas (desbloquear)
    const anyPresent = keysToCheck.some(k => newRestricted.has(k) || newRestricted.has(Number(k)));
    if (anyPresent) {
      keysToCheck.forEach(k => {
        newRestricted.delete(k);
        newRestricted.delete(String(k));
        newRestricted.delete(Number(k));
      });
    } else {
      // Caso contrário, adicionar a chave primária (bloquear)
      newRestricted.add(primaryKey);
    }

    setRestrictedDocuments(newRestricted);
    await saveRestrictions(restrictedLayouts, newRestricted);
  };

  if (loading) {
    return (
      <div className="granular-permissions-loading">
        <div className="loading-spinner"></div>
        <p>{language === 'english' ? 'Loading documents and permissions...' : 'Carregando documentos e permissões...'}</p>
      </div>
    );
  }

  const renderToggle = (hasAccess, onClick, title) => (
    <div className="toggle-switch-container">
      <button
        type="button"
        className={`toggle-switch ${hasAccess ? 'enabled' : 'disabled'}`}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClick(); }}
        title={title}
        style={{ border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '12px' }}
      >
        <div className="toggle-slider"><div className="toggle-knob"></div></div>
        <span className="toggle-text">{hasAccess ? (language === 'english' ? 'Allowed' : 'Permitido') : (language === 'english' ? 'Denied' : 'Negado')}</span>
      </button>
    </div>
  );

  // Unificar documentos enviados e templates parciais em uma única lista para permissões
  const combinedDocuments = [
    ...(allDocuments || []).map(d => ({
      key: `doc-${d.id}`,
      id: String(d.id),
      altKeys: [String(d.id), d.id],
      title: d.name || d.title || `Documento ${d.id}`,
      description: d.description || '',
      fileLabel: d.original_filename || '',
      createdAt: d.created_at || d.createdAt,
      isTemplate: false
    })),
    ...(partialTemplates || []).map(t => {
      const rawTitle = t.title || `Template ${t.id}`;
      const sanitizedTitle = rawTitle
        .replace(/(\s*-\s*)?template\s+parcial/ig, '') // remove "template parcial" e hífen anterior se houver
        .replace(/\s*-\s*$/g, '') // remove hífen no final, se sobrar
        .trim();
      return {
        key: `tpl-${t.id}`,
        id: `template_${t.id}`,
        altKeys: [`template_${t.id}`, String(t.id), t.id],
        title: sanitizedTitle || rawTitle,
        description: t.description || t.layout_description || '',
        fileLabel: t.layout_name ? `${language === 'english' ? 'Template' : 'Template'} · ${t.layout_name}` : (language === 'english' ? 'Template' : 'Template'),
        createdAt: t.createdAt || t.created_at,
        isTemplate: true
      };
    })
  ];

  return (
    <div className="granular-permissions">
      <div className="granular-permissions-header">
        <h3>📄 {language === 'english' ? 'Specific Access by Document' : 'Permissões Específicas por Documento'}</h3>
        <p>{language === 'english' ? 'Configure which layouts and documents this user can access' : 'Configure quais layouts e documentos este usuário pode acessar'}</p>
      </div>

      <div className="granular-tabs">
        <button className={`granular-tab ${activeTab === 'layouts' ? 'active' : ''}`} onClick={() => setActiveTab('layouts')}>📄 {language === 'english' ? 'Layouts' : 'Layouts'} ({layouts.length})</button>
        <button className={`granular-tab ${activeTab === 'documents' ? 'active' : ''}`} onClick={() => setActiveTab('documents')}>📁 {language === 'english' ? 'Documents' : 'Documentos'} ({combinedDocuments.length})</button>
      </div>

      {activeTab === 'layouts' && (
        <div className="granular-content">
          {layouts.length === 0 ? (
            <div className="granular-empty">
              <p>📄 {language === 'english' ? 'No layouts found' : 'Nenhum layout encontrado'}</p>
            </div>
          ) : (
            <div className="granular-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {layouts.map(layout => {
                const isRestricted = restrictedLayouts.has(layout.id);
                const hasAccess = !isRestricted;
                return (
                  <div key={layout.id} className={`granular-item ${hasAccess ? 'has-access' : 'restricted'}`}>
                    <div className="granular-item-info">
                      <h4>{layout.name}</h4>
                      {layout.description && <p>{layout.description}</p>}
                      {layout.created_at && <small>{language === 'english' ? 'Created at: ' : 'Criado em: '}{new Date(layout.created_at).toLocaleDateString('pt-BR')}</small>}
                    </div>
                    <div className="granular-item-permissions">
                      {renderToggle(hasAccess, () => toggleLayout(layout.id), hasAccess ? (language === 'english' ? 'Click to restrict' : 'Clique para restringir') : (language === 'english' ? 'Click to allow' : 'Clique para permitir'))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="granular-content">
          {combinedDocuments.length === 0 ? (
            <div className="granular-empty">
              <p>📁 {language === 'english' ? 'No documents found' : 'Nenhum documento encontrado'}</p>
            </div>
          ) : (
            <div className="granular-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
              {combinedDocuments.map(item => {
                const key = item.id; // sempre string
                const allKeys = Array.from(new Set([key, ...(item.altKeys || [])])).map(k => String(k));
                const isRestricted = allKeys.some(k => restrictedDocuments.has(k) || restrictedDocuments.has(Number(k)));
                const hasAccess = !isRestricted;
                return (
                  <div key={item.key} className={`granular-item ${hasAccess ? 'has-access' : 'restricted'}`}>
                    <div className="granular-item-info">
                      <h4>{item.title} {item.isTemplate ? `(Template)` : ''}</h4>
                      {item.description && <p>{item.description}</p>}
                      <small>
                        {item.fileLabel ? `${language === 'english' ? 'Info' : 'Info'}: ${item.fileLabel} | ` : ''}
                        {item.createdAt ? `${language === 'english' ? 'Created at' : 'Criado em'}: ${new Date(item.createdAt).toLocaleDateString('pt-BR')}` : ''}
                      </small>
                    </div>
                    <div className="granular-item-permissions">
                      {renderToggle(hasAccess, () => toggleDocument(key, item.altKeys || []), hasAccess ? (language === 'english' ? 'Click to restrict' : 'Clique para restringir') : (language === 'english' ? 'Click to allow' : 'Clique para permitir'))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="granular-summary">
        <small className="auto-save-info">💾 {language === 'english' ? 'Changes are saved automatically' : 'As alterações são salvas automaticamente'}</small>
      </div>
    </div>
  );
};

export default GranularPermissions;
