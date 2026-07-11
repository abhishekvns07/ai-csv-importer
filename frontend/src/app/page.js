"use client";

import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { TableVirtuoso } from "react-virtuoso";
import Papa from "papaparse";
import { 
  LayoutDashboard, Users, UserPlus, Megaphone, 
  MessageCircle, Phone, Database, Settings, 
  Upload, X, FileText, Download, CheckCircle, AlertCircle
} from "lucide-react";
import styles from "./page.module.css";

export default function Dashboard() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const [dbLeads, setDbLeads] = useState([]);

  const fetchLeads = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/leads");
      const data = await res.json();
      if (data.success) {
        setDbLeads(data.data);
      }
    } catch (err) {
      console.error("Error fetching leads:", err);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file) {
      setCsvFile(file);
      // Parse for preview
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setPreviewData({
            headers: results.meta.fields,
            rows: results.data.slice(0, 5), // Preview first 5 rows
            totalRows: results.data.length,
            allRows: results.data
          });
        }
      });
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    maxFiles: 1
  });

  const handleConfirmImport = async () => {
    if (!csvFile) return;
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', csvFile);

      const res = await fetch("http://localhost:5000/api/import", {
        method: "POST",
        body: formData
      });

      const data = await res.json();
      if (data.success) {
        setImportResults(data);
        setIsModalOpen(false);
        fetchLeads(); // Refresh DB leads after import
      } else {
        alert("Import failed: " + data.error);
      }
    } catch (err) {
      console.error(err);
      alert("Error connecting to server. Make sure the backend is running.");
    } finally {
      setIsUploading(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCsvFile(null);
    setPreviewData(null);
  };

  return (
    <div className={styles.container}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <div style={{ backgroundColor: 'var(--foreground)', color: 'white', padding: '4px', borderRadius: '4px' }}>
             ⬈
          </div>
          GrowEasy
        </div>
        
        <div style={{ padding: '0 1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600, marginBottom: '0.5rem' }}>MAIN</div>
          <nav className={styles.nav}>
            <div className={styles.navItem}><LayoutDashboard size={18} /> Dashboard</div>
            <div className={styles.navItem}><UserPlus size={18} /> Generate Leads</div>
            <div className={styles.navItem}><Users size={18} /> Manage Leads</div>
            <div className={styles.navItem}><MessageCircle size={18} /> Engage Leads</div>
          </nav>
        </div>

        <div style={{ padding: '0 1.5rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600, marginBottom: '0.5rem' }}>CONTROL CENTER</div>
          <nav className={styles.nav}>
            <div className={styles.navItem}><Users size={18} /> Team Members</div>
            <div className={`${styles.navItem} ${styles.active}`}><Megaphone size={18} /> Lead Sources</div>
            <div className={styles.navItem}><LayoutDashboard size={18} /> Ad Accounts</div>
            <div className={styles.navItem}><MessageCircle size={18} /> WhatsApp Account</div>
            <div className={styles.navItem}><Phone size={18} /> Tele Calling</div>
            <div className={styles.navItem}><Database size={18} /> CRM Fields</div>
            <div className={styles.navItem}><Settings size={18} /> API Center</div>
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className={styles.main}>
        <div className={styles.header}>
          <h1 className={styles.title}>Lead Sources</h1>
          <p className={styles.subtitle}>Connect, manage, and control all your lead channels from one dashboard.</p>
        </div>

        <div className={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>CSV Uploads</h2>
              <p className={styles.subtitle}>Import leads from external files</p>
            </div>
            <button className={styles.actionButton} onClick={() => setIsModalOpen(true)}>
              <Upload size={18} /> Import Leads via CSV
            </button>
          </div>
        </div>

        {/* Results Table (Shows after import) */}
        {importResults && (
          <div className={styles.card}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
              Import Results
              <span style={{ fontSize: '0.9rem', fontWeight: 400, color: 'var(--muted)', marginLeft: '1rem' }}>
                {importResults.totalImported} Extracted, {importResults.skipped} Skipped
              </span>
            </h2>
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>NAME</th>
                    <th>EMAIL</th>
                    <th>MOBILE</th>
                    <th>STATUS</th>
                    <th>SOURCE</th>
                  </tr>
                </thead>
                <tbody>
                  {importResults.data.map((lead, i) => (
                    <tr key={i}>
                      <td>{lead.name || "-"}</td>
                      <td>{lead.email || "-"}</td>
                      <td>{lead.mobile_without_country_code || "-"}</td>
                      <td>
                        {lead.crm_status ? (
                          <span className={`${styles.badge} ${lead.crm_status.includes('GOOD') || lead.crm_status.includes('DONE') ? styles.badgeSuccess : styles.badgeError}`}>
                            {lead.crm_status}
                          </span>
                        ) : "-"}
                      </td>
                      <td>{lead.data_source || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Database Leads Table */}
        <div className={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>All Leads in Database</h2>
            <button className={styles.actionButton} onClick={fetchLeads} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
              Refresh
            </button>
          </div>
          
          <div className={styles.tableContainer} style={{ height: '400px' }}>
            {dbLeads.length > 0 ? (
              <TableVirtuoso
                data={dbLeads}
                fixedHeaderContent={() => (
                  <tr>
                    <th style={{ background: 'var(--background)' }}>ID</th>
                    <th style={{ background: 'var(--background)' }}>NAME</th>
                    <th style={{ background: 'var(--background)' }}>EMAIL</th>
                    <th style={{ background: 'var(--background)' }}>MOBILE</th>
                    <th style={{ background: 'var(--background)' }}>STATUS</th>
                    <th style={{ background: 'var(--background)' }}>SOURCE</th>
                    <th style={{ background: 'var(--background)' }}>DATE</th>
                  </tr>
                )}
                itemContent={(index, lead) => (
                  <>
                    <td>#{lead.id}</td>
                    <td>{lead.name || "-"}</td>
                    <td>{lead.email || "-"}</td>
                    <td>{lead.mobile_without_country_code || "-"}</td>
                    <td>
                      {lead.crm_status ? (
                        <span className={`${styles.badge} ${lead.crm_status.includes('GOOD') || lead.crm_status.includes('DONE') ? styles.badgeSuccess : styles.badgeError}`}>
                          {lead.crm_status}
                        </span>
                      ) : "-"}
                    </td>
                    <td>{lead.data_source || "-"}</td>
                    <td>{lead.created_at ? new Date(lead.created_at).toLocaleDateString() : "-"}</td>
                  </>
                )}
                components={{
                  Table: ({ style, ...props }) => <table className={styles.table} style={{...style, width: '100%', margin: 0}} {...props} />
                }}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem' }}>No leads in database yet.</div>
            )}
          </div>
        </div>
      </main>

      {/* Upload Modal */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <div>
                <h2 className={styles.modalTitle}>Import Leads via CSV</h2>
                <p className={styles.subtitle}>Upload a CSV file to bulk import leads into your system.</p>
              </div>
              <button className={styles.modalClose} onClick={closeModal}><X size={24} /></button>
            </div>
            
            <div className={styles.modalBody}>
              {!csvFile ? (
                <div {...getRootProps()} className={`${styles.dropzone} ${isDragActive ? styles.active : ''}`}>
                  <input {...getInputProps()} />
                  <Upload size={32} className={styles.dropzoneIcon} />
                  <h3 className={styles.dropzoneText}>Drop your CSV file here</h3>
                  <p className={styles.dropzoneSubtext}>or click to browse files</p>
                  
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                    <div style={{ background: 'var(--background)', padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.8rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <AlertCircle size={14} /> Supported file: .csv (max 5MB)
                    </div>
                  </div>

                  <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '1.5rem', padding: '0 2rem' }}>
                    Required fields for AI extraction: Email or Mobile. The AI will automatically map other fields to GrowEasy CRM format.
                  </p>

                  <button className={styles.sampleButton} onClick={(e) => { e.stopPropagation(); alert("Downloading sample...") }}>
                    <Download size={14} /> Download Sample CSV Template
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ padding: '0.5rem', background: '#e0f2fe', color: '#0ea5e9', borderRadius: 'var(--radius-sm)' }}>
                        <FileText size={20} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{csvFile.name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{(csvFile.size / 1024).toFixed(2)} KB • {previewData?.totalRows} rows</div>
                      </div>
                    </div>
                    <button className={styles.modalClose} onClick={() => setCsvFile(null)}><X size={18} /></button>
                  </div>

                  {previewData && (
                    <div>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem' }}>Data Preview (First 5 Rows)</h4>
                      <div className={styles.tableContainer}>
                        <table className={styles.table}>
                          <thead>
                            <tr>
                              {previewData.headers.map((header, i) => (
                                <th key={i}>{header.toUpperCase()}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {previewData.rows.map((row, i) => (
                              <tr key={i}>
                                {previewData.headers.map((header, j) => (
                                  <td key={j}>{row[header] || "-"}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.cancelButton} onClick={closeModal} disabled={isUploading}>
                Cancel
              </button>
              <button 
                className={styles.actionButton} 
                onClick={handleConfirmImport}
                disabled={!csvFile || isUploading}
              >
                {isUploading ? (
                  <><span className={styles.spinner}></span> Processing with AI...</>
                ) : (
                  "Confirm Import"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
