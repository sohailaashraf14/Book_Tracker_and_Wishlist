let currentMode = 'library';
let readingGoal = Number(localStorage.getItem('bloom_goal')) || 25;
let books = JSON.parse(localStorage.getItem('bloom_books')) || [];
let wishlist = JSON.parse(localStorage.getItem('bloom_wishlist')) || [];
let currentFilter = 'All';
let currentWishFilter = 'All';
let currentCoverData = '';
let currentWishCoverData = '';
let draggedBookId = null;

function persistData() {
  try {
    localStorage.setItem('bloom_books', JSON.stringify(books));
    localStorage.setItem('bloom_wishlist', JSON.stringify(wishlist));
    localStorage.setItem('bloom_goal', readingGoal);
  } catch (e) {
    alert("Browser storage limit reached! Use image URLs instead of heavy local image files.");
  }
}

/* Image Compressor */
function handleFileUpload(e, type) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(event) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas');
      const maxDim = 350;
      let width = img.width;
      let height = img.height;

      if (width > height && width > maxDim) {
        height *= maxDim / width;
        width = maxDim;
      } else if (height > maxDim) {
        width *= maxDim / height;
        height = maxDim;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      const compressed = canvas.toDataURL('image/jpeg', 0.7);

      if (type === 'main') {
        document.getElementById('coverUrl').value = '';
        updatePreview(compressed, 'previewBox');
      } else {
        document.getElementById('wishCoverUrl').value = '';
        updatePreview(compressed, 'wishPreviewBox');
      }
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
}

function switchMode(mode) {
  currentMode = mode;
  document.getElementById('librarySection').style.display = (mode === 'library') ? 'block' : 'none';
  document.getElementById('wishlistSection').style.display = (mode === 'wishlist') ? 'block' : 'none';

  document.getElementById('modeLibraryBtn').classList.toggle('active', mode === 'library');
  document.getElementById('modeWishlistBtn').classList.toggle('active', mode === 'wishlist');

  if (mode === 'library') render();
  else renderWishlist();
}

function editGoal() {
  const newGoal = prompt("Enter your yearly book goal:", readingGoal);
  if (newGoal && !isNaN(newGoal) && Number(newGoal) > 0) {
    readingGoal = parseInt(newGoal, 10);
    persistData();
    updateStats();
  }
}

function setFilter(filter) {
  currentFilter = filter;
  document.querySelectorAll('#librarySection .filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.innerText.includes(filter) || (filter === 'All' && btn.innerText === 'All Books'));
  });
  render();
}

function setWishlistFilter(filter) {
  currentWishFilter = filter;
  document.querySelectorAll('#wishlistSection .filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.innerText.includes(filter) || (filter === 'All' && btn.innerText === 'All Wishlist'));
  });
  renderWishlist();
}

/* Render Library */
function render() {
  const container = document.getElementById('books-container');
  container.innerHTML = '';

  const filteredBooks = books.filter(b => currentFilter === 'All' || b.status === currentFilter);

  if (filteredBooks.length === 0) {
    container.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 3rem; color: var(--text-muted); font-style: italic;">No books found. Click "+ Add New Book" to begin.</div>`;
  }

  filteredBooks.forEach(book => {
    const stars = book.rating > 0 ? '★'.repeat(book.rating) + '☆'.repeat(5 - book.rating) : 'Unrated';
    const coverHtml = book.cover 
      ? `<img src="${book.cover}" alt="${escapeHtml(book.title)}" referrerpolicy="no-referrer" onerror="handleImgError(this, '${escapeHtml(book.title)}')">` 
      : `<div class="cover-fallback">${escapeHtml(book.title)}</div>`;

    const card = document.createElement('div');
    card.className = 'book-card';
    card.setAttribute('draggable', 'true');
    card.setAttribute('data-id', book.id);

    card.innerHTML = `
      <div class="drag-handle">⋮⋮ Drag</div>
      <div class="book-cover-wrap">${coverHtml}</div>
      <div class="book-info">
        <span class="book-badge badge-${book.status}">${book.status}</span>
        <h4 class="book-title">${escapeHtml(book.title)}</h4>
        <div class="book-author">by ${escapeHtml(book.author)}</div>
        <div class="book-details-list">
          <span>${book.pages || 0} pages</span>
          <span>${book.format}</span>
        </div>
        <div class="book-rating">${stars}</div>
        ${book.review ? `<p class="book-review">"${escapeHtml(book.review)}"</p>` : ''}
        <div class="card-actions">
          <button class="action-btn edit" onclick="openEditModal(${book.id})">Edit</button>
          <button class="action-btn delete" onclick="deleteBook(${book.id})">Remove</button>
        </div>
      </div>
    `;

    addDragEvents(card);
    container.appendChild(card);
  });

  updateStats();
}

