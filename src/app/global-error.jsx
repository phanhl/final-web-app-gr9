'use client';
/**
 * Last-resort boundary for errors in the root layout itself. It replaces the whole document,
 * so it renders its own <html>/<body> with inline styles (globals.css may not be loaded).
 */
export default function GlobalError({ reset }) {
    return (<html lang="vi">
      <body style={{ margin: 0, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', background: '#f8fafc', color: '#0f172a', textAlign: 'center', padding: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, marginBottom: 8 }}>Đã xảy ra lỗi / Something went wrong</h1>
          <p style={{ color: '#475569', marginBottom: 24 }}>Dữ liệu của bạn vẫn an toàn trên máy chủ. / Your data is safe on the server.</p>
          <button type="button" onClick={() => reset()} style={{ padding: '8px 16px', background: '#059669', color: '#fff', border: 0, borderRadius: 12, fontSize: 16, cursor: 'pointer' }}>
            Thử lại / Try again
          </button>
        </div>
      </body>
    </html>);
}
