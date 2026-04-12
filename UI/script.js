// ============================================================
//   SMART RETAIL POS - script.js v2.0
// ============================================================

// ---- Global State ----
let currentTheme = 'light';
let pinCode = '';
const CORRECT_PIN = '123456';
let cart = [];
let selectedPayment = 'cash';
let selectedProduct = null;
let invoiceCounter = 1;
let allTransactions = []; // stores completed transactions

// ---- Products Data ----
const products = [
  { id: 1, name: 'Miniket Rice',    category: 'Grocery',   price: 75,  unit: 'kg',  stock: 125, pieces: 125 },
  { id: 2, name: 'Premium Sugar',   category: 'Grocery',   price: 120, unit: 'kg',  stock: 8,   pieces: 8   },
  { id: 3, name: 'Soybean Oil',     category: 'Grocery',   price: 180, unit: 'L',   stock: 45,  pieces: 45  },
  { id: 4, name: 'Atta Flour',      category: 'Grocery',   price: 45,  unit: 'kg',  stock: 3,   pieces: 3   },
  { id: 5, name: 'Red Lentils',     category: 'Pulses',    price: 130, unit: 'kg',  stock: 22,  pieces: 22  },
  { id: 6, name: 'Iodized Salt',    category: 'Spices',    price: 40,  unit: 'kg',  stock: 50,  pieces: 50  },
  { id: 7, name: 'Milk Powder',     category: 'Dairy',     price: 450, unit: 'pcs', stock: 15,  pieces: 15  },
  { id: 8, name: 'Ceylon Tea',      category: 'Beverages', price: 380, unit: 'kg',  stock: 2,   pieces: 2   },
  { id: 9, name: 'Chinigura Rice',  category: 'Grocery',   price: 95,  unit: 'kg',  stock: 60,  pieces: 60  },
  { id: 10, name: 'Chickpeas',      category: 'Pulses',    price: 110, unit: 'kg',  stock: 18,  pieces: 18  },
];

// Seed some demo transactions
const now = new Date();
function demoTxn(customer, method, items, minutesAgo) {
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const vat = subtotal * 0.05;
  const total = subtotal + vat;
  const time = new Date(now.getTime() - minutesAgo * 60000);
  return { id: ++invoiceCounter - 1, invoiceNo: `INV-2025-00${invoiceCounter}`, customer, method, items, subtotal, vat, total, time };
}
allTransactions = [
  demoTxn('Abdul Rahman', 'cash',  [{ name:'Miniket Rice', price:75, qty:5 }, { name:'Soybean Oil', price:180, qty:2 }], 30),
  demoTxn('Walk-in',      'bkash', [{ name:'Milk Powder', price:450, qty:1 }], 65),
  demoTxn('Fatema Begum', 'cash',  [{ name:'Red Lentils', price:130, qty:3 }, { name:'Iodized Salt', price:40, qty:2 }], 120),
  demoTxn('Walk-in',      'nagad', [{ name:'Ceylon Tea', price:380, qty:1 }, { name:'Chickpeas', price:110, qty:2 }], 180),
  demoTxn('Karim Mia',    'due',   [{ name:'Atta Flour', price:45, qty:10 }], 240),
];

// ---- Initialize ----
document.addEventListener('DOMContentLoaded', () => {
  updateDateTime();
  setInterval(updateDateTime, 1000);
  renderProducts();
  renderInventory();
  updateLowStockCount();
  updateInvoiceNumber();
  renderDashboard();
  renderStatementTransactions();
  setTodayDate();
});

// ---- DateTime ----
function updateDateTime() {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-BD', { year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-BD', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const el1 = document.getElementById('currentDate');
  const el2 = document.getElementById('currentTime');
  const el3 = document.getElementById('dashDate');
  if (el1) el1.textContent = dateStr;
  if (el2) el2.textContent = timeStr;
  if (el3) el3.textContent = dateStr;
}

function setTodayDate() {
  const today = new Date().toISOString().split('T')[0];
  const dd = document.getElementById('dueDate');
  if (dd) dd.value = today;
}

// ============================================================
//   LOGIN / PIN
// ============================================================
function addPinDigit(digit) {
  if (pinCode.length < 6) {
    pinCode += digit;
    updatePinDisplay();
    if (pinCode.length === 6) setTimeout(verifyPin, 200);
  }
}

function clearPin() {
  pinCode = '';
  updatePinDisplay();
  document.getElementById('pinError').textContent = '';
}

function updatePinDisplay() {
  for (let i = 1; i <= 6; i++) {
    const dot = document.getElementById(`pin${i}`);
    if (i <= pinCode.length) {
      dot.classList.add('filled');
      dot.textContent = '•';
    } else {
      dot.classList.remove('filled');
      dot.textContent = '';
    }
  }
}

function verifyPin() {
  if (pinCode === CORRECT_PIN) {
    document.getElementById('pinError').textContent = '';
    document.getElementById('loginScreen').classList.add('hidden');
    const dash = document.getElementById('dashboard');
    dash.classList.add('active');
    renderDashboard();
  } else {
    document.getElementById('pinError').textContent = 'Incorrect PIN. Please try again.';
    // shake animation
    const dots = document.querySelector('.pin-display');
    dots.classList.add('pin-shake');
    setTimeout(() => dots.classList.remove('pin-shake'), 500);
    clearPin();
  }
}

function lockScreen() {
  document.getElementById('loginScreen').classList.remove('hidden');
  document.getElementById('dashboard').classList.remove('active');
  clearPin();
}

// ============================================================
//   TAB SWITCHING
// ============================================================
function switchTab(tabName, el) {
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

  const targetEl = el || document.getElementById(`tab-${tabName}`);
  if (targetEl) targetEl.classList.add('active');

  const pane = document.getElementById(tabName + 'Tab');
  if (pane) pane.classList.add('active');

  if (tabName === 'statement') renderStatementTransactions();
  if (tabName === 'dashboard') renderDashboard();
}

// ============================================================
//   DASHBOARD
// ============================================================
function renderDashboard() {
  // KPI
  const todayTxns = allTransactions;
  const totalSales = todayTxns.length;
  const totalRevenue = todayTxns.reduce((s, t) => s + t.total, 0);

  animateCount('todaySales', `৳${totalRevenue.toFixed(0)}`);
  animateCount('todayRevenue', `৳${(totalRevenue * 0.18).toFixed(0)}`);
  animateCount('totalOrders', totalSales);

  // Recent Transactions
  const txnList = document.getElementById('recentTxnList');
  if (txnList) {
    txnList.innerHTML = allTransactions.slice(-5).reverse().map(t => `
      <div class="txn-item">
        <div class="txn-dot ${t.method}"></div>
        <div class="txn-info">
          <div class="txn-name">${t.customer || 'Walk-in'}</div>
          <div class="txn-time">${formatTime(t.time)}</div>
        </div>
        <div class="txn-amount">৳${t.total.toFixed(2)}</div>
      </div>
    `).join('');
  }

  // Top Products
  const productSales = {};
  allTransactions.forEach(t => {
    t.items.forEach(item => {
      productSales[item.name] = (productSales[item.name] || 0) + item.qty;
    });
  });
  const sorted = Object.entries(productSales).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxQty = sorted[0]?.[1] || 1;

  const tpList = document.getElementById('topProductsList');
  if (tpList) {
    tpList.innerHTML = sorted.map(([name, qty], i) => `
      <div class="top-product-item">
        <div class="tp-rank">${i + 1}</div>
        <div class="tp-info">
          <div class="tp-name">${name}</div>
          <div class="tp-qty">${qty} units sold</div>
        </div>
        <div class="tp-bar-wrap">
          <div class="tp-bar"><div class="tp-bar-fill" style="width:${(qty/maxQty)*100}%"></div></div>
        </div>
      </div>
    `).join('');
  }

  // Stock Alerts
  const alerts = products.filter(p => p.stock <= 10);
  const saList = document.getElementById('stockAlertList');
  if (saList) {
    saList.innerHTML = alerts.map(p => `
      <div class="stock-alert-item">
        <div class="sa-icon ${p.stock <= 3 ? 'danger' : 'warning'}">
          <i class="fas fa-exclamation-triangle"></i>
        </div>
        <div class="sa-info">
          <div class="sa-name">${p.name}</div>
          <div class="sa-stock">${p.stock} ${p.unit} remaining</div>
        </div>
        <span class="sa-badge ${p.stock <= 3 ? 'critical' : 'low'}">${p.stock <= 3 ? 'Critical' : 'Low'}</span>
      </div>
    `).join('') || '<p style="padding:16px;color:var(--text-muted);font-size:13px;text-align:center">No stock alerts 🎉</p>';
  }
}

function animateCount(id, target) {
  const el = document.getElementById(id);
  if (el) el.textContent = target;
}

function formatTime(date) {
  return new Date(date).toLocaleTimeString('en-BD', { hour: '2-digit', minute: '2-digit' });
}

function refreshDashboard() {
  renderDashboard();
  showToast('Dashboard refreshed!', 'success');
}

