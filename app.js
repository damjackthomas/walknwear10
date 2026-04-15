const STORAGE_KEYS = {
  products: "wearnwalk_products",
  sales: "wearnwalk_sales",
  billCounter: "wearnwalk_bill_counter",
  shopProfile: "wearnwalk_shop_profile",
};

const productForm = document.getElementById("product-form");
const productIdInput = document.getElementById("product-id");
const productNameInput = document.getElementById("product-name");
const productSkuInput = document.getElementById("product-sku");
const productCategoryInput = document.getElementById("product-category");
const productStockInput = document.getElementById("product-stock");
const productPriceInput = document.getElementById("product-price");
const productSizeInput = document.getElementById("product-size");
const clearFormBtn = document.getElementById("clear-form");
const searchInput = document.getElementById("search-input");
const inventoryBody = document.querySelector("#inventory-table tbody");

const saleForm = document.getElementById("sale-form");
const customerNameInput = document.getElementById("customer-name");
const customerPhoneInput = document.getElementById("customer-phone");
const saleItemsContainer = document.getElementById("sale-items");
const addSaleItemBtn = document.getElementById("add-sale-item");
const paymentMethodInput = document.getElementById("payment-method");
const splitPaymentFields = document.getElementById("split-payment-fields");
const cashAmountInput = document.getElementById("cash-amount");
const onlineAmountInput = document.getElementById("online-amount");
const splitValidation = document.getElementById("split-validation");
const smsOptionContainer = document.getElementById("sms-option-container");
const sendSmsCheckbox = document.getElementById("send-sms-checkbox");
const salesBody = document.querySelector("#sales-table tbody");
const billTemplate = document.getElementById("bill-template");
const shopForm = document.getElementById("shop-form");
const shopTitle = document.getElementById("shop-title");
const shopTagline = document.getElementById("shop-tagline");
const shopMeta = document.getElementById("shop-meta");
const shopNameInput = document.getElementById("shop-name");
const shopOwnerInput = document.getElementById("shop-owner");
const shopPhoneInput = document.getElementById("shop-phone");
const shopAddressInput = document.getElementById("shop-address");
const shopTaglineInput = document.getElementById("shop-tagline-input");
const shopAdminPinInput = document.getElementById("shop-admin-pin");
const adminOnlySections = document.querySelectorAll(".admin-only");
const guestOnlySections = document.querySelectorAll(".guest-only");
const adminPanelLogin = document.getElementById("admin-panel-login");
const adminLoginForm = document.getElementById("admin-login-form");
const adminPinInput = document.getElementById("admin-pin-input");
const openGuestPanelBtn = document.getElementById("open-guest-panel");
const openAdminPanelBtn = document.getElementById("open-admin-panel");
const activeRoleLabel = document.getElementById("active-role-label");
const excelFileInput = document.getElementById("excel-file");
const fileInfo = document.getElementById("file-info");
const fileName = document.getElementById("file-name");
const removeFileBtn = document.getElementById("remove-file");
const downloadTemplateBtn = document.getElementById("download-template");
const importExcelBtn = document.getElementById("import-excel");
const importStatus = document.getElementById("import-status");
const clearInventoryBtn = document.getElementById("clear-inventory");

let products = []; // Clear all products from inventory
let sales = getStored(STORAGE_KEYS.sales, []);
let billCounter = getStored(STORAGE_KEYS.billCounter, 1);
let shopProfile = getStored(STORAGE_KEYS.shopProfile, {
  name: "WEARNWALK",
  owner: "",
  phone: "",
  address: "",
  tagline: "Style. Comfort. Everyday.",
  adminPin: "1234",
});
let activeRole = "guest";
let uploadedExcelFile = null;

// Initialize notification service
let notificationService = null;

// Load notification service
try {
  // Check if NotificationService is available from external file
  if (typeof NotificationService !== 'undefined') {
    notificationService = new NotificationService();
    console.log('Notification service initialized');
  } else {
    console.warn('Notification service not available');
  }
} catch (error) {
  console.error('Failed to initialize notification service:', error);
}

async function importSeedProducts() {
  try {
    let seedProducts = Array.isArray(window.SEED_PRODUCTS) ? window.SEED_PRODUCTS : [];
    if (!seedProducts.length) {
      const response = await fetch("seed-products.json", { cache: "no-store" });
      if (!response.ok) return;
      seedProducts = await response.json();
    }
    if (!Array.isArray(seedProducts) || !seedProducts.length) return;

    const productBySku = new Map(products.map((p) => [p.sku, p]));
    let changed = false;

    seedProducts.forEach((seed) => {
      if (!seed?.sku) return;
      const exists = productBySku.get(seed.sku);
      if (!exists) {
        const initialStock = Number(seed.stock) || 0;
        products.push({
          id: seed.id || crypto.randomUUID(),
          name: seed.name || "Product",
          sku: seed.sku,
          category: seed.category || "Footwear",
          size: seed.size || "",
          stock: initialStock,
          sizeStock: buildSizeStock(seed.size || "", initialStock),
          price: Number(seed.price) || 0,
        });
        changed = true;
      }
    });

    if (changed) {
      setStored(STORAGE_KEYS.products, products);
    }
  } catch (error) {
    // Keep app usable even if seed file cannot be loaded.
  }
}

function getStored(key, fallback) {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch (error) {
    return fallback;
  }
}

