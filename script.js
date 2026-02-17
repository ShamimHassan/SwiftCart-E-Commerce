// FakeStore API endpoints
const API_BASE = 'https://fakestoreapi.com';
const ENDPOINTS = {
  allProducts: `${API_BASE}/products`,
  categories: `${API_BASE}/products/categories`,
  productsByCategory: (category) => `${API_BASE}/products/category/${category}`,
  productDetail: (id) => `${API_BASE}/products/${id}`
};

// Global State
let allProducts = [];
let selectedCategory = 'all';
let cart = [];
let currentProduct = null;
let currentQuantity = 1;

// LocalStorage Keys
const CART_STORAGE_KEY = 'swiftcart-cart';

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  loadCart();
  loadTrendingProducts();
  loadCategories();
  // Products only load when user clicks on Products menu section
  updateCartCount();
  
  // Load products when Products section comes into view
  const productsSection = document.getElementById('products');
  if (productsSection) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !allProducts.length) {
          loadAllProducts();
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    observer.observe(productsSection);
  }
});

// ============================================
// API CALLS
// ============================================

async function fetchData(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch');
    return await response.json();
  } catch (error) {
    console.error('Error fetching data:', error);
    return null;
  }
}

async function loadTrendingProducts() {
  showLoader('trendingLoader');
  const products = await fetchData(ENDPOINTS.allProducts);
  
  if (products) {
    // Sort by rating and get top 3
    const trending = products
      .sort((a, b) => (b.rating?.rate || 0) - (a.rating?.rate || 0))
      .slice(0, 3);
    
    displayTrendingProducts(trending);
  }
  
  hideLoader('trendingLoader');
}

async function loadCategories() {
  const categories = await fetchData(ENDPOINTS.categories);
  
  if (categories && Array.isArray(categories)) {
    displayCategories(categories);
  }
}

async function loadAllProducts() {
  showLoader('productsLoader');
  const products = await fetchData(ENDPOINTS.allProducts);
  
  if (products) {
    allProducts = products;
    displayProducts(allProducts);
  }
  
  hideLoader('productsLoader');
}

async function loadProductsByCategory(category) {
  showLoader('productsLoader');
  let products;
  
  if (category === 'all') {
    products = await fetchData(ENDPOINTS.allProducts);
  } else {
    products = await fetchData(ENDPOINTS.productsByCategory(category));
  }
  
  if (products) {
    displayProducts(products);
  }
  
  hideLoader('productsLoader');
}

// ============================================
// DISPLAY FUNCTIONS
// ============================================

function displayTrendingProducts(products) {
  const container = document.getElementById('trendingProducts');
  container.innerHTML = products.map(product => createProductCard(product)).join('');
}

function displayCategories(categories) {
  const container = document.getElementById('categoryButtons');
  
  const categoryHTML = categories.map(category => {
    // Escape quotes for onclick handler - use a data attribute approach instead
    return `
      <button 
        class="btn btn-sm md:btn-md btn-outline category-btn capitalize" 
        data-category="${category}"
      >
        ${category}
      </button>
    `;
  }).join('');
  
  container.innerHTML = categoryHTML;
  
  // Add event listeners using data attributes instead of onclick
  document.querySelectorAll('#categoryButtons .category-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const category = this.getAttribute('data-category');
      filterByCategory(category);
    });
  });
}

function displayProducts(products) {
  const grid = document.getElementById('productsGrid');
  
  if (products.length === 0) {
    grid.innerHTML = '<p class="col-span-full text-center text-gray-600">No products found</p>';
    return;
  }
  
  grid.innerHTML = products.map(product => createProductCard(product)).join('');
}

function createProductCard(product) {
  const rating = product.rating?.rate || 0;
  const stars = createStarRating(rating);
  
  return `
    <div class="card bg-white shadow-md hover:shadow-lg transition-shadow">
      <div class="product-image-container">
        <img src="${product.image}" alt="${product.title}">
      </div>
      <div class="card-body">
        <div class="product-meta-row flex items-center justify-between mb-2">
          <span class="badge rounded-md bg-indigo-800/20 capitalize">${product.category}</span>
          <span class="flex items-center gap-1 text-gray-600 text-sm">
            <i class="fas fa-star text-yellow-400"></i>
            ${rating} <span class="ml-1">(${product.rating?.count || 0})</span>
          </span>
        </div>
        <h2 class="card-title text-lg line-clamp-2 mb-2">${product.title}</h2>
        <div class="text-xl font-bold text-primary mb-2">$${product.price.toFixed(2)}</div>
        <div class="card-actions flex justify-between">
          <button class="btn btn-outline btn-sm" onclick="openProductModal(${product.id})">Details</button>
          <button class="btn btn-primary btn-sm" onclick="addToCart(${product.id}, '${product.title}', ${product.price})"><i class="fa-solid fa-cart-shopping"></i> Add</button>
        </div>
      </div>
    </div>
  `;
}

function createStarRating(rating) {
  let stars = '';
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 !== 0;
  
  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      stars += '<i class="fas fa-star text-yellow-400"></i>';
    } else if (i === fullStars && hasHalfStar) {
      stars += '<i class="fas fa-star-half-alt text-yellow-400"></i>';
    } else {
      stars += '<i class="far fa-star text-gray-300"></i>';
    }
  }
  
  return stars;
}

