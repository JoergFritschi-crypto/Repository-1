import { db } from "./db";
import { 
  securityAuditLogs, 
  activeSessions, 
  failedLoginAttempts,
  ipAccessControl,
  securitySettings,
  securityRecommendations,
  rateLimitViolations
} from "@shared/schema";
import { sql } from "drizzle-orm";

async function createTestSecurityData() {
  console.log("Creating test security data...");
  
  try {
    // Get a valid user ID first
    const users = await db.query.users.findMany({ limit: 1 });
    const userId = users[0]?.id || null;
    // Create some audit logs
    await db.insert(securityAuditLogs).values([
      {
        eventType: "login_success",
        eventDescription: "User logged in successfully",
        ipAddress: "192.168.1.1",
        severity: "info",
        success: true
      },
      {
        eventType: "login_failed",
        eventDescription: "Failed login attempt",
        ipAddress: "10.0.0.1",
        severity: "warning",
        success: false
      },
      {
        eventType: "suspicious_activity",
        eventDescription: "Multiple failed login attempts detected",
        ipAddress: "10.0.0.1",
        severity: "critical",
        success: false
      }
    ]);
    console.log("✓ Created audit logs");

    // Create some active sessions (only if we have a valid user)
    if (userId) {
      await db.insert(activeSessions).values({
        userId: userId,
      sessionToken: "test-token-" + Date.now(),
      ipAddress: "192.168.1.1",
      userAgent: "Mozilla/5.0 Test Browser",
      isActive: true
      });
      console.log("✓ Created active session");
    } else {
      console.log("⚠ Skipped creating active session (no users in database)");
    }

    // Create some failed login attempts
    await db.insert(failedLoginAttempts).values([
      {
        ipAddress: "10.0.0.1",
        attemptedEmail: "hacker@test.com",
        attemptCount: 5,
        lastAttempt: new Date()
      },
      {
        ipAddress: "10.0.0.2",
        attemptedEmail: "test@test.com",
        attemptCount: 2,
        lastAttempt: new Date()
      }
    ]);
    console.log("✓ Created failed login attempts");

    // Create some IP access control rules
    await db.insert(ipAccessControl).values([
      {
        ipAddress: "10.0.0.1",
        type: "block",
        reason: "Multiple failed login attempts",
        isActive: true
      }
    ]);
    console.log("✓ Created IP access control rules");

    // Create some security settings
    await db.insert(securitySettings).values([
      {
        key: "two_factor_enabled",
        value: { enabled: false },
        description: "Two-factor authentication status"
      },
      {
        key: "session_timeout",
        value: { minutes: 30 },
        description: "Session timeout in minutes"
      },
      {
        key: "password_complexity",
        value: { minLength: 8, requireSpecialChars: true },
        description: "Password complexity requirements"
      }
    ]);
    console.log("✓ Created security settings");

    // Create some security recommendations
    await db.insert(securityRecommendations).values([
      {
        title: "Enable Two-Factor Authentication",
        description: "Two-factor authentication adds an extra layer of security to user accounts",
        severity: "warning",
        category: "authentication",
        status: "pending",
        priority: 10
      },
      {
        title: "Review Failed Login Attempts",
        description: "Multiple failed login attempts detected from suspicious IP addresses",
        severity: "critical",
        category: "access_control",
        status: "pending",
        priority: 9
      },
      {
        title: "Update Password Policy",
        description: "Consider requiring stronger passwords with minimum 12 characters",
        severity: "info",
        category: "password",
        status: "pending",
        priority: 5
      }
    ]);
    console.log("✓ Created security recommendations");

    // Create some rate limit violations
    await db.insert(rateLimitViolations).values([
      {
        ipAddress: "10.0.0.3",
        endpoint: "/api/auth/login",
        violationCount: 10,
        windowStart: new Date()
      }
    ]);
    console.log("✓ Created rate limit violations");

    console.log("\n✅ Test security data created successfully!");
    
    // Test querying the data
    const auditLogCount = await db.select({ count: sql<number>`count(*)` }).from(securityAuditLogs);
    console.log(`\nTotal audit logs: ${auditLogCount[0].count}`);
    
    const sessionCount = await db.select({ count: sql<number>`count(*)` }).from(activeSessions);
    console.log(`Total active sessions: ${sessionCount[0].count}`);
    
    const recommendationCount = await db.select({ count: sql<number>`count(*)` }).from(securityRecommendations);
    console.log(`Total recommendations: ${recommendationCount[0].count}`);
    
  } catch (error) {
    console.error("Error creating test data:", error);
  }
  
  process.exit(0);
}

createTestSecurityData();