(function () {
  'use strict';

  var SUPABASE_URL = 'https://fxeygjmygxnirvsrndaa.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_MTznrw3Xenf4mP72ll8jVw_LD09jKo7';
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

  function saveFeedbackToSupabase(data) {
    var url = SUPABASE_URL + '/rest/v1/feedback';
    var body = {
      recommendation: data.recommendation,
      hardware: data.hardware,
      goal: data.goal,
      success: data.success,
      timestamp: data.timestamp
    };
    if (data.reason) body.reason = data.reason;
    if (data.notes) body.notes = data.notes;
    fetch(url, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(body)
    }).catch(function () {
      /* Supabase unavailable - localStorage fallback handles this */
    });
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
    saveFeedbackToSupabase(data);
    trackEvent('feedback_submitted', { result: success ? 'positive' : 'negative', recommendation: recommendation, hardware: hardware, goal: goal });
    return data;
  }

  function saveFeedbackDetails(recommendation, hardware, goal, tags, notes) {
    var key = 'fbd_' + (goal || 'unknown') + '_' + (hardware || 'unknown') + '_' + (recommendation || 'unknown').replace(/\s+/g, '_');
    if (localStorage.getItem(key)) return;
    var reason = (tags && tags.length > 0) ? tags.join(',') : '';
    var data = {
      recommendation: recommendation,
      hardware: hardware,
      goal: goal,
      success: false,
      reason: reason,
      notes: notes || '',
      timestamp: new Date().toISOString().split('T')[0]
    };
    localStorage.setItem(key, JSON.stringify(data));
    saveFeedbackToSupabase(data);
    trackEvent('feedback_details', { tags: reason, hasNotes: !!notes, recommendation: recommendation, hardware: hardware, goal: goal });
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

  function exportFeedbackData() {
    try {
      var all = [];
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && (k.indexOf('fb_') === 0 || k.indexOf('fbd_') === 0)) {
          try { all.push(JSON.parse(localStorage.getItem(k))); } catch (e) { /* skip */ }
        }
      }
      if (all.length === 0) { alert('No feedback data to export.'); return; }
      var blob = new Blob([JSON.stringify(all, null, 2)], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'feedback-export-' + new Date().toISOString().split('T')[0] + '.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Export failed: ' + e.message);
    }
  }

  window.__analytics = {
    trackEvent: trackEvent,
    getQueue: getQueue,
    saveFeedback: saveFeedback,
    saveFeedbackDetails: saveFeedbackDetails,
    getFeedback: getFeedback,
    getCommunityStats: getCommunityStats,
    getPopularSetups: getPopularSetups,
    exportFeedbackData: exportFeedbackData
  };
})();
