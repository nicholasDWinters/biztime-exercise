process.env.NODE_ENV === "test";

const request = require('supertest');
const app = require('../app');
const db = require('../db');


//seed test database with data.sql before testing
beforeEach(async function () {
    await db.query(`DROP TABLE IF EXISTS invoices;
   DROP TABLE IF EXISTS companies;
   
   CREATE TABLE companies (
       code text PRIMARY KEY,
       name text NOT NULL UNIQUE,
       description text
   );
   
   CREATE TABLE invoices (
       id serial PRIMARY KEY,
       comp_code text NOT NULL REFERENCES companies ON DELETE CASCADE,
       amt float NOT NULL,
       paid boolean DEFAULT false NOT NULL,
       add_date date DEFAULT CURRENT_DATE NOT NULL,
       paid_date date,
       CONSTRAINT invoices_amt_check CHECK ((amt > (0)::double precision))
   );
   
   INSERT INTO companies
     VALUES ('apple', 'Apple Computer', 'Maker of OSX.'),
            ('ibm', 'IBM', 'Big blue.');
   
   INSERT INTO invoices (comp_Code, amt, paid, paid_date)
     VALUES ('apple', 100, false, null),
            ('apple', 200, false, null),
            ('apple', 300, true, '2018-01-01'),
            ('ibm', 400, false, null);`)
})


afterAll(async function () {
    // close db connection
    await db.end();
});


describe("GET /invoices", () => {
    test("Get all invoices", async () => {
        const res = await request(app).get("/invoices");
        expect(res.statusCode).toBe(200)
        expect(res.body).toEqual({
            "invoices": [
                {
                    "id": 1,
                    "comp_code": "apple"
                },
                {
                    "id": 2,
                    "comp_code": "apple"
                },
                {
                    "id": 3,
                    "comp_code": "apple"
                },
                {
                    "id": 4,
                    "comp_code": "ibm"
                }
            ]
        })
    })
})

describe("GET /invoices/:id", () => {
    test("Get invoices by id", async () => {
        const res = await request(app).get(`/invoices/1`);
        expect(res.statusCode).toBe(200)
        let invoice = {
            "id": 1,
            "amt": 100,
            "paid": false,
            "add_date": "2021-05-03T05:00:00.000Z",
            "paid_date": null,
            "company": {
                "code": "apple",
                "name": "Apple Computer",
                "description": "Maker of OSX."
            }
        }
        expect(res.body).toEqual({
            "invoice": invoice
        })
    })

    test("Responds with 404 for invalid invoices", async () => {
        const res = await request(app).get(`/invoices/20`);
        expect(res.statusCode).toBe(404)
    })
})


describe("POST /invoices", () => {
    test("Creating a new invoice", async () => {
        let invoice = { comp_code: "ibm", amt: 200 };
        const res = await request(app).post("/invoices").send(invoice);
        expect(res.statusCode).toBe(201);
        invoice = {
            "id": 5,
            "comp_code": "ibm",
            "amt": 200,
            "paid": false,
            "add_date": expect.any(String),
            "paid_date": null
        }
        expect(res.body).toEqual({ invoice: invoice });
    })
    test("Responds with 404 if company does not exist", async () => {
        const res = await request(app).post("/invoices").send({ comp_code: "blah", amt: 200 });
        expect(res.statusCode).toBe(404);
    })
    test("Responds with 500 if comp_code is missing", async () => {
        const res = await request(app).post("/invoices").send({ amt: 200 });
        expect(res.statusCode).toBe(500);
    })
    test("Responds with 500 if amt is missing", async () => {
        const res = await request(app).post("/invoices").send({ comp_code: "blah" });
        expect(res.statusCode).toBe(500);
    })
})


describe("/PATCH /invoices/:id", () => {
    test("Updating an invoice", async () => {

        const res = await request(app).patch(`/invoices/1`).send({ amt: 400 });
        expect(res.statusCode).toBe(200);
        let invoice = {
            "id": 1,
            "comp_code": "apple",
            "amt": 400,
            "paid": false,
            "add_date": expect.any(String),
            "paid_date": null
        }
        expect(res.body).toEqual({ invoice: invoice });
    })
    test("Responds with 404 for invalid invoice in request", async () => {
        const res = await request(app).patch(`/invoices/100`).send({ amt: 200 });
        expect(res.statusCode).toBe(404);
    })
    test("Responds with 500 for no amount in request", async () => {
        const res = await request(app).patch(`/invoices/1`).send({});
        expect(res.statusCode).toBe(500);
    })

})


describe("/DELETE /invoices/:id", () => {
    test("Deleting an invoice", async () => {
        const res = await request(app).delete(`/invoices/1`);
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({ status: 'deleted' })
    })
    test("Responds with 404 for deleting invalid invoice", async () => {
        const res = await request(app).delete(`/invoices/20`);
        expect(res.statusCode).toBe(404);
    })
})