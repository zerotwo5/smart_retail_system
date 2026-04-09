// Global State
let currentTheme = 'light';
let pinCode = '';
const CORRECT_PIN = '123456';
let cart = [];
let selectedPayment = 'cash';
let selectedProduct = null;
let currentMultiplier = 1;

// Products Data
const products = [
  { id: 1, name: 'Miniket Rice', category: 'Grocery', price: 75, unit: 'kg', stock: 125, pieces: 125 },
  { id: 2, name: 'Premium Sugar', category: 'Grocery', price: 120, unit: 'kg', stock: 8, pieces: 8 },
  { id: 3, name: 'Soybean Oil', category: 'Grocery', price: 180, unit: 'L', stock: 45, pieces: 45 },
  { id: 4, name: 'Atta Flour', category: 'Grocery', price: 45, unit: 'kg', stock: 3, pieces: 3 },
  { id: 5, name: 'Red Lentils', category: 'Pulses', price: 130, unit: 'kg', stock: 22, pieces: 22 },
  { id: 6, name: 'Iodized Salt', category: 'Spices', price: 40, unit: 'kg', stock: 50, pieces: 50 },
  { id: 7, name: 'Milk Powder', category: 'Dairy', price: 450, unit: 'pcs', stock: 15, pieces: 15 },
  { id: 8, name: 'Ceylon Tea', category: 'Beverages', price: 380, unit: 'kg', stock: 2, pieces: 2 },
  { id: 9, name: 'Chinigura Rice', category: 'Grocery', price: 95, unit: 'kg', stock: 60, pieces: 60 },
  { id: 10, name: 'Chickpeas', category: 'Pulses', price: 110, unit: 'kg', stock: 18, pieces: 18 },
];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  updateDateTime();
  setInterval(updateDateTime, 1000);
  renderProducts();
  renderInventory();
  updateLowStockCount();
});

// Theme Toggle
function toggleTheme() {
  currentTheme = currentTheme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', currentTheme);
  const icon = document.querySelector('.theme-toggle i');
  icon.className = currentTheme === 'light' ? 'fas fa-sun' : 'fas fa-moon';
}

// DateTime
function updateDateTime() {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-BD', { year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-BD', { hour: '2-digit', minute: '2-digit' });
  
  const dateEl = document.getElementById('currentDate');
  const timeEl = document.getElementById('currentTime');
  if (dateEl) dateEl.textContent = dateStr;
  if (timeEl) timeEl.textContent = timeStr;
}

// PIN Functions
function addPinDigit(digit) {
  if (pinCode.length < 6) {
    pinCode += digit;
    updatePinDisplay();
    if (pinCode.length === 6) {
      setTimeout(verifyPin, 200);
    }
  }
}

function clearPin() {
  pinCode = '';
  updatePinDisplay();
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
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('dashboard').classList.add('active');
  } else {
    alert('Invalid PIN! Demo PIN: 123456');
    clearPin();
  }
}

function lockScreen() {
  document.getElementById('loginScreen').classList.remove('hidden');
  document.getElementById('dashboard').classList.remove('active');
  clearPin();
}

// Tab Switching
function switchTab(tabName) {
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
  document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
  
  event.currentTarget.classList.add('active');
  document.getElementById(tabName + 'Tab').classList.add('active');
  
  const titles = {
    sales: 'Sales Dashboard',
    inventory: 'Inventory Management',
    dues: 'Due Management (Baki)',
    statement: 'Financial Statement'
  };
  document.getElementById('pageTitle').textContent = titles[tabName];
}

