
const API = {
    products: "/api/products",
    purchase: "/api/vending/purchase",
    summary: "/api/admin/summary",
    transactions: "/api/admin/transactions"
};

let products = [];
let cart = [];

// ------------------------------
// API HELPER
// ------------------------------

async function apiRequest(url, options = {}) {
    const response = await fetch(url, {
        headers: {
            "Content-Type": "application/json",
            ...options.headers
        },
        ...options
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.error || "Something went wrong.");
    }

    return data;
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function formatCurrency(amount) {
    return "₹" + Number(amount || 0).toFixed(2);
}

// ------------------------------
// CUSTOMER PAGE
// ------------------------------

async function loadProducts() {
    try {
        products = await apiRequest(API.products);
        renderProducts();
    } catch (error) {
        document.getElementById("productGrid").innerHTML =
            `<p>Unable to load products: ${escapeHTML(error.message)}</p>`;
    }
}

function renderProducts() {
    const grid = document.getElementById("productGrid");

    document.getElementById("productCount").textContent =
        `${products.length} products`;

    if (products.length === 0) {
        grid.innerHTML = "<p>No products available.</p>";
        return;
    }

    grid.innerHTML = products.map(product => {
        const unavailable = product.stock <= 0;
        const lowStock = product.lowStock;

        return `
            <div class="product-card">
                <div class="product-image">
                    <img
                        src="${escapeHTML(product.imageUrl)}"
                        alt="${escapeHTML(product.name)}"
                        onerror="this.style.display='none'"
                    >
                </div>

                <div class="product-info">
                    <span class="product-category">
                        ${escapeHTML(product.category)}
                    </span>

                    <h3>${escapeHTML(product.name)}</h3>

                    <p class="product-description">
                        ${escapeHTML(product.description)}
                    </p>

                    <div class="product-bottom">
                        <span class="product-price">
                            ${formatCurrency(product.price)}
                        </span>

                        <button
                            class="add-btn"
                            onclick="addToCart(${product.id})"
                            ${unavailable ? "disabled" : ""}
                        >
                            ${unavailable ? "Out of stock" : " + Add"}
                        </button>
                    </div>

                    <p class="stock-label ${lowStock ? "low" : ""}">
                        ${unavailable
                            ? "Currently unavailable"
                            : `${product.stock} units available`}
                    </p>
                </div>
            </div>
        `;
    }).join("");
}

// ------------------------------
// SHOPPING CART
// ------------------------------

function addToCart(productId) {
    const product = products.find(p => p.id === productId);

    if (!product || product.stock <= 0) {
        return;
    }

    const existingItem = cart.find(item => item.id === productId);

    if (existingItem) {
        if (existingItem.quantity >= product.stock) {
            alert("Maximum available stock reached.");
            return;
        }

        existingItem.quantity++;
    } else {
        cart.push({
            ...product,
            quantity: 1
        });
    }

    renderCart();
}

function changeQuantity(productId, amount) {
    const item = cart.find(p => p.id === productId);
    const product = products.find(p => p.id === productId);

    if (!item || !product) return;

    const newQuantity = item.quantity + amount;

    if (newQuantity <= 0) {
        cart = cart.filter(p => p.id !== productId);
    } else if (newQuantity <= product.stock) {
        item.quantity = newQuantity;
    } else {
        alert("Not enough stock available.");
    }

    renderCart();
}

function getCartTotal() {
    return cart.reduce(
        (total, item) => total + item.price * item.quantity,
        0
    );
}

function renderCart() {
    const container = document.getElementById("cartItems");
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);

    document.getElementById("cartCount").textContent = count;
    document.getElementById("cartTotal").textContent =
        formatCurrency(getCartTotal());

    document.getElementById("checkoutBtn").disabled =
        cart.length === 0;

    if (cart.length === 0) {
        container.innerHTML = `
            <div class="empty-cart">
                <span>🛒</span>
                <p>Your cart is empty</p>
                <small>Add something delicious!</small>
            </div>
        `;
        return;
    }

    container.innerHTML = cart.map(item => `
        <div class="cart-item">
            <div>
                <h4>${escapeHTML(item.name)}</h4>
                <small>
                    ${formatCurrency(item.price * item.quantity)}
                </small>
            </div>

            <div class="quantity-controls">
                <button onclick="changeQuantity(${item.id}, -1)">−</button>
                <strong>${item.quantity}</strong>
                <button onclick="changeQuantity(${item.id}, 1)">+</button>
            </div>
        </div>
    `).join("");
}