/* Render Wishlist */
function renderWishlist() {
  const container = document.getElementById('wishlist-container');
  container.innerHTML = '';

  const filtered = wishlist.filter(b => currentWishFilter === 'All' || b.priority === currentWishFilter);

  if (filtered.length === 0) {
    container.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 3rem; color: var(--text-muted); font-style: italic;">Your wishlist is empty. Add a book you want to buy!</div>`;
  }

  filtered.forEach(item => {
    const coverHtml = item.cover 
      ? `<img src="${item.cover}" alt="${escapeHtml(item.title)}" referrerpolicy="no-referrer" onerror="handleImgError(this, '${escapeHtml(item.title)}')">` 
      : `<div class="cover-fallback">${escapeHtml(item.title)}</div>`;

    const card = document.createElement('div');
    card.className = 'book-card';
    card.innerHTML = `
      <div class="book-cover-wrap">${coverHtml}</div>
      <div class="book-info">
        <span class="book-badge badge-${item.priority}">${item.priority} Priority</span>
        <h4 class="book-title">${escapeHtml(item.title)}</h4>
        <div class="book-author">by ${escapeHtml(item.author)}</div>
        <div class="book-details-list">
          <span>${item.price ? item.price + ' EGP' : 'Price unset'}</span>
          ${item.link ? `<a href="${item.link}" target="_blank" style="color:var(--accent-sage); text-decoration:underline;">Store Link ↗</a>` : '<span></span>'}
        </div>
        ${item.notes ? `<p class="book-review">"${escapeHtml(item.notes)}"</p>` : ''}
        <div class="card-actions">
          <button class="action-btn move-btn" onclick="moveToLibrary(${item.id})">✓ Bought It</button>
          <button class="action-btn edit" onclick="openEditWishlistModal(${item.id})">Edit</button>
          <button class="action-btn delete" onclick="deleteWishlistBook(${item.id})">Remove</button>
        </div>
      </div>
    `;
    container.appendChild(card);
  });

  updateWishlistStats();
}

function moveToLibrary(id) {
  const index = wishlist.findIndex(w => w.id === id);
  if (index > -1) {
    const item = wishlist[index];
    books.unshift({
      id: Date.now(),
      title: item.title,
      author: item.author,
      status: 'To-Read',
      pages: 0,
      format: 'Physical',
      rating: 0,
      cover: item.cover,
      review: item.notes ? `Purchased from wishlist: ${item.notes}` : ''
    });
    wishlist.splice(index, 1);
    persistData();
    alert(`"${item.title}" has been moved to your Reading Library!`);
    renderWishlist();
  }
}

/* Drag & Drop Reordering */
function addDragEvents(card) {
  card.addEventListener('dragstart', (e) => {
    draggedBookId = Number(card.getAttribute('data-id'));
    card.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', draggedBookId);
  });

  card.addEventListener('dragend', () => {
    card.classList.remove('dragging');
    document.querySelectorAll('.book-card').forEach(c => c.classList.remove('drag-over'));
  });

  card.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    card.classList.add('drag-over');
  });

  card.addEventListener('dragleave', () => {
    card.classList.remove('drag-over');
  });

  card.addEventListener('drop', (e) => {
    e.preventDefault();
    card.classList.remove('drag-over');
    const targetBookId = Number(card.getAttribute('data-id'));

    if (draggedBookId && draggedBookId !== targetBookId) {
      reorderBooks(draggedBookId, targetBookId);
    }
  });
}

function reorderBooks(sourceId, targetId) {
  const sourceIndex = books.findIndex(b => b.id === sourceId);
  const targetIndex = books.findIndex(b => b.id === targetId);

  if (sourceIndex > -1 && targetIndex > -1) {
    const [movedBook] = books.splice(sourceIndex, 1);
    books.splice(targetIndex, 0, movedBook);
    persistData();
    render();
  }
}

function handleImgError(imgElement, title) {
  imgElement.onerror = null;
  imgElement.parentElement.innerHTML = `<div class="cover-fallback">${title}</div>`;
}

