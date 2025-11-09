#!/usr/bin/env node
/**
 * Generate version.json file for cache busting
 * This script should be run as part of the build process
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get package.json version
const packageJsonPath = path.join(__dirname, "..", "package.json");
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

// Generate version info
const versionInfo = {
  version: packageJson.version || "1.0.0",
  buildTime: new Date().toISOString(),
  buildTimestamp: Date.now(),
};

// Write to dist folder
const distPath = path.join(__dirname, "..", "dist");
const versionFilePath = path.join(distPath, "version.json");

// Ensure dist folder exists
if (!fs.existsSync(distPath)) {
  fs.mkdirSync(distPath, { recursive: true });
}

// Write version file
fs.writeFileSync(versionFilePath, JSON.stringify(versionInfo, null, 2));

console.log("✅ Generated version.json:");
console.log(JSON.stringify(versionInfo, null, 2));