// Render Products Table
function renderProducts() {
  const tbody = document.getElementById('productTableBody');
  tbody.innerHTML = products.map(p => {
    const stockClass = p.stock > 10 ? 'good' : p.stock > 5 ? 'warning' : 'danger';
    return `
      <tr>
        <td>
          <div class="product-info">
            <div class="product-icon">
              <i class="fas fa-box"></i>
            </div>
            <div class="product-details">
              <div class="product-name">${p.name}</div>
              <div class="product-category">${p.category}</div>
            </div>
          </div>
        </td>
        <td><strong>৳${p.price}</strong> / ${p.unit}</td>
        <td>
          <span class="stock-badge ${stockClass}">${p.stock} ${p.unit}</span>
        </td>
        <td>
          <button class="add-to-cart-btn" onclick="selectProduct(${p.id})">
            <i class="fas fa-plus"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// Select Product
function selectProduct(productId) {
  selectedProduct = products.find(p => p.id === productId);
  document.getElementById('selectedProductName').textContent = selectedProduct.name;
  currentMultiplier = 1;
}

// Apply Multiplier
function applyMultiplier(value) {
  if (!selectedProduct) {
    alert('Please select a product first!');
    return;
  }
  
  currentMultiplier = value;
  let quantity = value;
  let displayQty = value;
  
  if (value < 1) {
    displayQty = (value * 1000) + 'g';
  }
  
  addToCart(selectedProduct, quantity, displayQty);
}

// Add to Cart
function addToCart(product, quantity, displayQty = null) {
  const existingItem = cart.find(item => item.id === product.id);
  const qty = typeof quantity === 'number' ? quantity : 1;
  const display = displayQty || qty;
  
  if (existingItem) {
    existingItem.quantity += qty;
    existingItem.displayQuantity = existingItem.quantity;
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
  
  renderCart();
  selectedProduct = null;
  document.getElementById('selectedProductName').textContent = 'None';
}

// Render Cart
function renderCart() {
  const container = document.getElementById('cartItems');
  
  if (cart.length === 0) {
    container.innerHTML = `
      <div class="empty-cart">
        <i class="fas fa-shopping-cart"></i>
        <p>No items in cart</p>
      </div>
    `;
    document.getElementById('cartSubtotal').textContent = '৳0';
    document.getElementById('cartVat').textContent = '৳0';
    document.getElementById('cartTotal').textContent = '৳0';
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
            <button class="qty-btn" onclick="updateCartItem(${index}, -1)">-</button>
            <span>${item.quantity}</span>
            <button class="qty-btn" onclick="updateCartItem(${index}, 1)">+</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  const vat = subtotal * 0.05;
  const total = subtotal + vat;
  
  document.getElementById('cartSubtotal').textContent = `৳${subtotal.toFixed(2)}`;
  document.getElementById('cartVat').textContent = `৳${vat.toFixed(2)}`;
  document.getElementById('cartTotal').textContent = `৳${total.toFixed(2)}`;
}

// Update Cart Item
function updateCartItem(index, change) {
  const item = cart[index];
  item.quantity += change;
  
  if (item.quantity <= 0) {
    cart.splice(index, 1);
  }
  
  renderCart();
}

// Select Payment
function selectPayment(method) {
  selectedPayment = method;
  document.querySelectorAll('.payment-option').forEach(btn => btn.classList.remove('active'));
  event.currentTarget.classList.add('active');
  
  document.getElementById('dueSettings').style.display = method === 'due' ? 'block' : 'none';
}

// Process Checkout
function processCheckout() {
  if (cart.length === 0) {
    alert('Cart is empty!');
    return;
  }
  
  if (selectedPayment === 'bkash' || selectedPayment === 'nagad') {
    showQRModal();
  } else {
    showReceipt();
  }
}

// Show QR Modal
function showQRModal() {
  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0) * 1.05;
  document.getElementById('bkashAmount').textContent = `৳${total.toFixed(2)}`;
  document.getElementById('bkashModal').classList.add('show');
}

function closeBkashModal() {
  document.getElementById('bkashModal').classList.remove('show');
  showReceipt();
}

// Show Receipt
function showReceipt() {
  const modal = document.getElementById('receiptModal');
  const container = document.getElementById('receiptItems');
  
  let subtotal = 0;
  container.innerHTML = cart.map(item => {
    const itemTotal = item.price * item.quantity;
    subtotal += itemTotal;
    return `
      <div class="receipt-item">
        <span>${item.name} × ${item.displayQuantity}</span>
        <span>৳${itemTotal.toFixed(2)}</span>
      </div>
    `;
  }).join('');
  
  const vat = subtotal * 0.05;
  const total = subtotal + vat;
  
  container.innerHTML += `
    <div class="receipt-item">
      <span>VAT (5%)</span>
      <span>৳${vat.toFixed(2)}</span>
    </div>
  `;
  
  document.getElementById('receiptTotal').textContent = `Total: ৳${total.toFixed(2)}`;
  modal.classList.add('show');
  
  // Clear cart
  cart = [];
  renderCart();
}

function closeReceiptModal() {
  document.getElementById('receiptModal').classList.remove('show');
}

function printReceipt() {
  window.print();
}

function sendWhatsApp() {
  const phone = prompt('Enter customer WhatsApp number:');
  if (phone) {
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0) * 1.05;
    const message = `Smart Retail Store%0AInvoice: INV-2024-089%0ATotal: ৳${total.toFixed(2)}%0AThank you!`;
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  }
}

function sendSMS() {
  alert('SMS feature - Integrate with GreenWeb/BulkSMSBD API');
}

// Render Inventory
function renderInventory() {
  const tbody = document.getElementById('inventoryTableBody');
  let totalValue = 0;
  
  tbody.innerHTML = products.map(p => {
    const stockValue = p.price * p.pieces;
    totalValue += stockValue;
    const status = p.pieces > 10 ? 'instock' : 'lowstock';
    const statusText = p.pieces > 10 ? 'In Stock' : 'Low Stock';
    
    return `
      <tr>
        <td><strong>${p.name}</strong></td>
        <td>${p.category}</td>
        <td>৳${p.price}</td>
        <td><strong>${p.pieces}</strong> ${p.unit}</td>
        <td>৳${stockValue.toFixed(2)}</td>
        <td><span class="status-badge ${status}">${statusText}</span></td>
        <td class="action-icons">
          <i class="fas fa-edit" onclick="editProduct(${p.id})"></i>
          <i class="fas fa-trash-alt" onclick="deleteProduct(${p.id})"></i>
        </td>
      </tr>
    `;
  }).join('');
  
  document.getElementById('totalStockValue').textContent = `৳${totalValue.toFixed(2)}`;
  document.getElementById('totalProducts').textContent = products.length;
}

// Update Low Stock Count
function updateLowStockCount() {
  const lowStock = products.filter(p => p.pieces <= 5).length;
  document.getElementById('lowStockItems').textContent = lowStock;
  document.getElementById('lowStockCount').textContent = `${lowStock} Low Stock`;
}

// Product Actions
function editProduct(id) {
  alert(`Edit product ${id}`);
}

function deleteProduct(id) {
  if (confirm('Delete this product?')) {
    const index = products.findIndex(p => p.id === id);
    if (index > -1) {
      products.splice(index, 1);
      renderProducts();
      renderInventory();
      updateLowStockCount();
    }
  }
}

function showAddProductModal() {
  alert('Add Product Modal - Connect to backend');
}

function downloadStatement() {
  alert('PDF Statement will be generated');
}

// Search Functionality
document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('productSearch');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase();
      const filtered = products.filter(p => 
        p.name.toLowerCase().includes(term) || 
        p.category.toLowerCase().includes(term)
      );
      
      const tbody = document.getElementById('productTableBody');
      tbody.innerHTML = filtered.map(p => {
        const stockClass = p.stock > 10 ? 'good' : p.stock > 5 ? 'warning' : 'danger';
        return `
          <tr>
            <td>
              <div class="product-info">
                <div class="product-icon">
                  <i class="fas fa-box"></i>
                </div>
                <div class="product-details">
                  <div class="product-name">${p.name}</div>
                  <div class="product-category">${p.category}</div>
                </div>
              </div>
            </td>
            <td><strong>৳${p.price}</strong> / ${p.unit}</td>
            <td>
              <span class="stock-badge ${stockClass}">${p.stock} ${p.unit}</span>
            </td>
            <td>
              <button class="add-to-cart-btn" onclick="selectProduct(${p.id})">
                <i class="fas fa-plus"></i>
              </button>
            </td>
          </tr>
        `;
      }).join('');
    });
  }
});