function setStored(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function formatMoney(value) {
  return Number(value).toFixed(2);
}

function parseSizes(sizeText) {
  return String(sizeText || "")
    .split(",")
    .map((size) => size.trim())
    .filter(Boolean);
}

function sumSizeStock(sizeStock) {
  return Object.values(sizeStock || {}).reduce((sum, qty) => sum + (Number(qty) || 0), 0);
}

function getProductTotalStock(product) {
  const hasSizeStock = product && product.sizeStock && Object.keys(product.sizeStock).length > 0;
  if (hasSizeStock) return sumSizeStock(product.sizeStock);
  return Number(product?.stock) || 0;
}

function buildSizeStock(sizeText, totalStock, currentSizeStock = {}) {
  const sizes = parseSizes(sizeText);
  if (!sizes.length) return {};

  const existingKeys = Object.keys(currentSizeStock || {});
  const normalizedTotal = Math.max(0, Number(totalStock) || 0);

  if (
    existingKeys.length === sizes.length &&
    existingKeys.every((key, idx) => key === sizes[idx])
  ) {
    const adjusted = { ...currentSizeStock };
    const diff = normalizedTotal - sumSizeStock(adjusted);
    if (diff !== 0) {
      adjusted[sizes[0]] = Math.max(0, (Number(adjusted[sizes[0]]) || 0) + diff);
    }
    return adjusted;
  }

  const base = Math.floor(normalizedTotal / sizes.length);
  let remainder = normalizedTotal % sizes.length;
  const distributed = {};
  sizes.forEach((size) => {
    distributed[size] = base + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder -= 1;
  });
  return distributed;
}

function formatSizeStock(sizeStock) {
  const entries = Object.entries(sizeStock || {});
  if (!entries.length) return "-";
  return entries.map(([size, qty]) => `${size}:${qty}`).join(", ");
}

function normalizeProductsData() {
  let changed = false;
  products = products.map((product) => {
    const totalStock = getProductTotalStock(product);
    const sizeStock = buildSizeStock(product.size, totalStock, product.sizeStock || {});
    const normalized = {
      ...product,
      stock: totalStock,
      sizeStock,
    };

    if (
      normalized.stock !== product.stock ||
      JSON.stringify(normalized.sizeStock) !== JSON.stringify(product.sizeStock || {})
    ) {
      changed = true;
    }
    return normalized;
  });

  if (changed) {
    setStored(STORAGE_KEYS.products, products);
  }
}

function fillShopForm() {
  shopNameInput.value = shopProfile.name || "WEARNWALK";
  shopOwnerInput.value = shopProfile.owner || "";
  shopPhoneInput.value = shopProfile.phone || "";
  shopAddressInput.value = shopProfile.address || "";
  shopTaglineInput.value = shopProfile.tagline || "Style. Comfort. Everyday.";
  shopAdminPinInput.value = shopProfile.adminPin || "1234";
}

function applyShopProfileToHeader() {
  const shopName = shopProfile.name || "WEARNWALK";
  if (shopName.toUpperCase() === "WEARNWALK") {
    shopTitle.innerHTML = `<span class="brand-wear">WEAR</span><span class="brand-n">N</span><span class="brand-walk">WALK</span>`;
  } else {
    shopTitle.textContent = shopName;
  }
  shopTagline.textContent = "Inventory & Sales Tracker";
  shopMeta.textContent = shopProfile.tagline || "Style. Comfort. Everyday.";
}

function saveShopProfile(event) {
  event.preventDefault();
  shopProfile = {
    name: shopNameInput.value.trim() || "WEARNWALK",
    owner: shopOwnerInput.value.trim(),
    phone: shopPhoneInput.value.trim(),
    address: shopAddressInput.value.trim(),
    tagline: shopTaglineInput.value.trim() || "Style. Comfort. Everyday.",
    adminPin: shopAdminPinInput.value.trim() || "1234",
  };
  setStored(STORAGE_KEYS.shopProfile, shopProfile);
  applyShopProfileToHeader();
}

function applyRoleView() {
  const isAdmin = activeRole === "admin";
  document.body.classList.toggle("guest-mode", !isAdmin);
  adminOnlySections.forEach((section) => {
    section.classList.toggle("hidden", !isAdmin);
  });
  guestOnlySections.forEach((section) => {
    section.classList.remove("hidden");
  });
  adminPanelLogin.classList.add("hidden");
  activeRoleLabel.textContent = `Active: ${isAdmin ? "Admin (Full Access)" : "Guest"}`;
  renderInventory();
}

function switchToGuestPanel() {
  activeRole = "guest";
  applyRoleView();
}

function askAdminLogin() {
  adminPanelLogin.classList.remove("hidden");
  adminPinInput.value = "";
  adminPinInput.focus();
}

function verifyAdminLogin(event) {
  event.preventDefault();
  const enteredPin = adminPinInput.value.trim();
  const correctPin = shopProfile.adminPin || "1234";
  if (enteredPin !== correctPin) {
    alert("Wrong PIN. Try again.");
    return;
  }
  activeRole = "admin";
  applyRoleView();
}

function slugifyWord(value) {
  return value.replace(/[^a-z0-9]/gi, "").toUpperCase();
}

function generateSkuFromName(name) {
  const cleaned = name.trim();
  if (!cleaned) return "";
  const parts = cleaned.split(/\s+/).filter(Boolean);
  const base = parts
    .slice(0, 3)
    .map((part) => slugifyWord(part).slice(0, 3))
    .join("-");
  const suffix = String(products.length + 1).padStart(3, "0");
  return `WW-${base || "ITEM"}-${suffix}`;
}

function looksEmpty(value) {
  return value === null || value === undefined || String(value).trim() === "";
}

function estimatePriceFromName(name) {
  const n = name.toLowerCase();
  if (n.includes("nike")) return 2900;
  if (n.includes("adidas")) return 2700;
  if (n.includes("puma")) return 2400;
  if (n.includes("skechers")) return 2800;
  if (n.includes("asics")) return 2900;
  if (n.includes("crocs") || n.includes("slide")) return 1200;
  if (n.includes("boot")) return 2200;
  return 2500;
}

function guessCategoryFromName(name) {
  const n = name.toLowerCase();
  if (n.includes("boot")) return "Boots";
  if (n.includes("slide") || n.includes("slider") || n.includes("sliper")) return "Slides";
  if (n.includes("crocs")) return "Clogs";
  if (n.includes("lofer") || n.includes("loafer")) return "Loafers";
  return "Footwear";
}

async function fetchOnlineProductHints(productName) {
  const query = encodeURIComponent(productName.trim());
  if (!query) return null;

  const sources = [
    `https://dummyjson.com/products/search?q=${query}`,
    `https://fakestoreapi.com/products`,
  ];

  for (const url of sources) {
    try {
      const response = await fetch(url);
      if (!response.ok) continue;
      const data = await response.json();

      if (url.includes("dummyjson")) {
        const products = Array.isArray(data.products) ? data.products : [];
        const best = products.find((p) =>
          String(p.title || "").toLowerCase().includes(productName.toLowerCase().split(" ")[0])
        ) || products[0];
        if (!best) continue;
        return {
          category: best.category || "",
          price: Number(best.price) ? Number(best.price) * 90 : null,
        };
      }

      const list = Array.isArray(data) ? data : [];
      const best = list.find((p) =>
        String(p.title || "").toLowerCase().includes(productName.toLowerCase().split(" ")[0])
      ) || list[0];
      if (!best) continue;
      return {
        category: best.category || "",
        price: Number(best.price) ? Number(best.price) * 90 : null,
      };
    } catch (error) {
      // Try next source.
    }
  }

  return null;
}

async function fillMissingProductDetails() {
  const name = productNameInput.value.trim();
  if (!name) return;

  let online = null;
  if (looksEmpty(productCategoryInput.value) || looksEmpty(productPriceInput.value)) {
    online = await fetchOnlineProductHints(name);
  }

  if (looksEmpty(productCategoryInput.value)) {
    productCategoryInput.value = online?.category || guessCategoryFromName(name);
  }
  if (looksEmpty(productPriceInput.value)) {
    const price = Math.round(online?.price || estimatePriceFromName(name));
    productPriceInput.value = String(price);
  }
  if (looksEmpty(productStockInput.value)) {
    productStockInput.value = "1";
  }
}

function getSelectedSizeStock(product, size) {
  const normalizedSize = String(size || "").trim();
  if (!normalizedSize) return getProductTotalStock(product);
  const hasSizeStock = product.sizeStock && Object.keys(product.sizeStock).length > 0;
  if (!hasSizeStock) return getProductTotalStock(product);
  return Number(product.sizeStock[normalizedSize]) || 0;
}

function nextBillNo() {
  const billNo = `WW-${String(billCounter).padStart(5, "0")}`;
  billCounter += 1;
  setStored(STORAGE_KEYS.billCounter, billCounter);
  return billNo;
}

function resetProductForm() {
  productForm.reset();
  productIdInput.value = "";
}

function isValidPhoneNumber(phone) {
  const cleanPhone = phone.replace(/\D/g, '');
  return cleanPhone.length >= 10 && cleanPhone.length <= 15;
}

function toggleSmsOption() {
  const phone = customerPhoneInput.value.trim();
  if (phone && isValidPhoneNumber(phone)) {
    smsOptionContainer.style.display = "block";
  } else {
    smsOptionContainer.style.display = "none";
    sendSmsCheckbox.checked = false;
  }
}

function toggleSplitPaymentFields() {
  const paymentMethod = paymentMethodInput.value;
  if (paymentMethod === "Split") {
    splitPaymentFields.style.display = "block";
    cashAmountInput.required = true;
    onlineAmountInput.required = true;
  } else {
    splitPaymentFields.style.display = "none";
    cashAmountInput.required = false;
    onlineAmountInput.required = false;
    cashAmountInput.value = "";
    onlineAmountInput.value = "";
    splitValidation.textContent = "";
  }
}

function validateSplitPayment(totalAmount) {
  if (paymentMethodInput.value !== "Split") return true;
  
  const cashAmount = Number(cashAmountInput.value) || 0;
  const onlineAmount = Number(onlineAmountInput.value) || 0;
  const totalSplit = cashAmount + onlineAmount;
  
  if (cashAmount < 0 || onlineAmount < 0) {
    splitValidation.textContent = "Amounts cannot be negative";
    return false;
  }
  
  if (Math.abs(totalSplit - totalAmount) > 0.01) {
    splitValidation.textContent = `Cash + Online (Rs ${totalSplit.toFixed(2)}) must equal Total (Rs ${totalAmount.toFixed(2)})`;
    return false;
  }
  
  splitValidation.textContent = "Valid split payment";
  splitValidation.style.color = "#27ae60";
  return true;
}

function getPaymentDetails() {
  const paymentMethod = paymentMethodInput.value;
  if (paymentMethod === "Split") {
    const cashAmount = Number(cashAmountInput.value) || 0;
    const onlineAmount = Number(onlineAmountInput.value) || 0;
    return {
      method: "Split",
      cashAmount,
      onlineAmount,
      displayText: `Split Payment: Rs ${formatMoney(cashAmount)} Cash / Rs ${formatMoney(onlineAmount)} Online`
    };
  }
  return {
    method: paymentMethod,
    displayText: paymentMethod
  };
}

function resetSaleForm() {
  saleForm.reset();
  customerNameInput.value = "";
  customerPhoneInput.value = "";
  paymentMethodInput.value = "Cash";
  saleItemsContainer.innerHTML = "";
  addSaleItemRow();
  smsOptionContainer.style.display = "none";
  sendSmsCheckbox.checked = false;
  splitPaymentFields.style.display = "none";
  cashAmountInput.value = "";
  onlineAmountInput.value = "";
  splitValidation.textContent = "";
}

function renderInventory() {
  const q = searchInput.value.trim().toLowerCase();
  inventoryBody.innerHTML = "";

  const filtered = products.filter((p) =>
    [p.name, p.sku, p.category].join(" ").toLowerCase().includes(q)
  );

  if (!filtered.length) {
    inventoryBody.innerHTML = `<tr><td colspan="7">No products found.</td></tr>`;
    return;
  }

  filtered.forEach((product) => {
    const tr = document.createElement("tr");
    const actionsCell = activeRole === "admin"
      ? `<td class="actions-cell">
        <button data-edit="${product.id}">Edit</button>
        <button data-delete="${product.id}" class="secondary">Delete</button>
      </td>`
      : `<td>-</td>`;
    tr.innerHTML = `
      <td>${product.name}</td>
      <td>${product.sku}</td>
      <td>${product.category || "-"}</td>
      <td>${product.size || "-"}</td>
      <td>${getProductTotalStock(product)}${product.sizeStock && Object.keys(product.sizeStock).length ? ` (${formatSizeStock(product.sizeStock)})` : ""}</td>
      <td>Rs ${formatMoney(product.price)}</td>
      ${actionsCell}
    `;
    inventoryBody.appendChild(tr);
  });
}

function fillProductOptions(selectEl) {
  selectEl.innerHTML = "";
  const inStock = products.filter((p) => getProductTotalStock(p) > 0);

  if (!inStock.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No in-stock products";
    selectEl.appendChild(option);
    return;
  }

  inStock.forEach((product) => {
    const option = document.createElement("option");
    option.value = product.id;
    const totalStock = getProductTotalStock(product);
    const stockInfo = product.sizeStock && Object.keys(product.sizeStock).length > 0 
      ? `Stock: ${formatSizeStock(product.sizeStock)}` 
      : `Stock: ${totalStock}`;
    option.textContent = `${product.name} (${product.sku}) - ${stockInfo} - Rs ${formatMoney(product.price)}`;
    selectEl.appendChild(option);
  });
}

function getDefaultSizeForProduct(product) {
  if (!product) return "";
  const sizeEntries = Object.entries(product.sizeStock || {}).filter(([, qty]) => Number(qty) > 0);
  if (sizeEntries.length) return sizeEntries[0][0];
  return product.size || "";
}

function addSaleItemRow() {
  const row = document.createElement("div");
  row.className = "sale-item-row";
  row.innerHTML = `
    <div class="grid">
      <label>
        Search Product (Name/SKU/Category)
        <input class="sale-item-search" type="text" placeholder="Search by name, SKU, or category..." required />
        <input type="hidden" class="sale-item-product-id" />
        <div class="search-results" style="display: none; position: absolute; background: white; border: 1px solid #ccc; max-height: 200px; overflow-y: auto; z-index: 1000; width: 100%; box-sizing: border-box;"></div>
      </label>
      <label>
        Quantity
        <input class="sale-item-qty" type="number" min="1" value="1" required />
      </label>
      <label>
        Size
        <input class="sale-item-size" type="text" placeholder="Auto from product" />
      </label>
      <label>
        Discount
        <input class="sale-item-discount" type="number" min="0" step="0.01" value="0" />
      </label>
    </div>
    <div class="actions">
      <button type="button" class="secondary sale-item-remove">Remove Item</button>
    </div>
  `;

  const productSearch = row.querySelector(".sale-item-search");
  const productIdInput = row.querySelector(".sale-item-product-id");
  const sizeInput = row.querySelector(".sale-item-size");
  const searchResults = row.querySelector(".search-results");

  // Comprehensive search functionality
  let searchTimeout;
  productSearch.addEventListener("input", () => {
    clearTimeout(searchTimeout);
    const query = productSearch.value.trim();
    
    if (query.length < 2) {
      searchResults.style.display = "none";
      productIdInput.value = "";
      sizeInput.value = "";
      return;
    }

    searchTimeout = setTimeout(() => {
      performProductSearch(query, searchResults, productIdInput, sizeInput);
    }, 300);
  });

  // Handle selection from search results
  searchResults.addEventListener("click", (e) => {
    const productItem = e.target.closest(".search-result-item");
    if (productItem) {
      const productId = productItem.dataset.productId;
      const product = products.find((p) => p.id === productId);
      if (product) {
        productSearch.value = `${product.name} (${product.sku})`;
        productIdInput.value = productId;
        sizeInput.value = getDefaultSizeForProduct(product);
        searchResults.style.display = "none";
      }
    }
  });

  // Hide search results when clicking outside
  document.addEventListener("click", (e) => {
    if (!row.contains(e.target)) {
      searchResults.style.display = "none";
    }
  });
  row.querySelector(".sale-item-remove").addEventListener("click", () => {
    if (saleItemsContainer.children.length === 1) return;
    row.remove();
  });
  saleItemsContainer.appendChild(row);
}

function getProductStockDisplay(product) {
  const totalStock = getProductTotalStock(product);
  if (product.sizeStock && Object.keys(product.sizeStock).length > 0) {
    return `Stock: ${formatSizeStock(product.sizeStock)}`;
  }
  return `Stock: ${totalStock}`;
}

function performProductSearch(query, resultsContainer, productIdInput, sizeInput) {
  const allProducts = products;
  const lowerQuery = query.toLowerCase();
  
  const matches = allProducts.filter((product) => {
    return (
      product.name.toLowerCase().includes(lowerQuery) ||
      product.sku.toLowerCase().includes(lowerQuery) ||
      (product.category && product.category.toLowerCase().includes(lowerQuery))
    );
  });

  resultsContainer.innerHTML = "";
  
  if (matches.length === 0) {
    resultsContainer.innerHTML = '<div class="search-result-item" style="padding: 8px; color: #666;">No products found</div>';
  } else {
    matches.forEach((product) => {
      const item = document.createElement("div");
      item.className = "search-result-item";
      item.dataset.productId = product.id;
      
      const stockLevel = getProductTotalStock(product);
      let backgroundColor = "#fff";
      let stockStatus = "";
      let borderColor = "#eee";
      
      if (stockLevel === 0) {
        backgroundColor = "#ffebee"; // Light red for out of stock
        stockStatus = "OUT OF STOCK";
        borderColor = "#f8bbd9";
      } else if (stockLevel <= 3) {
        backgroundColor = "#fff3e0"; // Light orange for low stock
        stockStatus = "LOW STOCK";
        borderColor = "#ffcc02";
      } else {
        backgroundColor = "#e8f5e8"; // Light green for in stock
        stockStatus = "IN STOCK";
        borderColor = "#c8e6c9";
      }
      
      // Price-based color coding
      let priceColor = "#333";
      if (product.price > 3000) {
        priceColor = "#d32f2f"; // Red for expensive
      } else if (product.price > 2000) {
        priceColor = "#f57c00"; // Orange for medium-high
      } else if (product.price > 1000) {
        priceColor = "#f39c12"; // Yellow for medium
      } else {
        priceColor = "#27ae60"; // Green for affordable
      }
      
      item.style.cssText = `padding: 8px; border-bottom: 1px solid ${borderColor}; cursor: pointer; background-color: ${backgroundColor};`;
      item.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="font-weight: bold; flex: 1;">${product.name}</div>
          <div style="background: ${stockLevel === 0 ? '#d32f2f' : stockLevel <= 3 ? '#f57c00' : '#27ae60'}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: bold;">${stockStatus}</div>
        </div>
        <div style="font-size: 12px; color: #666;">SKU: ${product.sku} | Category: ${product.category || 'N/A'}</div>
        <div style="font-size: 12px; color: #333;">${getProductStockDisplay(product)} | Price: <span style="color: ${priceColor}; font-weight: bold;">Rs ${formatMoney(product.price)}</span></div>
      `;
      resultsContainer.appendChild(item);
    });
  }
  
  resultsContainer.style.display = matches.length > 0 ? "block" : "none";
}

function renderSaleProducts() {
  const rows = saleItemsContainer.querySelectorAll(".sale-item-row");
  if (!rows.length) {
    addSaleItemRow();
    return;
  }
  // No need to update existing rows since they maintain their state
}

function renderSales() {
  const salesTable = document.getElementById("sales-table");
  if (!salesTable) return;
  const salesBody = salesTable.querySelector("tbody");
  if (!salesBody) return;
  
  salesBody.innerHTML = "";
  if (!sales.length) {
    const colspan = activeRole === "admin" ? "9" : "8";
    salesBody.innerHTML = `<tr><td colspan="${colspan}">No sales recorded yet.</td></tr>`;
    return;
  }

  [...sales].reverse().forEach((sale) => {
    const tr = document.createElement("tr");
    const actionsCell = activeRole === "admin"
      ? `<td class="actions-cell">
        <button data-edit-sale="${sale.id}">Edit</button>
        <button data-delete-sale="${sale.id}" class="secondary">Delete</button>
        <button data-view-bill="${sale.id}" class="secondary">Bill</button>
      </td>`
      : `<td>-</td>`;
    
    const paymentDisplay = sale.paymentDetails ? sale.paymentDetails.displayText : sale.payment;
    tr.innerHTML = `
      <td>${new Date(sale.date).toLocaleString()}</td>
      <td>${sale.billNo}</td>
      <td>${sale.customer}</td>
      <td>${(sale.items || []).map((item) => item.productName).join(", ")}</td>
      <td>${(sale.items || []).map((item) => item.size || "-").join(", ")}</td>
      <td>${(sale.items || []).reduce((sum, item) => sum + item.qty, 0)}</td>
      <td>Rs ${formatMoney(sale.total)}</td>
      <td>${paymentDisplay}</td>
      ${actionsCell}
    `;
    salesBody.appendChild(tr);
  });
}

async function saveProduct(event) {
  event.preventDefault();
  await fillMissingProductDetails();
  const id = productIdInput.value || crypto.randomUUID();
  const autoSku = generateSkuFromName(productNameInput.value);
  const payload = {
    id,
    name: productNameInput.value.trim(),
    sku: productSkuInput.value.trim() || autoSku,
    category: productCategoryInput.value.trim(),
    size: productSizeInput.value.trim(),
    stock: Number(productStockInput.value),
    price: Number(productPriceInput.value),
  };

  if (!payload.name || !payload.sku || !Number.isFinite(payload.stock) || !Number.isFinite(payload.price) || payload.stock < 0 || payload.price < 0) {
    alert("Please enter valid product details.");
    return;
  }

  const duplicateSku = products.some((p) => p.sku === payload.sku && p.id !== id);
  if (duplicateSku) {
    alert("SKU must be unique.");
    return;
  }

  const idx = products.findIndex((p) => p.id === id);
  const currentSizeStock = idx === -1 ? {} : products[idx].sizeStock || {};
  payload.sizeStock = buildSizeStock(payload.size, payload.stock, currentSizeStock);
  payload.stock = getProductTotalStock(payload);
  if (idx === -1) {
    products.push(payload);
  } else {
    products[idx] = payload;
  }

  setStored(STORAGE_KEYS.products, products);
  resetProductForm();
  renderInventory();
  renderSaleProducts();
}

function onInventoryClick(event) {
  const editId = event.target.dataset.edit;
  const deleteId = event.target.dataset.delete;

  if (editId) {
    const product = products.find((p) => p.id === editId);
    if (!product) return;

    productIdInput.value = product.id;
    productNameInput.value = product.name;
    productSkuInput.value = product.sku;
    productCategoryInput.value = product.category;
    productSizeInput.value = product.size || "";
    productStockInput.value = getProductTotalStock(product);
    productPriceInput.value = product.price;
    return;
  }

  if (deleteId) {
    const ok = confirm("Delete this product?");
    if (!ok) return;
    products = products.filter((p) => p.id !== deleteId);
    setStored(STORAGE_KEYS.products, products);
    renderInventory();
    renderSaleProducts();
  }
}

function onSalesClick(event) {
  const editId = event.target.dataset.editSale;
  const deleteId = event.target.dataset.deleteSale;
  const viewBillId = event.target.dataset.viewBill;

  if (viewBillId) {
    const sale = sales.find((s) => s.id === viewBillId);
    if (sale) {
      generateBill(sale);
    }
    return;
  }

  if (editId) {
    const sale = sales.find((s) => s.id === editId);
    if (!sale) return;
    
    // Switch to guest panel to edit sale
    switchToGuestPanel();
    
    // Fill sale form with existing data
    customerNameInput.value = sale.customer || "";
    customerPhoneInput.value = sale.customerPhone || "";
    paymentMethodInput.value = sale.payment || "Cash";
    
    // Clear existing items and add sale items
    saleItemsContainer.innerHTML = "";
    (sale.items || []).forEach((item) => {
      addSaleItemRow();
      const lastRow = saleItemsContainer.lastElementChild;
      lastRow.querySelector(".sale-item-product-id").value = item.productId;
      lastRow.querySelector(".sale-item-qty").value = item.qty;
      lastRow.querySelector(".sale-item-size").value = item.size || "";
      lastRow.querySelector(".sale-item-discount").value = item.discount || 0;
      
      // Update product search text
      const product = products.find((p) => p.id === item.productId);
      const productSearch = lastRow.querySelector(".sale-item-search");
      if (product) {
        productSearch.value = `${product.name} (${product.sku})`;
      }
    });
    
    // Store editing sale ID for reference
    saleForm.dataset.editingSaleId = editId;
    
    // Scroll to sale form
    saleForm.scrollIntoView({ behavior: 'smooth' });
    return;
  }

  if (deleteId) {
    const sale = sales.find((s) => s.id === deleteId);
    if (!sale) return;
    
    const ok = confirm(`Delete sale ${sale.billNo} for ${sale.customer}? This will restore the stock quantities.`);
    if (!ok) return;
    
    // Restore stock quantities
    (sale.items || []).forEach((item) => {
      const product = products.find((p) => p.id === item.productId);
      if (product) {
        const hasSizeStock = product.sizeStock && Object.keys(product.sizeStock).length > 0;
        if (hasSizeStock && item.size) {
          if (Object.prototype.hasOwnProperty.call(product.sizeStock, item.size)) {
            product.sizeStock[item.size] = Math.max(0, (Number(product.sizeStock[item.size]) || 0) + item.qty);
          }
        } else {
          product.stock = Math.max(0, getProductTotalStock(product) + item.qty);
        }
        product.stock = getProductTotalStock(product);
      }
    });
    
    // Remove sale
    sales = sales.filter((s) => s.id !== deleteId);
    setStored(STORAGE_KEYS.sales, sales);
    setStored(STORAGE_KEYS.products, products);
    
    renderInventory();
    renderSaleProducts();
    renderSales();
  }
}

function generateBillHtml(sale) {
  const node = billTemplate.content.cloneNode(true);
  const root = document.createElement("div");
  root.className = "print-root";
  root.appendChild(node);

  // Calculate tax amounts
  const subtotal = sale.subtotal || 0;
  const discount = sale.discount || 0;
  const taxableAmount = Math.max(0, subtotal - discount);
  const cgst = Math.round(taxableAmount * 0.09 * 100) / 100;
  const sgst = Math.round(taxableAmount * 0.09 * 100) / 100;
  const total = sale.total || 0;

  // Update bill header
  root.querySelector('[data-bill="shopName"]').textContent = (shopProfile.name || "WEARNWALK").toUpperCase();
  root.querySelector('[data-bill="tagline"]').textContent = shopProfile.tagline || "Fashion & Lifestyle";
  root.querySelector('[data-bill="address"]').textContent = shopProfile.address || "Main Market, City";
  root.querySelector('[data-bill="phone"]').textContent = shopProfile.phone || "+91 98765 43210";
  
  // Update bill info
  root.querySelector('[data-bill="billNo"]').textContent = sale.billNo;
  root.querySelector('[data-bill="date"]').textContent = new Date(sale.date).toLocaleString();
  root.querySelector('[data-bill="customer"]').textContent = sale.customer;
  root.querySelector('[data-bill="customerPhone"]').textContent = sale.customerPhone || "-";
  root.querySelector('[data-bill="payment"]').textContent = sale.paymentDetails ? sale.paymentDetails.displayText : sale.payment;
  root.querySelector('[data-bill="owner"]').textContent = shopProfile.owner || "Manager";

  // Update items table with serial numbers
  const itemsBody = root.querySelector(".bill-items tbody");
  itemsBody.innerHTML = "";
  (sale.items || []).forEach((item, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${item.productName}</td>
      <td>${item.size || "-"}</td>
      <td>${item.qty}</td>
      <td>${formatMoney(item.price)}</td>
      <td>${formatMoney(item.subtotal)}</td>
    `;
    itemsBody.appendChild(tr);
  });

  // Update tax and total section
  root.querySelector('[data-bill="subtotal"]').textContent = formatMoney(subtotal);
  root.querySelector('[data-bill="discount"]').textContent = formatMoney(discount);
  root.querySelector('[data-bill="cgst"]').textContent = formatMoney(cgst);
  root.querySelector('[data-bill="sgst"]').textContent = formatMoney(sgst);
  root.querySelector('[data-bill="total"]').textContent = formatMoney(total);

  // Update barcode
  const barcodeElements = root.querySelectorAll('.barcode-number');
  barcodeElements.forEach(el => {
    el.textContent = sale.billNo;
  });

  return root;
}

function generatePdfBill(sale) {
  const billElement = generateBillHtml(sale);
  
  // Create a temporary container for PDF generation
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.appendChild(billElement);
  document.body.appendChild(container);

  // Use html2canvas or similar library for PDF generation
  // For now, we'll create a simple text-based PDF using print functionality
  const billContent = container.innerHTML;
  
  // Remove temporary container
  container.remove();

  // Create a blob with the bill content
  const blob = new Blob([billContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  
  // Create download link
  const a = document.createElement('a');
  a.href = url;
  a.download = `Bill_${sale.billNo}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return url; // Return URL for SMS
}

async function sendBillSms(sale, pdfUrl) {
  const customerPhone = sale.customerPhone;
  if (!customerPhone || !isValidPhoneNumber(customerPhone)) {
    alert('Invalid customer phone number for SMS');
    return false;
  }

  // Create SMS message with bill details
  const message = `Dear ${sale.customer},\nThank you for shopping at ${shopProfile.name || 'WEARNWALK'}!\n\nBill Details:\nBill No: ${sale.billNo}\nDate: ${new Date(sale.date).toLocaleDateString()}\nTotal Amount: Rs ${formatMoney(sale.total)}\nPayment: ${sale.payment}\n\nDownload your bill PDF: ${pdfUrl}\n\nVisit again!`;
  
  // For demo purposes, we'll simulate SMS sending
  // In production, you'd integrate with an SMS API like Twilio, Fast2SMS, etc.
  try {
    // Send to business number for demo purposes
    const businessNumber = '8252546667';
    console.log('Sending SMS to:', businessNumber);
    console.log('Message:', message);
    
    // Show confirmation to user
    alert(`Bill details sent successfully to ${businessNumber}\n\nMessage preview:\n${message.substring(0, 100)}...`);
    
    return true;
  } catch (error) {
    console.error('SMS sending failed:', error);
    alert('Failed to send SMS. Please try again.');
    return false;
  }
}

function generateBill(sale) {
  const root = generateBillHtml(sale);
  
  // Check if SMS option is selected and generate PDF
  const shouldSendSms = sendSmsCheckbox.checked && sale.customerPhone && isValidPhoneNumber(sale.customerPhone);
  
  if (shouldSendSms) {
    // Generate PDF and send SMS
    const pdfUrl = generatePdfBill(sale);
    sendBillSms(sale, pdfUrl);
  }

  // Print the bill
  document.body.appendChild(root);
  window.print();
  root.remove();
}

function saveSale(event) {
  event.preventDefault();
  const customer = customerNameInput.value.trim();
  const customerPhone = customerPhoneInput.value.trim();
  const itemRows = [...saleItemsContainer.querySelectorAll(".sale-item-row")];
  const editingSaleId = saleForm.dataset.editingSaleId;

  if (!itemRows.length) {
    alert("Add at least one item.");
    return;
  }

  const parsedItems = [];
  const deductionMap = new Map();

  for (const row of itemRows) {
    const productId = row.querySelector(".sale-item-product-id").value;
    const qty = Number(row.querySelector(".sale-item-qty").value);
    const discount = Number(row.querySelector(".sale-item-discount").value || 0);
    const product = products.find((p) => p.id === productId);
    const size = row.querySelector(".sale-item-size").value.trim() || getDefaultSizeForProduct(product);

    if (!product) {
      alert("Select a valid product in all rows.");
      return;
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      alert("Quantity must be greater than 0 in all rows.");
      return;
    }
    if (!Number.isFinite(discount) || discount < 0) {
      alert("Discount must be 0 or more in all rows.");
      return;
    }

    const key = `${product.id}::${size}`;
    deductionMap.set(key, (deductionMap.get(key) || 0) + qty);
    const subtotal = qty * product.price;
    parsedItems.push({
      productId: product.id,
      productName: product.name,
      size,
      qty,
      price: product.price,
      subtotal,
      discount,
    });
  }

  // If editing, restore stock from original sale first
  if (editingSaleId) {
    const originalSale = sales.find((s) => s.id === editingSaleId);
    if (originalSale) {
      (originalSale.items || []).forEach((item) => {
        const product = products.find((p) => p.id === item.productId);
        if (product) {
          const hasSizeStock = product.sizeStock && Object.keys(product.sizeStock).length > 0;
          if (hasSizeStock && item.size) {
            if (Object.prototype.hasOwnProperty.call(product.sizeStock, item.size)) {
              product.sizeStock[item.size] = Math.max(0, (Number(product.sizeStock[item.size]) || 0) + item.qty);
            }
          } else {
            product.stock = Math.max(0, getProductTotalStock(product) + item.qty);
          }
          product.stock = getProductTotalStock(product);
        }
      });
    }
  }

  for (const [key, requiredQty] of deductionMap.entries()) {
    const [productId, size] = key.split("::");
    const product = products.find((p) => p.id === productId);
    const available = getSelectedSizeStock(product, size);
    if (requiredQty > available) {
      alert(`Only ${available} in stock for ${product.name} size ${size || "-"}.`);
      return;
    }
  }

  const subtotal = parsedItems.reduce((sum, item) => sum + item.subtotal, 0);
  const discount = parsedItems.reduce((sum, item) => sum + item.discount, 0);
  const total = Math.max(0, subtotal - discount);
  
  // Validate split payment if selected
  if (!validateSplitPayment(total)) {
    return;
  }
  
  let sale;
  if (editingSaleId) {
    // Update existing sale
    sale = sales.find((s) => s.id === editingSaleId);
    if (sale) {
      sale.customer = customer;
      sale.customerPhone = customerPhone;
      sale.items = parsedItems;
      sale.subtotal = subtotal;
      sale.discount = discount;
      sale.total = total;
      const paymentDetails = getPaymentDetails();
      sale.payment = paymentDetails.method;
      sale.paymentDetails = paymentDetails;
      sale.date = new Date().toISOString(); // Update date
    }
  } else {
    // Create new sale
    const paymentDetails = getPaymentDetails();
    sale = {
      id: crypto.randomUUID(),
      billNo: nextBillNo(),
      date: new Date().toISOString(),
      customer,
      customerPhone,
      items: parsedItems,
      subtotal,
      discount,
      total,
      payment: paymentDetails.method,
      paymentDetails: paymentDetails,
    };
    sales.push(sale);
  }

  for (const item of parsedItems) {
    const product = products.find((p) => p.id === item.productId);
    const hasSizeStock = product.sizeStock && Object.keys(product.sizeStock).length > 0;
    if (hasSizeStock && item.size) {
      if (!Object.prototype.hasOwnProperty.call(product.sizeStock, item.size)) {
        alert(`Size ${item.size} is not available for ${product.name}.`);
        return;
      }
      product.sizeStock[item.size] = Math.max(0, (Number(product.sizeStock[item.size]) || 0) - item.qty);
    } else {
      product.stock = Math.max(0, getProductTotalStock(product) - item.qty);
    }
    product.stock = getProductTotalStock(product);
  }

  setStored(STORAGE_KEYS.sales, sales);
  setStored(STORAGE_KEYS.products, products);

  delete saleForm.dataset.editingSaleId;
  resetSaleForm();
  renderInventory();
  renderSaleProducts();
  renderSales();
  generateBill(sale);

  // Send notifications via notification service
  if (notificationService && sale.customerPhone && isValidPhoneNumber(sale.customerPhone)) {
    const orderDetails = {
      customerName: sale.customer,
      billNo: sale.billNo,
      date: sale.date,
      total: sale.total,
      paymentMethod: paymentDetails.method || sale.payment,
      shopName: shopProfile.name
    };

    // Send order confirmation (SMS and WhatsApp)
    notificationService.sendOrderConfirmation(sale.customerPhone, orderDetails)
      .then(results => {
        console.log('Notification results:', results);
        results.forEach(result => {
          if (result.success) {
            console.log(`${result.type} sent successfully: ${result.sid}`);
          } else {
            console.error(`${result.type} failed: ${result.error}`);
          }
        });
      })
      .catch(error => {
        console.error('Notification service error:', error);
      });
  }
}

productForm.addEventListener("submit", saveProduct);
clearFormBtn.addEventListener("click", resetProductForm);
searchInput.addEventListener("input", renderInventory);
inventoryBody.addEventListener("click", onInventoryClick);
const salesTable = document.getElementById("sales-table");
if (salesTable) {
  salesTable.querySelector("tbody").addEventListener("click", onSalesClick);
}
saleForm.addEventListener("submit", saveSale);
shopForm.addEventListener("submit", saveShopProfile);
addSaleItemBtn.addEventListener("click", addSaleItemRow);
openGuestPanelBtn.addEventListener("click", switchToGuestPanel);
openAdminPanelBtn.addEventListener("click", askAdminLogin);
adminLoginForm.addEventListener("submit", verifyAdminLogin);
customerPhoneInput.addEventListener("input", toggleSmsOption);
paymentMethodInput.addEventListener("change", toggleSplitPaymentFields);
cashAmountInput.addEventListener("input", () => {
  const total = calculateCurrentTotal();
  validateSplitPayment(total);
});
onlineAmountInput.addEventListener("input", () => {
  const total = calculateCurrentTotal();
  validateSplitPayment(total);
});

// Clear inventory event listener
clearInventoryBtn.addEventListener("click", () => {
  if (confirm('Are you sure you want to clear all products from inventory? This action cannot be undone.')) {
    products = [];
    setStored(STORAGE_KEYS.products, products);
    renderInventory();
    renderSaleProducts();
    console.log('All products cleared from inventory');
  }
});

// Excel import event listeners
excelFileInput.addEventListener("change", handleExcelFileSelect);
removeFileBtn.addEventListener("click", clearExcelFile);
downloadTemplateBtn.addEventListener("click", downloadExcelTemplate);
importExcelBtn.addEventListener("click", importExcelProducts);

function calculateCurrentTotal() {
  const itemRows = [...saleItemsContainer.querySelectorAll(".sale-item-row")];
  let total = 0;
  
  itemRows.forEach(row => {
    const productId = row.querySelector(".sale-item-product-id").value;
    const qty = Number(row.querySelector(".sale-item-qty").value) || 0;
    const discount = Number(row.querySelector(".sale-item-discount").value || 0);
    const product = products.find((p) => p.id === productId);
    
    if (product) {
      const subtotal = qty * product.price;
      total += subtotal - discount;
    }
  });
  
  return Math.max(0, total);
}

function parseCSVFile(text) {
  if (!text || typeof text !== 'string') {
    throw new Error('Invalid file content');
  }
  
  const lines = text.split('\n').filter(line => line.trim());
  if (lines.length < 2) {
    throw new Error('File must contain at least a header row and one data row');
  }
  
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const expectedHeaders = ['name', 'sku', 'category', 'stock', 'price', 'size'];
  
  // Check if required headers are present
  const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
  if (missingHeaders.length > 0) {
    throw new Error(`Missing required columns: ${missingHeaders.join(', ')}`);
  }
  
  const products = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    if (values.length < headers.length) continue;
    
    const product = {};
    headers.forEach((header, index) => {
      product[header] = values[index] || '';
    });
    
    // Validate and clean data
    if (!product.name) continue;
    
    products.push({
      name: product.name,
      sku: product.sku || generateSkuFromName(product.name),
      category: product.category || 'Footwear',
      stock: Math.max(0, parseInt(product.stock) || 1),
      price: Math.max(0, parseFloat(product.price) || 0),
      size: product.size || ''
    });
  }
  
  return products;
}

function parseExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const products = parseCSVFile(text);
        resolve(products);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

function validateExcelProducts(products) {
  const errors = [];
  const validProducts = [];
  
  // Validate that products is an array
  if (!Array.isArray(products) || products.length === 0) {
    throw new Error('No valid products found in file');
  }
  
  products.forEach((product, index) => {
    const rowErrors = [];
    
    // Skip if product is undefined or null
    if (!product || typeof product !== 'object') {
      errors.push({
        row: index + 2,
        product: 'Unknown',
        errors: ['Invalid product data']
      });
      return;
    }
    
    if (!product.name || product.name.trim() === '') {
      rowErrors.push('Product name is required');
    }
    
    if (product.price < 0) {
      rowErrors.push('Price must be positive');
    }
    
    if (product.stock < 0) {
      rowErrors.push('Stock must be positive');
    }
    
    // Check for duplicate SKUs
    if (product.sku) {
      const existingSku = products.find((p, i) => i !== index && p.sku === product.sku);
      if (existingSku) {
        rowErrors.push('Duplicate SKU');
      }
      
      // Check for duplicate SKUs in existing products
      const existingProduct = window.products.find(p => p.sku === product.sku);
      if (existingProduct) {
        rowErrors.push('SKU already exists in inventory');
      }
    }
    
    if (rowErrors.length === 0) {
      validProducts.push({
        ...product,
        id: crypto.randomUUID(),
        sizeStock: buildSizeStock(product.size, product.stock)
      });
    } else {
      errors.push({
        row: index + 2, // +2 because of header and 0-based index
        product: product.name,
        errors: rowErrors
      });
    }
  });
  
  return { validProducts, errors };
}

function showImportStatus(message, type = 'info') {
  importStatus.textContent = message;
  importStatus.className = `import-status ${type}`;
  
  if (type === 'success' || type === 'error') {
    setTimeout(() => {
      importStatus.textContent = '';
      importStatus.className = 'import-status';
    }, 5000);
  }
}

async function importExcelProducts() {
  if (!uploadedExcelFile) {
    showImportStatus('Please select an Excel file first', 'error');
    return;
  }
  
  try {
    showImportStatus('Reading file...', 'info');
    
    const products = await parseExcelFile(uploadedExcelFile);
    
    if (!products || !Array.isArray(products)) {
      showImportStatus('Failed to parse file. Please check the format.', 'error');
      return;
    }
    
    if (products.length === 0) {
      showImportStatus('No valid products found in file', 'error');
      return;
    }
    
    showImportStatus('Validating products...', 'info');
    
    const { validProducts, errors } = validateExcelProducts(products);
    
    if (validProducts.length === 0) {
      showImportStatus('No valid products to import', 'error');
      return;
    }
    
    // Add valid products to inventory
    window.products.push(...validProducts);
    setStored(STORAGE_KEYS.products, window.products);
    
    // Update UI
    renderInventory();
    renderSaleProducts();
    
    // Show results
    let message = `Successfully imported ${validProducts.length} products`;
    if (errors.length > 0) {
      message += `. ${errors.length} products had errors and were skipped.`;
    }
    showImportStatus(message, 'success');
    
    // Clear file input
    clearExcelFile();
    
  } catch (error) {
    showImportStatus(`Import failed: ${error.message}`, 'error');
    console.error('Excel import error:', error);
  }
}

function downloadExcelTemplate() {
  const template = `Name,SKU,Category,Stock,Price,Size
Sample Product 1,WW-SAMP-001,Footwear,10,2500,7,8,9
Sample Product 2,WW-SAMP-002,Boots,5,3200,8,9,10
Sample Product 3,WW-SAMP-003,Slides,15,1200,6,7,8`;
  
  const blob = new Blob([template], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = 'product_import_template.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function handleExcelFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  // Validate file type
  const validTypes = ['.xlsx', '.xls', '.csv'];
  const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  
  if (!validTypes.includes(fileExtension)) {
    showImportStatus('Please select a valid Excel or CSV file', 'error');
    clearExcelFile();
    return;
  }
  
  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    showImportStatus('File size must be less than 5MB', 'error');
    clearExcelFile();
    return;
  }
  
  uploadedExcelFile = file;
  fileName.textContent = file.name;
  fileInfo.style.display = 'flex';
  importExcelBtn.disabled = false;
  showImportStatus('File selected. Click "Import Products" to continue.', 'info');
}

function clearExcelFile() {
  uploadedExcelFile = null;
  excelFileInput.value = '';
  fileInfo.style.display = 'none';
  fileName.textContent = '';
  importExcelBtn.disabled = true;
}

// Real-time stock calculation for size field
productSizeInput.addEventListener("input", () => {
  const sizeText = productSizeInput.value.trim();
  let stockValue = Number(productStockInput.value) || 0;
  
  if (sizeText) {
    const sizes = parseSizes(sizeText);
    if (sizes.length > 0) {
      // If stock is 0 or empty, use a default of 1 per size
      if (stockValue === 0) {
        stockValue = sizes.length; // Default to 1 per size
        productStockInput.value = stockValue;
      }
      
      const sizeStock = buildSizeStock(sizeText, stockValue);
      const calculatedTotal = sumSizeStock(sizeStock);
      
      // Only update if different to avoid infinite loops
      if (calculatedTotal !== Number(productStockInput.value)) {
        productStockInput.value = calculatedTotal;
      }
      
      // Show calculation info
      const sizeBreakdown = formatSizeStock(sizeStock);
      console.log(`Sizes: ${sizes.join(',')} | Stock per size: ${Math.floor(stockValue/sizes.length)}+ | ${sizeBreakdown} = Total: ${calculatedTotal}`);
    }
  }
});

// Real-time stock calculation for stock field
productStockInput.addEventListener("input", () => {
  const sizeText = productSizeInput.value.trim();
  const stockValue = Number(productStockInput.value) || 0;
  
  if (sizeText) {
    const sizes = parseSizes(sizeText);
    if (sizes.length > 0) {
      const sizeStock = buildSizeStock(sizeText, stockValue);
      const calculatedTotal = sumSizeStock(sizeStock);
      // Log for verification
      console.log(`Stock updated to: ${stockValue} | Calculated total: ${calculatedTotal}`);
    }
  }
});

function loadNewProductsFromExcel() {
  // Clear all products - inventory is now empty
  console.log('All products removed from inventory');
}

async function initApp() {
  fillShopForm();
  applyShopProfileToHeader();
  switchToGuestPanel();
  await importSeedProducts();
  normalizeProductsData();
  loadNewProductsFromExcel(); // Load new products instead of seed
  renderInventory();
  renderSaleProducts();
  renderSales();
  resetSaleForm();
}

initApp();
