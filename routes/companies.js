const express = require("express");
const router = new express.Router();
const db = require("../db");
const ExpressError = require("../expressError");
const slugify = require('slugify');


//get list of all companies
router.get("/", async function (req, res, next) {
    try {
        const results = await db.query("SELECT code, name FROM companies")
        if (!results) throw new ExpressError('NO COMPANIES FOUND', 404)
        return res.json({ companies: results.rows });

    } catch (e) {
        return next(e)
    }
});

//get company with given code
router.get('/:code', async function (req, res, next) {
    try {

        const result = await db.query('SELECT code, name, description FROM companies WHERE code = $1', [req.params.code]);

        if (result.rows.length === 0) throw new ExpressError('COULD NOT FIND COMPANY', 404);
        const invoices = await db.query('SELECT * FROM invoices WHERE comp_code = $1', [req.params.code]);

        let company = {
            code: result.rows[0].code,
            name: result.rows[0].name,
            description: result.rows[0].description,
            invoices: []
        }
        for (let row of invoices.rows) {
            company.invoices.push(row);
        }
        return res.json({ company: company });

    } catch (e) {
        return next(e)
    }
})


//create a new company
router.post('/', async (req, res, next) => {
    try {

        if (!req.body.name) throw new ExpressError('COMPANY NEEDS A NAME');
        if (!req.body.description) throw new ExpressError('COMPANY NEEDS A DESCRIPTION');
        let code = slugify(req.body.name, { lower: true, strict: true, replacement: '' })
        const result = await db.query(`INSERT INTO companies (code,name,description) VALUES ($1, $2, $3) RETURNING code, name, description`,
            [code, req.body.name, req.body.description]);

        return res.status(201).json({ company: result.rows[0] });

    } catch (e) {
        return next(e);
    }
})


//edit a company
router.patch('/:code', async (req, res, next) => {
    try {
        if ("code" in req.body) throw new ExpressError('NOT ALLOWED', 400);
        if (!req.body.name) throw new ExpressError('COMPANY NEEDS A NAME');
        if (!req.body.description) throw new ExpressError('COMPANY NEEDS A DESCRIPTION');
        const result = await db.query(`UPDATE companies SET name=$1, description=$2 WHERE code=$3 RETURNING code,name,description`,
            [req.body.name, req.body.description, req.params.code]);

        if (result.rows.length === 0) throw new ExpressError(`No company with code of ${req.params.code}`, 404);
        return res.json({ company: result.rows[0] });

    } catch (e) {
        return next(e);
    }
})


//delete company 
router.delete("/:code", async (req, res, next) => {
    try {
        const result = await db.query("DELETE FROM companies WHERE code = $1 RETURNING code", [req.params.code]);

        if (result.rows.length === 0) throw new ExpressError(`There is no company with code of ${req.params.code}`, 404);

        return res.json({ status: "deleted" });

    } catch (err) {
        return next(err);
    }
});


module.exports = router;