// ============================================
// CATEGORY FILTERING
// ============================================

function filterByCategory(category) {
  selectedCategory = category;
  
  // Update active state for all category buttons
  document.querySelectorAll('.category-btn').forEach(btn => {
    btn.classList.remove('active');
    const btnCategory = btn.getAttribute('data-category');
    if (btnCategory === category) {
      btn.classList.add('active');
    }
  });
  
  // Load products for the selected category
  loadProductsByCategory(category);
}

// ============================================
// MODAL FUNCTIONS
// ============================================

async function openProductModal(productId) {
  const product = await fetchData(ENDPOINTS.productDetail(productId));
  
  if (product) {
    currentProduct = product;
    currentQuantity = 1;
    
    // Format category name (capitalize first letter of each word)
    const categoryName = product.category
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    // Update modal content
    document.getElementById('modalTitle').textContent = product.title;
    document.getElementById('modalImage').src = product.image;
    document.getElementById('modalCategory').textContent = categoryName;
    document.getElementById('modalDescription').textContent = product.description;
    document.getElementById('modalPrice').textContent = product.price.toFixed(2);
    document.getElementById('modalRatingValue').textContent = 
      `${product.rating?.rate || 0}/5 (${product.rating?.count || 0} reviews)`;
    
    // Display rating stars
    const ratingContainer = document.getElementById('modalRating');
    ratingContainer.innerHTML = createStarRating(product.rating?.rate || 0);
    
    // Reset quantity
    document.getElementById('quantityInput').value = '1';
    
    // Show modal
    document.getElementById('productModal').showModal();
  }
}

function increaseQuantity() {
  currentQuantity++;
  document.getElementById('quantityInput').value = currentQuantity;
}

function decreaseQuantity() {
  if (currentQuantity > 1) {
    currentQuantity--;
    document.getElementById('quantityInput').value = currentQuantity;
  }
}

function addToCartFromModal() {
  if (currentProduct) {
    for (let i = 0; i < currentQuantity; i++) {
      addToCart(currentProduct.id, currentProduct.title, currentProduct.price);
    }
    document.getElementById('productModal').close();
    showNotification(`Added ${currentQuantity} item(s) to cart!`);
  }
}

// ============================================
// CART FUNCTIONS
// ============================================

function addToCart(productId, title, price) {
  const cartItem = {
    id: productId,
    title: title,
    price: price,
    quantity: 1,
    addedAt: Date.now()
  };
  
  // Check if product already exists in cart
  const existingItem = cart.find(item => item.id === productId);
  
  if (existingItem) {
    existingItem.quantity++;
  } else {
    cart.push(cartItem);
  }
  
  saveCart();
  updateCartCount();
  showNotification(`${title} added to cart!`);
}

function removeFromCart(productId) {
  cart = cart.filter(item => item.id !== productId);
  saveCart();
  updateCartCount();
  displayCartItems();
}

function updateCartCount() {
  const count = cart.reduce((total, item) => total + item.quantity, 0);
  document.getElementById('cartCount').textContent = count;
}

function toggleCart() {
  displayCartItems();
  document.getElementById('cartModal').showModal();
}

function displayCartItems() {
  const container = document.getElementById('cartItems');
  const emptyMessage = document.getElementById('emptyCartMessage');
  const summary = document.getElementById('cartSummary');
  
  if (cart.length === 0) {
    container.innerHTML = '';
    emptyMessage.style.display = 'block';
    summary.style.display = 'none';
    return;
  }
  
  emptyMessage.style.display = 'none';
  summary.style.display = 'block';
  
  container.innerHTML = cart.map(item => `
    <div class="flex justify-between items-center p-3 bg-gray-100 rounded-lg">
      <div>
        <p class="font-semibold line-clamp-1">${item.title}</p>
        <p class="text-sm text-gray-600">$${item.price.toFixed(2)} × ${item.quantity}</p>
      </div>
      <div class="text-right">
        <p class="font-bold">$${(item.price * item.quantity).toFixed(2)}</p>
        <button class="btn btn-xs btn-error mt-1" onclick="removeFromCart(${item.id})">
          Remove
        </button>
      </div>
    </div>
  `).join('');
  
  updateCartSummary();
}

function updateCartSummary() {
  const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  const tax = subtotal * 0.1; // 10% tax
  const total = subtotal + tax;
  
  document.getElementById('subtotal').textContent = `$${subtotal.toFixed(2)}`;
  document.getElementById('cartTotal').textContent = `$${total.toFixed(2)}`;
}

// ============================================
// STORAGE FUNCTIONS
// ============================================

function saveCart() {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
}

function loadCart() {
  const saved = localStorage.getItem(CART_STORAGE_KEY);
  if (saved) {
    cart = JSON.parse(saved);
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function showLoader(id) {
  const element = document.getElementById(id);
  if (element) element.style.display = 'flex';
}

function hideLoader(id) {
  const element = document.getElementById(id);
  if (element) element.style.display = 'none';
}

function showNotification(message) {
  // Create a simple toast notification
  const toast = document.createElement('div');
  toast.className = 'toast toast-top toast-start';
  toast.innerHTML = `
    <div class="alert alert-success">
      <span>${message}</span>
    </div>
  `;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 3000);
}