function updateStats() {
  const totalBooks = books.length;
  const finished = books.filter(b => b.status === 'Finished');
  const reading = books.filter(b => b.status === 'Reading');
  const totalPages = finished.reduce((sum, b) => sum + (Number(b.pages) || 0), 0);
  
  const ratedBooks = finished.filter(b => Number(b.rating) > 0);
  const avgRating = ratedBooks.length 
    ? (ratedBooks.reduce((sum, b) => sum + Number(b.rating), 0) / ratedBooks.length).toFixed(1)
  : '0.0';

  document.getElementById('kpi-total').innerText = totalBooks;
  document.getElementById('kpi-finished').innerText = finished.length;
  document.getElementById('kpi-pages').innerText = totalPages.toLocaleString();
  document.getElementById('kpi-rating').innerText = avgRating;
  document.getElementById('kpi-reading').innerText = reading.length;

  document.getElementById('goal-fraction').innerText = `${finished.length} / ${readingGoal} Books`;
  const percentage = Math.min(100, Math.round((finished.length / readingGoal) * 100));
  document.getElementById('goal-progress').style.width = `${percentage}%`;
}

function updateWishlistStats() {
  const totalWish = wishlist.length;
  const totalCost = wishlist.reduce((sum, b) => sum + (Number(b.price) || 0), 0);
  
  const mustHaveCost = wishlist
    .filter(b => b.priority === 'High')
    .reduce((sum, b) => sum + (Number(b.price) || 0), 0);

  const mediumCost = wishlist
    .filter(b => b.priority === 'Medium')
    .reduce((sum, b) => sum + (Number(b.price) || 0), 0);

  const niceToHaveCost = wishlist
    .filter(b => b.priority === 'Low')
    .reduce((sum, b) => sum + (Number(b.price) || 0), 0);

  document.getElementById('kpi-wish-count').innerText = totalWish;
  document.getElementById('kpi-wish-cost').innerText = totalCost.toLocaleString() + ' EGP';
  document.getElementById('kpi-cost-high').innerText = mustHaveCost.toLocaleString() + ' EGP';
  document.getElementById('kpi-cost-med').innerText = mediumCost.toLocaleString() + ' EGP';
  document.getElementById('kpi-cost-low').innerText = niceToHaveCost.toLocaleString() + ' EGP';
}

function updatePreview(url, boxId) {
  if (boxId === 'previewBox') currentCoverData = url;
  else currentWishCoverData = url;

  const box = document.getElementById(boxId);
  if (url) {
    box.innerHTML = `<img src="${url}" referrerpolicy="no-referrer" onerror="this.parentElement.innerHTML='<span>Failed</span>'">`;
  } else {
    box.innerHTML = '<span>No image</span>';
  }
}

function openModal() {
  document.getElementById('modalHeading').innerText = 'Log a New Book';
  document.getElementById('editBookId').value = '';
  resetForm();
  document.getElementById('searchGroup').style.display = 'block';
  document.getElementById('bookModal').classList.add('active');
}

function openEditModal(id) {
  const book = books.find(b => b.id === id);
  if (!book) return;

  document.getElementById('modalHeading').innerText = 'Edit Book';
  document.getElementById('editBookId').value = book.id;
  document.getElementById('title').value = book.title;
  document.getElementById('author').value = book.author;
  document.getElementById('status').value = book.status;
  document.getElementById('pages').value = book.pages || '';
  document.getElementById('format').value = book.format;
  document.getElementById('rating').value = book.rating || 0;
  document.getElementById('review').value = book.review || '';
  
  const isBase64 = book.cover && book.cover.startsWith('data:');
  document.getElementById('coverUrl').value = isBase64 ? '' : (book.cover || '');
  updatePreview(book.cover || '', 'previewBox');

  document.getElementById('searchGroup').style.display = 'none';
  document.getElementById('bookModal').classList.add('active');
}

function closeModal() {
  document.getElementById('bookModal').classList.remove('active');
  resetForm();
}

function resetForm() {
  document.getElementById('title').value = '';
  document.getElementById('author').value = '';
  document.getElementById('pages').value = '';
  document.getElementById('coverUrl').value = '';
  document.getElementById('coverFileInput').value = '';
  document.getElementById('review').value = '';
  document.getElementById('apiSearch').value = '';
  document.getElementById('searchResults').style.display = 'none';
  currentCoverData = '';
  updatePreview('', 'previewBox');
}

