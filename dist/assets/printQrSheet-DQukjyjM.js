function m({title:r,subtitle:a,cards:e=[]}){if(!e||e.length===0){alert("لا توجد عناصر لطباعتها");return}const t=window.open("","_blank","width=900,height=800");if(!t){alert("يرجى السماح بالنوافذ المنبثقة (Popups) لتتمكن من فتح نافذة الطباعة.");return}const l=e.map((i,b)=>{const d=b+1,p=i.title||`المرحلة ${d}`,o=i.svgHtml||"",n=i.qrValue||"";if(i.minimal)return`
        <div class="card card-minimal">
          <div class="card-header-minimal">
            <h2 class="card-title-lg">${p}</h2>
          </div>

          <div class="qr-container-lg">
            ${o||`<div class="qr-fallback">${n}</div>`}
          </div>

          <div class="card-footer-minimal">
            <span class="code-subtle">${n}</span>
          </div>

          <div class="cut-indicator">✂️ قص من هنا</div>
        </div>
      `;const f=i.badge||`كود #${d}`,s=i.typeLabel||"",c=i.instruction||"";return`
      <div class="card">
        <div class="card-header">
          <div class="badge-row">
            <span class="badge-black">${f}</span>
            ${s?`<span class="badge-outline">${s}</span>`:""}
          </div>
          <h2 class="card-title">${p}</h2>
        </div>

        <div class="qr-container">
          ${o||`<div class="qr-fallback">${n}</div>`}
        </div>

        <div class="card-footer">
          ${c?`<p class="instruction">${c}</p>`:""}
          <div class="code-box">${n}</div>
        </div>

        <div class="cut-indicator">✂️ قص من هنا</div>
      </div>
    `}).join(""),g=`
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8" />
      <title>${r||"طباعة أكواد QR"}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 10mm 8mm;
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
          padding-bottom: 10px;
          margin-bottom: 16px;
        }
        .header h1 {
          font-size: 18px;
          font-weight: 900;
          color: #000;
          margin-bottom: 2px;
        }
        .header p {
          font-size: 11px;
          color: #444;
          font-weight: bold;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 14px;
          width: 100%;
        }
        .card {
          border: 2px dashed #000000;
          border-radius: 14px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          text-align: center;
          background: #ffffff;
          page-break-inside: avoid;
          break-inside: avoid;
          min-height: 330px;
        }
        .card-minimal {
          min-height: 310px;
          padding: 16px;
        }
        .card-header-minimal {
          width: 100%;
          border-bottom: 2px solid #000;
          padding-bottom: 8px;
          margin-bottom: 8px;
        }
        .card-title-lg {
          font-size: 20px;
          font-weight: 900;
          color: #000000;
          letter-spacing: -0.5px;
        }
        .card-header {
          width: 100%;
          border-bottom: 1px solid #ccc;
          padding-bottom: 6px;
        }
        .badge-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
        }
        .badge-black {
          background: #000000;
          color: #ffffff;
          font-size: 11px;
          font-weight: 900;
          padding: 2px 10px;
          border-radius: 999px;
        }
        .badge-outline {
          border: 1px solid #000000;
          font-size: 10px;
          font-weight: bold;
          padding: 2px 6px;
          border-radius: 4px;
        }
        .card-title {
          font-size: 14px;
          font-weight: 900;
          color: #000000;
          margin-top: 2px;
          line-height: 1.3;
        }
        .qr-container, .qr-container-lg {
          margin: 8px 0;
          display: flex;
          justify-content: center;
          align-items: center;
          background: #ffffff;
        }
        .qr-container svg {
          width: 160px !important;
          height: 160px !important;
          display: block;
        }
        .qr-container-lg svg {
          width: 185px !important;
          height: 185px !important;
          display: block;
        }
        .card-footer {
          width: 100%;
          border-top: 1px solid #ccc;
          padding-top: 6px;
        }
        .card-footer-minimal {
          width: 100%;
          text-align: center;
          margin-top: 2px;
        }
        .code-subtle {
          font-family: 'Courier New', Courier, monospace;
          font-size: 9px;
          font-weight: bold;
          color: #666;
          direction: ltr;
          display: inline-block;
        }
        .instruction {
          font-size: 11px;
          font-weight: bold;
          color: #222;
          margin-bottom: 3px;
          line-height: 1.2;
        }
        .code-box {
          font-family: 'Courier New', Courier, monospace;
          font-size: 10px;
          font-weight: bold;
          color: #333;
          direction: ltr;
          background: #f1f5f9;
          padding: 3px 6px;
          border-radius: 4px;
          word-break: break-all;
        }
        .cut-indicator {
          margin-top: 6px;
          font-size: 9px;
          color: #888;
          border-top: 1px dotted #bbb;
          width: 100%;
          padding-top: 3px;
        }
        .no-print-bar {
          background: #0f172a;
          color: #fff;
          padding: 10px 18px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-radius: 10px;
          margin-bottom: 14px;
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
        <span>جاهز للطباعة — كروت A4 نقية وواضحة</span>
        <button class="print-btn" onclick="window.print()">🖨️ طباعة الآن (Print)</button>
      </div>

      <div class="header">
        <h1>${r||"المخيم الكشفي الرقمي"}</h1>
        ${a?`<p>${a}</p>`:""}
      </div>

      <div class="grid">
        ${l}
      </div>

      <script>
        window.addEventListener('load', () => {
          setTimeout(() => {
            window.print();
          }, 350);
        });
      <\/script>
    </body>
    </html>
  `;t.document.open(),t.document.write(g),t.document.close()}export{m as p};
