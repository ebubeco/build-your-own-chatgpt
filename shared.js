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
        'cpu-only': '#BA7517',
        'budget-gpu': '#1D9E75',
        'power-gpu': '#534AB7',
        'silicon-8-16gb': '#6B5CF5',
        'silicon-24-48gb': '#3D2FB8',
        'silicon-64-plus': '#1D0FB8'
      };
      return colors[tier] || '#666';
    },
    getTierName: function(tier) {
      var names = {
        'no-gpu': 'No GPU',
        'cpu-only': 'CPU-Only',
        'budget-gpu': 'Budget GPU',
        'power-gpu': 'Power GPU',
        'silicon-8-16gb': 'Apple 8-16GB',
        'silicon-24-48gb': 'Apple 24-48GB',
        'silicon-64-plus': 'Apple 64GB+'
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
})();
