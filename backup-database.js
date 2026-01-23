#!/usr/bin/env node
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const BACKUP_DIR = '/mnt/storage/backups/trulycollectables';
const DB_NAME = 'trulycollectables';
const DB_USER = 'truly_admin';
const DB_PASSWORD = process.env.DB_PASSWORD || 'TrulyCollect2024!';
const DB_HOST = 'localhost';

async function backupDatabase() {
    try {
        // Create backup directory if it doesn't exist
        if (!fs.existsSync(BACKUP_DIR)) {
            fs.mkdirSync(BACKUP_DIR, { recursive: true });
            console.log(`✓ Created backup directory: ${BACKUP_DIR}`);
        }

        // Generate backup filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' +
                         new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
        const backupFile = path.join(BACKUP_DIR, `${DB_NAME}_${timestamp}.sql`);

        // Run pg_dump command
        const command = `PGPASSWORD='${DB_PASSWORD}' pg_dump -h ${DB_HOST} -U ${DB_USER} -d ${DB_NAME} -F p -f "${backupFile}"`;

        console.log('Starting database backup...');

        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error('❌ Backup failed:', error.message);
                return;
            }

            if (stderr) {
                console.log('Warnings:', stderr);
            }

            // Check file size
            const stats = fs.statSync(backupFile);
            const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

            console.log('✓ Database backup completed successfully!');
            console.log(`  File: ${backupFile}`);
            console.log(`  Size: ${fileSizeMB} MB`);
            console.log(`  Date: ${new Date().toLocaleString()}`);
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

backupDatabase();
