(function () {
  'use strict';

  var queue = [];

  function trackEvent(eventName, properties) {
    var event = {
      name: eventName,
      properties: properties || {},
      timestamp: new Date().toISOString(),
      url: window.location.href
    };
    queue.push(event);
    if (typeof window.umami !== 'undefined' && window.umami.track) {
      try {
        window.umami.track(eventName, properties);
      } catch (e) {
        /* silent */
      }
    }
    if (typeof console !== 'undefined' && console.log) {
      console.log('[Analytics]', eventName, properties || '');
    }
  }

  function getQueue() {
    return queue.slice();
  }

  function saveFeedback(recommendation, hardware, goal, success) {
    var key = 'fb_' + (goal || 'unknown') + '_' + (hardware || 'unknown') + '_' + (recommendation || 'unknown').replace(/\s+/g, '_');
    if (localStorage.getItem(key)) return;
    var data = {
      recommendation: recommendation,
      hardware: hardware,
      goal: goal,
      success: success,
      timestamp: new Date().toISOString().split('T')[0]
    };
    localStorage.setItem(key, JSON.stringify(data));
    trackEvent('feedback_submitted', { result: success ? 'positive' : 'negative', recommendation: recommendation, hardware: hardware, goal: goal });
    return data;
  }

  function getFeedback(recommendation, hardware, goal) {
    var key = 'fb_' + (goal || 'unknown') + '_' + (hardware || 'unknown') + '_' + (recommendation || 'unknown').replace(/\s+/g, '_');
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function getCommunityStats(goal, hardwareTier, recommendation) {
    try {
      var all = [];
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf('fb_') === 0) {
          try { all.push(JSON.parse(localStorage.getItem(k))); } catch (e) { /* skip */ }
        }
      }
      var filtered = all.filter(function (f) {
        return f.goal === goal && f.hardware === hardwareTier && f.recommendation === recommendation;
      });
      if (filtered.length < 10) return null;
      var successes = filtered.filter(function (f) { return f.success; }).length;
      return {
        total: filtered.length,
        successRate: Math.round((successes / filtered.length) * 100),
        successes: successes
      };
    } catch (e) {
      return null;
    }
  }

  function getPopularSetups(hardwareTier) {
    try {
      var counts = {};
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf('fb_') === 0) {
          try {
            var f = JSON.parse(localStorage.getItem(k));
            if (f.hardware === hardwareTier) {
              var key = f.recommendation;
              if (!counts[key]) counts[key] = { recommendation: f.recommendation, total: 0, successes: 0 };
              counts[key].total++;
              if (f.success) counts[key].successes++;
            }
          } catch (e) { /* skip */ }
        }
      }
      var sorted = Object.keys(counts).map(function (k) {
        var c = counts[k];
        c.successRate = Math.round((c.successes / c.total) * 100);
        return c;
      }).sort(function (a, b) { return b.total - a.total; });
      return sorted.length > 0 ? sorted[0] : null;
    } catch (e) {
      return null;
    }
  }

  window.__analytics = {
    trackEvent: trackEvent,
    getQueue: getQueue,
    saveFeedback: saveFeedback,
    getFeedback: getFeedback,
    getCommunityStats: getCommunityStats,
    getPopularSetups: getPopularSetups
  };
})();