// ------------------------------
// CHECKOUT AND PAYMENT
// ------------------------------

function openCheckout() {
    if (cart.length === 0) return;

    document.getElementById("checkoutTotal").textContent =
        formatCurrency(getCartTotal());

    document.getElementById("paymentMessage").innerHTML = "";

    document.getElementById("cashReceived").value = "";

    document.getElementById("checkoutModal").classList.remove("hidden");

    toggleCashInput();
}

function closeCheckout() {
    document.getElementById("checkoutModal").classList.add("hidden");
}

function toggleCashInput() {
    const paymentType = document.getElementById("paymentType").value;

    document.getElementById("cashInputGroup").style.display =
        paymentType === "CASH" ? "block" : "none";
}

async function completePurchase() {
    if (cart.length === 0) return;

    const paymentType = document.getElementById("paymentType").value;
    const totalAmount = getCartTotal();

    const cashReceived = paymentType === "CASH"
        ? Number(document.getElementById("cashReceived").value)
        : 0;

    if (paymentType === "CASH" &&
        (!Number.isFinite(cashReceived) || cashReceived < totalAmount)) {

        alert("Please enter sufficient cash.");
        return;
    }

    const button = document.querySelector(
        "#checkoutModal .primary-btn"
    );

    const message = document.getElementById("paymentMessage");

    button.disabled = true;
    button.textContent = "Processing...";

    try {
        let totalChange = 0;

        // Process each cart item separately.
        // Extra cash is assigned to the first transaction.
        for (let i = 0; i < cart.length; i++) {
            const item = cart[i];

            const itemTotal = item.price * item.quantity;

            const itemCash = paymentType === "CASH"
                ? itemTotal + (i === 0 ? cashReceived - totalAmount : 0)
                : 0;

            const result = await apiRequest(API.purchase, {
                method: "POST",
                body: JSON.stringify({
                    productId: item.id,
                    quantity: item.quantity,
                    paymentType: paymentType,
                    cashReceived: itemCash
                })
            });

            totalChange += Number(result.change || 0);
        }

        message.innerHTML = `
            <div style="color:#285b45; background:#edf6e9; padding:16px; border-radius:10px;">
                <h3>✓ Purchase successful!</h3>
                <p>Your products are being dispensed.</p>
                <p>Total paid: <strong>${formatCurrency(totalAmount)}</strong></p>
                ${paymentType === "CASH"
                    ? `<p>Change returned: <strong>${formatCurrency(totalChange)}</strong></p>`
                    : `<p>UPI payment simulated successfully.</p>`}
                <p>Thank you for shopping with VENDORA!</p>
            </div>
        `;

        cart = [];

        await loadProducts();
        renderCart();

        await loadAdminData();

        button.textContent = "Purchase complete";

        setTimeout(() => {
            closeCheckout();
            button.textContent = "Pay now";
            button.disabled = false;
        }, 3000);

    } catch (error) {
        message.innerHTML = `
            <p style="color:#c65b4a;">
                Payment error: ${escapeHTML(error.message)}
            </p>
            <p>Please check your purchase before trying again.</p>
        `;

        // Refresh stock because an earlier cart item may have
        // been purchased before a later item failed.
        await loadProducts();
        renderCart();

        button.disabled = false;
        button.textContent = "Pay now";
    }
}

// ------------------------------
// PAGE NAVIGATION
// ------------------------------

function showPage(page) {
    const customerPage = document.getElementById("customerPage");
    const adminPage = document.getElementById("adminPage");

    const customerTab = document.getElementById("customerTab");
    const adminTab = document.getElementById("adminTab");

    if (page === "customer") {
        customerPage.classList.remove("hidden");
        adminPage.classList.add("hidden");

        customerTab.classList.add("active");
        adminTab.classList.remove("active");

        loadProducts();
    } else {
        customerPage.classList.add("hidden");
        adminPage.classList.remove("hidden");

        customerTab.classList.remove("active");
        adminTab.classList.add("active");

        loadAdminData();
    }
}

