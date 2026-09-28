/**
 * Built-in Sample Document Templates
 * Generates high-resolution sample contracts and agreements
 * directly in the browser so users can test immediately.
 */

class DocumentTemplates {
  static getTemplatesList() {
    return [
      {
        id: 'nda',
        title: 'Non-Disclosure Agreement (NDA)',
        description: 'Mutual confidentiality and trade secret agreement between two parties.',
        badge: 'Legal',
        pages: 1
      },
      {
        id: 'freelance',
        title: 'Freelance Services Contract',
        description: 'Independent contractor agreement for software, design, or consulting.',
        badge: 'Business',
        pages: 2
      },
      {
        id: 'approval',
        title: 'Project Sign-Off & Acceptance',
        description: 'Formal deliverable handover approval and milestone sign-off certificate.',
        badge: 'Executive',
        pages: 1
      }
    ];
  }

  static async generateTemplatePages(templateId) {
    const width = 1240; // High resolution A4 ratio
    const height = 1754;

    switch (templateId) {
      case 'freelance':
        return [
          this.renderFreelancePage1(width, height),
          this.renderFreelancePage2(width, height)
        ];
      case 'approval':
        return [
          this.renderApprovalPage(width, height)
        ];
      case 'nda':
      default:
        return [
          this.renderNDAPage(width, height)
        ];
    }
  }

  static renderNDAPage(w, h) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    // White page background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    // Decorative top border
    ctx.fillStyle = '#312e81';
    ctx.fillRect(60, 40, w - 120, 6);

    // Header
    ctx.font = 'bold 32px Inter, sans-serif';
    ctx.fillStyle = '#1e1b4b';
    ctx.fillText('MUTUAL NON-DISCLOSURE AGREEMENT', 60, 100);

    ctx.font = '500 15px Inter, sans-serif';
    ctx.fillStyle = '#64748b';
    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    ctx.fillText(`Standard Mutual Form • Effective Date: ${dateStr}`, 60, 130);

    // Divider
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(60, 155);
    ctx.lineTo(w - 60, 155);
    ctx.stroke();

    // Body content setup
    ctx.fillStyle = '#334155';
    let y = 195;
    const lh = 28;

