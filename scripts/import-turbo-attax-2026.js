'use strict';
const pool = require('../config/database');

const SET = '2026 Topps Turbo Attax Formula 1';
const YEAR = 2026;
const MANUFACTURER = 'Topps';

const TEAMS = [
    'McLaren Mastercard Formula 1 Team',
    'Mercedes-AMG PETRONAS Formula 1 Team',
    'Oracle Red Bull Racing',
    'Scuderia Ferrari HP',
    'Atlassian Williams F1 Team',
    'VISA Cash App Racing Bulls Formula One Team',
    'Aston Martin Aramco Formula One Team',
    'TGR Haas F1 Team',
    'Audi Revolut F1 Team',
    'BWT Alpine Formula One Team',
    'Cadillac Formula 1 Team',
    'KICK Sauber F1 Team',
    'Invicta Racing', 'Trident', 'MP Motorsport', 'Hitech TGR',
    'Campos Racing', 'DAMS Lucas Oil', 'PREMA Racing',
    'Rodin Motorsport', 'ART Grand Prix', 'AIX Racing',
    'Van Amersfoort Racing',
];

function parseLine(line, defaultSubset) {
    line = line.trim();
    if (!line) return null;

    // Extract subset from trailing parentheses
    let subset = defaultSubset;
    const subsetMatch = line.match(/\(([^)]+)\)$/);
    if (subsetMatch) {
        subset = subsetMatch[1];
        line = line.slice(0, line.lastIndexOf('(')).trim();
    }

    // Extract card number prefix
    const numMatch = line.match(/^([A-Z]+-[A-Z]+|[A-Z]+\s+\d+|\d+)\s+(.+)$/);
    if (!numMatch) { console.warn('No number:', line); return null; }

    const cardNumber = numMatch[1];
    const rest = numMatch[2];

    // Extract team from end of name string
    let cardName = rest;
    let team = null;
    for (const t of TEAMS) {
        if (rest === t) { cardName = t; team = t; break; }
        if (rest.endsWith(', ' + t)) {
            cardName = rest.slice(0, rest.length - t.length - 2);
            team = t;
            break;
        }
    }

    return { cardNumber, cardName, team, subset };
}

