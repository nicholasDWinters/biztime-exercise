const express = require("express");
const router = new express.Router();
const db = require("../db")
const ExpressError = require("../expressError")


//get list of all invoices
router.get("/", async function (req, res, next) {
    try {
        const results = await db.query("SELECT id, comp_code FROM invoices")
        if (!results) throw new ExpressError('NO INVOICES FOUND', 404)
        return res.json({ invoices: results.rows });

    } catch (e) {
        return next(e)
    }
});

//get invoice with given id
router.get('/:id', async function (req, res, next) {
    try {

        const result = await db.query('SELECT * FROM invoices WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) throw new ExpressError('COULD NOT FIND INVOICE', 404);
        const company = await db.query(`SELECT code, name, description FROM companies WHERE code = $1`, [result.rows[0].comp_code])

        let invoice = {
            id: result.rows[0].id,
            amt: result.rows[0].amt,
            paid: result.rows[0].paid,
            add_date: result.rows[0].add_date,
            paid_date: result.rows[0].paid_date,
            company: {
                code: company.rows[0].code,
                name: company.rows[0].name,
                description: company.rows[0].description
            }
        }

        return res.json({ invoice: invoice });

    } catch (e) {
        return next(e)
    }
})


//create a new invoice
router.post('/', async (req, res, next) => {
    try {

        if (!req.body.comp_code) throw new ExpressError('INVOICE NEEDS A COMPANY CODE');
        if (!req.body.amt) throw new ExpressError('INVOICE NEEDS AN AMOUNT');

        const company = await db.query(`SELECT * FROM companies WHERE code = $1`, [req.body.comp_code]);
        if (company.rows.length === 0) throw new ExpressError('COMPANY DOES NOT EXIST!', 404);

        const result = await db.query(`INSERT INTO invoices (comp_code, amt) VALUES ($1, $2) RETURNING *`,
            [req.body.comp_code, req.body.amt]);

        return res.status(201).json({ invoice: result.rows[0] });

    } catch (e) {
        return next(e);
    }
})


//edit an invoice amount
router.patch('/:id', async (req, res, next) => {
    try {
        if ("id" in req.body) throw new ExpressError('NOT ALLOWED', 400);
        if (!req.body.amt) throw new ExpressError('INVOICE NEEDS AN AMOUNT');
        const result = await db.query(`UPDATE invoices SET amt=$1 WHERE id=$2 RETURNING *`,
            [req.body.amt, req.params.id]);

        if (result.rows.length === 0) throw new ExpressError(`No invoice with an id of ${req.params.id}`, 404);
        return res.json({ invoice: result.rows[0] });

    } catch (e) {
        return next(e);
    }
})


//delete invoice
router.delete("/:id", async (req, res, next) => {
    try {
        const result = await db.query("DELETE FROM invoices WHERE id = $1 RETURNING id", [req.params.id]);

        if (result.rows.length === 0) throw new ExpressError(`There is no invoice with an id of ${req.params.id}`, 404);

        return res.json({ status: "deleted" });

    } catch (err) {
        return next(err);
    }
});


module.exports = router;