(function() {
  'use strict';

  var pageName = document.querySelector('meta[name="page-name"]');
  if (pageName) pageName = pageName.getAttribute('content');

  var active = document.querySelector('.nav-link[href="' + location.pathname.split('/').pop() + '"]');
  if (active) active.classList.add('nav-active');

  var tb = document.getElementById('theme-toggle');
  if (tb) {
    var setThemeIcon = function() {
      var dark = document.documentElement.getAttribute('data-theme') === 'dark';
      var icon = tb.querySelector('.toggle-icon');
      var label = tb.querySelector('.toggle-label');
      if (icon) icon.textContent = dark ? '☀️' : '🌙';
      if (label) label.textContent = dark ? 'Light mode' : 'Dark mode';
    };
    setThemeIcon();
    tb.addEventListener('click', function() {
      var d = document.documentElement;
      var isDark = d.getAttribute('data-theme') === 'dark';
      d.setAttribute('data-theme', isDark ? 'light' : 'dark');
      localStorage.setItem('theme', isDark ? 'light' : 'dark');
      setThemeIcon();
    });
  }

  window.shared = {
    formatBytes: function(b) {
      if (!b) return '0 GB';
      return (b / 1024).toFixed(1) + ' GB';
    },
    formatTokens: function(n) {
      if (n >= 1024) return (n / 1024).toFixed(0) + 'K';
      return n.toString();
    },
    getTierColor: function(tier) {
      var colors = {
        'no-gpu': '#E24B4A',
        'budget-gpu': '#1D9E75',
        'mid-gpu': '#0EA5E9',
        'high-end-gpu': '#534AB7',
        'apple': '#6B5CF5'
      };
      return colors[tier] || '#666';
    },
    getTierName: function(tier) {
      var names = {
        'no-gpu': 'No GPU',
        'budget-gpu': 'Budget GPU',
        'mid-gpu': 'Mid-Range GPU',
        'high-end-gpu': 'High-End GPU',
        'apple': 'Apple Silicon'
      };
      return names[tier] || tier;
    },
    wrapInGlossary: function(text) {
      return text;
    },
    track: function(name, props) {
      if (window.__analytics) window.__analytics.trackEvent(name, props);
    }
  };

  var dataCache = {};

  window.copyText = function(text, btnEl) {
    navigator.clipboard.writeText(text).then(function() {
      if (btnEl) {
        var orig = btnEl.textContent;
        btnEl.textContent = '\u2713 Copied';
        setTimeout(function() { btnEl.textContent = orig; }, 2000);
      }
    });
  };

  window.getParam = function(key) {
    return new URLSearchParams(location.search).get(key);
  };

  window.setParam = function(key, value) {
    var params = new URLSearchParams(location.search);
    params.set(key, value);
    history.replaceState(null, '', '?' + params.toString());
  };

  window.loadData = function(filename) {
    var cb = function(resolve, reject) {
      if (dataCache[filename]) {
        resolve(dataCache[filename]);
        return;
      }
      fetch('data/' + filename)
        .then(function(r) { return r.json(); })
        .then(function(data) {
          dataCache[filename] = data;
          resolve(data);
        })
        .catch(reject);
    };
    return new Promise(cb);
  };
})();
