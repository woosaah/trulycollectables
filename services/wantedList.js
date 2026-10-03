const PDFDocument = require('pdfkit');
const pool = require('../config/database');

const NO_SET = 'Other';
const BASE = 'Base';

// Natural sort for card numbers: "LL2" < "LL10", "9" < "10"
const numberKey = n => {
    const s = (n || '').toString();
    const m = s.match(/^(.*?)(\d+)\D*$/);
    return m ? [m[1].toLowerCase(), parseInt(m[2])] : [s.toLowerCase(), -1];
};
const compareNumbers = (a, b) => {
    const [pa, na] = numberKey(a);
    const [pb, nb] = numberKey(b);
    return pa < pb ? -1 : pa > pb ? 1 : na - nb;
};

// PDFKit's built-in fonts are WinAnsi: fold anything outside Latin-1 to its base letter ("ě" -> "e")
const pdfSafe = str => (str || '').replace(/[^\u0000-\u00ff]/g, ch => {
    const base = ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return /^[\u0000-\u00ff]+$/.test(base) ? base : '?';
});

const WantedList = {
    // Want rows for a user, filtered. Catalogue-linked rows take card data from the card itself.
    async fetch(userId, { set, sport, q } = {}) {
        const params = [userId];
        let where = `uc.user_id = $1 AND uc.status = 'want' AND uc.figurine_id IS NULL`;
        if (set) { params.push(set); where += ` AND COALESCE(c.set_name, uc.set_name) = $${params.length}`; }
        if (sport) { params.push(sport); where += ` AND COALESCE(c.sport_type, uc.sport_type) = $${params.length}`; }
        if (q) {
            params.push('%' + q + '%');
            where += ` AND (COALESCE(c.card_name, uc.card_name) ILIKE $${params.length}
                        OR COALESCE(c.card_number, uc.card_number) ILIKE $${params.length})`;
        }
        const result = await pool.query(`
            SELECT
                COALESCE(c.card_name, uc.card_name)     AS card_name,
                COALESCE(c.set_name, uc.set_name)       AS set_name,
                COALESCE(c.card_number, uc.card_number) AS card_number,
                COALESCE(c.insert_list, uc.insert_list) AS insert_list,
                COALESCE(c.sport_type, uc.sport_type)   AS sport_type,
                v.variation_name
            FROM user_collections uc
            LEFT JOIN cards c ON c.id = uc.card_id
            LEFT JOIN card_variations v ON v.id = uc.variation_id
            WHERE ${where}
        `, params);
        return result.rows;
    },

    // Filter options drawn from the user's own wants
    async filterOptions(userId) {
        const result = await pool.query(`
            SELECT DISTINCT COALESCE(c.set_name, uc.set_name) AS set_name, COALESCE(c.sport_type, uc.sport_type) AS sport_type
            FROM user_collections uc LEFT JOIN cards c ON c.id = uc.card_id
            WHERE uc.user_id = $1 AND uc.status = 'want' AND uc.figurine_id IS NULL
        `, [userId]);
        const uniq = key => [...new Set(result.rows.map(r => r[key]).filter(Boolean))].sort();
        return { sets: uniq('set_name'), sports: uniq('sport_type') };
    },

    // [{ set, count, inserts: [{ name, cards: [{ number, name, variation }] }] }]
    group(rows) {
        const sets = new Map();
        for (const r of rows) {
            const setName = r.set_name || NO_SET;
            const insert = r.insert_list || BASE;
            if (!sets.has(setName)) sets.set(setName, new Map());
            const inserts = sets.get(setName);
            if (!inserts.has(insert)) inserts.set(insert, []);
            inserts.get(insert).push({
                number: r.card_number || '',
                name: r.card_name,
                variation: r.variation_name ? r.variation_name.replace(/\s*parallel$/i, '') : null
            });
        }
        const sortInserts = (a, b) => (a === BASE ? -1 : b === BASE ? 1 : a.localeCompare(b));
        return [...sets.entries()]
            .sort(([a], [b]) => (a === NO_SET ? 1 : b === NO_SET ? -1 : a.localeCompare(b)))
            .map(([set, inserts]) => {
                const list = [...inserts.entries()].sort(([a], [b]) => sortInserts(a, b)).map(([name, cards]) => ({
                    name,
                    cards: cards.sort((x, y) => compareNumbers(x.number, y.number) || x.name.localeCompare(y.name))
                }));
                return { set, count: list.reduce((n, i) => n + i.cards.length, 0), inserts: list };
            });
    },

    cardLabel(card, mode) {
        const num = card.number ? '#' + card.number : '';
        const variant = card.variation ? ` (${card.variation})` : '';
        if (mode === 'numbers') return (card.number || card.name) + variant;
        return [num, card.name].filter(Boolean).join(' ') + variant;
    },

    toText(groups, mode, owner) {
        const total = groups.reduce((n, g) => n + g.count, 0);
        const lines = [`WANTED${owner ? ' — ' + owner : ''} (${total} card${total === 1 ? '' : 's'})`];
        for (const g of groups) {
            lines.push('', `${g.set}`);
            for (const ins of g.inserts) {
                const labels = ins.cards.map(c => this.cardLabel(c, mode));
                if (mode === 'numbers') {
                    lines.push(`${ins.name}: ${labels.join(', ')}`);
                } else {
                    lines.push(`  ${ins.name}`);
                    labels.forEach(l => lines.push(`  - ${l}`));
                }
            }
        }
        return lines.join('\n');
    },

    // Stream an A4 PDF to `out` (an http response or any writable stream)
    toPdf(groups, mode, out, { owner, filtersLabel } = {}) {
        const doc = new PDFDocument({ size: 'A4', margin: 40, info: { Title: 'Wanted list' } });
        doc.pipe(out);

        const total = groups.reduce((n, g) => n + g.count, 0);
        const width = doc.page.width - 80;
        const bottom = () => doc.page.height - 50;

        doc.font('Helvetica-Bold').fontSize(18).text(pdfSafe(`Wanted list${owner ? ' - ' + owner : ''}`));
        doc.font('Helvetica').fontSize(9).fillColor('#666')
            .text(pdfSafe(`${total} card${total === 1 ? '' : 's'} · ${new Date().toLocaleDateString('en-NZ')}${filtersLabel ? ' · ' + filtersLabel : ''} · TrulyCollectables`));
        doc.fillColor('#000').moveDown(0.8);

        for (const g of groups) {
            if (doc.y > bottom() - 60) doc.addPage();
            doc.font('Helvetica-Bold').fontSize(13).text(pdfSafe(g.set), { continued: true })
                .font('Helvetica').fontSize(9).fillColor('#666').text(`   ${g.count}`);
            doc.fillColor('#000');
            doc.moveTo(40, doc.y + 1).lineTo(40 + width, doc.y + 1).strokeColor('#ccc').stroke();
            doc.moveDown(0.4);

            for (const ins of g.inserts) {
                if (doc.y > bottom() - 30) doc.addPage();
                doc.font('Helvetica-Bold').fontSize(10).text(pdfSafe(ins.name));
                doc.font('Helvetica').fontSize(10);
                const labels = ins.cards.map(c => pdfSafe(this.cardLabel(c, mode)));
                if (mode === 'numbers') {
                    doc.text(labels.join(',  '), { width, lineGap: 2 });
                } else {
                    // Two columns of names with a tick box each
                    const colW = width / 2;
                    for (let i = 0; i < labels.length; i += 2) {
                        if (doc.y > bottom()) doc.addPage();
                        const y = doc.y;
                        [labels[i], labels[i + 1]].forEach((label, col) => {
                            if (!label) return;
                            const x = 40 + col * colW;
                            doc.rect(x, y + 1.5, 7, 7).strokeColor('#999').stroke();
                            doc.text(label, x + 12, y, { width: colW - 16, ellipsis: true, lineBreak: false });
                        });
                        doc.x = 40;
                        doc.y = y + 14;
                    }
                }
                doc.moveDown(0.5);
            }
            doc.moveDown(0.4);
        }
        if (!groups.length) doc.font('Helvetica').fontSize(11).text('No wanted cards match these filters.');
        doc.end();
    }
};

module.exports = WantedList;
