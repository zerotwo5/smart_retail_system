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
//   v2.1 ADDITIONS
// ============================================================

// ---- Products: add purchasePrice field ----
products.forEach(p => {
  if (!p.purchasePrice) p.purchasePrice = Math.round(p.price * 0.75);
  if (!p.salesPrice) p.salesPrice = p.price;
});

// ---- Sync Button ----
function syncData() {
  const btn = document.querySelector('.sync-btn');
  if (btn) {
    btn.classList.add('syncing');
    btn.querySelector('span').textContent = 'Syncing...';
  }
  setTimeout(() => {
    if (btn) {
      btn.classList.remove('syncing');
      btn.querySelector('span').textContent = 'Sync';
    }
    showToast('Data synced to cloud ✓', 'success');
  }, 1800);
}

// ---- Due Period ----
function selectDuePeriod(days, btn) {
  document.querySelectorAll('.due-period-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const inp = document.getElementById('duePeriodDays');
  if (inp) inp.value = days;
}

// ---- Cash Change Calc ----
function calcChange() {
  const total = computeTotal();
  const received = parseFloat(document.getElementById('cashReceived')?.value) || 0;
  const changeEl = document.getElementById('changeDisplay');
  const changeAmt = document.getElementById('changeAmount');
  if (!changeEl || !changeAmt) return;
  if (received > 0) {
    const change = received - total;
    changeEl.style.display = 'block';
    changeAmt.textContent = `৳${Math.max(0, change).toFixed(2)}`;
    changeAmt.style.color = change >= 0 ? 'var(--success)' : 'var(--danger)';
    changeEl.textContent = change >= 0 ? `Change: ` : `Short: `;
    changeEl.appendChild(changeAmt);
  } else {
    changeEl.style.display = 'none';
  }
}

// Override renderCart to use vatInput
const _origRenderCart = renderCart;
renderCart = function() {
  const container = document.getElementById('cartItems');
  const countBadge = document.getElementById('cartCount');
  if (!container) return;

  if (cart.length === 0) {
    container.innerHTML = `<div class="empty-cart"><i class="fas fa-shopping-cart"></i><p>Cart is empty</p><span>Select products to add</span></div>`;
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
    return `<div class="cart-item">
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

  const vatPct = parseFloat(document.getElementById('vatInput')?.value) || 0;
  const discount = parseFloat(document.getElementById('discountInput')?.value) || 0;
  const vat = subtotal * (vatPct / 100);
  const total = Math.max(0, subtotal + vat - discount);

  document.getElementById('cartSubtotal').textContent = `৳${subtotal.toFixed(2)}`;
  document.getElementById('cartVat').textContent = `৳${vat.toFixed(2)}`;
  document.getElementById('cartTotal').textContent = `৳${total.toFixed(2)}`;
  if (countBadge) countBadge.textContent = `${cart.length} item${cart.length !== 1 ? 's' : ''}`;
};

// Override computeTotal to use vatInput
computeTotal = function() {
  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const vatPct = parseFloat(document.getElementById('vatInput')?.value) || 0;
  const vat = subtotal * (vatPct / 100);
  const discount = parseFloat(document.getElementById('discountInput')?.value) || 0;
  return Math.max(0, subtotal + vat - discount);
};

// Override processCheckout to validate due fields
const _origProcessCheckout = processCheckout;
processCheckout = function() {
  if (cart.length === 0) { showToast('Cart is empty!', 'error'); return; }

  // Due validation
  if (selectedPayment === 'due') {
    const name = document.getElementById('dueCustomerName')?.value.trim();
    const phone = document.getElementById('dueCustomerPhone')?.value.trim();
    if (!name) {
      showToast('Customer name is required for Due purchase!', 'error');
      document.getElementById('dueCustomerName')?.focus();
      return;
    }
    if (!phone) {
      showToast('Phone number is required for Due purchase!', 'error');
      document.getElementById('dueCustomerPhone')?.focus();
      return;
    }
  }

  if (selectedPayment === 'bkash' || selectedPayment === 'nagad') {
    showQRModal();
  } else {
    completeTransaction();
  }
};

// Override completeTransaction to use due customer fields
const _origCompleteTransaction = completeTransaction;
completeTransaction = function() {
  let customerName, customerPhone;

  if (selectedPayment === 'due') {
    customerName = document.getElementById('dueCustomerName')?.value.trim() || 'Due Customer';
    customerPhone = document.getElementById('dueCustomerPhone')?.value.trim() || '';
  } else {
    customerName = document.getElementById('customerName')?.value.trim() || 'Walk-in';
    customerPhone = document.getElementById('customerPhone')?.value.trim() || '';
  }

  const vatPct = parseFloat(document.getElementById('vatInput')?.value) || 0;
  const discountEl = document.getElementById('discountInput');
  const discount = discountEl ? (parseFloat(discountEl.value) || 0) : 0;

  let subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const vat = subtotal * (vatPct / 100);
  const total = Math.max(0, subtotal + vat - discount);
  const invoiceNo = `INV-2025-${String(invoiceCounter).padStart(3, '0')}`;
  const dueDays = parseInt(document.getElementById('duePeriodDays')?.value) || 0;

  const txn = {
    id: invoiceCounter, invoiceNo, customer: customerName, phone: customerPhone,
    method: selectedPayment, items: cart.map(i => ({ name: i.name, price: i.price, qty: i.quantity, unit: i.unit })),
    subtotal, vat, vatPct, discount, total, time: new Date(), dueDays
  };
  allTransactions.push(txn);

  cart.forEach(ci => {
    const prod = products.find(p => p.id === ci.id);
    if (prod) { prod.stock = Math.max(0, prod.stock - ci.quantity); prod.pieces = prod.stock; }
  });

  invoiceCounter++;
  updateInvoiceNumber();
  showReceipt(txn);

  cart = [];
  renderCart();
  if (discountEl) discountEl.value = '';
  const cn = document.getElementById('customerName'); if (cn) cn.value = '';
  const cp = document.getElementById('customerPhone'); if (cp) cp.value = '';
  const dcn = document.getElementById('dueCustomerName'); if (dcn) dcn.value = '';
  const dcp = document.getElementById('dueCustomerPhone'); if (dcp) dcp.value = '';
  renderInventory();
  updateLowStockCount();
};

// ---- Inventory: renderInventory with purchase/sales price + stock highlight ----
renderInventory = function(list) {
  list = list || products;
  const tbody = document.getElementById('inventoryTableBody');
  if (!tbody) return;
  let totalValue = 0;

  tbody.innerHTML = list.map(p => {
    const val = p.salesPrice * p.pieces;
    totalValue += val;
    const status = p.pieces > 10 ? 'instock' : 'lowstock';
    const statusText = p.pieces > 10 ? 'In Stock' : 'Low Stock';

    let stockClass = 'high';
    if (p.pieces <= 3) stockClass = 'critical';
    else if (p.pieces <= 5) stockClass = 'low';
    else if (p.pieces <= 15) stockClass = 'medium';

    return `<tr>
      <td><strong>${p.name}</strong></td>
      <td>${p.category}</td>
      <td><div class="price-two-col"><div class="purchase-price">Buy: <span>৳${p.purchasePrice || Math.round(p.price*0.75)}</span></div></div></td>
      <td><div class="sales-price">৳${p.salesPrice || p.price}</div></td>
      <td><span class="stock-highlight ${stockClass}">${p.pieces} ${p.unit}</span></td>
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
};

// ---- Barcode scan stubs ----
function triggerBarcodeScan() {
  showToast('Barcode Scanner: Connect USB/camera scanner', 'info');
}
function triggerInventoryBarcode() {
  showToast('Inventory Barcode Scanner: Connect USB/camera scanner', 'info');
}

// ---- Add Product Modal ----
function showAddProductModal() {
  document.getElementById('addProductModal').classList.add('show');
  // watch inputs for profit preview
  const pp = document.getElementById('newProductPurchasePrice');
  const sp = document.getElementById('newProductSalesPrice');
  [pp, sp].forEach(el => {
    if (el) el.addEventListener('input', updateProfitPreview);
  });
}
function closeAddProductModal() {
  document.getElementById('addProductModal').classList.remove('show');
  ['newProductName','newProductPurchasePrice','newProductSalesPrice','newProductStock'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const sel = document.getElementById('newProductCategory');
  if (sel) sel.value = '';
  document.getElementById('profitPreview').style.display = 'none';
}
function updateProfitPreview() {
  const pp = parseFloat(document.getElementById('newProductPurchasePrice')?.value) || 0;
  const sp = parseFloat(document.getElementById('newProductSalesPrice')?.value) || 0;
  const preview = document.getElementById('profitPreview');
  if (pp > 0 && sp > 0 && preview) {
    const profit = sp - pp;
    const margin = ((profit / sp) * 100).toFixed(1);
    document.getElementById('profitPerUnit').textContent = `৳${profit.toFixed(2)}`;
    document.getElementById('profitMargin').textContent = `${margin}%`;
    preview.style.display = 'flex';
  } else if (preview) {
    preview.style.display = 'none';
  }
}
function saveNewProduct() {
  const name = document.getElementById('newProductName')?.value.trim();
  const category = document.getElementById('newProductCategory')?.value;
  const purchasePrice = parseFloat(document.getElementById('newProductPurchasePrice')?.value);
  const salesPrice = parseFloat(document.getElementById('newProductSalesPrice')?.value);
  const stock = parseInt(document.getElementById('newProductStock')?.value) || 0;
  const unit = document.getElementById('newProductUnit')?.value || 'pcs';

  if (!name) { showToast('Product name is required', 'error'); return; }
  if (!category) { showToast('Category is required', 'error'); return; }
  if (isNaN(purchasePrice) || purchasePrice < 0) { showToast('Valid purchase price required', 'error'); return; }
  if (isNaN(salesPrice) || salesPrice < 0) { showToast('Valid sales price required', 'error'); return; }

  const newId = Math.max(...products.map(p => p.id)) + 1;
  products.push({
    id: newId, name, category,
    price: salesPrice, salesPrice, purchasePrice,
    unit, stock, pieces: stock
  });

  renderInventory();
  renderProducts();
  updateLowStockCount();
  closeAddProductModal();
  showToast(`"${name}" added to inventory!`, 'success');
}

// ---- Pie Charts (canvas-based, no library) ----
function drawPieChart(canvasId, data, legendId) {
  const canvas = document.getElementById(canvasId);
  const legend = document.getElementById(legendId);
  if (!canvas || !legend) return;

  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const cx = W / 2, cy = H / 2, r = Math.min(W, H) / 2 - 6;
  ctx.clearRect(0, 0, W, H);

  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return;

  const colors = ['#6366f1','#22d3ee','#10b981','#f59e0b','#f43f5e','#8b5cf6','#06b6d4'];
  let startAngle = -Math.PI / 2;

  data.forEach((d, i) => {
    const slice = (d.value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, startAngle, startAngle + slice);
    ctx.closePath();
    ctx.fillStyle = colors[i % colors.length];
    ctx.fill();
    // Gap
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, startAngle + slice - 0.01, startAngle + slice);
    ctx.closePath();
    ctx.fillStyle = 'var(--bg-card)';
    // Inner circle (donut)
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.52, 0, Math.PI * 2);
    ctx.fillStyle = 'var(--bg-card)';
    ctx.fill();
    startAngle += slice;
  });

  // Legend
  legend.innerHTML = data.map((d, i) => `
    <div class="pie-legend-item">
      <div class="pie-legend-dot" style="background:${colors[i % colors.length]}"></div>
      <span>${d.label}</span>
      <span class="pie-legend-val">${Math.round((d.value/total)*100)}%</span>
    </div>
  `).join('');
}

// Override renderDashboard to include charts
const _origRenderDash = renderDashboard;
renderDashboard = function() {
  _origRenderDash();

  // Payment breakdown pie
  const paymentCounts = { cash: 0, bkash: 0, nagad: 0, due: 0 };
  allTransactions.forEach(t => { paymentCounts[t.method] = (paymentCounts[t.method] || 0) + t.total; });
  const pieData = Object.entries(paymentCounts)
    .filter(([,v]) => v > 0)
    .map(([k,v]) => ({ label: k.toUpperCase(), value: v }));
  drawPieChart('pieCanvas', pieData.length ? pieData : [{label:'No data',value:1}], 'pieLegend');

  // Category sales donut
  const catSales = {};
  allTransactions.forEach(t => {
    t.items.forEach(item => {
      const prod = products.find(p => p.name === item.name);
      const cat = prod?.category || 'Other';
      catSales[cat] = (catSales[cat] || 0) + item.qty;
    });
  });
  const catData = Object.entries(catSales).map(([k,v]) => ({ label: k, value: v }));
  drawPieChart('catCanvas', catData.length ? catData : [{label:'No data',value:1}], 'catLegend');

  // Quick stats
  const qsList = document.getElementById('quickStatsList');
  if (qsList) {
    const avgOrder = allTransactions.length ? (allTransactions.reduce((s,t)=>s+t.total,0)/allTransactions.length) : 0;
    const cashCount = allTransactions.filter(t=>t.method==='cash').length;
    const dueCount = allTransactions.filter(t=>t.method==='due').length;
    const totalItems = allTransactions.reduce((s,t)=>s+t.items.length,0);
    qsList.innerHTML = [
      { icon:'fa-shopping-basket', label:'Avg Order Value', val:`৳${avgOrder.toFixed(0)}` },
      { icon:'fa-money-bill', label:'Cash Transactions', val:cashCount },
      { icon:'fa-file-invoice', label:'Due Transactions', val:dueCount },
      { icon:'fa-box', label:'Items Sold', val:totalItems },
      { icon:'fa-warehouse', label:'Total Products', val:products.length },
      { icon:'fa-exclamation-triangle', label:'Low Stock Items', val:products.filter(p=>p.stock<=5).length },
    ].map(qs=>`
      <div class="qs-item">
        <div class="qs-label"><i class="fas ${qs.icon}"></i>${qs.label}</div>
        <div class="qs-value">${qs.val}</div>
      </div>
    `).join('');
  }
};

// Re-init on load
document.addEventListener('DOMContentLoaded', () => {
  products.forEach(p => {
    if (!p.purchasePrice) p.purchasePrice = Math.round(p.price * 0.75);
    if (!p.salesPrice) p.salesPrice = p.price;
  });
});