const sections = [
    { subset: null, data: `
1 McLaren Mastercard Formula 1 Team (F1 Team Logos)
2 Andrea Stella, McLaren Mastercard Formula 1 Team (2026 F1 Team Principals)
3 Lando Norris, & Oscar Piastri, McLaren Mastercard Formula 1 Team (2026 F1 Dynamic Duos)
4 Lando Norris, McLaren Mastercard Formula 1 Team (2026 F1 Hero)
5 Lando Norris, McLaren Mastercard Formula 1 Team (Power In Numbers)
6 Lando Norris, McLaren Mastercard Formula 1 Team (Lightning Lids)
7 Oscar Piastri, McLaren Mastercard Formula 1 Team (2026 F1 Hero)
8 Oscar Piastri, McLaren Mastercard Formula 1 Team (Power In Numbers)
9 Oscar Piastri, McLaren Mastercard Formula 1 Team (Lightning Lids)
10 Mercedes-AMG PETRONAS Formula 1 Team (F1 Team Logos)
11 Toto Wolff, Mercedes-AMG PETRONAS Formula 1 Team (2026 F1 Team Principals)
12 George Russell, & Kimi Antonelli, Mercedes-AMG PETRONAS Formula 1 Team (2026 F1 Dynamic Duos)
13 George Russell, Mercedes-AMG PETRONAS Formula 1 Team (2026 F1 Hero)
14 George Russell, Mercedes-AMG PETRONAS Formula 1 Team (Power In Numbers)
15 George Russell, Mercedes-AMG PETRONAS Formula 1 Team (Lightning Lids)
16 Kimi Antonelli, Mercedes-AMG PETRONAS Formula 1 Team (2026 F1 Hero)
17 Kimi Antonelli, Mercedes-AMG PETRONAS Formula 1 Team (Power In Numbers)
18 Kimi Antonelli, Mercedes-AMG PETRONAS Formula 1 Team (Lightning Lids)
19 Oracle Red Bull Racing (F1 Team Logos)
20 Laurent Mekies, Oracle Red Bull Racing (2026 F1 Team Principals)
21 Max Verstappen, & Isack Hadjar, Oracle Red Bull Racing (2026 F1 Dynamic Duos)
22 Max Verstappen, Oracle Red Bull Racing (2026 F1 Hero)
23 Max Verstappen, Oracle Red Bull Racing (Power In Numbers)
24 Max Verstappen, Oracle Red Bull Racing (Lightning Lids)
25 Isack Hadjar, Oracle Red Bull Racing (2026 F1 Hero)
26 Isack Hadjar, Oracle Red Bull Racing (Power In Numbers)
27 Isack Hadjar, Oracle Red Bull Racing (Lightning Lids)
28 Scuderia Ferrari HP (F1 Team Logos)
29 Frederic Vasseur, Scuderia Ferrari HP (2026 F1 Team Principals)
30 Charles Leclerc, & Lewis Hamilton, Scuderia Ferrari HP (2026 F1 Dynamic Duos)
31 Charles Leclerc, Scuderia Ferrari HP (2026 F1 Hero)
32 Charles Leclerc, Scuderia Ferrari HP (Power In Numbers)
33 Charles Leclerc, Scuderia Ferrari HP (Lightning Lids)
34 Lewis Hamilton, Scuderia Ferrari HP (2026 F1 Hero)
35 Lewis Hamilton, Scuderia Ferrari HP (Power In Numbers)
36 Lewis Hamilton, Scuderia Ferrari HP (Lightning Lids)
37 Atlassian Williams F1 Team (F1 Team Logos)
38 James Vowles, Atlassian Williams F1 Team (2026 F1 Team Principals)
39 Alex Albon, & Carlos Sainz, Atlassian Williams F1 Team (2026 F1 Dynamic Duos)
40 Alex Albon, Atlassian Williams F1 Team (2026 F1 Hero)
41 Alex Albon, Atlassian Williams F1 Team (Power In Numbers)
42 Alex Albon, Atlassian Williams F1 Team (Lightning Lids)
43 Carlos Sainz, Atlassian Williams F1 Team (2026 F1 Hero)
44 Carlos Sainz, Atlassian Williams F1 Team (Power In Numbers)
45 Carlos Sainz, Atlassian Williams F1 Team (Lightning Lids)
46 VISA Cash App Racing Bulls Formula One Team (F1 Team Logos)
47 Alan Permane, VISA Cash App Racing Bulls Formula One Team (2026 F1 Team Principals)
48 Liam Lawson, & Arvid Lindblad, VISA Cash App Racing Bulls Formula One Team (2026 F1 Dynamic Duos)
49 Liam Lawson, VISA Cash App Racing Bulls Formula One Team (2026 F1 Hero)
50 Liam Lawson, VISA Cash App Racing Bulls Formula One Team (Power In Numbers)
51 Liam Lawson, VISA Cash App Racing Bulls Formula One Team (Lightning Lids)
52 Arvid Lindblad, VISA Cash App Racing Bulls Formula One Team (2026 F1 Hero)
53 Arvid Lindblad, VISA Cash App Racing Bulls Formula One Team (Power In Numbers)
54 Arvid Lindblad, VISA Cash App Racing Bulls Formula One Team (Lightning Lids)
55 Aston Martin Aramco Formula One Team (F1 Team Logos)
56 Adrian Newey, Aston Martin Aramco Formula One Team (2026 F1 Team Principals)
57 Fernando Alonso, & Lance Stroll, Aston Martin Aramco Formula One Team (2026 F1 Dynamic Duos)
58 Fernando Alonso, Aston Martin Aramco Formula One Team (2026 F1 Hero)
59 Fernando Alonso, Aston Martin Aramco Formula One Team (Power In Numbers)
60 Fernando Alonso, Aston Martin Aramco Formula One Team (Lightning Lids)
61 Lance Stroll, Aston Martin Aramco Formula One Team (2026 F1 Hero)
62 Lance Stroll, Aston Martin Aramco Formula One Team (Power In Numbers)
63 Lance Stroll, Aston Martin Aramco Formula One Team (Lightning Lids)
64 TGR Haas F1 Team (F1 Team Logos)
65 Ayao Komatsu, TGR Haas F1 Team (2026 F1 Team Principals)
66 Oliver Bearman, & Esteban Ocon, TGR Haas F1 Team (2026 F1 Dynamic Duos)
67 Oliver Bearman, TGR Haas F1 Team (2026 F1 Hero)
68 Oliver Bearman, TGR Haas F1 Team (Power In Numbers)
69 Oliver Bearman, TGR Haas F1 Team (Lightning Lids)
70 Esteban Ocon, TGR Haas F1 Team (2026 F1 Hero)
71 Esteban Ocon, TGR Haas F1 Team (Power In Numbers)
72 Esteban Ocon, TGR Haas F1 Team (Lightning Lids)
73 Audi Revolut F1 Team (F1 Team Logos)
74 Mattia Binotto, Audi Revolut F1 Team (2026 F1 Team Principals)
75 Nico Hulkenberg, & Gabriel Bortoleto, Audi Revolut F1 Team (2026 F1 Dynamic Duos)
76 Nico Hulkenberg, Audi Revolut F1 Team (2026 F1 Hero)
77 Nico Hulkenberg, Audi Revolut F1 Team (Power In Numbers)
78 Nico Hulkenberg, Audi Revolut F1 Team (Lightning Lids)
79 Gabriel Bortoleto, Audi Revolut F1 Team (2026 F1 Hero)
80 Gabriel Bortoleto, Audi Revolut F1 Team (Power In Numbers)
81 Gabriel Bortoleto, Audi Revolut F1 Team (Lightning Lids)
82 BWT Alpine Formula One Team (F1 Team Logos)
83 Steve Nielsen, BWT Alpine Formula One Team (2026 F1 Team Principals)
84 Pierre Gasly, & Franco Colapinto, BWT Alpine Formula One Team (2026 F1 Dynamic Duos)
85 Pierre Gasly, BWT Alpine Formula One Team (2026 F1 Hero)
86 Pierre Gasly, BWT Alpine Formula One Team (Power In Numbers)
87 Pierre Gasly, BWT Alpine Formula One Team (Lightning Lids)
88 Franco Colapinto, BWT Alpine Formula One Team (2026 F1 Hero)
89 Franco Colapinto, BWT Alpine Formula One Team (Power In Numbers)
90 Franco Colapinto, BWT Alpine Formula One Team (Lightning Lids)
91 Cadillac Formula 1 Team (F1 Team Logos)
92 Graeme Lowdon, Cadillac Formula 1 Team (2026 F1 Team Principals)
93 Sergio Perez, & Valtteri Bottas, Cadillac Formula 1 Team (2026 F1 Dynamic Duos)
94 Sergio Perez, Cadillac Formula 1 Team (2026 F1 Hero)
95 Sergio Perez, Cadillac Formula 1 Team (Power In Numbers)
96 Sergio Perez, Cadillac Formula 1 Team (Lightning Lids)
97 Valtteri Bottas, Cadillac Formula 1 Team (2026 F1 Hero)
98 Valtteri Bottas, Cadillac Formula 1 Team (Power In Numbers)
99 Valtteri Bottas, Cadillac Formula 1 Team (Lightning Lids)
100 Lewis Hamilton, Scuderia Ferrari HP (Epic Moments)
101 Kimi Antonelli, Mercedes-AMG PETRONAS Formula 1 Team (Epic Moments)
102 Max Verstappen, Oracle Red Bull Racing (Epic Moments)
103 George Russell, Mercedes-AMG PETRONAS Formula 1 Team (Epic Moments)
104 Kimi Antonelli, Mercedes-AMG PETRONAS Formula 1 Team (Epic Moments)
105 Lando Norris, McLaren Mastercard Formula 1 Team (Epic Moments)
106 Nico Hulkenberg, KICK Sauber F1 Team (Epic Moments)
107 Oscar Piastri, McLaren Mastercard Formula 1 Team (Epic Moments)
108 Charles Leclerc, Scuderia Ferrari HP (Epic Moments)
109 Lando Norris, McLaren Mastercard Formula 1 Team (Epic Moments)
110 Isack Hadjar, VISA Cash App Racing Bulls Formula One Team (Epic Moments)
111 Max Verstappen, Oracle Red Bull Racing (Epic Moments)
112 Carlos Sainz, Atlassian Williams F1 Team (Epic Moments)
113 Liam Lawson, VISA Cash App Racing Bulls Formula One Team (Epic Moments)
114 Oliver Bearman, TGR Haas F1 Team (Epic Moments)
115 Kimi Antonelli, Mercedes-AMG PETRONAS Formula 1 Team (Epic Moments)
116 Carlos Sainz, Atlassian Williams F1 Team (Epic Moments)
117 Lando Norris, McLaren Mastercard Formula 1 Team (Epic Moments)
118 Oscar Piastri, McLaren Mastercard Formula 1 Team (Speed Silhouettes)
119 George Russell, Mercedes-AMG PETRONAS Formula 1 Team (Speed Silhouettes)
120 Kimi Antonelli, Mercedes-AMG PETRONAS Formula 1 Team (Speed Silhouettes)
121 Charles Leclerc, Scuderia Ferrari HP (Speed Silhouettes)
122 Alex Albon, Atlassian Williams F1 Team (Speed Silhouettes)
123 Carlos Sainz, Atlassian Williams F1 Team (Speed Silhouettes)
124 Liam Lawson, VISA Cash App Racing Bulls Formula One Team (Speed Silhouettes)
125 Arvid Lindblad, VISA Cash App Racing Bulls Formula One Team (Speed Silhouettes)
126 Fernando Alonso, Aston Martin Aramco Formula One Team (Speed Silhouettes)
127 Lance Stroll, Aston Martin Aramco Formula One Team (Speed Silhouettes)
128 Oliver Bearman, TGR Haas F1 Team (Speed Silhouettes)
129 Esteban Ocon, TGR Haas F1 Team (Speed Silhouettes)
130 Nico Hulkenberg, Audi Revolut F1 Team (Speed Silhouettes)
131 Gabriel Bortoleto, Audi Revolut F1 Team (Speed Silhouettes)
132 Pierre Gasly, BWT Alpine Formula One Team (Speed Silhouettes)
133 Franco Colapinto, BWT Alpine Formula One Team (Speed Silhouettes)
134 Sergio Perez, Cadillac Formula 1 Team (Speed Silhouettes)
135 Valtteri Bottas, Cadillac Formula 1 Team (Speed Silhouettes)
136 Sir Stirling Moss (Legends Of The Grid)
137 Sir Jack Brabham (Legends Of The Grid)
138 Graham Hill (Legends Of The Grid)
139 Sir Jackie Stewart (Legends Of The Grid)
140 Emerson Fittipaldi (Legends Of The Grid)
141 Jody Scheckter (Legends Of The Grid)
142 Riccardo Patrese (Legends Of The Grid)
143 Nigel Mansell (Legends Of The Grid)
144 Alain Prost (Legends Of The Grid)
145 Mika Hakkinen (Legends Of The Grid)
146 Michael Schumacher (Legends Of The Grid)
147 Damon Hill (Legends Of The Grid)
148 Rubens Barrichello (Legends Of The Grid)
149 Kimi Raikkonen (Legends Of The Grid)
150 Mark Webber (Legends Of The Grid)
151 Max Verstappen, Oracle Red Bull Racing (2025 F1 Sprint Superstars)
152 George Russell, Mercedes-AMG PETRONAS Formula 1 Team (2025 F1 Sprint Superstars)
153 Lando Norris, McLaren Mastercard Formula 1 Team (2025 F1 Sprint Superstars)
154 Oscar Piastri, McLaren Mastercard Formula 1 Team (2025 F1 Sprint Superstars)
155 Lewis Hamilton, Scuderia Ferrari HP (2025 F1 Sprint Superstars)
156 Kimi Antonelli, Mercedes-AMG PETRONAS Formula 1 Team (2025 F1 Sprint Superstars)
157 Fernando Alonso, Aston Martin Aramco Formula One Team (Drivercore)
158 Lewis Hamilton, Scuderia Ferrari HP (Drivercore)
159 Sergio Perez, Cadillac Formula 1 Team (Drivercore)
160 Nico Hulkenberg, Audi Revolut F1 Team (Drivercore)
161 Valtteri Bottas, Cadillac Formula 1 Team (Drivercore)
162 Max Verstappen, Oracle Red Bull Racing (Drivercore)
163 Carlos Sainz, Atlassian Williams F1 Team (Drivercore)
164 Lance Stroll, Aston Martin Aramco Formula One Team (Drivercore)
165 Esteban Ocon, TGR Haas F1 Team (Drivercore)
166 Pierre Gasly, BWT Alpine Formula One Team (Drivercore)
167 Charles Leclerc, Scuderia Ferrari HP (Drivercore)
168 Lando Norris, McLaren Mastercard Formula 1 Team (Drivercore)
169 George Russell, Mercedes-AMG PETRONAS Formula 1 Team (Drivercore)
170 Alex Albon, Atlassian Williams F1 Team (Drivercore)
171 Oscar Piastri, McLaren Mastercard Formula 1 Team (Drivercore)
172 Liam Lawson, VISA Cash App Racing Bulls Formula One Team (Drivercore)
173 Oliver Bearman, TGR Haas F1 Team (Drivercore)
174 Franco Colapinto, BWT Alpine Formula One Team (Drivercore)
175 Kimi Antonelli, Mercedes-AMG PETRONAS Formula 1 Team (Drivercore)
176 Gabriel Bortoleto, Audi Revolut F1 Team (Drivercore)
177 Isack Hadjar, Oracle Red Bull Racing (Drivercore)
178 Rubens Barrichello (Drivercore)
179 Oscar Piastri, McLaren Mastercard Formula 1 Team (Night Shift)
180 Isack Hadjar, Oracle Red Bull Racing (Night Shift)
181 Oliver Bearman, TGR Haas F1 Team (Night Shift)
182 Gabriel Bortoleto, Audi Revolut F1 Team (Night Shift)
183 Franco Colapinto, BWT Alpine Formula One Team (Night Shift)
184 Lando Norris, McLaren Mastercard Formula 1 Team (2026 F1 Car)
185 Max Verstappen, Oracle Red Bull Racing (2026 F1 Car)
186 Oscar Piastri, McLaren Mastercard Formula 1 Team (2026 F1 Car)
187 George Russell, Mercedes-AMG PETRONAS Formula 1 Team (2026 F1 Car)
188 Charles Leclerc, Scuderia Ferrari HP (2026 F1 Car)
189 Lewis Hamilton, Scuderia Ferrari HP (2026 F1 Car)
190 Kimi Antonelli, Mercedes-AMG PETRONAS Formula 1 Team (2026 F1 Car)
191 Alex Albon, Atlassian Williams F1 Team (2026 F1 Car)
192 Carlos Sainz, Atlassian Williams F1 Team (2026 F1 Car)
193 Fernando Alonso, Aston Martin Aramco Formula One Team (2026 F1 Car)
194 Nico Hulkenberg, Audi Revolut F1 Team (2026 F1 Car)
195 Isack Hadjar, Oracle Red Bull Racing (2026 F1 Car)
196 Oliver Bearman, TGR Haas F1 Team (2026 F1 Car)
197 Liam Lawson, VISA Cash App Racing Bulls Formula One Team (2026 F1 Car)
198 Esteban Ocon, TGR Haas F1 Team (2026 F1 Car)
199 Lance Stroll, Aston Martin Aramco Formula One Team (2026 F1 Car)
200 Pierre Gasly, BWT Alpine Formula One Team (2026 F1 Car)
201 Gabriel Bortoleto, Audi Revolut F1 Team (2026 F1 Car)
202 Franco Colapinto, BWT Alpine Formula One Team (2026 F1 Car)
203 Sergio Perez, Cadillac Formula 1 Team (2026 F1 Car)
204 Valtteri Bottas, Cadillac Formula 1 Team (2026 F1 Car)
205 Arvid Lindblad, VISA Cash App Racing Bulls Formula One Team (2026 F1 Car)
206 Lando Norris, McLaren Mastercard Formula 1 Team (La Monumental)
207 Oscar Piastri, McLaren Mastercard Formula 1 Team (La Monumental)
208 George Russell, Mercedes-AMG PETRONAS Formula 1 Team (La Monumental)
209 Kimi Antonelli, Mercedes-AMG PETRONAS Formula 1 Team (La Monumental)
210 Max Verstappen, Oracle Red Bull Racing (La Monumental)
211 Isack Hadjar, Oracle Red Bull Racing (La Monumental)
212 Charles Leclerc, Scuderia Ferrari HP (La Monumental)
213 Lewis Hamilton, Scuderia Ferrari HP (La Monumental)
214 Alex Albon, Atlassian Williams F1 Team (La Monumental)
215 Carlos Sainz, Atlassian Williams F1 Team (La Monumental)
216 Liam Lawson, VISA Cash App Racing Bulls Formula One Team (La Monumental)
217 Arvid Lindblad, VISA Cash App Racing Bulls Formula One Team (La Monumental)
218 Fernando Alonso, Aston Martin Aramco Formula One Team (La Monumental)
219 Lance Stroll, Aston Martin Aramco Formula One Team (La Monumental)
220 Oliver Bearman, TGR Haas F1 Team (La Monumental)
221 Esteban Ocon, TGR Haas F1 Team (La Monumental)
222 Nico Hulkenberg, Audi Revolut F1 Team (La Monumental)
223 Gabriel Bortoleto, Audi Revolut F1 Team (La Monumental)
224 Pierre Gasly, BWT Alpine Formula One Team (La Monumental)
225 Franco Colapinto, BWT Alpine Formula One Team (La Monumental)
226 Sergio Perez, Cadillac Formula 1 Team (La Monumental)
227 Valtteri Bottas, Cadillac Formula 1 Team (La Monumental)
228 Lando Norris, McLaren Mastercard Formula 1 Team (F1 Turbo Attax Legacy)
229 Oscar Piastri, McLaren Mastercard Formula 1 Team (F1 Turbo Attax Legacy)
230 George Russell, Mercedes-AMG PETRONAS Formula 1 Team (F1 Turbo Attax Legacy)
231 Kimi Antonelli, Mercedes-AMG PETRONAS Formula 1 Team (F1 Turbo Attax Legacy)
232 Max Verstappen, Oracle Red Bull Racing (F1 Turbo Attax Legacy)
233 Isack Hadjar, Oracle Red Bull Racing (F1 Turbo Attax Legacy)
234 Charles Leclerc, Scuderia Ferrari HP (F1 Turbo Attax Legacy)
235 Lewis Hamilton, Scuderia Ferrari HP (F1 Turbo Attax Legacy)
236 Alex Albon, Atlassian Williams F1 Team (F1 Turbo Attax Legacy)
237 Carlos Sainz, Atlassian Williams F1 Team (F1 Turbo Attax Legacy)
238 Liam Lawson, VISA Cash App Racing Bulls Formula One Team (F1 Turbo Attax Legacy)
239 Arvid Lindblad, VISA Cash App Racing Bulls Formula One Team (F1 Turbo Attax Legacy)
240 Fernando Alonso, Aston Martin Aramco Formula One Team (F1 Turbo Attax Legacy)
241 Lance Stroll, Aston Martin Aramco Formula One Team (F1 Turbo Attax Legacy)
242 Oliver Bearman, TGR Haas F1 Team (F1 Turbo Attax Legacy)
243 Esteban Ocon, TGR Haas F1 Team (F1 Turbo Attax Legacy)
244 Nico Hulkenberg, Audi Revolut F1 Team (F1 Turbo Attax Legacy)
245 Gabriel Bortoleto, Audi Revolut F1 Team (F1 Turbo Attax Legacy)
246 Pierre Gasly, BWT Alpine Formula One Team (F1 Turbo Attax Legacy)
247 Franco Colapinto, BWT Alpine Formula One Team (F1 Turbo Attax Legacy)
248 Sergio Perez, Cadillac Formula 1 Team (F1 Turbo Attax Legacy)
249 Valtteri Bottas, Cadillac Formula 1 Team (F1 Turbo Attax Legacy)
250 Lando Norris, McLaren Mastercard Formula 1 Team (Champions)
251 Leonardo Fornaroli, Invicta Racing (Champions)
252 Rafael Camara, Trident (Champions)
253 Richard Verschoor, MP Motorsport (10 Years Of F2 - Most Successful)
254 Joshua Durksen, Invicta Racing (F2 One To Watch)
255 Colton Herta, Hitech TGR (F2 One To Watch)
256 Nikola Tsolov, Campos Racing (F2 One To Watch)
257 Dino Beganovic, DAMS Lucas Oil (F2 One To Watch)
258 Gabriele Mini, MP Motorsport (F2 One To Watch)
259 Mari Boya, PREMA Racing (F2 One To Watch)
260 Alexander Dunne, Rodin Motorsport (F2 One To Watch)
261 Kush Maini, ART Grand Prix (F2 One To Watch)
262 Emerson Fittipaldi, AIX Racing (F2 One To Watch)
263 Nico Varrone, Van Amersfoort Racing (F2 One To Watch)
264 2026 F1 Car (Technical Drawing)
265 Lando Norris, McLaren Mastercard Formula 1 Team (Signature Style)
266 Oscar Piastri, McLaren Mastercard Formula 1 Team (Signature Style)
267 George Russell, Mercedes-AMG PETRONAS Formula 1 Team (Signature Style)
268 Kimi Antonelli, Mercedes-AMG PETRONAS Formula 1 Team (Signature Style)
269 Max Verstappen, Oracle Red Bull Racing (Signature Style)
270 Isack Hadjar, Oracle Red Bull Racing (Signature Style)
271 Charles Leclerc, Scuderia Ferrari HP (Signature Style)
272 Lewis Hamilton, Scuderia Ferrari HP (Signature Style)
273 Alex Albon, Atlassian Williams F1 Team (Signature Style)
274 Carlos Sainz, Atlassian Williams F1 Team (Signature Style)
275 Liam Lawson, VISA Cash App Racing Bulls Formula One Team (Signature Style)
276 Arvid Lindblad, VISA Cash App Racing Bulls Formula One Team (Signature Style)
277 Fernando Alonso, Aston Martin Aramco Formula One Team (Signature Style)
278 Lance Stroll, Aston Martin Aramco Formula One Team (Signature Style)
279 Oliver Bearman, TGR Haas F1 Team (Signature Style)
280 Esteban Ocon, TGR Haas F1 Team (Signature Style)
281 Nico Hulkenberg, Audi Revolut F1 Team (Signature Style)
282 Gabriel Bortoleto, Audi Revolut F1 Team (Signature Style)
283 Pierre Gasly, BWT Alpine Formula One Team (Signature Style)
284 Franco Colapinto, BWT Alpine Formula One Team (Signature Style)
285 Sergio Perez, Cadillac Formula 1 Team (Signature Style)
286 Valtteri Bottas, Cadillac Formula 1 Team (Signature Style)
287 Sir Jackie Stewart (Signature Style)
288 Mika Hakkinen (Signature Style)
289 Sir Stirling Moss (100 Club - Legend)
290 Graham Hill (100 Club - Legend)
291 Alain Prost (100 Club - Legend)
292 Rubens Barrichello (100 Club - Legend)
293 Lando Norris, McLaren Mastercard Formula 1 Team (100 Club)
294 George Russell, Mercedes-AMG PETRONAS Formula 1 Team (100 Club)
295 Max Verstappen, Oracle Red Bull Racing (100 Club)
296 Carlos Sainz, Atlassian Williams F1 Team (100 Club)
297 Oliver Bearman, TGR Haas F1 Team (100 Club)
298 Nigel Mansell (Black Edge)
299 Damon Hill (Black Edge)
300 Kimi Raikkonen (Black Edge)
301 Oscar Piastri, McLaren Mastercard Formula 1 Team (Black Edge)
302 Lewis Hamilton, Scuderia Ferrari HP (Black Edge)
303 Alex Albon, Atlassian Williams F1 Team (Black Edge)
304 Fernando Alonso, Aston Martin Aramco Formula One Team (Black Edge)
305 Esteban Ocon, TGR Haas F1 Team (Black Edge)
306 Sergio Perez, Cadillac Formula 1 Team (Black Edge)
307 Lando Norris, McLaren Mastercard Formula 1 Team (Diamond Infinity)
308 George Russell, Mercedes-AMG PETRONAS Formula 1 Team (Diamond Infinity)
309 Isack Hadjar, Oracle Red Bull Racing (Diamond Infinity)
310 Charles Leclerc, Scuderia Ferrari HP (Diamond Infinity)
311 Carlos Sainz, Atlassian Williams F1 Team (Diamond Infinity)
312 Arvid Lindblad, VISA Cash App Racing Bulls Formula One Team (Diamond Infinity)
313 Nico Hulkenberg, Audi Revolut F1 Team (Diamond Infinity)
314 Pierre Gasly, BWT Alpine Formula One Team (Diamond Infinity)
315 Valtteri Bottas, Cadillac Formula 1 Team (Diamond Infinity)
316 Lando Norris, McLaren Mastercard Formula 1 Team (Turbo Chrome)
317 Oscar Piastri, McLaren Mastercard Formula 1 Team (Turbo Chrome)
318 George Russell, Mercedes-AMG PETRONAS Formula 1 Team (Turbo Chrome)
319 Kimi Antonelli, Mercedes-AMG PETRONAS Formula 1 Team (Turbo Chrome)
320 Max Verstappen, Oracle Red Bull Racing (Turbo Chrome)
321 Isack Hadjar, Oracle Red Bull Racing (Turbo Chrome)
322 Charles Leclerc, Scuderia Ferrari HP (Turbo Chrome)
323 Lewis Hamilton, Scuderia Ferrari HP (Turbo Chrome)
324 Alex Albon, Atlassian Williams F1 Team (Turbo Chrome)
325 Carlos Sainz, Atlassian Williams F1 Team (Turbo Chrome)
326 Liam Lawson, VISA Cash App Racing Bulls Formula One Team (Turbo Chrome)
327 Arvid Lindblad, VISA Cash App Racing Bulls Formula One Team (Turbo Chrome)
328 Fernando Alonso, Aston Martin Aramco Formula One Team (Turbo Chrome)
329 Lance Stroll, Aston Martin Aramco Formula One Team (Turbo Chrome)
330 Oliver Bearman, TGR Haas F1 Team (Turbo Chrome)
331 Esteban Ocon, TGR Haas F1 Team (Turbo Chrome)
332 Nico Hulkenberg, Audi Revolut F1 Team (Turbo Chrome)
333 Gabriel Bortoleto, Audi Revolut F1 Team (Turbo Chrome)
334 Pierre Gasly, BWT Alpine Formula One Team (Turbo Chrome)
335 Franco Colapinto, BWT Alpine Formula One Team (Turbo Chrome)
336 Sergio Perez, Cadillac Formula 1 Team (Turbo Chrome)
337 Valtteri Bottas, Cadillac Formula 1 Team (Turbo Chrome)
338 Sir Stirling Moss (Turbo Chrome)
339 Michael Schumacher (Turbo Chrome)
340 Mark Webber (Turbo Chrome)
341 Lewis Hamilton, Scuderia Ferrari HP (The Winning Formula)
342 Agent, Slow Pit Stop, Fast Pit Stop, & Overtake Block (Strategy Card)
343 Lando Norris, McLaren Mastercard Formula 1 Team (F1 Gold)
344 George Russell, Mercedes-AMG PETRONAS Formula 1 Team (F1 Gold)
345 Max Verstappen, Oracle Red Bull Racing (F1 Gold)
346 Charles Leclerc, Scuderia Ferrari HP (F1 Gold)
347 Alex Albon, Atlassian Williams F1 Team (F1 Gold)
348 Liam Lawson, VISA Cash App Racing Bulls Formula One Team (F1 Gold)
349 Fernando Alonso, Aston Martin Aramco Formula One Team (F1 Gold)
350 Oliver Bearman, TGR Haas F1 Team (F1 Gold)
351 Nico Hulkenberg, Audi Revolut F1 Team (F1 Gold)
352 Pierre Gasly, BWT Alpine Formula One Team (F1 Gold)
353 Valtteri Bottas, Cadillac Formula 1 Team (F1 Gold)
` },
    { subset: 'Raceday Relics', data: `
RR-PIA Oscar Piastri, McLaren Mastercard Formula 1 Team
RR-BEA Oliver Bearman, TGR Haas F1 Team
RR-RUS George Russell, Mercedes-AMG PETRONAS Formula 1 Team
RR-LEC Charles Leclerc, Scuderia Ferrari HP
RR-LAW Liam Lawson, VISA Cash App Racing Bulls Formula One Team
RR-GAS Pierre Gasly, BWT Alpine Formula One Team
RR-OCO Esteban Ocon, TGR Haas F1 Team
RR-STR Lance Stroll, Aston Martin Aramco Formula One Team
RR-ALB Alex Albon, Atlassian Williams F1 Team
RR-WEB Mark Webber
` },
    { subset: 'Guardians Of The Grid', data: `
GU 1 Oscar Piastri, McLaren Mastercard Formula 1 Team
GU 2 George Russell, Mercedes-AMG PETRONAS Formula 1 Team
GU 3 Isack Hadjar, Oracle Red Bull Racing
GU 4 Lewis Hamilton, Scuderia Ferrari HP
GU 5 Carlos Sainz, Atlassian Williams F1 Team
GU 6 Liam Lawson, VISA Cash App Racing Bulls Formula One Team
GU 7 Fernando Alonso, Aston Martin Aramco Formula One Team
GU 8 Esteban Ocon, TGR Haas F1 Team
GU 9 Nico Hulkenberg, Audi Revolut F1 Team
GU 10 Franco Colapinto, BWT Alpine Formula One Team
GU 11 Valtteri Bottas, Cadillac Formula 1 Team
` },
    { subset: 'Sunshine State', data: `
SUN 1 Lando Norris, McLaren Mastercard Formula 1 Team
SUN 2 Kimi Antonelli, Mercedes-AMG PETRONAS Formula 1 Team
SUN 3 Max Verstappen, Oracle Red Bull Racing
SUN 4 Charles Leclerc, Scuderia Ferrari HP
SUN 5 Alex Albon, Atlassian Williams F1 Team
SUN 6 Arvid Lindblad, VISA Cash App Racing Bulls Formula One Team
SUN 7 Lance Stroll, Aston Martin Aramco Formula One Team
SUN 8 Oliver Bearman, TGR Haas F1 Team
SUN 9 Gabriel Bortoleto, Audi Revolut F1 Team
SUN 10 Pierre Gasly, BWT Alpine Formula One Team
SUN 11 Sergio Perez, Cadillac Formula 1 Team
` },
    { subset: 'Greats Of The Grid', data: `
GG 1 Lewis Hamilton, Scuderia Ferrari HP
GG 2 Max Verstappen, Oracle Red Bull Racing
GG 3 Fernando Alonso, Aston Martin Aramco Formula One Team
GG 4 Lando Norris, McLaren Mastercard Formula 1 Team
GG 5 Sir Jack Brabham
GG 6 Sir Jackie Stewart
GG 7 Jody Scheckter
GG 8 Michael Schumacher
` },
    { subset: 'Limited Editions', data: `
LE 1 Oscar Piastri, McLaren Mastercard Formula 1 Team
LE 2 Carlos Sainz, Atlassian Williams F1 Team
LE 3 Max Verstappen, Oracle Red Bull Racing
LE 4 Lewis Hamilton, Scuderia Ferrari HP
LE 5 Lando Norris, McLaren Mastercard Formula 1 Team
LE 6 Charles Leclerc, Scuderia Ferrari HP
LE 7 George Russell, Mercedes-AMG PETRONAS Formula 1 Team
LE 8 Isack Hadjar, Oracle Red Bull Racing
LE 9 Sergio Perez, Cadillac Formula 1 Team
LE 10 Arvid Lindblad, VISA Cash App Racing Bulls Formula One Team
LE 11 Gabriel Bortoleto, Audi Revolut F1 Team
LE 12 Kimi Antonelli, Mercedes-AMG PETRONAS Formula 1 Team
LE 13 Fernando Alonso, Aston Martin Aramco Formula One Team
LE 14 Liam Lawson, VISA Cash App Racing Bulls Formula One Team
LE 15 Alex Albon, Atlassian Williams F1 Team
LE 16 Nico Hulkenberg, Audi Revolut F1 Team
LE 17 Oliver Bearman, TGR Haas F1 Team
LE 18 Valtteri Bottas, Cadillac Formula 1 Team
` },
    { subset: 'Black Gold Limited Edition', data: `
BG 1 Esteban Ocon, TGR Haas F1 Team
BG 2 Franco Colapinto, BWT Alpine Formula One Team
` },
    { subset: 'Manufactured Relics', data: `
MR-NOR Lando Norris, McLaren Mastercard Formula 1 Team
MR-VER Max Verstappen, Oracle Red Bull Racing
MR-HAM Lewis Hamilton, Scuderia Ferrari HP
MR-ALO Fernando Alonso, Aston Martin Aramco Formula One Team
MR-STE Sir Jackie Stewart
MR-MAN Nigel Mansell
MR-HAK Mika Hakkinen
MR-RAI Kimi Raikkonen
MR-PRO Alain Prost
MR-MSC Michael Schumacher
` },
];

