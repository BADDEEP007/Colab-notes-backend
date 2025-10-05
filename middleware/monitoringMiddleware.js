import monitoringService from "../services/monitoringService.js";
import { v4 as uuidv4 } from "uuid";

/**
 * Request monitoring middleware
 * Tracks all API calls, response times, and errors
 */
export const requestMonitoring = (req, res, next) => {
  // Generate unique request ID
  req.requestId = uuidv4();
  req.startTime = Date.now();

  // Add request ID to response headers
  res.setHeader("X-Request-ID", req.requestId);

  // Track active connections
  monitoringService.metrics.system.activeConnections++;

  // Override res.end to capture response data
  const originalEnd = res.end;
  const originalSend = res.send;

  let responseBody = null;
  let error = null;

  // Capture response body
  res.send = function (body) {
    responseBody = body;
    return originalSend.call(this, body);
  };

  // Capture when response ends
  res.end = function (chunk, encoding) {
    const responseTime = Date.now() - req.startTime;

    // Log the request
    monitoringService.logRequest(req, res, responseTime, error);

    // Decrease active connections
    monitoringService.metrics.system.activeConnections--;

    return originalEnd.call(this, chunk, encoding);
  };

  // Capture errors
  const originalNext = next;
  next = function (err) {
    if (err) {
      error = err;
    }
    return originalNext(err);
  };

  next();
};

/**
 * Error monitoring middleware
 * Captures and logs all application errors
 */
export const errorMonitoring = (err, req, res, next) => {
  const responseTime = Date.now() - (req.startTime || Date.now());

  // Log error with monitoring service
  monitoringService.logRequest(req, res, responseTime, err);

  // Set error response
  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode);

  // Don't expose internal errors in production
  const isDevelopment =
    process.env.NODE_ENV === "development" || process.env.NODE_ENV === "DEV";

  const errorResponse = {
    status: "error",
    message: isDevelopment ? err.message : "Internal server error",
    requestId: req.requestId,
    timestamp: new Date().toISOString(),
  };

  if (isDevelopment) {
    errorResponse.stack = err.stack;
    errorResponse.details = err.details || null;
  }

  res.json(errorResponse);
};

/**
 * Performance monitoring middleware
 * Adds performance headers and warnings
 */
export const performanceMonitoring = (req, res, next) => {
  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1000000; // Convert to milliseconds

    // Add performance headers
    res.setHeader("X-Response-Time", `${duration.toFixed(2)}ms`);
    res.setHeader("X-Timestamp", new Date().toISOString());

    // Add performance warnings
    if (duration > 1000) {
      res.setHeader("X-Performance-Warning", "Slow response detected");
    }

    if (duration > 5000) {
      res.setHeader("X-Performance-Alert", "Very slow response detected");
    }
  });

  next();
};

/**
 * Security monitoring middleware
 * Tracks suspicious activities and potential attacks
 */
