/**
 * Metrics Collection System
 *
 * Simple metrics abstraction for tracking business and performance metrics
 * In production, this could integrate with Prometheus, DataDog, etc.
 */

export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  SUMMARY = 'summary',
}

export interface MetricLabels {
  [key: string]: string | number
}

interface MetricValue {
  value: number
  labels: MetricLabels
  timestamp: number
}

interface Metric {
  name: string
  type: MetricType
  help: string
  values: MetricValue[]
}

class MetricsCollector {
  private metrics: Map<string, Metric> = new Map()
  private enabled: boolean = true

  constructor() {
    // Enable metrics in production
    this.enabled = process.env.ENABLE_METRICS !== 'false'
  }

  /**
   * Record a counter increment
   */
  recordCounter(name: string, labels: MetricLabels = {}, value: number = 1): void {
    if (!this.enabled) return

    this.ensureMetric(name, MetricType.COUNTER, `Counter: ${name}`)
    this.addValue(name, value, labels)
  }

  /**
   * Set a gauge value
   */
  recordGauge(name: string, value: number, labels: MetricLabels = {}): void {
    if (!this.enabled) return

    this.ensureMetric(name, MetricType.GAUGE, `Gauge: ${name}`)
    this.addValue(name, value, labels)
  }

  /**
   * Record a histogram value (for latency, size distributions)
   */
  recordHistogram(name: string, value: number, labels: MetricLabels = {}): void {
    if (!this.enabled) return

    this.ensureMetric(name, MetricType.HISTOGRAM, `Histogram: ${name}`)
    this.addValue(name, value, labels)
  }

  /**
   * Record a timing in milliseconds
   */
  recordTiming(name: string, durationMs: number, labels: MetricLabels = {}): void {
    this.recordHistogram(`${name}_duration_ms`, durationMs, labels)
  }

  /**
   * Get all metrics
   */
  getMetrics(): Metric[] {
    return Array.from(this.metrics.values())
  }

  /**
   * Get metrics in Prometheus format
   */
  getPrometheusFormat(): string {
    let output = ''

    for (const metric of this.metrics.values()) {
      output += `# HELP ${metric.name} ${metric.help}\n`
      output += `# TYPE ${metric.name} ${metric.type}\n`

      for (const value of metric.values) {
        const labelsStr = Object.entries(value.labels)
          .map(([k, v]) => `${k}="${v}"`)
          .join(',')

        const metricLine = labelsStr
          ? `${metric.name}{${labelsStr}} ${value.value}`
          : `${metric.name} ${value.value}`

        output += `${metricLine}\n`
      }

      output += '\n'
    }

    return output
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics.clear()
  }

  /**
   * Create metric if it doesn't exist
   */
  private ensureMetric(name: string, type: MetricType, help: string): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, {
        name,
        type,
        help,
        values: [],
      })
    }
  }

  /**
   * Add a value to a metric
   */
  private addValue(name: string, value: number, labels: MetricLabels): void {
    const metric = this.metrics.get(name)
    if (!metric) return

    // For gauges and counters, replace existing value with same labels
    if (metric.type === MetricType.GAUGE || metric.type === MetricType.COUNTER) {
      const existing = metric.values.findIndex((v) =>
        this.labelsMatch(v.labels, labels)
      )

      if (existing >= 0) {
        if (metric.type === MetricType.COUNTER) {
          metric.values[existing].value += value
        } else {
          metric.values[existing].value = value
        }
        metric.values[existing].timestamp = Date.now()
        return
      }
    }

    // Add new value
    metric.values.push({
      value,
      labels,
      timestamp: Date.now(),
    })
  }

  /**
   * Check if two label sets match
   */
  private labelsMatch(a: MetricLabels, b: MetricLabels): boolean {
    const keysA = Object.keys(a)
    const keysB = Object.keys(b)

    if (keysA.length !== keysB.length) return false

    return keysA.every((key) => a[key] === b[key])
  }
}

// Global metrics instance
export const metrics = new MetricsCollector()

// Business metrics helpers
export const businessMetrics = {
  /**
   * Track content idea creation
   */
  ideaCreated(brandId: string, platform: string): void {
    metrics.recordCounter('content_ideas_created_total', { brandId, platform })
  },

  /**
   * Track post draft creation
   */
  draftCreated(brandId: string, platform: string, source: string): void {
    metrics.recordCounter('post_drafts_created_total', {
      brandId,
      platform,
      source,
    })
  },

  /**
   * Track post publication
   */
  postPublished(brandId: string, platform: string): void {
    metrics.recordCounter('posts_published_total', { brandId, platform })
  },

  /**
   * Track post failure
   */
  postFailed(brandId: string, platform: string, reason: string): void {
    metrics.recordCounter('posts_failed_total', {
      brandId,
      platform,
      reason,
    })
  },

  /**
   * Track AI generation usage
   */
  aiGeneration(type: 'idea' | 'draft', tokensUsed: number): void {
    metrics.recordCounter('ai_generations_total', { type })
    metrics.recordCounter('ai_tokens_used_total', { type }, tokensUsed)
  },

  /**
   * Track campaign metrics
   */
  campaignCreated(brandId: string): void {
    metrics.recordCounter('campaigns_created_total', { brandId })
  },

  campaignCompleted(brandId: string, postsCount: number): void {
    metrics.recordCounter('campaigns_completed_total', { brandId })
    metrics.recordHistogram('campaign_posts_count', postsCount, { brandId })
  },
}

// Performance metrics helpers
export const performanceMetrics = {
  /**
   * Track API request duration
   */
  apiRequest(endpoint: string, method: string, statusCode: number, durationMs: number): void {
    metrics.recordTiming('api_request', durationMs, {
      endpoint,
      method,
      status: statusCode,
    })
  },

  /**
   * Track database query duration
   */
  dbQuery(operation: string, table: string, durationMs: number): void {
    metrics.recordTiming('db_query', durationMs, { operation, table })
  },

  /**
   * Track external API calls
   */
  externalApiCall(service: string, endpoint: string, durationMs: number): void {
    metrics.recordTiming('external_api_call', durationMs, {
      service,
      endpoint,
    })
  },
}