async function run() {
    const existing = await pool.query(
        'SELECT COUNT(*) FROM cards WHERE set_name = $1', [SET]
    );
    const count = parseInt(existing.rows[0].count);
    if (count > 0) {
        console.log(`Set already has ${count} cards — skipping. Delete them first to re-import.`);
        await pool.end();
        return;
    }

    let imported = 0;
    let failed = 0;

    for (const section of sections) {
        const lines = section.data.trim().split('\n').filter(l => l.trim());
        for (const line of lines) {
            const parsed = parseLine(line, section.subset);
            if (!parsed) { failed++; continue; }

            try {
                await pool.query(`
                    INSERT INTO cards (
                        card_name, card_number, year, card_category, sport_type,
                        manufacturer, set_name, insert_list, team,
                        price_nzd, quantity, available, product_type
                    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NULL,0,true,'single')
                `, [
                    parsed.cardName, parsed.cardNumber, YEAR, 'sport', 'Formula 1',
                    MANUFACTURER, SET, parsed.subset, parsed.team,
                ]);
                imported++;
            } catch (err) {
                console.error(`FAIL [${line}]: ${err.message}`);
                failed++;
            }
        }
    }

    console.log(`\nImported: ${imported} | Failed: ${failed}`);
    await pool.end();
}

run().catch(err => { console.error(err); process.exit(1); });