// ------------------------------
// ADMIN DASHBOARD
// ------------------------------

async function loadAdminData() {
    try {
        const [summary, transactions] = await Promise.all([
            apiRequest(API.summary),
            apiRequest(API.transactions)
        ]);

        products = await apiRequest(API.products);

        renderSummary(summary);
        renderSalesChart(summary.dailySales || []);
        renderPopularProducts(summary.popularProducts || []);
        renderInventory();
        renderTransactions(transactions);

    } catch (error) {
        console.error("Admin dashboard error:", error);
        alert("Unable to load admin dashboard: " + error.message);
    }
}

function renderSummary(summary) {
    document.getElementById("totalSales").textContent =
        formatCurrency(summary.totalSales);

    document.getElementById("totalTransactions").textContent =
        summary.totalTransactions;

    document.getElementById("totalProducts").textContent =
        summary.totalProducts;

    document.getElementById("lowStock").textContent =
        summary.lowStockProducts;
}

// ------------------------------
// SALES CHART
// ------------------------------

function renderSalesChart(dailySales) {
    const container = document.getElementById("salesChart");

    const maximum = Math.max(
        ...dailySales.map(item => Number(item.sales)),
        1
    );

    container.innerHTML = dailySales.map(item => {
        const value = Number(item.sales);

        const height = value === 0
            ? 3
            : Math.max((value / maximum) * 100, 5);

        return `
            <div class="chart-column">
                <small>${formatCurrency(value)}</small>
                <div
                    class="chart-bar"
                    style="height:${height}%"
                    title="${formatCurrency(value)}"
                ></div>
                <span>${escapeHTML(item.day)}</span>
            </div>
        `;
    }).join("");
}

// ------------------------------
// POPULAR PRODUCTS
// ------------------------------

function renderPopularProducts(popularProducts) {
    const container = document.getElementById("popularProducts");

    if (popularProducts.length === 0) {
        container.innerHTML = "<p>No sales recorded yet.</p>";
        return;
    }

    container.innerHTML = popularProducts.map((item, index) => `
        <div class="popular-item">
            <span>${index + 1}. ${escapeHTML(item.name)}</span>
            <strong>${item.quantity} sold</strong>
        </div>
    `).join("");
}

// ------------------------------
// INVENTORY MANAGEMENT
// ------------------------------

function renderInventory() {
    const container = document.getElementById("inventoryTable");

    if (products.length === 0) {
        container.innerHTML = "<p>No products available.</p>";
        return;
    }

    container.innerHTML = `
        <table class="inventory-table">
            <thead>
                <tr>
                    <th>Product</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>

            <tbody>
                ${products.map(product => `
                    <tr>
                        <td>${escapeHTML(product.name)}</td>
                        <td>${formatCurrency(product.price)}</td>
                        <td>${product.stock}</td>
                        <td>
                            <span class="${product.lowStock ? "low-stock-tag" : ""}">
                                ${product.lowStock ? "Low stock" : "Available"}
                            </span>
                        </td>
                        <td>
                            <button
                                class="table-action"
                                onclick="editProduct(${product.id})"
                            >Edit</button>

                            <button
                                class="table-action"
                                onclick="updateProductStock(${product.id})"
                            >Stock</button>

                            <button
                                class="table-action delete"
                                onclick="deleteProduct(${product.id})"
                            >Delete</button>
                        </td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;
}

// ------------------------------
// ADD AND EDIT PRODUCTS
// ------------------------------

function openProductForm(product = null) {
    document.getElementById("productForm").reset();

    document.getElementById("editProductId").value =
        product ? product.id : "";

    document.getElementById("productFormTitle").textContent =
        product ? "Edit product" : "Add product";

    if (product) {
        document.getElementById("productName").value = product.name;
        document.getElementById("productDescription").value = product.description;
        document.getElementById("productCategory").value = product.category;
        document.getElementById("productPrice").value = product.price;
        document.getElementById("productImage").value = product.imageUrl;
        document.getElementById("productStock").value = product.stock;
        document.getElementById("productThreshold").value =
            product.lowStockThreshold;
    }

    document.getElementById("productModal").classList.remove("hidden");
}