// ============================================================
//   PRODUCT CATALOG
// ============================================================
function renderProducts(list = products) {
  const tbody = document.getElementById('productTableBody');
  if (!tbody) return;
  tbody.innerHTML = list.map(p => {
    const stockClass = p.stock > 10 ? 'good' : p.stock > 5 ? 'warning' : 'danger';
    return `
      <tr>
        <td>
          <div class="product-info">
            <div class="product-icon"><i class="fas fa-box"></i></div>
            <div class="product-details">
              <div class="product-name">${p.name}</div>
              <div class="product-category">${p.category}</div>
            </div>
          </div>
        </td>
        <td><strong>৳${p.price}</strong> / ${p.unit}</td>
        <td><span class="stock-badge ${stockClass}">${p.stock} ${p.unit}</span></td>
        <td>
          <button class="add-to-cart-btn" onclick="selectProduct(${p.id})" title="Add to cart">
            <i class="fas fa-plus"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function filterCategory(cat, btn) {
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const filtered = cat === 'all' ? products : products.filter(p => p.category === cat);
  renderProducts(filtered);
}

function selectProduct(productId) {
  selectedProduct = products.find(p => p.id === productId);
  const chip = document.getElementById('selectedProductName');
  const chipWrap = document.getElementById('selectedProductChip');
  if (chip) chip.textContent = selectedProduct.name;
  if (chipWrap) {
    chipWrap.style.background = 'rgba(99,102,241,0.12)';
    chipWrap.style.borderColor = 'rgba(99,102,241,0.4)';
    setTimeout(() => {
      chipWrap.style.background = '';
      chipWrap.style.borderColor = '';
    }, 600);
  }
}

// ---- Custom Qty Input ----
function applyCustomQty() {
  if (!selectedProduct) { showToast('Select a product first!', 'warning'); return; }
  const val = parseFloat(document.getElementById('customQtyInput').value);
  if (isNaN(val) || val <= 0) { showToast('Enter a valid quantity', 'error'); return; }
  let displayQty = val + ' ' + selectedProduct.unit;
  addToCart(selectedProduct, val, displayQty);
  document.getElementById('customQtyInput').value = '';
}

// ---- Multiplier ----
function applyMultiplier(value) {
  if (!selectedProduct) { showToast('Select a product first!', 'warning'); return; }
  let displayQty = value >= 1 ? `${value} ${selectedProduct.unit}` : `${value * 1000}g`;
  addToCart(selectedProduct, value, displayQty);
}

// ============================================================
//   CART
// ============================================================
function addToCart(product, quantity, displayQty = null) {
  const existingItem = cart.find(item => item.id === product.id);
  const qty = typeof quantity === 'number' ? quantity : 1;
  const display = displayQty || qty + ' ' + product.unit;

  if (existingItem) {
    existingItem.quantity += qty;
    existingItem.displayQuantity = `${existingItem.quantity} ${product.unit}`;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: qty,
      displayQuantity: display,
      unit: product.unit
    });
  }
  selectedProduct = null;
  document.getElementById('selectedProductName').textContent = 'Select a product';
  renderCart();
  showToast(`${product.name} added to cart`, 'success');
}

function renderCart() {
  const container = document.getElementById('cartItems');
  const countBadge = document.getElementById('cartCount');
  if (!container) return;

  if (cart.length === 0) {
    container.innerHTML = `
      <div class="empty-cart">
        <i class="fas fa-shopping-cart"></i>
        <p>Cart is empty</p>
        <span>Select products to add</span>
      </div>`;
    document.getElementById('cartSubtotal').textContent = '৳0';
    document.getElementById('cartVat').textContent = '৳0';
    document.getElementById('cartTotal').textContent = '৳0';
    if (countBadge) countBadge.textContent = '0 items';
    return;
  }

  let subtotal = 0;
  container.innerHTML = cart.map((item, index) => {
    const itemTotal = item.price * item.quantity;
    subtotal += itemTotal;
    return `
      <div class="cart-item">
        <div class="cart-item-info">
          <h4>${item.name}</h4>
          <p>৳${item.price}/${item.unit} × ${item.displayQuantity}</p>
        </div>
        <div class="cart-item-actions">
          <span><strong>৳${itemTotal.toFixed(2)}</strong></span>
          <div class="qty-control">
            <button class="qty-btn" onclick="updateCartItem(${index}, -1)">−</button>
            <span>${item.quantity % 1 === 0 ? item.quantity : item.quantity.toFixed(2)}</span>
            <button class="qty-btn" onclick="updateCartItem(${index}, 1)">+</button>
          </div>
        </div>
      </div>`;
  }).join('');

  const discountEl = document.getElementById('discountInput');
  const discount = discountEl ? (parseFloat(discountEl.value) || 0) : 0;
  const vat = subtotal * 0.05;
  const total = subtotal + vat - discount;

  document.getElementById('cartSubtotal').textContent = `৳${subtotal.toFixed(2)}`;
  document.getElementById('cartVat').textContent = `৳${vat.toFixed(2)}`;
  document.getElementById('cartTotal').textContent = `৳${Math.max(0, total).toFixed(2)}`;
  if (countBadge) countBadge.textContent = `${cart.length} item${cart.length !== 1 ? 's' : ''}`;
}

function updateCartItem(index, change) {
  cart[index].quantity += change;
  if (cart[index].quantity <= 0) cart.splice(index, 1);
  renderCart();
}

function clearCart() {
  if (cart.length === 0) return;
  if (confirm('Clear the entire cart?')) {
    cart = [];
    renderCart();
    showToast('Cart cleared', 'info');
  }
}

// ============================================================
//   PAYMENT
// ============================================================
function selectPayment(method, btn) {
  selectedPayment = method;
  document.querySelectorAll('.payment-option').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const dueSettings = document.getElementById('dueSettings');
  if (dueSettings) dueSettings.style.display = method === 'due' ? 'flex' : 'none';
}

// ============================================================
//   CHECKOUT
// ============================================================
function updateInvoiceNumber() {
  const num = `INV-2025-${String(invoiceCounter).padStart(3, '0')}`;
  const el = document.getElementById('invoiceNumber');
  if (el) el.textContent = num;
}

function processCheckout() {
  if (cart.length === 0) { showToast('Cart is empty!', 'error'); return; }

  if (selectedPayment === 'bkash' || selectedPayment === 'nagad') {
    showQRModal();
  } else {
    completeTransaction();
  }
}

function showQRModal() {
  const total = computeTotal();
  const modalTitle = document.getElementById('bkashModalTitle');
  if (modalTitle) modalTitle.textContent = selectedPayment === 'nagad' ? 'Nagad Payment' : 'bKash Payment';
  document.getElementById('bkashAmount').textContent = `৳${total.toFixed(2)}`;
  document.getElementById('bkashModal').classList.add('show');
}

function closeBkashModal() {
  document.getElementById('bkashModal').classList.remove('show');
  completeTransaction();
}

function completeTransaction() {
  const customerName = document.getElementById('customerName')?.value.trim() || 'Walk-in';
  const customerPhone = document.getElementById('customerPhone')?.value.trim() || '';
  const discountEl = document.getElementById('discountInput');
  const discount = discountEl ? (parseFloat(discountEl.value) || 0) : 0;

  let subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const vat = subtotal * 0.05;
  const total = Math.max(0, subtotal + vat - discount);

  const invoiceNo = `INV-2025-${String(invoiceCounter).padStart(3, '0')}`;

  const txn = {
    id: invoiceCounter,
    invoiceNo,
    customer: customerName,
    phone: customerPhone,
    method: selectedPayment,
    items: cart.map(i => ({ name: i.name, price: i.price, qty: i.quantity, unit: i.unit })),
    subtotal, vat, discount, total,
    time: new Date()
  };
  allTransactions.push(txn);

  // Deduct stock
  cart.forEach(ci => {
    const prod = products.find(p => p.id === ci.id);
    if (prod) { prod.stock = Math.max(0, prod.stock - ci.quantity); prod.pieces = prod.stock; }
  });

  invoiceCounter++;
  updateInvoiceNumber();
  showReceipt(txn);

  // Clear
  cart = [];
  renderCart();
  if (discountEl) discountEl.value = '';
  document.getElementById('customerName').value = '';
  document.getElementById('customerPhone').value = '';
  renderInventory();
  updateLowStockCount();
}

function computeTotal() {
  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const vat = subtotal * 0.05;
  const discount = parseFloat(document.getElementById('discountInput')?.value) || 0;
  return Math.max(0, subtotal + vat - discount);
}

// ============================================================
//   RECEIPT
// ============================================================
function showReceipt(txn) {
  const modal = document.getElementById('receiptModal');
  const container = document.getElementById('receiptItems');

  document.getElementById('receiptInvoice').textContent = txn.invoiceNo;
  document.getElementById('receiptDateTime').textContent = new Date(txn.time).toLocaleString('en-BD');

  const custInfo = document.getElementById('receiptCustomerInfo');
  if (custInfo) {
    custInfo.innerHTML = txn.customer !== 'Walk-in' ? `
      <div>Customer: <strong>${txn.customer}</strong>${txn.phone ? ` | ${txn.phone}` : ''}</div>
    ` : '';
  }

  container.innerHTML = txn.items.map(item => `
    <div class="receipt-item">
      <span>${item.name} × ${item.qty} ${item.unit}</span>
      <span>৳${(item.price * item.qty).toFixed(2)}</span>
    </div>
  `).join('') + `
    <div class="receipt-item"><span>VAT (5%)</span><span>৳${txn.vat.toFixed(2)}</span></div>
    ${txn.discount > 0 ? `<div class="receipt-item"><span>Discount</span><span>-৳${txn.discount.toFixed(2)}</span></div>` : ''}
  `;

  document.getElementById('receiptTotal').textContent = `Total: ৳${txn.total.toFixed(2)}`;
  document.getElementById('receiptPayment').textContent = `Payment: ${txn.method.toUpperCase()}`;

  modal.classList.add('show');
}

function closeReceiptModal() {
  document.getElementById('receiptModal').classList.remove('show');
}

function printReceipt() {
  window.print();
}

function printStatement() {
  const content = document.getElementById('statementTab').innerHTML;
  const printWin = window.open('', '_blank');
  printWin.document.write(`
    <html><head><title>Financial Statement</title>
    <style>
      body { font-family: sans-serif; padding: 20px; color: #111; }
      table { width: 100%; border-collapse: collapse; margin-top: 20px; }
      th, td { padding: 10px 14px; border-bottom: 1px solid #eee; text-align: left; font-size: 13px; }
      th { background: #f8f8f8; font-weight: 600; }
      h2 { font-size: 20px; margin-bottom: 4px; }
      .sc-row { display: flex; gap: 20px; margin-bottom: 20px; flex-wrap: wrap; }
      .sc { padding: 16px; border-radius: 8px; color: white; flex: 1; min-width: 150px; }
      .sc h3 { font-size: 22px; font-weight: 800; }
      .sc span { font-size: 12px; opacity: .85; }
      .sc.b { background: #667eea; } .sc.g { background: #10b981; }
      .sc.p { background: #8b5cf6; } .sc.o { background: #f59e0b; }
    </style></head><body>
    <h2>SmartRetail — Financial Statement</h2>
    <p style="color:#666;font-size:13px">Printed: ${new Date().toLocaleString('en-BD')}</p>
    <div class="sc-row">
      <div class="sc b"><span>Total Sales</span><h3>৳1,89,450</h3></div>
      <div class="sc g"><span>Gross Profit</span><h3>৳42,800</h3></div>
      <div class="sc p"><span>Net Profit</span><h3>৳35,620</h3></div>
      <div class="sc o"><span>Margin</span><h3>18.8%</h3></div>
    </div>
    <h3 style="margin-bottom:10px;font-size:15px">Transaction Details</h3>
    <table>
      <thead><tr><th>Invoice</th><th>Customer</th><th>Method</th><th>Items</th><th>Total</th><th>Time</th></tr></thead>
      <tbody>
        ${allTransactions.map(t => `
          <tr>
            <td>${t.invoiceNo}</td>
            <td>${t.customer}</td>
            <td>${t.method.toUpperCase()}</td>
            <td>${t.items.map(i => i.name).join(', ')}</td>
            <td><strong>৳${t.total.toFixed(2)}</strong></td>
            <td>${new Date(t.time).toLocaleTimeString('en-BD', {hour:'2-digit',minute:'2-digit'})}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    </body></html>
  `);
  printWin.document.close();
  printWin.print();
}

function sendWhatsApp() {
  const phone = prompt('Enter customer WhatsApp number (with country code):');
  if (phone) {
    const lastTxn = allTransactions[allTransactions.length - 1];
    const msg = lastTxn
      ? `SmartRetail Store%0A${lastTxn.invoiceNo}%0ACustomer: ${lastTxn.customer}%0AItems: ${lastTxn.items.map(i => i.name + ' x' + i.qty).join(', ')}%0ATotal: ৳${lastTxn.total.toFixed(2)}%0AThank you!`
      : `SmartRetail Store - Thank you for shopping!`;
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  }
}

function sendSMS() {
  showToast('SMS: Integrate with GreenWeb / BulkSMSBD API', 'info');
}

// ============================================================
//   INVENTORY
// ============================================================
function renderInventory(list = products) {
  const tbody = document.getElementById('inventoryTableBody');
  if (!tbody) return;
  let totalValue = 0;

  tbody.innerHTML = list.map(p => {
    const val = p.price * p.pieces;
    totalValue += val;
    const status = p.pieces > 10 ? 'instock' : 'lowstock';
    const statusText = p.pieces > 10 ? 'In Stock' : 'Low Stock';
    return `
      <tr>
        <td><strong>${p.name}</strong></td>
        <td>${p.category}</td>
        <td>৳${p.price}</td>
        <td><strong>${p.pieces}</strong> ${p.unit}</td>
        <td>৳${val.toFixed(2)}</td>
        <td><span class="status-badge ${status}">${statusText}</span></td>
        <td class="action-icons">
          <i class="fas fa-edit" onclick="editProduct(${p.id})" title="Edit"></i>
          <i class="fas fa-trash-alt" onclick="deleteProduct(${p.id})" title="Delete"></i>
        </td>
      </tr>`;
  }).join('');

  const tv = document.getElementById('totalStockValue');
  const tp = document.getElementById('totalProducts');
  const ls = document.getElementById('lowStockItems2');
  if (tv) tv.textContent = `৳${totalValue.toFixed(2)}`;
  if (tp) tp.textContent = list.length;
  if (ls) ls.textContent = list.filter(p => p.pieces <= 10).length;
}

function searchInventory(term) {
  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(term.toLowerCase()) ||
    p.category.toLowerCase().includes(term.toLowerCase())
  );
  renderInventory(filtered);
}

function updateLowStockCount() {
  const lowStock = products.filter(p => p.pieces <= 5).length;
  const el1 = document.getElementById('lowStockItems');
  const el2 = document.getElementById('lowStockCount');
  if (el1) el1.textContent = lowStock;
  if (el2) el2.textContent = `${lowStock} Low Stock`;
}

function editProduct(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  const newPrice = prompt(`Edit price for ${p.name} (current: ৳${p.price}):`, p.price);
  if (newPrice !== null) {
    const parsed = parseFloat(newPrice);
    if (!isNaN(parsed) && parsed > 0) {
      p.price = parsed;
      renderInventory();
      renderProducts();
      showToast(`${p.name} price updated to ৳${parsed}`, 'success');
    } else {
      showToast('Invalid price entered', 'error');
    }
  }
}

function deleteProduct(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  if (confirm(`Delete "${p.name}" from inventory?`)) {
    const index = products.findIndex(x => x.id === id);
    products.splice(index, 1);
    renderProducts();
    renderInventory();
    updateLowStockCount();
    showToast(`${p.name} removed`, 'info');
  }
}

function showAddProductModal() {
  showToast('Add Product: Connect to backend API', 'info');
}

// ============================================================
//   DUES
// ============================================================
function showAddDueModal() {
  showToast('Add Due: Connect to backend API', 'info');
}

function markDuePaid(btn) {
  const row = btn.closest('tr');
  if (row) {
    row.style.transition = 'all 0.3s ease';
    row.style.opacity = '0.5';
    setTimeout(() => {
      row.style.opacity = '1';
      const badge = row.querySelector('.status-badge');
      const daysBadge = row.querySelector('.days-badge');
      if (badge) { badge.className = 'status-badge instock'; badge.textContent = 'Paid'; }
      if (daysBadge) { daysBadge.className = 'days-badge pending'; daysBadge.textContent = 'Paid'; }
      showToast('Due marked as paid!', 'success');
    }, 300);
  }
}

function callCustomer(phone) {
  window.location.href = `tel:${phone.replace(/-/g, '')}`;
}

function whatsappCustomer(phone) {
  const cleaned = phone.replace(/-/g, '').replace(/^0/, '880');
  window.open(`https://wa.me/${cleaned}?text=আপনার পেমেন্টের কথা মনে করিয়ে দিতে চাইছি। অনুগ্রহ করে যোগাযোগ করুন।`, '_blank');
}

// ============================================================
//   STATEMENT
// ============================================================
function renderStatementTransactions() {
  const list = document.getElementById('txnDetailList');
  const countEl = document.getElementById('txnCount');
  const footerTotal = document.getElementById('txnFooterTotal');
  if (!list) return;

  if (allTransactions.length === 0) {
    list.innerHTML = '<p style="padding:20px;text-align:center;color:var(--text-muted);font-size:13px">No transactions yet</p>';
    if (countEl) countEl.textContent = '0 records';
    if (footerTotal) footerTotal.textContent = '৳0.00';
    return;
  }

  let grandTotal = 0;
  list.innerHTML = allTransactions.slice().reverse().map(t => {
    grandTotal += t.total;
    const methodLabel = { cash: 'Cash', bkash: 'bKash', nagad: 'Nagad', due: 'Due' }[t.method] || t.method;
    return `
      <div class="txn-detail-item">
        <div class="txn-d-name">
          <div class="txn-d-dot ${t.method}"></div>
          <div>
            <div>${t.customer}</div>
            <div style="font-size:11px;color:var(--text-muted)">${t.invoiceNo}</div>
          </div>
        </div>
        <div class="txn-d-time">${formatTime(t.time)}</div>
        <div>
          <span class="status-badge ${t.method === 'due' ? 'pending' : 'instock'}">${methodLabel}</span>
        </div>
        <div class="txn-d-amount">৳${t.total.toFixed(2)}</div>
      </div>
    `;
  }).join('');

  if (countEl) countEl.textContent = `${allTransactions.length} records`;
  if (footerTotal) footerTotal.textContent = `৳${grandTotal.toFixed(2)}`;
}

function filterStatement() {
  renderStatementTransactions();
}

function downloadStatement() {
  showToast('Generating PDF statement...', 'info');
  setTimeout(() => showToast('PDF download ready!', 'success'), 1500);
}

// ============================================================
//   THEME TOGGLE
// ============================================================
function toggleTheme() {
  currentTheme = currentTheme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', currentTheme);
  const icon = document.querySelector('.theme-toggle i');
  if (icon) icon.className = currentTheme === 'light' ? 'fas fa-sun' : 'fas fa-moon';
}

// ============================================================
//   TOAST NOTIFICATIONS
// ============================================================
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const icons = { success: 'fa-check-circle', error: 'fa-times-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <i class="fas ${icons[type]} toast-icon ${type}"></i>
    <span class="toast-msg">${message}</span>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ============================================================
//   SEARCH (Product)
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('productSearch');
  if (searchInput) {
    searchInput.addEventListener('input', e => {
      const term = e.target.value.toLowerCase();
      const filtered = products.filter(p =>
        p.name.toLowerCase().includes(term) || p.category.toLowerCase().includes(term)
      );
      renderProducts(filtered);
    });
  }
});


// ============================================================
//   SMART RETAIL v2.1 — ADDON MODULE
//   Dues | Expenses | Statement | Dashboard — Clean Rewrite
// ============================================================

/* ── Product extensions ─────────────────────────────────── */
products.forEach(p => {
  if (!p.purchasePrice) p.purchasePrice = Math.round(p.price * 0.75);
  if (!p.salesPrice)    p.salesPrice    = p.price;
});

/* ── Expense type maps ──────────────────────────────────── */
const EXP_TYPE_COLORS = {
  Snacks:'#f59e0b', Tea:'#10b981', Meals:'#f43f5e',
  Chanda:'#8b5cf6', Maintenance:'#64748b', Transport:'#0ea5e9',
  Utilities:'#eab308', Others:'#475569',
};
const EXP_TYPE_ICONS = {
  Snacks:'fa-cookie-bite', Tea:'fa-mug-hot', Meals:'fa-utensils',
  Chanda:'fa-hand-holding-heart', Maintenance:'fa-tools', Transport:'fa-truck',
  Utilities:'fa-bolt', Others:'fa-ellipsis-h',
};

/* ── Expenses data ──────────────────────────────────────── */
let expenses = [
  { id:1, type:'Tea',         amount:80,   description:'Morning tea for staff',  time:new Date(Date.now()-5*3600000)  },
  { id:2, type:'Meals',       amount:450,  description:'Lunch for 3 members',    time:new Date(Date.now()-4*3600000)  },
  { id:3, type:'Maintenance', amount:1200, description:'AC servicing',            time:new Date(Date.now()-2*3600000)  },
  { id:4, type:'Transport',   amount:200,  description:'Delivery van fuel',       time:new Date(Date.now()-1*3600000)  },
  { id:5, type:'Snacks',      amount:150,  description:'Evening snacks',          time:new Date(Date.now()-30*60000)   },
];
let expIdCounter = 6;
let selectedExpType = '';

/* ── Dues data ──────────────────────────────────────────── */
let duesData = [
  { id:1, name:'Abdul Karim',    phone:'01712-345678', type:'Dhaar/Cash',        amount:3200, period:30, addedDate:new Date(Date.now()-35*86400000), paid:false, paidDate:null, note:'' },
  { id:2, name:'Rahima Begum',   phone:'01823-987654', type:'Product Purchase',  amount:1850, period:10, addedDate:new Date(Date.now()-7*86400000),  paid:false, paidDate:null, note:'Grocery items' },
  { id:3, name:'Shahidul Islam', phone:'01911-234567', type:'Old Balance',       amount:7500, period:30, addedDate:new Date(Date.now()-40*86400000), paid:false, paidDate:null, note:'' },
  { id:4, name:'Nasrin Akter',   phone:'01615-112233', type:'Advance Order',     amount:2200, period:20, addedDate:new Date(Date.now()-5*86400000),  paid:false, paidDate:null, note:'Next month order' },
  { id:5, name:'Rubel Hossain',  phone:'01788-556677', type:'Dhaar/Cash',        amount:1000, period:60, addedDate:new Date(Date.now()-70*86400000), paid:true,  paidDate:new Date(Date.now()-2*86400000), note:'' },
];
let dueIdCounter = 6;
let _selDueType   = '';
let _duePeriodDays = 5;

// ─── helpers ───
function _getDueDate(due)  { return new Date(due.addedDate.getTime() + due.period * 86400000); }
function _getDaysLeft(due) { return Math.ceil((_getDueDate(due) - new Date()) / 86400000); }
function _getDueStatus(due) {
  const d = _getDaysLeft(due);
  if (d < -5) return { label:'Critical', cls:'critical' };
  if (d <  0) return { label:'Overdue',  cls:'overdue'  };
  if (d <= 3) return { label:'Due Soon', cls:'pending'  };
  return           { label:'Pending',  cls:'pending'   };
}
function _fmt(n) { return Number(n).toLocaleString('en-IN', { maximumFractionDigits:0 }); }
function _fmtDt(d, opts) { return new Date(d).toLocaleDateString('en-BD', opts||{year:'numeric',month:'short',day:'numeric'}); }
function _fmtTm(d) { return new Date(d).toLocaleTimeString('en-BD', {hour:'2-digit', minute:'2-digit'}); }
function _set(id, val) { const el=document.getElementById(id); if(el) el.textContent=val; }

// ══════════════════════════════════════════════════════════
//   EXPENSES MODULE
// ══════════════════════════════════════════════════════════

function selectExpType(btn) {
  document.querySelectorAll('.exp-type-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  selectedExpType = btn.dataset.type;
}

function addExpense() {
  const amount = parseFloat(document.getElementById('expAmount')?.value);
  const desc   = document.getElementById('expDescription')?.value.trim() || '';
  if (!amount || amount <= 0)  { showToast('Enter a valid amount', 'error');   return; }
  if (!selectedExpType)        { showToast('Select an expense type', 'warning'); return; }

  expenses.unshift({ id:expIdCounter++, type:selectedExpType, amount, description:desc, time:new Date() });

  document.getElementById('expAmount').value = '';
  document.getElementById('expDescription').value = '';
  document.querySelectorAll('.exp-type-btn').forEach(b => b.classList.remove('active'));
  selectedExpType = '';

  renderExpenses();
  showToast(`${expenses[0].type} ৳${amount.toFixed(2)} added`, 'success');
}

function deleteExpense(id) {
  expenses = expenses.filter(e => e.id !== id);
  renderExpenses();
  showToast('Expense deleted', 'info');
}

function clearAllExpenses() {
  if (!expenses.length) return;
  if (confirm('Clear all expense records?')) { expenses = []; renderExpenses(); showToast('Cleared', 'info'); }
}

function renderExpenses() { renderExpList(); renderExpChart(); renderExpSummary(); }

function renderExpList() {
  const tbody = document.getElementById('expListBody');
  if (!tbody) return;
  if (!expenses.length) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="exp-list-empty"><i class="fas fa-inbox"></i><p>No expenses recorded yet</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = expenses.map((e,i) => {
    const col  = EXP_TYPE_COLORS[e.type] || '#64748b';
    const icon = EXP_TYPE_ICONS[e.type]  || 'fa-tag';
    return `<tr class="${i===0?'exp-row-new':''}">
      <td><span class="exp-type-chip" style="background:${col}18;color:${col}"><i class="fas ${icon}"></i>${e.type}</span></td>
      <td class="exp-desc-cell" title="${e.description||''}">${e.description||'<span style="color:var(--text-muted)">—</span>'}</td>
      <td class="exp-amount-cell">৳${e.amount.toFixed(2)}</td>
      <td class="exp-time-cell">${_fmtDt(e.time,{month:'short',day:'numeric'})}, ${_fmtTm(e.time)}</td>
      <td><button class="exp-del-btn" onclick="deleteExpense(${e.id})"><i class="fas fa-trash"></i></button></td>
    </tr>`;
  }).join('');
}

function renderExpChart() {
  const container = document.getElementById('expBarChart');
  if (!container) return;
  if (!expenses.length) {
    container.innerHTML = `<div class="exp-chart-empty"><i class="fas fa-chart-bar"></i><p>No expenses yet</p></div>`;
    return;
  }
  const byType = {};
  expenses.forEach(e => { byType[e.type] = (byType[e.type]||0) + e.amount; });
  const sorted = Object.entries(byType).sort((a,b) => b[1]-a[1]);
  const maxVal = sorted[0][1];
  container.innerHTML = sorted.map(([type,total],i) => {
    const col  = EXP_TYPE_COLORS[type] || '#64748b';
    const icon = EXP_TYPE_ICONS[type]  || 'fa-tag';
    const pct  = Math.max(8, Math.round((total/maxVal)*100));
    return `<div class="exp-chart-row" style="animation-delay:${i*0.07}s">
      <div class="exp-bar-label"><i class="fas ${icon}" style="color:${col}"></i>${type}</div>
      <div class="exp-bar-track">
        <div class="exp-bar-fill animate" style="width:${pct}%;background:${col};animation-delay:${i*0.07}s">
          ${pct>20?`৳${total.toFixed(0)}`:''}
        </div>
      </div>
      <div class="exp-bar-amount">৳${total.toFixed(0)}</div>
    </div>`;
  }).join('');
}

function renderExpSummary() {
  const now   = new Date();
  const today = now.toDateString();
  const m     = now.getMonth(), y = now.getFullYear();
  const todayTotal = expenses.filter(e => new Date(e.time).toDateString()===today).reduce((s,e)=>s+e.amount,0);
  const monthTotal = expenses.filter(e => { const d=new Date(e.time); return d.getMonth()===m&&d.getFullYear()===y; }).reduce((s,e)=>s+e.amount,0);
  _set('expTodayTotal',  `৳${todayTotal.toFixed(2)}`);
  _set('expMonthTotal',  `৳${monthTotal.toFixed(2)}`);
  _set('expRecordCount', expenses.length);
  _set('expTotalBadge',  `৳${monthTotal.toFixed(2)}`);
}

// ══════════════════════════════════════════════════════════
//   DUES MODULE
// ══════════════════════════════════════════════════════════

function showAddDueModal()  { document.getElementById('addDueModal').classList.add('show'); }
function closeAddDueModal() {
  document.getElementById('addDueModal').classList.remove('show');
  ['dueFormName','dueFormPhone','dueFormAmount','dueFormNote'].forEach(id => {
    const el=document.getElementById(id); if(el) el.value='';
  });
  document.querySelectorAll('.due-type-btn').forEach(b=>b.classList.remove('active'));
  _selDueType = '';
  document.getElementById('dueFormType').value = '';
  // Reset period to 5d
  const firstPeriodBtn = document.querySelector('#addDueModal .due-period-btn');
  if (firstPeriodBtn) { selectDueFormPeriod(5, firstPeriodBtn); }
}

function selectDueType(btn) {
  document.querySelectorAll('.due-type-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  _selDueType = btn.dataset.dtype;
  document.getElementById('dueFormType').value = _selDueType;
}

function selectDueFormPeriod(days, btn) {
  document.querySelectorAll('#addDueModal .due-period-btn').forEach(b=>b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  _duePeriodDays = days;
  const el = document.getElementById('dueFormPeriod'); if(el) el.value = days;
}

// Payment panel due period (sales tab)
function selectDuePeriod(days, btn) {
  document.querySelectorAll('.due-period-btns .due-period-btn').forEach(b=>b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const el = document.getElementById('duePeriodDays'); if(el) el.value = days;
}

function saveDue() {
  const name   = document.getElementById('dueFormName')?.value.trim();
  const phone  = document.getElementById('dueFormPhone')?.value.trim();
  const type   = document.getElementById('dueFormType')?.value;
  const period = parseInt(document.getElementById('dueFormPeriod')?.value) || 5;
  const amount = parseFloat(document.getElementById('dueFormAmount')?.value);
  const note   = document.getElementById('dueFormNote')?.value.trim() || '';

  if (!name)               { showToast('Customer name required', 'error');   return; }
  if (!phone)              { showToast('Phone number required',  'error');   return; }
  if (!type)               { showToast('Select a due type',      'warning'); return; }
  if (!amount || amount<=0){ showToast('Enter valid amount',     'error');   return; }

  duesData.unshift({ id:dueIdCounter++, name, phone, type, amount, period, addedDate:new Date(), paid:false, paidDate:null, note });
  closeAddDueModal();
  renderDuesTab();
  renderDashboard();
  showToast(`Due ৳${amount.toFixed(2)} added for ${name}`, 'success');
}

function markDuePaid(id) {
  const due = duesData.find(d => d.id === id);
  if (!due || due.paid) return;
  const row = document.getElementById(`due-row-${id}`);
  const doMark = () => {
    due.paid = true;
    due.paidDate = new Date();
    renderDuesTab();
    renderDashboard();
    showToast(`✓ ${due.name}'s ৳${_fmt(due.amount)} marked as paid!`, 'success');
  };
  if (row) {
    row.classList.add('due-row-removing');
    setTimeout(doMark, 420);
  } else { doMark(); }
}

function deleteDue(id) {
  if (!confirm('Delete this due record?')) return;
  duesData = duesData.filter(d => d.id !== id);
  renderDuesTab();
  showToast('Due deleted', 'info');
}

function callCustomer(phone) { window.location.href = `tel:${phone.replace(/-/g,'')}`; }
function whatsappCustomer(phone) {
  const cleaned = phone.replace(/-/g,'').replace(/^0/,'880');
  window.open(`https://wa.me/${cleaned}?text=${encodeURIComponent('আপনার বাকি টাকা পরিশোধের অনুরোধ করা হচ্ছে। ধন্যবাদ।')}`, '_blank');
}

function renderDuesTab() {
  const active = duesData.filter(d => !d.paid);
  const paid   = duesData.filter(d =>  d.paid);
  const pendingAmt   = active.reduce((s,d)=>s+d.amount, 0);
  const collectedAmt = paid.reduce((s,d)=>s+d.amount,   0);

  _set('dueStatActive',    active.length);
  _set('dueStatTotal',     `৳${_fmt(pendingAmt)}`);
  _set('dueStatCollected', `৳${_fmt(collectedAmt)}`);
  _set('dueActiveCount',   active.length);
  _set('dueTotalAmt',      `৳${_fmt(pendingAmt)}`);
  _set('dueCollectedAmt',  `৳${_fmt(collectedAmt)}`);

  // Active table
  const tbody = document.getElementById('duesTableBody');
  if (tbody) {
    if (!active.length) {
      tbody.innerHTML = `<tr><td colspan="8"><div style="padding:28px;text-align:center;color:var(--text-muted)"><i class="fas fa-check-circle" style="font-size:28px;opacity:.3;display:block;margin-bottom:8px;color:var(--success)"></i>No active dues 🎉</div></td></tr>`;
    } else {
      tbody.innerHTML = active.map(due => {
        const st      = _getDueStatus(due);
        const daysL   = _getDaysLeft(due);
        const dLabel  = daysL < 0 ? `${Math.abs(daysL)}d overdue` : `${daysL}d left`;
        const initials= due.name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
        return `<tr class="due-row" id="due-row-${due.id}">
          <td><div class="customer-cell"><div class="cust-avatar">${initials}</div><div><div style="font-weight:600">${due.name}</div><div style="font-size:11px;color:var(--text-muted)">${due.note||''}</div></div></div></td>
          <td style="font-size:13px">${due.phone}</td>
          <td><span class="exp-type-chip" style="background:rgba(245,158,11,0.12);color:var(--warning);font-size:11px">${due.type}</span></td>
          <td class="amount-cell">৳${_fmt(due.amount)}</td>
          <td style="font-size:12px;color:var(--text-secondary)">${_fmtDt(_getDueDate(due))}</td>
          <td><span class="days-badge ${st.cls}">${dLabel}</span></td>
          <td><span class="status-badge ${st.cls}">${st.label}</span></td>
          <td class="action-icons" style="display:flex;gap:5px">
            <button class="due-action-btn success" title="Mark Paid"  onclick="markDuePaid(${due.id})"><i class="fas fa-check"></i></button>
            <button class="due-action-btn info"    title="Call"       onclick="callCustomer('${due.phone}')"><i class="fas fa-phone"></i></button>
            <button class="due-action-btn warning" title="WhatsApp"   onclick="whatsappCustomer('${due.phone}')"><i class="fab fa-whatsapp"></i></button>
            <button class="due-action-btn" style="background:rgba(244,63,94,0.1);color:var(--danger)" title="Delete" onclick="deleteDue(${due.id})"><i class="fas fa-trash"></i></button>
          </td>
        </tr>`;
      }).join('');
    }
  }

  // Paid table
  const paidBody = document.getElementById('paidDuesTableBody');
  if (paidBody) {
    _set('paidDuesCount', `${paid.length} records`);
    if (!paid.length) {
      paidBody.innerHTML = `<tr><td colspan="7"><div style="padding:16px;text-align:center;color:var(--text-muted);font-size:13px">No paid dues yet</div></td></tr>`;
    } else {
      paidBody.innerHTML = paid.map(due => {
        const initials = due.name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
        return `<tr class="due-row">
          <td><div class="customer-cell"><div class="cust-avatar" style="background:linear-gradient(135deg,var(--success),#4ade80)">${initials}</div><span style="font-weight:600">${due.name}</span></div></td>
          <td style="font-size:13px">${due.phone}</td>
          <td><span class="exp-type-chip" style="background:rgba(34,197,94,0.1);color:var(--success);font-size:11px">${due.type}</span></td>
          <td class="amount-cell" style="color:var(--success)">৳${_fmt(due.amount)}</td>
          <td style="font-size:12px;color:var(--text-muted)">${_fmtDt(_getDueDate(due))}</td>
          <td style="font-size:12px;font-weight:700;color:var(--success)">${due.paidDate?_fmtDt(due.paidDate):'—'}</td>
          <td><span class="status-badge instock">Paid</span></td>
        </tr>`;
      }).join('');
    }
  }
}

// ══════════════════════════════════════════════════════════
//   STATEMENT MODULE
// ══════════════════════════════════════════════════════════

function renderStatement() {
  const filter = document.getElementById('statementMonth')?.value || 'month';
  const now = new Date();

  function inRange(date) {
    const d = new Date(date);
    if (filter==='all')   return true;
    if (filter==='today') return d.toDateString()===now.toDateString();
    if (filter==='week')  return (now-d)<=7*86400000;
    return d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear();
  }

  const fTxns = allTransactions.filter(t => inRange(t.time));
  const fExps = expenses.filter(e => inRange(e.time));
  const active = duesData.filter(d => !d.paid);

  const totalRev  = fTxns.reduce((s,t) => s+t.total, 0);
  const totalExp  = fExps.reduce((s,e) => s+e.amount, 0);
  const totalDues = active.reduce((s,d) => s+d.amount, 0);
  const grossProfit = fTxns.reduce((s,t) =>
    s + t.items.reduce((ps,item) => {
      const p  = products.find(x=>x.name===item.name);
      const pp = p?.purchasePrice || (p?.price||0)*0.75;
      return ps + ((item.price||0) - pp) * item.qty;
    }, 0), 0);
  const netProfit = grossProfit - totalExp;
  const margin    = totalRev>0 ? (netProfit/totalRev*100) : 0;

  // KPI summary
  _set('stmtRevenue',    `৳${_fmt(totalRev)}`);
  _set('stmtRevenueNote',`${fTxns.length} transactions`);
  _set('stmtExpenses',   `৳${_fmt(totalExp)}`);
  _set('stmtExpNote',    `${fExps.length} records`);
  _set('stmtDues',       `৳${_fmt(totalDues)}`);
  _set('stmtDueNote',    `${active.length} active`);
  _set('stmtNetProfit',  `৳${_fmt(netProfit)}`);
  _set('stmtMarginNote', netProfit>=0 ? 'After all deductions' : 'Net loss');
  _set('stmtMargin',     `${margin.toFixed(1)}%`);
  _set('stmtMarginSub',  'vs revenue');

  // Bar chart — group by label
  function groupBy(arr, keyFn, valFn) {
    const g = {};
    arr.forEach(x => { const k=keyFn(x); g[k]=(g[k]||0)+valFn(x); });
    return g;
  }
  const labelFn = t => {
    const d = new Date(t.time||t);
    if (filter==='today') return `${d.getHours()}h`;
    if (filter==='week')  return d.toLocaleDateString('en-BD',{weekday:'short'});
    return `Wk${Math.ceil(d.getDate()/7)}`;
  };
  const sGroups = groupBy(fTxns, labelFn, t=>t.total);
  const eGroups = groupBy(fExps, labelFn, e=>e.amount);
  const labels  = [...new Set([...Object.keys(sGroups),...Object.keys(eGroups)])];
  const maxV    = Math.max(...labels.map(l=>Math.max(sGroups[l]||0,eGroups[l]||0)),1);

  const barArea = document.getElementById('stmtBarChartArea');
  if (barArea) {
    if (!labels.length) {
      barArea.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:160px;color:var(--text-muted);font-size:13px"><i class="fas fa-chart-bar" style="margin-right:8px;opacity:.4"></i>No data for this period</div>`;
    } else {
      const ySteps = [maxV, maxV*.75, maxV*.5, maxV*.25, 0].map(v => v>=1000?`৳${(v/1000).toFixed(0)}k`:`৳${v.toFixed(0)}`);
      barArea.innerHTML = `
        <div class="chart-area" style="height:170px">
          <div class="chart-y-labels">${ySteps.map(l=>`<span>${l}</span>`).join('')}</div>
          <div class="chart-bars-wrap">
            ${labels.map((lbl,i)=>{
              const sh=Math.round(((sGroups[lbl]||0)/maxV)*100);
              const eh=Math.round(((eGroups[lbl]||0)/maxV)*100);
              return `<div class="chart-bar-group" style="animation-delay:${i*0.07}s">
                <div class="bar-pair">
                  <div class="bar sales-bar"   style="--h:${sh}%;animation-delay:${i*0.07}s"></div>
                  <div class="bar expense-bar" style="--h:${eh}%;animation-delay:${i*0.07+0.03}s"></div>
                </div>
                <span>${lbl}</span>
              </div>`;
            }).join('')}
          </div>
        </div>`;
    }
  }

  // Payment pie
  const payData={};
  fTxns.forEach(t=>{ payData[t.method]=(payData[t.method]||0)+t.total; });
  drawPieChart('stmtPieCanvas', Object.entries(payData).map(([k,v])=>({label:k[0].toUpperCase()+k.slice(1),value:v})).filter(x=>x.value>0)||[{label:'No sales',value:1}], 'stmtPieLegend');

  // Expense pie
  const expData={};
  fExps.forEach(e=>{ expData[e.type]=(expData[e.type]||0)+e.amount; });
  drawPieChart('stmtExpPieCanvas', Object.entries(expData).map(([k,v])=>({label:k,value:v})).filter(x=>x.value>0)||[{label:'No expenses',value:1}], 'stmtExpPieLegend');

  // Sales txn list
  const txnList = document.getElementById('stmtTxnList');
  if (txnList) {
    _set('stmtTxnCount', `${fTxns.length} records`);
    _set('stmtTxnTotal', `৳${totalRev.toFixed(2)}`);
    txnList.innerHTML = fTxns.slice().reverse().map(t=>`
      <div class="txn-detail-item">
        <div class="txn-d-name">
          <div class="txn-d-dot ${t.method}"></div>
          <div><div>${t.customer||'Walk-in'}</div><div style="font-size:11px;color:var(--text-muted)">${t.invoiceNo||''}</div></div>
        </div>
        <div class="txn-d-time">${_fmtTm(t.time)}</div>
        <div><span class="status-badge instock" style="font-size:10px">${(t.method||'').toUpperCase()}</span></div>
        <div class="txn-d-amount">৳${t.total.toFixed(2)}</div>
      </div>`).join('') || `<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:13px">No transactions</div>`;
  }

  // Expense list
  const expList = document.getElementById('stmtExpList');
  if (expList) {
    _set('stmtExpCount', `${fExps.length} records`);
    _set('stmtExpTotal', `৳${totalExp.toFixed(2)}`);
    expList.innerHTML = fExps.slice().reverse().map(e=>{
      const col=EXP_TYPE_COLORS[e.type]||'#64748b';
      const ico=EXP_TYPE_ICONS[e.type] ||'fa-tag';
      return `<div class="txn-detail-item">
        <div class="txn-d-name">
          <i class="fas ${ico}" style="color:${col};width:16px;flex-shrink:0"></i>
          <div><div>${e.type}</div><div style="font-size:11px;color:var(--text-muted)">${e.description||'—'}</div></div>
        </div>
        <div class="txn-d-time">${_fmtTm(e.time)}</div>
        <div><span class="exp-type-chip" style="background:${col}18;color:${col};font-size:10px">${e.type}</span></div>
        <div class="txn-d-amount" style="color:var(--danger)">৳${e.amount.toFixed(2)}</div>
      </div>`;
    }).join('') || `<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:13px">No expenses</div>`;
  }

  // Dues list
  const duesList = document.getElementById('stmtDueList');
  if (duesList) {
    _set('stmtDueCount', `${active.length} active`);
    _set('stmtDueTotal', `৳${totalDues.toFixed(2)}`);
    duesList.innerHTML = active.slice(0,8).map(d=>{
      const st=_getDueStatus(d);
      const dl=_getDaysLeft(d);
      const dlabel = dl<0?`${Math.abs(dl)}d overdue`:`${dl}d left`;
      return `<div class="txn-detail-item">
        <div class="txn-d-name">
          <div class="txn-d-dot" style="background:${dl<0?'var(--danger)':'var(--warning)'}"></div>
          <div><div style="font-weight:500">${d.name}</div><div style="font-size:11px;color:var(--text-muted)">${d.type}</div></div>
        </div>
        <div><span class="days-badge ${st.cls}" style="font-size:10px">${dlabel}</span></div>
        <div><span class="status-badge ${st.cls}" style="font-size:10px">${st.label}</span></div>
        <div class="txn-d-amount" style="color:var(--warning)">৳${_fmt(d.amount)}</div>
      </div>`;
    }).join('') || `<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:13px">No active dues 🎉</div>`;
  }
}

// ══════════════════════════════════════════════════════════
//   DASHBOARD — Real-time
// ══════════════════════════════════════════════════════════

function drawPieChart(canvasId, data, legendId) {
  const canvas = document.getElementById(canvasId);
  const legend = document.getElementById(legendId);
  if (!canvas || !legend) return;
  const ctx = canvas.getContext('2d');
  const W=canvas.width, H=canvas.height, cx=W/2, cy=H/2, r=Math.min(W,H)/2-6;
  ctx.clearRect(0,0,W,H);
  const total = data.reduce((s,d)=>s+d.value,0);
  if (!total) return;
  const colors=['#6366f1','#22d3ee','#10b981','#f59e0b','#f43f5e','#8b5cf6','#06b6d4','#e879f9'];
  let startAngle=-Math.PI/2;
  data.forEach((d,i)=>{
    const slice=(d.value/total)*Math.PI*2;
    ctx.beginPath(); ctx.moveTo(cx,cy);
    ctx.arc(cx,cy,r,startAngle,startAngle+slice);
    ctx.closePath(); ctx.fillStyle=colors[i%colors.length]; ctx.fill();
    startAngle+=slice;
  });
  ctx.beginPath(); ctx.arc(cx,cy,r*0.52,0,Math.PI*2);
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg-card').trim() || '#fff';
  ctx.fill();
  legend.innerHTML = data.map((d,i)=>`
    <div class="pie-legend-item">
      <div class="pie-legend-dot" style="background:${colors[i%colors.length]}"></div>
      <span>${d.label}</span>
      <span class="pie-legend-val">${Math.round((d.value/total)*100)}%</span>
    </div>`).join('');
}

function renderDashboard() {
  const now   = new Date();
  const today = now.toDateString();
  const m     = now.getMonth(), y = now.getFullYear();

  const todayTxns  = allTransactions.filter(t => new Date(t.time).toDateString()===today);
  const todayExp   = expenses.filter(e => new Date(e.time).toDateString()===today);
  const activeDues = duesData.filter(d => !d.paid);
  const allMonthTxns = allTransactions.filter(t=>{ const d=new Date(t.time); return d.getMonth()===m&&d.getFullYear()===y; });

  const todaySales  = todayTxns.reduce((s,t)=>s+t.total,0);
  const todayExpAmt = todayExp.reduce((s,e)=>s+e.amount,0);
  const grossProfit = todayTxns.reduce((s,t)=>s+t.items.reduce((ps,item)=>{
    const p=products.find(x=>x.name===item.name);
    const pp=p?.purchasePrice||(p?.price||0)*0.75;
    return ps+((item.price||0)-pp)*item.qty;
  },0),0);
  const netProfit  = grossProfit - todayExpAmt;
  const totalDues  = activeDues.reduce((s,d)=>s+d.amount,0);
  const stockValue = products.reduce((s,p)=>s+(p.salesPrice||p.price)*p.stock,0);
  const monthSales = allMonthTxns.reduce((s,t)=>s+t.total,0);

  // KPI
  _set('todaySales',    `৳${_fmt(todaySales)}`);
  _set('todayRevenue',  `৳${_fmt(netProfit)}`);
  _set('totalOrders',   todayTxns.length);
  _set('kpiDuesAmt',    `৳${_fmt(totalDues)}`);
  _set('kpiExpenseAmt', `৳${todayExpAmt.toFixed(0)}`);
  _set('kpiStockVal',   `৳${(stockValue/1000).toFixed(1)}k`);

  // KPI subtitles
  _set('kpiSalesChange',    `${allTransactions.length} total orders`);
  _set('kpiRevenueChange',  todayExpAmt>0?`After ৳${_fmt(todayExpAmt)} exp`:'Gross profit today');
  _set('kpiOrderChange',    `৳${_fmt(monthSales)} this month`);
  _set('kpiDuesChange',     `${activeDues.length} customers pending`);
  _set('kpiExpenseChange',  `${expenses.length} total records`);
  _set('kpiStockChange',    `${products.filter(p=>p.stock<=5).length} items low stock`);

  // Date
  _set('dashDate', now.toLocaleDateString('en-BD',{year:'numeric',month:'long',day:'numeric'}));

  // Low stock count in navbar
  const ls = products.filter(p=>p.stock<=5).length;
  _set('lowStockCount', `${ls} Low Stock`);
  _set('lowStockItems', ls);

  // Recent transactions
  const txnEl = document.getElementById('recentTxnList');
  if (txnEl) {
    txnEl.innerHTML = allTransactions.slice(-6).reverse().map(t=>`
      <div class="txn-item">
        <div class="txn-dot ${t.method}"></div>
        <div class="txn-info">
          <div class="txn-name">${t.customer||'Walk-in'}</div>
          <div class="txn-time">${_fmtTm(t.time)}</div>
        </div>
        <div class="txn-amount">৳${t.total.toFixed(0)}</div>
      </div>`).join('') || `<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:13px">No transactions yet</div>`;
  }

  // Top products
  const pSales={};
  allTransactions.forEach(t=>t.items.forEach(item=>{ pSales[item.name]=(pSales[item.name]||0)+item.qty; }));
  const sorted=Object.entries(pSales).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const maxQ=sorted[0]?.[1]||1;
  const tpEl = document.getElementById('topProductsList');
  if (tpEl) {
    tpEl.innerHTML = sorted.length ? sorted.map(([name,qty],i)=>`
      <div class="top-product-item">
        <div class="tp-rank">${i+1}</div>
        <div class="tp-info"><div class="tp-name">${name}</div><div class="tp-qty">${qty} units</div></div>
        <div class="tp-bar-wrap"><div class="tp-bar"><div class="tp-bar-fill" style="width:${Math.round((qty/maxQ)*100)}%"></div></div></div>
      </div>`).join('') : `<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:13px">No sales yet</div>`;
  }

  // Stock alerts
  const alerts=products.filter(p=>p.stock<=10).sort((a,b)=>a.stock-b.stock);
  const saEl=document.getElementById('stockAlertList');
  if (saEl) {
    saEl.innerHTML=alerts.length?alerts.map(p=>`
      <div class="stock-alert-item">
        <div class="sa-icon ${p.stock<=3?'danger':'warning'}"><i class="fas fa-exclamation-triangle"></i></div>
        <div class="sa-info"><div class="sa-name">${p.name}</div><div class="sa-stock">${p.stock} ${p.unit} remaining</div></div>
        <span class="sa-badge ${p.stock<=3?'critical':'low'}">${p.stock<=3?'Critical':'Low'}</span>
      </div>`).join('') : `<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:13px">No alerts 🎉</div>`;
    document.getElementById('lowStockItems') && (document.getElementById('lowStockItems').textContent=alerts.length);
  }

  // Pie charts
  const payMap={};
  allTransactions.forEach(t=>{ payMap[t.method]=(payMap[t.method]||0)+t.total; });
  const piePay=Object.entries(payMap).filter(([,v])=>v>0).map(([k,v])=>({label:k[0].toUpperCase()+k.slice(1),value:v}));
  drawPieChart('pieCanvas', piePay.length?piePay:[{label:'No data',value:1}], 'pieLegend');

  const catMap={};
  allTransactions.forEach(t=>t.items.forEach(item=>{
    const p=products.find(x=>x.name===item.name);
    const cat=p?.category||'Other';
    catMap[cat]=(catMap[cat]||0)+item.qty;
  }));
  const pieCat=Object.entries(catMap).filter(([,v])=>v>0).map(([k,v])=>({label:k,value:v}));
  drawPieChart('catCanvas', pieCat.length?pieCat:[{label:'No data',value:1}], 'catLegend');

  // Quick stats
  const overdueCnt=activeDues.filter(d=>_getDaysLeft(d)<0).length;
  const itemsSold=todayTxns.reduce((s,t)=>s+t.items.reduce((p,i)=>p+i.qty,0),0);
  const avgOrder=todayTxns.length?(todaySales/todayTxns.length):0;
  const qsEl=document.getElementById('quickStatsList');
  if (qsEl) {
    qsEl.innerHTML=[
      {icon:'fa-shopping-basket', label:'Avg Order (Today)',  val:`৳${avgOrder.toFixed(0)}`},
      {icon:'fa-money-bill',      label:'Cash Txns Today',    val:todayTxns.filter(t=>t.method==='cash').length},
      {icon:'fa-exclamation',     label:'Overdue Dues',       val:overdueCnt},
      {icon:'fa-box',             label:'Items Sold Today',   val:itemsSold},
      {icon:'fa-chart-line',      label:'Monthly Revenue',    val:`৳${_fmt(monthSales)}`},
      {icon:'fa-coins',           label:'Total Expenses',     val:`৳${_fmt(expenses.reduce((s,e)=>s+e.amount,0))}`},
    ].map(qs=>`<div class="qs-item"><div class="qs-label"><i class="fas ${qs.icon}"></i>${qs.label}</div><div class="qs-value">${qs.val}</div></div>`).join('');
  }
}

// ── Overrides & hooks ──────────────────────────────────── */

// Statement filter
function filterStatement() { renderStatement(); }
function downloadStatement() { showToast('Generating PDF...', 'info'); setTimeout(()=>showToast('PDF ready!','success'),1500); }

// switchTab hook — render target tab when opened
const __baseSwitchTab = typeof switchTab === 'function' ? switchTab : null;
switchTab = function(tabName, el) {
  document.querySelectorAll('.nav-tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.tab-pane').forEach(p=>p.classList.remove('active'));
  const targetEl = el || document.getElementById(`tab-${tabName}`);
  if (targetEl) targetEl.classList.add('active');
  const pane = document.getElementById(tabName+'Tab');
  if (pane) pane.classList.add('active');
  if (tabName==='dashboard') renderDashboard();
  if (tabName==='statement') renderStatement();
  if (tabName==='expenses')  renderExpenses();
  if (tabName==='dues')      renderDuesTab();
};

// Sync button
function syncData() {
  const btn=document.querySelector('.sync-btn');
  if (btn) { btn.classList.add('syncing'); btn.querySelector('span').textContent='Syncing...'; }
  setTimeout(()=>{
    if (btn) { btn.classList.remove('syncing'); btn.querySelector('span').textContent='Sync'; }
    showToast('Data synced ✓', 'success');
  }, 1800);
}

// Inventory: add purchasePrice/salesPrice support
renderInventory = function(list) {
  list = list || products;
  const tbody = document.getElementById('inventoryTableBody');
  if (!tbody) return;
  let totalValue=0;
  tbody.innerHTML = list.map(p=>{
    const val=(p.salesPrice||p.price)*p.pieces;
    totalValue+=val;
    const status=p.pieces>10?'instock':'lowstock';
    let sc='high';
    if(p.pieces<=3)sc='critical'; else if(p.pieces<=5)sc='low'; else if(p.pieces<=15)sc='medium';
    return `<tr>
      <td><strong>${p.name}</strong></td>
      <td>${p.category}</td>
      <td><div class="price-two-col"><div class="purchase-price">Buy: <span>৳${p.purchasePrice||Math.round((p.price||0)*0.75)}</span></div></div></td>
      <td><div class="sales-price">৳${p.salesPrice||p.price}</div></td>
      <td><span class="stock-highlight ${sc}">${p.pieces} ${p.unit}</span></td>
      <td>৳${val.toFixed(2)}</td>
      <td><span class="status-badge ${status}">${p.pieces>10?'In Stock':'Low Stock'}</span></td>
      <td class="action-icons">
        <i class="fas fa-edit" onclick="editProduct(${p.id})"></i>
        <i class="fas fa-trash-alt" onclick="deleteProduct(${p.id})"></i>
      </td>
    </tr>`;
  }).join('');
  _set('totalStockValue', `৳${totalValue.toFixed(2)}`);
  _set('totalProducts', list.length);
  _set('lowStockItems2', list.filter(p=>p.pieces<=10).length);
};

// Barcode stubs
function triggerBarcodeScan() { showToast('Barcode Scanner: Connect USB/camera scanner', 'info'); }
function triggerInventoryBarcode() { showToast('Inventory Barcode Scanner: Connect USB/camera scanner', 'info'); }

// Add Product
function showAddProductModal() {
  document.getElementById('addProductModal').classList.add('show');
  ['newProductPurchasePrice','newProductSalesPrice'].forEach(id=>{
    document.getElementById(id)?.addEventListener('input', updateProfitPreview);
  });
}
function closeAddProductModal() {
  document.getElementById('addProductModal').classList.remove('show');
  ['newProductName','newProductPurchasePrice','newProductSalesPrice','newProductStock'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.value='';
  });
  const sel=document.getElementById('newProductCategory'); if(sel) sel.value='';
  const pp=document.getElementById('profitPreview'); if(pp) pp.style.display='none';
}
function updateProfitPreview() {
  const pp=parseFloat(document.getElementById('newProductPurchasePrice')?.value)||0;
  const sp=parseFloat(document.getElementById('newProductSalesPrice')?.value)||0;
  const prev=document.getElementById('profitPreview');
  if(pp>0&&sp>0&&prev){
    _set('profitPerUnit',`৳${(sp-pp).toFixed(2)}`);
    _set('profitMargin', `${((sp-pp)/sp*100).toFixed(1)}%`);
    prev.style.display='flex';
  } else if(prev) prev.style.display='none';
}
function saveNewProduct() {
  const name=document.getElementById('newProductName')?.value.trim();
  const category=document.getElementById('newProductCategory')?.value;
  const pp=parseFloat(document.getElementById('newProductPurchasePrice')?.value);
  const sp=parseFloat(document.getElementById('newProductSalesPrice')?.value);
  const stock=parseInt(document.getElementById('newProductStock')?.value)||0;
  const unit=document.getElementById('newProductUnit')?.value||'pcs';
  if(!name){showToast('Product name required','error');return;}
  if(!category){showToast('Category required','error');return;}
  if(isNaN(pp)||pp<0){showToast('Valid purchase price required','error');return;}
  if(isNaN(sp)||sp<0){showToast('Valid sales price required','error');return;}
  const newId=Math.max(...products.map(p=>p.id))+1;
  products.push({id:newId,name,category,price:sp,salesPrice:sp,purchasePrice:pp,unit,stock,pieces:stock});
  renderInventory(); renderProducts(); updateLowStockCount();
  closeAddProductModal();
  showToast(`"${name}" added!`, 'success');
}

// Cart override with VAT input support
const __origRenderCart = typeof renderCart==='function'?renderCart:null;
renderCart = function() {
  const container=document.getElementById('cartItems');
  const countBadge=document.getElementById('cartCount');
  if(!container) return;
  if(!cart.length){
    container.innerHTML=`<div class="empty-cart"><i class="fas fa-shopping-cart"></i><p>Cart is empty</p><span>Select products to add</span></div>`;
    _set('cartSubtotal','৳0'); _set('cartVat','৳0'); _set('cartTotal','৳0');
    if(countBadge) countBadge.textContent='0 items';
    return;
  }
  let subtotal=0;
  container.innerHTML=cart.map((item,i)=>{
    const it=item.price*item.quantity; subtotal+=it;
    return `<div class="cart-item">
      <div class="cart-item-info">
        <h4>${item.name}</h4>
        <p>৳${item.price}/${item.unit} × ${item.displayQuantity}</p>
      </div>
      <div class="cart-item-actions">
        <span><strong>৳${it.toFixed(2)}</strong></span>
        <div class="qty-control">
          <button class="qty-btn" onclick="updateCartItem(${i},-1)">−</button>
          <span>${item.quantity%1===0?item.quantity:item.quantity.toFixed(2)}</span>
          <button class="qty-btn" onclick="updateCartItem(${i},1)">+</button>
        </div>
      </div>
    </div>`;
  }).join('');
  const vatPct=parseFloat(document.getElementById('vatInput')?.value)||0;
  const discount=parseFloat(document.getElementById('discountInput')?.value)||0;
  const vat=subtotal*(vatPct/100);
  const total=Math.max(0,subtotal+vat-discount);
  _set('cartSubtotal',`৳${subtotal.toFixed(2)}`);
  _set('cartVat',`৳${vat.toFixed(2)}`);
  _set('cartTotal',`৳${total.toFixed(2)}`);
  if(countBadge) countBadge.textContent=`${cart.length} item${cart.length!==1?'s':''}`;
};

computeTotal = function() {
  const sub=cart.reduce((s,i)=>s+i.price*i.quantity,0);
  const vat=sub*(parseFloat(document.getElementById('vatInput')?.value)||0)/100;
  const dis=parseFloat(document.getElementById('discountInput')?.value)||0;
  return Math.max(0,sub+vat-dis);
};

// Checkout override with due validation
processCheckout = function() {
  if(!cart.length){showToast('Cart is empty!','error');return;}
  if(selectedPayment==='due'){
    const n=document.getElementById('dueCustomerName')?.value.trim();
    const p=document.getElementById('dueCustomerPhone')?.value.trim();
    if(!n){showToast('Customer name required for Due purchase!','error');document.getElementById('dueCustomerName')?.focus();return;}
    if(!p){showToast('Phone number required for Due purchase!','error');document.getElementById('dueCustomerPhone')?.focus();return;}
  }
  if(selectedPayment==='bkash'||selectedPayment==='nagad') showQRModal();
  else completeTransaction();
};

completeTransaction = function() {
  let customerName, customerPhone;
  if(selectedPayment==='due'){
    customerName=document.getElementById('dueCustomerName')?.value.trim()||'Due Customer';
    customerPhone=document.getElementById('dueCustomerPhone')?.value.trim()||'';
  } else {
    customerName=document.getElementById('customerName')?.value.trim()||'Walk-in';
    customerPhone=document.getElementById('customerPhone')?.value.trim()||'';
  }
  const vatPct=parseFloat(document.getElementById('vatInput')?.value)||0;
  const discount=parseFloat(document.getElementById('discountInput')?.value)||0;
  let subtotal=cart.reduce((s,i)=>s+i.price*i.quantity,0);
  const vat=subtotal*(vatPct/100);
  const total=Math.max(0,subtotal+vat-discount);
  const invoiceNo=`INV-2025-${String(invoiceCounter).padStart(3,'0')}`;
  const dueDays=parseInt(document.getElementById('duePeriodDays')?.value)||0;
  const txn={id:invoiceCounter,invoiceNo,customer:customerName,phone:customerPhone,method:selectedPayment,
    items:cart.map(i=>({name:i.name,price:i.price,qty:i.quantity,unit:i.unit})),
    subtotal,vat,vatPct,discount,total,time:new Date(),dueDays};
  allTransactions.push(txn);

  // Auto-add to dues if payment is 'due'
  if(selectedPayment==='due'&&customerName&&total>0){
    duesData.unshift({id:dueIdCounter++,name:customerName,phone:customerPhone,type:'Product Purchase',
      amount:total,period:dueDays||30,addedDate:new Date(),paid:false,paidDate:null,note:invoiceNo});
    renderDuesTab();
  }

  cart.forEach(ci=>{
    const p=products.find(x=>x.id===ci.id);
    if(p){p.stock=Math.max(0,p.stock-ci.quantity);p.pieces=p.stock;}
  });
  invoiceCounter++;
  updateInvoiceNumber();
  showReceipt(txn);
  cart=[];
  renderCart();
  const disc=document.getElementById('discountInput'); if(disc) disc.value='';
  const cn=document.getElementById('customerName'); if(cn) cn.value='';
  const cp=document.getElementById('customerPhone'); if(cp) cp.value='';
  const dcn=document.getElementById('dueCustomerName'); if(dcn) dcn.value='';
  const dcp=document.getElementById('dueCustomerPhone'); if(dcp) dcp.value='';
  renderInventory(); updateLowStockCount(); renderDashboard();
};

// ── Initialization ─────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  products.forEach(p=>{
    if(!p.purchasePrice) p.purchasePrice=Math.round((p.price||0)*0.75);
    if(!p.salesPrice)    p.salesPrice=p.price;
  });
  renderDuesTab();
  renderExpenses();
  renderDashboard();
  renderStatement();
  updateInvoiceNumber();
});

// ============================================================
//   STATEMENT MONTH SELECTOR — Dynamic month options
// ============================================================

function buildMonthSelector() {
  const sel = document.getElementById('statementMonth');
  if (!sel) return;

  const now = new Date();
  const months = [];

  // Generate last 12 months
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-BD', { month: 'long', year: 'numeric' });
    months.push({ val, label, isCurrentMonth: i === 0 });
  }

  sel.innerHTML = months.map(m =>
    `<option value="${m.val}"${m.isCurrentMonth ? ' selected' : ''}>${m.label}</option>`
  ).join('');
}

// Override renderStatement to handle YYYY-MM format
const __addonRenderStatement = renderStatement;
renderStatement = function() {
  const filter = document.getElementById('statementMonth')?.value || '';
  const now = new Date();

  // If value is YYYY-MM format, filter by that month/year
  const isMonthFilter = /^\d{4}-\d{2}$/.test(filter);

  if (isMonthFilter) {
    const [yr, mo] = filter.split('-').map(Number);

    // Temporarily patch inRange by overriding allTransactions filter inline
    _renderStatementForMonth(yr, mo - 1); // month is 0-indexed
  } else {
    __addonRenderStatement();
  }
};

function _renderStatementForMonth(year, month) {
  function inRange(date) {
    const d = new Date(date);
    return d.getMonth() === month && d.getFullYear() === year;
  }

  const fTxns  = allTransactions.filter(t => inRange(t.time));
  const fExps  = expenses.filter(e => inRange(e.time));
  const active = duesData.filter(d => !d.paid);
  const fPaidDues = duesData.filter(d => d.paid && d.paidDate && inRange(d.paidDate));

  const totalRev  = fTxns.reduce((s, t) => s + t.total, 0);
  const totalExp  = fExps.reduce((s, e) => s + e.amount, 0);
  const totalDues = active.reduce((s, d) => s + d.amount, 0);
  const grossProfit = fTxns.reduce((s, t) =>
    s + t.items.reduce((ps, item) => {
      const p  = products.find(x => x.name === item.name);
      const pp = p?.purchasePrice || (p?.price || 0) * 0.75;
      return ps + ((item.price || 0) - pp) * item.qty;
    }, 0), 0);
  const netProfit = grossProfit - totalExp;
  const margin = totalRev > 0 ? (netProfit / totalRev * 100) : 0;

  _set('stmtRevenue',    `৳${_fmt(totalRev)}`);
  _set('stmtRevenueNote',`${fTxns.length} transactions`);
  _set('stmtExpenses',   `৳${_fmt(totalExp)}`);
  _set('stmtExpNote',    `${fExps.length} records`);
  _set('stmtDues',       `৳${_fmt(totalDues)}`);
  _set('stmtDueNote',    `${active.length} active`);
  _set('stmtNetProfit',  `৳${_fmt(netProfit)}`);
  _set('stmtMarginNote', netProfit >= 0 ? 'After all deductions' : 'Net loss');
  _set('stmtMargin',     `${margin.toFixed(1)}%`);
  _set('stmtMarginSub',  'vs revenue');

  // Bar chart by week-of-month
  const sGroups = {}, eGroups = {};
  fTxns.forEach(t => { const k = `Wk${Math.ceil(new Date(t.time).getDate()/7)}`; sGroups[k] = (sGroups[k]||0) + t.total; });
  fExps.forEach(e => { const k = `Wk${Math.ceil(new Date(e.time).getDate()/7)}`; eGroups[k] = (eGroups[k]||0) + e.amount; });
  const labels = [...new Set([...Object.keys(sGroups), ...Object.keys(eGroups)])].sort();
  const maxV   = Math.max(...labels.map(l => Math.max(sGroups[l]||0, eGroups[l]||0)), 1);

  const barArea = document.getElementById('stmtBarChartArea');
  if (barArea) {
    if (!labels.length) {
      barArea.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:160px;color:var(--text-muted);font-size:13px"><i class="fas fa-chart-bar" style="margin-right:8px;opacity:.4"></i>No data for this period</div>`;
    } else {
      const ySteps = [maxV, maxV*.75, maxV*.5, maxV*.25, 0].map(v => v>=1000?`৳${(v/1000).toFixed(0)}k`:`৳${v.toFixed(0)}`);
      barArea.innerHTML = `<div class="chart-area" style="height:170px">
        <div class="chart-y-labels">${ySteps.map(l=>`<span>${l}</span>`).join('')}</div>
        <div class="chart-bars-wrap">
          ${labels.map((lbl,i) => {
            const sh=Math.round(((sGroups[lbl]||0)/maxV)*100);
            const eh=Math.round(((eGroups[lbl]||0)/maxV)*100);
            return `<div class="chart-bar-group" style="animation-delay:${i*0.07}s">
              <div class="bar-pair">
                <div class="bar sales-bar" style="--h:${sh}%;animation-delay:${i*0.07}s"></div>
                <div class="bar expense-bar" style="--h:${eh}%;animation-delay:${i*0.07+0.03}s"></div>
              </div><span>${lbl}</span></div>`;
          }).join('')}
        </div></div>`;
    }
  }

  // Pie charts
  const payData={};
  fTxns.forEach(t => { payData[t.method] = (payData[t.method]||0) + t.total; });
  drawPieChart('stmtPieCanvas', Object.entries(payData).filter(([,v])=>v>0).map(([k,v])=>({label:k[0].toUpperCase()+k.slice(1),value:v}))||[{label:'No data',value:1}], 'stmtPieLegend');
  const expData={};
  fExps.forEach(e => { expData[e.type] = (expData[e.type]||0) + e.amount; });
  drawPieChart('stmtExpPieCanvas', Object.entries(expData).filter(([,v])=>v>0).map(([k,v])=>({label:k,value:v}))||[{label:'No data',value:1}], 'stmtExpPieLegend');

  // Tables
  const txnList = document.getElementById('stmtTxnList');
  if (txnList) {
    _set('stmtTxnCount', `${fTxns.length} records`);
    _set('stmtTxnTotal', `৳${totalRev.toFixed(2)}`);
    txnList.innerHTML = fTxns.slice().reverse().map(t=>`
      <div class="txn-detail-item">
        <div class="txn-d-name"><div class="txn-d-dot ${t.method}"></div><div><div>${t.customer||'Walk-in'}</div><div style="font-size:11px;color:var(--text-muted)">${t.invoiceNo||''}</div></div></div>
        <div class="txn-d-time">${_fmtTm(t.time)}</div>
        <div><span class="status-badge instock" style="font-size:10px">${(t.method||'').toUpperCase()}</span></div>
        <div class="txn-d-amount">৳${t.total.toFixed(2)}</div>
      </div>`).join('') || `<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:13px">No transactions this month</div>`;
  }

  const expList = document.getElementById('stmtExpList');
  if (expList) {
    _set('stmtExpCount', `${fExps.length} records`);
    _set('stmtExpTotal', `৳${totalExp.toFixed(2)}`);
    expList.innerHTML = fExps.slice().reverse().map(e=>{
      const col=EXP_TYPE_COLORS[e.type]||'#64748b', ico=EXP_TYPE_ICONS[e.type]||'fa-tag';
      return `<div class="txn-detail-item">
        <div class="txn-d-name"><i class="fas ${ico}" style="color:${col};width:16px;flex-shrink:0"></i><div><div>${e.type}</div><div style="font-size:11px;color:var(--text-muted)">${e.description||'—'}</div></div></div>
        <div class="txn-d-time">${_fmtTm(e.time)}</div>
        <div><span class="exp-type-chip" style="background:${col}18;color:${col};font-size:10px">${e.type}</span></div>
        <div class="txn-d-amount" style="color:var(--danger)">৳${e.amount.toFixed(2)}</div>
      </div>`;
    }).join('') || `<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:13px">No expenses this month</div>`;
  }

  const duesList = document.getElementById('stmtDueList');
  if (duesList) {
    _set('stmtDueCount', `${active.length} active`);
    _set('stmtDueTotal', `৳${totalDues.toFixed(2)}`);
    duesList.innerHTML = active.slice(0, 8).map(d => {
      const st = _getDueStatus(d), dl = _getDaysLeft(d);
      return `<div class="txn-detail-item">
        <div class="txn-d-name"><div class="txn-d-dot" style="background:${dl<0?'var(--danger)':'var(--warning)'}"></div><div><div style="font-weight:500">${d.name}</div><div style="font-size:11px;color:var(--text-muted)">${d.type}</div></div></div>
        <div><span class="days-badge ${st.cls}" style="font-size:10px">${dl<0?`${Math.abs(dl)}d overdue`:`${dl}d left`}</span></div>
        <div><span class="status-badge ${st.cls}" style="font-size:10px">${st.label}</span></div>
        <div class="txn-d-amount" style="color:var(--warning)">৳${_fmt(d.amount)}</div>
      </div>`;
    }).join('') || `<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:13px">No active dues</div>`;
  }
}

// ── Demo data for previous months ──────────────────────── //

function seedDemoData() {
  const now = new Date();

  // Add transactions for the last 3 months
  const demoMonths = [1, 2, 3]; // months ago
  const customerNames = ['Abdul Rahman','Fatema Akter','Karim Mia','Sohana Begum','Jahangir Ali','Mitu Rani','Sabbir Hossain','Nasima Khatun'];
  const methods = ['cash','bkash','nagad','cash','cash','bkash'];
  let demoInv = 200;

  demoMonths.forEach(mAgo => {
    const baseDate = new Date(now.getFullYear(), now.getMonth() - mAgo, 1);
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() - mAgo + 1, 0).getDate();
    const txnCount = 18 + Math.floor(Math.random() * 15); // 18-32 transactions

    for (let i = 0; i < txnCount; i++) {
      const day   = 1 + Math.floor(Math.random() * (daysInMonth - 1));
      const hour  = 9 + Math.floor(Math.random() * 10);
      const tDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), day, hour, Math.floor(Math.random()*60));
      const items = [];
      const numItems = 1 + Math.floor(Math.random() * 3);
      for (let j = 0; j < numItems; j++) {
        const p = products[Math.floor(Math.random() * products.length)];
        const qty = 1 + Math.floor(Math.random() * 4);
        items.push({ name: p.name, price: p.salesPrice || p.price, qty, unit: p.unit });
      }
      const subtotal = items.reduce((s, it) => s + it.price * it.qty, 0);
      const vat = subtotal * 0.05;
      const total = subtotal + vat;
      const method = methods[Math.floor(Math.random() * methods.length)];
      const customer = customerNames[Math.floor(Math.random() * customerNames.length)];
      allTransactions.push({
        id: demoInv, invoiceNo: `INV-${baseDate.getFullYear()}-${String(demoInv).padStart(3,'0')}`,
        customer, phone: '', method, items, subtotal, vat, vatPct: 5, discount: 0, total,
        time: tDate, dueDays: 0
      });
      demoInv++;
    }

    // Add demo expenses for that month
    const expTypes = ['Meals','Tea','Maintenance','Transport','Utilities','Snacks','Chanda'];
    const expCount = 8 + Math.floor(Math.random() * 6);
    for (let i = 0; i < expCount; i++) {
      const day  = 1 + Math.floor(Math.random() * (daysInMonth - 1));
      const eDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), day, 10 + Math.floor(Math.random()*8));
      const type = expTypes[Math.floor(Math.random() * expTypes.length)];
      const amts = { Meals:350+Math.random()*300, Tea:60+Math.random()*80, Maintenance:500+Math.random()*1500,
        Transport:150+Math.random()*250, Utilities:800+Math.random()*400, Snacks:100+Math.random()*150, Chanda:200+Math.random()*300 };
      expenses.push({ id: expIdCounter++, type, amount: Math.round(amts[type]), description: '', time: eDate });
    }
  });
}

