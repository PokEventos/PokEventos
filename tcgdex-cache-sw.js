// ========================================
// SERVICE WORKER - CACHE INTELIGENTE TCGDex
// ========================================
// Cacheia imagens do TCGDex automaticamente
// para acesso mais rápido depois

const CACHE_NAME = 'tcgdex-images-v1';
const API_CACHE_NAME = 'tcgdex-api-v1';

// URLs que devem ser cacheadas
const TCG_DOMAINS = [
  'https://assets.tcgdex.net',
  'https://api.tcgdex.net'
];

// Instalar Service Worker
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker instalado');
  self.skipWaiting();
});

// Ativar Service Worker
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker ativado');
  event.waitUntil(
    // Limpar caches antigos
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME && name !== API_CACHE_NAME)
          .map(name => caches.delete(name))
      );
    })
  );
});

// Interceptar requisições
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Verificar se é do TCGDex
  const isTCGDex = TCG_DOMAINS.some(domain => event.request.url.startsWith(domain));
  
  if (!isTCGDex) {
    return; // Deixa passar requisições normais
  }
  
  // Determinar qual cache usar
  const isImage = /\.(png|jpg|jpeg|webp)$/i.test(url.pathname);
  const cacheName = isImage ? CACHE_NAME : API_CACHE_NAME;
  
  event.respondWith(
    caches.open(cacheName).then(cache => {
      return cache.match(event.request).then(cachedResponse => {
        
        if (cachedResponse) {
          console.log('📦 Cache HIT:', url.pathname);
          
          // Se for API, revalida em background
          if (!isImage) {
            fetch(event.request).then(response => {
              if (response && response.status === 200) {
                cache.put(event.request, response.clone());
              }
            }).catch(() => {}); // Ignora erro na revalidação
          }
          
          return cachedResponse;
        }
        
        // Cache MISS - baixa e salva
        console.log('🌐 Cache MISS, baixando:', url.pathname);
        
        return fetch(event.request).then(response => {
          // Só cacheia respostas válidas
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }
          
          // Salva no cache
          cache.put(event.request, response.clone());
          
          return response;
        }).catch(error => {
          console.error('❌ Erro ao buscar:', error);
          throw error;
        });
      });
    })
  );
});

// Limpar cache quando necessário
self.addEventListener('message', (event) => {
  if (event.data === 'CLEAR_CACHE') {
    event.waitUntil(
      Promise.all([
        caches.delete(CACHE_NAME),
        caches.delete(API_CACHE_NAME)
      ]).then(() => {
        console.log('🗑️ Cache limpo!');
        event.ports[0].postMessage({ success: true });
      })
    );
  }
  
  if (event.data === 'CACHE_STATS') {
    event.waitUntil(
      Promise.all([
        caches.open(CACHE_NAME).then(cache => cache.keys()),
        caches.open(API_CACHE_NAME).then(cache => cache.keys())
      ]).then(([imageKeys, apiKeys]) => {
        event.ports[0].postMessage({
          images: imageKeys.length,
          api: apiKeys.length,
          total: imageKeys.length + apiKeys.length
        });
      })
    );
  }
});
