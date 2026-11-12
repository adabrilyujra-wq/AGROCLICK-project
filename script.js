/* ===== Tema claro / oscuro ===== */
const $ = (sel) => document.querySelector(sel);
const KEY_THEME = 'theme';

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.setAttribute('data-bs-theme', theme);
  $('#themeIcon').className = theme === 'dark' ? 'bi bi-sun-fill' : 'bi bi-moon-stars-fill';
  try { localStorage.setItem(KEY_THEME, theme); } catch {}
}

let savedTheme = null;
try { savedTheme = localStorage.getItem(KEY_THEME); } catch {}
applyTheme(savedTheme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));

$('#themeToggle').addEventListener('click', () => {
  applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
});

/* ===== Navegación entre vistas ===== */
const VIEWS = ['inicio', 'productos', 'guia', 'admin'];

function showView(name) {
  if (!VIEWS.includes(name)) name = 'inicio';
  VIEWS.forEach((v) => { $('#view-' + v).hidden = v !== name; });
  document.querySelectorAll('.nav-links a').forEach((a) => {
    a.classList.toggle('active', a.dataset.link === name);
  });
  $('#navLinks').classList.remove('open');
  window.scrollTo({ top: 0 });
}
window.addEventListener('hashchange', () => showView(location.hash.slice(1)));
$('#menuToggle').addEventListener('click', () => $('#navLinks').classList.toggle('open'));

/* ===== Datos ===== */
const CATEGORIES = [];            // Ej: ['Plantas', 'Semillas', 'Abonos']
const KEY_PRODUCTS = 'productos';
const KEY_CART = 'carrito';

const read = (key) => {
  try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; }
};
const write = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
};

let items = read(KEY_PRODUCTS);   // productos
let cart = read(KEY_CART);        // carrito
let activeFilter = 'Todos';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => 'Bs. ' + Number(n).toFixed(2);

/* ===== Vista de clientes ===== */
function productCard(p) {
  const agotado = p.stock <= 0;
  return `<article class="product-card">
    <div class="product-img"></div>
    <div class="product-body">
      <span class="tag">${esc(p.category || '')}</span>
      <h3>${esc(p.name)}</h3>
      <p>${esc(p.desc || '')}</p>
      <div class="product-foot">
        <span class="price">${money(p.price)}</span>
        <button class="btn-main btn-small" data-add="${p.id}" ${agotado ? 'disabled' : ''}>
          ${agotado ? 'Agotado' : 'Agregar'}
        </button>
      </div>
    </div>
  </article>`;
}

function renderClient() {
  // Categorías
  $('#categoryGrid').innerHTML = CATEGORIES.map((c) => `
    <div class="cat-card" data-cat="${esc(c)}" tabindex="0" role="button"><h3>${esc(c)}</h3></div>
  `).join('');

  // Destacados
  $('#featuredGrid').innerHTML = items.slice(0, 4).map(productCard).join('');

  // Filtros
  $('#filterChips').innerHTML = ['Todos', ...CATEGORIES].map((n) =>
    `<button class="fchip ${n === activeFilter ? 'active' : ''}" data-filter="${esc(n)}">${esc(n)}</button>`
  ).join('');

  // Catálogo con búsqueda
  const q = $('#searchInput').value.trim().toLowerCase();
  const list = items.filter((p) =>
    (activeFilter === 'Todos' || p.category === activeFilter) &&
    (p.name + ' ' + (p.desc || '')).toLowerCase().includes(q)
  );
  $('#productGrid').innerHTML = list.map(productCard).join('');
}

$('#searchInput').addEventListener('input', renderClient);

document.addEventListener('click', (e) => {
  const chip = e.target.closest('[data-filter]');
  if (chip) { activeFilter = chip.dataset.filter; renderClient(); return; }

  const cat = e.target.closest('[data-cat]');
  if (cat) { activeFilter = cat.dataset.cat; location.hash = '#productos'; renderClient(); return; }

  const add = e.target.closest('[data-add]');
  if (add) { addToCart(Number(add.dataset.add)); return; }

  const qty = e.target.closest('[data-qty]');
  if (qty) { changeQty(Number(qty.dataset.qty), Number(qty.dataset.d)); return; }

  const rm = e.target.closest('[data-remove]');
  if (rm) { removeFromCart(Number(rm.dataset.remove)); }
});

/* ===== Carrito ===== */
function saveCart() {
  write(KEY_CART, cart);
  renderCart();
}

function addToCart(id) {
  const p = items.find((x) => x.id === id);
  if (!p) { alert('No se encontró el producto'); return; }

  const inCart = cart.find((x) => x.id === id);
  if ((inCart ? inCart.qty : 0) >= p.stock) {
    alert('No hay más stock disponible');
    return;
  }

  if (inCart) inCart.qty++;
  else cart.push({ id: p.id, name: p.name, price: Number(p.price), qty: 1 });

  saveCart();
}

function changeQty(id, d) {
  const c = cart.find((x) => x.id === id);
  const p = items.find((x) => x.id === id);
  if (!c) return;

  if (d > 0 && p && c.qty >= p.stock) {
    alert('No hay más stock disponible');
    return;
  }

  c.qty += d;
  if (c.qty <= 0) cart = cart.filter((x) => x.id !== id);
  saveCart();
}

