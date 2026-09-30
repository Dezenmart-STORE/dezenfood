import { onCLS, onFCP, onLCP, onTTFB, onINP, Metric } from 'web-vitals';
import { captureMessage, addBreadcrumb } from './sentry.config';

// Threshold values for Web Vitals (Google's recommended values)
const THRESHOLDS = {
  CLS: { good: 0.1, needsImprovement: 0.25 },
  FCP: { good: 1800, needsImprovement: 3000 },
  LCP: { good: 2500, needsImprovement: 4000 },
  TTFB: { good: 800, needsImprovement: 1800 },
  INP: { good: 200, needsImprovement: 500 },
};

type MetricName = keyof typeof THRESHOLDS;

// Determine rating based on value and thresholds
function getRating(metric: Metric): 'good' | 'needs-improvement' | 'poor' {
  const threshold = THRESHOLDS[metric.name as MetricName];

  if (!threshold) return 'good';

  if (metric.value <= threshold.good) return 'good';
  if (metric.value <= threshold.needsImprovement) return 'needs-improvement';
  return 'poor';
}

// Send metrics to analytics/monitoring service
function sendToAnalytics(metric: Metric) {
  const rating = getRating(metric);

  // Log to console in development
  if (import.meta.env.DEV) {
    console.log(`[Web Vitals] ${metric.name}:`, {
      value: metric.value,
      rating,
      delta: metric.delta,
      id: metric.id,
    });
  }

  // Send to Sentry as breadcrumb
  addBreadcrumb(
    `${metric.name}: ${metric.value.toFixed(2)}ms (${rating})`,
    'performance',
    rating === 'poor' ? 'warning' : 'info'
  );

  // Send poor metrics as Sentry messages in production
  if (rating === 'poor' && import.meta.env.PROD) {
    captureMessage(
      `Poor ${metric.name} performance: ${metric.value.toFixed(2)}ms`,
      'warning'
    );
  }

  // Send to Google Analytics if available
  if (typeof window !== 'undefined' && 'gtag' in window) {
    const gtag = (window as any).gtag;
    gtag('event', metric.name, {
      event_category: 'Web Vitals',
      event_label: metric.id,
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      non_interaction: true,
    });
  }

  // Custom analytics endpoint (if you have one)
  if (import.meta.env.VITE_ANALYTICS_ENDPOINT) {
    navigator.sendBeacon(
      import.meta.env.VITE_ANALYTICS_ENDPOINT,
      JSON.stringify({
        name: metric.name,
        value: metric.value,
        rating,
        delta: metric.delta,
        id: metric.id,
        navigationType: metric.navigationType,
        timestamp: Date.now(),
        url: window.location.href,
      })
    );
  }
}

// Initialize Web Vitals monitoring
export function initPerformanceMonitoring() {
  // Core Web Vitals
  onCLS(sendToAnalytics); // Cumulative Layout Shift
  onFCP(sendToAnalytics); // First Contentful Paint
  onLCP(sendToAnalytics); // Largest Contentful Paint
  onTTFB(sendToAnalytics); // Time to First Byte
  onINP(sendToAnalytics); // Interaction to Next Paint (replaces deprecated FID)

  console.log('[Performance] Web Vitals monitoring initialized');
}

// Custom performance marks for specific operations
export const performanceMark = {
  start: (name: string) => {
    performance.mark(`${name}-start`);
  },

  end: (name: string) => {
    performance.mark(`${name}-end`);
    try {
      performance.measure(name, `${name}-start`, `${name}-end`);
      const measure = performance.getEntriesByName(name)[0] as PerformanceMeasure;

      if (import.meta.env.DEV) {
        console.log(`[Performance] ${name}: ${measure.duration.toFixed(2)}ms`);
      }

      addBreadcrumb(
        `${name}: ${measure.duration.toFixed(2)}ms`,
        'performance',
        'info'
      );

      // Clean up marks
      performance.clearMarks(`${name}-start`);
      performance.clearMarks(`${name}-end`);
      performance.clearMeasures(name);

      return measure.duration;
    } catch (error) {
      console.warn(`[Performance] Could not measure ${name}:`, error);
      return 0;
    }
  },
};

// Monitor long tasks (> 50ms)
if ('PerformanceObserver' in window) {
  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 50) {
          addBreadcrumb(
            `Long task detected: ${entry.duration.toFixed(2)}ms`,
            'performance',
            'warning'
          );

          if (import.meta.env.DEV) {
            console.warn('[Performance] Long task detected:', entry);
          }
        }
      }
    });

    observer.observe({ entryTypes: ['longtask'] });
  } catch (error) {
    // Long task observer not supported
    console.log('[Performance] Long task observer not supported');
  }
}

// Monitor resource loading
export function monitorResourceTiming() {
  if ('PerformanceObserver' in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const resourceEntry = entry as PerformanceResourceTiming;

          // Log slow resources (> 1s)
          if (resourceEntry.duration > 1000) {
            addBreadcrumb(
              `Slow resource: ${resourceEntry.name} (${resourceEntry.duration.toFixed(2)}ms)`,
              'performance',
              'warning'
            );

            if (import.meta.env.DEV) {
              console.warn('[Performance] Slow resource:', {
                name: resourceEntry.name,
                duration: resourceEntry.duration,
                size: resourceEntry.transferSize,
              });
            }
          }
        }
      });

      observer.observe({ entryTypes: ['resource'] });
    } catch (error) {
      console.log('[Performance] Resource timing observer not supported');
    }
  }
}
