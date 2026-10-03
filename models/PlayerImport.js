const db = require('../config/database');
const fs = require('fs');
const { parse } = require('csv-parse');

class PlayerImport {
    static async parseCSV(filePath) {
        return new Promise((resolve, reject) => {
            const results = [];
            const errors = [];
            let rowNumber = 0;

            fs.createReadStream(filePath)
                .pipe(parse({
                    columns: (header) => header.map(h => h.replace(/^﻿/, '').toLowerCase().trim().replace(/[\s-]+/g, '_')),
                    skip_empty_lines: true,
                    trim: true,
                    relax_quotes: true,
                    bom: true
                }))
                .on('data', (row) => {
                    rowNumber++;
                    try {
                        const mapped = this.mapRow(row);
                        const validation = this.validateRow(mapped, rowNumber);

                        if (validation.valid) {
                            results.push(mapped);
                        } else {
                            errors.push({ row: rowNumber, data: row, errors: validation.errors });
                        }
                    } catch (error) {
                        errors.push({ row: rowNumber, data: row, errors: [error.message] });
                    }
                })
                .on('end', () => resolve({ results, errors, totalRows: rowNumber }))
                .on('error', (error) => reject(error));
        });
    }

    static mapRow(row) {
        const boolField = (val) => {
            if (!val) return false;
            const v = val.toString().toLowerCase().trim();
            return v === 'true' || v === 'yes' || v === '1' || v === 'y';
        };

        const sportsStr = row.sports_played || '';
        const sportsPlayed = sportsStr ? sportsStr.split(/[,;|]/).map(s => s.trim()).filter(s => s) : [];

        const toTitleCase = (str) => str.trim().toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

        return {
            name: row.name ? toTitleCase(row.name) : '',
            born_in_nz: boolField(row.born_in_nz),
            is_female: boolField(row.is_female),
            sports_played: sportsPlayed,
            played_for_all_blacks: boolField(row.played_for_all_blacks),
            played_for_maori: boolField(row.played_for_maori),
            played_for_kiwis: boolField(row.played_for_kiwis),
            played_for_maori_rl: boolField(row.played_for_maori_rl),
            played_for_black_caps: boolField(row.played_for_black_caps),
            played_for_white_ferns: boolField(row.played_for_white_ferns),
            played_for_black_ferns: boolField(row.played_for_black_ferns),
            played_for_kiwi_ferns: boolField(row.played_for_kiwi_ferns),
            played_for_tall_blacks: boolField(row.played_for_tall_blacks),
            played_for_other: boolField(row.played_for_other),
            other_teams: row.other_teams || '',
            bio: row.bio || ''
        };
    }

    static validateRow(row, rowNumber) {
        const errors = [];
        if (!row.name || row.name.trim() === '') {
            errors.push('Player name is required');
        }
        return { valid: errors.length === 0, errors };
    }

    static async importPlayers(rows, userId) {
        const client = await db.connect();
        let successful = 0;
        let failed = 0;
        let skipped = 0;
        const errorLog = [];

        try {
            await client.query('BEGIN');

            for (const row of rows) {
                try {
                    // Check for duplicate by name
                    const existing = await client.query(
                        'SELECT id FROM players WHERE LOWER(name) = LOWER($1)',
                        [row.name.trim()]
                    );

                    if (existing.rows.length > 0) {
                        // Update existing player
                        await client.query(`
                            UPDATE players SET
                                born_in_nz = $1, is_female = $2, sports_played = $3,
                                played_for_all_blacks = $4, played_for_maori = $5,
                                played_for_kiwis = $6, played_for_maori_rl = $7,
                                played_for_black_caps = $8, played_for_white_ferns = $9,
                                played_for_black_ferns = $10, played_for_kiwi_ferns = $11,
                                played_for_tall_blacks = $12,
                                played_for_other = $13, other_teams = $14, bio = $15
                            WHERE id = $16
                        `, [
                            row.born_in_nz, row.is_female, row.sports_played,
                            row.played_for_all_blacks, row.played_for_maori,
                            row.played_for_kiwis, row.played_for_maori_rl,
                            row.played_for_black_caps, row.played_for_white_ferns,
                            row.played_for_black_ferns, row.played_for_kiwi_ferns,
                            row.played_for_tall_blacks,
                            row.played_for_other,
                            row.other_teams || null, row.bio || null,
                            existing.rows[0].id
                        ]);
                        successful++;
                    } else {
                        await client.query(`
                            INSERT INTO players (
                                name, born_in_nz, is_female, sports_played,
                                played_for_all_blacks, played_for_maori, played_for_kiwis,
                                played_for_maori_rl, played_for_black_caps, played_for_white_ferns,
                                played_for_black_ferns, played_for_kiwi_ferns,
                                played_for_tall_blacks, played_for_other,
                                other_teams, bio
                            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
                        `, [
                            row.name.trim(), row.born_in_nz, row.is_female, row.sports_played,
                            row.played_for_all_blacks, row.played_for_maori,
                            row.played_for_kiwis, row.played_for_maori_rl,
                            row.played_for_black_caps, row.played_for_white_ferns,
                            row.played_for_black_ferns, row.played_for_kiwi_ferns,
                            row.played_for_tall_blacks,
                            row.played_for_other,
                            row.other_teams || null, row.bio || null
                        ]);
                        successful++;
                    }
                } catch (error) {
                    failed++;
                    errorLog.push({ name: row.name, error: error.message });
                }
            }

            await client.query('COMMIT');
            return { successful, failed, skipped, totalRows: rows.length, errors: errorLog };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    static generateTemplate() {
        const headers = [
            'name', 'born_in_nz', 'is_female', 'sports_played',
            'played_for_all_blacks', 'played_for_maori', 'played_for_kiwis',
            'played_for_maori_rl', 'played_for_black_caps', 'played_for_white_ferns',
            'played_for_black_ferns', 'played_for_kiwi_ferns', 'played_for_tall_blacks', 'played_for_other', 'other_teams', 'bio'
        ];

        const sampleRows = [
            ['Beauden Barrett', 'yes', 'no', 'Rugby', 'yes', 'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no', '', 'All Blacks first five-eighth'],
            ['Kane Williamson', 'yes', 'no', 'Cricket', 'no', 'no', 'no', 'no', 'yes', 'no', 'no', 'no', 'no', 'no', '', 'Black Caps captain'],
            ['Sonny Bill Williams', 'yes', 'no', 'Rugby|Rugby League|Boxing', 'yes', 'no', 'yes', 'no', 'no', 'no', 'no', 'no', 'no', 'no', '', 'Multi-sport athlete'],
            ['Suzie Bates', 'yes', 'yes', 'Cricket', 'no', 'no', 'no', 'no', 'no', 'yes', 'yes', 'no', 'no', 'no', '', 'White Ferns and Black Ferns legend'],
            ['Roger Tuivasa-Sheck', 'yes', 'no', 'Rugby|Rugby League', 'yes', 'no', 'yes', 'no', 'no', 'no', 'no', 'no', 'no', 'no', '', 'Switched from league to union'],
            ['Shaun Johnson', 'yes', 'no', 'Rugby League', 'no', 'no', 'yes', 'yes', 'no', 'no', 'no', 'no', 'no', 'no', '', 'Warriors halfback and Kiwis rep'],
        ];

        const csvLines = [headers.join(',')];
        sampleRows.forEach(row => {
            const escapedRow = row.map(value => {
                if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('|')) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            });
            csvLines.push(escapedRow.join(','));
        });

        return { headers, sampleRows, csv: csvLines.join('\n') };
    }
}

module.exports = PlayerImport;
