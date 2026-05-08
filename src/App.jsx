import { useState, useRef, useEffect } from "react";

const FREE_SEARCH_LIMIT = 3;

// ✅ Ganti dengan URL Supabase kamu
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const EXAMPLE_QUESTIONS = [
  "Apa sanksi pidana untuk tindak pidana pencurian?",
  "Bagaimana ketentuan pidana mati dalam KUHP baru?",
  "Apa perbedaan pidana penjara dan pidana kurungan?",
  "Apa yang dimaksud dengan percobaan tindak pidana?",
  "Bagaimana aturan tentang penyertaan dalam tindak pidana?",
  "Apa saja jenis pidana pokok dalam KUHP?",
];

export default function App() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchCount, setSearchCount] = useState(() => {
    return parseInt(localStorage.getItem("lexai_count") || "0");
  });
  const [showPaywall, setShowPaywall] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [adminDocs, setAdminDocs] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadName, setUploadName] = useState("");
  const [uploadDesc, setUploadDesc] = useState("");
  const [uploadMsg, setUploadMsg] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Check if already reached limit on load
  useEffect(() => {
    const saved = parseInt(localStorage.getItem("lexai_count") || "0");
    if (saved >= FREE_SEARCH_LIMIT) setShowPaywall(true);
  }, []);

  const handleSearch = async (q = query) => {
    const trimmed = q.trim();
    if (!trimmed || loading) return;

    if (searchCount >= FREE_SEARCH_LIMIT) {
      setShowPaywall(true);
      return;
    }

    setShowWelcome(false);
    setQuery("");
    const newCount = searchCount + 1;
    setSearchCount(newCount);
    localStorage.setItem("lexai_count", String(newCount));

    const userMsg = { role: "user", content: trimmed };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/legal-query`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            messages: updatedMessages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
        }
      );

      const data = await response.json();

      if (data.error) throw new Error(data.error);

      const text =
        data.content?.find((b) => b.type === "text")?.text ||
        "Maaf, terjadi kesalahan. Silakan coba lagi.";

      setMessages([...updatedMessages, { role: "assistant", content: text }]);
    } catch (err) {
      setMessages([
        ...updatedMessages,
        {
          role: "assistant",
          content: `Maaf, terjadi kesalahan: ${err.message}. Silakan coba lagi.`,
        },
      ]);
    } finally {
      setLoading(false);
      if (newCount >= FREE_SEARCH_LIMIT) {
        setTimeout(() => setShowPaywall(true), 1800);
      }
    }
  };

  // ─── Admin Panel Functions ───────────────────────────────────────────────
  const loadAdminDocs = async () => {
    setAdminLoading(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/upload-document`, {
        headers: { Authorization: `Bearer ${adminPassword}` },
      });
      const data = await res.json();
      setAdminDocs(data.documents || []);
    } catch {
      setUploadMsg("Gagal memuat dokumen. Cek password admin.");
    } finally {
      setAdminLoading(false);
    }
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    await loadAdminDocs();
    setShowAdmin(true);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile || !uploadName) {
      setUploadMsg("Nama dokumen dan file PDF wajib diisi.");
      return;
    }

    setAdminLoading(true);
    setUploadMsg("Mengupload...");

    const formData = new FormData();
    formData.append("file", uploadFile);
    formData.append("name", uploadName);
    formData.append("description", uploadDesc);

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/upload-document`, {
        method: "POST",
        headers: { Authorization: `Bearer ${adminPassword}` },
        body: formData,
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setUploadMsg("✅ Dokumen berhasil diupload!");
      setUploadFile(null);
      setUploadName("");
      setUploadDesc("");
      await loadAdminDocs();
    } catch (err) {
      setUploadMsg(`❌ Error: ${err.message}`);
    } finally {
      setAdminLoading(false);
    }
  };

  const handleToggleDoc = async (id, isActive) => {
    try {
      await fetch(`${SUPABASE_URL}/functions/v1/upload-document`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminPassword}`,
        },
        body: JSON.stringify({ id, is_active: !isActive }),
      });
      await loadAdminDocs();
    } catch {
      setUploadMsg("Gagal mengubah status dokumen.");
    }
  };

  const remainingSearches = FREE_SEARCH_LIMIT - searchCount;

  // ─── Admin Login Screen ──────────────────────────────────────────────────
  if (showAdmin === "login") {
    return (
      <div style={styles.root}>
        <div style={styles.adminLoginWrap}>
          <div style={styles.adminLoginCard}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔐</div>
            <h2 style={styles.adminTitle}>Admin Panel</h2>
            <p style={styles.adminSub}>Kelola database dokumen hukum PDF</p>
            <form onSubmit={handleAdminLogin}>
              <input
                style={styles.adminInput}
                type="password"
                placeholder="Password admin..."
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
              />
              <button style={styles.adminLoginBtn} type="submit">
                Masuk →
              </button>
            </form>
            <button
              style={styles.backLink}
              onClick={() => setShowAdmin(false)}
            >
              ← Kembali ke LexAI
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Admin Dashboard ─────────────────────────────────────────────────────
  if (showAdmin) {
    return (
      <div style={styles.root}>
        <div style={styles.header}>
          <div style={styles.headerInner}>
            <div style={styles.logo}>
              <span style={styles.logoIcon}>⚖</span>
              <div>
                <div style={styles.logoTitle}>LexAI</div>
                <div style={styles.logoSub}>Admin Panel</div>
              </div>
            </div>
            <button
              style={styles.backLink}
              onClick={() => setShowAdmin(false)}
            >
              ← Kembali
            </button>
          </div>
        </div>

        <div style={{ ...styles.main, paddingTop: 80 }}>
          {/* Upload Form */}
          <div style={styles.adminCard}>
            <h3 style={styles.adminSectionTitle}>📤 Upload Dokumen PDF Baru</h3>
            <form onSubmit={handleUpload}>
              <input
                style={styles.adminInput}
                placeholder="Nama dokumen (mis: KUHP UU No.1 Tahun 2023)"
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
              />
              <input
                style={styles.adminInput}
                placeholder="Deskripsi singkat (opsional)"
                value={uploadDesc}
                onChange={(e) => setUploadDesc(e.target.value)}
              />
              <label style={styles.fileLabel}>
                {uploadFile ? `📄 ${uploadFile.name}` : "Pilih file PDF..."}
                <input
                  type="file"
                  accept=".pdf"
                  style={{ display: "none" }}
                  onChange={(e) => setUploadFile(e.target.files[0])}
                />
              </label>
              <button
                style={styles.adminLoginBtn}
                type="submit"
                disabled={adminLoading}
              >
                {adminLoading ? "Uploading..." : "Upload PDF →"}
              </button>
            </form>
            {uploadMsg && (
              <div style={styles.uploadMsg}>{uploadMsg}</div>
            )}
          </div>

          {/* Document List */}
          <div style={styles.adminCard}>
            <h3 style={styles.adminSectionTitle}>
              📚 Dokumen Tersimpan ({adminDocs.length})
            </h3>
            {adminLoading ? (
              <div style={{ color: "#94a3b8", textAlign: "center", padding: 20 }}>
                Memuat...
              </div>
            ) : adminDocs.length === 0 ? (
              <div style={{ color: "#475569", textAlign: "center", padding: 20 }}>
                Belum ada dokumen. Upload PDF pertama kamu!
              </div>
            ) : (
              adminDocs.map((doc) => (
                <div key={doc.id} style={styles.docItem}>
                  <div style={styles.docInfo}>
                    <div style={styles.docName}>📄 {doc.name}</div>
                    {doc.description && (
                      <div style={styles.docDesc}>{doc.description}</div>
                    )}
                    <div style={styles.docDate}>
                      {new Date(doc.created_at).toLocaleDateString("id-ID")}
                    </div>
                  </div>
                  <button
                    style={{
                      ...styles.toggleBtn,
                      background: doc.is_active ? "#166534" : "#1a2744",
                      color: doc.is_active ? "#86efac" : "#64748b",
                    }}
                    onClick={() => handleToggleDoc(doc.id, doc.is_active)}
                  >
                    {doc.is_active ? "✓ Aktif" : "Nonaktif"}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── Main Chat UI ─────────────────────────────────────────────────────────
  return (
    <div style={styles.root}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.logo}>
            <span style={styles.logoIcon}>⚖</span>
            <div>
              <div style={styles.logoTitle}>LexAI</div>
              <div style={styles.logoSub}>Riset Hukum Pidana Indonesia</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={styles.badge}>
              <span style={styles.badgeDot} />
              KUHP 2023 · UU 2026
            </div>
            {/* Hidden admin trigger - triple click */}
            <div
              style={{ cursor: "default", userSelect: "none", fontSize: 10, color: "#1a2744" }}
              onTripleClick={() => setShowAdmin("login")}
              onClick={(e) => {
                if (e.detail === 3) setShowAdmin("login");
              }}
            >
              ···
            </div>
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={styles.main}>
        {showWelcome && (
          <div style={styles.welcome}>
            <div style={styles.welcomeIcon}>📚</div>
            <h2 style={styles.welcomeTitle}>Tanya Hukum Pidana</h2>
            <p style={styles.welcomeText}>
              Cari informasi hukum dari{" "}
              <strong>KUHP Baru (UU No.1/2023)</strong> dan{" "}
              <strong>UU Penyesuaian Pidana (No.1/2026)</strong> secara instan.
            </p>
            <div style={styles.examples}>
              {EXAMPLE_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  style={styles.exampleBtn}
                  onClick={() => handleSearch(q)}
                  onMouseEnter={(e) => (e.target.style.background = "#1a2744")}
                  onMouseLeave={(e) => (e.target.style.background = "#111827")}
                >
                  {q}
                </button>
              ))}
            </div>
            <div style={styles.freeNote}>
              ✦ {FREE_SEARCH_LIMIT} pencarian gratis tersedia
            </div>
          </div>
        )}

        <div style={styles.chatArea}>
          {messages.map((msg, i) => (
            <div
              key={i}
              style={msg.role === "user" ? styles.userBubble : styles.aiBubble}
            >
              {msg.role === "assistant" && (
                <div style={styles.aiLabel}>⚖ LexAI</div>
              )}
              <div
                style={msg.role === "user" ? styles.userText : styles.aiText}
              >
                {msg.content.split("\n").map((line, j) => {
                  if (line.startsWith("**") && line.endsWith("**")) {
                    return (
                      <div key={j} style={styles.boldLine}>
                        {line.replace(/\*\*/g, "")}
                      </div>
                    );
                  }
                  if (line.startsWith("- ")) {
                    return (
                      <div key={j} style={styles.listLine}>
                        • {line.slice(2)}
                      </div>
                    );
                  }
                  if (line.trim() === "") return <br key={j} />;
                  const parts = line.split(/\*\*(.*?)\*\*/g);
                  return (
                    <span key={j}>
                      {parts.map((part, k) =>
                        k % 2 === 1 ? (
                          <strong key={k} style={{ color: "#60a5fa" }}>
                            {part}
                          </strong>
                        ) : (
                          part
                        )
                      )}
                      <br />
                    </span>
                  );
                })}
              </div>
            </div>
          ))}

          {loading && (
            <div style={styles.aiBubble}>
              <div style={styles.aiLabel}>⚖ LexAI</div>
              <div style={styles.thinking}>
                <span style={{ ...styles.dot, animationDelay: "0ms" }} />
                <span style={{ ...styles.dot, animationDelay: "150ms" }} />
                <span style={{ ...styles.dot, animationDelay: "300ms" }} />
                <span style={styles.thinkingText}>Menganalisis dokumen...</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input Bar */}
      {!showPaywall && (
        <div style={styles.inputBar}>
          {searchCount > 0 && searchCount < FREE_SEARCH_LIMIT && (
            <div style={styles.quota}>
              {remainingSearches} pencarian gratis tersisa
            </div>
          )}
          <div style={styles.inputRow}>
            <input
              style={styles.input}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Tanyakan tentang pasal, sanksi, atau ketentuan hukum..."
              disabled={loading}
            />
            <button
              style={{
                ...styles.sendBtn,
                opacity: loading || !query.trim() ? 0.5 : 1,
              }}
              onClick={() => handleSearch()}
              disabled={loading || !query.trim()}
            >
              {loading ? "..." : "→"}
            </button>
          </div>
          <div style={styles.disclaimer}>
            Informasi ini bersifat edukatif. Konsultasikan dengan pengacara
            untuk keperluan hukum.
          </div>
        </div>
      )}

      {/* Paywall Modal */}
      {showPaywall && (
        <div style={styles.paywallOverlay}>
          <div style={styles.paywallCard}>
            <div style={styles.paywallIcon}>🔒</div>
            <h3 style={styles.paywallTitle}>Kuota Gratis Habis</h3>
            <p style={styles.paywallText}>
              Anda telah menggunakan{" "}
              <strong>{FREE_SEARCH_LIMIT} pencarian gratis</strong>. Tingkatkan
              ke paket premium untuk akses tak terbatas.
            </p>

            <div style={styles.plans}>
              <div style={styles.planCard}>
                <div style={styles.planName}>Basic</div>
                <div style={styles.planPrice}>
                  Rp 29.000
                  <span style={styles.planPer}>/bulan</span>
                </div>
                <ul style={styles.planFeatures}>
                  <li>50 pencarian/bulan</li>
                  <li>Akses semua dokumen hukum</li>
                  <li>Riwayat pencarian</li>
                </ul>
                <button style={styles.planBtnSecondary}>Pilih Basic</button>
              </div>

              <div style={{ ...styles.planCard, ...styles.planCardFeatured }}>
                <div style={styles.planBadge}>POPULER</div>
                <div style={styles.planName}>Pro</div>
                <div style={styles.planPrice}>
                  Rp 79.000
                  <span style={styles.planPer}>/bulan</span>
                </div>
                <ul style={styles.planFeatures}>
                  <li>Pencarian tak terbatas</li>
                  <li>Akses semua dokumen hukum</li>
                  <li>Update regulasi terbaru</li>
                  <li>Export hasil riset</li>
                </ul>
                <button style={styles.planBtnPrimary}>Pilih Pro</button>
              </div>
            </div>

            <button
              style={styles.paywallClose}
              onClick={() => setShowPaywall(false)}
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  root: {
    background: "#060d1a",
    minHeight: "100vh",
    color: "#e2e8f0",
    fontFamily: "Georgia, serif",
    display: "flex",
    flexDirection: "column",
    maxWidth: 760,
    margin: "0 auto",
    position: "relative",
  },
  header: {
    position: "fixed",
    top: 0,
    left: "50%",
    transform: "translateX(-50%)",
    width: "100%",
    maxWidth: 760,
    background: "rgba(6,13,26,0.95)",
    borderBottom: "1px solid #1a2744",
    zIndex: 50,
    backdropFilter: "blur(10px)",
  },
  headerInner: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 20px",
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  logoIcon: {
    fontSize: 22,
    color: "#f1c65a",
  },
  logoTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#f1c65a",
    letterSpacing: 2,
  },
  logoSub: {
    fontSize: 10,
    color: "#475569",
    letterSpacing: 1,
  },
  badge: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    background: "#0d1929",
    border: "1px solid #1e3a5f",
    borderRadius: 20,
    padding: "4px 10px",
    fontSize: 10,
    color: "#60a5fa",
    letterSpacing: 0.5,
  },
  badgeDot: {
    width: 5,
    height: 5,
    borderRadius: "50%",
    background: "#22c55e",
    display: "inline-block",
  },
  main: {
    flex: 1,
    overflowY: "auto",
    padding: "80px 20px 140px",
  },
  welcome: {
    textAlign: "center",
    padding: "40px 20px 30px",