export const securityMonitoring = (req, res, next) => {
  const suspiciousPatterns = [
    /\.\.\//g, // Path traversal
    /<script/gi, // XSS attempts
    /union.*select/gi, // SQL injection
    /javascript:/gi, // JavaScript injection
    /eval\(/gi, // Code injection
    /exec\(/gi, // Command injection
  ];

  const userAgent = req.get("User-Agent") || "";
  const url = req.originalUrl || req.url;
  const body = JSON.stringify(req.body || {});

  // Check for suspicious patterns
  const suspicious = suspiciousPatterns.some(
    (pattern) =>
      pattern.test(url) || pattern.test(body) || pattern.test(userAgent)
  );

  if (suspicious) {
    monitoringService.addAlert(
      "SECURITY_THREAT",
      `Suspicious request detected from ${req.ip}: ${req.method} ${url}`,
      "warning"
    );

    console.warn(
      `🔒 Security Alert: Suspicious request from ${req.ip} - ${req.method} ${url}`
    );
  }

  // Track failed authentication attempts
  res.on("finish", () => {
    if (res.statusCode === 401 || res.statusCode === 403) {
      monitoringService.addAlert(
        "AUTH_FAILURE",
        `Authentication failure from ${req.ip}: ${req.method} ${url}`,
        "info"
      );
    }
  });

  next();
};

/**
 * Rate limiting monitoring
 * Tracks rate limit hits and potential abuse
 */
export const rateLimitMonitoring = (req, res, next) => {
  const originalSend = res.send;

  res.send = function (body) {
    // Check if this is a rate limit response
    if (res.statusCode === 429) {
      monitoringService.addAlert(
        "RATE_LIMIT_HIT",
        `Rate limit exceeded for ${req.ip}: ${req.method} ${req.originalUrl}`,
        "warning"
      );
    }

    return originalSend.call(this, body);
  };

  next();
};

/**
 * Database monitoring middleware
 * Tracks database query performance and errors
 */
export const databaseMonitoring = {
  /**
   * Wrap database operations with monitoring
   */
  wrapQuery: (queryFunction, queryName) => {
    return async (...args) => {
      const startTime = Date.now();

      try {
        const result = await queryFunction(...args);
        const duration = Date.now() - startTime;

        // Log successful query
        console.log(`📊 DB Query [${queryName}]: ${duration}ms`);

        // Alert on slow queries
        if (duration > 1000) {
          monitoringService.addAlert(
            "SLOW_QUERY",
            `Slow database query detected: ${queryName} took ${duration}ms`,
            "warning"
          );
        }

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;

        // Log failed query
        console.error(
          `❌ DB Query Failed [${queryName}]: ${error.message} (${duration}ms)`
        );

        monitoringService.addAlert(
          "DATABASE_ERROR",
          `Database query failed: ${queryName} - ${error.message}`,
          "critical"
        );

        throw error;
      }
    };
  },
};

/**
 * Health check middleware
 * Provides system health status
 */
export const healthCheck = (req, res) => {
  const health = monitoringService.getHealthStatus();

  const statusCode =
    health.status === "healthy"
      ? 200
      : health.status === "degraded"
      ? 200
      : 503;

  res.status(statusCode).json({
    status: health.status,
    timestamp: health.timestamp,
    uptime: health.uptime,
    system: {
      memory: health.memoryUsage,
      recentErrors: health.recentErrors,
      avgResponseTime: health.avgResponseTime,
      totalRequests: health.totalRequests,
    },
    checks: {
      database: "connected", // You can add actual DB health check here
      email: "operational", // You can add email service check here
      storage: "available", // You can add storage check here
    },
  });
};

/**
 * Metrics endpoint middleware
 * Provides detailed metrics data
 */
export const metricsEndpoint = (req, res) => {
  try {
    const dashboardData = monitoringService.getDashboardData();
    res.json(dashboardData);
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to retrieve metrics",
      error: error.message,
    });
  }
};

/**
 * Endpoint analytics middleware
 * Provides detailed analytics for specific endpoints
 */
export const endpointAnalytics = (req, res) => {
  try {
    const { endpoint } = req.params;
    const analytics = monitoringService.getEndpointAnalytics(
      decodeURIComponent(endpoint)
    );

    if (!analytics) {
      return res.status(404).json({
        status: "error",
        message: "Endpoint not found",
      });
    }

    res.json(analytics);
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to retrieve endpoint analytics",
      error: error.message,
    });
  }
};

/**
 * Alert management middleware
 */
export const alertsEndpoint = (req, res) => {
  try {
    const { method } = req;

    if (method === "GET") {
      // Get all alerts
      res.json({
        alerts: monitoringService.alerts,
        total: monitoringService.alerts.length,
        unacknowledged: monitoringService.alerts.filter((a) => !a.acknowledged)
          .length,
      });
    } else if (method === "POST") {
      // Acknowledge alert
      const { alertId } = req.body;
      monitoringService.acknowledgeAlert(alertId);
      res.json({ status: "success", message: "Alert acknowledged" });
    } else {
      res.status(405).json({ status: "error", message: "Method not allowed" });
    }
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to manage alerts",
      error: error.message,
    });
  }
};