    const printParagraph = (text, maxWidth = w - 120) => {
      const words = text.split(' ');
      let line = '';
      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) {
          ctx.fillText(line, 60, y);
          line = words[n] + ' ';
          y += lh;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, 60, y);
      y += lh * 1.35;
    };

    const printHeading = (title) => {
      y += 10;
      ctx.font = 'bold 18px Inter, sans-serif';
      ctx.fillStyle = '#1e293b';
      ctx.fillText(title, 60, y);
      y += lh + 2;
      ctx.font = '15px Inter, sans-serif';
      ctx.fillStyle = '#334155';
    };

    printParagraph(
      'This Mutual Non-Disclosure Agreement (the "Agreement") is entered into between the Disclosing Party and the Receiving Party (collectively, the "Parties") for the purpose of preventing the unauthorized disclosure of Confidential Information as defined below.'
    );

    printHeading('1. Definition of Confidential Information');
    printParagraph(
      'For purposes of this Agreement, "Confidential Information" shall include all information or material that has or could have commercial value or other utility in the business in which Disclosing Party is engaged. If Information is in written or digital form, it shall be labeled or identified as proprietary.'
    );

    printHeading('2. Obligations of Receiving Party');
    printParagraph(
      'Receiving Party shall hold and maintain the Confidential Information in strictest confidence for the sole and exclusive benefit of Disclosing Party. Receiving Party shall restrict access to employees, contractors, and third parties as is reasonably required, and shall require those persons to sign non-disclosure restrictions at least as protective as those in this Agreement.'
    );

    printHeading('3. Non-Disclosure Period & Term');
    printParagraph(
      'The non-disclosure provisions of this Agreement shall survive the termination of this Agreement and Receiving Party\'s duty to hold Confidential Information in confidence shall remain in effect for a period of two (2) years from the date of disclosure, or until such time as Disclosing Party releases Receiving Party from such obligation in writing.'
    );

    printHeading('4. Severability & Governing Law');
    printParagraph(
      'If a court finds any provision of this Agreement invalid or unenforceable, the remainder of this Agreement shall be interpreted so as best to effect the intent of the Parties. This Agreement shall be governed in accordance with the laws of the applicable jurisdiction.'
    );

    // Signature Block Section
    y = h - 380;
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(60, y);
    ctx.lineTo(w - 60, y);
    ctx.stroke();

    y += 35;
    ctx.font = 'bold 17px Inter, sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.fillText('IN WITNESS WHEREOF, the Parties have executed this Agreement:', 60, y);

    // Left Column: Disclosing Party
    const col1X = 60;
    const col2X = w / 2 + 30;
    const sigLineY = y + 160;

    // Disclosing Party box
    ctx.font = 'bold 14px Inter, sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText('COMPANY / DISCLOSING PARTY', col1X, y + 45);
    ctx.font = '14px Inter, sans-serif';
    ctx.fillText('Acme Global Technologies Inc.', col1X, y + 70);

    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(col1X, sigLineY);
    ctx.lineTo(col1X + 440, sigLineY);
    ctx.stroke();

    ctx.font = '13px Inter, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('Authorized Signature', col1X, sigLineY + 22);
    ctx.fillText(`Date: ${dateStr}`, col1X, sigLineY + 44);

    // Right Column: Signer / Receiving Party
    ctx.font = 'bold 14px Inter, sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText('RECEIVING PARTY (SIGN HERE)', col2X, y + 45);
    ctx.font = '14px Inter, sans-serif';
    ctx.fillText('Name: ________________________________', col2X, y + 70);

    // Highlight area for signature
    ctx.fillStyle = 'rgba(79, 70, 229, 0.05)';
    ctx.fillRect(col2X, sigLineY - 70, 440, 70);
    ctx.strokeStyle = 'rgba(79, 70, 229, 0.4)';
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(col2X, sigLineY - 70, 440, 70);
    ctx.setLineDash([]);

    ctx.strokeStyle = '#94a3b8';
    ctx.beginPath();
    ctx.moveTo(col2X, sigLineY);
    ctx.lineTo(col2X + 440, sigLineY);
    ctx.stroke();

    ctx.font = '13px Inter, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('Signer Signature ✍️ [Place Signature Here]', col2X + 10, sigLineY + 22);
    ctx.fillText('Date: ________________________', col2X, sigLineY + 44);

    // Footer
    ctx.font = '12px Inter, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('Document ID: NDA-' + Math.random().toString(36).substr(2, 9).toUpperCase(), 60, h - 35);
    ctx.fillText('Page 1 of 1 • Confirmed Electronic Delivery', w - 320, h - 35);

    return canvas.toDataURL('image/png');
  }

  static renderFreelancePage1(w, h) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    // Accent line
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(60, 40, w - 120, 6);

    ctx.font = 'bold 30px Inter, sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.fillText('INDEPENDENT CONTRACTOR AGREEMENT', 60, 100);

    ctx.font = '500 15px Inter, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('Comprehensive Master Services & Consulting Agreement', 60, 130);

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(60, 155);
    ctx.lineTo(w - 60, 155);
    ctx.stroke();

    let y = 195;
    const lh = 28;

    const printParagraph = (text, maxWidth = w - 120) => {
      const words = text.split(' ');
      let line = '';
      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) {
          ctx.fillText(line, 60, y);
          line = words[n] + ' ';
          y += lh;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, 60, y);
      y += lh * 1.35;
    };

    const printHeading = (title) => {
      y += 10;
      ctx.font = 'bold 18px Inter, sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.fillText(title, 60, y);
      y += lh + 2;
      ctx.font = '15px Inter, sans-serif';
      ctx.fillStyle = '#334155';
    };

    ctx.font = '15px Inter, sans-serif';
    ctx.fillStyle = '#334155';

    printParagraph(
      'This Independent Contractor Agreement is entered into as of the signing date by and between Client and Contractor. The parties agree that Contractor will deliver professional engineering, design, and software consulting services as described in the Statement of Work.'
    );

    printHeading('1. Services & Milestone Deliverables');
    printParagraph(
      'Contractor agrees to perform the services described with high professional skill, diligence, and in compliance with all relevant industry specifications and deadlines mutually established in writing.'
    );

    printHeading('2. Compensation & Billing Terms');
    printParagraph(
      'Client agrees to pay Contractor according to the fee structure agreed upon. Invoices shall be payable within fourteen (14) business days upon milestone acceptance. Late payments may accrue standard administrative interest.'
    );

    printHeading('3. Intellectual Property Rights');
    printParagraph(
      'Upon full satisfaction of agreed milestone payments, all developed work products, code repositories, graphic assets, and architectural documents will be assigned unconditionally to the Client as work-for-hire.'
    );

    // Footer
    ctx.font = '12px Inter, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('Doc Ref: ICA-2026-B9', 60, h - 35);
    ctx.fillText('Page 1 of 2 • Continued on next page', w - 300, h - 35);

    return canvas.toDataURL('image/png');
  }

  static renderFreelancePage2(w, h) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    // Accent line
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(60, 40, w - 120, 6);

    ctx.font = 'bold 22px Inter, sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.fillText('INDEPENDENT CONTRACTOR AGREEMENT (PAGE 2)', 60, 95);

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(60, 120);
    ctx.lineTo(w - 60, 120);
    ctx.stroke();

    let y = 160;
    const lh = 28;

    const printParagraph = (text, maxWidth = w - 120) => {
      const words = text.split(' ');
      let line = '';
      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) {
          ctx.fillText(line, 60, y);
          line = words[n] + ' ';
          y += lh;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, 60, y);
      y += lh * 1.35;
    };

    const printHeading = (title) => {
      y += 10;
      ctx.font = 'bold 18px Inter, sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.fillText(title, 60, y);
      y += lh + 2;
      ctx.font = '15px Inter, sans-serif';
      ctx.fillStyle = '#334155';
    };

    ctx.font = '15px Inter, sans-serif';
    ctx.fillStyle = '#334155';

    printHeading('4. Warranties & Indemnification');
    printParagraph(
      'Contractor warrants that all deliverables provided hereunder shall be original work and shall not knowingly infringe upon any copyright, patent, trademark or proprietary rights of any third party.'
    );

    printHeading('5. Dispute Resolution & Execution');
    printParagraph(
      'The parties agree that electronic signatures executed through this digital platform shall be legally binding and possess the same legal force as wet ink signatures under the Uniform Electronic Transactions Act and the ESIGN Act.'
    );

    // Signatures Section
    y = h - 450;
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(60, y);
    ctx.lineTo(w - 60, y);
    ctx.stroke();

    y += 35;
    ctx.font = 'bold 17px Inter, sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.fillText('SIGNATURES & ACKNOWLEDGEMENT', 60, y);

    const col1X = 60;
    const col2X = w / 2 + 30;
    const sigLineY = y + 170;

    // Client box
    ctx.font = 'bold 14px Inter, sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText('CLIENT REPRESENTATIVE', col1X, y + 45);
    ctx.font = '14px Inter, sans-serif';
    ctx.fillText('Venture Apex Holdings Ltd.', col1X, y + 70);

    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(col1X, sigLineY);
    ctx.lineTo(col1X + 440, sigLineY);
    ctx.stroke();

    ctx.font = '13px Inter, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('Authorized Signature', col1X, sigLineY + 22);
    ctx.fillText('Date: ________________________', col1X, sigLineY + 44);

    // Contractor Signer box
    ctx.font = 'bold 14px Inter, sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText('CONTRACTOR / CONSULTANT (SIGN HERE)', col2X, y + 45);
    ctx.font = '14px Inter, sans-serif';
    ctx.fillText('Signer Name: __________________________', col2X, y + 70);

    // Place Signature Target
    ctx.fillStyle = 'rgba(79, 70, 229, 0.05)';
    ctx.fillRect(col2X, sigLineY - 70, 440, 70);
    ctx.strokeStyle = 'rgba(79, 70, 229, 0.4)';
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(col2X, sigLineY - 70, 440, 70);
    ctx.setLineDash([]);

    ctx.strokeStyle = '#94a3b8';
    ctx.beginPath();
    ctx.moveTo(col2X, sigLineY);
    ctx.lineTo(col2X + 440, sigLineY);
    ctx.stroke();

    ctx.font = '13px Inter, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('Contractor Signature ✍️', col2X + 10, sigLineY + 22);
    ctx.fillText('Date: ________________________', col2X, sigLineY + 44);

    // Footer
    ctx.font = '12px Inter, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('Doc Ref: ICA-2026-B9', 60, h - 35);
    ctx.fillText('Page 2 of 2 • End of Agreement', w - 300, h - 35);

    return canvas.toDataURL('image/png');
  }

  static renderApprovalPage(w, h) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    // Border certificate styling
    ctx.strokeStyle = '#059669';
    ctx.lineWidth = 8;
    ctx.strokeRect(30, 30, w - 60, h - 60);

    ctx.strokeStyle = '#a7f3d0';
    ctx.lineWidth = 2;
    ctx.strokeRect(42, 42, w - 84, h - 84);

    // Header Badge
    ctx.font = 'bold 36px Inter, sans-serif';
    ctx.fillStyle = '#065f46';
    ctx.textAlign = 'center';
    ctx.fillText('CERTIFICATE OF ACCEPTANCE & SIGN-OFF', w / 2, 140);

    ctx.font = '500 16px Inter, sans-serif';
    ctx.fillStyle = '#047857';
    ctx.fillText('Official Milestone Completion Verification', w / 2, 175);

    ctx.textAlign = 'left';
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(100, 220);
    ctx.lineTo(w - 100, 220);
    ctx.stroke();

    let y = 280;
    const lh = 30;

    const printParagraph = (text, maxWidth = w - 200) => {
      const words = text.split(' ');
      let line = '';
      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) {
          ctx.fillText(line, 100, y);
          line = words[n] + ' ';
          y += lh;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, 100, y);
      y += lh * 1.4;
    };

    ctx.font = '16px Inter, sans-serif';
    ctx.fillStyle = '#1e293b';

    printParagraph(
      'This is to officially certify that all project deliverables, source codes, technical documentation, quality audits, and functional requirements specified for Phase 1 have been inspected, tested, and accepted in full satisfaction.'
    );

    printParagraph(
      'By signing below, the authorized lead approves final project handover and authorizes disbursement of the corresponding milestone completion balance.'
    );

    // Information Table
    y += 20;
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(100, y, w - 200, 160);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.strokeRect(100, y, w - 200, 160);

    ctx.font = 'bold 15px Inter, sans-serif';
    ctx.fillStyle = '#334155';
    ctx.fillText('Project Title:', 130, y + 45);
    ctx.fillText('Milestone Ref:', 130, y + 90);
    ctx.fillText('Status:', 130, y + 135);

    ctx.font = '15px Inter, sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.fillText('NextGen E-Signature Web Suite', 300, y + 45);
    ctx.fillText('MS-COMPLETION-2026', 300, y + 90);

    ctx.fillStyle = '#059669';
    ctx.font = 'bold 15px Inter, sans-serif';
    ctx.fillText('APPROVED & VERIFIED ✓', 300, y + 135);

    // Signature Area
    y = h - 380;
    const sigLineY = y + 150;
    const colX = w / 2 - 200;

    ctx.textAlign = 'center';
    ctx.font = 'bold 18px Inter, sans-serif';
    ctx.fillStyle = '#065f46';
    ctx.fillText('EXECUTIVE SIGN-OFF', w / 2, y + 30);

    // Signature box
    ctx.fillStyle = 'rgba(5, 150, 105, 0.04)';
    ctx.fillRect(colX, sigLineY - 75, 400, 75);
    ctx.strokeStyle = 'rgba(5, 150, 105, 0.4)';
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(colX, sigLineY - 75, 400, 75);
    ctx.setLineDash([]);

    ctx.strokeStyle = '#059669';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(colX, sigLineY);
    ctx.lineTo(colX + 400, sigLineY);
    ctx.stroke();

    ctx.font = '14px Inter, sans-serif';
    ctx.fillStyle = '#047857';
    ctx.fillText('Authorizing Signature ✍️', w / 2, sigLineY + 24);

    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    ctx.fillStyle = '#64748b';
    ctx.fillText(`Date: ${dateStr}`, w / 2, sigLineY + 48);

    ctx.textAlign = 'left';
    return canvas.toDataURL('image/png');
  }
}

window.DocumentTemplates = DocumentTemplates;