function removeFromCart(id) {
  cart = cart.filter((x) => x.id !== id);
  saveCart();
}

function cartTotal() {
  return cart.reduce((sum, p) => sum + p.price * p.qty, 0);
}

function renderCart() {
  $('#tablaCarrito').innerHTML = cart.length
    ? cart.map((p) => `
      <tr>
        <td>${esc(p.name)}</td>
        <td>${money(p.price)}</td>
        <td>
          <div class="qty">
            <button class="act" data-qty="${p.id}" data-d="-1" aria-label="Restar">-</button>
            <span>${p.qty}</span>
            <button class="act" data-qty="${p.id}" data-d="1" aria-label="Sumar">+</button>
          </div>
        </td>
        <td>${money(p.price * p.qty)}</td>
        <td><button class="act del" data-remove="${p.id}" aria-label="Quitar"><i class="bi bi-x-lg"></i></button></td>
      </tr>`).join('')
    : '<tr><td colspan="5" class="cart-empty">El carrito está vacío</td></tr>';

  $('#total').textContent = 'Total: ' + money(cartTotal());
  $('#cartCount').textContent = cart.reduce((n, p) => n + p.qty, 0);
}

$('#btnVaciar').addEventListener('click', () => {
  if (cart.length === 0) { alert('El carrito ya está vacío'); return; }
  if (confirm('¿Deseas vaciar el carrito?')) {
    cart = [];
    saveCart();
  }
});

$('#btnComprar').addEventListener('click', () => {
  if (cart.length === 0) { alert('El carrito está vacío'); return; }
  if (!confirm('¿Confirmas la compra por ' + money(cartTotal()) + '?')) return;

  // Descontar el stock de lo comprado
  items = items.map((p) => {
    const c = cart.find((x) => x.id === p.id);
    return c ? { ...p, stock: Math.max(0, p.stock - c.qty) } : p;
  });
  cart = [];

  write(KEY_PRODUCTS, items);
  write(KEY_CART, cart);
  renderAll();
  alert('¡Compra realizada con éxito!');
});

/* ===== Admin: tabla ===== */
function renderTable() {
  $('#adminTable').innerHTML = items.map((p) => `
    <tr>
      <td>${esc(p.name)}</td>
      <td><span class="pill">${esc(p.category || '')}</span></td>
      <td>${money(p.price)}</td>
      <td><span class="pill ${p.stock <= 5 ? 'low' : ''}">${p.stock}</span></td>
      <td>
        <div class="row-actions">
          <button class="act" data-edit="${p.id}" aria-label="Editar"><i class="bi bi-pencil"></i></button>
          <button class="act del" data-del="${p.id}" aria-label="Eliminar"><i class="bi bi-trash"></i></button>
        </div>
      </td>
    </tr>`).join('');
}

/* ===== Modal CRUD ===== */
const modal = new bootstrap.Modal($('#productModal'));

function fillCategories() {
  $('#pCategory').innerHTML = CATEGORIES.map((c) => `<option>${esc(c)}</option>`).join('');
}

function openForm(item) {
  $('#modalTitle').textContent = item ? 'Editar' : 'Nuevo';
  $('#pId').value = item?.id ?? '';
  $('#pName').value = item?.name ?? '';
  $('#pCategory').value = item?.category ?? '';
  $('#pPrice').value = item?.price ?? '';
  $('#pStock').value = item?.stock ?? '';
  $('#pDesc').value = item?.desc ?? '';
  $('#formError').hidden = true;
  modal.show();
}

$('#btnNew').addEventListener('click', () => openForm(null));

$('#adminTable').addEventListener('click', (e) => {
  const edit = e.target.closest('[data-edit]');
  const del = e.target.closest('[data-del]');

  if (edit) openForm(items.find((p) => p.id === Number(edit.dataset.edit)));

  if (del && confirm('¿Eliminar el producto?')) {
    const id = Number(del.dataset.del);
    items = items.filter((p) => p.id !== id);
    cart = cart.filter((p) => p.id !== id);   // también sale del carrito
    write(KEY_CART, cart);
    persist();
  }
});

$('#btnSave').addEventListener('click', () => {
  const name = $('#pName').value.trim();
  const price = parseFloat($('#pPrice').value);
  const stock = parseInt($('#pStock').value, 10);

  if (!name || isNaN(price) || price < 0 || isNaN(stock) || stock < 0) {
    $('#formError').textContent = 'Completa nombre, precio y stock con valores válidos.';
    $('#formError').hidden = false;
    return;
  }

  const data = { name, category: $('#pCategory').value, price, stock, desc: $('#pDesc').value.trim() };
  const id = Number($('#pId').value);

  if (id) {
    items = items.map((p) => (p.id === id ? { ...p, ...data } : p));
    // Actualizar nombre y precio en el carrito
    cart = cart.map((c) => (c.id === id ? { ...c, name: data.name, price: data.price } : c));
    write(KEY_CART, cart);
  } else {
    items.push({ id: Date.now(), ...data });
  }

  modal.hide();
  persist();
});

function persist() {
  write(KEY_PRODUCTS, items);
  renderAll();
}

function renderAll() {
  renderClient();
  renderTable();
  renderCart();
}

/* ===== Inicio ===== */
fillCategories();
renderAll();
showView(location.hash.slice(1));