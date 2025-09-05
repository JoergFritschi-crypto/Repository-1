// File Vault Service for GardenScape Pro
// Manages saving of all reports, designs, and images with tier-based retention

import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export interface FileVaultItem {
  id: string;
  userId: string;
  fileName: string;
  fileType: 'climate_report' | 'garden_design' | 'garden_image' | 'plant_report';
  contentType: 'json' | 'pdf' | 'image' | 'html';
  filePath: string;
  metadata: any;
  expiresAt: Date | null; // null means permanent
  createdAt: Date;
}

export class FileVaultService {
  private vaultBasePath: string;

  constructor() {
    // Use a proper vault directory
    this.vaultBasePath = process.env.FILE_VAULT_PATH || './vault';
    this.initializeVault();
  }

  private async initializeVault() {
    try {
      await fs.mkdir(this.vaultBasePath, { recursive: true });
      await fs.mkdir(path.join(this.vaultBasePath, 'climate_reports'), { recursive: true });
      await fs.mkdir(path.join(this.vaultBasePath, 'garden_designs'), { recursive: true });
      await fs.mkdir(path.join(this.vaultBasePath, 'garden_images'), { recursive: true });
      await fs.mkdir(path.join(this.vaultBasePath, 'plant_reports'), { recursive: true });
    } catch (error) {
      console.error('Error initializing vault directories:', error);
    }
  }