function saveBook() {
  const title = document.getElementById('title').value.trim();
  const author = document.getElementById('author').value.trim();
  const editId = document.getElementById('editBookId').value;

  if (!title || !author) {
    alert('Please provide both Title and Author.');
    return;
  }

  const bookData = {
    title,
    author,
    status: document.getElementById('status').value,
    pages: Number(document.getElementById('pages').value) || 0,
    format: document.getElementById('format').value,
    rating: Number(document.getElementById('rating').value),
    cover: currentCoverData || document.getElementById('coverUrl').value.trim(),
    review: document.getElementById('review').value
  };

  if (editId) {
    const bookIndex = books.findIndex(b => b.id == editId);
    if (bookIndex > -1) {
      books[bookIndex] = { ...books[bookIndex], ...bookData };
    }
  } else {
    books.unshift({ id: Date.now(), ...bookData });
  }

  persistData();
  closeModal();
  render();
}

function deleteBook(id) {
  if (confirm('Are you sure you want to remove this book?')) {
    books = books.filter(b => b.id !== id);
    persistData();
    render();
  }
}

function openWishlistModal() {
  document.getElementById('wishlistModalHeading').innerText = 'Add to Wishlist';
  document.getElementById('editWishlistId').value = '';
  resetWishlistForm();
  document.getElementById('wishlistModal').classList.add('active');
}

function openEditWishlistModal(id) {
  const item = wishlist.find(w => w.id === id);
  if (!item) return;

  document.getElementById('wishlistModalHeading').innerText = 'Edit Wishlist Book';
  document.getElementById('editWishlistId').value = item.id;
  document.getElementById('wishTitle').value = item.title;
  document.getElementById('wishAuthor').value = item.author;
  document.getElementById('wishPriority').value = item.priority;
  document.getElementById('wishPrice').value = item.price || '';
  document.getElementById('wishLink').value = item.link || '';
  document.getElementById('wishNotes').value = item.notes || '';
  
  const isBase64 = item.cover && item.cover.startsWith('data:');
  document.getElementById('wishCoverUrl').value = isBase64 ? '' : (item.cover || '');
  updatePreview(item.cover || '', 'wishPreviewBox');

  document.getElementById('wishlistModal').classList.add('active');
}

function closeWishlistModal() {
  document.getElementById('wishlistModal').classList.remove('active');
  resetWishlistForm();
}

function resetWishlistForm() {
  document.getElementById('wishTitle').value = '';
  document.getElementById('wishAuthor').value = '';
  document.getElementById('wishPrice').value = '';
  document.getElementById('wishLink').value = '';
  document.getElementById('wishCoverUrl').value = '';
  document.getElementById('wishFileInput').value = '';
  document.getElementById('wishNotes').value = '';
  document.getElementById('wishApiSearch').value = '';
  document.getElementById('wishSearchResults').style.display = 'none';
  currentWishCoverData = '';
  updatePreview('', 'wishPreviewBox');
}

function saveWishlistBook() {
  const title = document.getElementById('wishTitle').value.trim();
  const author = document.getElementById('wishAuthor').value.trim();
  const editId = document.getElementById('editWishlistId').value;

  if (!title || !author) {
    alert('Please provide both Title and Author.');
    return;
  }

  const itemData = {
    title,
    author,
    priority: document.getElementById('wishPriority').value,
    price: Number(document.getElementById('wishPrice').value) || 0,
    link: document.getElementById('wishLink').value.trim(),
    cover: currentWishCoverData || document.getElementById('wishCoverUrl').value.trim(),
    notes: document.getElementById('wishNotes').value.trim()
  };

  if (editId) {
    const idx = wishlist.findIndex(w => w.id == editId);
    if (idx > -1) wishlist[idx] = { ...wishlist[idx], ...itemData };
  } else {
    wishlist.unshift({ id: Date.now(), ...itemData });
  }

  persistData();
  closeWishlistModal();
  renderWishlist();
}