function closeProductForm() {
    document.getElementById("productModal").classList.add("hidden");
}

function editProduct(productId) {
    const product = products.find(p => p.id === productId);

    if (product) {
        openProductForm(product);
    }
}

document.getElementById("productForm").addEventListener("submit", async event => {
    event.preventDefault();

    const id = document.getElementById("editProductId").value;

    const product = {
        name: document.getElementById("productName").value.trim(),
        description: document.getElementById("productDescription").value.trim(),
        category: document.getElementById("productCategory").value.trim(),
        price: Number(document.getElementById("productPrice").value),
        imageUrl: document.getElementById("productImage").value.trim(),
        stock: Number(document.getElementById("productStock").value),
        lowStockThreshold: Number(
            document.getElementById("productThreshold").value
        )
    };

    try {
        if (id) {
            await apiRequest(`${API.products}/${id}`, {
                method: "PUT",
                body: JSON.stringify({
                    id: Number(id),
                    ...product
                })
            });
        } else {
            await apiRequest(API.products, {
                method: "POST",
                body: JSON.stringify(product)
            });
        }

        closeProductForm();

        await loadProducts();
        await loadAdminData();

        alert(id ? "Product updated successfully!" : "Product added successfully!");

    } catch (error) {
        alert(error.message);
    }
});

// ------------------------------
// UPDATE STOCK
// ------------------------------

async function updateProductStock(productId) {
    const product = products.find(p => p.id === productId);

    if (!product) return;

    const newStock = prompt(
        `Enter new stock quantity for ${product.name}:`,
        product.stock
    );

    if (newStock === null) return;

    const quantity = Number(newStock);

    if (!Number.isInteger(quantity) || quantity < 0) {
        alert("Please enter a valid non-negative whole number.");
        return;
    }

    try {
        await apiRequest(`${API.products}/${productId}`, {
            method: "PUT",
            body: JSON.stringify({
                ...product,
                stock: quantity
            })
        });

        await loadProducts();
        await loadAdminData();

        alert("Stock updated successfully!");

    } catch (error) {
        alert(error.message);
    }
}

// ------------------------------
// DELETE PRODUCT
// ------------------------------

async function deleteProduct(productId) {
    const product = products.find(p => p.id === productId);

    if (!product) return;

    if (!confirm(`Delete ${product.name}?`)) return;

    try {
        await apiRequest(`${API.products}/${productId}`, {
            method: "DELETE"
        });

        cart = cart.filter(item => item.id !== productId);

        await loadProducts();
        renderCart();
        await loadAdminData();

        alert("Product deleted successfully!");

    } catch (error) {
        alert(error.message);
    }
}

// ------------------------------
// TRANSACTION HISTORY
// ------------------------------

function renderTransactions(transactions) {
    const container = document.getElementById("transactionTable");

    if (transactions.length === 0) {
        container.innerHTML = "<p>No transactions recorded yet.</p>";
        return;
    }

    container.innerHTML = `
        <table class="transaction-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Product</th>
                    <th>Quantity</th>
                    <th>Amount</th>
                    <th>Payment</th>
                    <th>Status</th>
                </tr>
            </thead>

            <tbody>
                ${[...transactions].reverse().map(transaction => `
                    <tr>
                        <td>#${transaction.id}</td>
                        <td>${escapeHTML(transaction.productName)}</td>
                        <td>${transaction.quantity}</td>
                        <td>${formatCurrency(transaction.totalAmount)}</td>
                        <td>${escapeHTML(transaction.paymentMethod)}</td>
                        <td>
                            <span class="success-tag">
                                ${escapeHTML(transaction.status)}
                            </span>
                        </td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;
}

// ------------------------------
// INITIALISE WEBSITE
// ------------------------------

async function initialiseApp() {
    renderCart();
    await loadProducts();
}

initialiseApp();
