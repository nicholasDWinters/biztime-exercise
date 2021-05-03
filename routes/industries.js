const express = require("express");
const router = new express.Router();
const db = require("../db");
const ExpressError = require("../expressError");



//get list of all industries
router.get("/", async function (req, res, next) {
    try {
        // const results = await db.query("SELECT i.industry, ci.com_code FROM industries AS i LEFT JOIN companies_industries AS ci ON i.code = ci.industry_code");
        const results = await db.query("SELECT industry FROM industries");
        let industries = {};
        for (let row of results.rows) {
            let { industry } = row;
            industries[industry] = {};
            const code = await db.query(`SELECT code FROM industries WHERE industry = '${industry}'`);
            const comps = await db.query(`SELECT c.name FROM companies AS c LEFT JOIN companies_industries AS ci ON c.code = ci.com_code WHERE ci.industry_code = '${code.rows[0].code}'`);

            industries[industry].companies = [];
            for (let row of comps.rows) {
                let { name } = row;
                industries[industry].companies.push(name);
            }
        }
        if (!results) throw new ExpressError('NO INDUSTRIES FOUND', 404)
        return res.json({ industries });

    } catch (e) {
        return next(e)
    }
});

//create a new industry
router.post('/', async (req, res, next) => {
    try {
        if (!req.body.code) throw new ExpressError('INDUSTRY NEEDS A CODE');
        if (!req.body.industry) throw new ExpressError('INDUSTRY NEEDS AN INDUSTRY NAME');

        const result = await db.query(`INSERT INTO industries (code, industry) VALUES ($1, $2) RETURNING *`,
            [req.body.code, req.body.industry]);

        return res.status(201).json({ industry: result.rows[0] });

    } catch (e) {
        return next(e);
    }
})

//add a company to an industry
router.post('/company', async (req, res, next) => {
    try {
        if (!req.body.com_code) throw new ExpressError('NEED A COMPANY CODE');
        if (!req.body.industry_code) throw new ExpressError('NEED AN INDUSTRY CODE');

        const comp = await db.query('SELECT * FROM companies WHERE code = $1', [req.body.com_code]);
        const industry = await db.query('SELECT * FROM industries WHERE code = $1', [req.body.industry_code]);

        if (comp.rows.length === 0) throw new ExpressError('NOT A VALID COMPANY');
        if (industry.rows.length === 0) throw new ExpressError('NOT A VALID INDUSTRY');

        const result = await db.query(`INSERT INTO companies_industries (com_code, industry_code) VALUES ($1, $2) RETURNING *`,
            [req.body.com_code, req.body.industry_code]);

        return res.status(201).json({ status: 'added relationship' });

    } catch (e) {
        return next(e);
    }
})

module.exports = router;