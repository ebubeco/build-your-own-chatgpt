(function () {
  'use strict';

  var SUPABASE_URL = 'https://fxeygjmygxnirvsrndaa.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_MTznrw3Xenf4mP72ll8jVw_LD09jKo7';
  var queue = [];

  function postToSupabase(table, body) {
    fetch(SUPABASE_URL + '/rest/v1/' + table, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(body)
    }).catch(function () { /* silent */ });
  }

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
      } catch (e) { /* silent */ }
    }
    if (typeof window.plausible !== 'undefined') {
      try {
        window.plausible(eventName, { props: properties || {} });
      } catch (e) { /* silent */ }
    }
    if (typeof console !== 'undefined' && console.log) {
      console.log('[Analytics]', eventName, properties || '');
    }
  }

  function getQueue() {
    return queue.slice();
  }

  function saveFeedbackToSupabase(data) {
    postToSupabase('feedback', {
      recommendation: data.recommendation,
      hardware: data.hardware,
      goal: data.goal,
      success: data.success,
      timestamp: data.timestamp,
      reason: data.reason || null,
      notes: data.notes || null
    });
  }

  function saveSetupSuccessToSupabase(data) {
    postToSupabase('setup_success', {
      model: data.model,
      goal: data.goal,
      hardware: data.hardware,
      success: data.success,
      created_at: data.timestamp
    });
  }

  function saveRecommendationToSupabase(data) {
    postToSupabase('recommendations', {
      goal: data.goal,
      hardware: data.hardware,
      model: data.model,
      confidence: data.confidence,
      career: data.career || null,
      timestamp: data.timestamp
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

  function saveRecommendation(model, hardware, goal, confidence, career) {
    var key = 'rec_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    var data = {
      model: model,
      hardware: hardware,
      goal: goal,
      confidence: confidence || 0,
      career: career || null,
      timestamp: new Date().toISOString()
    };
    try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) { /* silent */ }
    saveRecommendationToSupabase(data);
    trackEvent('recommendation_generated', { model: model, goal: goal, hardware: hardware, confidence: confidence });
    return data;
  }

  function saveSetupSuccess(model, hardware, goal, success) {
    var key = 'succ_' + (goal || 'unknown') + '_' + (hardware || 'unknown') + '_' + (model || 'unknown').replace(/\s+/g, '_');
    if (localStorage.getItem(key)) return;
    var data = {
      model: model,
      hardware: hardware,
      goal: goal,
      success: success,
      timestamp: new Date().toISOString()
    };
    try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) { /* silent */ }
    saveSetupSuccessToSupabase(data);
    trackEvent('setup_success', { model: model, goal: goal, hardware: hardware, result: success });
    return data;
  }

  function getModelSuccessRate(model) {
    try {
      var all = [];
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf('succ_') === 0) {
          try { all.push(JSON.parse(localStorage.getItem(k))); } catch (e) { /* skip */ }
        }
        if (k && k.indexOf('fb_') === 0) {
          try {
            var f = JSON.parse(localStorage.getItem(k));
            if (f.recommendation === model) all.push({ model: f.recommendation, success: f.success ? 'yes' : 'no' });
          } catch (e) { /* skip */ }
        }
      }
      var modelEntries = all.filter(function (f) { return f.model === model; });
      if (modelEntries.length < 3) return null;
      var yesCount = modelEntries.filter(function (f) { return f.success === 'yes'; }).length;
      return { total: modelEntries.length, successRate: Math.round((yesCount / modelEntries.length) * 100), count: yesCount };
    } catch (e) {
      return null;
    }
  }

  function getTopModelsBySuccess(limit) {
    limit = limit || 10;
    try {
      var counts = {};
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf('succ_') === 0) {
          try {
            var f = JSON.parse(localStorage.getItem(k));
            if (!counts[f.model]) counts[f.model] = { model: f.model, total: 0, yes: 0, partial: 0 };
            counts[f.model].total++;
            if (f.success === 'yes') counts[f.model].yes++;
            if (f.success === 'partial') counts[f.model].partial++;
          } catch (e) { /* skip */ }
        }
        if (k && k.indexOf('fb_') === 0) {
          try {
            var f = JSON.parse(localStorage.getItem(k));
            if (!counts[f.recommendation]) counts[f.recommendation] = { model: f.recommendation, total: 0, yes: 0, partial: 0 };
            counts[f.recommendation].total++;
            if (f.success) counts[f.recommendation].yes++;
          } catch (e) { /* skip */ }
        }
      }
      var sorted = Object.keys(counts).map(function (k) {
        var c = counts[k];
        c.successRate = Math.round((c.yes / c.total) * 100);
        return c;
      }).filter(function (c) { return c.total >= 3; }).sort(function (a, b) { return b.successRate - a.successRate; });
      return sorted.slice(0, limit);
    } catch (e) {
      return [];
    }
  }

  function getTopModelsByRecommendations(limit) {
    limit = limit || 10;
    try {
      var counts = {};
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf('rec_') === 0) {
          try {
            var f = JSON.parse(localStorage.getItem(k));
            if (f.model) counts[f.model] = (counts[f.model] || 0) + 1;
          } catch (e) { /* skip */ }
        }
      }
      return Object.keys(counts).map(function (k) { return { model: k, count: counts[k] }; })
        .sort(function (a, b) { return b.count - a.count; }).slice(0, limit);
    } catch (e) {
      return [];
    }
  }

  function getRecommendationStats() {
    try {
      var all = [];
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf('rec_') === 0) {
          try { all.push(JSON.parse(localStorage.getItem(k))); } catch (e) { /* skip */ }
        }
      }
      if (all.length === 0) {
        return { total: 0, topGoal: null, topModel: null, topHardware: null };
      }
      var goals = {}, models = {}, hw = {};
      all.forEach(function (r) {
        if (r.goal) goals[r.goal] = (goals[r.goal] || 0) + 1;
        if (r.model) models[r.model] = (models[r.model] || 0) + 1;
        if (r.hardware) hw[r.hardware] = (hw[r.hardware] || 0) + 1;
      });
      function top(map) {
        var keys = Object.keys(map);
        if (keys.length === 0) return null;
        return keys.reduce(function (a, b) { return map[a] > map[b] ? a : b; });
      }
      return {
        total: all.length,
        topGoal: top(goals),
        topModel: top(models),
        topHardware: top(hw),
        goals: goals,
        models: models,
        hw: hw
      };
    } catch (e) {
      return { total: 0, topGoal: null, topModel: null, topHardware: null };
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
    saveRecommendation: saveRecommendation,
    getRecommendationStats: getRecommendationStats,
    saveSetupSuccess: saveSetupSuccess,
    getModelSuccessRate: getModelSuccessRate,
    getTopModelsBySuccess: getTopModelsBySuccess,
    getTopModelsByRecommendations: getTopModelsByRecommendations,
    exportFeedbackData: exportFeedbackData
  };
})();