  // Determine user tier based on subscription status
  private async getUserTier(userId: string): Promise<'free' | 'tier2' | 'tier3'> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) return 'free';
      
      // Check subscription status
      if (user.subscriptionStatus === 'active' && user.stripeSubscriptionId) {
        // You could check the actual subscription plan here
        // For now, we'll assume active subscription = tier2
        return 'tier2';
      }
      
      // Check if admin (tier3)
      if (user.isAdmin) {
        return 'tier3';
      }
      
      return 'free';
    } catch (error) {
      console.error('Error getting user tier:', error);
      return 'free';
    }
  }

  // Calculate expiration based on tier
  private getExpirationDate(tier: 'free' | 'tier2' | 'tier3'): Date | null {
    switch (tier) {
      case 'free':
        // 72 hours retention for free tier
        const expirationDate = new Date();
        expirationDate.setHours(expirationDate.getHours() + 72);
        return expirationDate;
      case 'tier2':
      case 'tier3':
        // Permanent retention for paid tiers
        return null;
      default:
        // Default to free tier retention
        const defaultExpiration = new Date();
        defaultExpiration.setHours(defaultExpiration.getHours() + 72);
        return defaultExpiration;
    }
  }

  // Save climate report to vault
  async saveClimateReport(userId: string, location: string, reportData: any): Promise<FileVaultItem> {
    const userTier = await this.getUserTier(userId);
    const expiresAt = this.getExpirationDate(userTier);
    
    const fileId = crypto.randomUUID();
    const fileName = `climate_report_${location.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.json`;
    const filePath = path.join(this.vaultBasePath, 'climate_reports', fileName);
    
    // Format the report with proper date formatting
    const formattedReport = this.formatClimateReport(reportData);
    
    // Save to file system
    await fs.writeFile(filePath, JSON.stringify(formattedReport, null, 2));
    
    // Create vault record
    const vaultItem: FileVaultItem = {
      id: fileId,
      userId,
      fileName,
      fileType: 'climate_report',
      contentType: 'json',
      filePath,
      metadata: {
        location,
        userTier,
        dataRange: reportData.data_range,
        generatedAt: new Date().toISOString()
      },
      expiresAt,
      createdAt: new Date()
    };
    
    // Store vault record in database
    try {
      const storage = require('./storage').storage;
      await storage.createVaultItem({
        userId,
        fileName,
        fileType: 'climate_report',
        contentType: 'json',
        filePath,
        metadata: vaultItem.metadata,
        expiresAt
      });
    } catch (dbError) {
      console.error('Error saving vault record to database:', dbError);
    }
    
    console.log(`Saved climate report for ${location} to vault (Tier: ${userTier}, Expires: ${expiresAt ? expiresAt.toISOString() : 'Never'})`);
    
    return vaultItem;
  }

  // Save garden design to vault
  async saveGardenDesign(userId: string, gardenName: string, designData: any): Promise<FileVaultItem> {
    const userTier = await this.getUserTier(userId);
    const expiresAt = this.getExpirationDate(userTier);
    
    const fileId = crypto.randomUUID();
    const fileName = `garden_design_${gardenName.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.json`;
    const filePath = path.join(this.vaultBasePath, 'garden_designs', fileName);
    
    // Save to file system
    await fs.writeFile(filePath, JSON.stringify(designData, null, 2));
    
    // Create vault record
    const vaultItem: FileVaultItem = {
      id: fileId,
      userId,
      fileName,
      fileType: 'garden_design',
      contentType: 'json',
      filePath,
      metadata: {
        gardenName,
        userTier,
        generatedAt: new Date().toISOString()
      },
      expiresAt,
      createdAt: new Date()
    };
    
    console.log(`Saved garden design "${gardenName}" to vault (Tier: ${userTier}, Expires: ${expiresAt ? expiresAt.toISOString() : 'Never'})`);
    
    return vaultItem;
  }

  // Save garden image to vault
  async saveGardenImage(userId: string, gardenName: string, imageBuffer: Buffer, mimeType: string): Promise<FileVaultItem> {
    const userTier = await this.getUserTier(userId);
    const expiresAt = this.getExpirationDate(userTier);
    
    const fileId = crypto.randomUUID();
    const extension = mimeType.split('/')[1] || 'png';
    const fileName = `garden_image_${gardenName.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.${extension}`;
    const filePath = path.join(this.vaultBasePath, 'garden_images', fileName);
    
    // Save to file system
    await fs.writeFile(filePath, imageBuffer);
    
    // Create vault record
    const vaultItem: FileVaultItem = {
      id: fileId,
      userId,
      fileName,
      fileType: 'garden_image',
      contentType: 'image',
      filePath,
      metadata: {
        gardenName,
        userTier,
        mimeType,
        size: imageBuffer.length,
        generatedAt: new Date().toISOString()
      },
      expiresAt,
      createdAt: new Date()
    };
    
    console.log(`Saved garden image for "${gardenName}" to vault (Tier: ${userTier}, Expires: ${expiresAt ? expiresAt.toISOString() : 'Never'})`);
    
    return vaultItem;
  }

  // Format climate report with proper date formatting
  private formatClimateReport(data: any): any {
    const formatted = { ...data };
    
    // Format frost dates to written-out format
    if (formatted.frost_dates) {
      if (formatted.frost_dates.last_frost) {
        formatted.frost_dates.last_frost_formatted = this.formatDate(formatted.frost_dates.last_frost);
      }
      if (formatted.frost_dates.first_frost) {
        formatted.frost_dates.first_frost_formatted = this.formatDate(formatted.frost_dates.first_frost);
      }
    }
    
    // Format growing season dates
    if (formatted.growing_season) {
      if (formatted.growing_season.start) {
        formatted.growing_season.start_formatted = this.formatDate(formatted.growing_season.start);
      }
      if (formatted.growing_season.end) {
        formatted.growing_season.end_formatted = this.formatDate(formatted.growing_season.end);
      }
    }
    
    // Ensure all numbers have one decimal place
    if (typeof formatted.annual_rainfall === 'number') {
      formatted.annual_rainfall = parseFloat(formatted.annual_rainfall.toFixed(1));
    }
    if (typeof formatted.avg_temp_min === 'number') {
      formatted.avg_temp_min = parseFloat(formatted.avg_temp_min.toFixed(1));
    }
    if (typeof formatted.avg_temp_max === 'number') {
      formatted.avg_temp_max = parseFloat(formatted.avg_temp_max.toFixed(1));
    }
    if (typeof formatted.avg_humidity === 'number') {
      formatted.avg_humidity = parseFloat(formatted.avg_humidity.toFixed(1));
    }
    if (typeof formatted.avg_wind_speed === 'number') {
      formatted.avg_wind_speed = parseFloat(formatted.avg_wind_speed.toFixed(1));
    }
    if (typeof formatted.sunshine_hours === 'number') {
      formatted.sunshine_hours = parseFloat(formatted.sunshine_hours.toFixed(1));
    }
    
    // Include metadata
    formatted.generated_at = new Date().toISOString();
    formatted.report_version = '1.0';
    
    return formatted;
  }

  // Format date to written-out format (e.g., "April 15, 2024")
  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    const month = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    
    return `${month} ${day}, ${year}`;
  }

  // Clean up expired files (run periodically)
  async cleanupExpiredFiles(): Promise<number> {
    // This would be implemented to scan the vault and remove expired files
    // For now, just return 0
    console.log('Running vault cleanup...');
    return 0;
  }

  // Get user's vault items
  async getUserVaultItems(userId: string): Promise<FileVaultItem[]> {
    // This would query the database for user's vault items
    // For now, return empty array
    return [];
  }
}

export const fileVaultService = new FileVaultService();