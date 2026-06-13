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

  window.__analytics = {
    trackEvent: trackEvent,
    getQueue: getQueue,
    saveFeedback: saveFeedback,
    getFeedback: getFeedback
  };
})();