// ── Print Preview ──────────────────────────────────────── //

function openPrintPreview() {
  const body = document.getElementById('printPreviewBody');
  if (!body) return;

  const filter = document.getElementById('statementMonth')?.value || '';
  const isMonthFilter = /^\d{4}-\d{2}$/.test(filter);
  let year, month, monthName, periodLabel;

  if (isMonthFilter) {
    const [yr, mo] = filter.split('-').map(Number);
    year = yr; month = mo - 1;
    const d = new Date(yr, mo - 1, 1);
    monthName  = d.toLocaleDateString('en-BD', { month: 'long' });
    periodLabel = d.toLocaleDateString('en-BD', { month: 'long', year: 'numeric' });
  } else {
    const now = new Date();
    year = now.getFullYear(); month = now.getMonth();
    monthName  = now.toLocaleDateString('en-BD', { month: 'long' });
    periodLabel = now.toLocaleDateString('en-BD', { month: 'long', year: 'numeric' });
  }

  function inRange(date) {
    const d = new Date(date);
    return d.getMonth() === month && d.getFullYear() === year;
  }

  const fTxns = allTransactions.filter(t => inRange(t.time));
  const fExps = expenses.filter(e => inRange(e.time));
  const active = duesData.filter(d => !d.paid);
  const fPaidDues = duesData.filter(d => d.paid && d.paidDate && inRange(d.paidDate));

  const totalRev   = fTxns.reduce((s,t)=>s+t.total,0);
  const totalExp   = fExps.reduce((s,e)=>s+e.amount,0);
  const totalDues  = active.reduce((s,d)=>s+d.amount,0);
  const grossP     = fTxns.reduce((s,t)=>s+t.items.reduce((ps,item)=>{
    const p=products.find(x=>x.name===item.name);
    return ps+((item.price||0)-(p?.purchasePrice||(p?.price||0)*0.75))*item.qty;
  },0),0);
  const netP   = grossP - totalExp;
  const margin = totalRev>0?(netP/totalRev*100):0;
  const printedAt = new Date().toLocaleDateString('en-BD',{year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'});

  body.innerHTML = `
    <div class="print-page" id="printPageContent">
      <!-- Store Header -->
      <div class="print-store-header">
        <div class="print-store-brand">
          <div class="print-store-icon"><i class="fas fa-store-alt"></i></div>
          <div class="print-store-info">
            <h2>SmartRetail Store</h2>
            <p>123 Bashundhara, Dhaka, Bangladesh</p>
            <p>Tel: 01700-000000 | smartretail.bd</p>
          </div>
        </div>
        <div class="print-meta">
          <strong>Financial Statement</strong>
          <span>${periodLabel}</span><br>
          <span style="font-size:11px;color:#aaa">Printed: ${printedAt}</span>
        </div>
      </div>

      <!-- KPI Row -->
      <div class="print-kpi-row">
        <div class="print-kpi blue"><span>Total Revenue</span><strong>৳${_fmt(totalRev)}</strong></div>
        <div class="print-kpi orange"><span>Total Expenses</span><strong>৳${_fmt(totalExp)}</strong></div>
        <div class="print-kpi red"><span>Pending Dues</span><strong>৳${_fmt(totalDues)}</strong></div>
        <div class="print-kpi green"><span>Net Profit</span><strong>৳${_fmt(netP)}</strong></div>
        <div class="print-kpi purple"><span>Profit Margin</span><strong>${margin.toFixed(1)}%</strong></div>
      </div>

      <!-- Sales Transactions -->
      <div class="print-section-title"><i class="fas fa-shopping-cart"></i> Sales Transactions (${fTxns.length})</div>
      ${fTxns.length ? `
      <table class="print-table">
        <thead><tr><th>#</th><th>Invoice</th><th>Customer</th><th>Items</th><th>Method</th><th>Date</th><th style="text-align:right">Amount</th></tr></thead>
        <tbody>
          ${fTxns.slice().reverse().map((t,i)=>`
            <tr>
              <td style="color:#aaa;font-size:11px">${i+1}</td>
              <td style="font-size:11px;color:#6366f1;font-weight:700">${t.invoiceNo}</td>
              <td style="font-weight:600">${t.customer||'Walk-in'}</td>
              <td style="font-size:11px;color:#555">${t.items.map(it=>`${it.name}×${it.qty}`).join(', ')}</td>
              <td><span class="print-badge ${t.method}">${t.method.toUpperCase()}</span></td>
              <td style="font-size:11px;color:#555">${_fmtDt(t.time,{month:'short',day:'numeric'})}</td>
              <td style="text-align:right;font-weight:700">৳${t.total.toFixed(2)}</td>
            </tr>`).join('')}
        </tbody>
      </table>
      <div class="print-footer-row"><span>Total Sales Revenue</span><span>৳${totalRev.toFixed(2)}</span></div>
      ` : `<p style="color:#aaa;font-size:12px;padding:12px 0">No transactions this month.</p>`}

      <!-- Expenses -->
      <div class="print-section-title" style="margin-top:28px"><i class="fas fa-receipt"></i> Expense Records (${fExps.length})</div>
      ${fExps.length ? `
      <table class="print-table">
        <thead><tr><th>#</th><th>Type</th><th>Description</th><th>Date</th><th style="text-align:right">Amount</th></tr></thead>
        <tbody>
          ${fExps.slice().reverse().map((e,i)=>`
            <tr>
              <td style="color:#aaa;font-size:11px">${i+1}</td>
              <td><span class="print-badge" style="background:#fff3cd;color:#856404">${e.type}</span></td>
              <td style="font-size:11px;color:#555">${e.description||'—'}</td>
              <td style="font-size:11px;color:#555">${_fmtDt(e.time,{month:'short',day:'numeric'})}</td>
              <td style="text-align:right;font-weight:700;color:#dc2626">৳${e.amount.toFixed(2)}</td>
            </tr>`).join('')}
        </tbody>
      </table>
      <div class="print-footer-row"><span>Total Expenses</span><span style="color:#dc2626">৳${totalExp.toFixed(2)}</span></div>
      ` : `<p style="color:#aaa;font-size:12px;padding:12px 0">No expenses this month.</p>`}

      <!-- Active Dues -->
      <div class="print-section-title" style="margin-top:28px"><i class="fas fa-wallet"></i> Active Due Accounts (${active.length})</div>
      ${active.length ? `
      <table class="print-table">
        <thead><tr><th>Customer</th><th>Phone</th><th>Type</th><th>Due Date</th><th>Status</th><th style="text-align:right">Amount</th></tr></thead>
        <tbody>
          ${active.map(d=>{
            const st=_getDueStatus(d);
            return `<tr>
              <td style="font-weight:600">${d.name}</td>
              <td style="font-size:11px;color:#555">${d.phone}</td>
              <td style="font-size:11px">${d.type}</td>
              <td style="font-size:11px;color:#555">${_fmtDt(_getDueDate(d))}</td>
              <td><span class="print-badge ${st.cls==='critical'?'overdue':'due'}">${st.label}</span></td>
              <td style="text-align:right;font-weight:700;color:#d97706">৳${_fmt(d.amount)}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
      <div class="print-footer-row"><span>Total Pending Dues</span><span style="color:#d97706">৳${totalDues.toFixed(2)}</span></div>
      ` : `<p style="color:#aaa;font-size:12px;padding:12px 0">No active dues 🎉</p>`}

      <!-- Summary Box -->
      <div style="background:#f8faff;border-radius:10px;padding:18px 20px;margin-top:28px;border:1px solid #e0e7ff">
        <div style="font-family:'Outfit',sans-serif;font-size:13px;font-weight:800;color:#6366f1;margin-bottom:12px;text-transform:uppercase;letter-spacing:1px">Financial Summary — ${periodLabel}</div>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:5px 0;color:#555">Total Revenue</td><td style="text-align:right;font-weight:700">৳${totalRev.toFixed(2)}</td></tr>
          <tr><td style="padding:5px 0;color:#555">Total Expenses</td><td style="text-align:right;font-weight:700;color:#dc2626">− ৳${totalExp.toFixed(2)}</td></tr>
          <tr><td style="padding:5px 0;color:#555">Gross Profit</td><td style="text-align:right;font-weight:700">৳${grossP.toFixed(2)}</td></tr>
          <tr style="border-top:2px solid #e0e7ff"><td style="padding:8px 0;font-weight:800;font-size:15px;color:#111">Net Profit</td><td style="text-align:right;font-weight:900;font-size:16px;font-family:'Outfit',sans-serif;color:${netP>=0?'#10b981':'#dc2626'}">৳${netP.toFixed(2)}</td></tr>
          <tr><td style="padding:3px 0;color:#888;font-size:11px">Profit Margin</td><td style="text-align:right;font-size:11px;color:#888">${margin.toFixed(1)}% of revenue</td></tr>
        </table>
      </div>

      <!-- Signature -->
      <div class="print-signature-row">
        <div class="print-sig"><div class="sig-line"></div><p>Prepared By</p></div>
        <div class="print-sig"><div class="sig-line"></div><p>Accounts</p></div>
        <div class="print-sig"><div class="sig-line"></div><p>Authorized Signature</p></div>
      </div>

      <div class="print-watermark">Generated by SmartRetail POS v2.0 • ${printedAt}</div>
    </div>`;

  document.getElementById('printPreviewModal').classList.add('show');
}

function closePrintPreview() {
  document.getElementById('printPreviewModal').classList.remove('show');
}

function executePrint() {
  window.print();
}

// ── Init: build selector + seed demo data ─────────────── //
document.addEventListener('DOMContentLoaded', () => {
  buildMonthSelector();
  seedDemoData();
  // Re-render statement after demo data seeded
  setTimeout(() => {
    renderStatement();
    renderDashboard();
  }, 50);
});

// ============================================================
//   STATEMENT — MONTH FILTER + DEMO DATA + PRINT PREVIEW
// ============================================================

/* ── Demo historical transactions ──────────────────────── */
(function seedDemoData() {
  function makeDate(y, m, d, h) {
    return new Date(y, m - 1, d, h || 10);
  }

  const demos = [
    // March 2025
    { customer:'Kamal Hossain', method:'cash',  time:makeDate(2025,3,5,9),  items:[{name:'Miniket Rice',price:75,qty:10,unit:'kg'},{name:'Soybean Oil',price:180,qty:3,unit:'L'}] },
    { customer:'Sumaiya Akter', method:'bkash', time:makeDate(2025,3,8,11), items:[{name:'Milk Powder',price:450,qty:2,unit:'pcs'},{name:'Ceylon Tea',price:380,qty:1,unit:'kg'}] },
    { customer:'Walk-in',       method:'cash',  time:makeDate(2025,3,12,14),items:[{name:'Red Lentils',price:130,qty:5,unit:'kg'},{name:'Iodized Salt',price:40,qty:3,unit:'kg'}] },
    { customer:'Farhan Kabir',  method:'nagad', time:makeDate(2025,3,18,10),items:[{name:'Atta Flour',price:45,qty:20,unit:'kg'},{name:'Premium Sugar',price:120,qty:5,unit:'kg'}] },
    { customer:'Walk-in',       method:'cash',  time:makeDate(2025,3,22,15),items:[{name:'Chickpeas',price:110,qty:8,unit:'kg'},{name:'Chinigura Rice',price:95,qty:10,unit:'kg'}] },
    { customer:'Rokeya Begum',  method:'due',   time:makeDate(2025,3,28,9), items:[{name:'Miniket Rice',price:75,qty:25,unit:'kg'},{name:'Soybean Oil',price:180,qty:5,unit:'L'}] },

    // February 2025
    { customer:'Walk-in',       method:'cash',  time:makeDate(2025,2,3,10), items:[{name:'Ceylon Tea',price:380,qty:2,unit:'kg'},{name:'Milk Powder',price:450,qty:1,unit:'pcs'}] },
    { customer:'Habib Mia',     method:'bkash', time:makeDate(2025,2,10,13),items:[{name:'Miniket Rice',price:75,qty:15,unit:'kg'},{name:'Premium Sugar',price:120,qty:8,unit:'kg'}] },
    { customer:'Walk-in',       method:'cash',  time:makeDate(2025,2,15,11),items:[{name:'Red Lentils',price:130,qty:10,unit:'kg'}] },
    { customer:'Nasima Khatun', method:'cash',  time:makeDate(2025,2,20,14),items:[{name:'Atta Flour',price:45,qty:15,unit:'kg'},{name:'Iodized Salt',price:40,qty:5,unit:'kg'}] },
    { customer:'Walk-in',       method:'nagad', time:makeDate(2025,2,25,16),items:[{name:'Soybean Oil',price:180,qty:4,unit:'L'},{name:'Chickpeas',price:110,qty:6,unit:'kg'}] },

    // January 2025
    { customer:'Jahangir Alam', method:'cash',  time:makeDate(2025,1,4,9),  items:[{name:'Miniket Rice',price:75,qty:20,unit:'kg'},{name:'Soybean Oil',price:180,qty:6,unit:'L'}] },
    { customer:'Walk-in',       method:'bkash', time:makeDate(2025,1,9,12), items:[{name:'Milk Powder',price:450,qty:3,unit:'pcs'},{name:'Ceylon Tea',price:380,qty:1,unit:'kg'}] },
    { customer:'Shirin Akter',  method:'cash',  time:makeDate(2025,1,14,10),items:[{name:'Red Lentils',price:130,qty:8,unit:'kg'},{name:'Chickpeas',price:110,qty:5,unit:'kg'}] },
    { customer:'Walk-in',       method:'cash',  time:makeDate(2025,1,20,15),items:[{name:'Atta Flour',price:45,qty:10,unit:'kg'},{name:'Premium Sugar',price:120,qty:6,unit:'kg'}] },
    { customer:'Rahim Uddin',   method:'nagad', time:makeDate(2025,1,26,11),items:[{name:'Chinigura Rice',price:95,qty:15,unit:'kg'},{name:'Iodized Salt',price:40,qty:4,unit:'kg'}] },

    // December 2024
    { customer:'Walk-in',       method:'cash',  time:makeDate(2024,12,5,9), items:[{name:'Miniket Rice',price:75,qty:30,unit:'kg'},{name:'Soybean Oil',price:180,qty:8,unit:'L'}] },
    { customer:'Lutfur Rahman', method:'bkash', time:makeDate(2024,12,12,14),items:[{name:'Milk Powder',price:450,qty:4,unit:'pcs'},{name:'Premium Sugar',price:120,qty:10,unit:'kg'}] },
    { customer:'Walk-in',       method:'cash',  time:makeDate(2024,12,18,11),items:[{name:'Red Lentils',price:130,qty:12,unit:'kg'},{name:'Chickpeas',price:110,qty:8,unit:'kg'}] },
    { customer:'Momena Begum',  method:'cash',  time:makeDate(2024,12,24,10),items:[{name:'Ceylon Tea',price:380,qty:2,unit:'kg'},{name:'Chinigura Rice',price:95,qty:20,unit:'kg'}] },
    { customer:'Walk-in',       method:'nagad', time:makeDate(2024,12,30,15),items:[{name:'Atta Flour',price:45,qty:25,unit:'kg'},{name:'Iodized Salt',price:40,qty:6,unit:'kg'}] },
  ];

  const demoExps = [
    { type:'Meals',       amount:850,  description:'Staff lunch — March',     time:makeDate(2025,3,10,12)  },
    { type:'Transport',   amount:400,  description:'Delivery van — March',    time:makeDate(2025,3,15,10)  },
    { type:'Maintenance', amount:1500, description:'Shop repairs — March',    time:makeDate(2025,3,20,14)  },
    { type:'Tea',         amount:240,  description:'Daily tea — Feb',         time:makeDate(2025,2,14,10)  },
    { type:'Chanda',      amount:500,  description:'Local committee — Feb',   time:makeDate(2025,2,18,11)  },
    { type:'Utilities',   amount:1200, description:'Electricity — Feb',       time:makeDate(2025,2,25,15)  },
    { type:'Meals',       amount:900,  description:'Staff lunch — Jan',       time:makeDate(2025,1,10,12)  },
    { type:'Maintenance', amount:2000, description:'AC repair — Jan',         time:makeDate(2025,1,22,14)  },
    { type:'Transport',   amount:350,  description:'Delivery fuel — Jan',     time:makeDate(2025,1,28,10)  },
    { type:'Meals',       amount:1100, description:'Staff lunch — Dec',       time:makeDate(2024,12,14,12) },
    { type:'Utilities',   amount:1400, description:'Electricity — Dec',       time:makeDate(2024,12,20,15) },
    { type:'Maintenance', amount:800,  description:'Paint & cleaning — Dec',  time:makeDate(2024,12,28,11) },
  ];

  let seedInvoice = 100;
  demos.forEach(d => {
    const subtotal = d.items.reduce((s, i) => s + i.price * i.qty, 0);
    const vat      = subtotal * 0.05;
    allTransactions.push({
      id: seedInvoice,
      invoiceNo: `INV-DEMO-${seedInvoice}`,
      customer: d.customer,
      phone: '',
      method: d.method,
      items: d.items,
      subtotal, vat, vatPct: 5, discount: 0,
      total: subtotal + vat,
      time: d.time,
    });
    seedInvoice++;
  });

  let seedExpId = 100;
  demoExps.forEach(e => {
    expenses.push({ id: seedExpId++, ...e });
  });
})();

/* ── renderStatement override with month filter ─────────── */
renderStatement = function() {
  const sel    = document.getElementById('statementMonth');
  const filter = sel?.value || '2025-04';
  const label  = sel?.options[sel.selectedIndex]?.text || '';

  function inRange(date) {
    const d  = new Date(date);
    const [fy, fm] = filter.split('-').map(Number);
    return d.getFullYear() === fy && d.getMonth() === fm - 1;
  }

  const fTxns  = allTransactions.filter(t => inRange(t.time));
  const fExps  = expenses.filter(e => inRange(e.time));
  const active = duesData.filter(d => !d.paid);

  const totalRev    = fTxns.reduce((s, t) => s + t.total,  0);
  const totalExp    = fExps.reduce((s, e) => s + e.amount, 0);
  const totalDues   = active.reduce((s, d) => s + d.amount, 0);
  const grossProfit = fTxns.reduce((s, t) =>
    s + t.items.reduce((ps, item) => {
      const p  = products.find(x => x.name === item.name);
      const pp = p?.purchasePrice || (p?.price || 0) * 0.75;
      return ps + ((item.price || 0) - pp) * item.qty;
    }, 0), 0);
  const netProfit = grossProfit - totalExp;
  const margin    = totalRev > 0 ? (netProfit / totalRev * 100) : 0;

  const _s = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  _s('stmtRevenue',    `৳${Number(totalRev).toLocaleString('en-IN',{maximumFractionDigits:0})}`);
  _s('stmtRevenueNote',`${fTxns.length} transactions`);
  _s('stmtExpenses',   `৳${Number(totalExp).toLocaleString('en-IN',{maximumFractionDigits:0})}`);
  _s('stmtExpNote',    `${fExps.length} records`);
  _s('stmtDues',       `৳${Number(totalDues).toLocaleString('en-IN',{maximumFractionDigits:0})}`);
  _s('stmtDueNote',    `${active.length} active`);
  _s('stmtNetProfit',  `৳${Number(netProfit).toLocaleString('en-IN',{maximumFractionDigits:0})}`);
  _s('stmtMarginNote', netProfit >= 0 ? 'After all deductions' : 'Net loss');
  _s('stmtMargin',     `${margin.toFixed(1)}%`);
  _s('stmtMarginSub',  'vs revenue');

  // Bar chart — group by week within month
  const weekGroup = (date) => `Wk${Math.ceil(new Date(date).getDate() / 7)}`;
  const sGrp = {}, eGrp = {};
  fTxns.forEach(t => { const k=weekGroup(t.time); sGrp[k]=(sGrp[k]||0)+t.total; });
  fExps.forEach(e => { const k=weekGroup(e.time); eGrp[k]=(eGrp[k]||0)+e.amount; });
  const labels = [...new Set([...Object.keys(sGrp),...Object.keys(eGrp)])].sort();
  const maxV   = Math.max(...labels.map(l => Math.max(sGrp[l]||0, eGrp[l]||0)), 1);
  const barArea = document.getElementById('stmtBarChartArea');
  if (barArea) {
    if (!labels.length) {
      barArea.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:150px;color:var(--text-muted);font-size:13px"><i class="fas fa-chart-bar" style="margin-right:8px;opacity:.4"></i>No data for ${label}</div>`;
    } else {
      const ySteps = [maxV, maxV*0.75, maxV*0.5, maxV*0.25, 0]
        .map(v => v >= 1000 ? `৳${(v/1000).toFixed(0)}k` : `৳${v.toFixed(0)}`);
      barArea.innerHTML = `
        <div class="chart-area" style="height:170px">
          <div class="chart-y-labels">${ySteps.map(l=>`<span>${l}</span>`).join('')}</div>
          <div class="chart-bars-wrap">
            ${labels.map((lbl,i) => {
              const sh = Math.round(((sGrp[lbl]||0)/maxV)*100);
              const eh = Math.round(((eGrp[lbl]||0)/maxV)*100);
              return `<div class="chart-bar-group" style="animation-delay:${i*0.07}s">
                <div class="bar-pair">
                  <div class="bar sales-bar"   style="--h:${sh}%;animation-delay:${i*0.07}s"></div>
                  <div class="bar expense-bar" style="--h:${sh>0?eh:0}%;animation-delay:${i*0.1}s"></div>
                </div>
                <span>${lbl}</span>
              </div>`;
            }).join('')}
          </div>
        </div>`;
    }
  }

  // Pies
  const payMap = {}, expMap = {};
  fTxns.forEach(t => { payMap[t.method] = (payMap[t.method]||0) + t.total; });
  fExps.forEach(e => { expMap[e.type]   = (expMap[e.type]  ||0) + e.amount; });
  const toPie = obj => Object.entries(obj).filter(([,v])=>v>0).map(([k,v]) => ({
    label: k.charAt(0).toUpperCase()+k.slice(1), value: v
  }));
  drawPieChart('stmtPieCanvas',    toPie(payMap).length ? toPie(payMap) : [{label:'No sales',value:1}],    'stmtPieLegend');
  drawPieChart('stmtExpPieCanvas', toPie(expMap).length ? toPie(expMap) : [{label:'No expenses',value:1}], 'stmtExpPieLegend');

  // Sales list
  const txnList = document.getElementById('stmtTxnList');
  if (txnList) {
    _s('stmtTxnCount', `${fTxns.length} records`);
    _s('stmtTxnTotal', `৳${totalRev.toFixed(2)}`);
    txnList.innerHTML = fTxns.slice().reverse().map(t => `
      <div class="txn-detail-item">
        <div class="txn-d-name">
          <div class="txn-d-dot ${t.method}"></div>
          <div><div>${t.customer||'Walk-in'}</div><div style="font-size:11px;color:var(--text-muted)">${t.invoiceNo||''}</div></div>
        </div>
        <div class="txn-d-time">${new Date(t.time).toLocaleDateString('en-BD',{month:'short',day:'numeric'})}</div>
        <div><span class="status-badge instock" style="font-size:10px">${(t.method||'').toUpperCase()}</span></div>
        <div class="txn-d-amount">৳${t.total.toFixed(2)}</div>
      </div>`).join('') || `<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:13px">No transactions for ${label}</div>`;
  }

  // Expense list
  const expList = document.getElementById('stmtExpList');
  if (expList) {
    _s('stmtExpCount', `${fExps.length} records`);
    _s('stmtExpTotal', `৳${totalExp.toFixed(2)}`);
    const cols = EXP_TYPE_COLORS || {};
    const icos = EXP_TYPE_ICONS  || {};
    expList.innerHTML = fExps.slice().reverse().map(e => {
      const col = cols[e.type] || '#64748b';
      const ico = icos[e.type] || 'fa-tag';
      return `<div class="txn-detail-item">
        <div class="txn-d-name">
          <i class="fas ${ico}" style="color:${col};width:16px;flex-shrink:0"></i>
          <div><div>${e.type}</div><div style="font-size:11px;color:var(--text-muted)">${e.description||'—'}</div></div>
        </div>
        <div class="txn-d-time">${new Date(e.time).toLocaleDateString('en-BD',{month:'short',day:'numeric'})}</div>
        <div><span class="exp-type-chip" style="background:${col}18;color:${col};font-size:10px">${e.type}</span></div>
        <div class="txn-d-amount" style="color:var(--danger)">৳${e.amount.toFixed(2)}</div>
      </div>`;
    }).join('') || `<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:13px">No expenses for ${label}</div>`;
  }

  // Dues list
  const duesList = document.getElementById('stmtDueList');
  if (duesList) {
    _s('stmtDueCount', `${active.length} active`);
    _s('stmtDueTotal', `৳${totalDues.toFixed(2)}`);
    duesList.innerHTML = active.slice(0, 8).map(d => {
      const dl  = Math.ceil((_getDueDate ? _getDueDate(d) : new Date(d.addedDate.getTime()+d.period*86400000)) - new Date()) / 86400000;
      const dlR = Math.ceil(dl);
      const dlabel = dlR < 0 ? `${Math.abs(dlR)}d overdue` : `${dlR}d left`;
      const cls  = dlR < -5 ? 'critical' : dlR < 0 ? 'overdue' : 'pending';
      return `<div class="txn-detail-item">
        <div class="txn-d-name">
          <div class="txn-d-dot" style="background:${dlR<0?'var(--danger)':'var(--warning)'}"></div>
          <div><div style="font-weight:500">${d.name}</div><div style="font-size:11px;color:var(--text-muted)">${d.type}</div></div>
        </div>
        <div><span class="days-badge ${cls}" style="font-size:10px">${dlabel}</span></div>
        <div><span class="status-badge ${cls}" style="font-size:10px">${cls.charAt(0).toUpperCase()+cls.slice(1)}</span></div>
        <div class="txn-d-amount" style="color:var(--warning)">৳${Number(d.amount).toLocaleString()}</div>
      </div>`;
    }).join('') || `<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:13px">No active dues</div>`;
  }
};

/* ── Print Preview Functions ────────────────────────────── */
function printStatement() {
  const sel    = document.getElementById('statementMonth');
  const filter = sel?.value || '2025-04';
  const label  = sel?.options[sel.selectedIndex]?.text || 'Statement';

  function inRange(date) {
    const d  = new Date(date);
    const [fy, fm] = filter.split('-').map(Number);
    return d.getFullYear() === fy && d.getMonth() === fm - 1;
  }

  const fTxns = allTransactions.filter(t => inRange(t.time));
  const fExps = expenses.filter(e => inRange(e.time));
  const active = duesData.filter(d => !d.paid);

  const totalRev  = fTxns.reduce((s, t) => s + t.total,  0);
  const totalExp  = fExps.reduce((s, e) => s + e.amount, 0);
  const totalDues = active.reduce((s, d) => s + d.amount, 0);
  const grossP    = fTxns.reduce((s, t) =>
    s + t.items.reduce((ps, item) => {
      const p  = products.find(x => x.name === item.name);
      const pp = p?.purchasePrice || (p?.price||0) * 0.75;
      return ps + ((item.price||0) - pp) * item.qty;
    }, 0), 0);
  const netProfit = grossP - totalExp;
  const margin    = totalRev > 0 ? (netProfit / totalRev * 100) : 0;
  const fmt       = n => Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });

  // Build print sheet HTML
  const txnRows = fTxns.map(t => `
    <tr>
      <td>${t.invoiceNo || '—'}</td>
      <td>${t.customer || 'Walk-in'}</td>
      <td>${new Date(t.time).toLocaleDateString('en-BD',{month:'short',day:'numeric'})}</td>
      <td><span style="text-transform:uppercase;font-size:10px;font-weight:700;color:#6366f1">${t.method}</span></td>
      <td class="ps-amt">৳${t.total.toFixed(2)}</td>
    </tr>`).join('');

  const expRows = fExps.map(e => `
    <tr>
      <td>${e.type}</td>
      <td>${e.description || '—'}</td>
      <td>${new Date(e.time).toLocaleDateString('en-BD',{month:'short',day:'numeric'})}</td>
      <td class="ps-amt" style="color:#f43f5e">৳${e.amount.toFixed(2)}</td>
    </tr>`).join('');

  const dueRows = active.slice(0, 10).map(d => `
    <tr>
      <td>${d.name}</td>
      <td>${d.phone}</td>
      <td>${d.type}</td>
      <td class="ps-amt" style="color:#f59e0b">৳${Number(d.amount).toLocaleString()}</td>
    </tr>`).join('');

  document.getElementById('printPreviewPeriod').textContent = label;

  document.getElementById('printSheet').innerHTML = `
    <div class="ps-header">
      <div class="ps-store-icon"><i class="fas fa-store-alt"></i></div>
      <div class="ps-store-name">SmartRetail Store</div>
      <div class="ps-store-sub">123 Bashundhara, Dhaka, Bangladesh | Tel: 01700-000000</div>
      <div class="ps-period-tag">${label} — Financial Statement</div>
    </div>

    <div class="ps-kpi-row">
      <div class="ps-kpi blue">  <span>Total Revenue</span> <strong>৳${fmt(totalRev)}</strong></div>
      <div class="ps-kpi red">   <span>Total Expenses</span><strong>৳${fmt(totalExp)}</strong></div>
      <div class="ps-kpi purple"><span>Net Profit</span>    <strong>৳${fmt(netProfit)}</strong></div>
      <div class="ps-kpi green"> <span>Profit Margin</span> <strong>${margin.toFixed(1)}%</strong></div>
    </div>

    ${fTxns.length ? `
    <div class="ps-section-title"><i class="fas fa-shopping-cart"></i> Sales Transactions (${fTxns.length})</div>
    <table class="ps-table">
      <thead><tr><th>Invoice</th><th>Customer</th><th>Date</th><th>Method</th><th style="text-align:right">Amount</th></tr></thead>
      <tbody>${txnRows}</tbody>
    </table>` : ''}

    ${fExps.length ? `
    <div class="ps-section-title"><i class="fas fa-receipt"></i> Expense Records (${fExps.length})</div>
    <table class="ps-table">
      <thead><tr><th>Type</th><th>Description</th><th>Date</th><th style="text-align:right">Amount</th></tr></thead>
      <tbody>${expRows}</tbody>
    </table>` : ''}

    ${active.length ? `
    <div class="ps-section-title"><i class="fas fa-wallet"></i> Active Due Accounts (${active.length})</div>
    <table class="ps-table">
      <thead><tr><th>Customer</th><th>Phone</th><th>Type</th><th style="text-align:right">Amount</th></tr></thead>
      <tbody>${dueRows}</tbody>
    </table>` : ''}

    <div class="ps-totals-box">
      <div class="ps-total-row"><span>Total Revenue</span><span>৳${fmt(totalRev)}</span></div>
      <div class="ps-total-row"><span>Cost of Goods</span><span style="color:#f43f5e">— ৳${fmt(totalRev - grossP)}</span></div>
      <div class="ps-total-row"><span>Gross Profit</span><span>৳${fmt(grossP)}</span></div>
      <div class="ps-total-row"><span>Total Expenses</span><span style="color:#f43f5e">— ৳${fmt(totalExp)}</span></div>
      <div class="ps-total-row"><span>NET PROFIT</span><span style="color:${netProfit>=0?'#10b981':'#f43f5e'}">৳${fmt(netProfit)}</span></div>
    </div>

    <div class="ps-footer">
      <strong>SmartRetail POS System</strong> — Confidential Business Statement<br>
      <span class="ps-printed-on">Printed on: ${new Date().toLocaleString('en-BD')}</span>
    </div>`;

  document.getElementById('printPreviewModal').classList.add('show');
}

function closePrintPreview() {
  document.getElementById('printPreviewModal').classList.remove('show');
}

function executePrint() {
  window.print();
}

// Override downloadStatement to also open preview
downloadStatement = function() {
  printStatement();
};
