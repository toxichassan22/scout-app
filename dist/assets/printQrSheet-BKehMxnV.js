function x({title:e,subtitle:n,cards:o=[]}){if(!o||o.length===0){alert("لا توجد عناصر لطباعتها");return}const i=window.open("","_blank","width=900,height=800");if(!i){alert("يرجى السماح بالنوافذ المنبثقة (Popups) لتتمكن من فتح نافذة الطباعة.");return}const c=o.map((t,g)=>{const r=g+1,b=t.title||`المرحلة ${r}`,f=t.badge||`كود #${r}`,d=t.typeLabel||"",a=t.instruction||"",p=t.qrValue||"",s=t.svgHtml||"";return`
      <div class="card">
        <div class="card-header">
          <div class="badge-row">
            <span class="badge-black">${f}</span>
            ${d?`<span class="badge-outline">${d}</span>`:""}
          </div>
          <h2 class="card-title">${b}</h2>
        </div>

        <div class="qr-container">
          ${s||`<div class="qr-fallback">${p}</div>`}
        </div>

        <div class="card-footer">
          ${a?`<p class="instruction">${a}</p>`:""}
          <div class="code-box">${p}</div>
        </div>

        <div class="cut-indicator">✂️ قص من هنا</div>
      </div>
    `}).join(""),l=`
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8" />
      <title>${e||"طباعة أكواد QR"}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 12mm 10mm 12mm 10mm;
        }
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        body {
          font-family: 'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif;
          background: #ffffff;
          color: #000000;
          direction: rtl;
          padding: 10px;
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #000;
          padding-bottom: 12px;
          margin-bottom: 20px;
        }
        .header h1 {
          font-size: 20px;
          font-weight: 900;
          color: #000;
          margin-bottom: 4px;
        }
        .header p {
          font-size: 12px;
          color: #444;
          font-weight: bold;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          width: 100%;
        }
        .card {
          border: 2px dashed #000000;
          border-radius: 14px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          text-align: center;
          background: #ffffff;
          page-break-inside: avoid;
          break-inside: avoid;
          min-height: 360px;
        }
        .card-header {
          width: 100%;
          border-bottom: 1px solid #ccc;
          padding-bottom: 8px;
        }
        .badge-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }
        .badge-black {
          background: #000000;
          color: #ffffff;
          font-size: 11px;
          font-weight: 900;
          padding: 3px 10px;
          border-radius: 999px;
        }
        .badge-outline {
          border: 1px solid #000000;
          font-size: 10px;
          font-weight: bold;
          padding: 2px 8px;
          border-radius: 4px;
        }
        .card-title {
          font-size: 15px;
          font-weight: 900;
          color: #000000;
          margin-top: 4px;
          line-height: 1.3;
        }
        .qr-container {
          margin: 12px 0;
          display: flex;
          justify-content: center;
          align-items: center;
          background: #ffffff;
        }
        .qr-container svg {
          width: 175px !important;
          height: 175px !important;
          display: block;
        }
        .card-footer {
          width: 100%;
          border-top: 1px solid #ccc;
          padding-top: 8px;
        }
        .instruction {
          font-size: 11px;
          font-weight: bold;
          color: #222;
          margin-bottom: 4px;
          line-height: 1.3;
        }
        .code-box {
          font-family: 'Courier New', Courier, monospace;
          font-size: 10px;
          font-weight: bold;
          color: #333;
          direction: ltr;
          background: #f1f5f9;
          padding: 4px 6px;
          border-radius: 4px;
          word-break: break-all;
        }
        .cut-indicator {
          margin-top: 8px;
          font-size: 9px;
          color: #888;
          border-top: 1px dotted #bbb;
          width: 100%;
          padding-top: 4px;
        }
        .no-print-bar {
          background: #0f172a;
          color: #fff;
          padding: 12px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-radius: 10px;
          margin-bottom: 15px;
        }
        .print-btn {
          background: #f59e0b;
          color: #000;
          font-weight: 900;
          border: none;
          padding: 8px 18px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 13px;
        }
        @media print {
          .no-print-bar {
            display: none !important;
          }
          body {
            padding: 0 !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="no-print-bar">
        <span>جاهز للطباعة — تم إعداد الكروت بتنسيق A4 نقي وعالي الجودة</span>
        <button class="print-btn" onclick="window.print()">🖨️ طباعة الآن (Print)</button>
      </div>

      <div class="header">
        <h1>${e||"المخيم الكشفي الرقمي"}</h1>
        ${n?`<p>${n}</p>`:""}
      </div>

      <div class="grid">
        ${c}
      </div>

      <script>
        // Auto trigger print dialog once loaded
        window.addEventListener('load', () => {
          setTimeout(() => {
            window.print();
          }, 400);
        });
      <\/script>
    </body>
    </html>
  `;i.document.open(),i.document.write(l),i.document.close()}export{x as p};