function deleteWishlistBook(id) {
  if (confirm('Remove this book from your wishlist?')) {
    wishlist = wishlist.filter(w => w.id !== id);
    persistData();
    renderWishlist();
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

/* Normalizes Arabic characters so matching doesn't fail on diacritics / letter variants */
function normalizeArabic(text) {
  if (!text) return '';
  return text
    .replace(/[\u064B-\u065F]/g, '') // remove tashkeel
    .replace(/[إأآا]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .trim();
}

/* Resilient Multi-Provider Book Search */
let debounceTimer;
function triggerSearch(type) {
  clearTimeout(debounceTimer);
  const inputId = (type === 'main') ? 'apiSearch' : 'wishApiSearch';
  const resultsId = (type === 'main') ? 'searchResults' : 'wishSearchResults';
  const q = document.getElementById(inputId).value.trim();
  if (q) executeSearch(q, type, resultsId);
}

document.getElementById('apiSearch')?.addEventListener('input', (e) => {
  clearTimeout(debounceTimer);
  const q = e.target.value.trim();
  if (!q) {
    document.getElementById('searchResults').style.display = 'none';
    return;
  }
  debounceTimer = setTimeout(() => executeSearch(q, 'main', 'searchResults'), 450);
});

document.getElementById('wishApiSearch')?.addEventListener('input', (e) => {
  clearTimeout(debounceTimer);
  const q = e.target.value.trim();
  if (!q) {
    document.getElementById('wishSearchResults').style.display = 'none';
    return;
  }
  debounceTimer = setTimeout(() => executeSearch(q, 'wish', 'wishSearchResults'), 450);
});

async function executeSearch(query, type, resultsContainerId) {
  const resultsBox = document.getElementById(resultsContainerId);
  resultsBox.style.display = 'block';
  resultsBox.innerHTML = `<div class="search-status">Searching for "${escapeHtml(query)}"...</div>`;

  let itemsFound = [];

  const parseGoogleItem = (item) => {
    const info = item.volumeInfo || {};
    let cover = '';
    if (info.imageLinks) {
      cover = (info.imageLinks.thumbnail || info.imageLinks.smallThumbnail || '')
        .replace(/^http:\/\//i, 'https://')
        .replace('&edge=curl', '');
    } else if (item.id) {
      cover = `https://books.google.com/books/content?id=${item.id}&printsec=frontcover&img=1&zoom=1`;
    }
    return {
      title: info.title || 'Untitled',
      author: info.authors ? info.authors.join(', ') : 'Unknown Author',
      pages: info.pageCount || '',
      cover: cover
    };
  };

  // 1. Google Books (Standard + Normalized queries)
  try {
    const queriesToTry = [
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=8`,
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent('intitle:' + query)}&maxResults=8`,
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(normalizeArabic(query))}&maxResults=8`
    ];

    for (const url of queriesToTry) {
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.items && data.items.length > 0) {
          itemsFound = data.items.map(parseGoogleItem);
          break; // Stop at first successful match set
        }
      }
    }
  } catch (err) {
    console.warn('Google Books failed:', err);
  }

  // 2. Open Library Fallback
  if (itemsFound.length === 0) {
    try {
      const olRes = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=6`);
      if (olRes.ok) {
        const olData = await olRes.json();
        if (olData.docs && olData.docs.length > 0) {
          itemsFound = olData.docs.map(doc => ({
            title: doc.title || 'Untitled',
            author: doc.author_name ? doc.author_name.join(', ') : 'Unknown Author',
            pages: doc.number_of_pages_median || '',
            cover: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : ''
          }));
        }
      }
    } catch (err) {
      console.warn('Open Library failed:', err);
    }
  }

  // Render search results
  resultsBox.innerHTML = '';
  if (itemsFound.length === 0) {
    resultsBox.innerHTML = '<div class="search-status">No books found online. Please fill in details below manually!</div>';
    return;
  }

  itemsFound.forEach(book => {
    const div = document.createElement('div');
    div.className = 'search-item';
    
    const thumbHtml = book.cover 
      ? `<img src="${book.cover}" class="search-thumb" referrerpolicy="no-referrer" onerror="this.style.display='none'">` 
      : '';

    div.innerHTML = `
      ${thumbHtml}
      <div class="search-text">
        <strong>${escapeHtml(book.title)}</strong>
        <span style="color:var(--text-muted); font-size:0.78rem;">${escapeHtml(book.author)} ${book.pages ? `• ${book.pages} pages` : ''}</span>
      </div>
    `;
    
    div.onclick = () => {
      if (type === 'main') {
        document.getElementById('title').value = book.title;
        document.getElementById('author').value = book.author;
        document.getElementById('pages').value = book.pages;
        document.getElementById('coverUrl').value = book.cover;
        updatePreview(book.cover, 'previewBox');
      } else {
        document.getElementById('wishTitle').value = book.title;
        document.getElementById('wishAuthor').value = book.author;
        document.getElementById('wishCoverUrl').value = book.cover;
        updatePreview(book.cover, 'wishPreviewBox');
      }
      resultsBox.style.display = 'none';
    };
    resultsBox.appendChild(div);
  });
}

// Initial Render
render();