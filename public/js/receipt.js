/**
 * Smart Society Management System - PDF Receipt Generator
 */

function generateReceiptHTML(bill) {
  return `
    <div id="printableReceipt" class="receipt-box">
      <div class="d-flex align-items-center justify-content-between border-bottom pb-3 mb-3">
        <div>
          <h4 class="fw-bold text-primary mb-0"><i class="fa-solid fa-city me-2"></i>Smart Society 360</h4>
          <small class="text-muted">Digital Residential Administration & Maintenance Receipt</small>
        </div>
        <div class="text-end">
          <span class="badge bg-success fs-7 px-3 py-2"><i class="fa-solid fa-circle-check me-1"></i> PAID</span>
          <div class="text-muted small mt-1">Receipt No: <strong>${bill.receiptNo}</strong></div>
        </div>
      </div>

      <div class="row mb-4">
        <div class="col-6">
          <small class="text-uppercase text-muted fw-bold fs-8">Billed To (Resident)</small>
          <h5 class="fw-bold text-dark mb-0">${bill.residentName}</h5>
          <div class="text-secondary">Flat Number: <strong>${bill.flat}</strong></div>
        </div>
        <div class="col-6 text-end">
          <small class="text-uppercase text-muted fw-bold fs-8">Payment Details</small>
          <div>Payment Date: <strong>${bill.paymentDate}</strong></div>
          <div>Transaction ID: <strong>${bill.txnId}</strong></div>
          <div>Method: <strong>${bill.paymentMethod || 'Online UPI / Card'}</strong></div>
        </div>
      </div>

      <table class="table table-bordered align-middle mb-4">
        <thead class="table-light">
          <tr>
            <th>Description</th>
            <th>Billing Period</th>
            <th class="text-end">Amount (INR)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <div class="fw-bold">Monthly Society Maintenance Fee</div>
              <small class="text-muted">Includes Security, Water Charges, Common Lighting & Elevator Maintenance</small>
            </td>
            <td>${bill.month}</td>
            <td class="text-end fw-bold">₹${bill.amount.toLocaleString()}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <th colspan="2" class="text-end">Total Paid Amount:</th>
            <th class="text-end fw-bold text-success fs-5">₹${bill.amount.toLocaleString()}</th>
          </tr>
        </tfoot>
      </table>

      <div class="d-flex align-items-center justify-content-between border-top pt-3 text-muted fs-8">
        <div><i class="fa-solid fa-shield-halved me-1 text-primary"></i> Digitally Verified Payment Receipt</div>
        <div>Computer Generated Document • No Stamp Required</div>
      </div>
    </div>
  `;
}

function downloadPDFReceipt(billId) {
  const bill = SystemDB.getMaintenance().find(m => m.id === billId);
  if (!bill || bill.status !== 'Paid') {
    alert("Receipt only available for paid maintenance bills.");
    return;
  }

  const printWindow = window.open('', '_blank', 'width=800,height=900');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Receipt_${bill.receiptNo}</title>
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
      <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css" rel="stylesheet">
      <style>
        body { font-family: sans-serif; padding: 40px; background: #fff; }
        .receipt-box { border: 2px solid #4f46e5; border-radius: 16px; padding: 30px; }
      </style>
    </head>
    <body>
      ${generateReceiptHTML(bill)}
      <div class="text-center mt-4 no-print">
        <button onclick="window.print()" class="btn btn-primary px-4 py-2"><i class="fa-solid fa-print me-2"></i> Print / Save as PDF</button>
      </div>
    </body>
    </html>
  `);
  printWindow.document.close();
}
